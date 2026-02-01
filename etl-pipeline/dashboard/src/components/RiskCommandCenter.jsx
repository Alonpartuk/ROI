import React, { useState, useMemo } from 'react';
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
  Select,
  SelectItem,
  TextInput,
} from '@tremor/react';
import {
  ExclamationTriangleIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import {
  AlertTriangle,
  Phone,
  Calendar,
  UserCheck,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../services/api';
import DealVelocityTimeline from './DealVelocityTimeline';
import MetricInfo from './MetricInfo';

const INITIAL_DISPLAY_COUNT = 10;
const LOAD_MORE_COUNT = 10;

/**
 * RiskCommandCenter Component
 * Displays deals at risk from v_deals_at_risk view
 *
 * Features:
 * - Conditional formatting based on risk level
 * - Multi-threading warning badges
 * - Enterprise deal highlighting (ARR >= $100K)
 * - Filtering by owner and risk type
 * - Recommended Actions based on risk indicators
 * - Click to open deal slide-over
 * - Pagination with Load More pattern
 * - Sticky table headers
 */
const RiskCommandCenter = ({ data, onDealClick, dealVelocity = {} }) => {
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  if (!data || data.length === 0) return null;

  // Get unique owners for filter
  const owners = [...new Set(data.map((d) => d.owner_name))].sort();

  // Filter data
  const filteredData = data.filter((deal) => {
    const matchesOwner = ownerFilter === 'all' || deal.owner_name === ownerFilter;
    const matchesRisk =
      riskFilter === 'all' ||
      (riskFilter === 'at_risk' && deal.is_at_risk) ||
      (riskFilter === 'stalled' && deal.is_stalled) ||
      (riskFilter === 'ghosted' && deal.is_ghosted) ||
      (riskFilter === 'enterprise' && deal.is_enterprise);
    const matchesSearch =
      !searchTerm ||
      deal.dealname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesOwner && matchesRisk && matchesSearch;
  });

  // Sort by risk (at-risk first, then by ARR)
  const sortedData = [...filteredData].sort((a, b) => {
    if (a.is_at_risk !== b.is_at_risk) return b.is_at_risk ? 1 : -1;
    return b.arr_value - a.arr_value;
  });

  // Paginated data for display
  const displayedData = sortedData.slice(0, displayCount);
  const hasMore = displayCount < sortedData.length;
  const isExpanded = displayCount > INITIAL_DISPLAY_COUNT;

  // Handle Load More
  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + LOAD_MORE_COUNT, sortedData.length));
  };

  // Handle Collapse
  const handleCollapse = () => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  // Get threading badge color
  const getThreadingBadge = (level, isEnterprise) => {
    const config = {
      Critical: { color: 'red', icon: true },
      Low: { color: 'amber', icon: false },
      Moderate: { color: 'yellow', icon: false },
      Healthy: { color: 'emerald', icon: false },
    };
    const cfg = config[level] || config.Moderate;

    return (
      <Flex justifyContent="start" className="space-x-1">
        <Badge color={cfg.color} size="sm">
          {level}
        </Badge>
        {cfg.icon && (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500 animate-pulse" />
        )}
      </Flex>
    );
  };

  // Get risk reason badge
  const getRiskBadge = (deal) => {
    if (!deal.is_at_risk) {
      return <Badge color="emerald" size="sm">Healthy</Badge>;
    }

    const badges = [];

    if (deal.is_stalled) {
      badges.push(
        <Badge key="stalled" color="amber" size="sm">
          Stalled ({deal.days_in_current_stage}d)
        </Badge>
      );
    }

    if (deal.is_ghosted) {
      badges.push(
        <Badge key="ghosted" color="red" size="sm">
          Ghosted ({deal.days_since_last_activity}d)
        </Badge>
      );
    }

    return (
      <Flex justifyContent="start" className="space-x-1 flex-wrap gap-1">
        {badges.length > 0 ? badges : <Badge color="amber" size="sm">At Risk</Badge>}
      </Flex>
    );
  };

  // Get recommended action based on deal status
  const getRecommendedAction = (deal) => {
    // Priority 1: Ghosted for 10+ days - Executive Outreach
    if (deal.is_ghosted && deal.days_since_last_activity >= 10) {
      return {
        action: 'Executive Outreach Required',
        shortAction: 'Exec Outreach',
        description: 'No activity in 10+ days',
        color: 'rose',
        bgColor: 'bg-rose-50',
        icon: AlertTriangle,
        priority: 1,
      };
    }

    // Priority 2: Ghosted under 10 days - Follow Up
    if (deal.is_ghosted && deal.days_since_last_activity >= 5) {
      return {
        action: 'Urgent Follow-up',
        shortAction: 'Follow Up',
        description: 'Re-engage immediately',
        color: 'orange',
        bgColor: 'bg-orange-50',
        icon: Phone,
        priority: 2,
      };
    }

    // Priority 3: Stalled for 30+ days - Deal Review
    if (deal.is_stalled && deal.days_in_current_stage >= 30) {
      return {
        action: 'Pipeline Review Required',
        shortAction: 'Review Deal',
        description: 'Stalled 30+ days',
        color: 'amber',
        bgColor: 'bg-amber-50',
        icon: Clock,
        priority: 3,
      };
    }

    // Priority 4: Stalled 14-30 days - Check Blockers
    if (deal.is_stalled && deal.days_in_current_stage >= 14) {
      return {
        action: 'Identify Blockers',
        shortAction: 'Check Blockers',
        description: 'Stage movement needed',
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        icon: Shield,
        priority: 4,
      };
    }

    // Priority 5: Low threading on enterprise - Multi-thread
    if (deal.is_enterprise && deal.contact_count < 3) {
      return {
        action: 'Multi-thread Required',
        shortAction: 'Add Contacts',
        description: 'Enterprise needs 3+ contacts',
        color: 'purple',
        bgColor: 'bg-purple-50',
        icon: UserCheck,
        priority: 5,
      };
    }

    // Priority 6: No upcoming meeting - Schedule
    if (!deal.has_upcoming_meeting) {
      return {
        action: 'Schedule Next Meeting',
        shortAction: 'Book Meeting',
        description: 'No meeting scheduled',
        color: 'blue',
        bgColor: 'bg-blue-50',
        icon: Calendar,
        priority: 6,
      };
    }

    // Default: On Track
    return {
      action: 'On Track',
      shortAction: 'On Track',
      description: 'Continue engagement',
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      icon: Zap,
      priority: 10,
    };
  };

  // Calculate totals
  const totalAtRisk = sortedData.filter((d) => d.is_at_risk).length;
  const totalARR = sortedData.reduce((sum, d) => sum + d.arr_value, 0);
  const atRiskARR = sortedData
    .filter((d) => d.is_at_risk)
    .reduce((sum, d) => sum + d.arr_value, 0);

  // Count actions needed
  const actionCounts = sortedData.reduce((acc, deal) => {
    const action = getRecommendedAction(deal);
    acc[action.shortAction] = (acc[action.shortAction] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card>
      <div className="mb-4 space-y-4">
        {/* Header */}
        <Flex justifyContent="start" className="space-x-2">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <div>
            <div className="flex items-center gap-2">
              <Title>Risk Command Center</Title>
              <MetricInfo id="Risk Command Center" />
            </div>
            <Text className="text-gray-500">
              {totalAtRisk} at-risk deals ({formatCurrency(atRiskARR)}) of{' '}
              {sortedData.length} total ({formatCurrency(totalARR)})
            </Text>
          </div>
        </Flex>

        {/* Filters - Responsive: Stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <TextInput
            icon={MagnifyingGlassIcon}
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setDisplayCount(INITIAL_DISPLAY_COUNT);
            }}
            className="w-full sm:w-48"
          />
          <Select
            value={ownerFilter}
            onValueChange={(val) => {
              setOwnerFilter(val);
              setDisplayCount(INITIAL_DISPLAY_COUNT);
            }}
            className="w-full sm:w-40"
          >
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner} value={owner}>
                {owner}
              </SelectItem>
            ))}
          </Select>
          <Select
            value={riskFilter}
            onValueChange={(val) => {
              setRiskFilter(val);
              setDisplayCount(INITIAL_DISPLAY_COUNT);
            }}
            className="w-full sm:w-40"
          >
            <SelectItem value="all">All Deals</SelectItem>
            <SelectItem value="at_risk">At Risk Only</SelectItem>
            <SelectItem value="stalled">Stalled</SelectItem>
            <SelectItem value="ghosted">Ghosted</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </Select>
        </div>
      </div>

      {/* Row Count Display */}
      <Flex justifyContent="between" alignItems="center" className="mb-3 flex-col sm:flex-row gap-2">
        <Text className="text-sm text-gray-500">
          Showing {Math.min(displayCount, sortedData.length)} of {sortedData.length} deals
        </Text>

        {/* Action Summary Pills - Hidden on mobile */}
        <div className="hidden sm:flex flex-wrap gap-2">
          {Object.entries(actionCounts)
            .filter(([action]) => action !== 'On Track')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([action, count]) => (
              <Badge key={action} color="gray" size="sm" className="px-2 py-0.5">
                {action}: {count}
              </Badge>
            ))}
        </div>
      </Flex>

      {/* Mobile Card View - Shows on screens < 768px */}
      <div className="block md:hidden space-y-3 max-h-[500px] overflow-y-auto">
        <AnimatePresence>
          {displayedData.map((deal, index) => {
            const recommendation = getRecommendedAction(deal);
            const RecommendationIcon = recommendation.icon;

            return (
              <motion.div
                key={deal.deal_id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                className={`p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                  deal.is_at_risk
                    ? 'bg-red-50/50 border-red-200 hover:border-red-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onDealClick && onDealClick(deal)}
              >
                {/* Deal Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {deal.is_enterprise && (
                        <BuildingOffice2Icon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                      <Text className="font-semibold text-gray-900 truncate">
                        {deal.dealname}
                      </Text>
                    </div>
                    <Text className="text-xs text-gray-500 truncate">{deal.company_name}</Text>
                  </div>
                  <Text className={`font-bold tabular-nums ${deal.is_enterprise ? 'text-blue-600' : 'text-gray-900'}`}>
                    {formatCurrency(deal.arr_value)}
                  </Text>
                </div>

                {/* Risk & Stage Row */}
                <div className="flex items-center justify-between mb-3">
                  <Badge color="gray" size="sm">{deal.deal_stage_label}</Badge>
                  {getRiskBadge(deal)}
                </div>

                {/* Recommended Action */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${recommendation.bgColor}`}>
                  <RecommendationIcon className={`h-4 w-4 text-${recommendation.color}-600 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <Text className={`text-xs font-semibold text-${recommendation.color}-700`}>
                      {recommendation.shortAction}
                    </Text>
                    <Text className={`text-[10px] text-${recommendation.color}-500`}>
                      {recommendation.description}
                    </Text>
                  </div>
                </div>

                {/* Footer: Owner & Threading */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-xs text-gray-500">{deal.owner_name}</Text>
                  <Flex justifyContent="end" className="space-x-1">
                    <UserGroupIcon className="h-3 w-3 text-gray-400" />
                    <Text className="text-xs">{deal.contact_count}</Text>
                    {getThreadingBadge(deal.threading_level, deal.is_enterprise)}
                  </Flex>
                </div>

                {/* 14-Day Journey Timeline (Mobile) */}
                <DealVelocityTimeline
                  movements={dealVelocity[deal.deal_id] || []}
                  variant="mobile"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Table with Sticky Headers - Hidden on mobile */}
      <div className="hidden md:block max-h-[500px] overflow-y-auto relative">
        <Table>
          <TableHead className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHeaderCell>Deal</TableHeaderCell>
              <TableHeaderCell className="text-right">ARR</TableHeaderCell>
              <TableHeaderCell>Stage</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Risk Status</TableHeaderCell>
              <TableHeaderCell>14-Day Journey</TableHeaderCell>
              <TableHeaderCell>Recommended Action</TableHeaderCell>
              <TableHeaderCell>Threading</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence>
              {displayedData.map((deal, index) => {
                const recommendation = getRecommendedAction(deal);
                const RecommendationIcon = recommendation.icon;

                return (
                  <motion.tr
                    key={deal.deal_id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index >= displayCount - LOAD_MORE_COUNT ? (index % LOAD_MORE_COUNT) * 0.03 : 0 }}
                    className={`
                      ${deal.is_at_risk ? 'bg-red-50/50' : ''}
                      ${deal.is_enterprise && !deal.is_at_risk ? 'enterprise-highlight' : ''}
                      hover:bg-gray-50 transition-colors cursor-pointer
                    `}
                    onClick={() => onDealClick && onDealClick(deal)}
                  >
                    <TableCell>
                      <Flex justifyContent="start" className="space-x-2">
                        {deal.is_enterprise && (
                          <BuildingOffice2Icon
                            className="h-4 w-4 text-blue-500 flex-shrink-0"
                            title="Enterprise Deal"
                          />
                        )}
                        <div>
                          <Text className="font-medium text-gray-900">
                            {deal.dealname}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            {deal.company_name}
                          </Text>
                        </div>
                      </Flex>
                    </TableCell>

                    <TableCell className="text-right">
                      <Text
                        className={`font-semibold tabular-nums ${
                          deal.is_enterprise ? 'text-blue-600' : 'text-gray-900'
                        }`}
                      >
                        {formatCurrency(deal.arr_value)}
                      </Text>
                    </TableCell>

                    <TableCell>
                      <Badge color="gray" size="sm">
                        {deal.deal_stage_label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Text>{deal.owner_name}</Text>
                    </TableCell>

                    <TableCell>{getRiskBadge(deal)}</TableCell>

                    {/* 14-Day Journey Column */}
                    <TableCell>
                      <DealVelocityTimeline
                        movements={dealVelocity[deal.deal_id] || []}
                        variant="desktop"
                      />
                    </TableCell>

                    {/* Recommended Action Column */}
                    <TableCell>
                      <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${recommendation.bgColor}`}>
                        <RecommendationIcon className={`h-4 w-4 text-${recommendation.color}-600 flex-shrink-0`} />
                        <div className="min-w-0">
                          <Text className={`text-xs font-semibold text-${recommendation.color}-700 truncate`}>
                            {recommendation.shortAction}
                          </Text>
                          <Text className={`text-[10px] text-${recommendation.color}-500 truncate`}>
                            {recommendation.description}
                          </Text>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Flex justifyContent="start" className="space-x-1">
                        <UserGroupIcon className="h-4 w-4 text-gray-400" />
                        <Text className="text-sm">{deal.contact_count}</Text>
                        {getThreadingBadge(deal.threading_level, deal.is_enterprise)}
                      </Flex>
                    </TableCell>

                    <TableCell>
                      <a
                        href={deal.hubspot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </a>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Load More / Collapse Buttons - Touch-optimized on mobile */}
      {sortedData.length > INITIAL_DISPLAY_COUNT && (
        <Flex justifyContent="center" className="mt-4 pt-4 border-t border-gray-100 gap-3">
          {hasMore && (
            <button
              onClick={handleShowMore}
              className="flex items-center gap-2 px-4 py-3 md:py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl md:rounded-lg transition-colors min-h-[44px] active:scale-[0.98]"
            >
              <ChevronDownIcon className="h-5 w-5 md:h-4 md:w-4" />
              Show More ({Math.min(LOAD_MORE_COUNT, sortedData.length - displayCount)} more)
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

      {sortedData.length === 0 && (
        <Flex justifyContent="center" className="py-8">
          <Text className="text-gray-500">
            No deals match the current filters
          </Text>
        </Flex>
      )}
    </Card>
  );
};

export default RiskCommandCenter;
