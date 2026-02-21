/**
 * Alert Feed - Octup HRIS
 * Displays important alerts with inline styles for reliability
 */

import React from 'react';
import { useHRIS } from '../../context/HRISContext';
import { Alert, AlertType } from '../../types';

// =============================================================================
// COLORS
// =============================================================================

// Official Octup Design System Colors
const COLORS = {
  purple: '#743CF7',        // Primary purple
  teal: '#00A8A8',          // Teal/success
  violet: '#7737FF',        // Accent violet
  pink: '#FF3489',          // Pink/critical
  yellow: '#FFCF72',        // Warning
  darkSlate: '#282831',     // Dark backgrounds
  middleGray: '#504B5A',    // Secondary text
  lightBg: '#F8F7FB',       // Page backgrounds
  cardBg: '#FFFFFF',        // Cards
  textDark: '#343434',      // Primary text
  textMuted: '#504B5A',     // Muted text
  border: '#F1F5F9',
};

// =============================================================================
// INLINE SVG ICONS (20x20)
// =============================================================================

const Icons = {
  Bell: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Cake: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
      <path d="M2 21h20" /><path d="M7 8v2" /><path d="M12 8v2" /><path d="M17 8v2" />
      <path d="M7 4h.01" /><path d="M12 4h.01" /><path d="M17 4h.01" />
    </svg>
  ),
  TrendingUp: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Clipboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

// =============================================================================
// ALERT TYPE CONFIG
// =============================================================================

interface AlertConfig {
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

const ALERT_CONFIG: Record<AlertType, AlertConfig> = {
  anniversary: {
    icon: <Icons.Cake />,
    bgColor: '#F3E8FF',
    iconColor: '#9333EA',
    borderColor: '#D8B4FE',
  },
  cliff: {
    icon: <Icons.TrendingUp />,
    bgColor: '#FEF3C7',
    iconColor: '#D97706',
    borderColor: '#FCD34D',
  },
  onboarding: {
    icon: <Icons.Clipboard />,
    bgColor: '#DBEAFE',
    iconColor: '#2563EB',
    borderColor: '#93C5FD',
  },
  document_pending: {
    icon: <Icons.Clipboard />,
    bgColor: '#F3F4F6',
    iconColor: '#6B7280',
    borderColor: '#D1D5DB',
  },
  equipment_warning: {
    icon: <Icons.AlertTriangle />,
    bgColor: '#FEE2E2',
    iconColor: '#DC2626',
    borderColor: '#FCA5A5',
  },
  performance: {
    icon: <Icons.TrendingUp />,
    bgColor: '#FEF3C7',
    iconColor: '#D97706',
    borderColor: '#FCD34D',
  },
  asset: {
    icon: <Icons.AlertTriangle />,
    bgColor: '#FFF7ED',
    iconColor: '#EA580C',
    borderColor: '#FDBA74',
  },
};

const PRIORITY_CONFIG: Record<Alert['priority'], { bgColor: string; color: string; label: string }> = {
  high: { bgColor: '#FEE2E2', color: '#DC2626', label: 'High' },
  medium: { bgColor: '#FEF3C7', color: '#D97706', label: 'Medium' },
  low: { bgColor: '#DBEAFE', color: '#2563EB', label: 'Low' },
};

// =============================================================================
// SKELETON LOADER
// =============================================================================

function AlertSkeleton() {
  return (
    <div style={{
      backgroundColor: COLORS.cardBg,
      borderRadius: '24px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
      border: `1px solid ${COLORS.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ height: '20px', width: '100px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
        <div style={{ height: '24px', width: '60px', backgroundColor: '#E5E7EB', borderRadius: '6px' }} />
      </div>

      {/* Items */}
      <div>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${COLORS.border}`,
            display: 'flex',
            gap: '12px',
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E5E7EB' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ height: '14px', width: '80%', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
              <div style={{ height: '12px', width: '60%', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ALERT ITEM COMPONENT
// =============================================================================

interface AlertItemProps {
  alert: Alert;
  onClick?: () => void;
}

function AlertItem({ alert, onClick }: AlertItemProps) {
  const config = ALERT_CONFIG[alert.type];
  const priorityConfig = PRIORITY_CONFIG[alert.priority];

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      padding: '16px 20px',
      borderBottom: `1px solid ${COLORS.border}`,
      borderLeft: `3px solid ${config.borderColor}`,
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
    }}
    onClick={onClick}
    onMouseEnter={e => (e.currentTarget.style.backgroundColor = COLORS.lightBg)}
    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Icon */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: config.bgColor,
          color: config.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {config.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <p style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 500,
              color: COLORS.textDark,
              lineHeight: 1.4,
            }}>
              {alert.title}
            </p>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: priorityConfig.bgColor,
              color: priorityConfig.color,
              flexShrink: 0,
            }}>
              {priorityConfig.label}
            </span>
          </div>
          <p style={{
            margin: 0,
            marginTop: '4px',
            fontSize: '13px',
            color: COLORS.textMuted,
            lineHeight: 1.4,
          }}>
            {alert.description}
          </p>
          <p style={{
            margin: 0,
            marginTop: '8px',
            fontSize: '12px',
            color: '#9CA3AF',
          }}>
            {formatRelativeTime(alert.date)}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN ALERT FEED COMPONENT
// =============================================================================

interface AlertFeedProps {
  onNavigate?: (page: string) => void;
}

export function AlertFeed({ onNavigate }: AlertFeedProps) {
  const { alerts, isLoading, employees, setSelectedEmployee, setEmployeePanelOpen } = useHRIS();

  // Sort alerts by priority
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Count by type
  const countByType = alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {} as Record<AlertType, number>);

  // Handle alert click - deep linking
  const handleAlertClick = (alert: Alert) => {
    // Try to find associated employee from alert title/description
    const findEmployee = () => {
      // Look for employee name in alert title
      return employees.find(e =>
        alert.title.includes(e.displayName) ||
        alert.description?.includes(e.displayName)
      );
    };

    switch (alert.type) {
      case 'anniversary':
      case 'cliff': {
        const employee = findEmployee();
        if (employee) {
          setSelectedEmployee(employee);
          setEmployeePanelOpen(true);
        }
        break;
      }
      case 'onboarding':
        onNavigate?.('onboarding');
        break;
      case 'equipment_warning':
        onNavigate?.('assets');
        break;
      case 'document_pending': {
        const employee = findEmployee();
        if (employee) {
          setSelectedEmployee(employee);
          setEmployeePanelOpen(true);
        }
        break;
      }
      default:
        break;
    }
  };

  if (isLoading) {
    return <AlertSkeleton />;
  }

  return (
    <div style={{
      backgroundColor: COLORS.cardBg,
      borderRadius: '24px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
      border: `1px solid ${COLORS.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: COLORS.textMuted }}>
            <Icons.Bell />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>
            Alert Feed
          </h3>
        </div>
        <span style={{
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: COLORS.lightBg,
          color: COLORS.textMuted,
        }}>
          {alerts.length} alerts
        </span>
      </div>

      {/* Summary Pills */}
      {Object.keys(countByType).length > 0 && (
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          {countByType.anniversary && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#F3E8FF',
              color: '#9333EA',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              <Icons.Cake /> {countByType.anniversary}
            </span>
          )}
          {countByType.cliff && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              <Icons.TrendingUp /> {countByType.cliff}
            </span>
          )}
          {countByType.onboarding && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#DBEAFE',
              color: '#2563EB',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              <Icons.Clipboard /> {countByType.onboarding}
            </span>
          )}
          {countByType.equipment_warning && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              <Icons.AlertTriangle /> {countByType.equipment_warning}
            </span>
          )}
        </div>
      )}

      {/* Alert List */}
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {sortedAlerts.map(alert => (
          <AlertItem key={alert.id} alert={alert} onClick={() => handleAlertClick(alert)} />
        ))}

        {/* Empty State */}
        {alerts.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}>
              <Icons.Check />
            </div>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: COLORS.textDark }}>
              All caught up!
            </p>
            <p style={{ margin: 0, marginTop: '4px', fontSize: '13px', color: COLORS.textMuted }}>
              No alerts at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertFeed;
