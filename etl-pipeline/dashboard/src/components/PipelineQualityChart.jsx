import React, { useState } from 'react';
import { Card, Text, Flex, Badge, Select, SelectItem } from '@tremor/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ChartBarIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import MetricInfo from './MetricInfo';

// Color constants matching Octup UI
const COLORS = {
  total: '#809292',      // Primary Gray
  weighted: '#00CBC0',   // Teal
  committed: '#FF3489',  // Pink
};

/**
 * Custom Tooltip for the chart
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 min-w-[180px]">
      <Text className="font-semibold text-gray-900 mb-2">{label}</Text>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <Flex key={index} justifyContent="between" className="text-sm">
            <Flex alignItems="center" className="gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <Text className="text-gray-600">{entry.name}</Text>
            </Flex>
            <Text className="font-mono font-medium text-gray-900">
              {formatCurrency(entry.value)}
            </Text>
          </Flex>
        ))}
      </div>
    </div>
  );
};

/**
 * Status Badge Component
 */
const StatusBadge = ({ status, stalledPct }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'GREEN':
        return {
          color: 'emerald',
          icon: ArrowTrendingUpIcon,
          label: 'Improving',
          description: 'Weighted pipeline up, stalled deals down',
        };
      case 'YELLOW':
        return {
          color: 'amber',
          icon: MinusIcon,
          label: 'Stable',
          description: 'Pipeline metrics flat week-over-week',
        };
      case 'RED':
      default:
        return {
          color: 'red',
          icon: ArrowTrendingDownIcon,
          label: 'Declining',
          description: 'Pipeline down or stalled deals increasing',
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge icon={StatusIcon} color={config.color} size="sm">
        {config.label}
      </Badge>
      <MetricInfo
        title="Pipeline Health Status"
        description={`${config.description}. Stalled deals: ${stalledPct?.toFixed(1) || 0}%`}
      />
    </div>
  );
};

/**
 * PipelineQualityChart Component
 * Multi-line area chart showing Total, Weighted, and Committed pipeline over time
 */
const PipelineQualityChart = ({ data }) => {
  const [timeRange, setTimeRange] = useState('30');

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-xl">
        <div className="flex items-center justify-center h-64 text-gray-400">
          <ChartBarIcon className="h-8 w-8 mr-2" />
          <span>Loading pipeline quality data...</span>
        </div>
      </Card>
    );
  }

  // Filter data based on selected time range
  const filteredData = data.slice(0, parseInt(timeRange)).reverse();

  // Get latest status badge
  const latestData = data[0] || {};
  const { status_badge, stalled_pct } = latestData;

  // Format date for x-axis
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format currency for y-axis
  const formatYAxis = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  // Prepare chart data
  const chartData = filteredData.map(item => ({
    date: formatDate(item.snapshot_date),
    'Total Pipeline': item.gross_pipeline || 0,
    'Weighted Pipeline': item.weighted_pipeline || 0,
    'Committed Pipeline': item.committed_pipeline || 0,
    stalled_count: item.stalled_count || 0,
    total_deals: item.total_deals || 0,
  }));

  // Calculate summary metrics
  const latestTotal = data[0]?.gross_pipeline || 0;
  const latestWeighted = data[0]?.weighted_pipeline || 0;
  const latestCommitted = data[0]?.committed_pipeline || 0;
  const dayOverDayChange = data[0]?.day_over_day_change || 0;

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-xl">
      {/* Header */}
      <Flex justifyContent="between" alignItems="start" className="mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/60 rounded-xl">
            <ChartBarIcon className="h-5 w-5 text-[#809292]" />
          </div>
          <div>
            <Text className="font-semibold text-gray-900">Pipeline Quality Trend</Text>
            <Text className="text-xs text-gray-500">
              Total, Weighted & Committed pipeline over time
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status_badge} stalledPct={stalled_pct} />
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
            className="w-28"
          >
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
          </Select>
        </div>
      </Flex>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/60 rounded-xl p-3">
          <Flex alignItems="center" className="gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.total }} />
            <Text className="text-xs text-gray-500">Total Pipeline</Text>
          </Flex>
          <Text className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
            {formatCurrency(latestTotal)}
          </Text>
        </div>
        <div className="bg-white/60 rounded-xl p-3">
          <Flex alignItems="center" className="gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.weighted }} />
            <Text className="text-xs text-gray-500">Weighted Pipeline</Text>
          </Flex>
          <Text className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
            {formatCurrency(latestWeighted)}
          </Text>
          <Flex alignItems="center" className="gap-1">
            {dayOverDayChange >= 0 ? (
              <ArrowTrendingUpIcon className="h-3 w-3 text-emerald-500" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3 text-pink-500" />
            )}
            <Text className={`text-xs font-mono ${dayOverDayChange >= 0 ? 'text-emerald-600' : 'text-pink-600'}`}>
              {dayOverDayChange >= 0 ? '+' : ''}{formatCurrency(dayOverDayChange)}
            </Text>
          </Flex>
        </div>
        <div className="bg-white/60 rounded-xl p-3">
          <Flex alignItems="center" className="gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.committed }} />
            <Text className="text-xs text-gray-500">Committed (No Stalled)</Text>
          </Flex>
          <Text className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
            {formatCurrency(latestCommitted)}
          </Text>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.total} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.total} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorWeighted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.weighted} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.weighted} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCommitted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.committed} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.committed} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={formatYAxis}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Area
              type="monotone"
              dataKey="Total Pipeline"
              stroke={COLORS.total}
              strokeWidth={2}
              fill="url(#colorTotal)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="Weighted Pipeline"
              stroke={COLORS.weighted}
              strokeWidth={2}
              fill="url(#colorWeighted)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="Committed Pipeline"
              stroke={COLORS.committed}
              strokeWidth={2}
              fill="url(#colorCommitted)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-200/50">
        <Flex justifyContent="between" alignItems="center">
          <Text className="text-xs text-gray-500">
            <InformationCircleIcon className="h-3 w-3 inline mr-1" />
            Committed = Weighted pipeline excluding Stalled/Delayed deals
          </Text>
          <Text className="text-xs text-gray-500 font-mono">
            {latestData.stalled_count || 0} stalled ({stalled_pct?.toFixed(1) || 0}%)
          </Text>
        </Flex>
      </div>
    </Card>
  );
};

export default PipelineQualityChart;
