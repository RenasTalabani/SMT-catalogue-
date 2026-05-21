import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Flutter app exact colors
        primary:   { DEFAULT: '#6C63FF', dark: '#4A42D4', light: '#EDE9FE' },
        secondary: { DEFAULT: '#00C9A7', dark: '#00917A', light: '#CCFBF1' },
        accent:    '#FF6584',
        // Dark theme surfaces (Flutter exact)
        dark: {
          bg:      '#0F0F1A',
          surface: '#1A1A2E',
          card:    '#16213E',
          border:  '#2D3748',
          divider: '#1E293B',
        },
        // Light theme
        light: {
          bg:      '#F8F9FC',
          surface: '#FFFFFF',
          card:    '#FFFFFF',
          border:  '#E5E7EB',
          divider: '#F3F4F6',
        },
        // Semantic
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        modal: '0 25px 50px rgba(0,0,0,0.4)',
        glow:  '0 0 20px rgba(108,99,255,0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
