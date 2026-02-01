import React, { useMemo, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Flex,
  Badge,
  TextInput,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@tremor/react';
import { GitBranch, ArrowRight } from 'lucide-react';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_PATHS_COUNT = 5;
const LOAD_MORE_COUNT = 5;

/**
 * Stage Transition Matrix Component
 * Shows a heatmap of deal movements between stages in the last 7 days
 * Features: Sticky headers, search filter, Load More for transition paths
 */
const StageTransitionMatrix = ({ data, onDealClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayPathsCount, setDisplayPathsCount] = useState(INITIAL_PATHS_COUNT);
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Define the stage order for the matrix (matches 3PL New Business pipeline)
  const stageOrder = [
    'New',
    'NBM Scheduled',
    'Discovery',
    'Technical Evaluation',
    'Solution Alignment',
    'Commercial Review',
    'Stalled / Delayed',
    'Closed Won',
    'Closed Lost',
  ];

  // Build transition matrix from data
  const { matrix, maxCount, totalMovements, filteredMovements, newDealsCount } = useMemo(() => {
    if (!data || data.length === 0) {
      return { matrix: {}, maxCount: 0, totalMovements: 0, filteredMovements: 0, newDealsCount: 0 };
    }

    const transitions = {};
    let max = 0;
    let total = 0;
    let filtered = 0;
    let newDeals = 0;

    // ONLY include actual stage transitions (where previous_stage exists)
    // "New Deal" entries are NOT stage transitions - they're deals appearing in the system for the first time
    // This prevents misleading "New → NBM Scheduled" counts when deals were created directly in NBM Scheduled
    const stageChanges = data.filter(d => {
      // Count new deals separately but don't include in matrix
      if (d.movement_type === 'New Deal') {
        const closedStages = ['Closed Won', 'Closed Lost', 'Closed won', 'Closed lost'];
        if (!closedStages.includes(d.current_stage)) {
          newDeals++;
        }
        return false; // Don't include in transition matrix
      }
      // Only include actual stage changes (previous_stage must exist)
      if (d.movement_type === 'Stage Change' || d.movement_type === 'Closed') {
        return d.previous_stage != null;
      }
      return false;
    });

    stageChanges.forEach(movement => {
      const from = movement.previous_stage;
      const to = movement.current_stage;

      // Skip if no valid from stage (shouldn't happen after filter, but safety check)
      if (!from) return;

      // Check if matches search
      const matchesSearch = !searchTerm ||
        movement.deal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        to.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return;

      filtered += 1;

      if (!transitions[from]) {
        transitions[from] = {};
      }
      if (!transitions[from][to]) {
        transitions[from][to] = { count: 0, value: 0, deals: [] };
      }

      transitions[from][to].count += 1;
      transitions[from][to].value += movement.value_arr || 0;
      transitions[from][to].deals.push(movement);

      if (transitions[from][to].count > max) {
        max = transitions[from][to].count;
      }
      total += 1;
    });

    return { matrix: transitions, maxCount: max, totalMovements: total, filteredMovements: filtered, newDealsCount: newDeals };
  }, [data, searchTerm]);

  // Get all transition paths sorted by count
  const allTransitionPaths = useMemo(() => {
    return Object.entries(matrix)
      .flatMap(([from, tos]) =>
        Object.entries(tos).map(([to, pathData]) => ({
          from,
          to,
          count: pathData.count,
          value: pathData.value,
          deals: pathData.deals,
        }))
      )
      .sort((a, b) => b.count - a.count);
  }, [matrix]);

  // Paginated paths for display
  const displayedPaths = allTransitionPaths.slice(0, displayPathsCount);
  const hasMorePaths = displayPathsCount < allTransitionPaths.length;
  const isPathsExpanded = displayPathsCount > INITIAL_PATHS_COUNT;

  // Handle Load More Paths
  const handleShowMorePaths = () => {
    setDisplayPathsCount(prev => Math.min(prev + LOAD_MORE_COUNT, allTransitionPaths.length));
  };

  // Handle Collapse Paths
  const handleCollapsePaths = () => {
    setDisplayPathsCount(INITIAL_PATHS_COUNT);
  };

  // Get color intensity based on count
  const getColorIntensity = (count) => {
    if (!count || maxCount === 0) return 'bg-gray-50';
    const intensity = count / maxCount;

    if (intensity >= 0.8) return 'bg-blue-600 text-white';
    if (intensity >= 0.6) return 'bg-blue-500 text-white';
    if (intensity >= 0.4) return 'bg-blue-400 text-white';
    if (intensity >= 0.2) return 'bg-blue-300 text-blue-900';
    if (intensity > 0) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-50 text-gray-400';
  };

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value?.toLocaleString() || 0}`;
  };

  // Get unique stages from actual data
  const allStages = useMemo(() => {
    if (!data || data.length === 0) return stageOrder;

    const stages = new Set();
    data.forEach(d => {
      if (d.previous_stage) stages.add(d.previous_stage);
      if (d.current_stage) stages.add(d.current_stage);
    });

    // Sort stages by their position in stageOrder, unknown stages go to end
    return Array.from(stages).sort((a, b) => {
      const aIndex = stageOrder.indexOf(a);
      const bIndex = stageOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [data]);

  // Handle cell click - open modal with deals
  const handleCellClick = (fromStage, toStage, cell) => {
    if (cell?.deals?.length > 0) {
      setSelectedTransition({
        from: fromStage,
        to: toStage,
        count: cell.count,
        value: cell.value,
        deals: cell.deals,
      });
    }
  };

  // Deal Detail Modal
  const DealDetailModal = () => {
    if (!selectedDeal) return null;

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{selectedDeal.deal_name}</h2>
              <p className="text-indigo-100 text-sm">{selectedDeal.owner_name}</p>
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
                  <Text className="font-semibold">{selectedDeal.owner_name}</Text>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">Deal Size</Text>
                  <Text className="font-semibold text-emerald-600">{formatCurrency(selectedDeal.value_arr)}</Text>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <ArrowRight className="h-5 w-5 text-gray-500" />
              <div>
                <Text className="text-xs text-gray-500">Transition</Text>
                <Text className="font-semibold">
                  {selectedDeal.previous_stage || 'New'} → {selectedDeal.current_stage}
                </Text>
              </div>
            </div>

            {selectedDeal.transition_date && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <Text className="text-xs text-gray-500">Transition Date</Text>
                  <Text className="font-semibold">
                    {new Date(selectedDeal.transition_date).toLocaleDateString('en-US', {
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
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
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

  // Transition Deals Modal
  const TransitionDealsModal = () => {
    if (!selectedTransition) return null;

    const isNewDeal = selectedTransition.from === 'New';

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isNewDeal ? `New Deals at ${selectedTransition.to}` : `${selectedTransition.from} → ${selectedTransition.to}`}
                </h2>
                <p className="text-indigo-100 text-sm">
                  {selectedTransition.count} deals · {formatCurrency(selectedTransition.value)} total
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTransition(null)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Deal Name</TableHeaderCell>
                  <TableHeaderCell>Account Executive</TableHeaderCell>
                  <TableHeaderCell className="text-right">Deal Size</TableHeaderCell>
                  <TableHeaderCell className="text-right">Date</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedTransition.deals.map((deal, idx) => (
                  <TableRow
                    key={deal.deal_id || idx}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <TableCell>
                      <span className="font-medium text-gray-900 hover:text-indigo-600">
                        {deal.deal_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{deal.owner_name}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(deal.value_arr)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-gray-500 text-sm">
                        {deal.transition_date ? new Date(deal.transition_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        }) : '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex justify-end">
            <button
              onClick={() => setSelectedTransition(null)}
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
      <Card className="bg-white">
        <Flex justifyContent="start" className="space-x-2 mb-4">
          <GitBranch className="h-5 w-5 text-indigo-500" />
          <Title>Stage Transition Matrix</Title>
        </Flex>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <Text>No stage transitions in the last 7 days</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <Flex justifyContent="between" alignItems="start" className="mb-4">
        <Flex justifyContent="start" className="space-x-2">
          <GitBranch className="h-5 w-5 text-indigo-500" />
          <div>
            <Title>Stage Transition Matrix</Title>
            <Text className="text-gray-500">Deal movements in the last 7 days</Text>
          </div>
        </Flex>
        <Flex justifyContent="end" className="space-x-3">
          <TextInput
            icon={MagnifyingGlassIcon}
            placeholder="Search stages..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setDisplayPathsCount(INITIAL_PATHS_COUNT);
            }}
            className="w-40"
          />
          <Badge color="indigo" size="lg">
            {filteredMovements} Stage Changes
          </Badge>
          {newDealsCount > 0 && (
            <Badge color="emerald" size="lg" title="New deals added to pipeline (not stage transitions)">
              +{newDealsCount} New Deals
            </Badge>
          )}
        </Flex>
      </Flex>

      {/* Matrix Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <Text className="text-gray-500">Intensity:</Text>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-50 border rounded"></div>
          <span className="text-gray-500">0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span className="text-gray-500">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-400 rounded"></div>
          <span className="text-gray-500">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span className="text-gray-500">High</span>
        </div>
      </div>

      {/* Matrix Table with Sticky Headers */}
      <div className="overflow-x-auto max-h-[350px] overflow-y-auto relative">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="p-2 text-left font-medium text-gray-500 bg-gray-50 sticky left-0 z-20">
                From / To
              </th>
              {allStages.map(stage => (
                <th
                  key={stage}
                  className="p-2 text-center font-medium text-gray-500 bg-gray-50 min-w-[80px]"
                  title={stage}
                >
                  {stage.length > 12 ? stage.substring(0, 10) + '...' : stage}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allStages.filter(s => s !== 'Closed Won' && s !== 'Closed Lost').map(fromStage => (
              <tr key={fromStage}>
                <td className="p-2 font-medium text-gray-700 bg-gray-50 sticky left-0 whitespace-nowrap z-10">
                  {fromStage}
                </td>
                {allStages.map(toStage => {
                  const cell = matrix[fromStage]?.[toStage];
                  const count = cell?.count || 0;
                  const value = cell?.value || 0;

                  return (
                    <td
                      key={`${fromStage}-${toStage}`}
                      className={`p-2 text-center cursor-pointer transition-all hover:ring-2 hover:ring-indigo-400 ${getColorIntensity(count)}`}
                      title={count > 0 ? `${count} deals (${formatCurrency(value)}) - Click to view` : 'No transitions'}
                      onClick={() => handleCellClick(fromStage, toStage, cell)}
                    >
                      {count > 0 ? (
                        <div>
                          <div className="font-bold">{count}</div>
                          <div className="text-[10px] opacity-75">{formatCurrency(value)}</div>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Transitions Summary with Load More */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <Flex justifyContent="between" alignItems="center" className="mb-3">
          <Text className="text-gray-500 text-sm">Top Transition Paths</Text>
          <Text className="text-gray-400 text-xs">
            Showing {Math.min(displayPathsCount, allTransitionPaths.length)} of {allTransitionPaths.length} paths
          </Text>
        </Flex>

        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {displayedPaths.map((transition, idx) => (
              <motion.div
                key={`${transition.from}-${transition.to}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: idx >= displayPathsCount - LOAD_MORE_COUNT ? (idx % LOAD_MORE_COUNT) * 0.05 : 0 }}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 rounded-full text-xs cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  if (transition.deals?.length > 0) {
                    setSelectedTransition({
                      from: transition.from,
                      to: transition.to,
                      count: transition.count,
                      value: transition.value,
                      deals: transition.deals,
                    });
                  }
                }}
              >
                <span className="font-medium text-gray-700">{transition.from}</span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <span className="font-medium text-gray-700">{transition.to}</span>
                <Badge color="blue" size="xs">{transition.count}</Badge>
                <span className="text-gray-400 text-[10px]">{formatCurrency(transition.value)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Load More / Collapse Buttons for Paths */}
        {allTransitionPaths.length > INITIAL_PATHS_COUNT && (
          <Flex justifyContent="center" className="mt-4 gap-3">
            {hasMorePaths && (
              <button
                onClick={handleShowMorePaths}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronDownIcon className="h-3 w-3" />
                Show More ({Math.min(LOAD_MORE_COUNT, allTransitionPaths.length - displayPathsCount)} more)
              </button>
            )}
            {isPathsExpanded && (
              <button
                onClick={handleCollapsePaths}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <ChevronUpIcon className="h-3 w-3" />
                Collapse
              </button>
            )}
          </Flex>
        )}
      </div>

      {/* Modals */}
      <TransitionDealsModal />
      <DealDetailModal />
    </Card>
  );
};

export default StageTransitionMatrix;
