/**
 * AppLayout - Octup HRIS Premium
 * Strict grid shell: 280px locked sidebar + constrained main canvas
 */

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useHRIS } from '../../context/HRISContext';
import { useRouter } from 'next/router';
import { UserRole } from '../../utils/privacy';

// =============================================================================
// DESIGN TOKENS - Premium SaaS Aesthetic
// =============================================================================

const SIDEBAR_WIDTH = 280;

const COLORS = {
  // Sidebar - Deep slate
  sidebarBg: '#1A1C1E',
  sidebarBgHover: '#25272A',
  sidebarBorder: '#2D2F33',
  sidebarText: '#8B8D91',
  sidebarTextHover: '#FFFFFF',
  sidebarGlow: '#00A8A8',

  // Main Canvas
  canvasBg: '#F3F4F6',
  cardBg: '#FFFFFF',

  // Brand
  primary: '#743CF7',
  secondary: '#00A8A8',
  accent: '#FF3489',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Borders - single consistent color
  border: '#F1F5F9',
  borderMedium: '#E2E8F0',
};

// Consistent shadow tokens
const SHADOW = {
  sm: '0 1px 2px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)',
  md: '0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
  lg: '0 4px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
  dropdown: '0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.12)',
};

// =============================================================================
// OCTUP LOGO COMPONENT
// =============================================================================

const OctupLogo = ({ width = 144 }: { width?: number }) => {
  const height = (width / 144) * 40;

  return (
    <svg fill="none" height={height} viewBox="0 0 144 40" width={width} xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_octup_logo)">
        <path d="M20.0238 40.0003C17.1797 40.0003 14.338 39.3954 11.718 38.2054C7.53321 36.304 4.1051 32.9836 2.06537 28.8552C-2.81725 18.9663 1.25486 6.94832 11.1425 2.0657C21.0314 -2.81692 33.0482 1.2552 37.932 11.1429C39.0878 13.4838 39.7685 15.9802 39.9522 18.5635C39.9999 19.2381 39.4931 19.8233 38.8185 19.8723C38.1438 19.9225 37.5586 19.4132 37.5096 18.7386C37.348 16.4736 36.7506 14.282 35.7356 12.2264C31.4517 3.54959 20.9053 -0.0242243 12.2273 4.26092C3.54925 8.54607 -0.02456 19.0924 4.26059 27.7705C7.90418 35.1483 16.3276 39.0392 24.2906 37.0215C24.9456 36.855 25.6116 37.2516 25.7781 37.9079C25.9447 38.5629 25.548 39.2289 24.8917 39.3954C23.2964 39.7995 21.6595 40.0003 20.0226 40.0003H20.0238ZM37.4668 22.7348C36.6649 23.0984 36.3098 24.0436 36.6734 24.8455C37.0371 25.6475 37.9822 26.0025 38.7842 25.6389C39.5861 25.2753 39.9412 24.3301 39.5775 23.5282C39.2139 22.7262 38.2687 22.3712 37.4668 22.7348ZM34.5504 27.7692C33.38 28.3006 32.8609 29.6804 33.3922 30.8521C33.9236 32.0225 35.3034 32.5417 36.4751 32.0103C37.6455 31.4789 38.1647 30.0991 37.6333 28.9274C37.1019 27.7558 35.7221 27.2379 34.5504 27.7692ZM28.8647 32.478C27.4151 33.1355 26.7735 34.8446 27.431 36.2942C28.0884 37.7438 29.7976 38.3854 31.2472 37.7279C32.6968 37.0704 33.3384 35.3613 32.6809 33.9117C32.0234 32.4621 30.3143 31.8205 28.8647 32.478Z" fill="url(#paint0_octup_logo)"/>
      </g>
      <g clipPath="url(#clip1_octup_logo)">
        <path d="M92.7266 8.32568V26.7139C92.7266 28.8173 94.4321 30.5227 96.5354 30.5227C97.7022 30.5227 98.7466 29.9975 99.4457 29.1711C99.6293 28.9544 99.7897 28.7156 99.9207 28.461" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.20379"/>
        <path d="M93.2734 12.5594H97.7594" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.20379"/>
        <path d="M104.836 11.929V23.6592C104.836 27.4498 107.909 30.5228 111.7 30.5228C115.49 30.5228 118.563 27.4498 118.563 23.6592V11.9461" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.20379"/>
        <path d="M56.5152 30.4724C61.4898 30.4724 65.5226 26.3004 65.5226 21.154C65.5226 16.0077 61.4898 11.8357 56.5152 11.8357C51.5406 11.8357 47.5078 16.0077 47.5078 21.154C47.5078 26.3004 51.5406 30.4724 56.5152 30.4724Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.20379"/>
        <path d="M85.3994 27.6282C83.7612 29.3814 81.4644 30.4723 78.9214 30.4723C73.947 30.4723 69.9141 26.2998 69.9141 21.1539C69.9141 16.0081 73.947 11.8356 78.9214 11.8356C81.4093 11.8356 83.6608 12.8787 85.2904 14.5646" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.20379"/>
        <path d="M124.273 20.9908V34.5869" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.20379"/>
        <path d="M124.273 20.9607C124.273 15.8344 128.429 11.679 133.555 11.679C138.681 11.679 142.837 15.8344 142.837 20.9607C142.837 26.0869 138.681 30.2423 133.555 30.2423C131.772 30.2423 130.107 29.7391 128.693 28.8686" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.20379"/>
      </g>
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id="paint0_octup_logo" x1="30.4942" x2="9.99901" y1="38.1772" y2="2.67786">
          <stop stopColor="#00C8C0"/>
          <stop offset="1" stopColor="#743CF7"/>
        </linearGradient>
        <clipPath id="clip0_octup_logo">
          <rect fill="white" height="40" width="39.9559"/>
        </clipPath>
        <clipPath id="clip1_octup_logo">
          <rect fill="white" height="31.4738" width="97.5336" transform="translate(46.4062 7.22339)"/>
        </clipPath>
      </defs>
    </svg>
  );
};

// =============================================================================
// INLINE SVG ICONS (Lucide-style, size 20)
// =============================================================================

const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Laptop: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
    </svg>
  ),
  ClipboardList: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" />
      <path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  ),
  TrendingUp: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Bell: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Command: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
    </svg>
  ),
  User: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  LogOut: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

// =============================================================================
// NAVIGATION CONFIG
// =============================================================================

const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard },
  { id: 'employees', label: 'Employees', icon: Icons.Users, badge: 0 },
  { id: 'assets', label: 'Assets', icon: Icons.Laptop, badge: 30, badgeColor: '#FFCF72' },
  { id: 'onboarding', label: 'Onboarding', icon: Icons.ClipboardList },
  { id: 'equity', label: 'Equity', icon: Icons.TrendingUp, roles: ['hr_admin', 'admin', 'finance'] as string[] },
  { id: 'reports', label: 'Reports', icon: Icons.FileText, roles: ['hr_admin', 'admin', 'finance', 'manager'] as string[] },
  { id: 'settings', label: 'Settings', icon: Icons.Settings, roles: ['hr_admin', 'admin'] as string[] },
];

// =============================================================================
// BUTTON STYLE HELPER (active:scale-95, hover:brightness)
// =============================================================================

function useButtonHandlers() {
  return {
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.transform = 'scale(0.95)';
    },
    onMouseUp: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.transform = 'scale(1)';
    },
  };
}

// =============================================================================
// APP LAYOUT COMPONENT
// =============================================================================

interface AppLayoutProps {
  children: ReactNode;
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
}

export function AppLayout({ children, currentPage = 'dashboard', onNavigate }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const btnHandlers = useButtonHandlers();

  const {
    user,
    setUserRole,
    logout,
    globalSearchQuery,
    setGlobalSearchQuery,
    searchResults,
    setSelectedEmployee,
    alerts,
    employees,
    assets,
  } = useHRIS();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMounted(true);
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && isSearchFocused) {
        searchInputRef.current?.blur();
        setGlobalSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused, setGlobalSearchQuery]);

  // Close user menu and notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (pageId: string) => {
    onNavigate?.(pageId);
    setIsMobileMenuOpen(false);
  };

  const handleSearchResultClick = (result: typeof searchResults[0]) => {
    setGlobalSearchQuery('');
    setIsSearchFocused(false);
    searchInputRef.current?.blur();

    if (result.type === 'employee') {
      setSelectedEmployee(result.data as any);
      onNavigate?.('employees');
    } else if (result.type === 'asset') {
      onNavigate?.('assets');
    }
  };

  const handleRoleSwitch = (role: UserRole) => {
    setUserRole(role);
    setIsUserMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push('/login');
  };

  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // Filter navigation items by user role and inject dynamic badges
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => {
    if (!item.roles) return true; // No role restriction
    const userRoles: string[] = user?.roles || [];
    return item.roles.some(r => userRoles.includes(r));
  }).map(item => {
    if (item.id === 'employees') return { ...item, badge: employees.length };
    if (item.id === 'assets') return { ...item, badge: assets.length };
    return item;
  });

  // SSR skeleton
  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.canvasBg }} />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: COLORS.canvasBg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    } as React.CSSProperties}>

      {/* ===== DARK SIDEBAR (Desktop) - LOCKED 280px ===== */}
      {isDesktop && (
        <aside style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: `${SIDEBAR_WIDTH}px`,
          minWidth: `${SIDEBAR_WIDTH}px`,
          maxWidth: `${SIDEBAR_WIDTH}px`,
          backgroundColor: COLORS.sidebarBg,
          borderRight: `1px solid ${COLORS.sidebarBorder}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {/* Logo */}
          <div style={{
            height: '64px',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${COLORS.sidebarBorder}`,
            flexShrink: 0,
          }}>
            <OctupLogo width={140} />
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 500,
              color: COLORS.sidebarText,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '8px 12px',
              marginBottom: '4px',
            }}>
              Menu
            </div>

            {NAV_ITEMS.map(item => {
              const isActive = currentPage === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  {...btnHandlers}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    marginBottom: '2px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isActive ? COLORS.sidebarBgHover : 'transparent',
                    color: isActive ? 'white' : COLORS.sidebarText,
                    fontSize: '14px',
                    fontWeight: isActive ? 500 : 400,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = COLORS.sidebarBgHover;
                      e.currentTarget.style.color = COLORS.sidebarTextHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = COLORS.sidebarText;
                    }
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Active glow indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '3px',
                      height: '20px',
                      borderRadius: '0 4px 4px 0',
                      backgroundColor: COLORS.sidebarGlow,
                      boxShadow: `0 0 12px ${COLORS.sidebarGlow}`,
                    }} />
                  )}

                  <Icon />
                  <span style={{ flex: 1 }}>{item.label}</span>

                  {item.badge && (
                    <span style={{
                      minWidth: '20px',
                      height: '20px',
                      padding: '0 6px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: item.badgeColor ? `${item.badgeColor}20` : 'rgba(255,255,255,0.1)',
                      color: item.badgeColor || COLORS.sidebarText,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom user section */}
          <div style={{
            padding: '16px',
            borderTop: `1px solid ${COLORS.sidebarBorder}`,
            flexShrink: 0,
          }}>
            <div
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.sidebarBgHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {userInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'white', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
                <div style={{ color: COLORS.sidebarText, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ===== MOBILE OVERLAY ===== */}
      {isMobileMenuOpen && !isDesktop && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside style={{
            position: 'relative',
            width: `${SIDEBAR_WIDTH}px`,
            height: '100%',
            backgroundColor: COLORS.sidebarBg,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              height: '56px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${COLORS.sidebarBorder}`,
              flexShrink: 0,
            }}>
              <OctupLogo width={120} />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  padding: '8px',
                  background: 'none',
                  border: 'none',
                  color: COLORS.sidebarText,
                  cursor: 'pointer',
                }}
              >
                <Icons.X />
              </button>
            </div>
            <nav style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              {NAV_ITEMS.map(item => {
                const isActive = currentPage === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      marginBottom: '4px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: isActive ? COLORS.sidebarBgHover : 'transparent',
                      color: isActive ? 'white' : COLORS.sidebarText,
                      fontSize: '14px',
                      textAlign: 'left',
                    }}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ===== MAIN CONTENT AREA ===== */}
      <div style={{
        marginLeft: isDesktop ? `${SIDEBAR_WIDTH}px` : 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Top Bar */}
        <header style={{
          height: '64px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${COLORS.border}`,
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          gap: '16px',
          flexShrink: 0,
        }}>
          {/* Mobile menu button */}
          {!isDesktop && (
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                padding: '8px',
                background: 'none',
                border: 'none',
                color: COLORS.textSecondary,
                cursor: 'pointer',
              }}
            >
              <Icons.Menu />
            </button>
          )}

          {/* Glassmorphism Search Bar */}
          <div style={{
            flex: 1,
            maxWidth: '480px',
            display: isDesktop ? 'block' : 'none',
            position: 'relative',
          }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}>
              <div style={{
                position: 'absolute',
                left: '14px',
                color: COLORS.textMuted,
                display: 'flex',
                alignItems: 'center',
              }}>
                <Icons.Search />
              </div>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search employees, assets, documents..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '44px',
                  paddingRight: '80px',
                  borderRadius: isSearchFocused && searchResults.length > 0 ? '10px 10px 0 0' : '10px',
                  border: `1px solid ${isSearchFocused ? COLORS.secondary : COLORS.border}`,
                  backgroundColor: isSearchFocused ? 'white' : 'rgba(243, 244, 246, 0.5)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  boxShadow: isSearchFocused ? `0 0 0 3px ${COLORS.secondary}20` : 'none',
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              />
              {/* Cmd+K Badge */}
              <div style={{
                position: 'absolute',
                right: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: COLORS.border,
                border: `1px solid ${COLORS.borderMedium}`,
              }}>
                <Icons.Command />
                <span style={{ fontSize: '12px', fontWeight: 500, color: COLORS.textMuted }}>K</span>
              </div>
            </div>

            {/* Search Results Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: `1px solid ${COLORS.secondary}`,
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                boxShadow: SHADOW.dropdown,
                maxHeight: '320px',
                overflowY: 'auto',
                zIndex: 110,
              }}>
                <div style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  Quick Results
                </div>
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSearchResultClick(result)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.border}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      backgroundColor: result.type === 'employee' ? '#00A8A820' : '#743CF720',
                      color: result.type === 'employee' ? '#00A8A8' : '#743CF7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {result.type === 'employee' ? <Icons.User /> : <Icons.Laptop />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.title}
                      </div>
                      <div style={{ fontSize: '12px', color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.subtitle}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor: result.type === 'employee' ? '#00A8A815' : '#743CF715',
                      color: result.type === 'employee' ? '#00A8A8' : '#743CF7',
                      flexShrink: 0,
                    }}>
                      {result.type}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {isSearchFocused && globalSearchQuery.length >= 2 && searchResults.length === 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: `1px solid ${COLORS.secondary}`,
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                boxShadow: SHADOW.dropdown,
                padding: '20px',
                textAlign: 'center',
                zIndex: 110,
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: COLORS.textMuted }}>
                  No results found for "{globalSearchQuery}"
                </p>
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div ref={notificationRef} style={{ position: 'relative' }}>
              <button
                {...btnHandlers}
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                style={{
                  position: 'relative',
                  padding: '10px',
                  background: 'none',
                  border: 'none',
                  color: COLORS.textSecondary,
                  cursor: 'pointer',
                  borderRadius: '10px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.border}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Icons.Bell />
                {alerts.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    backgroundColor: COLORS.accent,
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: '2px solid white',
                  }}>
                    {alerts.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  width: '360px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  boxShadow: SHADOW.dropdown,
                  border: `1px solid ${COLORS.border}`,
                  zIndex: 100,
                }}>
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary }}>Notifications</h3>
                    <span style={{ fontSize: '12px', color: COLORS.textSecondary }}>{alerts.length} alerts</span>
                  </div>
                  {alerts.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: COLORS.textSecondary }}>No notifications</p>
                    </div>
                  ) : (
                    alerts.map((alert, i) => {
                      const priorityColors: Record<string, string> = {
                        critical: '#DC2626',
                        high: '#D97706',
                        medium: '#2563EB',
                        low: '#6B7280',
                      };
                      return (
                        <div
                          key={alert.id || i}
                          style={{
                            padding: '14px 20px',
                            borderBottom: i < alerts.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                              backgroundColor: priorityColors[alert.priority] || '#6B7280',
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {alert.title}
                              </p>
                              <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.textSecondary, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                                {alert.description}
                              </p>
                            </div>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                              textTransform: 'capitalize', flexShrink: 0,
                              backgroundColor: `${priorityColors[alert.priority] || '#6B7280'}15`,
                              color: priorityColors[alert.priority] || '#6B7280',
                            }}>
                              {alert.priority}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {isDesktop && (
              <div style={{
                width: '1px',
                height: '24px',
                backgroundColor: COLORS.borderMedium,
                margin: '0 8px',
              }} />
            )}

            {isDesktop && (
              <div ref={userMenuRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    backgroundColor: isUserMenuOpen ? COLORS.border : 'transparent',
                  }}
                  onMouseEnter={(e) => !isUserMenuOpen && (e.currentTarget.style.backgroundColor = COLORS.border)}
                  onMouseLeave={(e) => !isUserMenuOpen && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {userInitials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: COLORS.textPrimary }}>
                      {user?.name || 'User'}
                    </div>
                    <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
                      {user?.roles[0] || 'employee'}
                    </div>
                  </div>
                  <Icons.ChevronDown />
                </div>

                {/* User Menu Dropdown */}
                {isUserMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '240px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: SHADOW.dropdown,
                    border: `1px solid ${COLORS.border}`,
                    overflow: 'hidden',
                    zIndex: 100,
                  }}>
                    {/* User Info */}
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary }}>
                        {user?.name}
                      </div>
                      <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
                        {user?.email}
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div style={{ padding: '8px' }}>
                      <button
                        onClick={() => { handleNavigate('settings'); setIsUserMenuOpen(false); }}
                        {...btnHandlers}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: COLORS.textPrimary,
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.border}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <Icons.User />
                        My Profile
                      </button>
                      <button
                        onClick={() => { handleNavigate('settings'); setIsUserMenuOpen(false); }}
                        {...btnHandlers}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: COLORS.textPrimary,
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.border}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <Icons.Settings />
                        Settings
                      </button>
                    </div>

                    {/* Role Switcher (Dev Mode) */}
                    <div style={{
                      padding: '8px',
                      borderTop: `1px solid ${COLORS.border}`,
                    }}>
                      <div style={{
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: COLORS.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <Icons.Shield />
                        Dev: Switch Role
                      </div>
                      {(['hr_admin', 'hr_viewer', 'finance', 'manager', 'employee'] as UserRole[]).map(role => (
                        <button
                          key={role}
                          onClick={() => handleRoleSwitch(role)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: user?.roles[0] === role ? '#00A8A815' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: user?.roles[0] === role ? COLORS.secondary : COLORS.textSecondary,
                            fontWeight: user?.roles[0] === role ? 500 : 400,
                            textAlign: 'left',
                            transition: 'all 0.1s ease',
                          }}
                          onMouseEnter={(e) => user?.roles[0] !== role && (e.currentTarget.style.backgroundColor = COLORS.border)}
                          onMouseLeave={(e) => user?.roles[0] !== role && (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {role.replace('_', ' ')}
                          {user?.roles[0] === role && (
                            <span style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: COLORS.secondary,
                            }} />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Logout */}
                    <div style={{
                      padding: '8px',
                      borderTop: `1px solid ${COLORS.border}`,
                    }}>
                      <button
                        onClick={handleLogout}
                        {...btnHandlers}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#DC2626',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <Icons.LogOut />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content - max-width constrained, consistent padding, overflow-y */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            maxWidth: '1600px',
            width: '100%',
            margin: '0 auto',
            padding: isDesktop ? '40px 32px' : '16px',
            flex: 1,
          }}>
            {children}
          </div>
        </main>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      {!isDesktop && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${COLORS.border}`,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 8px',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {NAV_ITEMS.slice(0, 5).map(item => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  color: isActive ? COLORS.primary : COLORS.textMuted,
                  cursor: 'pointer',
                }}
              >
                <Icon />
                <span style={{ fontSize: '10px', fontWeight: 500 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export default AppLayout;
