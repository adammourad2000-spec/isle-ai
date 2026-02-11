/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // iOS Color System
        ios: {
          blue: '#0A84FF',
          cyan: '#64D2FF',
          teal: '#6AC4DC',
          mint: '#66D4CF',
          green: '#30D158',
          indigo: '#5E5CE6',
          purple: '#BF5AF2',
          pink: '#FF375F',
          orange: '#FF9F0A',
          yellow: '#FFD60A',
          red: '#FF453A',
        },
        // Legacy gold colors (kept for compatibility)
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03',
        },
        // Glass transparency scale
        glass: {
          50: 'rgba(255, 255, 255, 0.02)',
          100: 'rgba(255, 255, 255, 0.05)',
          150: 'rgba(255, 255, 255, 0.08)',
          200: 'rgba(255, 255, 255, 0.10)',
          300: 'rgba(255, 255, 255, 0.15)',
          400: 'rgba(255, 255, 255, 0.20)',
          500: 'rgba(255, 255, 255, 0.30)',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Helvetica Neue', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Helvetica Neue', 'sans-serif'],
      },
      animation: {
        // iOS Spring animations
        'ios-spring': 'iosSpring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'ios-fade': 'iosFade 0.35s cubic-bezier(0.28, 0.11, 0.32, 1) forwards',
        'ios-scale': 'iosScale 0.25s cubic-bezier(0.28, 0.11, 0.32, 1)',
        'ios-slide-up': 'iosSlideUp 0.4s cubic-bezier(0.28, 0.11, 0.32, 1) forwards',
        'ios-slide-down': 'iosSlideDown 0.35s cubic-bezier(0.28, 0.11, 0.32, 1) forwards',
        // Ambient animations
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'iridescent': 'iridescent 8s ease-in-out infinite',
        // Legacy animations
        'pulse-glow': 'pulse-glow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        // iOS Spring Keyframes
        iosSpring: {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(10px)' },
          '60%': { transform: 'scale(1.02) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        iosFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        iosScale: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        iosSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        iosSlideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Ambient Keyframes
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5', filter: 'blur(20px)' },
          '50%': { opacity: '0.8', filter: 'blur(30px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        iridescent: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // Legacy keyframes
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backgroundImage: {
        // iOS Gradients
        'ios-blue': 'linear-gradient(180deg, #64D2FF 0%, #0A84FF 100%)',
        'ios-purple': 'linear-gradient(180deg, #BF5AF2 0%, #5E5CE6 100%)',
        'ios-mint': 'linear-gradient(180deg, #66D4CF 0%, #30D158 100%)',
        'ios-orange': 'linear-gradient(180deg, #FF9F0A 0%, #FF375F 100%)',
        // Glass gradients
        'glass-subtle': 'linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'glass-elevated': 'linear-gradient(160deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.04) 100%)',
        // Legacy
        'liquid-gold': 'linear-gradient(135deg, #FF9F0A 0%, #FFD60A 50%, #FF9F0A 100%)',
        'glass-gradient': 'linear-gradient(180deg, rgba(22, 22, 26, 0.9) 0%, rgba(14, 14, 18, 0.95) 100%)',
      },
      backdropBlur: {
        'xs': '4px',
        'ios': '40px',
        'ios-thick': '60px',
      },
      boxShadow: {
        'ios': '0 8px 32px -8px rgba(0, 0, 0, 0.4)',
        'ios-lg': '0 24px 48px -12px rgba(0, 0, 0, 0.5)',
        'ios-glow': '0 0 32px -4px rgba(100, 210, 255, 0.25)',
        'glass-inset': 'inset 0 0 0 0.5px rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
      borderRadius: {
        'ios': '16px',
        'ios-lg': '24px',
        'ios-xl': '28px',
      },
      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.28, 0.11, 0.32, 1)',
        'ios-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ios-smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
}
