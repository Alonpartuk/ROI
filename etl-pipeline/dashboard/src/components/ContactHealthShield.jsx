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
  DonutChart,
  Select,
  SelectItem,
} from '@tremor/react';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
  EnvelopeIcon,
  CalendarIcon,
  UserIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, fetchContactHealth } from '../services/api';
import MetricInfo from './MetricInfo';

/**
 * ContactHealthShield Component
 * Shows deal contact health with RED/YELLOW/GREEN status
 *
 * Rules:
 * - RED: 0 contacts OR days_since_activity > 14
 * - YELLOW: contact_count = 1 OR days_since_activity BETWEEN 14 AND 21
 * - GREEN: contact_count >= 2 AND days_since_activity <= 14
 *
 * Octup Colors: #809292 (primary), #00CBC0 (cyan), #FF3489 (pink)
 */
const ContactHealthShield = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [healthFilter, setHealthFilter] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchContactHealth();
        setData(result || []);
      } catch (err) {
        console.error('Error loading contact health:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Process and filter data
  const { filteredData, healthSummary, donutData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { filteredData: [], healthSummary: {}, donutData: [] };
    }

    // Calculate health summary
    const summary = {
      RED: { count: 0, value: 0 },
      YELLOW: { count: 0, value: 0 },
      GREEN: { count: 0, value: 0 },
    };

    data.forEach(deal => {
      const status = deal.health_status || 'RED';
      if (summary[status]) {
        summary[status].count++;
        summary[status].value += deal.arr_value || 0;
      }
    });

    // Filter data
    const filtered = healthFilter === 'all'
      ? data
      : data.filter(d => d.health_status === healthFilter);

    // Donut chart data
    const donut = [
      { name: 'Healthy', value: summary.GREEN.count, color: 'emerald' },
      { name: 'At Risk', value: summary.YELLOW.count, color: 'amber' },
      { name: 'Critical', value: summary.RED.count, color: 'red' },
    ].filter(d => d.value > 0);

    return { filteredData: filtered, healthSummary: summary, donutData: donut };
  }, [data, healthFilter]);

  // Health status badge config
  const getHealthBadge = (status) => {
    switch (status) {
      case 'GREEN':
        return { color: 'emerald', text: 'Healthy', icon: ShieldCheckIcon };
      case 'YELLOW':
        return { color: 'amber', text: 'At Risk', icon: ShieldExclamationIcon };
      case 'RED':
      default:
        return { color: 'red', text: 'Critical', icon: ShieldExclamationIcon };
    }
  };

  // Deal Detail Modal
  const DealDetailModal = () => {
    if (!selectedDeal) return null;
    const badge = getHealthBadge(selectedDeal.health_status);
    const BadgeIcon = badge.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${selectedDeal.health_status === 'GREEN' ? 'from-emerald-500 to-emerald-600' : selectedDeal.health_status === 'YELLOW' ? 'from-amber-500 to-amber-600' : 'from-red-500 to-red-600'} px-6 py-4 flex items-center justify-between`}>
            <div>
              <h2 className="text-lg font-bold text-white">{selectedDeal.dealname}</h2>
              <p className="text-white/80 text-sm">{selectedDeal.company_name}</p>
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
            {/* Health Status */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
              <BadgeIcon className={`h-8 w-8 ${selectedDeal.health_status === 'GREEN' ? 'text-emerald-500' : selectedDeal.health_status === 'YELLOW' ? 'text-amber-500' : 'text-red-500'}`} />
              <div>
                <Text className="text-xs text-gray-500">Contact Health</Text>
                <Badge color={badge.color} size="lg">{badge.text}</Badge>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <UserGroupIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">Contacts</Text>
                  <Text className="font-semibold">{selectedDeal.contact_count || 0}</Text>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">Days Since Activity</Text>
                  <Text className={`font-semibold ${selectedDeal.days_since_activity > 14 ? 'text-red-600' : ''}`}>
                    {selectedDeal.days_since_activity || 0}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">AE Emails</Text>
                  <Text className="font-semibold">{selectedDeal.ae_email_count || 0}</Text>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">AE Meetings</Text>
                  <Text className="font-semibold">{selectedDeal.ae_meeting_count || 0}</Text>
                </div>
              </div>
            </div>

            {/* Exec Sponsor */}
            <div className={`flex items-center gap-3 rounded-lg p-3 ${selectedDeal.has_exec_sponsor ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <UserIcon className={`h-5 w-5 ${selectedDeal.has_exec_sponsor ? 'text-emerald-500' : 'text-red-500'}`} />
              <div>
                <Text className="text-xs text-gray-500">Executive Sponsor</Text>
                <Text className={`font-semibold ${selectedDeal.has_exec_sponsor ? 'text-emerald-700' : 'text-red-700'}`}>
                  {selectedDeal.has_exec_sponsor ? 'Identified' : 'Not Identified'}
                </Text>
              </div>
            </div>

            {/* Deal Value */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <div>
                <Text className="text-xs text-gray-500">Deal Value</Text>
                <Text className="font-semibold text-lg text-[#00CBC0]">{formatCurrency(selectedDeal.arr_value)}</Text>
              </div>
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
            {selectedDeal.hubspot_url && (
              <a
                href={selectedDeal.hubspot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
              >
                Open in HubSpot
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
        <Flex justifyContent="start" alignItems="center" className="gap-2">
          <ShieldCheckIcon className="h-5 w-5 text-[#00CBC0]" />
          <Title>Contact Health Shield</Title>
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
          <ShieldCheckIcon className="h-5 w-5 text-[#00CBC0]" />
          <Title>Contact Health Shield</Title>
        </Flex>
        <Text className="text-red-500 mt-4">Error loading data: {error}</Text>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Flex justifyContent="start" alignItems="center" className="gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-[#00CBC0]" />
            <Title>Contact Health Shield</Title>
            <MetricInfo id="Contact Health Shield" />
          </Flex>
          <Text className="mt-1">Deal contact engagement status</Text>
        </div>
        <Select
          value={healthFilter}
          onValueChange={setHealthFilter}
          className="max-w-[150px]"
        >
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="RED">Critical</SelectItem>
          <SelectItem value="YELLOW">At Risk</SelectItem>
          <SelectItem value="GREEN">Healthy</SelectItem>
        </Select>
      </Flex>

      {/* Summary Stats */}
      <Flex className="mt-4 gap-6" alignItems="start">
        {/* Donut Chart */}
        <div className="w-48">
          <DonutChart
            data={donutData}
            category="value"
            index="name"
            colors={['emerald', 'amber', 'red']}
            className="h-36"
            showLabel={true}
            label={`${data.length} deals`}
          />
        </div>

        {/* Stats Cards */}
        <div className="flex-1 grid grid-cols-3 gap-3">
          <div
            className={`p-3 rounded-lg cursor-pointer transition-all ${healthFilter === 'RED' ? 'ring-2 ring-red-500' : ''} bg-red-50 hover:bg-red-100`}
            onClick={() => setHealthFilter(healthFilter === 'RED' ? 'all' : 'RED')}
          >
            <Text className="text-xs text-red-600 font-medium">Critical</Text>
            <Text className="text-2xl font-bold text-red-700">{healthSummary.RED?.count || 0}</Text>
            <Text className="text-xs text-red-500">{formatCurrency(healthSummary.RED?.value || 0)}</Text>
          </div>
          <div
            className={`p-3 rounded-lg cursor-pointer transition-all ${healthFilter === 'YELLOW' ? 'ring-2 ring-amber-500' : ''} bg-amber-50 hover:bg-amber-100`}
            onClick={() => setHealthFilter(healthFilter === 'YELLOW' ? 'all' : 'YELLOW')}
          >
            <Text className="text-xs text-amber-600 font-medium">At Risk</Text>
            <Text className="text-2xl font-bold text-amber-700">{healthSummary.YELLOW?.count || 0}</Text>
            <Text className="text-xs text-amber-500">{formatCurrency(healthSummary.YELLOW?.value || 0)}</Text>
          </div>
          <div
            className={`p-3 rounded-lg cursor-pointer transition-all ${healthFilter === 'GREEN' ? 'ring-2 ring-emerald-500' : ''} bg-emerald-50 hover:bg-emerald-100`}
            onClick={() => setHealthFilter(healthFilter === 'GREEN' ? 'all' : 'GREEN')}
          >
            <Text className="text-xs text-emerald-600 font-medium">Healthy</Text>
            <Text className="text-2xl font-bold text-emerald-700">{healthSummary.GREEN?.count || 0}</Text>
            <Text className="text-xs text-emerald-500">{formatCurrency(healthSummary.GREEN?.value || 0)}</Text>
          </div>
        </div>
      </Flex>

      {/* Deals Table */}
      <Table className="mt-6">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Deal</TableHeaderCell>
            <TableHeaderCell className="text-center">Health</TableHeaderCell>
            <TableHeaderCell className="text-center">Contacts</TableHeaderCell>
            <TableHeaderCell className="text-center">Days Inactive</TableHeaderCell>
            <TableHeaderCell className="text-center">Exec Sponsor</TableHeaderCell>
            <TableHeaderCell className="text-right">Value</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <Text className="text-gray-500">No deals match the current filter</Text>
              </TableCell>
            </TableRow>
          ) : (
            filteredData.slice(0, 15).map((deal, idx) => {
              const badge = getHealthBadge(deal.health_status);
              return (
                <TableRow
                  key={deal.deal_id || idx}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedDeal(deal)}
                >
                  <TableCell>
                    <div>
                      <Text className="font-medium text-gray-900 hover:text-blue-600">{deal.dealname}</Text>
                      <Text className="text-xs text-gray-500">{deal.owner}</Text>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color={badge.color}>{badge.text}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Text className={deal.contact_count === 0 ? 'text-red-600 font-semibold' : ''}>
                      {deal.contact_count || 0}
                    </Text>
                  </TableCell>
                  <TableCell className="text-center">
                    <Text className={deal.days_since_activity > 14 ? 'text-red-600 font-semibold' : ''}>
                      {deal.days_since_activity || 0}
                    </Text>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color={deal.has_exec_sponsor ? 'emerald' : 'red'} size="xs">
                      {deal.has_exec_sponsor ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className="font-semibold">{formatCurrency(deal.arr_value)}</Text>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {filteredData.length > 15 && (
        <Text className="text-center text-xs text-gray-500 mt-3">
          Showing 15 of {filteredData.length} deals
        </Text>
      )}

      {/* Modal */}
      <DealDetailModal />
    </Card>
  );
};

export default ContactHealthShield;
