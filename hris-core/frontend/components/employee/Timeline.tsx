/**
 * Career Timeline Component
 *
 * Displays a vertical timeline of employee events:
 * - Joined (employment)
 * - Promotions (employment changes)
 * - Salary Changes
 * - Equity Grants
 * - Vesting Events
 * - Equipment Assigned
 */

import React from 'react';
import { TimelineEvent, TimelineEventType } from '../../types';
import { Badge } from '../common';

// ============================================================================
// ICONS
// ============================================================================

const BriefcaseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const LaptopIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// ============================================================================
// EVENT TYPE CONFIG
// ============================================================================

interface EventTypeConfig {
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const EVENT_CONFIG: Record<TimelineEventType, EventTypeConfig> = {
  employment: {
    icon: <BriefcaseIcon />,
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
  },
  salary: {
    icon: <DollarIcon />,
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500',
    textColor: 'text-green-600',
  },
  equity_grant: {
    icon: <ChartIcon />,
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-600',
  },
  vesting: {
    icon: <CalendarIcon />,
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-500',
    textColor: 'text-indigo-600',
  },
  equipment: {
    icon: <LaptopIcon />,
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-600',
  },
  document: {
    icon: <DocumentIcon />,
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-600',
  },
};

// ============================================================================
// TIMELINE COMPONENT
// ============================================================================

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  // Sort events by date (newest first, but future events at top)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.eventDate);
    const dateB = new Date(b.eventDate);
    const now = new Date();

    // Future events first
    const aIsFuture = dateA > now;
    const bIsFuture = dateB > now;

    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;

    // For future events, sort ascending (soonest first)
    if (aIsFuture && bIsFuture) return dateA.getTime() - dateB.getTime();

    // For past events, sort descending (most recent first)
    return dateB.getTime() - dateA.getTime();
  });

  // Separate future and past events
  const now = new Date();
  const futureEvents = sortedEvents.filter(e => new Date(e.eventDate) > now);
  const pastEvents = sortedEvents.filter(e => new Date(e.eventDate) <= now);

  return (
    <div className="space-y-6">
      {/* Future Events Section */}
      {futureEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="info" size="sm">Upcoming</Badge>
            <span className="text-sm text-gray-500">{futureEvents.length} scheduled</span>
          </div>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200" />

            {/* Events */}
            <div className="space-y-4">
              {futureEvents.map((event, index) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  isFuture
                  isFirst={index === 0}
                  isLast={index === futureEvents.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Now Marker */}
      {futureEvents.length > 0 && pastEvents.length > 0 && (
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-300" />
          <span className="flex-shrink px-4 text-sm font-medium text-gray-500 bg-white">
            Today
          </span>
          <div className="flex-grow border-t border-gray-300" />
        </div>
      )}

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Events */}
          <div className="space-y-4">
            {pastEvents.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                isFuture={false}
                isFirst={index === 0}
                isLast={index === pastEvents.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No timeline events to display
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TIMELINE ITEM COMPONENT
// ============================================================================

interface TimelineItemProps {
  event: TimelineEvent;
  isFuture: boolean;
  isFirst: boolean;
  isLast: boolean;
}

function TimelineItem({ event, isFuture, isFirst, isLast }: TimelineItemProps) {
  const config = EVENT_CONFIG[event.eventType];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="relative flex gap-4 ml-0">
      {/* Icon */}
      <div
        className={`
          relative z-10 flex items-center justify-center w-8 h-8 rounded-full
          ${config.bgColor} ${config.textColor}
          ${isFuture ? 'ring-2 ring-blue-300 ring-offset-2' : ''}
        `}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div
        className={`
          flex-1 pb-4 ${isLast ? '' : 'border-b border-gray-100'}
          ${isFuture ? 'opacity-90' : ''}
        `}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">{event.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{formatDate(event.eventDate)}</p>
          </div>
          {isFuture && (
            <Badge variant="info" size="sm">Scheduled</Badge>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-600">{event.description}</p>

        {/* Event-specific details */}
        {event.eventType === 'salary' && event.details && (
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            {event.details.oldAmount != null && (
              <span className="line-through">${Number(event.details.oldAmount as number).toLocaleString()}</span>
            )}
            {event.details.newAmount != null && (
              <span className="text-green-600 font-medium">
                → ${Number(event.details.newAmount as number).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {event.eventType === 'equity_grant' && event.details && (
          <div className="mt-2 text-xs text-gray-500">
            {event.details.shares != null && (
              <span>{Number(event.details.shares as number).toLocaleString()} shares</span>
            )}
            {event.details.exercisePrice != null && (
              <span className="ml-2">@ ${String(event.details.exercisePrice)}</span>
            )}
          </div>
        )}

        {event.eventType === 'vesting' && event.details ? (
          <div className="mt-2 text-xs text-green-600 font-medium">
            {Number((event.details as Record<string, number>).shares || 0).toLocaleString()} shares vesting
          </div>
        ) : null}

        {event.eventType === 'equipment' && event.details ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {((event.details as Record<string, unknown>).items as string[] || []).map((item, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Timeline;
