/**
 * Alert Feed Component
 *
 * Displays a sidebar with important alerts:
 * - Work anniversaries
 * - Upcoming equity cliffs
 * - Pending onboarding tasks
 * - Equipment warnings
 */

import React from 'react';
import { useHRIS } from '../../context/HRISContext';
import { Card, Badge, Avatar } from '../common';
import { Alert, AlertType } from '../../types';

// ============================================================================
// ICONS
// ============================================================================

const CakeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 013 15.546V16a2 2 0 002 2h14a2 2 0 002-2v-.454zM17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0H7m10 0a2 2 0 012 2v2H5v-2a2 2 0 012-2m10-6V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v1" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

// ============================================================================
// ALERT TYPE CONFIG
// ============================================================================

interface AlertTypeConfig {
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

const ALERT_TYPE_CONFIG: Record<AlertType, AlertTypeConfig> = {
  anniversary: {
    icon: <CakeIcon />,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
  },
  cliff: {
    icon: <ChartIcon />,
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
  },
  onboarding: {
    icon: <ClipboardIcon />,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  document_pending: {
    icon: <ClipboardIcon />,
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-600',
    borderColor: 'border-gray-200',
  },
  equipment_warning: {
    icon: <ExclamationIcon />,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
  },
};

const PRIORITY_BADGES: Record<Alert['priority'], { variant: 'error' | 'warning' | 'info'; label: string }> = {
  high: { variant: 'error', label: 'High' },
  medium: { variant: 'warning', label: 'Medium' },
  low: { variant: 'info', label: 'Low' },
};

// ============================================================================
// ALERT FEED COMPONENT
// ============================================================================

export function AlertFeed() {
  const { alerts } = useHRIS();

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

  return (
    <Card padding="none" className="h-fit">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellIcon />
          <h3 className="text-lg font-semibold text-gray-900">Alert Feed</h3>
        </div>
        <Badge variant="info" size="sm">
          {alerts.length} alerts
        </Badge>
      </div>

      {/* Summary Pills */}
      <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap gap-2">
        {countByType.anniversary && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
            <CakeIcon /> {countByType.anniversary}
          </span>
        )}
        {countByType.cliff && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
            <ChartIcon /> {countByType.cliff}
          </span>
        )}
        {countByType.onboarding && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
            <ClipboardIcon /> {countByType.onboarding}
          </span>
        )}
        {countByType.equipment_warning && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
            <ExclamationIcon /> {countByType.equipment_warning}
          </span>
        )}
      </div>

      {/* Alert List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {sortedAlerts.map(alert => (
          <AlertItem key={alert.id} alert={alert} />
        ))}

        {alerts.length === 0 && (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">All caught up! No alerts at the moment.</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// ALERT ITEM COMPONENT
// ============================================================================

interface AlertItemProps {
  alert: Alert;
}

function AlertItem({ alert }: AlertItemProps) {
  const config = ALERT_TYPE_CONFIG[alert.type];
  const priorityBadge = PRIORITY_BADGES[alert.priority];

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
    <div
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${config.borderColor}`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} ${config.iconColor} flex items-center justify-center`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">{alert.title}</p>
            <Badge variant={priorityBadge.variant} size="sm">
              {priorityBadge.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">{alert.description}</p>
          <p className="mt-2 text-xs text-gray-400">{formatRelativeTime(alert.date)}</p>
        </div>
      </div>
    </div>
  );
}

export default AlertFeed;
