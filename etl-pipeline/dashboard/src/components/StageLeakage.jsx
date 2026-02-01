import React, { useMemo, useState } from 'react';
import {
  Card,
  Title,
  Text,
  DonutChart,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Flex,
  Select,
  SelectItem,
} from '@tremor/react';
import {
  FunnelIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  UserIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../services/api';
import MetricInfo from './MetricInfo';

const API_BASE = process.env.REACT_APP_API_URL || '';

/**
 * StageLeakage Component
 * Visualizes pipeline leakage by stage and exit type
 * Source: v_stage_leakage
 */
const StageLeakage = ({ data }) => {
  const [exitTypeFilter, setExitTypeFilter] = useState('all');
  const [selectedStage, setSelectedStage] = useState(null);
  const [stageDeals, setStageDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Process data for charts
  const { chartData, filteredData, exitTypes, totals } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], filteredData: [], exitTypes: [], totals: { count: 0, value: 0 } };
    }

    // Get unique exit types
    const types = [...new Set(data.map(d => d.exit_type))];

    // Filter data
    const filtered = exitTypeFilter === 'all'
      ? data
      : data.filter(d => d.exit_type === exitTypeFilter);

    // Calculate totals
    const totalCount = filtered.reduce((sum, d) => sum + d.exit_count, 0);
    const totalValue = filtered.reduce((sum, d) => sum + d.exit_value, 0);

    // Aggregate by stage for donut chart
    const byStage = {};
    filtered.forEach(d => {
      if (!byStage[d.from_stage]) {
        byStage[d.from_stage] = { name: d.from_stage, value: 0, count: 0 };
      }
      byStage[d.from_stage].value += d.exit_value;
      byStage[d.from_stage].count += d.exit_count;
    });

    return {
      chartData: Object.values(byStage).sort((a, b) => b.value - a.value),
      filteredData: filtered,
      exitTypes: types,
      totals: { count: totalCount, value: totalValue },
    };
  }, [data, exitTypeFilter]);

  // Color mapping for exit types
  const exitTypeColors = {
    'Won': 'emerald',
    'Lost': 'red',
    'Moved': 'amber',
    'Closed Won': 'emerald',
    'Closed Lost': 'red',
  };

  // Handle row click - fetch deals for that stage
  const handleRowClick = async (row) => {
    setSelectedStage(row);
    setLoadingDeals(true);
    setStageDeals([]);

    try {
      const response = await fetch(
        `${API_BASE}/api/deals-by-stage-exit?stage=${encodeURIComponent(row.from_stage)}&exitType=${encodeURIComponent(row.exit_type)}`
      );
      if (response.ok) {
        const deals = await response.json();
        setStageDeals(deals);
      } else {
        console.error('Failed to fetch deals:', response.status);
      }
    } catch (err) {
      console.error('Error fetching stage deals:', err);
    } finally {
      setLoadingDeals(false);
    }
  };

  // Deal Detail Modal
  const DealDetailModal = () => {
    if (!selectedDeal) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{selectedDeal.dealname}</h2>
              {selectedDeal.company_name && (
                <p className="text-blue-100 text-sm">{selectedDeal.company_name}</p>
              )}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <UserIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">Account Executive</Text>
                  <Text className="font-semibold">{selectedDeal.owner}</Text>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">Deal Size</Text>
                  <Text className="font-semibold text-emerald-600">{formatCurrency(selectedDeal.arr_value)}</Text>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <div>
                <Text className="text-xs text-gray-500">Stage</Text>
                <Text className="font-semibold">{selectedDeal.stage}</Text>
              </div>
            </div>

            {selectedDeal.close_date && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">Close Date</Text>
                  <Text className="font-semibold">
                    {new Date(selectedDeal.close_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </div>
              </div>
            )}
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

  // Stage Deals Modal
  const StageDealsModal = () => {
    if (!selectedStage) return null;

    const isWon = selectedStage.exit_type === 'Won' || selectedStage.exit_type === 'Closed Won';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${isWon ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} px-6 py-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <FunnelIcon className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedStage.exit_type} from {selectedStage.from_stage}
                </h2>
                <p className={`${isWon ? 'text-emerald-100' : 'text-red-100'} text-sm`}>
                  {selectedStage.exit_count} deals · {formatCurrency(selectedStage.exit_value)} total
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedStage(null);
                setStageDeals([]);
              }}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loadingDeals ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : stageDeals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FunnelIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                {selectedStage?.exit_type === 'Moved' ? (
                  <>
                    <p className="font-medium">Stage progression data</p>
                    <p className="text-xs mt-1">These deals moved forward in the pipeline.<br/>
                    View the Stage Transition Matrix for detailed movement tracking.</p>
                  </>
                ) : (
                  <p>No deals found for this stage exit</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Deal Name</TableHeaderCell>
                    <TableHeaderCell>Account Executive</TableHeaderCell>
                    <TableHeaderCell className="text-right">Deal Size</TableHeaderCell>
                    <TableHeaderCell className="text-right">Close Date</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stageDeals.map((deal, idx) => (
                    <TableRow
                      key={deal.deal_id || idx}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setSelectedDeal(deal)}
                    >
                      <TableCell>
                        <div>
                          <span className="font-medium text-gray-900 hover:text-blue-600">
                            {deal.dealname}
                          </span>
                          {deal.company_name && (
                            <p className="text-xs text-gray-500">{deal.company_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{deal.owner}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${isWon ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(deal.arr_value)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-gray-500 text-sm">
                          {deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          }) : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex justify-end">
            <button
              onClick={() => {
                setSelectedStage(null);
                setStageDeals([]);
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <Title>Stage Leakage</Title>
          <MetricInfo id="Stage Leakage" />
        </div>
        <Text className="text-gray-500 mt-2">No leakage data available</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Flex justifyContent="between" alignItems="start">
        <div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-red-500" />
            <Title>Stage Leakage</Title>
            <MetricInfo id="Stage Leakage" />
          </div>
          <Text className="mt-1">Where deals exit the pipeline (click row to see deals)</Text>
        </div>
        <Select
          value={exitTypeFilter}
          onValueChange={setExitTypeFilter}
          className="max-w-[150px]"
        >
          <SelectItem value="all">All Types</SelectItem>
          {exitTypes.map(type => (
            <SelectItem key={type} value={type}>{type}</SelectItem>
          ))}
        </Select>
      </Flex>

      {/* Summary Stats */}
      <Flex className="mt-4 gap-4">
        <div>
          <Text className="text-gray-500">Total Exits</Text>
          <Text className="text-2xl font-bold">{totals.count}</Text>
        </div>
        <div>
          <Text className="text-gray-500">Total Value Lost</Text>
          <Text className="text-2xl font-bold text-red-600">{formatCurrency(totals.value)}</Text>
        </div>
      </Flex>

      {/* Donut Chart */}
      <DonutChart
        className="mt-6 h-48"
        data={chartData}
        category="value"
        index="name"
        valueFormatter={(value) => formatCurrency(value)}
        colors={['red', 'amber', 'orange', 'rose', 'pink', 'fuchsia']}
      />

      {/* Leakage Table - Now Clickable */}
      <Table className="mt-6">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Stage</TableHeaderCell>
            <TableHeaderCell>Exit Type</TableHeaderCell>
            <TableHeaderCell className="text-right">Count</TableHeaderCell>
            <TableHeaderCell className="text-right">Value</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredData.slice(0, 10).map((row, idx) => (
            <TableRow
              key={idx}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleRowClick(row)}
            >
              <TableCell>
                <Text className="font-medium text-blue-600 hover:underline">{row.from_stage}</Text>
              </TableCell>
              <TableCell>
                <Badge color={exitTypeColors[row.exit_type] || 'gray'}>
                  {row.exit_type}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Text>{row.exit_count}</Text>
              </TableCell>
              <TableCell className="text-right">
                <Text className={row.exit_type === 'Won' || row.exit_type === 'Closed Won' ? 'text-emerald-600' : 'text-red-600'}>
                  {formatCurrency(row.exit_value)}
                </Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modals */}
      <StageDealsModal />
      <DealDetailModal />
    </Card>
  );
};

export default StageLeakage;
