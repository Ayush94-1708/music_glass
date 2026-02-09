import React, { useState, useRef, useEffect, useCallback } from 'react';
<<<<<<< HEAD
import { tracks as staticTracks } from '../data/tracks';
import axios from 'axios';
=======
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Volume2, Users, ListMusic, Sparkles, AlertCircle } from 'lucide-react';
import { tracks } from '../data/tracks';
>>>>>>> 59e8064 (glass design ready and all feature are working all well)
import Controls from './Controls';
import ProgressBar from './ProgressBar';
import TrackList from './TrackList';
import io from 'socket.io-client';
import RoomManager from './RoomManager';
import AudioVisualizer from './AudioVisualizer';

// Connect using dynamic hostname
const socket = io(`http://${window.location.hostname}:3001`);

const MusicPlayer = ({ user }) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [volume, setVolume] = useState(80);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(null);
    const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

    // Shared listening state
    const [roomCode, setRoomCode] = useState(null);
    const [role, setRole] = useState(null); // 'host' or 'listener'
    const [users, setUsers] = useState([]); // List of users in room
    const [isVisualizerActive, setIsVisualizerActive] = useState(true);
    const [dynamicTracks, setDynamicTracks] = useState([]);
    const [allTracks, setAllTracks] = useState(staticTracks);

    const audioRef = useRef(null);
    const isInternalUpdate = useRef(false);

    const currentTrack = allTracks[currentTrackIndex] || staticTracks[0];

    // Fetch dynamic tracks from backend
    const fetchSongs = useCallback(async () => {
        try {
            const res = await axios.get(`http://${window.location.hostname}:3001/api/songs`);
            setDynamicTracks(res.data);
            // Prefix dynamic tracks so they appear first or merge with static
            setAllTracks([...res.data, ...staticTracks]);
        } catch (err) {
            console.error("Failed to fetch songs:", err);
        }
    }, []);

    useEffect(() => {
        fetchSongs();
    }, [fetchSongs]);

    const emitAction = (action, data = {}) => {
        if (role === 'host') {
            socket.emit('playback-action', { roomCode, action, data });
        }
    };

    const togglePlayPause = () => {
        if (role === 'listener' && !isAutoplayBlocked) return;

        const newIsPlaying = !isPlaying;
        setIsPlaying(newIsPlaying);

        if (newIsPlaying) {
            audioRef.current.play().catch(error => {
                console.error("Playback failed:", error);
                setIsAutoplayBlocked(true);
            });
        } else {
            audioRef.current.pause();
        }

        emitAction('playPause', { isPlaying: newIsPlaying, currentTime: audioRef.current.currentTime });
    };

    const handleNext = () => {
        if (role === 'listener') return;
        const nextIndex = (currentTrackIndex + 1) % allTracks.length;
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
        emitAction('changeTrack', { trackIndex: nextIndex });
    };

    const handlePrev = () => {
        if (role === 'listener') return;
        const prevIndex = (currentTrackIndex - 1 + allTracks.length) % allTracks.length;
        setCurrentTrackIndex(prevIndex);
        setIsPlaying(true);
        emitAction('changeTrack', { trackIndex: prevIndex });
    };

    const toggleLoop = () => {
        if (role === 'listener') return;
        const newLoopState = !isLooping;
        setIsLooping(newLoopState);
        emitAction('toggleLoop', { isLooping: newLoopState });
    };

    const handleSeek = (time) => {
        if (role === 'listener') return;
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
            emitAction('seek', { currentTime: time });
        }
    };

    const handleTrackSelect = (index) => {
        if (role === 'listener') return;
        setCurrentTrackIndex(index);
        setIsPlaying(true);
        emitAction('changeTrack', { trackIndex: index });
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
            if (audioRef.current.dataset.pendingSeek) {
                const seekTime = parseFloat(audioRef.current.dataset.pendingSeek);
                if (!isNaN(seekTime)) audioRef.current.currentTime = seekTime;
                delete audioRef.current.dataset.pendingSeek;
            }
            if (isPlaying) audioRef.current.play().catch(e => setIsAutoplayBlocked(true));
        }
    };

    const handleTrackEnd = () => {
        if (isLooping) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        } else {
            handleNext();
        }
    };

    const handleAudioError = (e) => {
        console.error("Audio Error:", e);
        setError("Failed to load audio. Please check your connection.");
        setIsPlaying(false);
    };

    useEffect(() => {
        socket.on('room-created', ({ roomCode }) => {
            setRoomCode(roomCode);
            setRole('host');
        });

        socket.on('room-joined', ({ roomCode }) => {
            setRoomCode(roomCode);
            setRole('listener');
        });

        socket.on('room-users-update', (updatedUsers) => {
            setUsers(updatedUsers);
        });

        socket.on('request-sync', ({ requesterId }) => {
            if (role === 'host') {
                const currentState = {
                    trackIndex: currentTrackIndex,
                    currentTime: audioRef.current ? audioRef.current.currentTime : 0,
                    isPlaying,
                    isLooping
                };
                socket.emit('send-sync', { requesterId, state: currentState });
            }
        });

        socket.on('sync-state', (state) => {
            if (state) {
                const trackChanged = state.trackIndex !== currentTrackIndex;
                setCurrentTrackIndex(state.trackIndex);
                setIsPlaying(state.isPlaying);
                setIsLooping(state.isLooping);

                if (audioRef.current) {
                    if (trackChanged) {
                        audioRef.current.dataset.pendingSeek = state.currentTime;
                    } else {
                        audioRef.current.currentTime = state.currentTime;
                    }
                    if (state.isPlaying) {
                        audioRef.current.play().catch(() => setIsAutoplayBlocked(true));
                    } else {
                        audioRef.current.pause();
                    }
                }
            }
        });

        socket.on('sync-action', ({ action, data }) => {
            if (isInternalUpdate.current) return;
            switch (action) {
                case 'playPause':
                    setIsPlaying(data.isPlaying);
                    if (audioRef.current) {
                        audioRef.current.currentTime = data.currentTime;
                        if (data.isPlaying) audioRef.current.play().catch(() => setIsAutoplayBlocked(true));
                        else audioRef.current.pause();
                    }
                    break;
                case 'changeTrack':
                    setCurrentTrackIndex(data.trackIndex);
                    setIsPlaying(true);
                    break;
                case 'seek':
                    if (audioRef.current) {
                        audioRef.current.currentTime = data.currentTime;
                        setCurrentTime(data.currentTime);
                    }
                    break;
                case 'toggleLoop':
                    setIsLooping(data.isLooping);
                    break;
                default:
                    console.warn("Unknown sync action:", action);
            }
        });

        socket.on('error', (msg) => setError(msg));

        return () => {
            socket.off('room-created');
            socket.off('room-joined');
            socket.off('room-users-update');
            socket.off('request-sync');
            socket.off('sync-state');
            socket.off('sync-action');
            socket.off('error');
        };
    }, [role, currentTrackIndex, isPlaying, isLooping]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume / 100;
    }, [volume]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (role !== 'host') return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.code) {
                case 'Space': e.preventDefault(); togglePlayPause(); break;
                case 'ArrowRight': handleNext(); break;
                case 'ArrowLeft': handlePrev(); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [role, isPlaying, currentTrackIndex, isLooping]);

    const createRoom = () => socket.emit('create-room', { username: user.username });
    const joinRoom = (code) => socket.emit('join-room', { roomCode: code, username: user.username });
    const toggleVisualizer = () => setIsVisualizerActive(!isVisualizerActive);

    const handleUnlockAutoplay = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                setIsAutoplayBlocked(false);
            }).catch(e => console.error("Still blocked:", e));
        }
    };

    return (
        <div className="relative">
            {/* Global Immersive Background Visualizer */}
            <div className="fixed inset-0 z-[-1] pointer-events-none opacity-20 transition-opacity duration-1000">
                <AudioVisualizer
                    audioRef={audioRef}
                    isPlaying={isPlaying}
                    volume={volume}
                    isActive={isVisualizerActive}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                {/* Player Section - Compact 5 Columns */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-5 flex flex-col h-full"
                >
                    <div className="glass-surface p-6 lg:p-8 relative overflow-hidden h-full flex flex-col justify-center">
                        {/* Hidden Audio */}
                        <audio
                            ref={audioRef}
                            src={currentTrack.audioUrl}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleTrackEnd}
                            onError={handleAudioError}
                        />

                        {/* Autoplay Block Overlay */}
                        <AnimatePresence>
                            {isAutoplayBlocked && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={handleUnlockAutoplay}
                                    className="absolute inset-0 z-50 glass-surface flex flex-col items-center justify-center cursor-pointer bg-white/10 dark:bg-black/20 backdrop-blur-2xl"
                                >
                                    <div className="w-16 h-16 glass-surface flex items-center justify-center rounded-full mb-4 bg-white/20">
                                        <Volume2 size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold">Tap to play</h3>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Artwork */}
                        <div className="relative z-10 group mb-6 flex justify-center">
                            <motion.div
                                animate={isPlaying ? { scale: 1.02, rotate: [0, 0.5, 0, -0.5, 0] } : { scale: 1, rotate: 0 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="relative z-10 w-[210px] h-[210px]"
                            >
                                <img
                                    src={currentTrack.coverImage}
                                    alt={currentTrack.title}
                                    className={`w-full h-full object-cover rounded-[24px] shadow-2xl transition-all duration-1000 ${isPlaying ? 'ring-2 ring-light-primary/30 dark:ring-dark-primary/30' : ''}`}
                                />
                                {isPlaying && (
                                    <div className="absolute inset-0 rounded-[24px] bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                )}
                            </motion.div>
                        </div>

                        {/* Metadata & Visualizer Toggle */}
                        <div className="relative z-10 text-center mb-6">
                            <motion.h2
                                key={currentTrack.title}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xl lg:text-2xl font-black tracking-tight"
                            >
                                {currentTrack.title}
                            </motion.h2>
                            <motion.p
                                key={currentTrack.artist}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-sm text-light-textSecondary dark:text-dark-textSecondary mt-0.5 opacity-80"
                            >
                                {currentTrack.artist}
                            </motion.p>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleVisualizer}
                                className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                                           ${isVisualizerActive
                                        ? 'bg-light-primary/20 text-light-primary border border-light-primary/20'
                                        : 'bg-white/5 text-light-textSecondary border border-white/5'}`}
                            >
                                <Sparkles size={12} />
                                <span>{isVisualizerActive ? 'Visualizer On' : 'Visualizer Off'}</span>
                            </motion.button>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/10 rounded-xl flex items-center gap-2 text-red-500">
                                <AlertCircle size={16} />
                                <span className="text-xs font-bold">{error}</span>
                            </div>
                        )}

                        {/* Controls Container */}
                        <div className="space-y-6">
                            <ProgressBar
                                currentTime={currentTime}
                                duration={duration}
                                onSeek={handleSeek}
                                readOnly={role === 'listener'}
                            />

                            <div className="pt-2">
                                {role !== 'listener' ? (
                                    <Controls
                                        isPlaying={isPlaying}
                                        isLooping={isLooping}
                                        volume={volume}
                                        onPlayPause={togglePlayPause}
                                        onNext={handleNext}
                                        onPrev={handlePrev}
                                        onToggleLoop={toggleLoop}
                                        onVolumeChange={setVolume}
                                        isDisabled={!!error}
                                    />
                                ) : (
                                    <div className="glass-surface py-4 flex items-center justify-center gap-3 border-white/5">
                                        <div className="flex gap-1">
                                            {[...Array(3)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: isPlaying ? [8, 16, 8] : 8 }}
                                                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                                                    className="w-1 bg-light-primary dark:bg-dark-primary rounded-full"
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-black tracking-widest uppercase opacity-60">
                                            Synced Listening
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Sidebar Section - Strengthened 7 Columns */}
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-7 flex flex-col h-full"
                >
                    <div className="glass-surface glass-glow p-6 flex flex-col gap-6 h-full">
                        <section>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-light-primary" />
                                <h3 className="text-[10px] font-black tracking-widest uppercase opacity-40">Session</h3>
                            </div>
                            <RoomManager
                                onCreateRoom={createRoom}
                                onJoinRoom={joinRoom}
                                roomCode={roomCode}
                                role={role}
                                users={users}
                            />
                        </section>

<<<<<<< HEAD
                    <TrackList
                        tracks={allTracks}
                        currentIndex={currentTrackIndex}
                        onTrackSelect={handleTrackSelect}
                    />
                </div>
=======
                        <div className="h-px bg-white/5 mx-1" />

                        <section className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-light-secondary" />
                                <h3 className="text-[10px] font-black tracking-widest uppercase opacity-40">Up Next</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                                <TrackList
                                    tracks={tracks}
                                    currentIndex={currentTrackIndex}
                                    onTrackSelect={handleTrackSelect}
                                />
                            </div>
                        </section>
                    </div>
                </motion.div>
>>>>>>> 59e8064 (glass design ready and all feature are working all well)
            </div>
        </div>
    );
};

export default MusicPlayer;
