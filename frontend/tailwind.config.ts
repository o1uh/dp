import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/views/**/*.{js,ts,jsx,tsx,mdx}',
    './src/widgets/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/entities/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          focus: '#1D4ED8',
          light: '#60A5FA',
          muted: '#1E3A5F',
        },
        secondary: {
          DEFAULT: '#8B5CF6',
          hover: '#7C3AED',
          light: '#A78BFA',
          muted: '#2D1B69',
        },
        background: {
          DEFAULT: 'var(--background)',
          surface: 'var(--background-surface)',
          elevated: 'var(--background-elevated)',
          deep: 'var(--background-deep)',
        },
        accent: {
          green: '#10B981',
          'green-muted': '#064E3B',
          red: '#EF4444',
          'red-muted': '#450A0A',
          yellow: '#F59E0B',
          'yellow-muted': '#451A03',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        gray: {
          100: 'var(--text-primary)',
          200: 'var(--text-primary)',
          300: 'var(--text-secondary)',
          400: 'var(--text-secondary)',
          500: 'var(--text-muted)',
          600: 'var(--text-muted)',
          700: 'var(--text-muted)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -4px rgba(139, 92, 246, 0.25)',
        'glow-primary': '0 0 20px -4px rgba(59, 130, 246, 0.35)',
        'glow-green': '0 0 20px -4px rgba(16, 185, 129, 0.25)',
        'glow-lg': '0 0 40px -8px rgba(139, 92, 246, 0.2)',
        'soft': '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.05)',
        'card': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.05)',
        'elevated': '0 10px 30px -5px rgba(0,0,0,0.15)',
      }
    },
  },
  plugins: [],
}

export default config