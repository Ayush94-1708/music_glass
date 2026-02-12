import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Music, Sparkles } from 'lucide-react';

const Auth = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { username, email, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin ? { email, password } : { username, email, password };

        try {
            const baseUrl = import.meta.env.VITE_API_URL || '';
            const res = await axios.post(`${baseUrl}${endpoint}`, payload);
            onLogin(res.data.token, res.data.user);
        } catch (err) {
            setError(err.response?.data?.msg || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.98, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 1.02, y: -10 }
    };

    return (
        <div className="w-full max-w-sm">
            <AnimatePresence mode="wait">
                <motion.div
                    key={isLogin ? 'login' : 'register'}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="glass-surface glass-glow p-8 lg:p-10 border-white/10 shadow-3xl relative overflow-hidden animate-floating"
                >
                    {/* Compact Header */}
                    <div className="flex flex-col items-center mb-10">
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 6 }}
                            className="w-16 h-16 glass-surface flex items-center justify-center rounded-2xl mb-6 bg-white/5 border-white/10"
                        >
                            <Music className="text-light-primary" size={32} />
                        </motion.div>
                        <h2 className="text-2xl font-black tracking-tight text-center">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <div className="flex items-center gap-2 mt-2 opacity-50">
                            <Sparkles size={12} className="text-light-primary" />
                            <p className="text-[10px] font-black uppercase tracking-widest">
                                {isLogin ? 'Sync your vibe' : 'Join the liquid rhythm'}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-light-textSecondary/30 group-focus-within:text-light-primary transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    name="username"
                                    value={username}
                                    onChange={onChange}
                                    className="glass-input pl-11 py-3.5 text-sm"
                                    required
                                    minLength="3"
                                />
                            </div>
                        )}

                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-light-textSecondary/30 group-focus-within:text-light-primary transition-colors" size={16} />
                            <input
                                type="email"
                                placeholder="Email Address"
                                name="email"
                                value={email}
                                onChange={onChange}
                                className="glass-input pl-11 py-3.5 text-sm"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-light-textSecondary/30 group-focus-within:text-light-primary transition-colors" size={16} />
                            <input
                                type="password"
                                placeholder="Password"
                                name="password"
                                value={password}
                                onChange={onChange}
                                className="glass-input pl-11 py-3.5 text-sm"
                                required
                                minLength="6"
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-500/10 border border-red-500/10 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="glass-button-primary w-full group py-4 mt-4 text-sm font-bold tracking-wide"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <span>{isLogin ? 'Sign In' : 'Get Started'}</span>
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                                </div>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-[10px] font-black uppercase tracking-widest text-light-textSecondary opacity-60 hover:opacity-100 hover:text-light-primary transition-all"
                        >
                            {isLogin ? "your first sign up" : "Already a member? Sign in"}
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default Auth;
