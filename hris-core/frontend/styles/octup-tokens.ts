/**
 * Octup Design System Tokens
 * Official brand colors and typography from Figma
 */

// =============================================================================
// COLORS
// =============================================================================

export const OCTUP_COLORS = {
  // Brand Palette
  purple: '#743CF7',        // Primary purple (Teal Primary in Figma)
  teal: '#00A8A8',          // Teal/cyan - success states
  violet: '#7737FF',        // Accent violet
  violetLight: '#8850FF',   // Teal Light (used for info states)
  pink: '#FF3489',          // Pink - critical/alerts
  yellow: '#FFCF72',        // Warning states
  darkSlate: '#282831',     // Dark backgrounds (toasts, sidebar)
  middleGray: '#504B5A',    // Secondary text, headings
  lightBg: '#F8F7FB',       // Grey Light Cards - page backgrounds
  white: '#FFFFFF',         // Cards, surfaces
  textDark: '#343434',      // Primary body text

  // Grey Scale
  grey72: '#7F7B87',        // Grey 72% - secondary icons, info buttons
  grey50: '#A4A0AA',        // Grey 50% - placeholder text, disabled
  grey16: '#DDDBE1',        // Grey 16% - borders, dividers
  grey8: '#EBEAEE',         // Grey 8% - subtle borders
  grey4: '#F1F0F5',         // Grey 4% - hover states

  // Status Colors (on Light backgrounds)
  redLight: '#DB2059',      // Red on Light - negative trends, errors
  greenLight: '#00A8A8',    // Green on Light (same as teal)

  // Status Colors (on Dark backgrounds - toasts)
  redDark: '#FC4F6D',       // Red on Dark - warning toasts
  greenDark: '#04CE72',     // Green on Dark - success toasts

  // Semantic Aliases
  primary: '#743CF7',
  secondary: '#00A8A8',
  accent: '#FF3489',
  warning: '#FFCF72',
  success: '#00A8A8',
  error: '#DB2059',
  info: '#8850FF',

  // UI Colors
  border: '#DDDBE1',
  borderLight: '#EBEAEE',
  hoverBg: '#F1F0F5',
  cardBg: '#FFFFFF',
  mainBg: '#F8F7FB',

  // Sidebar & Dark Surfaces
  sidebarBg: '#282831',
  sidebarBorder: '#504B5A',
  sidebarText: '#9CA3AF',
  sidebarTextActive: '#00A8A8',
  sidebarActiveBg: 'rgba(0, 168, 168, 0.15)',

  // Gradients (as CSS strings)
  gradientTealIndigo: 'linear-gradient(224.13deg, #7737FF -0.95%, #00A8A8 100%)',
  gradientPinkOrange: 'linear-gradient(225deg, #FFCF72 0%, #FF3489 100%)',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const OCTUP_FONTS = {
  family: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

export const OCTUP_TYPOGRAPHY = {
  // Page Title
  h1: {
    fontFamily: OCTUP_FONTS.family,
    fontWeight: 700,
    fontSize: '24px',
    lineHeight: '36px',
    color: OCTUP_COLORS.middleGray,
  },

  // Section Title
  h2: {
    fontFamily: OCTUP_FONTS.family,
    fontWeight: 400,
    fontSize: '20px',
    lineHeight: '27px',
    color: OCTUP_COLORS.middleGray,
  },

  // Value Name / Subsection
  h3: {
    fontFamily: OCTUP_FONTS.family,
    fontWeight: 400,
    fontSize: '17px',
    lineHeight: '23px',
    color: OCTUP_COLORS.middleGray,
  },

  // Regular text / Percentages
  h4: {
    fontFamily: OCTUP_FONTS.family,
    fontWeight: 400,
    fontSize: '15px',
    lineHeight: '20px',
    color: OCTUP_COLORS.middleGray,
  },

  // Bold link text
  h4Bold: {
    fontFamily: OCTUP_FONTS.family,
    fontWeight: 600,
    fontSize: '15px',
    lineHeight: '20px',
    color: OCTUP_COLORS.purple,
  },

  // Small text
  h5: {
    fontFamily: OCTUP_FONTS.family,
    fontWeight: 400,
    fontSize: '13px',
    lineHeight: '18px',
    color: OCTUP_COLORS.middleGray,
  },

  // Small text link
  h5Bold: {
    fontFamily: OCTUP_FONTS.family,
    fontWeight: 600,
    fontSize: '13px',
    lineHeight: '18px',
    color: OCTUP_COLORS.purple,
  },

  // Big number (KPI values)
  numberBig: {
    fontFamily: OCTUP_FONTS.family,
    fontWeight: 275,
    fontSize: '40px',
    lineHeight: '60px',
    color: OCTUP_COLORS.middleGray,
  },

  // Smaller number
  numberSmall: {
    fontFamily: OCTUP_FONTS.family,
    fontWeight: 275,
    fontSize: '32px',
    lineHeight: '48px',
    color: OCTUP_COLORS.middleGray,
  },
} as const;

// =============================================================================
// SPACING & LAYOUT
// =============================================================================

export const OCTUP_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const OCTUP_RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

export const OCTUP_SHADOWS = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 14px rgba(0,0,0,0.1)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',

  // Neumorphism (Component Light)
  neuNormal: '-2px -2px 8px #FFFFFF, 2px 2px 4px rgba(80, 75, 90, 0.16)',
  neuPressed: 'inset -2px -2px 4px #FFFFFF, inset 2px 2px 8px rgba(80, 75, 90, 0.32)',
  neuHover: '-2px -2px 8px #FFFFFF, 4px 4px 8px rgba(80, 75, 90, 0.2)',

  // Popup/Toast shadows
  popup: '8px 8px 24px rgba(80, 75, 90, 0.08)',
} as const;

// =============================================================================
// EXPORT ALL
// =============================================================================

export const OCTUP = {
  colors: OCTUP_COLORS,
  fonts: OCTUP_FONTS,
  typography: OCTUP_TYPOGRAPHY,
  spacing: OCTUP_SPACING,
  radius: OCTUP_RADIUS,
  shadows: OCTUP_SHADOWS,
} as const;

export default OCTUP;
