/**
 * App Layout - Octup Design System
 *
 * Main application layout with:
 * - Top navigation bar with gradient accent
 * - Sidebar navigation (desktop)
 * - Bottom navigation (mobile)
 * - Glass morphism effects
 * - Consistent with Reports Dashboard design
 */

import React, { useState, ReactNode } from 'react';
import { Avatar, Badge, Button } from '../common';

// =============================================================================
// NAVIGATION ITEMS
// =============================================================================

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  badgeColor?: 'primary' | 'secondary' | 'warning' | 'error';
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    badge: 30,
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    badge: 3,
    badgeColor: 'warning',
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    badge: 5,
    badgeColor: 'secondary',
  },
  {
    id: 'equity',
    label: 'Equity',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    badge: 2,
    badgeColor: 'error',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// =============================================================================
// APP LAYOUT COMPONENT
// =============================================================================

interface AppLayoutProps {
  children: ReactNode;
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
}

export function AppLayout({ children, currentPage = 'dashboard', onNavigate }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleNavigate = (pageId: string) => {
    onNavigate?.(pageId);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7]">
      {/* Top Navigation Bar */}
      <TopBar
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isUserMenuOpen={isUserMenuOpen}
        onUserMenuToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
      />

      {/* Sidebar - Desktop */}
      <Sidebar
        isOpen={isSidebarOpen}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <main className={`
        pt-16 min-h-screen transition-all duration-300
        ${isSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}
        pb-20 lg:pb-0
      `}>
        {children}
      </main>

      {/* Bottom Navigation - Mobile */}
      <BottomNav
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

// =============================================================================
// TOP BAR COMPONENT
// =============================================================================

interface TopBarProps {
  onMenuToggle: () => void;
  isUserMenuOpen: boolean;
  onUserMenuToggle: () => void;
}

function TopBar({ onMenuToggle, isUserMenuOpen, onUserMenuToggle }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-b border-slate-100 z-40">
      {/* Top gradient bar - Octup signature */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#809292] via-[#00CBC0] to-[#FF3489]" />

      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all lg:hidden"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#809292] to-[#00CBC0] flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Octup HRIS</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Human Resources</p>
            </div>
          </div>
        </div>

        {/* Center Section - Global Search */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <input
              type="search"
              placeholder="Search employees, assets, documents..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm
                       focus:bg-white focus:border-[#809292] focus:ring-2 focus:ring-[#809292]/20 focus:outline-none
                       transition-all duration-150"
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-slate-400 bg-slate-100 rounded border border-slate-200">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF3489] rounded-full animate-pulse" />
          </button>

          {/* Quick Actions */}
          <button className="hidden sm:flex p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-slate-200" />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={onUserMenuToggle}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 transition-all"
            >
              <Avatar name="HR Admin" size="sm" status="online" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-900">HR Admin</p>
                <p className="text-xs text-slate-500">admin@octup.io</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-soft-xl border border-slate-100 py-2 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">HR Admin</p>
                  <p className="text-xs text-slate-500">admin@octup.io</p>
                </div>
                <div className="py-1">
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================

interface SidebarProps {
  isOpen: boolean;
  currentPage: string;
  onNavigate: (pageId: string) => void;
}

function Sidebar({ isOpen, currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className={`
      fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-slate-100 z-30
      transform transition-transform duration-300 ease-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      hidden lg:block
    `}>
      <nav className="p-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              transition-all duration-150
              ${currentPage === item.id
                ? 'bg-[#809292]/10 text-[#809292]'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }
            `}
          >
            <span className={currentPage === item.id ? 'text-[#809292]' : 'text-slate-400'}>
              {item.icon}
            </span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className={`
                px-2 py-0.5 text-xs font-semibold rounded-lg
                ${item.badgeColor === 'warning' ? 'bg-amber-100 text-amber-700' :
                  item.badgeColor === 'secondary' ? 'bg-[#00CBC0]/10 text-[#00a89e]' :
                  item.badgeColor === 'error' ? 'bg-rose-100 text-rose-700' :
                  'bg-slate-100 text-slate-600'}
              `}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Help Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#809292]/5 to-[#00CBC0]/5 border border-[#809292]/10">
          <p className="text-sm font-semibold text-slate-900">Need help?</p>
          <p className="text-xs text-slate-500 mt-1">Check out our documentation or contact support.</p>
          <button className="mt-3 text-sm font-semibold text-[#809292] hover:text-[#6a7a7a] transition-colors">
            View Docs →
          </button>
        </div>
      </div>
    </aside>
  );
}

// =============================================================================
// BOTTOM NAVIGATION - MOBILE
// =============================================================================

interface BottomNavProps {
  currentPage: string;
  onNavigate: (pageId: string) => void;
}

function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  // Show only 5 items in bottom nav
  const mobileNavItems = NAV_ITEMS.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-40 lg:hidden"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.75rem)' }}>
      <div className="h-full flex items-center justify-around px-2">
        {mobileNavItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl min-w-[60px]
              transition-all duration-150
              ${currentPage === item.id
                ? 'text-[#809292]'
                : 'text-slate-400 hover:text-slate-600'
              }
            `}
          >
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className={`
                  absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center
                  text-[10px] font-bold rounded-full
                  ${item.badgeColor === 'warning' ? 'bg-amber-500 text-white' :
                    item.badgeColor === 'error' ? 'bg-rose-500 text-white' :
                    'bg-[#00CBC0] text-white'}
                `}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default AppLayout;
