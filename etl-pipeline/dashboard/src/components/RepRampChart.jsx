import React, { useMemo, useState } from 'react';
import {
  Card,
  Title,
  AreaChart,
  Flex,
  Text,
  Legend,
  Select,
  SelectItem,
  Badge,
  Grid,
  Metric,
} from '@tremor/react';
import {
  ChartBarIcon,
  UserIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../services/api';
import { MetricInfoIcon } from './MetricTooltip';

/**
 * RepRampChart Component
 * Displays cumulative ARR by tenure quarter from v_rep_ramp_chart view
 *
 * X-axis: Quarter of Tenure (Q1-Q6)
 * Y-axis: Cumulative ARR ($)
 * Lines: One per sales rep
 *
 * Formula: quarter_of_tenure = FLOOR(DATE_DIFF(closedate, hire_date, DAY) / 91) + 1
 */
const RepRampChart = ({ data }) => {
  const [selectedRep, setSelectedRep] = useState('all');

  // Get unique reps - must be called before any early returns
  const reps = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map((d) => d.owner_name))].sort();
  }, [data]);

  // Transform data for Tremor AreaChart
  // Need format: { quarter: 'Q1', 'Sarah Chen': 180000, 'Michael Torres': 120000, ... }
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const quarters = [1, 2, 3, 4, 5, 6];

    return quarters.map((q) => {
      const row = { quarter: `Q${q}` };

      const relevantReps = selectedRep === 'all' ? reps : [selectedRep];

      relevantReps.forEach((rep) => {
        const repData = data.find(
          (d) => d.owner_name === rep && d.quarter_of_tenure === q
        );
        row[rep] = repData ? repData.cumulative_arr : null;
      });

      return row;
    });
  }, [data, reps, selectedRep]);

  // Get categories (rep names) for the chart
  const categories = useMemo(() => {
    return selectedRep === 'all' ? reps : [selectedRep];
  }, [reps, selectedRep]);

  // Color palette for reps
  const colorMap = {
    'Sarah Chen': 'blue',
    'Michael Torres': 'emerald',
    'David Kim': 'amber',
    'Emily Watson': 'violet',
  };

  // Calculate rep stats
  const repStats = useMemo(() => {
    if (!data || data.length === 0) return [];
    return reps.map((rep) => {
      const repData = data.filter((d) => d.owner_name === rep);
      const maxQuarter = Math.max(...repData.map((d) => d.quarter_of_tenure));
      const latestData = repData.find((d) => d.quarter_of_tenure === maxQuarter);

      return {
        name: rep,
        currentQuarter: maxQuarter,
        totalARR: latestData?.cumulative_arr || 0,
        totalDeals: latestData?.cumulative_deals || 0,
        avgDealSize:
          latestData?.cumulative_arr && latestData?.cumulative_deals
            ? latestData.cumulative_arr / latestData.cumulative_deals
            : 0,
      };
    });
  }, [data, reps]);

  // Custom tooltip formatter
  const valueFormatter = (value) => {
    if (value === null || value === undefined) return '-';
    return formatCurrency(value);
  };

  // Early return after all hooks are called
  if (!data || data.length === 0) return null;

  return (
    <Card>
      <Flex justifyContent="between" alignItems="start" className="mb-4">
        <div>
          <Flex justifyContent="start" className="space-x-2">
            <ChartBarIcon className="h-6 w-6 text-blue-500" />
            <Title>Rep Ramp Curve</Title>
            <MetricInfoIcon metricKey="Rep Ramp" size="sm" />
          </Flex>
          <Text className="mt-1 text-gray-500">
            Cumulative ARR by quarter of tenure (91 days = 1 quarter)
          </Text>
        </div>

        <Select
          value={selectedRep}
          onValueChange={setSelectedRep}
          className="w-48"
        >
          <SelectItem value="all">All Reps</SelectItem>
          {reps.map((rep) => (
            <SelectItem key={rep} value={rep}>
              {rep}
            </SelectItem>
          ))}
        </Select>
      </Flex>

      {/* Rep Stats Cards */}
      {selectedRep === 'all' && (
        <Grid numItemsSm={2} numItemsLg={4} className="gap-4 mb-6">
          {repStats.map((rep) => (
            <Card key={rep.name} className="p-4">
              <Flex justifyContent="start" className="space-x-2 mb-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <Text className="font-medium truncate">{rep.name}</Text>
              </Flex>
              <Metric className="text-lg">{formatCurrency(rep.totalARR)}</Metric>
              <Flex justifyContent="between" className="mt-2">
                <Badge color={colorMap[rep.name] || 'gray'} size="sm">
                  Q{rep.currentQuarter}
                </Badge>
                <Text className="text-xs text-gray-500">
                  {rep.totalDeals} deals
                </Text>
              </Flex>
            </Card>
          ))}
        </Grid>
      )}

      {/* Area Chart */}
      <AreaChart
        className="h-72 mt-4"
        data={chartData}
        index="quarter"
        categories={categories}
        colors={categories.map((rep) => colorMap[rep] || 'gray')}
        valueFormatter={valueFormatter}
        showLegend={true}
        showGridLines={true}
        showAnimation={true}
        curveType="monotone"
        connectNulls={false}
      />

      {/* Legend and insights */}
      <Flex justifyContent="between" className="mt-4 pt-4 border-t border-gray-200">
        <Flex justifyContent="start" className="space-x-2">
          <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-500" />
          <Text className="text-sm text-gray-600">
            {selectedRep === 'all'
              ? `Tracking ${reps.length} reps across ${Math.max(...data.map((d) => d.quarter_of_tenure))} quarters`
              : `${selectedRep} has closed ${
                  repStats.find((r) => r.name === selectedRep)?.totalDeals || 0
                } deals`}
          </Text>
        </Flex>

        <Badge color="blue" size="sm">
          1 Quarter = 91 Days
        </Badge>
      </Flex>
    </Card>
  );
};

export default RepRampChart;
