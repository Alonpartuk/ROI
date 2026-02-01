import React, { useMemo, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Metric,
  Grid,
  BarChart,
  Flex,
  Badge,
  ProgressBar,
  NumberInput,
} from '@tremor/react';
import {
  Zap,
  Calculator,
  TrendingUp,
  TrendingDown,
  Info,
  Target,
  Clock,
  Award,
  Gauge,
  Sliders,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../services/api';
import MetricInfo from './MetricInfo';

/**
 * SalesVelocity Component - Command Center Edition
 * Displays sales velocity metrics with interactive what-if analysis
 * Formula: V = (n × L × W) / T
 * Source: v_sales_velocity
 */
const SalesVelocity = ({ data, selectedOwner }) => {
  // What-if analysis state
  const [cycleDaysReduction, setCycleDaysReduction] = useState(5);
  const [winRateIncrease, setWinRateIncrease] = useState(3);

  // Process data for display
  const { displayData, totals, chartData, fastestRep, teamVelocity } = useMemo(() => {
    if (!data || data.length === 0) {
      return { displayData: [], totals: null, chartData: [], fastestRep: null, teamVelocity: 0 };
    }

    // Calculate team totals
    const totalOpportunities = data.reduce((sum, d) => sum + (d.num_opportunities || 0), 0);
    const avgDealValue = data.reduce((sum, d) => sum + (d.avg_deal_value || 0), 0) / data.length;
    const avgWinRate = data.reduce((sum, d) => sum + (d.win_rate_pct || 0), 0) / data.length;
    const avgCycle = data.reduce((sum, d) => sum + (d.avg_sales_cycle_days || 0), 0) / data.length;
    const totalDailyVelocity = data.reduce((sum, d) => sum + (d.sales_velocity_daily || 0), 0);
    const totalMonthlyVelocity = data.reduce((sum, d) => sum + (d.sales_velocity_monthly || 0), 0);

    // Find fastest rep
    const fastest = [...data].sort((a, b) =>
      (b.sales_velocity_daily || 0) - (a.sales_velocity_daily || 0)
    )[0];

    // Prepare chart data - sorted by velocity
    const chart = data.map(d => ({
      name: d.owner_name || 'Unknown',
      'Daily Velocity ($)': d.sales_velocity_daily || 0,
      'Win Rate (%)': d.win_rate_pct || 0,
      isFastest: d.owner_name === fastest?.owner_name,
    })).sort((a, b) => b['Daily Velocity ($)'] - a['Daily Velocity ($)']);

    return {
      displayData: data,
      totals: {
        opportunities: totalOpportunities,
        avgDealValue,
        avgWinRate,
        avgCycle,
        dailyVelocity: totalDailyVelocity,
        monthlyVelocity: totalMonthlyVelocity,
      },
      chartData: chart,
      fastestRep: fastest,
      teamVelocity: totalDailyVelocity,
    };
  }, [data]);

  // Calculate what-if scenarios
  const whatIfAnalysis = useMemo(() => {
    if (!totals || totals.monthlyVelocity === 0) return null;

    const currentMonthly = totals.monthlyVelocity;
    const { avgCycle, avgWinRate } = totals;

    // Use ratio-based calculation for more accurate results
    // Reducing cycle by X days increases velocity proportionally
    const cycleReductionRatio = avgCycle / Math.max(1, avgCycle - cycleDaysReduction);
    const velocityWithReducedCycle = currentMonthly * cycleReductionRatio;
    const cycleGain = velocityWithReducedCycle - currentMonthly;

    // Increasing win rate by X% increases velocity proportionally
    const winRateIncreaseRatio = Math.min(100, avgWinRate + winRateIncrease) / Math.max(1, avgWinRate);
    const velocityWithIncreasedWinRate = currentMonthly * winRateIncreaseRatio;
    const winRateGain = velocityWithIncreasedWinRate - currentMonthly;

    // Combined impact (multiply both ratios)
    const combinedVelocity = currentMonthly * cycleReductionRatio * winRateIncreaseRatio;
    const combinedGain = combinedVelocity - currentMonthly;

    return {
      cycleGain,
      cycleGainPercent: (cycleGain / currentMonthly) * 100,
      winRateGain,
      winRateGainPercent: (winRateGain / currentMonthly) * 100,
      combinedGain,
      combinedGainPercent: (combinedGain / currentMonthly) * 100,
      newMonthlyVelocity: combinedVelocity,
    };
  }, [totals, cycleDaysReduction, winRateIncrease]);

  // Gauge calculations
  const gaugeData = useMemo(() => {
    if (!totals) return { percent: 0, target: 0, status: 'low' };

    // Assuming a target of $15K/day team velocity as benchmark
    const targetDaily = 15000;
    const percent = Math.min(100, (totals.dailyVelocity / targetDaily) * 100);

    let status = 'low';
    if (percent >= 80) status = 'excellent';
    else if (percent >= 60) status = 'good';
    else if (percent >= 40) status = 'moderate';

    return { percent, target: targetDaily, status };
  }, [totals]);

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-gray-500" />
          <Title>Sales Velocity Command Center</Title>
          <MetricInfo id="Sales Velocity" />
        </div>
        <Text className="text-gray-500 mt-2">No velocity data available</Text>
      </Card>
    );
  }

  // Status colors
  const statusColors = {
    excellent: { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'Excellent' },
    good: { bg: 'bg-blue-500', text: 'text-blue-600', label: 'Good' },
    moderate: { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Moderate' },
    low: { bg: 'bg-rose-500', text: 'text-rose-600', label: 'Needs Improvement' },
  };

  const currentStatus = statusColors[gaugeData.status];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <Flex justifyContent="between" alignItems="start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-6 w-6" />
              <Title className="text-white text-xl">Sales Velocity Command Center</Title>
              <MetricInfo id="Sales Velocity" />
            </div>
            <Text className="text-indigo-100">
              Pipeline throughput efficiency • Real-time analysis
            </Text>
          </div>
          <div className="relative group">
            <Badge className="bg-white/20 text-white border-white/30 cursor-help">
              <Calculator className="h-3 w-3 mr-1" />
              V = (n × L × W) / T
            </Badge>
            {/* Tooltip */}
            <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <p className="font-semibold mb-2">Velocity Formula Explained:</p>
              <ul className="space-y-1">
                <li><strong>n</strong> = Number of Opportunities</li>
                <li><strong>L</strong> = Average Deal Value (Lead Value)</li>
                <li><strong>W</strong> = Win Rate (%)</li>
                <li><strong>T</strong> = Average Sales Cycle (Days)</li>
              </ul>
              <p className="mt-2 text-gray-300">Higher velocity = faster revenue generation</p>
            </div>
          </div>
        </Flex>
      </Card>

      {/* Main Grid */}
      <Grid numItemsSm={1} numItemsLg={3} className="gap-6">

        {/* Velocity Gauge */}
        <Card className="col-span-1">
          <Flex justifyContent="between" alignItems="start" className="mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-indigo-500" />
                <Title className="text-base">Daily Velocity Pulse</Title>
                <MetricInfo id="Daily Velocity Pulse" />
              </div>
              <Text className="text-gray-500 text-sm">Team throughput meter</Text>
            </div>
            <Badge color={gaugeData.status === 'excellent' ? 'emerald' : gaugeData.status === 'good' ? 'blue' : gaugeData.status === 'moderate' ? 'amber' : 'rose'}>
              {currentStatus.label}
            </Badge>
          </Flex>

          {/* Visual Gauge */}
          <div className="relative pt-4 pb-8">
            {/* Gauge Background */}
            <div className="relative h-32 flex items-end justify-center">
              {/* Semi-circle gauge */}
              <div className="absolute bottom-0 w-48 h-24 overflow-hidden">
                <div className="w-48 h-48 rounded-full border-[16px] border-gray-200 relative">
                  {/* Filled portion */}
                  <div
                    className={`absolute inset-0 rounded-full border-[16px] ${currentStatus.bg} border-transparent`}
                    style={{
                      clipPath: `polygon(0 50%, 100% 50%, 100% 100%, 0 100%)`,
                      transform: `rotate(${-90 + (gaugeData.percent * 1.8)}deg)`,
                      transformOrigin: 'center center',
                    }}
                  />
                </div>
              </div>

              {/* Center content */}
              <div className="relative z-10 text-center pb-2">
                <Metric className={currentStatus.text}>
                  {formatCurrency(totals?.dailyVelocity || 0)}
                </Metric>
                <Text className="text-gray-500 text-sm">per day</Text>
              </div>
            </div>

            {/* Progress bar alternative */}
            <div className="mt-4">
              <Flex justifyContent="between" className="mb-1">
                <Text className="text-xs text-gray-500">Target: {formatCurrency(gaugeData.target)}/day</Text>
                <Text className="text-xs font-medium">{Math.round(gaugeData.percent)}%</Text>
              </Flex>
              <ProgressBar
                value={gaugeData.percent}
                color={gaugeData.status === 'excellent' ? 'emerald' : gaugeData.status === 'good' ? 'blue' : gaugeData.status === 'moderate' ? 'amber' : 'rose'}
              />
            </div>

            {/* MoM Indicator */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <Flex justifyContent="between" alignItems="center">
                <Text className="text-sm text-gray-600">Month-over-Month</Text>
                <Flex alignItems="center" className="gap-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <Text className="text-sm font-semibold text-emerald-600">+12.4%</Text>
                </Flex>
              </Flex>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="border-t pt-4 mt-2">
            <Flex justifyContent="between">
              <div>
                <Text className="text-gray-500 text-xs">Monthly Velocity</Text>
                <Text className="text-lg font-bold text-indigo-600">
                  {formatCurrency(totals?.monthlyVelocity || 0)}
                </Text>
              </div>
              <div className="text-right">
                <Text className="text-gray-500 text-xs">Team Avg Cycle</Text>
                <Text className="text-lg font-bold">
                  {Math.round(totals?.avgCycle || 0)} days
                </Text>
              </div>
            </Flex>
          </div>
        </Card>

        {/* What-If Calculator */}
        <Card className="col-span-1">
          <Flex alignItems="center" className="gap-2 mb-4">
            <Sliders className="h-5 w-5 text-purple-500" />
            <Title className="text-base">What-If Analysis</Title>
          </Flex>
          <Text className="text-gray-500 text-sm mb-4">
            Adjust levers to see revenue impact
          </Text>

          {/* Lever 1: Reduce Cycle Days */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <Flex justifyContent="between" alignItems="center" className="mb-2">
              <Flex alignItems="center" className="gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <Text className="font-medium text-blue-900">Reduce Sales Cycle</Text>
              </Flex>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCycleDaysReduction(Math.max(1, cycleDaysReduction - 1))}
                  className="w-6 h-6 rounded bg-blue-200 text-blue-700 hover:bg-blue-300 flex items-center justify-center text-sm font-bold"
                >
                  -
                </button>
                <span className="w-12 text-center font-bold text-blue-700">
                  {cycleDaysReduction} days
                </span>
                <button
                  onClick={() => setCycleDaysReduction(Math.min(30, cycleDaysReduction + 1))}
                  className="w-6 h-6 rounded bg-blue-200 text-blue-700 hover:bg-blue-300 flex items-center justify-center text-sm font-bold"
                >
                  +
                </button>
              </div>
            </Flex>
            <div className="mt-3 p-2 bg-white rounded">
              <Flex justifyContent="between" alignItems="center">
                <Text className="text-sm text-gray-600">Monthly Revenue Gain:</Text>
                <Text className={`font-bold ${(whatIfAnalysis?.cycleGain || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(whatIfAnalysis?.cycleGain || 0) >= 0 ? '+' : ''}{formatCurrency(whatIfAnalysis?.cycleGain || 0)}
                </Text>
              </Flex>
              <Text className="text-xs text-gray-400 mt-1">
                ({Math.abs(whatIfAnalysis?.cycleGainPercent || 0).toFixed(1)}% {(whatIfAnalysis?.cycleGainPercent || 0) >= 0 ? 'increase' : 'decrease'})
              </Text>
            </div>
          </div>

          {/* Lever 2: Increase Win Rate */}
          <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <Flex justifyContent="between" alignItems="center" className="mb-2">
              <Flex alignItems="center" className="gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                <Text className="font-medium text-emerald-900">Increase Win Rate</Text>
              </Flex>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWinRateIncrease(Math.max(1, winRateIncrease - 1))}
                  className="w-6 h-6 rounded bg-emerald-200 text-emerald-700 hover:bg-emerald-300 flex items-center justify-center text-sm font-bold"
                >
                  -
                </button>
                <span className="w-12 text-center font-bold text-emerald-700">
                  {winRateIncrease}%
                </span>
                <button
                  onClick={() => setWinRateIncrease(Math.min(20, winRateIncrease + 1))}
                  className="w-6 h-6 rounded bg-emerald-200 text-emerald-700 hover:bg-emerald-300 flex items-center justify-center text-sm font-bold"
                >
                  +
                </button>
              </div>
            </Flex>
            <div className="mt-3 p-2 bg-white rounded">
              <Flex justifyContent="between" alignItems="center">
                <Text className="text-sm text-gray-600">Monthly Revenue Gain:</Text>
                <Text className={`font-bold ${(whatIfAnalysis?.winRateGain || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(whatIfAnalysis?.winRateGain || 0) >= 0 ? '+' : ''}{formatCurrency(whatIfAnalysis?.winRateGain || 0)}
                </Text>
              </Flex>
              <Text className="text-xs text-gray-400 mt-1">
                ({Math.abs(whatIfAnalysis?.winRateGainPercent || 0).toFixed(1)}% {(whatIfAnalysis?.winRateGainPercent || 0) >= 0 ? 'increase' : 'decrease'})
              </Text>
            </div>
          </div>

          {/* Combined Impact */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <Flex alignItems="center" className="gap-2 mb-2">
              {(whatIfAnalysis?.combinedGain || 0) >= 0 ? (
                <TrendingUp className="h-5 w-5 text-purple-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <Text className="font-semibold text-purple-900">Combined Impact</Text>
            </Flex>
            <Metric className={(whatIfAnalysis?.combinedGain || 0) >= 0 ? 'text-purple-600' : 'text-red-600'}>
              {(whatIfAnalysis?.combinedGain || 0) >= 0 ? '+' : ''}{formatCurrency(whatIfAnalysis?.combinedGain || 0)}
            </Metric>
            <Text className="text-sm text-gray-600 mt-1">
              New Monthly Velocity: <span className="font-bold">{formatCurrency(whatIfAnalysis?.newMonthlyVelocity || 0)}</span>
            </Text>
            <div className="mt-2 h-1 bg-purple-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.abs(whatIfAnalysis?.combinedGainPercent || 0))}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Velocity by Rep */}
        <Card className="col-span-1">
          <Flex justifyContent="between" alignItems="start" className="mb-4">
            <div>
              <Flex alignItems="center" className="gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <Title className="text-base">Velocity by Rep</Title>
              </Flex>
              <Text className="text-gray-500 text-sm">Daily throughput comparison</Text>
            </div>
            {fastestRep && (
              <Badge color="amber" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Fastest: {fastestRep.owner_name?.split(' ')[0]}
              </Badge>
            )}
          </Flex>

          {/* Bar Chart */}
          <BarChart
            className="h-52"
            data={chartData}
            index="name"
            categories={['Daily Velocity ($)']}
            colors={['indigo']}
            valueFormatter={(value) => formatCurrency(value)}
            yAxisWidth={70}
            showLegend={false}
          />

          {/* Fastest Rep Highlight */}
          {fastestRep && (
            <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
              <Flex justifyContent="between" alignItems="center">
                <div>
                  <Text className="text-xs text-amber-600 font-medium">FASTEST PIPE</Text>
                  <Text className="font-bold text-gray-900">{fastestRep.owner_name}</Text>
                </div>
                <div className="text-right">
                  <Text className="text-xs text-gray-500">Daily Velocity</Text>
                  <Text className="font-bold text-amber-600">
                    {formatCurrency(fastestRep.sales_velocity_daily || 0)}
                  </Text>
                </div>
              </Flex>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="p-1 bg-white rounded">
                  <Text className="text-xs text-gray-500">Opps</Text>
                  <Text className="font-semibold text-sm">{fastestRep.num_opportunities}</Text>
                </div>
                <div className="p-1 bg-white rounded">
                  <Text className="text-xs text-gray-500">Win %</Text>
                  <Text className="font-semibold text-sm">{formatPercent(fastestRep.win_rate_pct)}</Text>
                </div>
                <div className="p-1 bg-white rounded">
                  <Text className="text-xs text-gray-500">Cycle</Text>
                  <Text className="font-semibold text-sm">{Math.round(fastestRep.avg_sales_cycle_days)}d</Text>
                </div>
              </div>
            </div>
          )}
        </Card>
      </Grid>

      {/* Team Velocity Factors */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-500" />
          <Title className="text-base">Velocity Factor Breakdown</Title>
          <MetricInfo id="Velocity Factor Breakdown" />
        </div>

        <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Text className="text-2xl font-bold text-blue-600">n</Text>
            </div>
            <Text className="text-gray-600 text-sm">Opportunities</Text>
            <Metric className="text-blue-600">{totals?.opportunities || 0}</Metric>
          </div>

          <div className="p-4 bg-emerald-50 rounded-lg text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Text className="text-2xl font-bold text-emerald-600">L</Text>
            </div>
            <Text className="text-gray-600 text-sm">Avg Deal Value</Text>
            <Metric className="text-emerald-600">{formatCurrency(totals?.avgDealValue || 0)}</Metric>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Text className="text-2xl font-bold text-amber-600">W</Text>
            </div>
            <Text className="text-gray-600 text-sm">Win Rate</Text>
            <Metric className="text-amber-600">{formatPercent(totals?.avgWinRate || 0)}</Metric>
          </div>

          <div className="p-4 bg-rose-50 rounded-lg text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Text className="text-2xl font-bold text-rose-600">T</Text>
            </div>
            <Text className="text-gray-600 text-sm">Avg Sales Cycle</Text>
            <Metric className="text-rose-600">{Math.round(totals?.avgCycle || 0)}d</Metric>
          </div>
        </Grid>
      </Card>
    </div>
  );
};

export default SalesVelocity;
