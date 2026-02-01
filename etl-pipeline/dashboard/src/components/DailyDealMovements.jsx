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
  Select,
  SelectItem,
  TextInput,
} from '@tremor/react';
import {
  ArrowRightIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_DISPLAY_COUNT = 10;
const LOAD_MORE_COUNT = 10;

// Helper to extract date string from BigQuery date format
const extractDateValue = (dateValue) => {
  if (!dateValue) return null;
  // Handle BigQuery object format {value: "2026-01-31"}
  if (typeof dateValue === 'object' && dateValue.value) {
    return dateValue.value;
  }
  // Handle string format
  if (typeof dateValue === 'string') {
    return dateValue.split('T')[0];
  }
  return null;
};

// Format date for display
const formatMovementDate = (dateValue) => {
  const dateStr = extractDateValue(dateValue);
  if (!dateStr) return '-';

  const date = new Date(dateStr + 'T00:00:00'); // Force local timezone
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Daily Deal Movements Component
 * Shows recent deal stage transitions with movement types
 * Features: Load More pattern, sticky headers, search/filter
 */
const DailyDealMovements = ({ data, onDealClick }) => {
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  // Calculate date range from data
  const getDateRange = () => {
    if (!data || data.length === 0) return '';
    const dates = data
      .map(d => {
        const dateStr = extractDateValue(d.transition_date);
        return dateStr ? new Date(dateStr + 'T00:00:00') : null;
      })
      .filter(d => d && !isNaN(d.getTime()));
    if (dates.length === 0) return '';

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const formatDate = (date) => date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    // If same day, just show one date
    if (minDate.toDateString() === maxDate.toDateString()) {
      return formatDate(minDate) + ', ' + maxDate.getFullYear();
    }

    return `${formatDate(minDate)} - ${formatDate(maxDate)}, ${maxDate.getFullYear()}`;
  };

  const dateRange = getDateRange();

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white">
        <Flex justifyContent="start" className="space-x-2 mb-4">
          <BoltIcon className="h-5 w-5 text-purple-500" />
          <Title>Deal Movements</Title>
        </Flex>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <ArrowPathIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <Text>No movements in the last 7 days</Text>
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

  // Get movement icon and color
  const getMovementStyle = (type) => {
    switch (type) {
      case 'New Deal':
        return { icon: PlusCircleIcon, color: 'blue', bgColor: 'bg-blue-50' };
      case 'Closed':
        return { icon: CheckCircleIcon, color: 'emerald', bgColor: 'bg-emerald-50' };
      case 'Stage Change':
        return { icon: ArrowRightIcon, color: 'purple', bgColor: 'bg-purple-50' };
      case 'Reopened':
        return { icon: ArrowPathIcon, color: 'amber', bgColor: 'bg-amber-50' };
      case 'Lost':
        return { icon: XCircleIcon, color: 'rose', bgColor: 'bg-rose-50' };
      default:
        return { icon: ArrowRightIcon, color: 'gray', bgColor: 'bg-gray-50' };
    }
  };

  // Filter data by type and search
  const filteredData = data.filter(d => {
    const matchesType = filterType === 'all' || d.movement_type === filterType;
    const matchesSearch = !searchTerm ||
      d.deal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Get unique movement types
  const movementTypes = [...new Set(data.map(d => d.movement_type))];

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

  // Calculate summary stats
  const newDeals = data.filter(d => d.movement_type === 'New Deal');
  const closedDeals = data.filter(d => d.movement_type === 'Closed');
  const stageChanges = data.filter(d => d.movement_type === 'Stage Change');

  return (
    <Card className="bg-white">
      <div className="mb-4 space-y-3">
        <Flex justifyContent="start" className="space-x-2">
          <BoltIcon className="h-5 w-5 text-purple-500" />
          <div>
            <Title className="text-base sm:text-lg">Deal Movements</Title>
            <Text className="text-gray-500 text-xs sm:text-sm">
              {dateRange || 'Last 7 days activity'}
            </Text>
          </div>
        </Flex>
        {/* Filters - Responsive */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <TextInput
            icon={MagnifyingGlassIcon}
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setDisplayCount(INITIAL_DISPLAY_COUNT);
            }}
            className="w-full sm:w-40"
          />
          <Select
            value={filterType}
            onValueChange={(val) => {
              setFilterType(val);
              setDisplayCount(INITIAL_DISPLAY_COUNT);
            }}
            className="w-full sm:w-40"
          >
            <SelectItem value="all">All Types</SelectItem>
            {movementTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Summary Cards - Responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-2 sm:p-3 text-center">
          <PlusCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mx-auto" />
          <Text className="text-blue-600 text-[10px] sm:text-xs mt-1">New Deals</Text>
          <Text className="text-lg sm:text-xl font-bold text-blue-700">{newDeals.length}</Text>
          <Text className="text-blue-500 text-[10px] sm:text-xs hidden sm:block">{formatCurrency(newDeals.reduce((s, d) => s + d.value_arr, 0))}</Text>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2 sm:p-3 text-center">
          <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 mx-auto" />
          <Text className="text-emerald-600 text-[10px] sm:text-xs mt-1">Closed</Text>
          <Text className="text-lg sm:text-xl font-bold text-emerald-700">{closedDeals.length}</Text>
          <Text className="text-emerald-500 text-[10px] sm:text-xs hidden sm:block">{formatCurrency(closedDeals.reduce((s, d) => s + d.value_arr, 0))}</Text>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 sm:p-3 text-center">
          <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mx-auto" />
          <Text className="text-purple-600 text-[10px] sm:text-xs mt-1">Stage Changes</Text>
          <Text className="text-lg sm:text-xl font-bold text-purple-700">{stageChanges.length}</Text>
          <Text className="text-purple-500 text-[10px] sm:text-xs hidden sm:block">{formatCurrency(stageChanges.reduce((s, d) => s + d.value_arr, 0))}</Text>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 sm:p-3 text-center">
          <BoltIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mx-auto" />
          <Text className="text-gray-600 text-[10px] sm:text-xs mt-1">Total</Text>
          <Text className="text-lg sm:text-xl font-bold text-gray-700">{data.length}</Text>
          <Text className="text-gray-500 text-[10px] sm:text-xs hidden sm:block">This week</Text>
        </div>
      </div>

      {/* Row Count Display */}
      <Text className="text-sm text-gray-500 mb-3">
        Showing {Math.min(displayCount, filteredData.length)} of {filteredData.length} movements
      </Text>

      {/* Mobile Card View - Shows on screens < 768px */}
      <div className="block md:hidden space-y-3 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {displayedData.map((movement, index) => {
            const style = getMovementStyle(movement.movement_type);
            const Icon = style.icon;

            return (
              <motion.div
                key={`${movement.deal_id}-${index}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-98 ${style.bgColor} border-gray-200`}
                onClick={() => onDealClick && onDealClick(movement)}
              >
                {/* Header: Type & Date */}
                <div className="flex items-center justify-between mb-2">
                  <Badge color={style.color} size="sm" icon={Icon}>
                    {movement.movement_type}
                  </Badge>
                  <Text className="text-xs text-gray-500">
                    {formatMovementDate(movement.transition_date)}
                  </Text>
                </div>

                {/* Deal Name & ARR */}
                <div className="flex items-start justify-between mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDealClick) onDealClick(movement);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm text-left truncate flex-1"
                  >
                    {movement.deal_name?.substring(0, 30)}
                    {movement.deal_name?.length > 30 ? '...' : ''}
                  </button>
                  <Text className="font-semibold text-sm ml-2">{formatCurrency(movement.value_arr)}</Text>
                </div>

                {/* Stage Transition */}
                <div className="flex items-center gap-2 bg-white/50 rounded-lg px-2 py-1.5 mb-2">
                  <Text className="text-xs text-gray-500 truncate">
                    {movement.previous_stage || 'New'}
                  </Text>
                  <ArrowRightIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <Text className="text-xs font-medium truncate">
                    {movement.current_stage}
                  </Text>
                </div>

                {/* Owner */}
                <Text className="text-xs text-gray-500">{movement.owner_name}</Text>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Desktop Movements Table with Sticky Headers - Hidden on mobile */}
      <div className="hidden md:block max-h-[400px] overflow-y-auto relative">
        <Table>
          <TableHead className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Deal</TableHeaderCell>
              <TableHeaderCell>Transition</TableHeaderCell>
              <TableHeaderCell className="text-right">ARR</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence>
              {displayedData.map((movement, index) => {
                const style = getMovementStyle(movement.movement_type);
                const Icon = style.icon;

                return (
                  <motion.tr
                    key={`${movement.deal_id}-${index}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onDealClick && onDealClick(movement)}
                  >
                    <TableCell>
                      <Badge color={style.color} size="sm" icon={Icon}>
                        {movement.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDealClick) onDealClick(movement);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                      >
                        {movement.deal_name?.substring(0, 30)}
                        {movement.deal_name?.length > 30 ? '...' : ''}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Flex justifyContent="start" className="space-x-1">
                        <Text className="text-gray-500 text-xs">
                          {movement.previous_stage || 'New'}
                        </Text>
                        <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                        <Text className="text-gray-900 text-xs font-medium">
                          {movement.current_stage}
                        </Text>
                      </Flex>
                    </TableCell>
                    <TableCell className="text-right">
                      <Text className="font-semibold">{formatCurrency(movement.value_arr)}</Text>
                    </TableCell>
                    <TableCell>
                      <Text className="text-gray-600 text-sm">{movement.owner_name}</Text>
                    </TableCell>
                    <TableCell>
                      <Text className="text-gray-500 text-xs">
                        {new Date(movement.transition_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Load More / Collapse Buttons */}
      {filteredData.length > INITIAL_DISPLAY_COUNT && (
        <Flex justifyContent="center" className="mt-4 pt-4 border-t border-gray-100 gap-3">
          {hasMore && (
            <button
              onClick={handleShowMore}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronDownIcon className="h-4 w-4" />
              Show More ({Math.min(LOAD_MORE_COUNT, filteredData.length - displayCount)} more)
            </button>
          )}
          {isExpanded && (
            <button
              onClick={handleCollapse}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ChevronUpIcon className="h-4 w-4" />
              Collapse
            </button>
          )}
        </Flex>
      )}
    </Card>
  );
};

export default DailyDealMovements;
