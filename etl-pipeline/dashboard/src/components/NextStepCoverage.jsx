import React, { useMemo } from 'react';
import {
  Card,
  Title,
  Text,
  Metric,
  Grid,
  ProgressBar,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Flex,
  Badge,
} from '@tremor/react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { formatPercent } from '../services/api';
import { MetricInfoIcon } from './MetricTooltip';

/**
 * NextStepCoverage Component
 * Shows deals with documented next steps per rep
 * Source: v_next_step_coverage
 */
const NextStepCoverage = ({ data }) => {
  // Calculate team summary
  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return { totalDeals: 0, dealsWithNextStep: 0, avgCoverage: 0 };
    }

    const totalDeals = data.reduce((sum, d) => sum + d.total_open_deals, 0);
    const dealsWithNextStep = data.reduce((sum, d) => sum + d.deals_with_next_step, 0);
    const avgCoverage = totalDeals > 0 ? (dealsWithNextStep / totalDeals) * 100 : 0;

    return { totalDeals, dealsWithNextStep, avgCoverage };
  }, [data]);

  // Get color based on coverage percentage
  const getCoverageColor = (pct) => {
    if (pct >= 80) return 'emerald';
    if (pct >= 50) return 'amber';
    return 'red';
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <Flex alignItems="center" className="gap-2">
          <ClipboardDocumentListIcon className="h-5 w-5 text-gray-500" />
          <Title>Next Step Coverage</Title>
          <MetricInfoIcon metricKey="Next Step Coverage" size="sm" />
        </Flex>
        <Text className="text-gray-500 mt-2">No coverage data available</Text>
      </Card>
    );
  }

  // Sort by coverage (lowest first to highlight issues)
  const sortedData = [...data].sort((a, b) => a.next_step_coverage_pct - b.next_step_coverage_pct);

  return (
    <Card>
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Flex alignItems="center" className="gap-2">
            <ClipboardDocumentListIcon className="h-5 w-5 text-blue-500" />
            <Title>Next Step Coverage</Title>
            <MetricInfoIcon metricKey="Next Step Coverage" size="sm" />
          </Flex>
          <Text className="mt-1">Deals with documented next actions</Text>
        </div>
        <Badge color={getCoverageColor(summary.avgCoverage)} size="lg">
          {formatPercent(summary.avgCoverage)} Team Avg
        </Badge>
      </Flex>

      {/* Summary Stats */}
      <Grid numItemsSm={3} className="gap-4 mt-6">
        <div>
          <Text className="text-gray-500">Total Open Deals</Text>
          <Metric>{summary.totalDeals}</Metric>
        </div>
        <div>
          <Text className="text-gray-500">With Next Step</Text>
          <Metric className="text-emerald-600">{summary.dealsWithNextStep}</Metric>
        </div>
        <div>
          <Text className="text-gray-500">Missing Next Step</Text>
          <Metric className="text-red-600">{summary.totalDeals - summary.dealsWithNextStep}</Metric>
        </div>
      </Grid>

      {/* Coverage by Rep */}
      <div className="mt-6 space-y-4">
        <Text className="font-medium">Coverage by Sales Rep</Text>
        {sortedData.map((row, idx) => (
          <div key={idx}>
            <Flex justifyContent="between" className="mb-1">
              <Text>{row.owner_name}</Text>
              <Flex alignItems="center" className="gap-2">
                <Text className="text-gray-500">
                  {row.deals_with_next_step}/{row.total_open_deals}
                </Text>
                <Badge color={getCoverageColor(row.next_step_coverage_pct)}>
                  {formatPercent(row.next_step_coverage_pct)}
                </Badge>
              </Flex>
            </Flex>
            <ProgressBar
              value={row.next_step_coverage_pct}
              color={getCoverageColor(row.next_step_coverage_pct)}
            />
          </div>
        ))}
      </div>

      {/* Detailed Table */}
      <Table className="mt-6">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Rep</TableHeaderCell>
            <TableHeaderCell className="text-right">Open Deals</TableHeaderCell>
            <TableHeaderCell className="text-right">With Next Step</TableHeaderCell>
            <TableHeaderCell className="text-right">Coverage</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((row, idx) => (
            <TableRow key={idx} className={row.next_step_coverage_pct < 50 ? 'bg-red-50' : ''}>
              <TableCell>
                <Text className="font-medium">{row.owner_name}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text>{row.total_open_deals}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text className="text-emerald-600">{row.deals_with_next_step}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Badge color={getCoverageColor(row.next_step_coverage_pct)}>
                  {formatPercent(row.next_step_coverage_pct)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default NextStepCoverage;
