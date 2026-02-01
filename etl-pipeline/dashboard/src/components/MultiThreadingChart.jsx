import React, { useMemo } from 'react';
import {
  Card,
  Title,
  Text,
  DonutChart,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Flex,
  Grid,
  Metric,
} from '@tremor/react';
import { UsersIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { MetricInfoIcon } from './MetricTooltip';

/**
 * MultiThreadingChart Component
 * Displays multi-threading (contact coverage) analysis
 * Source: v_multi_threading
 */
const MultiThreadingChart = ({ data }) => {
  // Process data for visualization
  const { summary, chartData, criticalDeals } = useMemo(() => {
    if (!data || data.length === 0) {
      return { summary: null, chartData: [], criticalDeals: [] };
    }

    // Count by threading level
    const levelCounts = {};
    data.forEach(d => {
      const level = d.threading_level || 'Unknown';
      if (!levelCounts[level]) {
        levelCounts[level] = { name: level, value: 0 };
      }
      levelCounts[level].value++;
    });

    // Get critical risk deals
    const critical = data.filter(d => d.is_critical_risk_loss_of_momentum);

    // Calculate summary
    const totalDeals = data.length;
    const avgContacts = data.reduce((sum, d) => sum + d.contact_count, 0) / totalDeals;
    const singleThreaded = data.filter(d => d.contact_count <= 1).length;

    return {
      summary: {
        totalDeals,
        avgContacts: avgContacts.toFixed(1),
        singleThreaded,
        criticalCount: critical.length,
      },
      chartData: Object.values(levelCounts),
      criticalDeals: critical,
    };
  }, [data]);

  // Color mapping for threading levels
  const levelColors = {
    'Critical': 'red',
    'Low': 'amber',
    'Moderate': 'yellow',
    'Healthy': 'emerald',
    'Unknown': 'gray',
  };

  // Chart colors
  const chartColors = ['red', 'amber', 'yellow', 'emerald', 'gray'];

  if (!data || data.length === 0) {
    return (
      <Card>
        <Flex alignItems="center" className="gap-2">
          <UsersIcon className="h-5 w-5 text-gray-500" />
          <Title>Multi-Threading Analysis</Title>
          <MetricInfoIcon metricKey="Multi-Threading" size="sm" />
        </Flex>
        <Text className="text-gray-500 mt-2">No threading data available</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Flex alignItems="center" className="gap-2">
            <UsersIcon className="h-5 w-5 text-blue-500" />
            <Title>Multi-Threading Analysis</Title>
            <MetricInfoIcon metricKey="Multi-Threading" size="sm" />
          </Flex>
          <Text className="mt-1">Contact coverage per deal</Text>
        </div>
        {summary.criticalCount > 0 && (
          <Badge color="red" icon={ExclamationTriangleIcon}>
            {summary.criticalCount} Critical
          </Badge>
        )}
      </Flex>

      {/* Summary Stats */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4 mt-6">
        <div>
          <Text className="text-gray-500">Total Deals</Text>
          <Metric>{summary.totalDeals}</Metric>
        </div>
        <div>
          <Text className="text-gray-500">Avg Contacts/Deal</Text>
          <Metric>{summary.avgContacts}</Metric>
        </div>
        <div>
          <Text className="text-gray-500">Single-Threaded</Text>
          <Metric className="text-amber-600">{summary.singleThreaded}</Metric>
        </div>
        <div>
          <Text className="text-gray-500">Critical Risk</Text>
          <Metric className="text-red-600">{summary.criticalCount}</Metric>
        </div>
      </Grid>

      {/* Donut Chart */}
      <Flex className="gap-6 mt-6">
        <div className="flex-1">
          <Text className="font-medium mb-2">Threading Level Distribution</Text>
          <DonutChart
            className="h-48"
            data={chartData}
            category="value"
            index="name"
            colors={chartColors}
            valueFormatter={(value) => `${value} deals`}
          />
        </div>

        {/* Level Legend */}
        <div className="flex-1 space-y-2">
          <Text className="font-medium mb-2">Threading Levels</Text>
          {chartData.map((item, idx) => (
            <Flex key={idx} justifyContent="between" alignItems="center">
              <Flex alignItems="center" className="gap-2">
                <div className={`w-3 h-3 rounded-full bg-${levelColors[item.name] || 'gray'}-500`} />
                <Text>{item.name}</Text>
              </Flex>
              <Badge color={levelColors[item.name] || 'gray'}>{item.value}</Badge>
            </Flex>
          ))}
        </div>
      </Flex>

      {/* Critical Deals Table */}
      {criticalDeals.length > 0 && (
        <>
          <Flex alignItems="center" className="gap-2 mt-6 mb-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <Text className="font-medium text-red-600">Critical Risk: Loss of Momentum</Text>
          </Flex>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Deal</TableHeaderCell>
                <TableHeaderCell className="text-center">Contacts</TableHeaderCell>
                <TableHeaderCell>Threading Level</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {criticalDeals.slice(0, 5).map((row, idx) => (
                <TableRow key={idx} className="bg-red-50">
                  <TableCell>
                    <Text className="font-medium">{row.dealname}</Text>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color="red">{row.contact_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={levelColors[row.threading_level] || 'gray'}>
                      {row.threading_level}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {criticalDeals.length > 5 && (
            <Text className="text-gray-500 text-sm mt-2">
              +{criticalDeals.length - 5} more critical deals
            </Text>
          )}
        </>
      )}

      {/* All Deals Table */}
      <Text className="font-medium mt-6 mb-4">All Deals Threading Status</Text>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Deal</TableHeaderCell>
            <TableHeaderCell className="text-center">Contacts</TableHeaderCell>
            <TableHeaderCell>Level</TableHeaderCell>
            <TableHeaderCell>Risk</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.slice(0, 10).map((row, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <Text className="font-medium">{row.dealname}</Text>
              </TableCell>
              <TableCell className="text-center">
                <Text>{row.contact_count}</Text>
              </TableCell>
              <TableCell>
                <Badge color={levelColors[row.threading_level] || 'gray'}>
                  {row.threading_level}
                </Badge>
              </TableCell>
              <TableCell>
                {row.is_critical_risk_loss_of_momentum ? (
                  <Badge color="red" icon={ExclamationTriangleIcon}>Critical</Badge>
                ) : (
                  <Text className="text-gray-500">-</Text>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length > 10 && (
        <Text className="text-gray-500 text-sm mt-2">
          Showing 10 of {data.length} deals
        </Text>
      )}
    </Card>
  );
};

export default MultiThreadingChart;
