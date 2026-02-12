import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Repeat, Volume2, VolumeX } from 'lucide-react';

const Controls = ({ isPlaying, isLooping, volume, onPlayPause, onNext, onPrev, onToggleLoop, onVolumeChange, isDisabled }) => {
    return (
        <div className="flex flex-col gap-6">
            {/* Main Playback Controls */}
            <div className="relative flex items-center justify-center px-2">
                <motion.button
                    whileHover={{ scale: 1.1, rotate: -10 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onToggleLoop}
                    disabled={isDisabled}
                    className={`absolute left-2 p-2 transition-colors ${isLooping ? 'text-light-primary' : 'text-light-textSecondary/30 hover:text-light-textSecondary'}`}
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
                        className="w-14 h-14 rounded-full glass-button-primary flex items-center justify-center shadow-[0_10px_30px_-5px_rgba(79,163,255,0.4)] relative group z-10 border border-white/10"
                    >
                        {/* Soft Glow Pulse */}
                        {isPlaying && (
                            <motion.div
                                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                                className="absolute inset-0 rounded-full bg-light-primary/40 blur-md -z-10"
                            />
                        )}
                        {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-1" />}
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


            </div>

            {/* Premium Volume Slider */}
            <div className="flex items-center gap-4 px-2">
                <div className="text-light-textSecondary/40">
                    {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </div>
                <div className="flex-1 h-1 relative group cursor-pointer">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                    />
                    <div className="absolute inset-0 bg-white/5 rounded-full" />
                    <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-light-primary/80 to-light-primary rounded-full shadow-[0_0_8px_rgba(79,163,255,0.4)]"
                        style={{ width: `${volume}%` }}
                    />
                    <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        style={{ left: `calc(${volume}% - 5px)` }}
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
