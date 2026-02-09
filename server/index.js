const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Song = require('./models/Song');
const path = require('path');
const fs = require('fs-extra');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/music_app';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware to verify JWT
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, 'secret_key_change_me');
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Middleware to check if user is admin
const admin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        next();
    } catch (err) {
        res.status(500).send('Server error');
    }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });
        user = await User.findOne({ username });
        if (user) return res.status(400).json({ msg: 'Username taken' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            email,
            password: hashedPassword,
            role: 'user' // Default role
        });

        await user.save();

        const payload = { user: { id: user.id, username: user.username } };
        jwt.sign(payload, 'secret_key_change_me', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        const payload = { user: { id: user.id, username: user.username } };
        jwt.sign(payload, 'secret_key_change_me', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Song Routes
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.find().sort({ createdAt: -1 });
        res.json(songs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Admin Media Ingestion Route
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('ffmpeg-static');
const axios = require('axios');

if (ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
} else {
    ffmpeg.setFfmpegPath(ffmpegInstaller);
}

app.post('/api/admin/ingest', [auth, admin], async (req, res) => {
    try {
        const { url, title, artist, coverImage } = req.body;
        if (!url || !title || !artist) {
            return res.status(400).json({ msg: 'Please provide url, title, artist' });
        }

        const musicDir = path.join(__dirname, '..', 'public', 'audio');
        await fs.ensureDir(musicDir);

        const filename = `${Date.now()}_${title.replace(/\s+/g, '_')}.mp3`;
        const filePath = path.join(musicDir, filename);
        const audioUrl = `/audio/${filename}`;

        if (ytdl.validateURL(url)) {
            // YouTube URL
            console.log('Processing YouTube URL:', url);
            const stream = ytdl(url, {
                quality: 'highestaudio',
                filter: 'audioonly',
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }
            });

            ffmpeg(stream)
                .audioBitrate(128)
                .toFormat('mp3')
                .on('error', (err) => {
                    console.error('FFmpeg Error:', err.message);
                    if (!res.headersSent) {
                        const msg = err.message.includes('403') ? 'YouTube access forbidden (403). Try another link or check if the video is restricted.' : 'Processing failed';
                        res.status(500).json({ msg });
                    }
                })
                .on('end', async () => {
                    const song = new Song({
                        title, artist, audioUrl, coverImage: coverImage || '/covers/default.png', addedBy: req.user.id
                    });
                    await song.save();
                    if (!res.headersSent) res.json(song);
                })
                .save(filePath);
        } else if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
            const response = await axios({ url, method: 'GET', responseType: 'stream' });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);
            writer.on('finish', async () => {
                const song = new Song({
                    title, artist, audioUrl, coverImage: coverImage || '/covers/default.png', addedBy: req.user.id
                });
                await song.save();
                if (!res.headersSent) res.json(song);
            });
            writer.on('error', (err) => {
                console.error('Download Error:', err);
                if (!res.headersSent) res.status(500).json({ msg: 'Download failed' });
            });
        } else {
            ffmpeg(url)
                .toFormat('mp3')
                .on('error', (err) => {
                    console.error('FFmpeg Error:', err);
                    if (!res.headersSent) res.status(500).json({ msg: 'Could not process video link' });
                })
                .on('end', async () => {
                    const song = new Song({
                        title, artist, audioUrl, coverImage: coverImage || '/covers/default.png', addedBy: req.user.id
                    });
                    await song.save();
                    if (!res.headersSent) res.json(song);
                })
                .save(filePath);
        }
    } catch (err) {
        console.error('Ingestion Error:', err);
        if (!res.headersSent) res.status(500).send('Server error');
    }
});

// Room state storage (in-memory)
const rooms = {};

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    socket.on('create-room', ({ username } = {}) => {
        const roomCode = generateRoomCode();
        const hostName = username || 'Host';
        rooms[roomCode] = {
            hostId: socket.id,
            users: [{ id: socket.id, username: hostName, role: 'host' }],
            currentState: { trackIndex: 0, currentTime: 0, isPlaying: false, isLooping: false }
        };
        socket.join(roomCode);
        socket.emit('room-created', { roomCode, role: 'host' });
        io.to(roomCode).emit('room-users-update', rooms[roomCode].users);
    });

    socket.on('join-room', ({ roomCode, username } = {}) => {
        if (!roomCode) {
            socket.emit('error', 'Room code required');
            return;
        }
        const room = rooms[roomCode];
        if (room) {
            if (!room.users.find(u => u.id === socket.id)) {
                room.users.push({ id: socket.id, username: username || 'Guest', role: 'listener' });
            }
            socket.join(roomCode);
            socket.emit('room-joined', { roomCode, role: 'listener' });
            io.to(roomCode).emit('room-users-update', room.users);
            io.to(room.hostId).emit('request-sync', { requesterId: socket.id });
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('send-sync', ({ requesterId, state }) => {
        io.to(requesterId).emit('sync-state', state);
    });

    socket.on('playback-action', ({ roomCode, action, data }) => {
        const room = rooms[roomCode];
        if (room && socket.id === room.hostId) {
            room.currentState = { ...room.currentState, ...data };
            socket.to(roomCode).emit('sync-action', { action, data });
        }
    });

    socket.on('disconnect', () => {
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.hostId === socket.id) {
                io.to(roomCode).emit('error', 'Host disconnected. Room closed.');
                delete rooms[roomCode];
            } else {
                const wasInRoom = room.users.some(u => u.id === socket.id);
                if (wasInRoom) {
                    room.users = room.users.filter(u => u.id !== socket.id);
                    io.to(roomCode).emit('room-users-update', room.users);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Socket.IO Server running on port ${PORT}`);
});
