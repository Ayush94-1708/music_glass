import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageSquare } from 'lucide-react';

const ChatPanel = ({ socket, roomCode, username, userId, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('chat-history', (history) => {
            setMessages(history);
            setTimeout(scrollToBottom, 100);
        });

        socket.on('receiveMessage', (message) => {
            setMessages((prev) => [...prev, message]);
            setTimeout(scrollToBottom, 100);
        });

        return () => {
            socket.off('chat-history');
            socket.off('receiveMessage');
        };
    }, [socket]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        socket.emit('sendMessage', {
            roomCode,
            content: newMessage,
            userId,
            sender: username
        });
        setNewMessage('');
    };

    return (
        <div className="flex flex-col h-full bg-black/20 backdrop-blur-2xl border-l border-white/10 w-full md:w-80 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-light-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-white shadow-black/20 drop-shadow-md">Room Chat</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
                >
                    <X size={16} className="text-white/70 hover:text-white" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-white/20">
                        <MessageSquare size={32} className="mb-2 opacity-30" />
                        <span className="text-[10px] uppercase tracking-widest font-medium">No messages yet</span>
                    </div>
                )}
                {messages.map((msg, idx) => {
                    const isMe = msg.userId === userId;
                    return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-lg
                                    ${isMe ? 'bg-gradient-to-br from-light-primary to-light-secondary text-white' : 'bg-white/10 text-white/70 backdrop-blur-md'}`}>
                                    {msg.sender[0].toUpperCase()}
                                </div>
                                <div
                                    className={`p-3 rounded-2xl text-xs break-words shadow-lg backdrop-blur-md
                                    ${isMe
                                            ? 'bg-light-primary/20 text-white rounded-tr-none border border-light-primary/20'
                                            : 'bg-white/5 text-white/90 rounded-tl-none border border-white/10'}`}
                                >
                                    {!isMe && <div className="text-[9px] font-bold text-white/40 mb-1 uppercase tracking-wider">{msg.sender}</div>}
                                    {msg.content}
                                </div>
                            </div>
                            <span className="text-[9px] text-white/20 mt-1 px-9 font-medium">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-black/10 backdrop-blur-md">
                <div className="relative group">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="glass-input w-full !py-3.5 !pl-4 !pr-12 text-xs !rounded-xl !bg-white/5 focus:!bg-white/10 transition-all font-medium"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-light-primary to-light-secondary text-white rounded-lg opacity-90 hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-lg shadow-light-primary/20"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatPanel;
