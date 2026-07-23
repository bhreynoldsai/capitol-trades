/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a1628',
        surface: '#111f38',
        edge: '#1e3a5f',
        body: '#94afd4',
        heading: '#e2eaf7',
        accent: '#0ed2d2',
        largemouth: '#16a34a',
        largemouthDark: '#14532d',
        crappie: '#9333ea',
        crappieDark: '#581c87',
        catfish: '#d97706',
        catfishDark: '#78350f',
        tough: '#ef4444',
        fair: '#f59e0b',
        good: '#3b82f6',
        excellent: '#22c55e',
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.35)' },
          '50%': { boxShadow: '0 0 28px 4px rgba(34,197,94,0.45)' },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        glowPulse: 'glowPulse 2s ease-in-out infinite',
        fadeIn: 'fadeIn 400ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
