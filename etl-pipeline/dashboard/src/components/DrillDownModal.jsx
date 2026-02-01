import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Title,
  Text,
  Flex,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Metric,
  ProgressBar,
} from '@tremor/react';
import {
  XMarkIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, formatPercent } from '../services/api';
import { MetricDefinitionBanner } from './MetricTooltip';

/**
 * DrillDownModal Component
 * Portal-based modal for KPI drill-down details
 *
 * Features:
 * - Portal rendering for proper z-index stacking
 * - High z-index (z-[999]) to appear above all content
 * - Click outside to close
 * - ESC key to close
 * - Mobile-optimized full-screen on small devices
 * - Animated entrance/exit
 */
const DrillDownModal = ({ isOpen, onClose, metric, data, dealsAtRisk, closeDateSlippage }) => {
  const modalRef = useRef(null);

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('DrillDownModal opened for:', metric);
      console.log('Modal data:', data);
    }
  }, [isOpen, metric, data]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        console.log('ESC pressed, closing modal');
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
      console.log('Backdrop clicked, closing modal');
      onClose();
    }
  };

  // Get icon for metric type
  const getMetricIcon = () => {
    switch (metric) {
      case 'Total Pipeline':
        return <CurrencyDollarIcon className="h-6 w-6 text-blue-500" />;
      case 'Weighted Pipeline':
        return <ScaleIcon className="h-6 w-6 text-indigo-500" />;
      case 'At Risk':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />;
      case 'Win Rate':
        return <TrophyIcon className="h-6 w-6 text-emerald-500" />;
      default:
        return <ArrowTrendingUpIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  // Render content based on metric type
  const renderContent = () => {
    if (!data) return <Text>No data available</Text>;

    switch (metric) {
      case 'Total Pipeline':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <Text className="text-gray-500 text-xs">Total Value</Text>
                <Metric className="text-blue-600">{formatCurrency(data.total_pipeline_value)}</Metric>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Text className="text-gray-500 text-xs">Deal Count</Text>
                <Metric>{data.total_deals_count}</Metric>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <Text className="text-gray-500 text-xs mb-2">Average Deal Size</Text>
              <Metric className="text-lg">
                {formatCurrency(data.total_pipeline_value / (data.total_deals_count || 1))}
              </Metric>
            </div>
            <Text className="text-gray-500 text-sm">
              Pipeline includes all open deals in active stages. Click on individual deals in the Risk Center for more details.
            </Text>
          </div>
        );

      case 'Weighted Pipeline':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-indigo-50 rounded-lg text-center">
                <Text className="text-gray-500 text-xs">Weighted Value</Text>
                <Metric className="text-indigo-600">{formatCurrency(data.weighted_pipeline_value)}</Metric>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Text className="text-gray-500 text-xs">% of Total</Text>
                <Metric>{formatPercent((data.weighted_pipeline_value / data.total_pipeline_value) * 100)}</Metric>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <Text className="text-gray-500 text-xs mb-2">Weighting Explanation</Text>
              <Text className="text-sm">
                Weighted pipeline multiplies each deal's value by its stage probability. Higher stages have higher weights.
              </Text>
            </div>
          </div>
        );

      case 'At Risk':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <Text className="text-gray-500 text-xs">At Risk Value</Text>
                <Metric className="text-red-600">{formatCurrency(data.at_risk_value)}</Metric>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Text className="text-gray-500 text-xs">Deal Count</Text>
                <Metric>{data.at_risk_deals_count}</Metric>
              </div>
            </div>
            <ProgressBar
              value={data.pct_deals_at_risk}
              color={data.pct_deals_at_risk > 20 ? 'red' : 'amber'}
              className="mb-2"
            />
            <Text className="text-gray-500 text-xs text-center">
              {formatPercent(data.pct_deals_at_risk)} of pipeline at risk
            </Text>

            {/* At Risk Deals Table */}
            {dealsAtRisk && dealsAtRisk.length > 0 && (
              <div className="mt-4">
                <Text className="font-medium mb-2">Top At-Risk Deals</Text>
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Deal</TableHeaderCell>
                        <TableHeaderCell className="text-right">Value</TableHeaderCell>
                        <TableHeaderCell>Risk</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dealsAtRisk.slice(0, 5).map((deal, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Text className="text-sm truncate max-w-[150px]">{deal.dealname}</Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text className="font-medium">{formatCurrency(deal.amount)}</Text>
                          </TableCell>
                          <TableCell>
                            <Badge color="red" size="xs">{deal.risk_score}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        );

      case 'Win Rate':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg text-center">
                <Text className="text-gray-500 text-xs">Win Rate</Text>
                <Metric className="text-emerald-600">{formatPercent(data.win_rate_pct)}</Metric>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Text className="text-gray-500 text-xs">Avg Cycle</Text>
                <Metric>{data.avg_sales_cycle_days}d</Metric>
              </div>
            </div>
            <ProgressBar
              value={data.win_rate_pct}
              color={data.win_rate_pct >= 30 ? 'emerald' : data.win_rate_pct >= 20 ? 'amber' : 'red'}
              className="mb-2"
            />
            <div className="p-4 bg-gray-50 rounded-lg">
              <Text className="text-gray-500 text-xs mb-2">Benchmark</Text>
              <Flex justifyContent="between">
                <Text className="text-sm">Industry Average:</Text>
                <Text className="text-sm font-medium">20-25%</Text>
              </Flex>
              <Flex justifyContent="between" className="mt-1">
                <Text className="text-sm">Your Performance:</Text>
                <Badge color={data.win_rate_pct >= 25 ? 'emerald' : 'amber'}>
                  {data.win_rate_pct >= 25 ? 'Above Average' : 'Room to Improve'}
                </Badge>
              </Flex>
            </div>
          </div>
        );

      default:
        return <Text>Select a metric to view details</Text>;
    }
  };

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
            className="w-full h-full md:h-auto md:max-w-lg md:max-h-[90vh] overflow-y-auto bg-white md:rounded-3xl shadow-soft-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Sticky with larger touch target on mobile */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 md:px-6 py-3 md:py-4">
              <Flex justifyContent="between" alignItems="center">
                <Flex justifyContent="start" className="space-x-2 md:space-x-3">
                  {getMetricIcon()}
                  <Title className="text-base md:text-lg">{metric} Details</Title>
                </Flex>
                <button
                  onClick={() => {
                    console.log('Close button clicked');
                    onClose();
                  }}
                  className="p-3 md:p-2 -mr-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl md:rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <XMarkIcon className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </Flex>
            </div>

            {/* Content - Extra bottom padding on mobile for safe area */}
            <div className="p-4 md:p-6 pb-24 md:pb-6">
              {/* Metric Definition Banner */}
              {metric && (
                <MetricDefinitionBanner metricKey={metric} className="mb-4 md:mb-6" />
              )}
              {renderContent()}
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

export default DrillDownModal;
