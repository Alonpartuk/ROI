/**
 * HR Admin Dashboard - Octup Design System
 *
 * Features:
 * - Premium KPI Ribbon with gradient accents
 * - Octup brand colors and styling
 * - Glass morphism effects
 * - Consistent with Reports Dashboard design
 */

import React, { useState } from 'react';
import { useHRIS } from '../../context/HRISContext';
import { KPICard, Select, Button, Badge, Tabs } from '../common';
import { EmployeeDirectory } from './EmployeeDirectory';
import { AlertFeed } from './AlertFeed';
import { GlobalMapView } from './GlobalMapView';
import { Currency } from '../../types';

// =============================================================================
// ICONS (Heroicons style)
// =============================================================================

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// =============================================================================
// CURRENCY FORMATTING
// =============================================================================

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  ILS: '₪',
  CAD: 'C$',
};

function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${symbol}${formatted}`;
}

// =============================================================================
// DASHBOARD COMPONENT - OCTUP STYLE
// =============================================================================

export function Dashboard() {
  const {
    kpis,
    burnRate,
    displayCurrency,
    setDisplayCurrency,
    convertToDisplayCurrency,
    isLoading,
    refreshData,
  } = useHRIS();

  const [activeView, setActiveView] = useState<'directory' | 'map'>('directory');

  // Calculate total burn rate in display currency
  const totalBurnRate = burnRate.reduce((sum, loc) => {
    return sum + convertToDisplayCurrency(loc.monthlyTotalUsd, 'USD');
  }, 0);

  // Get current date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#F4F4F7] bg-premium-pattern">
      {/* Header - Octup Style with gradient accent */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-30">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-[#809292] via-[#00CBC0] to-[#FF3489]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HR Command Center</h1>
                <Badge variant="secondary" size="sm" pill>Live</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{today}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Currency Toggle - Octup Style */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 hidden sm:inline">Display:</span>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                  {(['USD', 'ILS', 'CAD'] as Currency[]).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setDisplayCurrency(curr)}
                      className={`
                        px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150
                        ${displayCurrency === curr
                          ? 'bg-white text-[#809292] shadow-soft'
                          : 'text-slate-500 hover:text-slate-700'
                        }
                      `}
                    >
                      {CURRENCY_SYMBOLS[curr]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={refreshData}
                disabled={isLoading}
                className={`
                  p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700
                  transition-all duration-150 ${isLoading ? 'animate-spin' : ''}
                `}
              >
                <RefreshIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Ribbon - Octup Premium Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Headcount"
            value={kpis.totalHeadcount}
            subtitle="Active employees"
            icon={<UsersIcon />}
            color="primary"
            trend={{ value: 8, direction: 'up' }}
          />
          <KPICard
            title="Monthly Burn Rate"
            value={formatCurrency(totalBurnRate, displayCurrency)}
            subtitle="Salary + Benefits"
            icon={<DollarIcon />}
            color="secondary"
          />
          <KPICard
            title="Active Onboarding"
            value={kpis.activeOnboarding}
            subtitle="This month"
            icon={<ClipboardIcon />}
            color="warning"
          />
          <KPICard
            title="Upcoming Cliffs"
            value={kpis.upcomingCliffs}
            subtitle="Next 90 days"
            icon={<ChartIcon />}
            color={kpis.upcomingCliffs > 0 ? 'accent' : 'primary'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Directory/Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* View Toggle - Octup Pills Style */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveView('directory')}
                  className={`
                    px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150
                    ${activeView === 'directory'
                      ? 'bg-white text-[#809292] shadow-soft'
                      : 'text-slate-500 hover:text-slate-700'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Employee Directory
                  </span>
                </button>
                <button
                  onClick={() => setActiveView('map')}
                  className={`
                    px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150
                    ${activeView === 'map'
                      ? 'bg-white text-[#809292] shadow-soft'
                      : 'text-slate-500 hover:text-slate-700'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Global View
                  </span>
                </button>
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00CBC0]" />
                  <span className="text-slate-500">TLV: <span className="font-semibold text-slate-700">18</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-500">Toronto: <span className="font-semibold text-slate-700">8</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-500">US: <span className="font-semibold text-slate-700">4</span></span>
                </div>
              </div>
            </div>

            {/* Content - Animated Transition */}
            <div className="animate-fade-in">
              {activeView === 'directory' ? <EmployeeDirectory /> : <GlobalMapView />}
            </div>
          </div>

          {/* Right Column - Alert Feed */}
          <div className="lg:col-span-1">
            <AlertFeed />
          </div>
        </div>

        {/* Quick Actions Bar - Octup Style */}
        <div className="mt-8 p-6 bg-white rounded-3xl shadow-card border border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
              <p className="text-sm text-slate-500 mt-0.5">Common HR tasks at your fingertips</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add Employee
              </Button>
              <Button variant="ghost" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Report
              </Button>
              <Button variant="ghost" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule Review
              </Button>
              <Button variant="ghost" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-sm text-slate-400">
          <p>Octup HRIS • Built with the Octup Design System</p>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
