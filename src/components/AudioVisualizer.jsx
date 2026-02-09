import React, { useRef, useEffect } from 'react';

/**
 * AudioVisualizer component
 * Renders a high-performance, immersive background reacting to audio frequencies.
 */
const AudioVisualizer = ({ audioRef, isPlaying, volume, isActive }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        if (!isActive || !audioRef.current) return;

        // Initialize Audio Context on first interaction/play
        const initAudio = () => {
            if (contextRef.current) return;

            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const context = new AudioContext();
                const analyser = context.createAnalyser();

                // Higher FFT size for smoother mid/high frequency details
                analyser.fftSize = 512;
                const source = context.createMediaElementSource(audioRef.current);

                source.connect(analyser);
                analyser.connect(context.destination);

                contextRef.current = context;
                analyserRef.current = analyser;
                sourceRef.current = source;
            } catch (err) {
                console.error("Audio Visualizer Init Error:", err);
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
            if (!isActive) return;

            animationFrameRef.current = requestAnimationFrame(render);

            if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
            }

            // Canvas cleanup with slight trail effect
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const width = canvas.width;
            const height = canvas.height;

            // Calculate frequency ranges
            // Bass: 0-10, Mids: 10-100, Highs: 100+
            let bass = 0;
            for (let i = 0; i < 10; i++) bass += dataArray[i];
            bass = (bass / 10 / 255) * (volume / 100);

            let mids = 0;
            for (let i = 10; i < 60; i++) mids += dataArray[i];
            mids = (mids / 50 / 255) * (volume / 100);

            let highs = 0;
            for (let i = 60; i < bufferLength; i++) highs += dataArray[i];
            highs = (highs / (bufferLength - 60) / 255) * (volume / 100);

            // Draw Immersive Waves
            drawWaves(ctx, width, height, bass, mids, highs);

            // Draw Particles
            drawParticles(ctx, width, height, bass, highs);
        };

        const drawWaves = (ctx, w, h, bass, mids, highs) => {
            const time = Date.now() * 0.001;

            // Base layer (Deep Bass Pulse)
            const pulse = 1 + bass * 0.2;
            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.scale(pulse, pulse);
            ctx.translate(-w / 2, -h / 2);

            // Draw 2-3 translucent flowing waves
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(0, h);

                const opacity = 0.1 + (i * 0.05) + (bass * 0.1);
                const color = i === 0 ? `rgba(255, 45, 85, ${opacity})` :
                    i === 1 ? `rgba(99, 102, 241, ${opacity})` : `rgba(236, 72, 153, ${opacity})`;

                ctx.shadowBlur = 40 * bass;
                ctx.shadowColor = color;
                ctx.fillStyle = color;

                for (let x = 0; x <= w; x += 20) {
                    const wave1 = Math.sin(x * 0.005 + time * (0.5 + i * 0.2)) * (50 + mids * 100);
                    const wave2 = Math.sin(x * 0.01 - time * (0.3 + i * 0.1)) * (20 + bass * 50);
                    const y = h * (0.7 - i * 0.1) + wave1 + wave2;
                    ctx.lineTo(x, y);
                }

                ctx.lineTo(w, h);
                ctx.fill();
            }
            ctx.restore();
        };

        let particles = [];
        const drawParticles = (ctx, w, h, bass, highs) => {
            // High frequency spawns or excites particles
            if (particles.length < 50) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    size: Math.random() * 2 + 1,
                    speed: Math.random() * 0.5 + 0.1,
                    opacity: Math.random() * 0.5 + 0.1
                });
            }

            particles.forEach(p => {
                p.y -= p.speed * (1 + highs * 5);
                if (p.y < 0) p.y = h;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (1 + highs * 2), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity + highs * 0.5})`;
                ctx.fill();
            });
        };

        if (isPlaying) {
            render();
        } else {
            // Draw static state or clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isPlaying, volume, isActive, audioRef]);

    // Handle Resize
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
            id="visualizer-canvas"
            className="visualizer-bg"
        />
    );
};

export default AudioVisualizer;
