import React, { useState, useEffect, useCallback } from 'react';
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
  TextInput,
  Select,
  SelectItem,
} from '@tremor/react';
import {
  TrophyIcon,
  UserIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { MetricInfoIcon } from './MetricTooltip';
import { fetchSDRLeaderboard, fetchSDRAvailableWeeks, fetchSDRDeals } from '../services/api';

const INITIAL_DISPLAY_COUNT = 10;
const LOAD_MORE_COUNT = 10;

/**
 * SDR Leaderboard Component
 * Shows SDR performance rankings with NBM deals created, meetings held, and at-risk metrics
 * Features: Week picker, Load More pattern, sticky headers, search, deal drill-down
 *
 * Note: "NBM Deals" replaced "Meetings Booked" because HubSpot doesn't track
 * who booked a meeting separately from whose calendar it's on.
 * NBM Deals = deals entering "NBM Scheduled" stage (proxy for SDR activity)
 */
const SDRLeaderboard = ({ data: initialData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState(initialData || []);
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSDR, setSelectedSDR] = useState(null);
  const [sdrDeals, setSDRDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);

  // Fetch available weeks on mount
  useEffect(() => {
    const loadAvailableWeeks = async () => {
      try {
        const weeks = await fetchSDRAvailableWeeks();
        setAvailableWeeks(weeks);
        // Set default to first week if available
        if (weeks.length > 0 && !selectedWeek) {
          setSelectedWeek(weeks[0].week_start);
        }
      } catch (err) {
        console.error('Error loading available weeks:', err);
      }
    };
    loadAvailableWeeks();
  }, []);

  // Fetch leaderboard data when week changes
  useEffect(() => {
    const loadLeaderboardData = async () => {
      if (!selectedWeek) return;

      setIsLoading(true);
      try {
        const data = await fetchSDRLeaderboard(selectedWeek);
        setLeaderboardData(data);
      } catch (err) {
        console.error('Error loading leaderboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedWeek) {
      loadLeaderboardData();
    }
  }, [selectedWeek]);

  // Helper to extract date string from BigQuery date format
  const extractDateString = (dateValue) => {
    if (!dateValue) return null;
    // Handle BigQuery object format {value: "2026-01-26"}
    if (typeof dateValue === 'object' && dateValue.value) {
      return dateValue.value;
    }
    // Handle string format "2026-01-26"
    if (typeof dateValue === 'string') {
      return dateValue.split('T')[0]; // Handle ISO strings too
    }
    return null;
  };

  // Update leaderboard data when initialData changes
  useEffect(() => {
    if (initialData && initialData.length > 0 && !selectedWeek) {
      setLeaderboardData(initialData);
      // Set selected week from initial data if available
      if (initialData[0]?.week_start) {
        const weekStr = extractDateString(initialData[0].week_start);
        if (weekStr) {
          setSelectedWeek(weekStr);
        }
      }
    }
  }, [initialData]);

  // Handle clicking on NBM Deals count
  const handleNBMClick = useCallback(async (sdr) => {
    if (!sdr.nbm_deals_created && !sdr.meetings_booked_count) return;

    setSelectedSDR(sdr);
    setIsModalOpen(true);
    setIsLoadingDeals(true);

    try {
      // Get the week start, handling both string and object formats
      let weekStart = selectedWeek;
      if (!weekStart && leaderboardData[0]?.week_start) {
        const ws = leaderboardData[0].week_start;
        weekStart = typeof ws === 'object' && ws.value ? ws.value : ws;
      }
      if (weekStart) {
        const deals = await fetchSDRDeals(sdr.sdr_name, weekStart);
        setSDRDeals(deals);
      } else {
        setSDRDeals([]);
      }
    } catch (err) {
      console.error('Error loading SDR deals:', err);
      setSDRDeals([]);
    } finally {
      setIsLoadingDeals(false);
    }
  }, [selectedWeek, leaderboardData]);

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSDR(null);
    setSDRDeals([]);
  };

  // Format week for display
  const formatWeekDisplay = (dateValue) => {
    if (!dateValue) return '';
    // Handle BigQuery object format
    const dateStr = typeof dateValue === 'object' && dateValue.value
      ? dateValue.value
      : dateValue;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const data = leaderboardData;

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white">
        <Flex justifyContent="start" className="space-x-2 mb-4">
          <TrophyIcon className="h-5 w-5 text-amber-500" />
          <Title>SDR Leaderboard</Title>
          <MetricInfoIcon metricKey="SDR Leaderboard" size="sm" />
        </Flex>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <PhoneIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <Text>No SDR data available</Text>
          </div>
        </div>
      </Card>
    );
  }

  // Filter data by search term
  const filteredData = data.filter(sdr =>
    !searchTerm ||
    sdr.sdr_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sdr.sdr_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated data for display
  const displayedData = filteredData.slice(0, displayCount);
  const hasMore = displayCount < filteredData.length;
  const isExpanded = displayCount > INITIAL_DISPLAY_COUNT;

  // Handle Load More
  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + LOAD_MORE_COUNT, filteredData.length));
  };

  // Handle Collapse
  const handleCollapse = () => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value?.toLocaleString() || 0}`;
  };

  // Get rank badge color
  const getRankBadge = (rank) => {
    if (rank === 1) return { color: 'amber', icon: '1st' };
    if (rank === 2) return { color: 'gray', icon: '2nd' };
    if (rank === 3) return { color: 'orange', icon: '3rd' };
    return { color: 'slate', icon: `${rank}th` };
  };

  return (
    <>
      <Card className="bg-white">
        <div className="mb-4 space-y-3">
          {/* Header */}
          <Flex justifyContent="start" className="space-x-2">
            <TrophyIcon className="h-5 w-5 text-amber-500" />
            <div>
              <Flex alignItems="center" className="gap-1.5">
                <Title>SDR Leaderboard</Title>
                <MetricInfoIcon metricKey="SDR Leaderboard" size="sm" />
              </Flex>
              <Text className="text-gray-500">Weekly performance rankings</Text>
            </div>
          </Flex>

          {/* Filters - Responsive */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
            <TextInput
              icon={MagnifyingGlassIcon}
              placeholder="Search SDRs..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDisplayCount(INITIAL_DISPLAY_COUNT);
              }}
              className="w-full sm:w-40"
            />

            {/* Week Picker */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              <Select
                value={selectedWeek}
                onValueChange={setSelectedWeek}
                placeholder="Select week..."
                className="w-full sm:w-48"
                disabled={isLoading || availableWeeks.length === 0}
              >
                {availableWeeks.map((week) => (
                  <SelectItem key={week.week_start} value={week.week_start}>
                    Week of {formatWeekDisplay(week.week_start)}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {isLoading && (
              <Badge color="blue" size="sm">Loading...</Badge>
            )}
          </div>
        </div>

        {/* Row Count Display */}
        <Text className="text-sm text-gray-500 mb-3">
          Showing {Math.min(displayCount, filteredData.length)} of {filteredData.length} SDRs
        </Text>

        {/* Mobile Card View - Shows on screens < 768px */}
        <div className="block md:hidden space-y-3 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {displayedData.map((sdr, index) => {
              const rankInfo = getRankBadge(sdr.rank_by_meetings_held);
              const heldRateColor = sdr.held_rate_pct >= 70 ? 'emerald' : sdr.held_rate_pct >= 50 ? 'amber' : 'rose';
              const nbmCount = sdr.nbm_deals_created || sdr.meetings_booked_count || 0;

              return (
                <motion.div
                  key={sdr.sdr_name}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                  className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all"
                >
                  {/* SDR Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge color={rankInfo.color} size="sm">{rankInfo.icon}</Badge>
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <Text className="font-semibold text-gray-900">{sdr.sdr_name}</Text>
                      </div>
                    </div>
                    {sdr.at_risk_deals_count > 0 ? (
                      <Flex justifyContent="end" className="space-x-1">
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                        <Text className="text-xs text-amber-600 font-medium">{sdr.at_risk_deals_count}</Text>
                      </Flex>
                    ) : (
                      <Badge color="emerald" size="sm">Clean</Badge>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`text-center p-2 bg-gray-50 rounded-lg ${nbmCount > 0 ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                      onClick={() => nbmCount > 0 && handleNBMClick(sdr)}
                    >
                      <Text className="text-xs text-gray-500">NBM Deals</Text>
                      <Text className={`text-lg font-bold ${nbmCount > 0 ? 'text-blue-600 underline' : 'text-gray-900'}`}>
                        {nbmCount}
                      </Text>
                    </div>
                    <div className="text-center p-2 bg-emerald-50 rounded-lg">
                      <Text className="text-xs text-gray-500">Held</Text>
                      <Text className="text-lg font-bold text-emerald-600">{sdr.meetings_held_count}</Text>
                    </div>
                  </div>

                  {/* Held Rate Progress */}
                  <div className="mt-3">
                    <Flex justifyContent="between" className="mb-1">
                      <Text className="text-xs text-gray-500">Held Rate</Text>
                      <Text className={`text-xs font-semibold text-${heldRateColor}-600`}>
                        {sdr.held_rate_pct.toFixed(0)}%
                      </Text>
                    </Flex>
                    <ProgressBar value={sdr.held_rate_pct} color={heldRateColor} />
                  </div>

                  {/* Pipeline */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <Text className="text-xs text-gray-500">Pipeline ARR</Text>
                    <Text className="font-semibold text-gray-900">{formatCurrency(sdr.total_pipeline_arr)}</Text>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Table with Sticky Headers - Hidden on mobile */}
        <div className="hidden md:block max-h-[400px] overflow-y-auto relative">
          <Table>
            <TableHead className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHeaderCell>Rank</TableHeaderCell>
                <TableHeaderCell>SDR</TableHeaderCell>
                <TableHeaderCell className="text-right" title="NBM Deals = Deals entering NBM Scheduled stage this week">NBM Deals</TableHeaderCell>
                <TableHeaderCell className="text-right">Held</TableHeaderCell>
                <TableHeaderCell className="text-right">Held Rate</TableHeaderCell>
                <TableHeaderCell className="text-right">Pipeline ARR</TableHeaderCell>
                <TableHeaderCell className="text-right">At Risk</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence>
                {displayedData.map((sdr, index) => {
                  const rankInfo = getRankBadge(sdr.rank_by_meetings_held);
                  const heldRateColor = sdr.held_rate_pct >= 70 ? 'emerald' : sdr.held_rate_pct >= 50 ? 'amber' : 'rose';
                  const nbmCount = sdr.nbm_deals_created || sdr.meetings_booked_count || 0;

                  return (
                    <motion.tr
                      key={sdr.sdr_name}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <TableCell>
                        <Badge color={rankInfo.color} size="sm">
                          {rankInfo.icon}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Flex justifyContent="start" className="space-x-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <Text className="font-medium">{sdr.sdr_name}</Text>
                        </Flex>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => nbmCount > 0 && handleNBMClick(sdr)}
                          className={`font-semibold tabular-nums ${nbmCount > 0 ? 'text-blue-600 hover:text-blue-800 underline cursor-pointer' : 'text-gray-900 cursor-default'}`}
                          disabled={nbmCount === 0}
                        >
                          {nbmCount}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Text className="font-semibold text-emerald-600 tabular-nums">{sdr.meetings_held_count}</Text>
                      </TableCell>
                      <TableCell className="text-right">
                        <Flex justifyContent="end" className="space-x-2">
                          <ProgressBar
                            value={sdr.held_rate_pct}
                            color={heldRateColor}
                            className="w-16"
                          />
                          <Text className={`font-medium tabular-nums text-${heldRateColor}-600`}>
                            {sdr.held_rate_pct.toFixed(0)}%
                          </Text>
                        </Flex>
                      </TableCell>
                      <TableCell className="text-right">
                        <Text className="font-medium tabular-nums">{formatCurrency(sdr.total_pipeline_arr)}</Text>
                      </TableCell>
                      <TableCell className="text-right">
                        {sdr.at_risk_deals_count > 0 ? (
                          <Flex justifyContent="end" className="space-x-1">
                            <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                            <Text className="text-amber-600 font-medium">
                              {sdr.at_risk_deals_count} ({formatCurrency(sdr.at_risk_value)})
                            </Text>
                          </Flex>
                        ) : (
                          <Badge color="emerald" size="sm">Clean</Badge>
                        )}
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>

        {/* Load More / Collapse Buttons - Touch-optimized on mobile */}
        {filteredData.length > INITIAL_DISPLAY_COUNT && (
          <Flex justifyContent="center" className="mt-4 pt-4 border-t border-gray-100 gap-3">
            {hasMore && (
              <button
                onClick={handleShowMore}
                className="flex items-center gap-2 px-4 py-3 md:py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl md:rounded-lg transition-colors min-h-[44px] active:scale-[0.98]"
              >
                <ChevronDownIcon className="h-5 w-5 md:h-4 md:w-4" />
                Show More ({Math.min(LOAD_MORE_COUNT, filteredData.length - displayCount)} more)
              </button>
            )}
            {isExpanded && (
              <button
                onClick={handleCollapse}
                className="flex items-center gap-2 px-4 py-3 md:py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl md:rounded-lg transition-colors min-h-[44px] active:scale-[0.98]"
              >
                <ChevronUpIcon className="h-5 w-5 md:h-4 md:w-4" />
                Collapse
              </button>
            )}
          </Flex>
        )}

        {/* Summary Stats - Responsive grid with tabular numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 pt-4 border-t border-gray-100">
          <div className="text-center p-2 md:p-0 bg-gray-50 md:bg-transparent rounded-lg md:rounded-none">
            <Text className="text-gray-500 text-xs">Total NBM Deals</Text>
            <Text className="text-lg md:text-xl font-bold text-gray-900 tabular-nums">
              {data.reduce((sum, s) => sum + (s.nbm_deals_created || s.meetings_booked_count || 0), 0)}
            </Text>
          </div>
          <div className="text-center p-2 md:p-0 bg-emerald-50 md:bg-transparent rounded-lg md:rounded-none">
            <Text className="text-gray-500 text-xs">Total Held</Text>
            <Text className="text-lg md:text-xl font-bold text-emerald-600 tabular-nums">
              {data.reduce((sum, s) => sum + s.meetings_held_count, 0)}
            </Text>
          </div>
          <div className="text-center p-2 md:p-0 bg-blue-50 md:bg-transparent rounded-lg md:rounded-none">
            <Text className="text-gray-500 text-xs">Avg Held Rate</Text>
            <Text className="text-lg md:text-xl font-bold text-blue-600 tabular-nums">
              {(data.reduce((sum, s) => sum + s.held_rate_pct, 0) / data.length).toFixed(0)}%
            </Text>
          </div>
          <div className="text-center p-2 md:p-0 bg-gray-50 md:bg-transparent rounded-lg md:rounded-none">
            <Text className="text-gray-500 text-xs">Total Pipeline</Text>
            <Text className="text-lg md:text-xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(data.reduce((sum, s) => sum + s.total_pipeline_arr, 0))}
            </Text>
          </div>
        </div>
      </Card>

      {/* Deal Drill-Down Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <Title className="text-lg">NBM Deals - {selectedSDR?.sdr_name}</Title>
                  <Text className="text-gray-500">
                    Week of {formatWeekDisplay(selectedWeek || leaderboardData[0]?.week_start)}
                  </Text>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {isLoadingDeals ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <Text className="text-gray-500">Loading deals...</Text>
                    </div>
                  </div>
                ) : sdrDeals.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Text className="text-gray-500">No deals found for this week</Text>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sdrDeals.map((deal, index) => (
                      <motion.div
                        key={deal.deal_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <Text className="font-semibold text-gray-900 truncate">
                              {deal.deal_name}
                            </Text>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge color="blue" size="sm">{deal.stage}</Badge>
                              <Text className="text-xs text-gray-500">
                                {deal.transition_date && new Date(deal.transition_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Text>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <Text className="font-bold text-gray-900 tabular-nums">
                              {formatCurrency(deal.arr_value)}
                            </Text>
                            {deal.hubspot_url && (
                              <a
                                href={deal.hubspot_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Open in HubSpot"
                              >
                                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Summary */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <Flex justifyContent="between">
                        <Text className="font-medium text-gray-600">Total ARR</Text>
                        <Text className="font-bold text-gray-900 tabular-nums">
                          {formatCurrency(sdrDeals.reduce((sum, d) => sum + (d.arr_value || 0), 0))}
                        </Text>
                      </Flex>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SDRLeaderboard;
