import React, { useState } from 'react';
import {
  Card,
  Title,
  Text,
  AreaChart,
  Flex,
  Badge,
  Metric,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from '@tremor/react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  XMarkIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import MetricInfo from './MetricInfo';

/**
 * Pipeline Trend Chart Component
 * Shows pipeline value changes over time with day-over-day metrics
 */
const PipelineTrendChart = ({ data, periodWonDeals: wonDealsData }) => {
  const [showWonDealsModal, setShowWonDealsModal] = useState(false);

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white">
        <div className="flex items-center gap-2 mb-4">
          <ChartBarIcon className="h-5 w-5 text-blue-500" />
          <Title>Pipeline Trend</Title>
          <MetricInfo id="Pipeline Trend" />
        </div>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <Text>No trend data available</Text>
          </div>
        </div>
      </Card>
    );
  }

  // Helper to parse date (handles BigQuery date objects and strings)
  const parseDate = (dateVal) => {
    if (!dateVal) return null;
    // Handle BigQuery date object with .value property
    const dateStr = dateVal?.value || dateVal;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Sort by date ascending for chart
  const sortedData = [...data].sort((a, b) => {
    const dateA = parseDate(a.snapshot_date);
    const dateB = parseDate(b.snapshot_date);
    if (!dateA || !dateB) return 0;
    return dateA - dateB;
  });

  // Format data for chart (filter out invalid dates)
  const chartData = sortedData
    .filter(item => parseDate(item.snapshot_date) !== null)
    .map(item => ({
      date: parseDate(item.snapshot_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      'Pipeline Value': item.open_pipeline_value || 0,
      'Weighted Value': item.weighted_pipeline_value || 0,
      'Won Value': item.won_value || 0,
    }));

  // Get latest and oldest snapshots for period calculations
  const latest = data[0]; // Most recent (sorted DESC from API)
  const oldest = data[data.length - 1]; // Oldest in the 30-day window

  // Use period-specific metrics from backend (based on actual closedate within 30 days)
  // Falls back to delta calculation if period fields not available
  const periodWonDealsCount = latest?.period_won_deals ?? ((latest?.won_deals || 0) - (oldest?.won_deals || 0));
  const periodWonValue = latest?.period_won_value ?? ((latest?.won_value || 0) - (oldest?.won_value || 0));
  const periodPipelineChange = (latest?.open_pipeline_value || 0) - (oldest?.open_pipeline_value || 0);

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value?.toLocaleString() || 0}`;
  };

  // Use period change for display (30-day delta, not day-over-day)
  const isPositive = periodPipelineChange >= 0;

  // Won Deals Modal
  const WonDealsModal = () => {
    if (!showWonDealsModal) return null;

    const deals = wonDealsData || [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrophyIcon className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Won Deals This Quarter</h2>
                <p className="text-amber-100 text-sm">
                  {deals.length} deals · {formatCurrency(deals.reduce((sum, d) => sum + (d.arr_value || 0), 0))} total
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWonDealsModal(false)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {deals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TrophyIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No won deals this quarter yet</p>
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Deal Name</TableHeaderCell>
                    <TableHeaderCell>Sales Rep</TableHeaderCell>
                    <TableHeaderCell className="text-right">Deal Size</TableHeaderCell>
                    <TableHeaderCell className="text-right">Close Date</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deals.map((deal, idx) => (
                    <TableRow key={deal.deal_id || idx}>
                      <TableCell>
                        <span className="font-medium text-gray-900">{deal.dealname}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{deal.owner}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(deal.arr_value)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-gray-500 text-sm">
                          {deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex justify-end">
            <button
              onClick={() => setShowWonDealsModal(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-white">
      <Flex justifyContent="between" alignItems="start" className="mb-4">
        <div className="flex items-start gap-2">
          <ChartBarIcon className="h-5 w-5 text-blue-500 mt-1" />
          <div>
            <div className="flex items-center gap-2">
              <Title>Pipeline Trend</Title>
              <MetricInfo id="Pipeline Trend" />
            </div>
            <Text className="text-gray-500">Last 30 days</Text>
          </div>
        </div>
        <Flex justifyContent="end" className="space-x-2">
          {isPositive ? (
            <Badge color="emerald" icon={ArrowTrendingUpIcon}>
              +{formatCurrency(periodPipelineChange)}
            </Badge>
          ) : (
            <Badge color="rose" icon={ArrowTrendingDownIcon}>
              {formatCurrency(periodPipelineChange)}
            </Badge>
          )}
        </Flex>
      </Flex>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-3">
          <Text className="text-blue-600 text-xs font-medium">Open Pipeline</Text>
          <Metric className="text-blue-700">{formatCurrency(latest?.open_pipeline_value)}</Metric>
          <Text className="text-blue-500 text-xs">{latest?.open_deals || 0} deals</Text>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <Text className="text-emerald-600 text-xs font-medium">Weighted Value</Text>
          <Metric className="text-emerald-700">{formatCurrency(latest?.weighted_pipeline_value)}</Metric>
          <Text className="text-emerald-500 text-xs">Probability adjusted</Text>
        </div>
        {/* Clickable Won This Period */}
        <div
          className="bg-amber-50 rounded-lg p-3 cursor-pointer hover:bg-amber-100 transition-colors border-2 border-transparent hover:border-amber-300"
          onClick={() => setShowWonDealsModal(true)}
          title="Click to see won deals"
        >
          <Text className="text-amber-600 text-xs font-medium">Won This Period</Text>
          <Metric className="text-amber-700">{formatCurrency(periodWonValue)}</Metric>
          <Text className="text-amber-500 text-xs">
            {periodWonDealsCount} closed · <span className="underline">View details</span>
          </Text>
        </div>
      </div>

      {/* Area Chart */}
      <AreaChart
        className="h-64 mt-4"
        data={chartData}
        index="date"
        categories={['Pipeline Value', 'Weighted Value']}
        colors={['blue', 'emerald']}
        valueFormatter={(value) => formatCurrency(value)}
        showLegend={true}
        showGridLines={false}
        curveType="monotone"
      />

      {/* Period Change Summary */}
      {oldest && parseDate(oldest.snapshot_date) && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Flex justifyContent="between">
            <Text className="text-gray-500 text-sm">
              vs. {parseDate(oldest.snapshot_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </Text>
            <Flex justifyContent="end" className="space-x-4">
              <Text className={`text-sm ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPositive ? '+' : ''}{formatCurrency(periodPipelineChange)} pipeline
              </Text>
              <Text className="text-gray-400">|</Text>
              <Text className={`text-sm ${periodWonDealsCount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                +{periodWonDealsCount} won deals
              </Text>
            </Flex>
          </Flex>
        </div>
      )}

      {/* Won Deals Modal */}
      <WonDealsModal />
    </Card>
  );
};

export default PipelineTrendChart;
