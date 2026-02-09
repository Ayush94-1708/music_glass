import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Repeat, Volume2, VolumeX, Music } from 'lucide-react';

const Controls = ({ isPlaying, isLooping, volume, onPlayPause, onNext, onPrev, onToggleLoop, onVolumeChange, isDisabled }) => {
    return (
        <div className="flex flex-col gap-6">
            {/* Main Playback Controls */}
            <div className="flex items-center justify-between px-2">
                <motion.button
                    whileHover={{ scale: 1.1, rotate: -10 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onToggleLoop}
                    disabled={isDisabled}
                    className={`p-2 transition-colors ${isLooping ? 'text-light-primary' : 'text-light-textSecondary/30 hover:text-light-textSecondary'}`}
                >
                    <Repeat size={18} />
                </motion.button>

                <div className="flex items-center gap-6 lg:gap-8">
                    <motion.button
                        whileHover={{ scale: 1.1, x: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onPrev}
                        disabled={isDisabled}
                        className="p-3 text-light-textPrimary dark:text-dark-textPrimary hover:bg-white/5 rounded-full transition-colors"
                    >
                        <SkipBack size={24} fill="currentColor" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onPlayPause}
                        disabled={isDisabled}
                        className="w-16 h-16 rounded-full glass-button-primary flex items-center justify-center shadow-xl relative group z-10"
                    >
                        {/* Pulse effect */}
                        {isPlaying && (
                            <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 rounded-full bg-light-primary/30 -z-10"
                            />
                        )}
                        {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="ml-1" />}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, x: 2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onNext}
                        disabled={isDisabled}
                        className="p-3 text-light-textPrimary dark:text-dark-textPrimary hover:bg-white/5 rounded-full transition-colors"
                    >
                        <SkipForward size={24} fill="currentColor" />
                    </motion.button>
                </div>

                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-light-textSecondary/30 hover:text-light-textSecondary"
                >
                    <Music size={18} />
                </motion.button>
            </div>

            {/* Premium Volume Slider */}
            <div className="flex items-center gap-4 px-2">
                <div className="text-light-textSecondary/40">
                    {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </div>
                <div className="flex-1 h-1.5 relative group cursor-pointer">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                    />
                    <div className="absolute inset-0 bg-white/5 rounded-full" />
                    <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-light-primary/60 to-light-primary rounded-full shadow-[0_0_10px_rgba(79,163,255,0.3)]"
                        style={{ width: `${volume}%` }}
                    />
                    <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `calc(${volume}% - 6px)` }}
                    />
                </div>
                <span className="text-[10px] font-black w-6 text-light-textSecondary/30 tabular-nums">
                    {volume}%
                </span>
            </div>
        </div>
    );
};

export default Controls;
