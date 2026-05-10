import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: '#8b5cf6',
          hover:   '#7c3aed',
          muted:   '#8b5cf620',
        },
        // Canvas / surface grays
        surface: {
          base:    '#0a0a0a',
          card:    '#141414',
          raised:  '#1a1a1a',
          overlay: '#1e1e1e',
          border:  '#2a2a2a',
        },
      },
      keyframes: {
        // Node execution glow — used via data.status === 'running'
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(139, 92, 246, 0.4)' },
          '50%':       { boxShadow: '0 0 20px 6px rgba(139, 92, 246, 0.7)' },
        },
        'glow-success': {
          '0%':   { boxShadow: '0 0 16px 4px rgba(34, 197, 94, 0.6)' },
          '100%': { boxShadow: '0 0 0px 0px rgba(34, 197, 94, 0)' },
        },
        'glow-fail': {
          '0%':   { boxShadow: '0 0 16px 4px rgba(239, 68, 68, 0.6)' },
          '100%': { boxShadow: '0 0 0px 0px rgba(239, 68, 68, 0)' },
        },
      },
      animation: {
        glow:          'glow 1.5s ease-in-out infinite',
        'glow-success': 'glow-success 0.6s ease-out forwards',
        'glow-fail':    'glow-fail 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
}

export default config
