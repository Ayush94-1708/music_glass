import React from 'react';
import { motion } from 'framer-motion';

/**
 * ProgressBar component for displaying and controlling audio progress.
 * @param {Object} props
 * @param {number} props.currentTime - Current playback time in seconds.
 * @param {number} props.duration - Total duration of the track in seconds.
 * @param {Function} props.onSeek - Callback for when the user seeks.
 */
const ProgressBar = ({ currentTime, duration, onSeek, readOnly = false }) => {
    // Format seconds to mm:ss
    const formatTime = (time) => {
        if (isNaN(time)) return '00:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleProgressChange = (e) => {
        onSeek(parseFloat(e.target.value));
    };

    return (
        <div className="space-y-2">
            <div className="flex-1 h-1.5 relative group cursor-pointer">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.1"
                    value={currentTime}
                    onChange={handleProgressChange}
                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                    disabled={readOnly}
                />

                {/* Background track */}
                <div className="absolute inset-0 bg-white/5 rounded-full" />

                {/* Progress Fill */}
                <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-light-primary/60 to-light-primary rounded-full shadow-[0_0_10px_rgba(79,163,255,0.3)] z-10"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                />

                {/* Thumb */}
                {!readOnly && (
                    <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)` }}
                    />
                )}
            </div>

            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-light-textSecondary/40 tabular-nums">
                    {formatTime(currentTime)}
                </span>
                <span className="text-[10px] font-black text-light-textSecondary/40 tabular-nums">
                    {formatTime(duration)}
                </span>
            </div>
        </div>
    );
};

export default ProgressBar;
