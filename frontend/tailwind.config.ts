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
          DEFAULT: '#3B82F6', // Доверительный синий для ключевых действий
          hover: '#2563EB',
          focus: '#1D4ED8',
        },
        secondary: {
          DEFAULT: '#8B5CF6', // Фиолетовый акцент для нейросетевых функций и стемов
          hover: '#7C3AED',
        },
        background: {
          DEFAULT: '#090D16', // Глубокий чёрно-синий фон подложки
          surface: '#121824', // Фон контейнеров и панелей
          elevated: '#1E293B', // Элементы управления в фокусе
        },
        accent: {
          green: '#10B981', // Индикатор активного статуса / Solo
          red: '#EF4444', // Ошибки / Mute
          yellow: '#F59E0B', // Предупреждения / Процессинг
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'], // Для тайм-кодов и точных значений
      },
      boxShadow: {
        glow: '0 0 15px -3px rgba(139, 92, 246, 0.3)',
        'glow-primary': '0 0 15px -3px rgba(59, 130, 246, 0.4)',
      }
    },
  },
  plugins: [],
}

export default config