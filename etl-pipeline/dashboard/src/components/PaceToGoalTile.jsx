import React from 'react';
import { Card, Text, Flex, Badge } from '@tremor/react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import MetricInfo from './MetricInfo';

/**
 * Circular Progress Gauge Component
 * Shows QTD progress toward quarterly target
 */
const ProgressGauge = ({ progress, status }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = 45;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  // Color based on status
  const getStrokeColor = () => {
    switch (status) {
      case 'ON_TRACK':
        return '#10B981'; // green
      case 'AT_RISK':
        return '#F59E0B'; // amber
      case 'BEHIND':
      default:
        return '#FF3489'; // pink
    }
  };

  return (
    <div className="relative w-28 h-28 sm:w-32 sm:h-32">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono">
          {clampedProgress.toFixed(0)}%
        </span>
        <span className="text-xs text-gray-500">of target</span>
      </div>
    </div>
  );
};

/**
 * PaceToGoalTile Component
 * High-impact component showing pace metrics toward $1.6M Q1 target
 */
const PaceToGoalTile = ({ data }) => {
  if (!data) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-xl">
        <div className="flex items-center justify-center h-48 text-gray-400">
          <ClockIcon className="h-8 w-8 mr-2" />
          <span>Loading pace data...</span>
        </div>
      </Card>
    );
  }

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
  } = data;

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Status configuration
  const statusConfig = {
    ON_TRACK: {
      bgColor: 'bg-emerald-50/50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-800',
      icon: CheckCircleIcon,
      label: 'On Track',
    },
    AT_RISK: {
      bgColor: 'bg-amber-50/50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      icon: ExclamationTriangleIcon,
      label: 'At Risk',
    },
    BEHIND: {
      bgColor: 'bg-pink-50/50',
      borderColor: 'border-pink-200',
      textColor: 'text-pink-800',
      icon: ArrowTrendingDownIcon,
      label: 'Behind Pace',
    },
  };

  const config = statusConfig[pace_status] || statusConfig.BEHIND;
  const StatusIcon = config.icon;

  return (
    <Card className={`${config.bgColor} backdrop-blur-2xl rounded-3xl border ${config.borderColor} shadow-xl overflow-hidden`}>
      {/* Header */}
      <Flex justifyContent="between" alignItems="start" className="mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/60 rounded-xl">
            <ArrowTrendingUpIcon className="h-5 w-5 text-[#00CBC0]" />
          </div>
          <div>
            <Text className="font-semibold text-gray-900">Q1 Pace to Goal</Text>
            <Text className="text-xs text-gray-500">
              Day {days_elapsed} of Q1 • {days_remaining} days left
            </Text>
          </div>
        </div>
        <Badge
          icon={StatusIcon}
          color={pace_status === 'ON_TRACK' ? 'emerald' : pace_status === 'AT_RISK' ? 'amber' : 'pink'}
          size="lg"
        >
          {config.label}
        </Badge>
      </Flex>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pace Metrics */}
        <div className="lg:col-span-2 space-y-4">
          {/* Current vs Required Pace */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Pace */}
            <div className="bg-white/60 rounded-2xl p-4">
              <Flex justifyContent="between" alignItems="start">
                <Text className="text-xs text-gray-500 uppercase tracking-wide">Current Pace</Text>
                <MetricInfo
                  title="Current Monthly Pace"
                  description="QTD Won Value ÷ Days Elapsed × 30. Your actual monthly run rate based on closed deals."
                />
              </Flex>
              <Text className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono mt-1">
                {formatCurrency(current_pace_monthly)}
              </Text>
              <Text className="text-xs text-gray-500">/month</Text>
            </div>

            {/* Required Pace */}
            <div className="bg-white/60 rounded-2xl p-4">
              <Flex justifyContent="between" alignItems="start">
                <Text className="text-xs text-gray-500 uppercase tracking-wide">Required Pace</Text>
                <MetricInfo
                  title="Required Monthly Pace"
                  description="Remaining Gap ÷ Days Remaining × 30. The pace needed to hit target by quarter end."
                />
              </Flex>
              <Text className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono mt-1">
                {formatCurrency(required_pace_monthly)}
              </Text>
              <Text className="text-xs text-gray-500">/month</Text>
            </div>
          </div>

          {/* Delta */}
          <div className={`rounded-2xl p-4 ${pace_delta_monthly >= 0 ? 'bg-emerald-100/60' : 'bg-pink-100/60'}`}>
            <Flex justifyContent="between" alignItems="center">
              <div>
                <Text className="text-xs text-gray-600 uppercase tracking-wide">Pace Gap</Text>
                <Flex alignItems="center" className="gap-2 mt-1">
                  {pace_delta_monthly >= 0 ? (
                    <ArrowTrendingUpIcon className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-6 w-6 text-pink-600" />
                  )}
                  <Text className={`text-3xl sm:text-4xl font-bold font-mono ${pace_delta_monthly >= 0 ? 'text-emerald-700' : 'text-pink-700'}`}>
                    {pace_delta_monthly >= 0 ? '+' : ''}{formatCurrency(pace_delta_monthly)}
                  </Text>
                </Flex>
                <Text className="text-xs text-gray-500 mt-1">
                  {pace_delta_monthly >= 0
                    ? 'Ahead of required pace'
                    : `Need ${formatCurrency(Math.abs(pace_delta_monthly))} more per month`}
                </Text>
              </div>
              <div className="text-right">
                <Text className="text-xs text-gray-500">Deals Needed</Text>
                <Text className="text-2xl font-bold text-gray-900 font-mono">{deals_still_needed}</Text>
                <Text className="text-xs text-gray-500">@ $40K ACV</Text>
              </div>
            </Flex>
          </div>

          {/* Progress Bar */}
          <div className="bg-white/60 rounded-2xl p-4">
            <Flex justifyContent="between" className="mb-2">
              <Text className="text-xs text-gray-500">QTD Won: {formatCurrency(qtd_won_value)}</Text>
              <Text className="text-xs text-gray-500">Target: {formatCurrency(remaining_to_target)}</Text>
            </Flex>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00CBC0] to-[#00b3a8] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(progress_pct, 100)}%` }}
              />
            </div>
            <Flex justifyContent="between" className="mt-2">
              <Text className="text-xs text-gray-500">{progress_pct.toFixed(1)}% closed</Text>
              <Text className="text-xs text-gray-500">{time_elapsed_pct.toFixed(0)}% of Q1 elapsed</Text>
            </Flex>
          </div>
        </div>

        {/* Right: Progress Gauge */}
        <div className="flex flex-col items-center justify-center bg-white/60 rounded-2xl p-4">
          <ProgressGauge progress={progress_pct} status={pace_status} />
          <div className="mt-4 text-center">
            <Text className="text-2xl font-bold text-gray-900 font-mono">
              {formatCurrency(qtd_won_value)}
            </Text>
            <Text className="text-xs text-gray-500">
              of {formatCurrency(remaining_to_target)} needed
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PaceToGoalTile;
