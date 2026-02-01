import React from 'react';

/**
 * Skeleton Loader Components
 * Provides loading states for various dashboard components
 */

// Basic skeleton pulse animation
const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// Card skeleton
export const CardSkeleton = ({ height = 'h-48' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-6 ${height}`}>
    <div className="animate-pulse space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  </div>
);

// KPI Card skeleton
export const KPICardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-32" />
      <div className="h-3 bg-gray-200 rounded w-20" />
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="animate-pulse space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="h-5 bg-gray-200 rounded w-40" />
      </div>

      {/* Table Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="h-4 bg-gray-200 rounded" />
        ))}
      </div>

      {/* Table Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={`row-${rowIdx}`}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div key={`cell-${rowIdx}-${colIdx}`} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Chart skeleton
export const ChartSkeleton = ({ height = 'h-64' }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="animate-pulse space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>
      </div>

      {/* Chart Area */}
      <div className={`${height} bg-gray-100 rounded-lg flex items-end justify-around px-4 pb-4`}>
        {/* Fake bar chart */}
        {[40, 70, 55, 85, 60, 75, 45].map((h, i) => (
          <div
            key={i}
            className="w-8 bg-gray-200 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-200 rounded-full" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-200 rounded-full" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  </div>
);

// Metric card row skeleton (for KPI section)
export const KPIRowSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <KPICardSkeleton key={i} />
    ))}
  </div>
);

// Full dashboard skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-8">
    {/* KPIs */}
    <KPIRowSkeleton />

    {/* AI Summary */}
    <CardSkeleton height="h-32" />

    {/* Charts Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    {/* Table */}
    <TableSkeleton rows={5} columns={6} />
  </div>
);

// Leaderboard skeleton
export const LeaderboardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="animate-pulse space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="h-5 bg-gray-200 rounded w-32" />
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-20" />
      </div>

      {/* Leaderboard Items */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Timeline skeleton
export const TimelineSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-start space-x-4">
        <div className="w-4 h-4 bg-gray-200 rounded-full mt-1" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>
      </div>
    ))}
  </div>
);

export default {
  CardSkeleton,
  KPICardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  KPIRowSkeleton,
  DashboardSkeleton,
  LeaderboardSkeleton,
  TimelineSkeleton,
};
