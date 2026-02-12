import React, { useRef, useEffect } from 'react';

/**
 * AudioVisualizer component
 * Renders an energetic, bass-reactive, and moody background.
 */
const AudioVisualizer = ({ audioRef, isPlaying, volume, isActive, isScrolling }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastTimeRef = useRef(performance.now());
    const bassLevelRef = useRef(0);

    useEffect(() => {
        if (!isActive) return;

        // Requirement: Add crossOrigin to audio element for visualizer to work with remote URLs
        if (audioRef.current && !audioRef.current.crossOrigin) {
            audioRef.current.crossOrigin = "anonymous";
        }

        const initAudio = () => {
            if (contextRef.current || !audioRef.current) return;
            try {
                // Initialize context only on user interaction (handled by isPlaying)
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const context = new AudioContext();
                const analyser = context.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.8;

                // TRY-CATCH: MediaElementSource can throw if already connected
                try {
                    const source = context.createMediaElementSource(audioRef.current);
                    source.connect(analyser);
                    analyser.connect(context.destination);
                } catch (e) {
                    console.warn("Visualizer: Audio source already connected or failed to connect.", e);
                    // Fallback: This usually happens on hot-reload. 
                    // We might not get data, but we can still try to recover context.
                }

                contextRef.current = context;
                analyserRef.current = analyser;
            } catch (err) {
                console.error("Visualizer Init Error:", err);
            }
        };

        if (isPlaying) {
            initAudio();
            if (contextRef.current?.state === 'suspended') {
                contextRef.current.resume();
            }
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current?.frequencyBinCount || 0;
        const dataArray = new Uint8Array(bufferLength);

        const render = () => {
            const now = performance.now();
            const deltaTime = (now - lastTimeRef.current) / 1000;
            lastTimeRef.current = now;

            if (isActive) {
                animationFrameRef.current = requestAnimationFrame(render);
            }

            // Completely pause rendering during scroll to eliminate lag
            if (isScrolling) {
                return;
            }

            if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
            }

            // Calculations for energetic reaction
            const baseValue = 0.05;

            let currentSubBass = 0;
            let currentBass = 0;
            let currentMids = 0;
            let currentHighs = 0;

            if (analyserRef.current) {
                for (let i = 0; i < 4; i++) currentSubBass += dataArray[i];
                currentSubBass = (currentSubBass / 4 / 255) * (volume / 100) * (isPlaying ? 1 : 0.2);

                for (let i = 4; i < 20; i++) currentBass += dataArray[i];
                currentBass = (currentBass / 16 / 255) * (volume / 100) * (isPlaying ? 1 : 0.2);

                for (let i = 20; i < 100; i++) currentMids += dataArray[i];
                currentMids = (currentMids / 80 / 255) * (volume / 100) * (isPlaying ? 1 : 0.1);

                for (let i = 100; i < bufferLength; i++) currentHighs += dataArray[i];
                currentHighs = (currentHighs / (bufferLength - 100) / 255) * (volume / 100) * (isPlaying ? 1 : 0.05);
            }

            const subBass = currentSubBass + baseValue;
            const bass = currentBass + baseValue;
            const mids = currentMids + baseValue;
            const highs = currentHighs + baseValue;

            // Bass pulse smoothing
            bassLevelRef.current += (subBass - bassLevelRef.current) * (deltaTime * 10);
            const energeticBass = bassLevelRef.current;

            // Canvas cleanup
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const w = canvas.width;
            const h = canvas.height;
            const time = now * 0.0005;

            // DRAW LAYERS (From back to front)
            // Increased opacity slightly for better visibility against dark backgrounds

            // Layer 1: Background Deep Glow (Very Blurred)
            drawWave(ctx, w, h, time * 0.5, energeticBass, mids, {
                opacity: 0.15,
                blur: 80,
                color: 'hsla(260, 60%, 20%, ',
                elevation: 0.4,
                amplitude: 150,
                speedMultiplier: 0.3
            });

            // Layer 2: Main Midnight Wave
            drawWave(ctx, w, h, time, energeticBass, mids, {
                opacity: 0.2,
                blur: 40,
                color: 'hsla(220, 70%, 15%, ',
                elevation: 0.6,
                amplitude: 100,
                speedMultiplier: 0.5
            });

            // Layer 3: Indigo Accent Wave
            drawWave(ctx, w, h, time * 1.2, energeticBass, highs, {
                opacity: 0.15,
                blur: 20,
                color: 'hsla(280, 50%, 25%, ',
                elevation: 0.75,
                amplitude: 60,
                speedMultiplier: 0.8
            });

            // Layer 4: Foreground Pulse
            drawWave(ctx, w, h, time * 1.5, energeticBass, (bass + mids) / 2, {
                opacity: 0.18,
                blur: 0, // Keep this sharper
                color: 'hsla(320, 70%, 35%, ',
                elevation: 0.85,
                amplitude: 50,
                speedMultiplier: 1.2
            });

            // Bass Hit Pulse Effect (Scale Canvas)
            if (energeticBass > 0.4) {
                const pulseScale = 1 + (energeticBass - 0.4) * 0.03;
                canvasRef.current.style.transform = `scale(${pulseScale})`;
            } else {
                canvasRef.current.style.transform = 'scale(1)';
            }
        };

        const lowsAndMids = (b, m) => (b + m) / 2;

        const drawWave = (ctx, w, h, t, bass, audioVar, config) => {
            ctx.save();
            // Reduce blur for performance
            if (config.blur) ctx.filter = `blur(${Math.min(config.blur * 0.5, 20)}px)`;

            const dynamicOpacity = config.opacity + (bass * 0.2);
            ctx.fillStyle = config.color + dynamicOpacity + ')';

            ctx.beginPath();
            ctx.moveTo(0, h);

            for (let x = 0; x <= w; x += 15) {
                // Wave 1: Bass-influenced large motion
                const w1 = Math.sin(x * 0.002 + t * config.speedMultiplier) * (config.amplitude + bass * 200);
                // Wave 2: Mid/High frequency micro-turbulence
                const w2 = Math.sin(x * 0.008 - t * 2 * config.speedMultiplier) * (15 + audioVar * 100);
                // Wave 3: Subtle randomness
                const w3 = Math.cos(x * 0.004 + t * 0.5) * 20;

                const y = h * config.elevation + w1 + w2 + w3;
                ctx.lineTo(x, y);
            }

            ctx.lineTo(w, h);
            ctx.fill();
            ctx.restore();
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isPlaying, volume, isActive, isScrolling, audioRef]);

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isActive) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[-1] pointer-events-none transition-transform duration-100 ease-out"
            style={{ filter: isPlaying ? 'brightness(1)' : 'brightness(0.7)' }}
        />
    );
};

export default AudioVisualizer;
