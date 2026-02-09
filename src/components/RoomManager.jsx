import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Shield, Copy, Check } from 'lucide-react';

const RoomManager = ({ onCreateRoom, onJoinRoom, roomCode, role, users }) => {
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
                            Create Session
                        </motion.button>

                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20">or</span>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Enter Access Code"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                className="glass-input pr-12 text-center tracking-[0.3em] font-black placeholder:tracking-normal placeholder:font-bold"
                            />
                            <button
                                onClick={() => onJoinRoom(inputCode)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-light-primary hover:scale-110 transition-transform"
                            >
                                <Check size={20} strokeWidth={3} />
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
                        <div className="flex items-center justify-between p-4 glass-surface bg-white/5 border-white/5">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Access Code</span>
                                <span className="text-xl font-black tracking-[0.2em]">{roomCode}</span>
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-green-500/20 text-green-500' : 'hover:bg-white/10 opacity-60 hover:opacity-100'}`}
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="glass-surface p-3 flex flex-col gap-1 items-center bg-white/5 border-transparent">
                                <div className="flex items-center gap-1.5 opacity-40">
                                    <Shield size={10} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Role</span>
                                </div>
                                <span className="text-[11px] font-bold capitalize text-light-primary">{role}</span>
                            </div>
                            <div className="glass-surface p-3 flex flex-col gap-1 items-center bg-white/5 border-transparent">
                                <div className="flex items-center gap-1.5 opacity-40">
                                    <Users size={10} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Live</span>
                                </div>
                                <span className="text-[11px] font-bold">{users.length} listeners</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RoomManager;
