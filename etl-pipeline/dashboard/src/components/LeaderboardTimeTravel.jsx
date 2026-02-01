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
  TabGroup,
  TabList,
  Tab,
  Select,
  SelectItem,
} from '@tremor/react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowsRightLeftIcon,
  SparklesIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, fetchLeaderboard } from '../services/api';
import MetricInfo from './MetricInfo';

/**
 * LeaderboardTimeTravel Component
 * Enhanced leaderboard with time period toggle (7d/30d/QTD)
 * and multiple sort options
 *
 * Octup Colors: #809292 (primary), #00CBC0 (cyan), #FF3489 (pink)
 */
const LeaderboardTimeTravel = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [sortBy, setSortBy] = useState('net_pipeline_added');

  const periods = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'qtd', label: 'Q-T-D' },
  ];

  const sortOptions = [
    { value: 'net_pipeline_added', label: 'Net Pipeline Added', icon: ArrowTrendingUpIcon },
    { value: 'stage_movements', label: 'Stage Movements', icon: ArrowsRightLeftIcon },
    { value: 'engagement_score', label: 'Engagement Score', icon: SparklesIcon },
    { value: 'won_value', label: 'Won Value', icon: CurrencyDollarIcon },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchLeaderboard(period, sortBy);
        setData(result || []);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period, sortBy]);

  // Get rank badge color
  const getRankBadge = (rank) => {
    if (rank === 1) return { color: 'amber', icon: '🥇' };
    if (rank === 2) return { color: 'gray', icon: '🥈' };
    if (rank === 3) return { color: 'orange', icon: '🥉' };
    return { color: 'gray', icon: rank };
  };

  // Period tab index
  const periodIndex = periods.findIndex(p => p.value === period);

  if (loading && data.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
        <Flex justifyContent="start" alignItems="center" className="gap-2">
          <TrophyIcon className="h-5 w-5 text-amber-500" />
          <Title>Rep Leaderboard</Title>
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
          <TrophyIcon className="h-5 w-5 text-amber-500" />
          <Title>Rep Leaderboard</Title>
        </Flex>
        <Text className="text-red-500 mt-4">Error loading data: {error}</Text>
      </Card>
    );
  }

  // Get the current sort icon
  const currentSortOption = sortOptions.find(s => s.value === sortBy);
  const SortIcon = currentSortOption?.icon || ArrowTrendingUpIcon;

  return (
    <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
      <Flex justifyContent="between" alignItems="start" className="flex-wrap gap-4">
        <div>
          <Flex justifyContent="start" alignItems="center" className="gap-2">
            <TrophyIcon className="h-5 w-5 text-amber-500" />
            <Title>Rep Leaderboard</Title>
            <MetricInfo id="Leaderboard Time Travel" />
          </Flex>
          <Text className="mt-1">Performance rankings with time-travel</Text>
        </div>

        <Flex className="gap-3" alignItems="center">
          {/* Time Period Toggle */}
          <TabGroup
            index={periodIndex}
            onIndexChange={(idx) => setPeriod(periods[idx].value)}
          >
            <TabList variant="solid" color="cyan">
              {periods.map((p) => (
                <Tab key={p.value}>{p.label}</Tab>
              ))}
            </TabList>
          </TabGroup>

          {/* Sort Dropdown */}
          <Select
            value={sortBy}
            onValueChange={setSortBy}
            className="max-w-[180px]"
            icon={SortIcon}
          >
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </Select>
        </Flex>
      </Flex>

      {/* Loading overlay for refresh */}
      <div className={`relative ${loading ? 'opacity-50' : ''}`}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00CBC0]"></div>
          </div>
        )}

        <Table className="mt-6">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Rank</TableHeaderCell>
              <TableHeaderCell>Rep</TableHeaderCell>
              <TableHeaderCell className="text-right">
                <Flex className="gap-1 justify-end" alignItems="center">
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                  Net Pipeline
                </Flex>
              </TableHeaderCell>
              <TableHeaderCell className="text-right">
                <Flex className="gap-1 justify-end" alignItems="center">
                  <ArrowsRightLeftIcon className="h-4 w-4" />
                  Movements
                </Flex>
              </TableHeaderCell>
              <TableHeaderCell className="text-right">
                <Flex className="gap-1 justify-end" alignItems="center">
                  <SparklesIcon className="h-4 w-4" />
                  Engagement
                </Flex>
              </TableHeaderCell>
              <TableHeaderCell className="text-right">
                <Flex className="gap-1 justify-end" alignItems="center">
                  <CurrencyDollarIcon className="h-4 w-4" />
                  Won Value
                </Flex>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Text className="text-gray-500">No leaderboard data for this period</Text>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => {
                const rank = idx + 1;
                const rankBadge = getRankBadge(rank);
                const isTopThree = rank <= 3;

                return (
                  <TableRow
                    key={row.owner_name || idx}
                    className={isTopThree ? 'bg-amber-50/30' : 'hover:bg-gray-50'}
                  >
                    <TableCell>
                      <Badge
                        color={rankBadge.color}
                        size="lg"
                        className={isTopThree ? 'font-bold' : ''}
                      >
                        {typeof rankBadge.icon === 'string' && rankBadge.icon.length > 1
                          ? rankBadge.icon
                          : `#${rank}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Text className={`font-medium ${isTopThree ? 'text-gray-900' : 'text-gray-700'}`}>
                        {row.owner_name}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right">
                      <Text className={`font-semibold ${sortBy === 'net_pipeline_added' ? 'text-[#00CBC0]' : ''} ${row.net_pipeline_added < 0 ? 'text-red-600' : ''}`}>
                        {row.net_pipeline_added >= 0 ? '+' : ''}{formatCurrency(row.net_pipeline_added)}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right">
                      <Text className={`font-semibold ${sortBy === 'stage_movements' ? 'text-[#00CBC0]' : 'text-gray-700'}`}>
                        {row.stage_movements_count || 0}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right">
                      <Flex className="gap-1 justify-end" alignItems="center">
                        <div
                          className={`w-12 h-2 rounded-full overflow-hidden bg-gray-200`}
                        >
                          <div
                            className={`h-full ${sortBy === 'engagement_score' ? 'bg-[#00CBC0]' : 'bg-gray-400'}`}
                            style={{ width: `${Math.min(row.engagement_score || 0, 100)}%` }}
                          />
                        </div>
                        <Text className={`text-sm ${sortBy === 'engagement_score' ? 'text-[#00CBC0] font-semibold' : 'text-gray-600'}`}>
                          {row.engagement_score?.toFixed(0) || 0}
                        </Text>
                      </Flex>
                    </TableCell>
                    <TableCell className="text-right">
                      <Text className={`font-semibold ${sortBy === 'won_value' ? 'text-emerald-600' : 'text-gray-700'}`}>
                        {formatCurrency(row.won_value || 0)}
                      </Text>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer with period info */}
      <Flex className="mt-4 pt-4 border-t border-gray-100" justifyContent="between" alignItems="center">
        <Text className="text-xs text-gray-500">
          Showing performance for: <span className="font-medium text-gray-700">{periods.find(p => p.value === period)?.label}</span>
        </Text>
        <Text className="text-xs text-gray-500">
          Sorted by: <span className="font-medium text-[#00CBC0]">{currentSortOption?.label}</span>
        </Text>
      </Flex>
    </Card>
  );
};

export default LeaderboardTimeTravel;
