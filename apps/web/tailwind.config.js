/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // BR Romance Theme - "vinho" primary palette
                primary: {
                    50: '#fdf2f8',
                    100: '#fce7f3',
                    200: '#fbcfe8',
                    300: '#f9a8d4',
                    400: '#f472b6',
                    500: '#ec4899',
                    600: '#db2777',
                    700: '#8B1459', // vinho - main primary
                    800: '#6d1045',
                    900: '#500c33',
                    950: '#2d0620',
                },
                accent: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    200: '#fecdd3',
                    300: '#fda4af',
                    400: '#fb7185',
                    500: '#FF4D6D', // coral pink - main accent
                    600: '#e11d48',
                    700: '#be123c',
                    800: '#9f1239',
                    900: '#881337',
                },
                // Dark mode background
                dark: {
                    bg: '#0B0F14',
                    card: '#151A21',
                    border: '#1F252D',
                },
                // Light mode background
                light: {
                    bg: '#F7F7FB',
                    card: '#FFFFFF',
                    border: '#E5E7EB',
                },
            },
            fontFamily: {
                sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
            },
            fontSize: {
                'chat': ['15px', { lineHeight: '1.4' }],
                'title-lg': ['26px', { lineHeight: '1.2', fontWeight: '700' }],
                'title': ['22px', { lineHeight: '1.25', fontWeight: '600' }],
            },
            animation: {
                'typing': 'typing 1s ease-in-out infinite',
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                typing: {
                    '0%, 60%, 100%': { opacity: '0.3' },
                    '30%': { opacity: '1' },
                },
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
