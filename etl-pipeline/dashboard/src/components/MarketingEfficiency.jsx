import React from 'react';
import { Card, Text, Flex, Badge, Grid } from '@tremor/react';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  MegaphoneIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import MetricInfo from './MetricInfo';

/**
 * GA4-verified pipeline attribution from Google Ads (2026 YTD)
 * Cross-referenced with HubSpot — pixel fixed Jan 27, 2026
 */
const GA4_PIPELINE = {
  total_arr_created: 96000,
  active_pipeline: 60000,
  closed_won: 24000,
  closed_lost: 12000,
  win_rate: 50,
  active_deals: [
    { name: 'Whitehouse Solutions', arr: 24000, stage: 'Solution Alignment' },
    { name: 'L&M Distribution', arr: 24000, stage: 'Discovery' },
    { name: 'Prolific Brands', arr: 12000, stage: 'Solution Alignment' },
  ],
  won_deal: { name: 'Logystico', arr: 24000 },
  lost_deal: { name: 'Onncom', arr: 12000 },
  potential_upside: { name: 'Porter Logistics', arr: 18000, note: 'GA4 influence, below direct attribution threshold' },
};

/**
 * MarketingEfficiency Component
 * Displays Google Ads performance metrics from v_marketing_roi_unified
 * Shows: Total Spend, Marketing-Sourced Pipeline, CPA
 * Styling matches Q1MissionControl for seamless visual integration
 */
const MarketingEfficiency = ({ data }) => {
  // If no data, show loading placeholder (matches Q1MissionControl loading state)
  if (!data || !data.summary) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-xl">
        <Flex justifyContent="between" alignItems="center" className="mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-50 rounded-xl shadow-sm">
              <MegaphoneIcon className="h-6 w-6 text-[#FF3489]" />
            </div>
            <div>
              <Text className="text-xl font-bold text-gray-900">Marketing Efficiency</Text>
              <Text className="text-sm text-gray-500">Loading Google Ads data...</Text>
            </div>
          </div>
          <Badge color="gray" size="lg">Loading</Badge>
        </Flex>
        <div className="bg-gray-50/50 rounded-2xl p-5">
          <Text className="text-sm text-gray-400">Fetching marketing performance data...</Text>
        </div>
      </Card>
    );
  }

  const { summary, campaigns = [] } = data;
  const {
    total_spend = 0,
    total_pipeline_value = 0,
    total_arr_generated = 0,
    total_attributed_deals = 0,
    total_won_deals = 0,
    overall_cpa = null,
    overall_roas = 0,
    has_spend = false,
    has_attribution = false,
  } = summary;

  // Format currency — defined early so it can be used in early-return blocks
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${Math.round(value).toLocaleString()}`;
  };

  // Show GA4-verified data even when BigQuery has no spend tracked
  if (!has_spend) {
    return (
      <Card className="bg-emerald-50/80 backdrop-blur-2xl rounded-3xl border border-emerald-200/50 shadow-xl">
        <Flex justifyContent="between" alignItems="center" className="mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/70 rounded-xl shadow-sm">
              <MegaphoneIcon className="h-6 w-6 text-[#FF3489]" />
            </div>
            <div>
              <Text className="text-xl font-bold text-gray-900">Marketing Efficiency</Text>
              <Text className="text-sm text-gray-500">Google Ads · GA4-Verified Attribution</Text>
            </div>
          </div>
          <Badge color="emerald" size="lg">Generating Revenue</Badge>
        </Flex>

        <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <Text className="text-xs text-amber-700">
            <strong>HubSpot pixel inactive before Jan 27.</strong> Spend data not synced to BigQuery yet.
            Pipeline numbers below are GA4 + HubSpot cross-referenced.
          </Text>
        </div>

        <Grid numItems={1} numItemsSm={3} className="gap-4 mb-4">
          <div className="bg-white/70 rounded-2xl p-5 shadow-sm text-center">
            <Text className="text-3xl font-bold text-gray-900 font-mono">{formatCurrency(GA4_PIPELINE.total_arr_created)}</Text>
            <Text className="text-xs text-gray-500 mt-1">Total ARR Created</Text>
          </div>
          <div className="bg-white/70 rounded-2xl p-5 shadow-sm text-center">
            <Text className="text-3xl font-bold text-blue-600 font-mono">{formatCurrency(GA4_PIPELINE.active_pipeline)}</Text>
            <Text className="text-xs text-gray-500 mt-1">Active Pipeline</Text>
          </div>
          <div className="bg-white/70 rounded-2xl p-5 shadow-sm text-center">
            <Text className="text-3xl font-bold text-emerald-600 font-mono">{GA4_PIPELINE.win_rate}%</Text>
            <Text className="text-xs text-gray-500 mt-1">Win Rate</Text>
          </div>
        </Grid>

        <div className="space-y-1.5 mb-3">
          {GA4_PIPELINE.active_deals.map((deal) => (
            <div key={deal.name} className="flex justify-between items-center px-3 py-2 bg-blue-50/60 rounded-lg border border-blue-100">
              <div>
                <Text className="text-sm font-semibold text-gray-800">{deal.name}</Text>
                <Text className="text-xs text-gray-500">{deal.stage}</Text>
              </div>
              <Text className="text-sm font-bold text-blue-600 font-mono">{formatCurrency(deal.arr)}</Text>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="flex justify-between items-center px-3 py-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-1.5">
              <TrophyIcon className="h-4 w-4 text-emerald-500" />
              <div>
                <Text className="text-xs font-semibold text-gray-800">{GA4_PIPELINE.won_deal.name}</Text>
                <Text className="text-[10px] text-gray-500">Closed Won</Text>
              </div>
            </div>
            <Text className="text-sm font-bold text-emerald-600 font-mono">{formatCurrency(GA4_PIPELINE.closed_won)}</Text>
          </div>
          <div className="flex justify-between items-center px-3 py-2 bg-red-50/60 rounded-lg border border-red-100">
            <div>
              <Text className="text-xs font-semibold text-gray-800">{GA4_PIPELINE.lost_deal.name}</Text>
              <Text className="text-[10px] text-gray-500">Closed Lost</Text>
            </div>
            <Text className="text-sm font-bold text-red-500 font-mono">{formatCurrency(GA4_PIPELINE.closed_lost)}</Text>
          </div>
        </div>

        <div className="flex justify-between items-center px-3 py-2 bg-gray-50/60 rounded-lg border border-gray-200">
          <div>
            <Text className="text-xs font-semibold text-gray-600">{GA4_PIPELINE.potential_upside.name}</Text>
            <Text className="text-[10px] text-gray-400">{GA4_PIPELINE.potential_upside.note}</Text>
          </div>
          <Text className="text-sm font-bold text-gray-400 font-mono">+{formatCurrency(GA4_PIPELINE.potential_upside.arr)}</Text>
        </div>
      </Card>
    );
  }

  // Determine status based on attribution
  const getStatus = () => {
    if (total_arr_generated > 0 && total_spend > 0) {
      return { label: 'Generating Revenue', color: 'emerald', bg: 'bg-emerald-50/80', border: 'border-emerald-200/50' };
    }
    if (total_attributed_deals > 0) {
      return { label: 'Leads in Pipeline', color: 'amber', bg: 'bg-amber-50/80', border: 'border-amber-200/50' };
    }
    return { label: 'Monitoring', color: 'blue', bg: 'bg-blue-50/80', border: 'border-blue-200/50' };
  };

  const status = getStatus();

  // Active campaigns (with spend)
  const activeCampaigns = campaigns.filter(c => c.total_spend > 0);

  return (
    <Card className={`${status.bg} backdrop-blur-2xl rounded-3xl border ${status.border} shadow-xl`}>
      {/* Header */}
      <Flex justifyContent="between" alignItems="center" className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/70 rounded-xl shadow-sm">
            <MegaphoneIcon className="h-6 w-6 text-[#FF3489]" />
          </div>
          <div>
            <Text className="text-xl font-bold text-gray-900">Marketing Efficiency</Text>
            <Text className="text-sm text-gray-500">
              Google Ads Performance • {activeCampaigns.length} active campaign{activeCampaigns.length !== 1 ? 's' : ''}
            </Text>
          </div>
        </div>
        <Badge color={status.color} size="lg">
          {status.label}
        </Badge>
      </Flex>

      {/* Metrics Grid */}
      <Grid numItems={1} numItemsSm={3} className="gap-4">
        {/* Total Ad Spend */}
        <div className="bg-white/70 rounded-2xl p-5 shadow-sm">
          <Flex alignItems="start" className="gap-3 mb-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-[#FF3489]" />
            </div>
            <div className="flex-1">
              <Flex justifyContent="between" alignItems="start">
                <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Total Ad Spend
                </Text>
                <MetricInfo id="Total Ad Spend" />
              </Flex>
            </div>
          </Flex>
          <Text className="text-3xl font-bold text-gray-900 font-mono">
            {formatCurrency(total_spend)}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            across {activeCampaigns.length} campaign{activeCampaigns.length !== 1 ? 's' : ''}
          </Text>
        </div>

        {/* Marketing-Sourced Pipeline */}
        <div className="bg-white/70 rounded-2xl p-5 shadow-sm">
          <Flex alignItems="start" className="gap-3 mb-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-[#00CBC0]" />
            </div>
            <div className="flex-1">
              <Flex justifyContent="between" alignItems="start">
                <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Marketing Pipeline
                </Text>
                <MetricInfo id="Marketing Pipeline" />
              </Flex>
            </div>
          </Flex>
          <Text className="text-3xl font-bold text-gray-900 font-mono">
            {formatCurrency(total_pipeline_value)}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            {total_attributed_deals} attributed deal{total_attributed_deals !== 1 ? 's' : ''}
          </Text>
        </div>

        {/* CPA */}
        <div className="bg-white/70 rounded-2xl p-5 shadow-sm">
          <Flex alignItems="start" className="gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <Flex justifyContent="between" alignItems="start">
                <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Cost Per Acquisition
                </Text>
                <MetricInfo id="Cost Per Acquisition" />
              </Flex>
            </div>
          </Flex>
          <Text className="text-3xl font-bold text-gray-900 font-mono">
            {overall_cpa ? formatCurrency(overall_cpa) : 'N/A'}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            {total_won_deals > 0 ? `${total_won_deals} won deal${total_won_deals !== 1 ? 's' : ''}` : 'Awaiting first conversion'}
          </Text>
        </div>
      </Grid>

      {/* Status Message for Monitoring State */}
      {!has_attribution && has_spend && (
        <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
          <Flex alignItems="center" className="gap-2">
            <ClockIcon className="h-5 w-5 text-blue-500" />
            <Text className="text-sm text-blue-700">
              Campaigns are active with <strong>{formatCurrency(total_spend)}</strong> in spend.
              Monitoring for initial lead attribution from HubSpot.
            </Text>
          </Flex>
        </div>
      )}

      {/* ROAS Badge (only show if we have revenue) */}
      {overall_roas > 0 && (
        <div className="mt-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
          <Flex justifyContent="between" alignItems="center">
            <Flex alignItems="center" className="gap-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
              <Text className="text-sm text-emerald-700">
                Return on Ad Spend (ROAS)
              </Text>
              <MetricInfo id="ROAS" />
            </Flex>
            <Text className="text-2xl font-bold text-emerald-700 font-mono">
              {overall_roas.toFixed(2)}x
            </Text>
          </Flex>
          <Text className="text-xs text-emerald-600 mt-2">
            Generated {formatCurrency(total_arr_generated)} ARR from {formatCurrency(total_spend)} ad spend
          </Text>
        </div>
      )}

      {/* GA4-Verified Pipeline Attribution */}
      <div className="mt-5 pt-4 border-t border-gray-200/60">
        <Flex alignItems="center" className="gap-2 mb-3">
          <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
            GA4-Verified Pipeline Attribution
          </Text>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
            <ExclamationTriangleIcon className="h-3 w-3 text-amber-500" />
            <Text className="text-[10px] text-amber-600 font-medium">Pixel fixed Jan 27</Text>
          </div>
        </Flex>

        {/* Pipeline Summary Row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-white/70 rounded-xl p-3 shadow-sm text-center">
            <Text className="text-2xl font-bold text-gray-900 font-mono">
              {formatCurrency(GA4_PIPELINE.total_arr_created)}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">Total Created</Text>
          </div>
          <div className="bg-white/70 rounded-xl p-3 shadow-sm text-center">
            <Text className="text-2xl font-bold text-blue-600 font-mono">
              {formatCurrency(GA4_PIPELINE.active_pipeline)}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">Active Pipeline</Text>
          </div>
          <div className="bg-white/70 rounded-xl p-3 shadow-sm text-center">
            <Text className="text-2xl font-bold text-emerald-600 font-mono">
              {GA4_PIPELINE.win_rate}%
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">Win Rate</Text>
          </div>
        </div>

        {/* Active Deals */}
        <div className="space-y-1.5 mb-3">
          {GA4_PIPELINE.active_deals.map((deal) => (
            <div key={deal.name} className="flex justify-between items-center px-3 py-2 bg-blue-50/60 rounded-lg border border-blue-100">
              <div>
                <Text className="text-sm font-semibold text-gray-800">{deal.name}</Text>
                <Text className="text-xs text-gray-500">{deal.stage}</Text>
              </div>
              <Text className="text-sm font-bold text-blue-600 font-mono">{formatCurrency(deal.arr)}</Text>
            </div>
          ))}
        </div>

        {/* Won & Lost */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="flex justify-between items-center px-3 py-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-1.5">
              <TrophyIcon className="h-4 w-4 text-emerald-500" />
              <div>
                <Text className="text-xs font-semibold text-gray-800">{GA4_PIPELINE.won_deal.name}</Text>
                <Text className="text-[10px] text-gray-500">Closed Won</Text>
              </div>
            </div>
            <Text className="text-sm font-bold text-emerald-600 font-mono">{formatCurrency(GA4_PIPELINE.closed_won)}</Text>
          </div>
          <div className="flex justify-between items-center px-3 py-2 bg-red-50/60 rounded-lg border border-red-100">
            <div>
              <Text className="text-xs font-semibold text-gray-800">{GA4_PIPELINE.lost_deal.name}</Text>
              <Text className="text-[10px] text-gray-500">Closed Lost</Text>
            </div>
            <Text className="text-sm font-bold text-red-500 font-mono">{formatCurrency(GA4_PIPELINE.closed_lost)}</Text>
          </div>
        </div>

        {/* Potential Upside */}
        <div className="flex justify-between items-center px-3 py-2 bg-gray-50/60 rounded-lg border border-gray-200">
          <div>
            <Text className="text-xs font-semibold text-gray-600">{GA4_PIPELINE.potential_upside.name}</Text>
            <Text className="text-[10px] text-gray-400">{GA4_PIPELINE.potential_upside.note}</Text>
          </div>
          <Text className="text-sm font-bold text-gray-400 font-mono">+{formatCurrency(GA4_PIPELINE.potential_upside.arr)}</Text>
        </div>
      </div>
    </Card>
  );
};

export default MarketingEfficiency;
