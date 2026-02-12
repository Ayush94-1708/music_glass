import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Search } from 'lucide-react';
import LikeButton from './LikeButton';

const TrackList = ({ tracks, currentIndex, onTrackSelect, likes = {}, onToggleLike, userId }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTracks = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return tracks;
        return tracks.filter(track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query)
        );
    }, [tracks, searchQuery]);

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Search Bar - More Compact */}
            <div className="relative group px-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-light-textSecondary/30 group-focus-within:text-light-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Search music..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-input pl-10 w-full py-2.5 text-xs rounded-xl"
                />
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <div className="space-y-1 pr-1">
                    {filteredTracks.map((track) => {
                        const trackIndex = tracks.findIndex(t => t.id === track.id);
                        const isActive = trackIndex === currentIndex;

                        return (
                            <motion.div
                                key={track.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onTrackSelect(trackIndex)}
                                className={`group p-2.5 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden
                                           ${isActive
                                        ? 'bg-light-primary/10 dark:bg-dark-primary/15 shadow-[0_4px_20px_-4px_rgba(79,163,255,0.2)] border border-light-primary/20'
                                        : 'border border-transparent hover:bg-white/5 hover:border-white/5 hover:shadow-lg'}`}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-light-primary/5 to-transparent pointer-events-none" />
                                )}
                                <div className="flex items-center gap-4">
                                    <div className="relative w-11 h-11 flex-shrink-0">
                                        <img
                                            src={track.coverImage}
                                            alt={track.title}
                                            className={`w-full h-full object-cover rounded-xl shadow-md transition-all duration-500 group-hover:shadow-lg ${isActive ? 'ring-1 ring-light-primary/50' : ''}`}
                                        />
                                        {isActive && (
                                            <div className="absolute inset-0 bg-light-primary/20 rounded-xl flex items-center justify-center backdrop-blur-[2px]">
                                                <div className="flex gap-0.5 items-end h-2.5">
                                                    {[...Array(3)].map((_, i) => (
                                                        <motion.div
                                                            key={i}
                                                            animate={{ height: [3, 10, 3] }}
                                                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }}
                                                            className="w-0.5 bg-white rounded-full"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-[13px] font-bold truncate transition-colors ${isActive ? 'text-light-primary' : 'text-light-textPrimary dark:text-dark-textPrimary'}`}>
                                            {track.title}
                                        </h4>
                                        <p className="text-[11px] text-light-textSecondary dark:text-dark-textSecondary truncate opacity-50">
                                            {track.artist}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Like Button */}
                                        <LikeButton
                                            liked={likes[track.id]?.users.includes(userId)}
                                            count={likes[track.id]?.count || 0}
                                            onToggle={() => onToggleLike(track.id)}
                                        />

                                        <div className={`transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 translate-x-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-light-primary text-white shadow-glow-blue' : 'bg-white/10 text-white backdrop-blur-md'}`}>
                                                <Play size={14} fill="currentColor" className="ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                    {filteredTracks.length === 0 && (
                        <div className="text-center py-10 opacity-20 text-[10px] font-black uppercase tracking-widest">
                            No tracks found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(TrackList);
