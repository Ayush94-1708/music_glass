import React, { useState, useEffect } from 'react';
import { Sun, Moon, LogOut, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MusicPlayer from './components/MusicPlayer';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    // Sync theme with class on HTML/body
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.reload();
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {/* Refined Liquid Background */}
      <div className="fixed inset-0 z-[-2] bg-light-bg dark:bg-dark-bg transition-colors duration-700" />
      <div className="liquid-blob w-[400px] h-[400px] bg-light-primary/15 dark:bg-dark-primary/10 top-[-5%] right-[-5%] animation-delay-1000" />
      <div className="liquid-blob w-[500px] h-[500px] bg-light-secondary/15 dark:bg-dark-secondary/10 bottom-[-10%] left-[-5%] animation-delay-3000" />
      <div className="liquid-blob w-[300px] h-[300px] bg-light-primary/10 dark:bg-dark-primary/5 top-[40%] left-[20%] animation-delay-5000" />

      <AnimatePresence mode="wait">
        {!token ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center min-h-screen p-6"
          >
            <Auth onLogin={handleLogin} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-[1080px] mx-auto p-8 lg:px-10 lg:py-12"
          >
            <header className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 glass-surface flex items-center justify-center rounded-2xl shadow-lg border-white/20">
                  <Music className="text-light-primary dark:text-dark-primary" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight leading-none">
                    VIBE<span className="text-light-primary dark:text-dark-primary">SYNC</span>
                  </h1>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-light-textSecondary/50 dark:text-dark-textSecondary/50 uppercase">
                    Liquid Experience
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={toggleTheme}
                  className="w-10 h-10 glass-surface flex items-center justify-center hover:bg-white/10"
                  title="Toggle Theme"
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                <div className="flex items-center gap-3 glass-surface px-4 py-2 rounded-full border-white/10">
                  <span className="text-sm font-semibold">@{user?.username}</span>
                  <div className="w-6 h-px bg-white/10" />

                  {user?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => setShowAdmin(!showAdmin)}
                        className={`admin-toggle-btn ${showAdmin ? 'text-light-primary' : 'text-light-textSecondary'} hover:text-light-primary transition-colors mr-2`}
                        title="Toggle Admin Panel"
                      >
                        {showAdmin ? 'Player' : 'Admin'}
                      </button>
                      <div className="w-6 h-px bg-white/10" />
                    </>
                  )}

                  <button
                    onClick={handleLogout}
                    className="text-light-textSecondary dark:text-dark-textSecondary hover:text-red-500 transition-colors"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </header>

            <main>
              {showAdmin && user?.role === 'admin' ? (
                <AdminPanel user={user} token={token} onBack={() => setShowAdmin(false)} />
              ) : (
                <MusicPlayer user={user} />
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
