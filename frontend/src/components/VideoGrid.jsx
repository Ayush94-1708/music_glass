import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Video } from 'lucide-react';

const VideoGrid = ({ socket, roomCode, userId, isVideoEnabled, users, onMinimize }) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});

    // Refs for stable access in event handlers
    const localStreamRef = useRef(null);
    const peersRef = useRef({}); // { [remoteUserId]: RTCPeerConnection }
    const localVideoRef = useRef(null);
    const hasJoinedVideo = useRef(false);

    // --- REQUIREMENT: Robust STUN + TURN for Cross-Device ---
    const STUN_SERVERS = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            // Public TURN server for testing
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ],
        iceCandidatePoolSize: 10,
    };

    // --- 1. Peer Connection Creation ---
    const createPeerConnection = (remoteUserId) => {
        if (peersRef.current[remoteUserId]) {
            return peersRef.current[remoteUserId];
        }

        console.log(`[WebRTC] Creating peer connection for ${remoteUserId}`);
        const pc = new RTCPeerConnection(STUN_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', {
                    to: remoteUserId,
                    signal: { type: 'candidate', candidate: event.candidate }
                });
            }
        };

        pc.ontrack = (event) => {
            console.log(`[WebRTC] Received track from ${remoteUserId}:`, event.track.kind);

            // Handle multiple ways streams can be provided
            let remoteStream = event.streams[0];
            if (!remoteStream) {
                // If stream isn't provided, create one and add the track
                remoteStream = new MediaStream();
                remoteStream.addTrack(event.track);
            }

            setRemoteStreams(prev => {
                // If we already have a stream for this user, add the new track to it
                if (prev[remoteUserId]) {
                    prev[remoteUserId].addTrack(event.track);
                    return { ...prev };
                }
                return {
                    ...prev,
                    [remoteUserId]: remoteStream
                };
            });
        };

        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] Connection state with ${remoteUserId}: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
                removePeer(remoteUserId);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE Connection state with ${remoteUserId}: ${pc.iceConnectionState}`);
        };

        // Add local tracks if available
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        peersRef.current[remoteUserId] = pc;
        return pc;
    };

    const removePeer = (remoteUserId) => {
        if (peersRef.current[remoteUserId]) {
            try { peersRef.current[remoteUserId].close(); } catch (e) { }
            delete peersRef.current[remoteUserId];
            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[remoteUserId];
                return newStreams;
            });
        }
    };

    const candidateQueueRef = useRef({}); // { [remoteUserId]: RTCIceCandidate[] }

    // --- 2. Signaling Logic (Socket Listeners) ---
    useEffect(() => {
        if (!socket) return;
        const handleSignal = async ({ from, signal }) => {
            if (!isVideoEnabled) return;
            try {
                let pc = peersRef.current[from];
                if (!pc && signal.type === 'offer') pc = createPeerConnection(from);
                if (!pc) return;

                if (signal.type === 'candidate') {
                    if (pc.remoteDescription && pc.remoteDescription.type) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                        } catch (e) {
                            console.error("[WebRTC] Error adding received candidate:", e);
                        }
                    } else {
                        // Queue candidate if remote description not set
                        if (!candidateQueueRef.current[from]) candidateQueueRef.current[from] = [];
                        candidateQueueRef.current[from].push(signal.candidate);
                    }
                } else if (signal.type === 'offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));

                    // Process queued candidates
                    if (candidateQueueRef.current[from]) {
                        for (const candidate of candidateQueueRef.current[from]) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (e) {
                                console.error("[WebRTC] Error adding queued candidate:", e);
                            }
                        }
                        delete candidateQueueRef.current[from];
                    }

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('signal', { to: from, signal: pc.localDescription });
                } else if (signal.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));

                    // Process queued candidates
                    if (candidateQueueRef.current[from]) {
                        for (const candidate of candidateQueueRef.current[from]) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (e) {
                                console.error("[WebRTC] Error adding queued candidate:", e);
                            }
                        }
                        delete candidateQueueRef.current[from];
                    }
                }
            } catch (err) { console.error(`[WebRTC] Signaling error:`, err); }
        };

        const handleUserJoinedVideo = ({ userId: remoteUserId }) => {
            if (peersRef.current[remoteUserId]) return;
            // Prevent self-connection loop if signals mirror back
            if (remoteUserId === userId) return;

            if (userId < remoteUserId) {
                const pc = createPeerConnection(remoteUserId);
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .then(() => socket.emit('signal', { to: remoteUserId, signal: pc.localDescription }))
                    .catch(e => console.error(`[WebRTC] Failed to offer:`, e));
            }
        };

        const handleUserLeftVideo = ({ userId: remoteUserId }) => removePeer(remoteUserId);

        socket.on('signal', handleSignal);
        socket.on('user-joined-video', handleUserJoinedVideo);
        socket.on('user-left-video', handleUserLeftVideo);

        return () => {
            socket.off('signal', handleSignal);
            socket.off('user-joined-video', handleUserJoinedVideo);
            socket.off('user-left-video', handleUserLeftVideo);
        };
    }, [socket, isVideoEnabled, userId]);


    // --- 3. Local Stream & Room Join/Leave Flow ---
    useEffect(() => {
        let mounted = true;

        const startVideo = async () => {
            if (hasJoinedVideo.current) return;
            try {
                // REQUIREMENT: Front Camera (user)
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: true
                });
                if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

                // REQUIREMENT: Muted by default
                stream.getAudioTracks().forEach(t => t.enabled = false);

                localStreamRef.current = stream;
                setLocalStream(stream);
                socket.emit('join-video', { roomCode });
                hasJoinedVideo.current = true;

                if (users) {
                    users.forEach(u => {
                        if (u.id !== userId && u.isVideoOn && !peersRef.current[u.id]) {
                            if (userId < u.id) {
                                const pc = createPeerConnection(u.id);
                                pc.createOffer()
                                    .then(offer => pc.setLocalDescription(offer))
                                    .then(() => socket.emit('signal', { to: u.id, signal: pc.localDescription }));
                            }
                        }
                    });
                }
            } catch (err) { console.error("Media Error:", err); alert("Could not access camera/microphone. Ensure HTTPS and permissions."); }
        };

        const stopVideo = () => {
            if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; setLocalStream(null); }
            Object.keys(peersRef.current).forEach(id => removePeer(id));
            if (hasJoinedVideo.current) { socket.emit('leave-video', { roomCode }); hasJoinedVideo.current = false; }
        };

        if (isVideoEnabled) startVideo(); else stopVideo();
        return () => { mounted = false; stopVideo(); };
    }, [isVideoEnabled, roomCode, userId]);

    // --- 4. Video Element Rendering ---
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // --- UI Logic: Grid Auto-Adjustment ---
    const totalVideos = (localStream ? 1 : 0) + Object.keys(remoteStreams).length;
    const gridConfig = totalVideos <= 1 ? "grid-cols-1" :
        totalVideos === 2 ? "grid-cols-1 sm:grid-cols-2" :
            totalVideos <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3";

    return (
        <div className="flex flex-col h-full w-full p-4 overflow-hidden">
            <div className={`grid ${gridConfig} gap-4 w-full h-full auto-rows-fr`}>
                <AnimatePresence>
                    {localStream && (
                        <VideoTile
                            stream={localStream}
                            label="You"
                            isMe={true}
                            videoRef={localVideoRef}
                        />
                    )}
                    {Object.entries(remoteStreams).map(([id, stream]) => {
                        const roomUser = users.find(u => u.id === id);
                        return (
                            <VideoTile
                                key={id}
                                stream={stream}
                                label={roomUser ? roomUser.username : `User ${id.slice(0, 4)}`}
                                isMe={false}
                                isHost={roomUser?.role === 'host'}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

const VideoTile = ({ stream, label, isMe, videoRef, isHost }) => {
    const internalRef = useRef(null);
    useEffect(() => {
        const target = videoRef ? videoRef.current : internalRef.current;
        if (target && stream) target.srcObject = stream;
    }, [stream, videoRef]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`relative rounded-[32px] overflow-hidden glass-surface shadow-2xl border-white/10 aspect-video sm:aspect-auto h-full
                       ${isHost ? 'ring-2 ring-yellow-500/50' : ''}`}
        >
            <video
                ref={videoRef || internalRef}
                autoPlay
                muted={isMe} // Local must be muted
                playsInline
                className={`w-full h-full object-cover ${isMe ? 'transform scale-x-[-1]' : ''}`}
            />

            {/* Overlay Info */}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/10">
                        {isMe ? <div className="w-1.5 h-1.5 rounded-full bg-light-primary animate-pulse" /> : <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-glow-green" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span>
                    </div>
                    {isHost && (
                        <div className="px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                            <span className="text-[8px] font-black text-yellow-500 uppercase">Room Host</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default VideoGrid;
