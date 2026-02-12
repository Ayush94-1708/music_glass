/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                light: {
                    bg: '#F5F7FA',
                    glass: 'rgba(255, 255, 255, 0.65)',
                    primary: '#4FA3FF',
                    secondary: '#7A6CFF',
                    text: '#0F172A',
                    textSecondary: '#64748B',
                },
                dark: {
                    bg: '#0B0F1A',
                    glass: 'rgba(20, 25, 35, 0.55)',
                    primary: '#5DA9FF',
                    secondary: '#8B7CFF',
                    text: '#E5E7EB',
                    textSecondary: '#9CA3AF',
                }
            },
            fontFamily: {
                sans: ['Inter', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
            },
            backdropBlur: {
                'ios': '20px',
                'ios-dark': '24px',
            },
            borderRadius: {
                'ios': '16px',
                'ios-lg': '20px',
                'ios-xl': '40px',
            },
            animation: {
                'liquid': 'liquid 20s infinite alternate linear',
                'breath': 'breath 4s infinite alternate ease-in-out',
            },
            keyframes: {
                liquid: {
                    '0%': { transform: 'translate(0, 0) scale(1)' },
                    '33%': { transform: 'translate(5%, 5%) scale(1.05)' },
                    '66%': { transform: 'translate(-5%, 10%) scale(0.95)' },
                    '100%': { transform: 'translate(0, 0) scale(1)' },
                },
                breath: {
                    '0%': { transform: 'scale(1)', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' },
                    '100%': { transform: 'scale(1.03)', boxShadow: '0 30px 80px rgba(79, 163, 255, 0.3)' },
                }
            }
        },
    },
    plugins: [],
}
