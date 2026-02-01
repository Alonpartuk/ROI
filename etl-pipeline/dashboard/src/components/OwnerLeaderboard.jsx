import React, { useState } from 'react';
import {
  Card,
  Title,
  Text,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Flex,
  ProgressBar,
  BarList,
} from '@tremor/react';
import {
  TrophyIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import MetricInfo from './MetricInfo';

const INITIAL_DISPLAY_COUNT = 5;
const LOAD_MORE_COUNT = 5;

/**
 * Owner Leaderboard Component
 * Shows sales rep performance rankings with pipeline and at-risk metrics
 *
 * Mobile-optimized with card view
 */
const OwnerLeaderboard = ({ data }) => {
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white">
        <div className="flex items-center gap-2 mb-4">
          <TrophyIcon className="h-5 w-5 text-amber-500" />
          <Title>Rep Leaderboard</Title>
          <MetricInfo id="Rep Leaderboard" />
        </div>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <UserCircleIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <Text>No rep data available</Text>
          </div>
        </div>
      </Card>
    );
  }

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value?.toLocaleString() || 0}`;
  };

  // Sort by won value (default leaderboard metric)
  const sortedData = [...data].sort((a, b) => b.won_value - a.won_value);

  // Paginated data
  const displayedData = sortedData.slice(0, displayCount);
  const hasMore = displayCount < sortedData.length;
  const isExpanded = displayCount > INITIAL_DISPLAY_COUNT;

  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + LOAD_MORE_COUNT, sortedData.length));
  };

  const handleCollapse = () => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  // Calculate team totals
  const teamTotals = {
    pipeline: data.reduce((sum, d) => sum + d.pipeline_value, 0),
    won: data.reduce((sum, d) => sum + d.won_value, 0),
    atRisk: data.reduce((sum, d) => sum + d.at_risk_value, 0),
    cleanPipeline: data.reduce((sum, d) => sum + d.clean_pipeline_value, 0),
  };

  // Prepare bar chart data (desktop)
  const barData = sortedData.slice(0, 6).map(rep => ({
    name: rep.owner_name,
    value: rep.won_value,
  }));

  // Get rank badge
  const getRankBadge = (index) => {
    if (index === 0) return { color: 'amber', text: '1st' };
    if (index === 1) return { color: 'gray', text: '2nd' };
    if (index === 2) return { color: 'orange', text: '3rd' };
    return null;
  };

  return (
    <Card className="bg-white">
      <Flex justifyContent="between" alignItems="start" className="mb-4">
        <div className="flex items-start gap-2">
          <TrophyIcon className="h-5 w-5 text-amber-500 mt-1" />
          <div>
            <div className="flex items-center gap-2">
              <Title className="text-base sm:text-lg">Rep Leaderboard</Title>
              <MetricInfo id="Rep Leaderboard" />
            </div>
            <Text className="text-gray-500 text-xs sm:text-sm">Ranked by closed won ARR</Text>
          </div>
        </div>
        <Badge color="emerald" size="sm">
          {formatCurrency(teamTotals.won)} Won
        </Badge>
      </Flex>

      {/* Won ARR Bar Chart - Desktop only */}
      <div className="mb-6 hidden md:block">
        <Text className="text-gray-500 text-sm mb-2">Won ARR by Rep</Text>
        <BarList
          data={barData}
          valueFormatter={(value) => formatCurrency(value)}
          color="emerald"
        />
      </div>

      {/* Mobile Card View - Shows on screens < 768px */}
      <div className="block md:hidden space-y-3 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {displayedData.map((rep, index) => {
            const riskPct = rep.pipeline_value > 0
              ? (rep.at_risk_value / rep.pipeline_value) * 100
              : 0;
            const riskColor = riskPct > 30 ? 'rose' : riskPct > 15 ? 'amber' : 'emerald';
            const rankBadge = getRankBadge(index);

            return (
              <motion.div
                key={rep.owner_name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                className="p-3 rounded-xl border border-gray-200 bg-white"
              >
                {/* Header: Name & Rank */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {rankBadge && (
                      <Badge color={rankBadge.color} size="xs">{rankBadge.text}</Badge>
                    )}
                    <Text className="font-semibold text-gray-900">{rep.owner_name}</Text>
                  </div>
                  <Text className="font-bold text-emerald-600">{formatCurrency(rep.won_value)}</Text>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Text className="text-[10px] text-gray-500">Pipeline</Text>
                    <Text className="text-xs font-semibold">{formatCurrency(rep.pipeline_value)}</Text>
                    <Text className="text-[10px] text-gray-400">{rep.open_deals} deals</Text>
                  </div>
                  <div className="text-center p-2 bg-emerald-50 rounded-lg">
                    <Text className="text-[10px] text-gray-500">Clean</Text>
                    <Text className="text-xs font-semibold text-emerald-600">{formatCurrency(rep.clean_pipeline_value)}</Text>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Text className="text-[10px] text-gray-500">Won</Text>
                    <Text className="text-xs font-semibold text-emerald-600">{rep.won_deals}</Text>
                  </div>
                </div>

                {/* Win Rate & At Risk */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Text className="text-xs text-gray-500">Win Rate</Text>
                    <ProgressBar
                      value={rep.win_rate_pct}
                      color={rep.win_rate_pct >= 25 ? 'emerald' : rep.win_rate_pct >= 15 ? 'amber' : 'rose'}
                      className="w-16"
                    />
                    <Text className="text-xs font-medium">{rep.win_rate_pct.toFixed(0)}%</Text>
                  </div>
                  {rep.at_risk_deals > 0 ? (
                    <Flex justifyContent="end" className="space-x-1">
                      <ExclamationTriangleIcon className={`h-4 w-4 text-${riskColor}-500`} />
                      <Text className={`text-xs text-${riskColor}-600 font-medium`}>
                        {formatCurrency(rep.at_risk_value)}
                      </Text>
                    </Flex>
                  ) : (
                    <Badge color="emerald" size="xs">No Risk</Badge>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block max-h-[400px] overflow-y-auto">
        <Table className="mt-4">
          <TableHead className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHeaderCell>Rep</TableHeaderCell>
              <TableHeaderCell className="text-right">Pipeline</TableHeaderCell>
              <TableHeaderCell className="text-right">Clean Pipeline</TableHeaderCell>
              <TableHeaderCell className="text-right">Won</TableHeaderCell>
              <TableHeaderCell className="text-right">Win Rate</TableHeaderCell>
              <TableHeaderCell className="text-right">At Risk</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence>
              {displayedData.map((rep, index) => {
                const riskPct = rep.pipeline_value > 0
                  ? (rep.at_risk_value / rep.pipeline_value) * 100
                  : 0;
                const riskColor = riskPct > 30 ? 'rose' : riskPct > 15 ? 'amber' : 'emerald';

                return (
                  <motion.tr
                    key={rep.owner_name}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                  >
                    <TableCell>
                      <Flex justifyContent="start" className="space-x-2">
                        {index < 3 && (
                          <Badge color={index === 0 ? 'amber' : index === 1 ? 'gray' : 'orange'} size="xs">
                            #{index + 1}
                          </Badge>
                        )}
                        <Text className="font-medium">{rep.owner_name}</Text>
                      </Flex>
                    </TableCell>
                    <TableCell className="text-right">
                      <Text>{formatCurrency(rep.pipeline_value)}</Text>
                      <Text className="text-gray-400 text-xs">{rep.open_deals} deals</Text>
                    </TableCell>
                    <TableCell className="text-right">
                      <Flex justifyContent="end" className="space-x-2">
                        <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
                        <Text className="text-emerald-600 font-medium">
                          {formatCurrency(rep.clean_pipeline_value)}
                        </Text>
                      </Flex>
                    </TableCell>
                    <TableCell className="text-right">
                      <Text className="font-semibold text-emerald-600">
                        {formatCurrency(rep.won_value)}
                      </Text>
                      <Text className="text-gray-400 text-xs">{rep.won_deals} closed</Text>
                    </TableCell>
                    <TableCell className="text-right">
                      <Flex justifyContent="end" className="space-x-2">
                        <ProgressBar
                          value={rep.win_rate_pct}
                          color={rep.win_rate_pct >= 25 ? 'emerald' : rep.win_rate_pct >= 15 ? 'amber' : 'rose'}
                          className="w-16"
                        />
                        <Text className="font-medium">{rep.win_rate_pct.toFixed(0)}%</Text>
                      </Flex>
                    </TableCell>
                    <TableCell className="text-right">
                      {rep.at_risk_deals > 0 ? (
                        <Flex justifyContent="end" className="space-x-1">
                          <ExclamationTriangleIcon className={`h-4 w-4 text-${riskColor}-500`} />
                          <Text className={`text-${riskColor}-600 font-medium`}>
                            {formatCurrency(rep.at_risk_value)}
                          </Text>
                        </Flex>
                      ) : (
                        <Badge color="emerald" size="sm">None</Badge>
                      )}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Load More / Collapse Buttons */}
      {sortedData.length > INITIAL_DISPLAY_COUNT && (
        <Flex justifyContent="center" className="mt-4 pt-3 border-t border-gray-100 gap-3">
          {hasMore && (
            <button
              onClick={handleShowMore}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronDownIcon className="h-4 w-4" />
              More ({Math.min(LOAD_MORE_COUNT, sortedData.length - displayCount)})
            </button>
          )}
          {isExpanded && (
            <button
              onClick={handleCollapse}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ChevronUpIcon className="h-4 w-4" />
              Collapse
            </button>
          )}
        </Flex>
      )}

      {/* Team Summary - Responsive */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-gray-100">
        <div className="text-center p-2 bg-gray-50 md:bg-transparent rounded-lg">
          <Text className="text-gray-500 text-xs">Team Pipeline</Text>
          <Text className="text-lg font-bold text-gray-900">
            {formatCurrency(teamTotals.pipeline)}
          </Text>
        </div>
        <div className="text-center p-2 bg-emerald-50 md:bg-transparent rounded-lg">
          <Text className="text-gray-500 text-xs">Clean Pipeline</Text>
          <Text className="text-lg font-bold text-emerald-600">
            {formatCurrency(teamTotals.cleanPipeline)}
          </Text>
        </div>
        <div className="text-center p-2 bg-blue-50 md:bg-transparent rounded-lg">
          <Text className="text-gray-500 text-xs">Total Won</Text>
          <Text className="text-lg font-bold text-blue-600">
            {formatCurrency(teamTotals.won)}
          </Text>
        </div>
        <div className="text-center p-2 bg-amber-50 md:bg-transparent rounded-lg">
          <Text className="text-gray-500 text-xs">Total At Risk</Text>
          <Text className="text-lg font-bold text-amber-600">
            {formatCurrency(teamTotals.atRisk)}
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default OwnerLeaderboard;
