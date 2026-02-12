import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Volume2, Users, ListMusic, Sparkles, AlertCircle, Video, VideoOff, Minimize2, Maximize2 } from 'lucide-react';
import { tracks as staticTracks } from '../data/tracks';
import axios from 'axios';
import Controls from './Controls';
import ProgressBar from './ProgressBar';
import TrackList from './TrackList';
import UserList from './UserList';
import VideoGrid from './VideoGrid';
import io from 'socket.io-client';
import RoomManager from './RoomManager';
import AudioVisualizer from './AudioVisualizer';
import ErrorBoundary from './ErrorBoundary';
import useScrollPerformance from '../hooks/useScrollPerformance';
import ChatPanel from './ChatPanel';

// Connect using dynamic hostname and protocol-aware logic
// Connect using dynamic hostname and protocol-aware logic
const getBaseUrl = () => {
    return import.meta.env.VITE_API_URL || '';
};

const socket = io(getBaseUrl() || '/', {
    path: '/socket.io',
    autoConnect: true
});

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
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isVideoMinimized, setIsVideoMinimized] = useState(false);
    const [videoNotification, setVideoNotification] = useState(null); // { username }

    // Engagement State
    const [likes, setLikes] = useState({}); // { songId: { count: 0, users: [] } }
    const [activeRightPanel, setActiveRightPanel] = useState('playlist'); // 'playlist' | 'chat'


    // Add connection monitoring
    useEffect(() => {
        const onConnect = () => {
            console.log("Socket connected:", socket.id);
            setError(null);
        };
        const onConnectError = (err) => {
            console.error("Socket connection error:", err);
            setError("Cannot connect to server. Ensure backend is running.");
        };
        const onDisconnect = (reason) => {
            console.warn("Socket disconnected:", reason);
        };

        socket.on('connect', onConnect);
        socket.on('connect_error', onConnectError);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('connect_error', onConnectError);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    // Refs for stable access in socket listeners (avoids stale closures)
    const stateRef = useRef({
        role: null,
        currentTrackIndex: 0,
        isPlaying: false,
        isLooping: false,
        roomCode: null
    });

    useEffect(() => {
        stateRef.current = { role, currentTrackIndex, isPlaying, isLooping, roomCode };
    }, [role, currentTrackIndex, isPlaying, isLooping, roomCode]);

    // --- Video Signaling Listeners (UI Only) ---
    useEffect(() => {
        if (!socket) return;
        const handleUserJoinedVideo = ({ userId: joinedUserId }) => {
            const joinedUser = users.find(u => u.id === joinedUserId);
            if (joinedUser && !isVideoEnabled && joinedUserId !== socket.id) {
                setVideoNotification({ username: joinedUser.username });
                setTimeout(() => setVideoNotification(null), 5000);
            }
        };
        socket.on('user-joined-video', handleUserJoinedVideo);
        return () => socket.off('user-joined-video', handleUserJoinedVideo);
    }, [socket, users, isVideoEnabled]);

    const [isVisualizerActive, setIsVisualizerActive] = useState(true);
    const [dynamicTracks, setDynamicTracks] = useState([]);
    const [allTracks, setAllTracks] = useState(staticTracks);

    const audioRef = useRef(null);
    const isInternalUpdate = useRef(false);
    const scrollRef = useRef(null);

    // Scroll performance optimization
    const isScrolling = useScrollPerformance(scrollRef);

    const currentTrack = allTracks[currentTrackIndex] || staticTracks[0];

    const fetchSongs = useCallback(async () => {
        try {
            const res = await axios.get(`${getBaseUrl()}/api/songs`);
            setDynamicTracks(res.data);
            setAllTracks([...res.data, ...staticTracks]);
        } catch (err) {
            console.error("Failed to fetch songs:", err);
        }
    }, []);

    useEffect(() => {
        fetchSongs();
    }, [fetchSongs]);

    const emitAction = (action, data = {}) => {
        if (stateRef.current.role === 'host') {
            socket.emit('sync-action', { roomCode: stateRef.current.roomCode, action, data });
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

    const handleToggleLike = (songId) => {
        if (!socket) return;
        socket.emit('toggleLike', {
            roomCode: stateRef.current.roomCode,
            songId,
            userId: socket.id
        });
    };

    const handleNext = () => {
        if (role === 'listener') return;

        // Auto-play logic based on likes
        let nextIndex = (currentTrackIndex + 1) % allTracks.length;

        // Check if there are any likes
        const likedSongs = Object.keys(likes).filter(id => likes[id]?.count > 0);
        if (likedSongs.length > 0) {
            // Find track with highest likes that isn't the current one (optional: allow repeat?)
            // For now, simple highest likes
            const sortedTracks = [...allTracks].sort((a, b) => {
                const countA = likes[a.id]?.count || 0;
                const countB = likes[b.id]?.count || 0;
                return countB - countA;
            });

            // If the top song is the current one, and there are others, take the next best?
            // User requirement: "Play song with highest like count".
            // If current is highest, repeating it sounds annoying unless it's a "vote for next" system.
            // Usually "Auto-play next" implies "next in sequence" or "voted next".
            // I'll pick the highest liked song that is NOT current, unless only current has likes.
            const bestCandidate = sortedTracks.find(t => t.id !== currentTrack.id && (likes[t.id]?.count || 0) > 0);

            if (bestCandidate) {
                const candidateIndex = allTracks.findIndex(t => t.id === bestCandidate.id);
                if (candidateIndex !== -1) {
                    nextIndex = candidateIndex;
                    // Optional: Reset likes for this song after playing? User didn't specify.
                    // Keeping likes means it might loop between top 2.
                    // Implementation plan: "I will select the highest liked song from the rest of the playlist."
                }
            }
        }

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
        socket.on('likes-update', (updatedLikes) => {
            setLikes(updatedLikes);
        });
        socket.on('request-sync', ({ requesterId }) => {
            if (stateRef.current.role === 'host') {
                const currentState = {
                    trackIndex: stateRef.current.currentTrackIndex,
                    currentTime: audioRef.current ? audioRef.current.currentTime : 0,
                    isPlaying: stateRef.current.isPlaying,
                    isLooping: stateRef.current.isLooping
                };
                socket.emit('send-sync', { requesterId, state: currentState });
            }
        });
        socket.on('sync-state', (state) => {
            if (state) {
                const trackChanged = state.trackIndex !== stateRef.current.currentTrackIndex;
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
            socket.off('likes-update');
            socket.off('request-sync');
            socket.off('sync-state');
            socket.off('sync-action');
            socket.off('error');
        };
    }, []); // Only register once

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

    const createRoom = () => {
        if (!socket.connected) {
            console.error("Socket not connected");
            setError("Connection to server lost. Please refresh.");
            return;
        }
        socket.emit('create-room', { username: user?.username || 'Anonymous' });
    };

    const joinRoom = (code) => {
        if (!socket.connected) {
            console.error("Socket not connected");
            setError("Connection to server lost. Please refresh.");
            return;
        }
        socket.emit('join-room', { roomCode: code, username: user?.username || 'Anonymous' });
    };
    const leaveRoom = () => {
        setRoomCode(null);
        setRole(null);
        setUsers([]);
        setIsVideoEnabled(false);
        setLikes({});
        setActiveRightPanel('playlist');
        // We don't necessarily need to disconnect, but resetting state is key
    };

    const toggleVisualizer = () => setIsVisualizerActive(!isVisualizerActive);

    const handleUnlockAutoplay = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                setIsAutoplayBlocked(false);
            }).catch(e => console.error("Still blocked:", e));
        }
    };

    const handleJoinVideo = () => {
        setIsVideoEnabled(true);
        setIsVideoMinimized(false);
    };
    const handleLeaveVideo = () => {
        setIsVideoEnabled(false);
        setIsVideoMinimized(false);
    };

    return (
        <div className="relative">
            {/* Global Immersive Background Visualizer */}
            <div className="fixed inset-0 z-[-1] pointer-events-none opacity-100 transition-opacity duration-1000">
                <AudioVisualizer
                    audioRef={audioRef}
                    isPlaying={isPlaying}
                    volume={volume}
                    isActive={isVisualizerActive}
                />
            </div>

            {/* Video Call Notification */}
            <AnimatePresence>
                {videoNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 glass-surface p-4 rounded-3xl border-white/20 shadow-2xl flex items-center gap-4 min-w-[300px]"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-500">
                            <Video size={20} />
                        </div>
                        <div className="flex flex-col flex-1">
                            <span className="text-sm font-bold">{videoNotification.username} started video</span>
                            <span className="text-[10px] opacity-60">Join the room to see them!</span>
                        </div>
                        <button
                            onClick={handleJoinVideo}
                            className="px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-black uppercase tracking-wider shadow-glow-green"
                        >
                            Join
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dedicated Video Call Overlay (WhatsApp Style) */}
            <AnimatePresence>
                {isVideoEnabled && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 100 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            height: isVideoMinimized ? 'auto' : '70vh',
                            width: isVideoMinimized ? '320px' : 'calc(100% - 48px)',
                            left: isVideoMinimized ? 'auto' : '24px',
                            right: '24px',
                            bottom: '120px'
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: 100 }}
                        className="fixed z-40 bg-black/40 backdrop-blur-3xl rounded-[40px] border border-white/20 shadow-[-20px_-20px_60px_rgba(0,0,0,0.5),20px_20px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-500 ease-in-out"
                    >
                        {/* Header */}
                        <div className="px-8 py-4 flex items-center justify-between border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-2xl bg-green-500/20 text-green-500">
                                    <Video size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-white/90">Video Call</h4>
                                    {!isVideoMinimized && (
                                        <span className="text-[10px] font-bold text-green-500/80 uppercase tracking-tighter">
                                            {(users || []).filter(u => u.isVideoOn).length} Participants Live
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsVideoMinimized(!isVideoMinimized)}
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                                >
                                    {isVideoMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                                </button>
                                <button
                                    onClick={handleLeaveVideo}
                                    className="px-4 py-2 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-glow-red"
                                >
                                    Leave Call
                                </button>
                            </div>
                        </div>

                        {/* Video Content */}
                        {!isVideoMinimized && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <ErrorBoundary>
                                    <VideoGrid
                                        socket={socket}
                                        roomCode={roomCode}
                                        userId={socket.id}
                                        isVideoEnabled={isVideoEnabled}
                                        users={users || []}
                                    />
                                </ErrorBoundary>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Conditional Layout Grid - Stable 3-Panel System */}
            <div className={`grid gap-6 lg:gap-6 items-start transition-all duration-300 ease-in-out
                ${roomCode
                    ? 'grid-cols-1 lg:grid-cols-[minmax(300px,340px)_minmax(280px,1fr)_minmax(300px,380px)]'
                    : 'grid-cols-1 lg:grid-cols-[minmax(300px,340px)_1fr]'
                } ${isScrolling ? 'scrolling' : ''}`}>

                {/* Music Player - Fixed Width Column (Never Resizes) */}
                <motion.div
                    layout
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col h-full w-full"
                >
                    <div className="glass-surface p-6 lg:p-8 relative overflow-hidden h-full flex flex-col justify-center">
                        {/* Hidden Audio */}
                        <audio
                            ref={audioRef}
                            src={currentTrack.audioUrl.startsWith('http') ? currentTrack.audioUrl : `${getBaseUrl()}${currentTrack.audioUrl}`}
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
                                    className="absolute inset-0 z-100 glass-surface flex flex-col items-center justify-center cursor-pointer bg-white/10 dark:bg-black/20 backdrop-blur-2xl"
                                >
                                    <div className="w-16 h-16 glass-surface flex items-center justify-center rounded-full mb-4 bg-white/20">
                                        <Volume2 size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold">Tap to play</h3>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Artwork */}
                        <div className="relative z-10 group mb-4 flex justify-center">
                            <motion.div
                                animate={isPlaying ? { scale: 1.02 } : { scale: 1 }}
                                className={`relative z-10 w-[180px] h-[180px] ${isPlaying ? 'animate-[breath_4s_ease-in-out_infinite]' : ''}`}
                            >
                                <img
                                    src={currentTrack.coverImage.startsWith('http') ? currentTrack.coverImage : `${getBaseUrl()}${currentTrack.coverImage}`}
                                    alt={currentTrack.title}
                                    className={`w-full h-full object-cover rounded-[20px] shadow-2xl transition-all duration-1000 ${isPlaying ? 'ring-1 ring-light-primary/30 dark:ring-dark-primary/30' : ''}`}
                                />
                                {isPlaying && (
                                    <div className="absolute inset-0 rounded-[20px] bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
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
                                className="text-xs font-medium text-light-textSecondary dark:text-dark-textSecondary mt-0.5 opacity-80"
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
                                audioRef={audioRef}
                                isPlaying={isPlaying}
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

                {/* Session Panel - Conditional (Appears when room is active) */}
                <AnimatePresence mode="wait">
                    {roomCode && (
                        <motion.div
                            initial={{ opacity: 0, x: -20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -20, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            layout
                            className="flex flex-col h-full"
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
                                        onLeaveRoom={leaveRoom}
                                        roomCode={roomCode}
                                        role={role}
                                        users={users}
                                    />
                                </section>

                                <div className="h-px bg-white/5 mx-1" />

                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-light-primary" />
                                            <h3 className="text-[10px] font-black tracking-widest uppercase opacity-40">Participants</h3>
                                        </div>

                                        {/* Centralized Join Video Button */}
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={isVideoEnabled ? handleLeaveVideo : handleJoinVideo}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all
                                                      ${isVideoEnabled
                                                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/20'
                                                    : 'bg-green-500/20 text-green-500 hover:bg-green-500/30 border border-green-500/20'}`}
                                        >
                                            {isVideoEnabled ? (
                                                <>
                                                    <VideoOff size={12} />
                                                    <span>Leave ({(users || []).filter(u => u.isVideoOn).length})</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Users size={12} />
                                                    <span>Join ({(users || []).filter(u => u.isVideoOn).length})</span>
                                                </>
                                            )}
                                        </motion.button>
                                    </div>
                                    <UserList
                                        users={users}
                                        currentUser={{ ...user, id: socket.id }}
                                        onJoinVideo={handleJoinVideo}
                                        onLeaveVideo={handleLeaveVideo}
                                        isVideoEnabled={isVideoEnabled}
                                    />
                                </section>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Playlist Panel - Adjusts Width Smoothly */}
                <motion.div
                    layout
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col h-full"
                >
                    <div className="glass-surface glass-glow p-6 flex flex-col gap-6 h-full">
                        {/* Show RoomManager only when NO session is active */}
                        {!roomCode && (
                            <>
                                <section>
                                    <div className="flex items-center gap-2 mb-4 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-light-primary" />
                                        <h3 className="text-[10px] font-black tracking-widest uppercase opacity-40">Session</h3>
                                    </div>
                                    <RoomManager
                                        onCreateRoom={createRoom}
                                        onJoinRoom={joinRoom}
                                        onLeaveRoom={leaveRoom}
                                        roomCode={roomCode}
                                        role={role}
                                        users={users}
                                    />
                                </section>
                                <div className="h-px bg-white/5 mx-1" />
                            </>
                        )}

                        {/* Video Invite Toast */}
                        <AnimatePresence>
                            {!isVideoEnabled && (users || []).filter(u => u.isVideoOn).length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                                    className="fixed bottom-6 right-6 z-50 glass-surface glass-glow p-4 rounded-xl shadow-2xl border border-light-primary/20 max-w-sm"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-light-primary/20 flex items-center justify-center text-light-primary animate-pulse">
                                            <Video size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">Video Call Started</h4>
                                            <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mb-3">
                                                {(users || []).filter(u => u.isVideoOn).length} person(s) are in the video call. Would you like to join?
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleJoinVideo}
                                                    className="px-3 py-1.5 rounded-lg bg-light-primary text-white text-xs font-bold hover:bg-light-primary/90 transition-colors"
                                                >
                                                    Join Now
                                                </button>
                                                <button
                                                    onClick={() => {/* Dismiss logic could be added here if we want a manual dismiss state */ }}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-bold hover:bg-white/10 transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Playlist/Chat Section */}
                        <section className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                            {/* Toggle Header */}
                            <div className="flex items-center gap-4 mb-4 px-1 border-b border-white/5 pb-2">
                                <button
                                    onClick={() => setActiveRightPanel('playlist')}
                                    className={`text-[10px] font-black tracking-widest uppercase transition-colors relative
                                        ${activeRightPanel === 'playlist' ? 'text-light-primary' : 'text-light-textSecondary opacity-40 hover:opacity-80'}`}
                                >
                                    Playlist
                                    {activeRightPanel === 'playlist' && (
                                        <motion.div layoutId="panel-tab" className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-light-primary" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveRightPanel('chat')}
                                    className={`text-[10px] font-black tracking-widest uppercase transition-colors relative flex items-center gap-2
                                        ${activeRightPanel === 'chat' ? 'text-light-primary' : 'text-light-textSecondary opacity-40 hover:opacity-80'}`}
                                >
                                    Chat
                                    {activeRightPanel === 'chat' && (
                                        <motion.div layoutId="panel-tab" className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-light-primary" />
                                    )}
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 relative">
                                <AnimatePresence mode="wait">
                                    {activeRightPanel === 'playlist' ? (
                                        <motion.div
                                            key="playlist"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="h-full max-h-[340px] scroll-container pr-1"
                                            ref={scrollRef}
                                        >
                                            <TrackList
                                                tracks={allTracks}
                                                currentIndex={currentTrackIndex}
                                                onTrackSelect={handleTrackSelect}
                                                likes={likes}
                                                onToggleLike={handleToggleLike}
                                                userId={socket.id}
                                            />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="chat"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="h-full absolute inset-0"
                                        >
                                            {roomCode ? (
                                                <ChatPanel
                                                    socket={socket}
                                                    roomCode={roomCode}
                                                    username={user?.username || 'Guest'}
                                                    userId={socket.id}
                                                    onClose={() => setActiveRightPanel('playlist')}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-center opacity-40 p-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest mb-2">Room Required</span>
                                                    <p className="text-xs">Join or create a room to chat.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </section>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default MusicPlayer;
