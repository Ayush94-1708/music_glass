const express = require('express');
const multer = require('multer');
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

const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

// CORS configuration for production and development
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allowed origins
        const allowedOrigins = [
            'http://localhost:5173',
            'https://localhost:5173',
            process.env.FRONTEND_URL, // Will be set in Vercel
        ];

        // Allow any vercel.app domain for deployment
        if (origin.includes('vercel.app') || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));
app.use('/covers', express.static(path.join(__dirname, 'public', 'covers')));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/music_app';

console.log('Attempting to connect to MongoDB at:', MONGO_URI);

mongoose.connect(MONGO_URI)
    .then(() => console.log('Initial MongoDB Connection Successful'))
    .catch(err => console.error('Initial MongoDB Connection Error:', err));

const db = mongoose.connection;
db.on('error', (err) => console.error('Mongoose Connection Error event:', err));
db.on('connected', () => console.log('Mongoose connected to db'));
db.once('open', () => {
    console.log('Mongoose connection open to', MONGO_URI);
});
db.on('disconnected', () => console.log('Mongoose disconnected'));
db.on('reconnected', () => console.log('Mongoose reconnected'));

// Set a timeout for the overall connection if needed
mongoose.set('bufferCommands', false); // Disable buffering to see errors immediately

const server = http.createServer(app);
const io = new Server(server, {
    path: '/socket.io',
    cors: {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // Allow any vercel.app domain, including subdomains, and localhost
            if (origin.includes('vercel.app') ||
                origin.includes('localhost') ||
                origin.includes('127.0.0.1')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['polling'],
    allowUpgrades: false,
    pingTimeout: 60000,     // Increase timeout for serverless wake-up
    pingInterval: 25000,    // Stable interval
    connectTimeout: 45000   // Allow more time for initial connection
});

// Middleware to verify JWT
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    console.log('Auth middleware - token present:', !!token);

    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, 'secret_key_change_me');
        req.user = decoded.user;
        console.log('Auth middleware - decoded user:', req.user);
        next();
    } catch (err) {
        console.error('Auth middleware - token verification failed:', err.message);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Middleware to check if user is admin
const admin = async (req, res, next) => {
    try {
        console.log('Admin middleware - checking user:', req.user);
        const user = await User.findById(req.user.id);
        console.log('Admin middleware - found user:', user ? user.username : 'NOT FOUND', 'role:', user?.role);

        if (!user) {
            console.log('Admin middleware - User not found in database');
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.role !== 'admin') {
            console.log('Admin middleware - Access denied, user role:', user.role);
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        console.log('Admin middleware - Access granted');
        next();
    } catch (err) {
        console.error('Admin middleware error:', err);
        res.status(500).send('Server error: ' + err.message);
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
        console.error('Songs Fetch Error:', err);
        res.status(500).send('Server error: ' + err.message);
    }
});

// Admin Media Ingestion Route

app.post('/api/admin/ingest', [auth, admin, upload.single('audio')], async (req, res) => {
    try {
        const { url, title, artist, coverImage } = req.body;

        if (!title || !artist) {
            return res.status(400).json({ msg: 'Please provide title and artist' });
        }

        console.log(`Starting ingestion for: ${title}`);

        const uploadBufferToCloudinary = (buffer, format = 'mp3') => {
            return new Promise((resolve, reject) => {
                console.log('Uploading buffer to Cloudinary, size:', buffer.length, 'bytes');

                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'video',
                        folder: 'music_app_audio',
                        public_id: `${Date.now()}_${title.replace(/\s+/g, '_')}`,
                        format: format,
                        timeout: 120000, // 2 minutes
                        chunk_size: 6000000 // 6MB chunks
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            console.log('Cloudinary upload successful:', result.secure_url);
                            resolve(result);
                        }
                    }
                );

                const { Readable } = require('stream');
                const stream = new Readable();
                stream.push(buffer);
                stream.push(null);
                stream.pipe(uploadStream);
            });
        };

        const uploadStreamToCloudinary = (stream, format = 'mp3') => {
            return new Promise((resolve, reject) => {
                console.log('Uploading stream to Cloudinary');

                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'video',
                        folder: 'music_app_audio',
                        public_id: `${Date.now()}_${title.replace(/\s+/g, '_')}`,
                        format: format,
                        timeout: 120000, // 2 minutes
                        chunk_size: 6000000 // 6MB chunks
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            console.log('Cloudinary upload successful:', result.secure_url);
                            resolve(result);
                        }
                    }
                );
                stream.pipe(uploadStream).on('error', reject);
            });
        };

        let audioUrl;

        // Case 1: Direct File Upload
        if (req.file) {
            console.log('Processing Direct File Upload:', req.file.originalname);
            const result = await uploadBufferToCloudinary(req.file.buffer, 'mp3');
            audioUrl = result.secure_url;
        }
        // Case 2: URL Ingestion
        else if (url) {
            if (ytdl.validateURL(url)) {
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

                const passThrough = new require('stream').PassThrough();
                ffmpeg(stream)
                    .audioBitrate(128)
                    .toFormat('mp3')
                    .on('error', (err) => {
                        console.error('FFmpeg Error:', err);
                        if (!res.headersSent) res.status(500).json({ msg: 'Processing failed' });
                    })
                    .pipe(passThrough);

                const result = await uploadStreamToCloudinary(passThrough, 'mp3');
                audioUrl = result.secure_url;

            } else if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                console.log('Processing Direct URL:', url);
                const response = await axios({ url, method: 'GET', responseType: 'stream' });
                const result = await uploadStreamToCloudinary(response.data, 'mp3');
                audioUrl = result.secure_url;
            } else {
                console.log('Processing with Generic FFmpeg:', url);
                const passThrough = new require('stream').PassThrough();
                ffmpeg(url)
                    .toFormat('mp3')
                    .on('error', (err) => {
                        console.error('FFmpeg Error:', err);
                        if (!res.headersSent) res.status(500).json({ msg: 'Could not process video link.' });
                    })
                    .pipe(passThrough);

                const result = await uploadStreamToCloudinary(passThrough, 'mp3');
                audioUrl = result.secure_url;
            }
        } else {
            return res.status(400).json({ msg: 'Please provide either a URL or an audio file' });
        }

        const song = new Song({
            title,
            artist,
            audioUrl,
            sourceUrl: url || 'Uploaded File',
            coverImage: coverImage || '/covers/default.png',
            addedBy: req.user.id
        });

        await song.save();
        console.log('Song saved:', song.title);
        res.json(song);

    } catch (err) {
        console.error('Ingestion Fatal Error:', err);
        if (!res.headersSent) res.status(500).send('Server error: ' + (err.stack || err.message));
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

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Socket.IO Server running on port ${PORT}`);
    });
}

// Export a combined handler for Vercel
module.exports = (req, res) => {
    // Add debug log for incoming requests
    if (req.url.includes('/socket.io')) {
        console.log(`Socket request: ${req.method} ${req.url}`);
        return io.engine.handleRequest(req, res);
    }

    // Default to Express app
    return app(req, res);
};
