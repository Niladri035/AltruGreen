import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Bricolage Grotesque', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#0a2416',
          mid: '#1a4d2e',
          light: '#2d7a4a',
          gold: '#c9a84c',
          'gold-light': '#e8c97a',
          'gold-pale': '#f5e4b0',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-gold': 'linear-gradient(135deg, #c9a84c, #e8c97a, #c9a84c)',
        'gradient-green': 'linear-gradient(135deg, #0a2416, #1a4d2e)',
        mesh: `
          radial-gradient(ellipse at 20% 50%, rgba(26,77,46,0.4) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.08) 0%, transparent 50%)
        `,
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 3s ease infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(201,168,76,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(201,168,76,0.6)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backdropBlur: { xs: '2px' },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        gold: '0 0 40px rgba(201,168,76,0.2)',
        'gold-lg': '0 0 80px rgba(201,168,76,0.3)',
        green: '0 0 60px rgba(26,77,46,0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
