/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // =======================================================================
      // OCTUP BRAND COLORS
      // =======================================================================
      colors: {
        octup: {
          primary: '#809292',
          'primary-dark': '#6a7a7a',
          'primary-light': '#9aabab',
          secondary: '#00CBC0',
          'secondary-dark': '#00a89e',
          'secondary-light': '#33d6cd',
          accent: '#FF3489',
          'accent-dark': '#d92d73',
          'accent-light': '#ff5ca1',
          warning: '#F9BD63',
          'warning-dark': '#e5a84d',
          'warning-light': '#fbd08a',
          dark: '#282831',
          'dark-light': '#3a3a45',
          light: '#F4F4F7',
          'light-dark': '#e8e8ed',
        },
        risk: {
          critical: '#FF3489',
          high: '#FF3489',
          medium: '#F9BD63',
          low: '#00CBC0',
          healthy: '#00CBC0',
        },
        // Semantic colors for HRIS
        hris: {
          success: '#00CBC0',
          warning: '#F9BD63',
          error: '#FF3489',
          info: '#809292',
        },
      },

      // =======================================================================
      // TYPOGRAPHY
      // =======================================================================
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '700' }],
        'heading-lg': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '700' }],
        'heading': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
        'label': ['0.875rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      letterSpacing: {
        'tighter-brand': '-0.025em',
      },

      // =======================================================================
      // SPACING & SIZING
      // =======================================================================
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        'safe-bottom': 'env(safe-area-inset-bottom, 0.75rem)',
      },
      minHeight: {
        'touch': '44px',
        'touch-row': '48px',
      },
      maxWidth: {
        'dashboard': '1440px',
      },

      // =======================================================================
      // BORDER RADIUS (Premium rounded corners)
      // =======================================================================
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      // =======================================================================
      // SHADOWS (Soft premium shadows)
      // =======================================================================
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 4px 15px -3px rgba(0, 0, 0, 0.05)',
        'soft-xl': '0 20px 60px -15px rgba(0, 0, 0, 0.15), 0 8px 25px -5px rgba(0, 0, 0, 0.08)',
        'card': '0 4px 20px -4px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'octup': '0 4px 14px 0 rgba(128, 146, 146, 0.25)',
        'octup-accent': '0 4px 14px 0 rgba(255, 52, 137, 0.25)',
        'table-row': '0 2px 8px rgba(0, 0, 0, 0.05)',
        'dropdown': '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
      },

      // =======================================================================
      // BACKGROUNDS & GRADIENTS
      // =======================================================================
      backgroundImage: {
        'octup-gradient': 'linear-gradient(135deg, #809292 0%, #00CBC0 100%)',
        'octup-gradient-dark': 'linear-gradient(135deg, #282831 0%, #3a3a45 100%)',
        'octup-gradient-accent': 'linear-gradient(135deg, #FF3489 0%, #F9BD63 100%)',
        'octup-gradient-success': 'linear-gradient(135deg, #00CBC0 0%, #00a89e 100%)',
        'premium': 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        'premium-pattern': `
          radial-gradient(at 100% 0%, rgba(0, 203, 192, 0.08) 0, transparent 50%),
          radial-gradient(at 0% 100%, rgba(128, 146, 146, 0.08) 0, transparent 50%)
        `,
        'section-blue': 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(147, 197, 253, 0.05) 100%)',
        'section-amber': 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(252, 211, 77, 0.05) 100%)',
        'section-emerald': 'linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(110, 231, 183, 0.05) 100%)',
        'section-purple': 'linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(196, 181, 253, 0.05) 100%)',
        'section-rose': 'linear-gradient(135deg, rgba(244, 63, 94, 0.03) 0%, rgba(253, 164, 175, 0.05) 100%)',
      },

      // =======================================================================
      // ANIMATIONS
      // =======================================================================
      animation: {
        'pulse-risk': 'pulse-risk 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        'pulse-risk': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slideUp': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideInRight': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },

      // =======================================================================
      // TRANSITIONS
      // =======================================================================
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      // =======================================================================
      // Z-INDEX
      // =======================================================================
      zIndex: {
        'dropdown': '50',
        'modal': '100',
        'toast': '150',
        'tooltip': '200',
      },
    },
  },
  plugins: [
    // Custom plugin for Octup utilities
    function ({ addUtilities, addComponents }) {
      // Utilities
      addUtilities({
        '.tabular-nums': {
          'font-variant-numeric': 'tabular-nums',
        },
        '.text-deep-slate': {
          color: '#1e293b',
        },
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
        },
        '.touch-target-row': {
          'min-height': '48px',
        },
        '.safe-area-pb': {
          'padding-bottom': 'env(safe-area-inset-bottom, 0px)',
        },
        '.antialiased-premium': {
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        },
        '.hide-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });

      // Components
      addComponents({
        '.glass': {
          background: 'rgba(255, 255, 255, 0.8)',
          'backdrop-filter': 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
        '.glass-dark': {
          background: 'rgba(15, 23, 42, 0.8)',
          'backdrop-filter': 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.card-premium': {
          'border-radius': '1.5rem',
          background: 'white',
          'box-shadow': '0 4px 20px -4px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          '&:hover': {
            'box-shadow': '0 8px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
          },
        },
        '.divider-subtle': {
          'border-color': 'rgba(0, 0, 0, 0.06)',
        },
        '.divider-gradient': {
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.08), transparent)',
        },
      });
    },
  ],
};
