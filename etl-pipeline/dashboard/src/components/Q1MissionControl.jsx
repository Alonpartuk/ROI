import React from 'react';
import { Card, Text, Flex, Badge, Grid } from '@tremor/react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import MetricInfo from './MetricInfo';

/**
 * Circular Progress Gauge Component
 */
const ProgressGauge = ({ progress, status }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = 40;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const getStrokeColor = () => {
    switch (status) {
      case 'ON_TRACK': return '#10B981';
      case 'AT_RISK': return '#F59E0B';
      default: return '#FF3489';
    }
  };

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={getStrokeColor()} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900 font-mono">{clampedProgress.toFixed(0)}%</span>
        <span className="text-[10px] text-gray-500">complete</span>
      </div>
    </div>
  );
};

/**
 * Q1 Mission Control - Merged Pace + Forecast Component
 * Single source of truth for Q1 target tracking
 */
const Q1MissionControl = ({ paceData, forecastData }) => {
  if (!paceData && !forecastData) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-xl">
        <div className="flex items-center justify-center h-48 text-gray-400">
          <ClockIcon className="h-8 w-8 mr-2" />
          <span>Loading Q1 data...</span>
        </div>
      </Card>
    );
  }

  // Extract pace metrics
  const {
    qtd_won_value = 0,
    quarterly_target = 1600000,
    remaining_to_target = 1600000,
    current_pace_monthly = 0,
    required_pace_monthly = 0,
    pace_delta_monthly = 0,
    progress_pct = 0,
    time_elapsed_pct = 0,
    days_elapsed = 0,
    days_remaining = 0,
    deals_still_needed = 0,
    pace_status = 'BEHIND',
    starting_arr = 0,
    qtd_won_count = 0,
  } = paceData || {};

  // Extract forecast metrics
  const {
    forecasted_revenue = 0,
    optimistic_revenue = 0,
    pessimistic_revenue = 0,
    confidence_score = 0,
    total_pipeline_value = 0,
    total_weighted_value = 0,
  } = forecastData || {};

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${Math.round(value).toLocaleString()}`;
  };

  // Status configuration
  const statusConfig = {
    ON_TRACK: { bg: 'bg-emerald-50/80', border: 'border-emerald-200', color: 'emerald', icon: CheckCircleIcon, label: 'On Track' },
    AT_RISK: { bg: 'bg-amber-50/80', border: 'border-amber-200', color: 'amber', icon: ExclamationTriangleIcon, label: 'At Risk' },
    BEHIND: { bg: 'bg-pink-50/80', border: 'border-pink-200', color: 'pink', icon: ArrowTrendingDownIcon, label: 'Behind Pace' },
  };
  const config = statusConfig[pace_status] || statusConfig.BEHIND;
  const StatusIcon = config.icon;

  // Calculate remaining gap
  const currentRemaining = Math.max(remaining_to_target - qtd_won_value, 0);

  return (
    <Card className={`${config.bg} backdrop-blur-2xl rounded-3xl border ${config.border} shadow-xl overflow-hidden`}>
      {/* Header */}
      <Flex justifyContent="between" alignItems="center" className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/70 rounded-xl shadow-sm">
            <RocketLaunchIcon className="h-6 w-6 text-[#00CBC0]" />
          </div>
          <div>
            <Text className="text-xl font-bold text-gray-900">Q1 Mission Control</Text>
            <Text className="text-sm text-gray-500">
              Day {days_elapsed} • {days_remaining} days remaining
            </Text>
          </div>
        </div>
        <Badge icon={StatusIcon} color={config.color} size="xl">
          {config.label}
        </Badge>
      </Flex>

      {/* Main Grid - 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: Goal Progress */}
        <div className="bg-white/70 rounded-2xl p-5 shadow-sm">
          <Flex justifyContent="between" alignItems="start" className="mb-4">
            <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Goal Progress</Text>
            <MetricInfo id="Q1 Goal Progress" />
          </Flex>

          <div className="flex items-center justify-between mb-4">
            <ProgressGauge progress={progress_pct} status={pace_status} />
            <div className="text-right">
              <Text className="text-3xl font-bold text-gray-900 font-mono">{formatCurrency(qtd_won_value)}</Text>
              <Text className="text-xs text-gray-500">of {formatCurrency(quarterly_target)}</Text>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative mt-4">
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00CBC0] to-[#00b3a8] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(progress_pct, 100)}%` }}
              />
            </div>
            {/* Time marker */}
            <div
              className="absolute top-0 h-2.5 w-0.5 bg-gray-600"
              style={{ left: `${Math.min(time_elapsed_pct, 100)}%` }}
              title={`${time_elapsed_pct.toFixed(0)}% of Q1 elapsed`}
            />
          </div>
          <Flex justifyContent="between" className="mt-2">
            <Text className="text-xs text-gray-500">{progress_pct.toFixed(1)}% closed</Text>
            <Text className="text-xs text-gray-500">{time_elapsed_pct.toFixed(0)}% time</Text>
          </Flex>
        </div>

        {/* Column 2: Pace Metrics */}
        <div className="bg-white/70 rounded-2xl p-5 shadow-sm">
          <Flex justifyContent="between" alignItems="start" className="mb-4">
            <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Monthly Pace</Text>
            <MetricInfo id="Monthly Pace" />
          </Flex>

          <div className="space-y-3">
            {/* Current Pace */}
            <div className="flex justify-between items-center">
              <Text className="text-sm text-gray-600">Current</Text>
              <Text className="text-lg font-bold text-gray-900 font-mono">{formatCurrency(current_pace_monthly)}/mo</Text>
            </div>

            {/* Required Pace */}
            <div className="flex justify-between items-center">
              <Text className="text-sm text-gray-600">Required</Text>
              <Text className="text-lg font-bold text-gray-900 font-mono">{formatCurrency(required_pace_monthly)}/mo</Text>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Gap */}
            <div className={`flex justify-between items-center p-3 rounded-xl ${pace_delta_monthly >= 0 ? 'bg-emerald-100/60' : 'bg-pink-100/60'}`}>
              <Flex alignItems="center" className="gap-2">
                {pace_delta_monthly >= 0 ? (
                  <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
                ) : (
                  <ArrowTrendingDownIcon className="h-5 w-5 text-pink-600" />
                )}
                <Text className="text-sm font-medium text-gray-700">Gap</Text>
              </Flex>
              <Text className={`text-xl font-bold font-mono ${pace_delta_monthly >= 0 ? 'text-emerald-700' : 'text-pink-700'}`}>
                {pace_delta_monthly >= 0 ? '+' : ''}{formatCurrency(pace_delta_monthly)}
              </Text>
            </div>

            {/* Deals Needed */}
            <div className="flex justify-between items-center pt-2">
              <Text className="text-sm text-gray-600">Deals Needed</Text>
              <div className="text-right">
                <Text className="text-lg font-bold text-gray-900 font-mono">{deals_still_needed}</Text>
                <Text className="text-xs text-gray-400">@ $40K ACV</Text>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: AI Forecast */}
        <div className="bg-white/70 rounded-2xl p-5 shadow-sm">
          <Flex justifyContent="between" alignItems="start" className="mb-4">
            <Flex alignItems="center" className="gap-1">
              <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold">AI Forecast</Text>
              <MetricInfo id="AI Forecast" />
            </Flex>
            {confidence_score > 0 && (
              <Badge color="gray" size="sm">{confidence_score}% conf</Badge>
            )}
          </Flex>

          {/* 3-Scenario Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-3 rounded-xl bg-red-50/80">
              <Text className="text-[10px] text-red-500 font-semibold uppercase">Low</Text>
              <Text className="text-sm font-bold text-red-600 font-mono mt-1">
                {pessimistic_revenue > 0 ? formatCurrency(pessimistic_revenue) : '-'}
              </Text>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50 ring-2 ring-blue-200">
              <Text className="text-[10px] text-blue-500 font-semibold uppercase">Expected</Text>
              <Text className="text-sm font-bold text-blue-600 font-mono mt-1">
                {forecasted_revenue > 0 ? formatCurrency(forecasted_revenue) : '-'}
              </Text>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-50/80">
              <Text className="text-[10px] text-emerald-500 font-semibold uppercase">High</Text>
              <Text className="text-sm font-bold text-emerald-600 font-mono mt-1">
                {optimistic_revenue > 0 ? formatCurrency(optimistic_revenue) : '-'}
              </Text>
            </div>
          </div>

          {/* Pipeline Context */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between">
              <Text className="text-xs text-gray-500">Pipeline</Text>
              <Text className="text-sm font-semibold text-gray-700 font-mono">{formatCurrency(total_pipeline_value)}</Text>
            </div>
            <div className="flex justify-between">
              <Text className="text-xs text-gray-500">Weighted</Text>
              <Text className="text-sm font-semibold text-gray-700 font-mono">{formatCurrency(total_weighted_value)}</Text>
            </div>
            <div className="flex justify-between">
              <Text className="text-xs text-gray-500">Still Needed</Text>
              <Text className="text-sm font-bold text-[#FF3489] font-mono">{formatCurrency(currentRemaining)}</Text>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Q1MissionControl;
