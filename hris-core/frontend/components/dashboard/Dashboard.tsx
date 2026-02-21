/**
 * Dashboard - Octup HRIS Premium
 * Linear/Stripe-inspired SaaS Dashboard
 */

import React, { useState } from 'react';
import { useHRIS } from '../../context/HRISContext';
import { EmployeeDirectory } from './EmployeeDirectory';
import { AlertFeed } from './AlertFeed';
import type { Currency } from '../../types';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const COLORS = {
  // SaaS Palette
  bg: '#F3F4F6',
  card: '#FFFFFF',
  primary: '#00A8A8',
  secondary: '#743CF7',
  accent: '#FF3489',
  warning: '#FFCF72',
  text: '#111827',
  muted: '#6B7280',
  border: '#F1F5F9',
  borderMedium: '#E2E8F0',

  // Semantic
  success: '#10B981',
  error: '#EF4444',
};

// Consistent 2-step shadow
const SHADOW = {
  card: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
  cardHover: '0 4px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
};

// =============================================================================
// INLINE SVG ICONS (Lucide-style, size 20)
// =============================================================================

const Icons = {
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  DollarSign: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  ClipboardCheck: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  TrendingUp: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  ),
  ArrowDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  ),
};

// =============================================================================
// CURRENCY CONFIG
// =============================================================================

const CURRENCY_CONFIG: Record<Currency, { symbol: string; rate: number }> = {
  USD: { symbol: '$', rate: 1 },
  ILS: { symbol: '₪', rate: 3.7 },
  CAD: { symbol: 'C$', rate: 1.35 },
};

function formatCompact(amount: number, currency: Currency): string {
  const config = CURRENCY_CONFIG[currency];
  const converted = amount * config.rate;
  if (converted >= 1000000) {
    return `${config.symbol}${(converted / 1000000).toFixed(1)}M`;
  }
  if (converted >= 1000) {
    return `${config.symbol}${(converted / 1000).toFixed(0)}K`;
  }
  return `${config.symbol}${Math.round(converted).toLocaleString()}`;
}

// =============================================================================
// PREMIUM KPI CARD
// =============================================================================

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  iconBg: string;
  iconColor: string;
  loading?: boolean;
  onClick?: () => void;
}

function KPICard({ title, value, subtitle, icon, trend, iconBg, iconColor, loading, onClick }: KPICardProps) {
  if (loading) {
    return (
      <div style={{
        backgroundColor: COLORS.card,
        borderRadius: '24px',
        padding: '24px',
        border: `1px solid ${COLORS.border}`,
        boxShadow: SHADOW.card,
        minHeight: '160px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ height: '40px', width: '40px', borderRadius: '12px', backgroundColor: '#E5E7EB' }} />
          <div style={{ height: '32px', width: '80px', borderRadius: '6px', backgroundColor: '#E5E7EB' }} />
          <div style={{ height: '14px', width: '120px', borderRadius: '4px', backgroundColor: '#E5E7EB' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: COLORS.card,
      borderRadius: '24px',
      padding: '24px',
      border: `1px solid ${COLORS.border}`,
      boxShadow: SHADOW.card,
      transition: 'all 0.2s ease',
      cursor: onClick ? 'pointer' : 'default',
      minHeight: '160px',
    }}
    onClick={onClick}
    onMouseDown={(e) => { if (onClick) e.currentTarget.style.transform = 'scale(0.97)'; }}
    onMouseUp={(e) => { if (onClick) e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.boxShadow = SHADOW.cardHover;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.boxShadow = SHADOW.card;
        e.currentTarget.style.transform = 'translateY(0)';
      }
    }}
    >
      {/* Icon badge */}
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        backgroundColor: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: iconColor,
        marginBottom: '16px',
      }}>
        {icon}
      </div>

      {/* Value with trend */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
        <span style={{
          fontSize: '32px',
          fontWeight: 700,
          color: COLORS.text,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </span>
        {trend && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: trend.direction === 'up' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: trend.direction === 'up' ? COLORS.success : COLORS.error,
          }}>
            {trend.direction === 'up' ? <Icons.ArrowUp /> : <Icons.ArrowDown />}
            {trend.value}%
          </span>
        )}
      </div>

      {/* Title & Subtitle */}
      <p style={{
        fontSize: '14px',
        fontWeight: 500,
        color: COLORS.muted,
        margin: 0,
      }}>
        {title}
      </p>
      <p style={{
        fontSize: '12px',
        color: COLORS.muted,
        margin: 0,
        marginTop: '2px',
        opacity: 0.7,
      }}>
        {subtitle}
      </p>
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { employees, kpis, cliffAlerts, onboardingProgress, isLoading } = useHRIS();
  const [isDesktop, setIsDesktop] = useState(true);

  // Check desktop on mount
  React.useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1280);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // KPI values
  const activeEmployees = kpis.totalHeadcount || employees.filter(e => e.currentStatus === 'active').length;
  const monthlyPayroll = kpis.monthlyBurnRateUsd || 0;
  const onboardingCount = kpis.activeOnboarding || onboardingProgress.filter(p => p.completionPercentage < 100).length;
  const upcomingCliffs = kpis.upcomingCliffs || cliffAlerts.length;

  // KPI navigation handlers
  const handleKPIClick = (page: string, _label: string) => {
    onNavigate?.(page);
  };

  return (
    <div>
      {/* Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: '-0.025em',
            margin: 0,
            WebkitFontSmoothing: 'antialiased',
          } as React.CSSProperties}>
            HR Dashboard
          </h1>
          <p style={{
            fontSize: '14px',
            color: COLORS.muted,
            margin: 0,
            marginTop: '4px',
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI Ribbon - strict 4 columns, fixed gap */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
      }}>
        <KPICard
          title="Active Employees"
          value={activeEmployees.toString()}
          subtitle="Total headcount"
          icon={<Icons.Users />}
          trend={{ value: 8, direction: 'up' }}
          iconBg="rgba(0, 168, 168, 0.1)"
          iconColor={COLORS.primary}
          loading={isLoading}
          onClick={() => handleKPIClick('employees', 'Employees')}
        />
        <KPICard
          title="Monthly Payroll"
          value={formatCompact(monthlyPayroll, 'USD')}
          subtitle="Salary + Benefits"
          icon={<Icons.DollarSign />}
          iconBg="rgba(116, 60, 247, 0.1)"
          iconColor={COLORS.secondary}
          loading={isLoading}
        />
        <KPICard
          title="Onboarding"
          value={onboardingCount.toString()}
          subtitle="Active this month"
          icon={<Icons.ClipboardCheck />}
          trend={{ value: 2, direction: 'up' }}
          iconBg="rgba(255, 207, 114, 0.15)"
          iconColor="#D97706"
          loading={isLoading}
          onClick={() => handleKPIClick('onboarding', 'Onboarding')}
        />
        <KPICard
          title="Upcoming Cliffs"
          value={upcomingCliffs.toString()}
          subtitle="Next 90 days"
          icon={<Icons.TrendingUp />}
          iconBg="rgba(255, 52, 137, 0.1)"
          iconColor={COLORS.accent}
          loading={isLoading}
          onClick={() => handleKPIClick('equity', 'Equity')}
        />
      </div>

      {/* Main Content: Employee Directory (70%) + Alert Feed (30%) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? '1fr 360px' : '1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Employee Directory */}
        <div style={{
          backgroundColor: COLORS.card,
          borderRadius: '24px',
          border: `1px solid ${COLORS.border}`,
          boxShadow: SHADOW.card,
          overflow: 'hidden',
          minWidth: 0,
        }}>
          <EmployeeDirectory />
        </div>

        {/* Alert Feed - Sticky, won't hide under table */}
        {isDesktop && (
          <div style={{
            position: 'sticky',
            top: '88px',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            zIndex: 10,
          }}>
            <AlertFeed onNavigate={onNavigate} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
