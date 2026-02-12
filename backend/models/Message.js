const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        required: true,
        index: true
    },
    sender: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', MessageSchema);
