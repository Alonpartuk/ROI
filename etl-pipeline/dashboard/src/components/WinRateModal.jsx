import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Title,
  Text,
  Flex,
  Badge,
  Metric,
  ProgressBar,
} from '@tremor/react';
import {
  XMarkIcon,
  TrophyIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { formatCurrencyRounded, formatPercentWhole, formatDate, fetchRecentClosedDeals } from '../services/api';
import { MetricDefinitionBanner } from './MetricTooltip';

/**
 * WinRateModal Component
 * Portal-based modal for Win Rate drill-down with recent closures
 *
 * Features:
 * - Portal rendering for proper z-index stacking
 * - High z-index (z-[999]) to appear above all content
 * - Table of 15 most recent closed deals
 * - Mobile-optimized card layout
 * - Sales cycle time display
 */
const WinRateModal = ({ isOpen, onClose, data }) => {
  const modalRef = useRef(null);
  const [recentDeals, setRecentDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch recent closed deals when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      fetchRecentClosedDeals()
        .then((deals) => {
          setRecentDeals(deals);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching recent closed deals:', err);
          setError('Failed to load recent deals');
          setLoading(false);
        });
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle click outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Calculate stats from recent deals
  const wonDeals = recentDeals.filter((d) => d.is_won);
  const lostDeals = recentDeals.filter((d) => !d.is_won);
  const avgCycleDays = recentDeals.length > 0
    ? Math.round(recentDeals.reduce((sum, d) => sum + d.sales_cycle_days, 0) / recentDeals.length)
    : 0;

  // Don't render if not open
  if (!isOpen) return null;

  // Render modal through portal
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-y-auto bg-white md:rounded-3xl shadow-soft-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Sticky with larger touch target on mobile */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 md:px-6 py-3 md:py-4">
              <Flex justifyContent="between" alignItems="center">
                <Flex justifyContent="start" className="space-x-2 md:space-x-3">
                  <TrophyIcon className="h-6 w-6 text-emerald-500" />
                  <Title className="text-base md:text-lg">Recent Closures & Win Rate Analysis</Title>
                </Flex>
                <button
                  onClick={onClose}
                  className="p-3 md:p-2 -mr-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl md:rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <XMarkIcon className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </Flex>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 pb-24 md:pb-6">
              {/* Metric Definition Banner */}
              <MetricDefinitionBanner metricKey="Win Rate" className="mb-4 md:mb-6" />

              {/* Win Rate Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <Text className="text-gray-500 text-xs mb-1">Win Rate</Text>
                  <Metric className="text-emerald-600 text-2xl md:text-3xl font-bold tabular-nums">
                    {formatPercentWhole(data?.win_rate_pct)}
                  </Metric>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <Text className="text-gray-500 text-xs mb-1">Avg Cycle</Text>
                  <Metric className="text-gray-900 text-2xl md:text-3xl tabular-nums">
                    {Math.round(data?.avg_sales_cycle_days || avgCycleDays)}d
                  </Metric>
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-xl text-center">
                  <Text className="text-gray-500 text-xs mb-1">Won</Text>
                  <Metric className="text-emerald-600 text-xl md:text-2xl tabular-nums">
                    {wonDeals.length}
                  </Metric>
                </div>
                <div className="p-4 bg-red-50/50 rounded-xl text-center">
                  <Text className="text-gray-500 text-xs mb-1">Lost</Text>
                  <Metric className="text-red-600 text-xl md:text-2xl tabular-nums">
                    {lostDeals.length}
                  </Metric>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <ProgressBar
                  value={data?.win_rate_pct || 0}
                  color={data?.win_rate_pct >= 30 ? 'emerald' : data?.win_rate_pct >= 20 ? 'amber' : 'red'}
                />
                <div className="flex justify-between mt-2">
                  <Text className="text-xs text-gray-400">Industry Avg: 20-25%</Text>
                  <Badge color={data?.win_rate_pct >= 25 ? 'emerald' : 'amber'} size="xs">
                    {data?.win_rate_pct >= 25 ? 'Above Average' : 'Room to Improve'}
                  </Badge>
                </div>
              </div>

              {/* Recent Closures Section */}
              <div className="mt-6">
                <Text className="font-semibold text-gray-900 mb-4">Recent Closures (Last 15)</Text>

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#809292]"></div>
                  </div>
                )}

                {error && (
                  <div className="text-center py-8 text-red-500">
                    <Text>{error}</Text>
                  </div>
                )}

                {!loading && !error && recentDeals.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Text>No recent closed deals found</Text>
                  </div>
                )}

                {/* Desktop Table */}
                {!loading && !error && recentDeals.length > 0 && (
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Deal Name
                          </th>
                          <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Cycle Time
                          </th>
                          <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Close Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentDeals.map((deal, idx) => (
                          <tr
                            key={deal.deal_id || idx}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-2">
                              <Text className="font-medium text-gray-900 truncate max-w-[200px]">
                                {deal.dealname}
                              </Text>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {deal.is_won ? (
                                <Badge color="emerald" size="sm" icon={CheckCircleIcon}>
                                  Won
                                </Badge>
                              ) : (
                                <Badge color="red" size="sm" icon={XCircleIcon}>
                                  Lost
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Text className="font-semibold tabular-nums text-gray-900">
                                {formatCurrencyRounded(deal.amount)}
                              </Text>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Text className="tabular-nums text-gray-600">
                                {deal.sales_cycle_days} Days
                              </Text>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Text className="text-gray-500 text-sm">
                                {formatDate(deal.close_date)}
                              </Text>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Mobile Card Layout */}
                {!loading && !error && recentDeals.length > 0 && (
                  <div className="md:hidden space-y-3">
                    {recentDeals.map((deal, idx) => (
                      <div
                        key={deal.deal_id || idx}
                        className={`p-4 rounded-xl border ${
                          deal.is_won
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : 'bg-red-50/30 border-red-200'
                        }`}
                      >
                        {/* Top row: Deal name and Status */}
                        <div className="flex items-start justify-between mb-3">
                          <Text className="font-semibold text-gray-900 truncate flex-1 mr-2">
                            {deal.dealname}
                          </Text>
                          {deal.is_won ? (
                            <Badge color="emerald" size="sm" icon={CheckCircleIcon}>
                              Won
                            </Badge>
                          ) : (
                            <Badge color="red" size="sm" icon={XCircleIcon}>
                              Lost
                            </Badge>
                          )}
                        </div>

                        {/* Bottom row: Amount, Cycle, Date - Right aligned */}
                        <div className="flex items-center justify-between text-right">
                          <div className="text-left">
                            <Text className="text-xs text-gray-400">Amount</Text>
                            <Text className="font-bold text-gray-900 tabular-nums">
                              {formatCurrencyRounded(deal.amount)}
                            </Text>
                          </div>
                          <div>
                            <Text className="text-xs text-gray-400">Cycle</Text>
                            <Text className="font-medium text-gray-700 tabular-nums">
                              {deal.sales_cycle_days}d
                            </Text>
                          </div>
                          <div>
                            <Text className="text-xs text-gray-400">Closed</Text>
                            <Text className="text-gray-600 text-sm">
                              {formatDate(deal.close_date)}
                            </Text>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Fixed on mobile, sticky on desktop */}
            <div className="fixed md:sticky bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-100 px-4 md:px-6 py-3 md:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-4">
              <Flex justifyContent="end">
                <button
                  onClick={onClose}
                  className="w-full md:w-auto px-6 py-3 md:py-2 text-sm font-medium text-white bg-[#809292] hover:bg-[#6a7a7a] rounded-xl md:rounded-lg transition-colors min-h-[44px]"
                >
                  Close
                </button>
              </Flex>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default WinRateModal;
