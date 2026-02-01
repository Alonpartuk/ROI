import React, { useMemo } from 'react';
import {
  Card,
  Title,
  Text,
  Metric,
  Grid,
  DonutChart,
  BarChart,
  Flex,
  Badge,
  ProgressBar,
} from '@tremor/react';
import { TrophyIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { formatCurrency, formatPercent } from '../services/api';
import { MetricInfoIcon } from './MetricTooltip';

/**
 * WinRateAnalysis Component
 * Displays win/loss analysis by rep
 * Source: v_win_rate_analysis
 */
const WinRateAnalysis = ({ data, selectedOwner }) => {
  // Process data for display
  const { totals, chartData, donutData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { totals: null, chartData: [], donutData: [] };
    }

    // Calculate team totals
    const totalWon = data.reduce((sum, d) => sum + d.won_count, 0);
    const totalLost = data.reduce((sum, d) => sum + d.lost_count, 0);
    const totalClosed = data.reduce((sum, d) => sum + d.closed_count, 0);
    const totalWonValue = data.reduce((sum, d) => sum + d.won_value, 0);
    const totalLostValue = data.reduce((sum, d) => sum + d.lost_value, 0);
    const avgWinRate = totalClosed > 0 ? (totalWon / totalClosed) * 100 : 0;

    // Prepare bar chart data
    const chart = data.map(d => ({
      name: d.owner_name,
      'Win Rate %': d.win_rate_pct,
      'Won Deals': d.won_count,
      'Lost Deals': d.lost_count,
    })).sort((a, b) => b['Win Rate %'] - a['Win Rate %']);

    // Prepare donut chart data
    const donut = [
      { name: 'Won', value: totalWon, color: 'emerald' },
      { name: 'Lost', value: totalLost, color: 'red' },
    ];

    return {
      totals: {
        wonCount: totalWon,
        lostCount: totalLost,
        closedCount: totalClosed,
        wonValue: totalWonValue,
        lostValue: totalLostValue,
        winRate: avgWinRate,
      },
      chartData: chart,
      donutData: donut,
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <Flex alignItems="center" className="gap-2">
          <TrophyIcon className="h-5 w-5 text-gray-500" />
          <Title>Win Rate Analysis</Title>
          <MetricInfoIcon metricKey="Win Rate Analysis" size="sm" />
        </Flex>
        <Text className="text-gray-500 mt-2">No win rate data available</Text>
      </Card>
    );
  }

  // Single rep view
  const singleRep = selectedOwner && selectedOwner !== 'all' ? data[0] : null;

  return (
    <Card>
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Flex alignItems="center" className="gap-2">
            <TrophyIcon className="h-5 w-5 text-emerald-500" />
            <Title>Win Rate Analysis</Title>
            <MetricInfoIcon metricKey="Win Rate Analysis" size="sm" />
          </Flex>
          <Text className="mt-1">Deal outcomes and conversion rates</Text>
        </div>
        <Badge color={totals.winRate >= 30 ? 'emerald' : totals.winRate >= 20 ? 'amber' : 'red'} size="lg">
          {formatPercent(totals.winRate)} Win Rate
        </Badge>
      </Flex>

      {singleRep ? (
        // Single Rep View
        <>
          <Grid numItemsSm={2} numItemsLg={3} className="gap-4 mt-6">
            <Card decoration="top" decorationColor="emerald">
              <Text>Deals Won</Text>
              <Metric className="text-emerald-600 tabular-nums">{singleRep.won_count}</Metric>
              <Text className="text-sm text-gray-500 tabular-nums">{formatCurrency(singleRep.won_value)} value</Text>
            </Card>
            <Card decoration="top" decorationColor="red">
              <Text>Deals Lost</Text>
              <Metric className="text-red-600 tabular-nums">{singleRep.lost_count}</Metric>
              <Text className="text-sm text-gray-500 tabular-nums">{formatCurrency(singleRep.lost_value)} value</Text>
            </Card>
            <Card decoration="top" decorationColor="blue">
              <Text>Win Rate</Text>
              <Metric className="text-blue-600 tabular-nums">{formatPercent(singleRep.win_rate_pct)}</Metric>
              <Text className="text-sm text-gray-500 tabular-nums">{singleRep.closed_count} total closed</Text>
            </Card>
          </Grid>

          {/* Win Rate Progress */}
          <div className="mt-6">
            <Flex justifyContent="between" className="mb-2">
              <Text>Win vs Loss Rate</Text>
              <Text className="font-medium tabular-nums">{singleRep.won_count}W / {singleRep.lost_count}L</Text>
            </Flex>
            <ProgressBar
              value={singleRep.win_rate_pct}
              color={singleRep.win_rate_pct >= 30 ? 'emerald' : singleRep.win_rate_pct >= 20 ? 'amber' : 'red'}
            />
          </div>

          {/* Deal Size Comparison */}
          <Grid numItemsSm={2} className="gap-4 mt-6">
            <div className="p-4 bg-emerald-50 rounded-lg">
              <Text className="text-emerald-800">Avg Won Deal Size</Text>
              <Metric className="text-emerald-600 tabular-nums">{formatCurrency(singleRep.avg_won_deal_size)}</Metric>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <Text className="text-red-800">Avg Lost Deal Size</Text>
              <Metric className="text-red-600 tabular-nums">{formatCurrency(singleRep.avg_lost_deal_size)}</Metric>
            </div>
          </Grid>
        </>
      ) : (
        // Team View
        <>
          <Flex className="gap-6 mt-6">
            {/* Donut Chart */}
            <div className="flex-1">
              <DonutChart
                className="h-48"
                data={donutData}
                category="value"
                index="name"
                colors={['emerald', 'red']}
                label={`${totals.wonCount}W / ${totals.lostCount}L`}
              />
            </div>

            {/* Summary Stats */}
            <div className="flex-1 space-y-4">
              <div>
                <Text className="text-gray-500">Total Won</Text>
                <Flex alignItems="baseline" className="gap-2">
                  <Text className="text-2xl font-bold text-emerald-600 tabular-nums">{totals.wonCount}</Text>
                  <Text className="text-gray-500 tabular-nums">({formatCurrency(totals.wonValue)})</Text>
                </Flex>
              </div>
              <div>
                <Text className="text-gray-500">Total Lost</Text>
                <Flex alignItems="baseline" className="gap-2">
                  <Text className="text-2xl font-bold text-red-600 tabular-nums">{totals.lostCount}</Text>
                  <Text className="text-gray-500 tabular-nums">({formatCurrency(totals.lostValue)})</Text>
                </Flex>
              </div>
              <div>
                <Text className="text-gray-500">Team Win Rate</Text>
                <Text className="text-2xl font-bold tabular-nums">{formatPercent(totals.winRate)}</Text>
              </div>
            </div>
          </Flex>

          {/* Win Rate by Rep */}
          <BarChart
            className="mt-6 h-64"
            data={chartData}
            index="name"
            categories={['Win Rate %']}
            colors={['emerald']}
            valueFormatter={(value) => `${value.toFixed(1)}%`}
            yAxisWidth={48}
          />
        </>
      )}
    </Card>
  );
};

export default WinRateAnalysis;
