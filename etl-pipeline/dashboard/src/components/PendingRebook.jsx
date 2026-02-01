import React, { useState } from 'react';
import {
  Card,
  Title,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Flex,
  Text,
  Callout,
} from '@tremor/react';
import {
  CalendarIcon,
  PhoneIcon,
  ArrowPathIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../services/api';

const INITIAL_DISPLAY_COUNT = 8;
const LOAD_MORE_COUNT = 8;

/**
 * PendingRebook Component
 * Displays deals pending rebook (primarily Chanan's queue)
 *
 * Important: These are NOT at-risk deals!
 * is_pending_rebook = TRUE means the meeting was no-show/canceled
 * and needs to be rescheduled. This is a separate operational queue.
 *
 * Features:
 * - Load More pagination (8 items)
 * - Mobile card view
 * - Brand Pink (#FF3489) for 30+ days untouched
 * - Prominent Schedule/Re-engage buttons
 */
const PendingRebook = ({ data }) => {
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  if (!data || data.length === 0) return null;

  // Calculate total ARR pending rebook
  const totalPendingARR = data.reduce((sum, d) => sum + d.arr_value, 0);

  // Sort by days since meeting (oldest first - needs attention)
  const sortedData = [...data].sort(
    (a, b) => b.days_in_current_stage - a.days_in_current_stage
  );

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

  // Check if deal is critically overdue (30+ days)
  const isCritical = (days) => days >= 30;

  // Get urgency badge based on days waiting
  const getUrgencyBadge = (days, attempts) => {
    if (isCritical(days)) {
      return (
        <Badge
          size="sm"
          icon={ClockIcon}
          style={{ backgroundColor: '#FF3489', color: 'white' }}
        >
          Critical
        </Badge>
      );
    }
    if (days >= 5 || attempts >= 2) {
      return (
        <Badge color="amber" size="sm" icon={ClockIcon}>
          Urgent
        </Badge>
      );
    }
    if (days >= 3) {
      return (
        <Badge color="yellow" size="sm">
          Follow Up
        </Badge>
      );
    }
    return (
      <Badge color="gray" size="sm">
        New
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (stage) => {
    if (stage?.includes('No-Show')) {
      return <Badge color="red" size="sm">No-Show</Badge>;
    }
    if (stage?.includes('Canceled')) {
      return <Badge color="amber" size="sm">Canceled</Badge>;
    }
    return <Badge color="gray" size="sm">{stage}</Badge>;
  };

  // Format date
  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '-';
    }
  };

  return (
    <Card className="border-l-4 border-l-amber-400 bg-amber-50/30">
      <Flex justifyContent="between" alignItems="start" className="mb-4">
        <div>
          <Flex justifyContent="start" className="space-x-2">
            <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            <Title className="text-amber-900 text-base sm:text-lg">Pending Rebook Queue</Title>
          </Flex>
          <Text className="mt-1 text-amber-700 text-xs sm:text-sm">
            {data.length} meetings need rescheduling ({formatCurrency(totalPendingARR)} ARR)
          </Text>
        </div>

        <Badge color="amber" size="sm" className="hidden sm:flex">
          Chanan's Queue
        </Badge>
      </Flex>

      <Callout
        title="Not At Risk"
        color="blue"
        className="mb-4 text-xs sm:text-sm"
      >
        These deals are in the rebook queue, not the risk category. Focus on
        scheduling follow-up meetings rather than deal recovery.
      </Callout>

      {/* Row Count Display */}
      <Text className="text-xs sm:text-sm text-gray-600 mb-3">
        Showing {Math.min(displayCount, sortedData.length)} of {sortedData.length} pending rebooks
      </Text>

      {/* Mobile Card View - Shows on screens < 768px */}
      <div className="block md:hidden space-y-3 max-h-[500px] overflow-y-auto">
        <AnimatePresence>
          {displayedData.map((deal, index) => {
            const critical = isCritical(deal.days_in_current_stage);

            return (
              <motion.div
                key={deal.deal_id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                className={`p-3 rounded-xl border ${
                  critical
                    ? 'border-[#FF3489]/50 bg-[#FF3489]/5'
                    : 'border-amber-200 bg-white'
                }`}
              >
                {/* Header: Deal Name & Priority */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <Text className="font-medium text-gray-900 text-sm truncate">
                      {deal.dealname}
                    </Text>
                    <Text className="text-xs text-gray-500 truncate">
                      {deal.company_name}
                    </Text>
                  </div>
                  {getUrgencyBadge(deal.days_in_current_stage, deal.rebook_attempts)}
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                    <Text className="text-[10px] text-gray-500">ARR</Text>
                    <Text className="text-xs font-semibold">{formatCurrency(deal.arr_value)}</Text>
                  </div>
                  <div className={`text-center p-1.5 rounded-lg ${critical ? 'bg-[#FF3489]/10' : 'bg-amber-50'}`}>
                    <Text className="text-[10px] text-gray-500">Waiting</Text>
                    <Text className={`text-xs font-bold ${critical ? 'text-[#FF3489]' : 'text-amber-600'}`}>
                      {deal.days_in_current_stage}d
                    </Text>
                  </div>
                  <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                    <Text className="text-[10px] text-gray-500">Attempts</Text>
                    <Text className={`text-xs font-semibold ${deal.rebook_attempts >= 2 ? 'text-red-600' : ''}`}>
                      {deal.rebook_attempts}
                    </Text>
                  </div>
                </div>

                {/* Status & Original Meeting */}
                <div className="flex items-center justify-between mb-3">
                  {getStatusBadge(deal.deal_stage_label)}
                  <Text className="text-xs text-gray-500">
                    Meeting: {formatDate(deal.original_meeting_date)}
                  </Text>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <a
                    href={deal.hubspot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all active:scale-95 ${
                      critical
                        ? 'bg-[#FF3489] text-white hover:bg-[#e02d78]'
                        : 'bg-[#809292] text-white hover:bg-[#6a7a7a]'
                    }`}
                  >
                    <CalendarDaysIcon className="h-4 w-4" />
                    Re-engage
                  </a>
                  <button
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors active:scale-95"
                    title="Schedule Call"
                  >
                    <PhoneIcon className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block max-h-[500px] overflow-y-auto">
        <Table>
          <TableHead className="sticky top-0 bg-amber-50/80 backdrop-blur-sm z-10">
            <TableRow>
              <TableHeaderCell>Deal</TableHeaderCell>
              <TableHeaderCell className="text-right">ARR</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Original Meeting</TableHeaderCell>
              <TableHeaderCell>Waiting</TableHeaderCell>
              <TableHeaderCell>Attempts</TableHeaderCell>
              <TableHeaderCell>Priority</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence>
              {displayedData.map((deal, index) => {
                const critical = isCritical(deal.days_in_current_stage);

                return (
                  <motion.tr
                    key={deal.deal_id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                    className={`transition-colors ${
                      critical
                        ? 'bg-[#FF3489]/5 hover:bg-[#FF3489]/10'
                        : 'hover:bg-amber-50'
                    }`}
                  >
                    <TableCell>
                      <div>
                        <Text className="font-medium text-gray-900">
                          {deal.dealname}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {deal.company_name}
                        </Text>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Text className="font-semibold text-gray-900">
                        {formatCurrency(deal.arr_value)}
                      </Text>
                    </TableCell>

                    <TableCell>{getStatusBadge(deal.deal_stage_label)}</TableCell>

                    <TableCell>
                      <Text className="text-sm">
                        {formatDate(deal.original_meeting_date)}
                      </Text>
                    </TableCell>

                    <TableCell>
                      <Text
                        className={`font-bold ${
                          critical
                            ? 'text-[#FF3489]'
                            : deal.days_in_current_stage >= 5
                            ? 'text-red-600'
                            : deal.days_in_current_stage >= 3
                            ? 'text-amber-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {deal.days_in_current_stage}d
                      </Text>
                    </TableCell>

                    <TableCell>
                      <Flex justifyContent="start" className="space-x-1">
                        <ArrowPathIcon className="h-4 w-4 text-gray-400" />
                        <Text
                          className={
                            deal.rebook_attempts >= 2
                              ? 'text-red-600 font-medium'
                              : 'text-gray-600'
                          }
                        >
                          {deal.rebook_attempts}
                        </Text>
                      </Flex>
                    </TableCell>

                    <TableCell>
                      {getUrgencyBadge(deal.days_in_current_stage, deal.rebook_attempts)}
                    </TableCell>

                    <TableCell>
                      <Flex justifyContent="start" className="space-x-2">
                        <a
                          href={deal.hubspot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
                            critical
                              ? 'bg-[#FF3489] text-white hover:bg-[#e02d78]'
                              : 'bg-[#809292] text-white hover:bg-[#6a7a7a]'
                          }`}
                        >
                          <CalendarDaysIcon className="h-3.5 w-3.5" />
                          Schedule
                        </a>
                        <button
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Schedule Call"
                        >
                          <PhoneIcon className="h-4 w-4" />
                        </button>
                        <a
                          href={deal.hubspot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                          title="Open in HubSpot"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </a>
                      </Flex>
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
        <Flex justifyContent="center" className="mt-4 pt-4 border-t border-amber-200 gap-3">
          {hasMore && (
            <button
              onClick={handleShowMore}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#809292' }}
            >
              <ChevronDownIcon className="h-4 w-4" />
              Load More Rebooks ({Math.min(LOAD_MORE_COUNT, sortedData.length - displayCount)})
            </button>
          )}
          {isExpanded && (
            <button
              onClick={handleCollapse}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronUpIcon className="h-4 w-4" />
              Collapse
            </button>
          )}
        </Flex>
      )}

      {/* Critical deals warning */}
      {sortedData.filter(d => isCritical(d.days_in_current_stage)).length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[#FF3489]/10 border border-[#FF3489]/30">
          <Flex justifyContent="start" className="space-x-2">
            <ClockIcon className="h-5 w-5 text-[#FF3489]" />
            <Text className="text-[#FF3489] font-medium text-sm">
              {sortedData.filter(d => isCritical(d.days_in_current_stage)).length} deals waiting 30+ days - immediate attention required
            </Text>
          </Flex>
        </div>
      )}
    </Card>
  );
};

export default PendingRebook;
