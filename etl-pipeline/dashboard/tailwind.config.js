/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Octup Official Brand Palette
        octup: {
          primary: '#809292',      // Primary Purple/Teal - nav, primary buttons
          secondary: '#00CBC0',    // Teal - healthy indicators, success
          accent: '#FF3489',       // Pink - critical risk, urgent CTAs
          warning: '#F9BD63',      // Orange - stalled, ghosted deals
          dark: '#282831',         // Dark Slate - dark mode containers
          light: '#F4F4F7',        // Light Grey - page backgrounds
          // Extended palette for UI variations
          'primary-dark': '#6a7a7a',
          'primary-light': '#9aabab',
          'secondary-dark': '#00a89e',
          'secondary-light': '#33d6cd',
          'accent-dark': '#d92d73',
          'accent-light': '#ff5ca1',
        },
        // Risk level colors using brand palette
        risk: {
          critical: '#FF3489',     // Pink - critical
          high: '#FF3489',         // Pink - high risk
          medium: '#F9BD63',       // Orange - medium/stalled
          low: '#00CBC0',          // Teal - low risk
          healthy: '#00CBC0',      // Teal - healthy
        },
      },
      backgroundImage: {
        'octup-gradient': 'linear-gradient(135deg, #809292 0%, #00CBC0 100%)',
        'octup-gradient-dark': 'linear-gradient(135deg, #282831 0%, #3a3a45 100%)',
        'octup-gradient-accent': 'linear-gradient(135deg, #FF3489 0%, #F9BD63 100%)',
      },
      boxShadow: {
        'octup': '0 4px 14px 0 rgba(128, 146, 146, 0.25)',
        'octup-accent': '0 4px 14px 0 rgba(255, 52, 137, 0.25)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
