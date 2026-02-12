import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Shield, Copy, Check, ArrowLeft } from 'lucide-react';

const RoomManager = ({ onCreateRoom, onJoinRoom, onLeaveRoom, roomCode, role, users }) => {
    const [inputCode, setInputCode] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (roomCode) {
            navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
                {!roomCode ? (
                    <motion.div
                        key="join"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col gap-4"
                    >
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onCreateRoom}
                            className="glass-button-primary w-full py-3.5 text-sm font-bold tracking-wide flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            Join with Friends
                        </motion.button>

                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20">or</span>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="ENTER ACCESS CODE"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                className="glass-input pr-20 text-center tracking-[0.25em] font-black placeholder:tracking-normal placeholder:font-bold placeholder:opacity-50 text-lg border-white/10 focus:border-light-primary/40 focus:bg-white/5 transition-all"
                            />
                            <button
                                onClick={() => onJoinRoom(inputCode)}
                                disabled={!inputCode}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-light-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-light-primary/90 disabled:opacity-0 disabled:pointer-events-none transition-all shadow-glow-blue"
                            >
                                Join
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="joined"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="flex flex-col gap-4"
                    >
                        {/* Back Button */}
                        <button
                            onClick={onLeaveRoom}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity mb-2"
                        >
                            <ArrowLeft size={14} />
                            <span>Leave Session</span>
                        </button>

                        <div className="flex items-center justify-between p-5 glass-surface bg-white/5 border-white/5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-light-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="flex flex-col gap-1 relative z-10">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Access Code</span>
                                <span className="text-2xl font-black tracking-[0.25em] text-light-primary drop-shadow-sm">{roomCode}</span>
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all relative z-10 ${copied ? 'bg-green-500 text-white shadow-glow-green' : 'bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95'}`}
                            >
                                {copied ? <Check size={20} /> : <Copy size={20} className="opacity-80" />}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="glass-surface p-4 flex flex-col gap-2 items-center bg-white/5 border-transparent hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-1.5 opacity-40">
                                    <Shield size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Role</span>
                                </div>
                                <span className="text-xs font-bold capitalize text-light-primary bg-light-primary/10 px-3 py-1 rounded-full border border-light-primary/20">
                                    {role}
                                </span>
                            </div>
                            <div className="glass-surface p-4 flex flex-col gap-2 items-center bg-white/5 border-transparent hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-1.5 opacity-40">
                                    <Users size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
                                </div>
                                <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-white/10">
                                    {users.length} Listeners
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RoomManager;
