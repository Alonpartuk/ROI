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
import MetricInfo from './MetricInfo';

const INITIAL_DISPLAY_COUNT = 10;
const LOAD_MORE_COUNT = 10;

/**
 * Deal Rescue Center (formerly RiskCommandCenter)
 * The SINGLE source of truth for deal-level intervention
 *
 * Features:
 * - Contact Health Status (RED/YELLOW/GREEN)
 * - Threading Level (Critical/Low/Moderate/Healthy)
 * - Risk indicators (Stalled, Ghosted)
 * - Recommended Actions based on all signals
 * - Enterprise deal highlighting (ARR >= $100K)
 * - Click to open deal slide-over
 * - Pagination with Load More pattern
 */
const RiskCommandCenter = ({ data, onDealClick, dealVelocity = {} }) => {
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  if (!data || data.length === 0) return null;

  // Get unique owners for filter
  const owners = [...new Set(data.map((d) => d.owner_name))].sort();

  // Helper to calculate health status for filtering
  const getHealthStatus = (deal) => {
    const contactCount = deal.contact_count || 0;
    const daysSinceActivity = deal.days_since_last_activity || 0;
    if (contactCount === 0 || daysSinceActivity > 14) return 'RED';
    if (contactCount === 1 || (daysSinceActivity >= 7 && daysSinceActivity <= 14)) return 'YELLOW';
    return 'GREEN';
  };

  // Filter data
  const filteredData = data.filter((deal) => {
    const matchesOwner = ownerFilter === 'all' || deal.owner_name === ownerFilter;
    const matchesRisk =
      riskFilter === 'all' ||
      (riskFilter === 'at_risk' && deal.is_at_risk) ||
      (riskFilter === 'stalled' && deal.is_stalled) ||
      (riskFilter === 'ghosted' && deal.is_ghosted) ||
      (riskFilter === 'enterprise' && deal.is_enterprise);
    const matchesHealth =
      healthFilter === 'all' ||
      getHealthStatus(deal) === healthFilter;
    const matchesSearch =
      !searchTerm ||
      deal.dealname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesOwner && matchesRisk && matchesHealth && matchesSearch;
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

  // Calculate Contact Health Status (RED/YELLOW/GREEN)
  const getContactHealth = (deal) => {
    const contactCount = deal.contact_count || 0;
    const daysSinceActivity = deal.days_since_last_activity || 0;

    // RED: 0 contacts OR no activity in 14+ days
    if (contactCount === 0 || daysSinceActivity > 14) {
      return {
        status: 'RED',
        color: 'red',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        reason: contactCount === 0 ? 'No contacts' : `${daysSinceActivity}d silent`,
      };
    }

    // YELLOW: Only 1 contact OR no activity 7-14 days
    if (contactCount === 1 || (daysSinceActivity >= 7 && daysSinceActivity <= 14)) {
      return {
        status: 'YELLOW',
        color: 'amber',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        reason: contactCount === 1 ? 'Single-threaded' : `${daysSinceActivity}d ago`,
      };
    }

    // GREEN: 2+ contacts AND activity within 7 days
    return {
      status: 'GREEN',
      color: 'emerald',
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      reason: `${contactCount} contacts`,
    };
  };

  // Get Contact Health Badge
  const getContactHealthBadge = (deal) => {
    const health = getContactHealth(deal);
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${health.bgColor}`}>
        <div className={`w-2 h-2 rounded-full ${health.status === 'RED' ? 'bg-red-500' : health.status === 'YELLOW' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <span className={`text-xs font-semibold ${health.textColor}`}>{health.status}</span>
        <span className={`text-[10px] ${health.textColor} opacity-75`}>{health.reason}</span>
      </div>
    );
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
      <Badge color={cfg.color} size="sm">
        {level}
      </Badge>
    );
  };

  // Get threading level with contact count
  const getThreadingDisplay = (deal) => {
    const level = deal.threading_level || 'Unknown';
    const count = deal.contact_count || 0;
    const config = {
      Critical: { color: 'red', bgColor: 'bg-red-50' },
      Low: { color: 'amber', bgColor: 'bg-amber-50' },
      Moderate: { color: 'yellow', bgColor: 'bg-yellow-50' },
      Healthy: { color: 'emerald', bgColor: 'bg-emerald-50' },
    };
    const cfg = config[level] || config.Moderate;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${cfg.bgColor}`}>
        <UserGroupIcon className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-sm font-medium">{count}</span>
        <Badge color={cfg.color} size="xs">{level}</Badge>
      </div>
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

  // Count health statuses
  const healthCounts = sortedData.reduce((acc, deal) => {
    const status = getHealthStatus(deal);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { RED: 0, YELLOW: 0, GREEN: 0 });

  return (
    <Card>
      <div className="mb-4 space-y-4">
        {/* Header */}
        <Flex justifyContent="start" className="space-x-2">
          <div className="p-2 bg-gradient-to-br from-[#FF3489] to-[#00CBC0] rounded-xl">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Title className="text-[#809292]">Deal Rescue Center</Title>
              <MetricInfo id="Deal Rescue Center" />
            </div>
            <Text className="text-gray-500">
              {totalAtRisk} need attention ({formatCurrency(atRiskARR)}) • {sortedData.length} total deals ({formatCurrency(totalARR)})
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
          <Select
            value={healthFilter}
            onValueChange={(val) => {
              setHealthFilter(val);
              setDisplayCount(INITIAL_DISPLAY_COUNT);
            }}
            className="w-full sm:w-36"
          >
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="RED">🔴 Red Only</SelectItem>
            <SelectItem value="YELLOW">🟡 Yellow Only</SelectItem>
            <SelectItem value="GREEN">🟢 Green Only</SelectItem>
          </Select>
        </div>
      </div>

      {/* Row Count Display */}
      <Flex justifyContent="between" alignItems="center" className="mb-3 flex-col sm:flex-row gap-2">
        <Text className="text-sm text-gray-500">
          Showing {Math.min(displayCount, sortedData.length)} of {sortedData.length} deals
        </Text>

        {/* Health Summary Pills - Hidden on mobile */}
        <div className="hidden sm:flex flex-wrap gap-2">
          {healthCounts.RED > 0 && (
            <Badge color="red" size="sm" className="px-2 py-0.5">
              🔴 {healthCounts.RED}
            </Badge>
          )}
          {healthCounts.YELLOW > 0 && (
            <Badge color="amber" size="sm" className="px-2 py-0.5">
              🟡 {healthCounts.YELLOW}
            </Badge>
          )}
          {healthCounts.GREEN > 0 && (
            <Badge color="emerald" size="sm" className="px-2 py-0.5">
              🟢 {healthCounts.GREEN}
            </Badge>
          )}
          <span className="text-gray-300">|</span>
          {Object.entries(actionCounts)
            .filter(([action]) => action !== 'On Track')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
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

                {/* Contact Health & Threading Row */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  {getContactHealthBadge(deal)}
                  {getThreadingDisplay(deal)}
                </div>

                {/* Footer: Owner */}
                <div className="flex items-center justify-between mt-2">
                  <Text className="text-xs text-gray-500">{deal.owner_name}</Text>
                </div>
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
              <TableHeaderCell>
                <div className="flex items-center gap-1">
                  Contact Health
                  <MetricInfo id="Contact Health" />
                </div>
              </TableHeaderCell>
              <TableHeaderCell>
                <div className="flex items-center gap-1">
                  Threading
                  <MetricInfo id="Threading Level" />
                </div>
              </TableHeaderCell>
              <TableHeaderCell>Risk Status</TableHeaderCell>
              <TableHeaderCell>Recommended Action</TableHeaderCell>
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

                    {/* Contact Health Column (R/Y/G) */}
                    <TableCell>
                      {getContactHealthBadge(deal)}
                    </TableCell>

                    {/* Threading Level Column */}
                    <TableCell>
                      {getThreadingDisplay(deal)}
                    </TableCell>

                    {/* Risk Status Column */}
                    <TableCell>{getRiskBadge(deal)}</TableCell>

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
