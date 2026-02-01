import React, { useEffect, useState } from 'react';
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
  ProgressBar,
} from '@tremor/react';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, fetchStageSlippage } from '../services/api';
import MetricInfo from './MetricInfo';

/**
 * StageSlippageTable Component
 * Shows stage slippage analysis with target vs actual days
 * Click on a row to see the deals that are slipping in that stage
 *
 * Highlights: High Value (>$100K) + High Days (>2x median) + Low Progression
 *
 * Octup Colors: #809292 (primary), #00CBC0 (cyan), #FF3489 (pink)
 */
const StageSlippageTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStages, setExpandedStages] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchStageSlippage();
        setData(result || []);
      } catch (err) {
        console.error('Error loading stage slippage:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Toggle expanded state for a stage
  const toggleStage = (stageName) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageName]: !prev[stageName]
    }));
  };

  // Calculate slippage ratio for progress bar
  const getSlippageRatio = (current, target) => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 200);
  };

  // Get slippage severity badge
  const getSlippageBadge = (current, target) => {
    if (!target || target === 0) return { color: 'gray', text: 'N/A' };
    const ratio = current / target;

    if (ratio <= 1) {
      return { color: 'emerald', text: 'On Track' };
    } else if (ratio <= 1.5) {
      return { color: 'amber', text: 'Slipping' };
    } else if (ratio <= 2) {
      return { color: 'orange', text: 'At Risk' };
    } else {
      return { color: 'red', text: 'Critical' };
    }
  };

  // Get progress bar color based on ratio
  const getProgressColor = (current, target) => {
    if (!target || target === 0) return 'gray';
    const ratio = current / target;

    if (ratio <= 1) return 'emerald';
    if (ratio <= 1.5) return 'amber';
    if (ratio <= 2) return 'orange';
    return 'red';
  };

  // Get priority badge color
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL': return { color: 'red', text: 'Critical' };
      case 'HIGH': return { color: 'orange', text: 'High' };
      case 'MEDIUM': return { color: 'amber', text: 'Medium' };
      default: return { color: 'gray', text: 'Low' };
    }
  };

  // Calculate total slipping value
  const totalSlippingValue = data.reduce((sum, row) => sum + (row.slipping_value || 0), 0);
  const totalSlippingCount = data.reduce((sum, row) => sum + (row.slipping_deal_count || 0), 0);

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
        <Flex justifyContent="start" alignItems="center" className="gap-2">
          <ClockIcon className="h-5 w-5 text-[#FF3489]" />
          <Title>Stage Slippage Analysis</Title>
        </Flex>
        <div className="mt-6 h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00CBC0]"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
        <Flex justifyContent="start" alignItems="center" className="gap-2">
          <ClockIcon className="h-5 w-5 text-[#FF3489]" />
          <Title>Stage Slippage Analysis</Title>
        </Flex>
        <Text className="text-red-500 mt-4">Error loading data: {error}</Text>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
        <Flex justifyContent="start" alignItems="center" className="gap-2">
          <ClockIcon className="h-5 w-5 text-[#FF3489]" />
          <Title>Stage Slippage Analysis</Title>
        </Flex>
        <Text className="text-gray-500 mt-4">No stage slippage data available</Text>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Flex justifyContent="start" alignItems="center" className="gap-2">
            <ClockIcon className="h-5 w-5 text-[#FF3489]" />
            <Title>Stage Slippage Analysis</Title>
            <MetricInfo id="Stage Slippage" />
          </Flex>
          <Text className="mt-1">Deals exceeding target stage duration</Text>
        </div>
        {totalSlippingCount > 0 && (
          <Flex className="gap-4" alignItems="center">
            <div className="text-right">
              <Text className="text-xs text-gray-500">Total Slipping</Text>
              <Text className="font-bold text-[#FF3489]">{totalSlippingCount} deals</Text>
            </div>
            <div className="text-right">
              <Text className="text-xs text-gray-500">At Risk Value</Text>
              <Text className="font-bold text-[#FF3489]">{formatCurrency(totalSlippingValue)}</Text>
            </div>
          </Flex>
        )}
      </Flex>

      <Table className="mt-6">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Stage</TableHeaderCell>
            <TableHeaderCell className="text-right">Avg Days</TableHeaderCell>
            <TableHeaderCell className="text-right">Target Days</TableHeaderCell>
            <TableHeaderCell>Progress</TableHeaderCell>
            <TableHeaderCell className="text-center">Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Slipping Deals</TableHeaderCell>
            <TableHeaderCell className="text-right">Value at Risk</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, idx) => {
            const badge = getSlippageBadge(row.current_avg_days, row.median_target_days);
            const progressColor = getProgressColor(row.current_avg_days, row.median_target_days);
            const isHighPriority = row.highlight_priority === 'HIGH';
            const isExpanded = expandedStages[row.stage_name];
            const hasDeals = row.top_slipping_deals && row.top_slipping_deals.length > 0;
            const slippingDeals = row.top_slipping_deals || [];

            return (
              <React.Fragment key={idx}>
                <TableRow
                  className={`
                    ${isHighPriority ? 'bg-red-50/50' : 'hover:bg-gray-50'}
                    ${hasDeals ? 'cursor-pointer' : ''}
                    transition-colors duration-150
                  `}
                  onClick={() => hasDeals && toggleStage(row.stage_name)}
                >
                  <TableCell>
                    <Flex className="gap-2" alignItems="center">
                      {hasDeals && (
                        <motion.div
                          initial={false}
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        </motion.div>
                      )}
                      {isHighPriority && (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                      )}
                      <Text className={`font-medium ${isHighPriority ? 'text-red-700' : 'text-gray-900'}`}>
                        {row.stage_name}
                      </Text>
                    </Flex>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className={row.current_avg_days > row.median_target_days ? 'text-red-600 font-semibold' : ''}>
                      {row.current_avg_days?.toFixed(0) || 0} days
                    </Text>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className="text-gray-600">
                      {row.median_target_days?.toFixed(0) || 0} days
                    </Text>
                  </TableCell>
                  <TableCell>
                    <div className="w-32">
                      <ProgressBar
                        value={Math.min(getSlippageRatio(row.current_avg_days, row.median_target_days), 100)}
                        color={progressColor}
                        showAnimation={true}
                      />
                      <Text className="text-xs text-gray-500 mt-1">
                        {((row.current_avg_days / row.median_target_days) * 100).toFixed(0)}% of target
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color={badge.color} size="sm">
                      {badge.text}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className={row.slipping_deal_count > 0 ? 'text-[#FF3489] font-semibold' : 'text-gray-500'}>
                      {row.slipping_deal_count || 0}
                    </Text>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className={row.slipping_value > 50000 ? 'text-[#FF3489] font-semibold' : 'text-gray-700'}>
                      {formatCurrency(row.slipping_value || 0)}
                    </Text>
                  </TableCell>
                </TableRow>

                {/* Expanded Deals Section */}
                <AnimatePresence>
                  {isExpanded && hasDeals && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0 border-0">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="bg-gray-50/80 border-t border-b border-gray-200 px-4 py-3 ml-8">
                            <Text className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                              Slipping Deals in {row.stage_name}
                            </Text>
                            <div className="space-y-2">
                              {slippingDeals.map((deal, dealIdx) => {
                                const priorityBadge = getPriorityBadge(deal.highlight_priority);
                                return (
                                  <motion.div
                                    key={deal.hs_object_id || dealIdx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: dealIdx * 0.05 }}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-[#00CBC0]/30 hover:shadow-sm transition-all"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="flex-1 min-w-0">
                                        <Text className="font-medium text-gray-900 truncate">
                                          {deal.dealname}
                                        </Text>
                                        <Flex className="gap-2 mt-1" alignItems="center">
                                          <UserIcon className="h-3 w-3 text-gray-400" />
                                          <Text className="text-xs text-gray-500">
                                            {deal.owner_name || 'Unassigned'}
                                          </Text>
                                        </Flex>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="text-right">
                                        <Text className="text-xs text-gray-500">Days in Stage</Text>
                                        <Text className="font-semibold text-red-600">
                                          {deal.days_in_current_stage} days
                                        </Text>
                                      </div>
                                      <div className="text-right">
                                        <Text className="text-xs text-gray-500">Over by</Text>
                                        <Text className="font-semibold text-amber-600">
                                          +{deal.days_over_median} days
                                        </Text>
                                      </div>
                                      <div className="text-right min-w-[80px]">
                                        <Text className="text-xs text-gray-500">ARR Value</Text>
                                        <Text className="font-bold text-[#00CBC0]">
                                          {formatCurrency(deal.arr_value)}
                                        </Text>
                                      </div>
                                      <Badge color={priorityBadge.color} size="sm">
                                        {priorityBadge.text}
                                      </Badge>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                            {row.slipping_deal_count > slippingDeals.length && (
                              <Text className="text-xs text-gray-400 mt-3 text-center">
                                Showing top {slippingDeals.length} of {row.slipping_deal_count} slipping deals
                              </Text>
                            )}
                          </div>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>

      {/* Legend */}
      <Flex className="mt-4 pt-4 border-t border-gray-100 gap-4" justifyContent="center">
        <Flex className="gap-1" alignItems="center">
          <Badge color="emerald" size="xs">On Track</Badge>
          <Text className="text-xs text-gray-500">≤100%</Text>
        </Flex>
        <Flex className="gap-1" alignItems="center">
          <Badge color="amber" size="xs">Slipping</Badge>
          <Text className="text-xs text-gray-500">100-150%</Text>
        </Flex>
        <Flex className="gap-1" alignItems="center">
          <Badge color="orange" size="xs">At Risk</Badge>
          <Text className="text-xs text-gray-500">150-200%</Text>
        </Flex>
        <Flex className="gap-1" alignItems="center">
          <Badge color="red" size="xs">Critical</Badge>
          <Text className="text-xs text-gray-500">&gt;200%</Text>
        </Flex>
      </Flex>

      {/* Click hint */}
      <Text className="text-xs text-gray-400 text-center mt-2">
        Click on a stage row to see individual deals
      </Text>
    </Card>
  );
};

export default StageSlippageTable;
