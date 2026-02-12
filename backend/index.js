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
const Message = require('./models/Message');
const path = require('path');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');

dotenv.config();

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));
app.use('/covers', express.static(path.join(__dirname, 'public', 'covers')));

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

app.post('/api/admin/ingest', [auth, admin], async (req, res) => {
    try {
        const { url, title, artist, coverImage } = req.body;
        if (!url || !title || !artist) {
            return res.status(400).json({ msg: 'Please provide url, title, artist' });
        }

        const musicDir = path.join(__dirname, 'public', 'audio');
        await fs.ensureDir(musicDir);

        const filename = `${Date.now()}_${title.replace(/\s+/g, '_')}.mp3`;
        const filePath = path.join(musicDir, filename);
        // audioUrl is relative, frontend will prepend API_URL
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
            users: [{ id: socket.id, username: hostName, role: 'host', isVideoOn: false }],
            users: [{ id: socket.id, username: hostName, role: 'host', isVideoOn: false }],
            currentState: { trackIndex: 0, currentTime: 0, isPlaying: false, isLooping: false },
            likes: {} // { songId: { count: number, users: [userId] } }
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
                room.users.push({ id: socket.id, username: username || 'Guest', role: 'listener', isVideoOn: false });
            }
            socket.join(roomCode);
            socket.emit('room-joined', { roomCode, role: 'listener' });
            io.to(roomCode).emit('room-users-update', room.users);

            io.to(room.hostId).emit('request-sync', { requesterId: socket.id });

            // Send initial likes state
            socket.emit('likes-update', room.likes);

            // Fetch and send chat history
            Message.find({ roomCode }).sort({ timestamp: 1 }).limit(50)
                .then(messages => {
                    socket.emit('chat-history', messages);
                })
                .catch(err => console.error('Chat History Error:', err));
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('send-sync', ({ requesterId, state }) => {
        io.to(requesterId).emit('sync-state', state);
    });

    // Handle Sync Actions (Play, Pause, Seek, Next, Prev)
    socket.on('sync-action', ({ roomCode, action, data }) => {
        const room = rooms[roomCode];
        if (room) {
            room.currentState = { ...room.currentState, ...data };
            socket.to(roomCode).emit('sync-action', { action, data });
        }
    });

    // Video Call Signaling
    socket.on('join-video', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isVideoOn = true;
                // Broadcast to others so they know to initiate/expect connections
                socket.to(roomCode).emit('user-joined-video', { userId: socket.id });
                // Update the UI list
                io.to(roomCode).emit('room-users-update', room.users);
            }
        }
    });

    socket.on('leave-video', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isVideoOn = false;
                io.to(roomCode).emit('room-users-update', room.users);
                socket.to(roomCode).emit('user-left-video', { userId: socket.id });
            }
        }
    });

    socket.on('signal', ({ to, signal }) => {
        console.log(`Relaying signal from ${socket.id} to ${to} (type: ${signal.type || 'candidate'})`);
        io.to(to).emit('signal', { from: socket.id, signal });
    });

    // Chat Feature
    socket.on('sendMessage', async ({ roomCode, content, userId, sender }) => {
        try {
            const newMessage = new Message({ roomCode, content, userId, sender });
            await newMessage.save();
            io.to(roomCode).emit('receiveMessage', newMessage);
        } catch (err) {
            console.error('Message Error:', err);
            socket.emit('error', 'Failed to send message');
        }
    });

    // Like Feature
    socket.on('toggleLike', ({ roomCode, songId, userId }) => {
        const room = rooms[roomCode];
        if (room) {
            if (!room.likes[songId]) {
                room.likes[songId] = { count: 0, users: [] };
            }

            const songLikes = room.likes[songId];
            const userIndex = songLikes.users.indexOf(userId);

            if (userIndex === -1) {
                // Like
                songLikes.users.push(userId);
                songLikes.count++;
            } else {
                // Unlike
                songLikes.users.splice(userIndex, 1);
                songLikes.count--;
            }

            io.to(roomCode).emit('likes-update', room.likes);
        }
    });

    socket.on('disconnect', () => {
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.hostId === socket.id) {
                io.to(roomCode).emit('error', 'Host disconnected. Room closed.');
                delete rooms[roomCode];
            } else {
                const user = room.users.find(u => u.id === socket.id);
                if (user) {
                    if (user.isVideoOn) {
                        socket.to(roomCode).emit('user-left-video', { userId: socket.id });
                    }
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
