import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Constitutional Minimalism Color Palette
      colors: {
        // Primary - Deep Navy (Authority, Trust)
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0a1929',
        },
        // Secondary - Warm Charcoal (Stability)
        charcoal: {
          50: '#f7f7f7',
          100: '#e3e3e3',
          200: '#c8c8c8',
          300: '#a4a4a4',
          400: '#818181',
          500: '#666666',
          600: '#515151',
          700: '#434343',
          800: '#383838',
          900: '#313131',
          950: '#1a1a1a',
        },
        // Accent - Muted Gold (Heritage, Importance)
        gold: {
          50: '#fdfcf7',
          100: '#f9f5e7',
          200: '#f2e9c9',
          300: '#e8d8a3',
          400: '#dcc476',
          500: '#c9a84e',
          600: '#b8923d',
          700: '#997434',
          800: '#7c5d30',
          900: '#664d2a',
          950: '#3a2a15',
        },
        // Neutral - Off-White (Clean, Accessible)
        cream: {
          50: '#fefefe',
          100: '#fdfcfa',
          200: '#faf8f5',
          300: '#f5f2ed',
          400: '#ebe7e0',
          500: '#ddd8cf',
          600: '#c4bdb2',
          700: '#a39b8e',
          800: '#857d72',
          900: '#6d665d',
          950: '#39352f',
        },
        // Status Colors (Muted)
        status: {
          success: '#3d7a5f',
          warning: '#b8860b',
          error: '#8b3a3a',
          info: '#4a6fa5',
        },
      },
      // Typography Scale
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'h1': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h2': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'h3': ['1.5rem', { lineHeight: '1.3' }],
        'h4': ['1.25rem', { lineHeight: '1.4' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'small': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
      },
      // Spacing Scale (8px base)
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },
      // Border Radius
      borderRadius: {
        'subtle': '0.25rem',
        'moderate': '0.5rem',
        'prominent': '0.75rem',
      },
      // Box Shadow (Subtle, institutional)
      boxShadow: {
        'subtle': '0 1px 3px rgba(16, 42, 67, 0.08)',
        'card': '0 2px 8px rgba(16, 42, 67, 0.1)',
        'elevated': '0 4px 16px rgba(16, 42, 67, 0.12)',
        'modal': '0 8px 32px rgba(16, 42, 67, 0.16)',
      },
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

