import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, User } from 'lucide-react';

const UserList = ({ users, currentUser, onJoinVideo, onLeaveVideo, isVideoEnabled }) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-light-primary dark:bg-dark-primary" />
                    <h3 className="text-[10px] font-black tracking-widest uppercase opacity-40">Participants</h3>
                </div>
                <span className="text-[10px] font-bold opacity-40">{users.length} Active</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                <AnimatePresence initial={false}>
                    {users.map((user) => {
                        const isMe = user.id === currentUser.id;
                        return (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className={`glass-surface p-3 flex items-center justify-between group transition-all duration-300
                                          ${isMe ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                                    ${user.role === 'host'
                                            ? 'bg-gradient-to-br from-light-primary to-light-secondary text-white shadow-glow'
                                            : 'bg-white/10 text-light-textSecondary dark:text-dark-textSecondary'}`}>
                                        {user.role === 'host' ? 'H' : <User size={14} />}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold truncate max-w-[100px]">{user.username}</span>
                                            {isMe && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-light-primary/20 text-light-primary font-black uppercase tracking-wider">You</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold opacity-40 capitalize">{user.role}</span>
                                            {user.isVideoOn && (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-[8px] font-bold text-green-500 uppercase tracking-wider">Live</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>


                                {!isMe && user.isVideoOn && (
                                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                        <Video size={14} />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default UserList;
