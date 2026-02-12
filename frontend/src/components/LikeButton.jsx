import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

const LikeButton = ({ liked, count, onToggle }) => {
    return (
        <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            className="flex items-center gap-1.5 group"
        >
            <div className="relative">
                <Heart
                    size={16}
                    className={`transition-colors duration-300 ${liked
                        ? 'fill-red-500 text-red-500'
                        : 'text-white/40 group-hover:text-white/80'
                        }`}
                />
                {liked && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 bg-red-500 rounded-full"
                    />
                )}
            </div>
            {count > 0 && (
                <span className={`text-[10px] font-bold ${liked ? 'text-red-500' : 'text-white/40'}`}>
                    {count}
                </span>
            )}
        </motion.button>
    );
};

export default LikeButton;
