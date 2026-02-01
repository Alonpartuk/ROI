import React, { useEffect, useState, useMemo } from 'react';
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
  Button,
  Select,
  SelectItem,
} from '@tremor/react';
import {
  NoSymbolIcon,
  ArrowPathIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, fetchZombieDeals } from '../services/api';
import MetricInfo from './MetricInfo';

/**
 * ZombieDealsTab Component
 * Shows auto-excluded "zombie" deals for review/action
 *
 * Zombie Rules:
 * - days_since_creation > 3 * median_sales_cycle
 * - no_activity_since_creation = TRUE
 * - days_no_stage_movement > 180
 *
 * Octup Colors: #809292 (primary), #00CBC0 (cyan), #FF3489 (pink)
 */
const ZombieDealsTab = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reasonFilter, setReasonFilter] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchZombieDeals();
        setData(result || []);
      } catch (err) {
        console.error('Error loading zombie deals:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get unique zombie reasons
  const zombieReasons = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map(d => d.zombie_reason))].filter(Boolean);
  }, [data]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (reasonFilter === 'all') return data;
    return data.filter(d => d.zombie_reason === reasonFilter);
  }, [data, reasonFilter]);

  // Summary stats
  const totalValue = filteredData.reduce((sum, d) => sum + (d.arr_value || 0), 0);

  // Get reason badge
  const getReasonBadge = (reason) => {
    if (!reason) return { color: 'gray', icon: NoSymbolIcon };

    if (reason.toLowerCase().includes('cycle')) {
      return { color: 'red', icon: ClockIcon, text: 'Exceeded Sales Cycle' };
    }
    if (reason.toLowerCase().includes('activity')) {
      return { color: 'amber', icon: ExclamationTriangleIcon, text: 'No Activity' };
    }
    if (reason.toLowerCase().includes('movement') || reason.toLowerCase().includes('stuck')) {
      return { color: 'orange', icon: NoSymbolIcon, text: 'Stuck in Stage' };
    }
    return { color: 'gray', icon: NoSymbolIcon, text: reason };
  };

  // Deal Detail Modal
  const DealDetailModal = () => {
    if (!selectedDeal) return null;
    const reasonBadge = getReasonBadge(selectedDeal.zombie_reason);
    const ReasonIcon = reasonBadge.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <NoSymbolIcon className="h-6 w-6 text-gray-300" />
              <div>
                <h2 className="text-lg font-bold text-white">{selectedDeal.dealname}</h2>
                <p className="text-gray-300 text-sm">Zombie Deal</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDeal(null)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Zombie Reason */}
            <div className="flex items-center gap-3 bg-red-50 rounded-lg p-4">
              <ReasonIcon className="h-8 w-8 text-red-500" />
              <div>
                <Text className="text-xs text-red-600 font-medium">Zombie Reason</Text>
                <Text className="font-semibold text-red-700">{selectedDeal.zombie_reason}</Text>
              </div>
            </div>

            {/* Deal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <UserIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">Owner</Text>
                  <Text className="font-semibold">{selectedDeal.owner}</Text>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <ClockIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">Days Old</Text>
                  <Text className="font-semibold text-red-600">{selectedDeal.days_old || 0}</Text>
                </div>
              </div>
            </div>

            {/* Stage Info */}
            {selectedDeal.current_stage && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <div>
                  <Text className="text-xs text-gray-500">Current Stage</Text>
                  <Text className="font-semibold">{selectedDeal.current_stage}</Text>
                </div>
              </div>
            )}

            {/* Value */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <div>
                <Text className="text-xs text-gray-500">Deal Value</Text>
                <Text className="font-semibold text-lg text-gray-700">{formatCurrency(selectedDeal.arr_value)}</Text>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <Text className="text-xs text-amber-700 font-semibold mb-1">Recommended Action</Text>
              <Text className="text-sm text-amber-900">
                Review this deal and either reactivate with a clear next step or mark as Closed Lost to clean up your pipeline.
              </Text>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex justify-between">
            <button
              onClick={() => setSelectedDeal(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
            >
              Close
            </button>
            <Flex className="gap-2">
              {selectedDeal.hubspot_url && (
                <a
                  href={selectedDeal.hubspot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                >
                  View in HubSpot
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              )}
            </Flex>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
        <Flex justifyContent="start" alignItems="center" className="gap-2">
          <NoSymbolIcon className="h-5 w-5 text-gray-500" />
          <Title>Zombie Deals</Title>
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
          <NoSymbolIcon className="h-5 w-5 text-gray-500" />
          <Title>Zombie Deals</Title>
        </Flex>
        <Text className="text-red-500 mt-4">Error loading data: {error}</Text>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-2xl shadow-soft border-2 border-dashed border-gray-300">
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Flex justifyContent="start" alignItems="center" className="gap-2">
            <NoSymbolIcon className="h-5 w-5 text-gray-500" />
            <Title>Zombie Deals</Title>
            <Badge color="gray" size="lg">{filteredData.length}</Badge>
            <MetricInfo id="Zombie Deals" />
          </Flex>
          <Text className="mt-1 text-gray-500">
            Auto-excluded stale deals needing review or cleanup
          </Text>
        </div>
        <Select
          value={reasonFilter}
          onValueChange={setReasonFilter}
          className="max-w-[180px]"
        >
          <SelectItem value="all">All Reasons</SelectItem>
          {zombieReasons.map(reason => (
            <SelectItem key={reason} value={reason}>
              {reason.length > 25 ? reason.substring(0, 25) + '...' : reason}
            </SelectItem>
          ))}
        </Select>
      </Flex>

      {/* Summary Banner */}
      {filteredData.length > 0 && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <Flex justifyContent="between" alignItems="center">
            <Flex className="gap-6">
              <div>
                <Text className="text-xs text-gray-500">Total Zombie Deals</Text>
                <Text className="text-2xl font-bold text-gray-700">{filteredData.length}</Text>
              </div>
              <div>
                <Text className="text-xs text-gray-500">Value in Limbo</Text>
                <Text className="text-2xl font-bold text-gray-700">{formatCurrency(totalValue)}</Text>
              </div>
            </Flex>
            <div className="text-right">
              <Text className="text-xs text-gray-500 mb-1">These deals are excluded from</Text>
              <Text className="text-xs text-gray-500">active pipeline metrics</Text>
            </div>
          </Flex>
        </div>
      )}

      {/* Deals Table */}
      {filteredData.length === 0 ? (
        <div className="mt-6 text-center py-12">
          <NoSymbolIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <Text className="text-gray-500 font-medium">No zombie deals found!</Text>
          <Text className="text-xs text-gray-400 mt-1">Your pipeline is clean</Text>
        </div>
      ) : (
        <Table className="mt-6">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Deal</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Zombie Reason</TableHeaderCell>
              <TableHeaderCell className="text-right">Days Old</TableHeaderCell>
              <TableHeaderCell className="text-right">Value</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.slice(0, 20).map((deal, idx) => {
              const reasonBadge = getReasonBadge(deal.zombie_reason);
              return (
                <TableRow
                  key={deal.deal_id || idx}
                  className="cursor-pointer hover:bg-gray-50 transition-colors opacity-75 hover:opacity-100"
                  onClick={() => setSelectedDeal(deal)}
                >
                  <TableCell>
                    <Text className="font-medium text-gray-700 hover:text-blue-600">
                      {deal.dealname}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text className="text-gray-600">{deal.owner}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge color={reasonBadge.color} size="sm">
                      {deal.zombie_reason?.length > 30
                        ? deal.zombie_reason.substring(0, 30) + '...'
                        : deal.zombie_reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className="text-red-600 font-semibold">{deal.days_old || 0}</Text>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className="text-gray-700">{formatCurrency(deal.arr_value)}</Text>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {filteredData.length > 20 && (
        <Text className="text-center text-xs text-gray-500 mt-3">
          Showing 20 of {filteredData.length} zombie deals
        </Text>
      )}

      {/* Action Guidance */}
      {filteredData.length > 0 && (
        <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <Flex className="gap-2" alignItems="start">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <Text className="text-sm font-semibold text-amber-800">Pipeline Hygiene Recommendation</Text>
              <Text className="text-xs text-amber-700 mt-1">
                Review these deals and take action: Reactivate deals with legitimate potential (add next step),
                or mark as Closed Lost to maintain accurate pipeline metrics.
              </Text>
            </div>
          </Flex>
        </div>
      )}

      {/* Modal */}
      <DealDetailModal />
    </Card>
  );
};

export default ZombieDealsTab;
