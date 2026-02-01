import React, { useMemo, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Flex,
  Metric,
  Grid,
} from '@tremor/react';
import { CalendarDaysIcon, ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../services/api';
import { MetricInfoIcon } from './MetricTooltip';

const INITIAL_DISPLAY_COUNT = 5;
const LOAD_MORE_COUNT = 5;

/**
 * CloseDateSlippage Component
 * Displays deals with pushed close dates
 * Source: v_close_date_slippage
 *
 * Mobile-optimized with card view
 */
const CloseDateSlippage = ({ data }) => {
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, totalValue: 0, avgSlip: 0, majorCount: 0 };
    }

    const slippedDeals = data.filter(d => d.days_slipped > 0);
    const totalValue = slippedDeals.reduce((sum, d) => sum + d.amount, 0);
    const avgSlip = slippedDeals.length > 0
      ? slippedDeals.reduce((sum, d) => sum + d.days_slipped, 0) / slippedDeals.length
      : 0;
    const majorCount = slippedDeals.filter(d => d.slippage_category?.includes('Major')).length;

    return {
      total: slippedDeals.length,
      totalValue,
      avgSlip: Math.round(avgSlip),
      majorCount,
    };
  }, [data]);

  // Color mapping for slippage categories
  const categoryColors = {
    'Major Slip (30+ days)': 'red',
    'Moderate Slip (14-30 days)': 'amber',
    'Minor Slip (1-14 days)': 'yellow',
    'Pulled In': 'emerald',
    'No Change': 'gray',
  };

  // Format date
  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    try {
      const date = new Date(dateValue.value || dateValue);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '-';
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <Flex alignItems="center" className="gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
          <Title>Close Date Slippage</Title>
          <MetricInfoIcon metricKey="Close Date Slippage" size="sm" />
        </Flex>
        <Text className="text-gray-500 mt-2">No slippage data available</Text>
      </Card>
    );
  }

  // Filter to only show slipped deals (days_slipped > 0)
  const slippedDeals = data.filter(d => d.days_slipped > 0);

  // Paginated data
  const displayedData = slippedDeals.slice(0, displayCount);
  const hasMore = displayCount < slippedDeals.length;
  const isExpanded = displayCount > INITIAL_DISPLAY_COUNT;

  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + LOAD_MORE_COUNT, slippedDeals.length));
  };

  const handleCollapse = () => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  return (
    <Card>
      <Flex alignItems="center" className="gap-2 mb-4">
        <CalendarDaysIcon className="h-5 w-5 text-amber-500" />
        <Title className="text-base sm:text-lg">Close Date Slippage</Title>
        <MetricInfoIcon metricKey="Close Date Slippage" size="sm" />
      </Flex>
      <Text className="text-xs sm:text-sm text-gray-500">Deals with pushed close dates</Text>

      {/* Summary Stats - Responsive grid */}
      <Grid numItems={2} numItemsSm={2} numItemsLg={4} className="gap-3 sm:gap-4 mt-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Text className="text-gray-500 text-xs">Slipped</Text>
          <Metric className="text-lg sm:text-2xl tabular-nums">{stats.total}</Metric>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-lg">
          <Text className="text-gray-500 text-xs">Value</Text>
          <Metric className="text-lg sm:text-2xl text-amber-600 tabular-nums">{formatCurrency(stats.totalValue)}</Metric>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Text className="text-gray-500 text-xs">Avg Days</Text>
          <Metric className="text-lg sm:text-2xl tabular-nums">{stats.avgSlip}d</Metric>
        </div>
        <div className="text-center p-2 bg-red-50 rounded-lg">
          <Text className="text-gray-500 text-xs">Major (30+)</Text>
          <Metric className="text-lg sm:text-2xl text-red-600 tabular-nums">{stats.majorCount}</Metric>
        </div>
      </Grid>

      {/* Mobile Card View - Shows on screens < 768px */}
      <div className="block md:hidden space-y-3 mt-4 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {displayedData.map((row, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: idx >= displayCount - LOAD_MORE_COUNT ? (idx % LOAD_MORE_COUNT) * 0.03 : 0 }}
              className="p-3 rounded-xl border border-gray-200 bg-white"
            >
              {/* Deal Name & Amount */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  {row.hubspot_url ? (
                    <a
                      href={row.hubspot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium text-sm truncate block"
                    >
                      {row.dealname}
                    </a>
                  ) : (
                    <Text className="font-medium text-sm truncate">{row.dealname}</Text>
                  )}
                  <Text className="text-xs text-gray-500">{row.owner_name}</Text>
                </div>
                <Text className="font-semibold text-sm ml-2 tabular-nums">{formatCurrency(row.amount)}</Text>
              </div>

              {/* Date Change */}
              <div className="flex items-center gap-2 mb-2 bg-gray-50 rounded-lg px-2 py-1.5">
                <Text className="text-xs text-gray-500">{formatDate(row.prev_closedate)}</Text>
                <ArrowRightIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <Text className="text-xs font-medium">{formatDate(row.curr_closedate)}</Text>
                <Text className={`text-xs font-bold ml-auto ${row.days_slipped > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                  +{row.days_slipped}d
                </Text>
              </div>

              {/* Category Badge */}
              <Badge color={categoryColors[row.slippage_category] || 'gray'} size="sm">
                {row.slippage_category?.replace(/\s*\([^)]*\)/, '') || 'Unknown'}
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block max-h-[400px] overflow-y-auto mt-6">
        <Table>
          <TableHead className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHeaderCell>Deal</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Amount</TableHeaderCell>
              <TableHeaderCell>Date Change</TableHeaderCell>
              <TableHeaderCell className="text-right">Days</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence>
              {displayedData.map((row, idx) => (
                <motion.tr
                  key={idx}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: idx >= displayCount - LOAD_MORE_COUNT ? (idx % LOAD_MORE_COUNT) * 0.03 : 0 }}
                >
                  <TableCell>
                    {row.hubspot_url ? (
                      <a
                        href={row.hubspot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {row.dealname}
                      </a>
                    ) : (
                      <Text className="font-medium">{row.dealname}</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    <Text>{row.owner_name}</Text>
                  </TableCell>
                  <TableCell>
                    <Text className="font-medium tabular-nums">{formatCurrency(row.amount)}</Text>
                  </TableCell>
                  <TableCell>
                    <Flex alignItems="center" className="gap-1">
                      <Text className="text-gray-500">{formatDate(row.prev_closedate)}</Text>
                      <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                      <Text>{formatDate(row.curr_closedate)}</Text>
                    </Flex>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className={row.days_slipped > 30 ? 'text-red-600 font-bold' : 'text-amber-600'}>
                      +{row.days_slipped}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge color={categoryColors[row.slippage_category] || 'gray'}>
                      {row.slippage_category?.replace(/\s*\([^)]*\)/, '') || 'Unknown'}
                    </Badge>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Load More / Collapse Buttons */}
      {slippedDeals.length > INITIAL_DISPLAY_COUNT && (
        <Flex justifyContent="center" className="mt-4 pt-3 border-t border-gray-100 gap-3">
          {hasMore && (
            <button
              onClick={handleShowMore}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronDownIcon className="h-4 w-4" />
              More ({Math.min(LOAD_MORE_COUNT, slippedDeals.length - displayCount)})
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

      {/* Row count on mobile */}
      <Text className="text-gray-500 text-xs mt-3 text-center md:hidden">
        Showing {Math.min(displayCount, slippedDeals.length)} of {slippedDeals.length}
      </Text>
    </Card>
  );
};

export default CloseDateSlippage;
