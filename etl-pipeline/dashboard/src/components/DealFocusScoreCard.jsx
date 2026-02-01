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
  ProgressCircle,
  Select,
  SelectItem,
} from '@tremor/react';
import {
  SparklesIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, fetchDealFocusScores } from '../services/api';
import MetricInfo from './MetricInfo';

/**
 * DealFocusScoreCard Component
 * Shows Deal Focus Score (0-100) for prioritization
 *
 * Score Components:
 * - stage_age_score (25): 1 - days_in_stage / max_healthy_days
 * - engagement_score (25): 1 - days_since_activity / 21
 * - threading_score (25): MIN(25, 25 * contact_count / 3)
 * - size_score (25): arr_value / max_arr
 *
 * Octup Colors: #809292 (primary), #00CBC0 (cyan), #FF3489 (pink)
 */
const DealFocusScoreCard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchDealFocusScores();
        setData(result || []);
      } catch (err) {
        console.error('Error loading deal focus scores:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get unique owners
  const owners = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map(d => d.owner))].filter(Boolean).sort();
  }, [data]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    let filtered = data;
    if (ownerFilter !== 'all') {
      filtered = data.filter(d => d.owner === ownerFilter);
    }
    // Sort by focus score descending (highest priority first)
    return [...filtered].sort((a, b) => (b.focus_score || 0) - (a.focus_score || 0));
  }, [data, ownerFilter]);

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 75) return 'emerald';
    if (score >= 50) return 'cyan';
    if (score >= 25) return 'amber';
    return 'red';
  };

  // Get score label
  const getScoreLabel = (score) => {
    if (score >= 75) return 'High Priority';
    if (score >= 50) return 'Medium Priority';
    if (score >= 25) return 'Low Priority';
    return 'Needs Attention';
  };

  // Score breakdown component
  const ScoreBreakdown = ({ deal }) => {
    const scores = [
      { name: 'Stage Age', value: deal.stage_age_score || 0, max: 25, icon: ClockIcon, color: 'blue' },
      { name: 'Engagement', value: deal.engagement_score || 0, max: 25, icon: ChatBubbleLeftRightIcon, color: 'purple' },
      { name: 'Threading', value: deal.threading_score || 0, max: 25, icon: UserGroupIcon, color: 'pink' },
      { name: 'Deal Size', value: deal.size_score || 0, max: 25, icon: CurrencyDollarIcon, color: 'green' },
    ];

    return (
      <div className="space-y-3">
        {scores.map(({ name, value, max, icon: Icon, color }) => (
          <div key={name}>
            <Flex className="mb-1" justifyContent="between" alignItems="center">
              <Flex className="gap-2" alignItems="center">
                <Icon className={`h-4 w-4 text-${color}-500`} />
                <Text className="text-xs text-gray-600">{name}</Text>
              </Flex>
              <Text className="text-xs font-semibold">{value.toFixed(0)}/{max}</Text>
            </Flex>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-${color}-500 transition-all duration-300`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Deal Detail Modal
  const DealDetailModal = () => {
    if (!selectedDeal) return null;
    const scoreColor = getScoreColor(selectedDeal.focus_score);
    const scoreLabel = getScoreLabel(selectedDeal.focus_score);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00CBC0] to-[#00a89e] px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{selectedDeal.dealname}</h2>
              <p className="text-white/80 text-sm">{selectedDeal.owner}</p>
            </div>
            <button
              onClick={() => setSelectedDeal(null)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Focus Score Circle */}
            <Flex className="gap-6" alignItems="center" justifyContent="center">
              <ProgressCircle
                value={selectedDeal.focus_score || 0}
                size="xl"
                color={scoreColor}
                showAnimation={true}
              >
                <div className="text-center">
                  <Text className="text-3xl font-bold text-gray-900">
                    {(selectedDeal.focus_score || 0).toFixed(0)}
                  </Text>
                  <Text className="text-xs text-gray-500">Focus Score</Text>
                </div>
              </ProgressCircle>
              <div>
                <Badge color={scoreColor} size="lg">{scoreLabel}</Badge>
                <Text className="text-sm text-gray-500 mt-2">
                  {formatCurrency(selectedDeal.arr_value)} Deal
                </Text>
              </div>
            </Flex>

            {/* Score Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <Text className="text-sm font-semibold text-gray-700 mb-4">Score Breakdown</Text>
              <ScoreBreakdown deal={selectedDeal} />
            </div>

            {/* Insights */}
            <div className="space-y-2">
              {selectedDeal.stage_age_score < 10 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <ClockIcon className="h-4 w-4" />
                  <span>Deal has been in stage too long - consider progressing</span>
                </div>
              )}
              {selectedDeal.engagement_score < 10 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  <span>Low engagement - schedule activity soon</span>
                </div>
              )}
              {selectedDeal.threading_score < 10 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>Limited contacts - multi-thread this deal</span>
                </div>
              )}
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
          <SparklesIcon className="h-5 w-5 text-[#00CBC0]" />
          <Title>Deal Focus Scores</Title>
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
          <SparklesIcon className="h-5 w-5 text-[#00CBC0]" />
          <Title>Deal Focus Scores</Title>
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
            <SparklesIcon className="h-5 w-5 text-[#00CBC0]" />
            <Title>Deal Focus Scores</Title>
            <MetricInfo id="Deal Focus Score" />
          </Flex>
          <Text className="mt-1">AI-powered deal prioritization (0-100)</Text>
        </div>
        <Select
          value={ownerFilter}
          onValueChange={setOwnerFilter}
          className="max-w-[180px]"
        >
          <SelectItem value="all">All Owners</SelectItem>
          {owners.map(owner => (
            <SelectItem key={owner} value={owner}>{owner}</SelectItem>
          ))}
        </Select>
      </Flex>

      {/* Summary Stats */}
      <Flex className="mt-4 gap-4" justifyContent="start">
        <div className="px-3 py-2 bg-emerald-50 rounded-lg">
          <Text className="text-xs text-emerald-600">High Priority (75+)</Text>
          <Text className="text-lg font-bold text-emerald-700">
            {filteredData.filter(d => d.focus_score >= 75).length}
          </Text>
        </div>
        <div className="px-3 py-2 bg-cyan-50 rounded-lg">
          <Text className="text-xs text-cyan-600">Medium (50-74)</Text>
          <Text className="text-lg font-bold text-cyan-700">
            {filteredData.filter(d => d.focus_score >= 50 && d.focus_score < 75).length}
          </Text>
        </div>
        <div className="px-3 py-2 bg-amber-50 rounded-lg">
          <Text className="text-xs text-amber-600">Low (25-49)</Text>
          <Text className="text-lg font-bold text-amber-700">
            {filteredData.filter(d => d.focus_score >= 25 && d.focus_score < 50).length}
          </Text>
        </div>
        <div className="px-3 py-2 bg-red-50 rounded-lg">
          <Text className="text-xs text-red-600">Needs Attention (&lt;25)</Text>
          <Text className="text-lg font-bold text-red-700">
            {filteredData.filter(d => d.focus_score < 25).length}
          </Text>
        </div>
      </Flex>

      {/* Deals Table */}
      <Table className="mt-6">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Score</TableHeaderCell>
            <TableHeaderCell>Deal</TableHeaderCell>
            <TableHeaderCell>Owner</TableHeaderCell>
            <TableHeaderCell className="text-center">Stage Age</TableHeaderCell>
            <TableHeaderCell className="text-center">Engagement</TableHeaderCell>
            <TableHeaderCell className="text-center">Threading</TableHeaderCell>
            <TableHeaderCell className="text-right">Value</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <Text className="text-gray-500">No deals with focus scores</Text>
              </TableCell>
            </TableRow>
          ) : (
            filteredData.slice(0, 15).map((deal, idx) => {
              const scoreColor = getScoreColor(deal.focus_score);
              return (
                <TableRow
                  key={deal.deal_id || idx}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedDeal(deal)}
                >
                  <TableCell>
                    <Flex className="gap-2" alignItems="center">
                      <ProgressCircle
                        value={deal.focus_score || 0}
                        size="sm"
                        color={scoreColor}
                      />
                      <Text className="font-bold">{(deal.focus_score || 0).toFixed(0)}</Text>
                    </Flex>
                  </TableCell>
                  <TableCell>
                    <Text className="font-medium text-gray-900 hover:text-blue-600">
                      {deal.dealname}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text className="text-gray-600">{deal.owner}</Text>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color={deal.stage_age_score >= 15 ? 'emerald' : deal.stage_age_score >= 8 ? 'amber' : 'red'} size="xs">
                      {(deal.stage_age_score || 0).toFixed(0)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color={deal.engagement_score >= 15 ? 'emerald' : deal.engagement_score >= 8 ? 'amber' : 'red'} size="xs">
                      {(deal.engagement_score || 0).toFixed(0)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color={deal.threading_score >= 15 ? 'emerald' : deal.threading_score >= 8 ? 'amber' : 'red'} size="xs">
                      {(deal.threading_score || 0).toFixed(0)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Text className="font-semibold text-[#00CBC0]">{formatCurrency(deal.arr_value)}</Text>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {filteredData.length > 15 && (
        <Text className="text-center text-xs text-gray-500 mt-3">
          Showing top 15 of {filteredData.length} deals by focus score
        </Text>
      )}

      {/* Legend */}
      <Flex className="mt-4 pt-4 border-t border-gray-100 gap-4" justifyContent="center">
        <Text className="text-xs text-gray-500">
          Score = Stage Age (25) + Engagement (25) + Threading (25) + Size (25)
        </Text>
      </Flex>

      {/* Modal */}
      <DealDetailModal />
    </Card>
  );
};

export default DealFocusScoreCard;
