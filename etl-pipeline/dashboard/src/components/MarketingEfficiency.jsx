import React from 'react';
import { Card, Text, Flex, Badge, Grid } from '@tremor/react';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  MegaphoneIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import MetricInfo from './MetricInfo';

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

  // Show "No Campaigns" state if no spend detected
  if (!has_spend) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-xl">
        <Flex justifyContent="between" alignItems="center" className="mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 rounded-xl shadow-sm">
              <MegaphoneIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <Text className="text-xl font-bold text-gray-900">Marketing Efficiency</Text>
              <Text className="text-sm text-gray-500">Google Ads Performance</Text>
            </div>
          </div>
          <Badge color="gray" size="lg">No Active Campaigns</Badge>
        </Flex>
        <div className="bg-gray-50/50 rounded-2xl p-5">
          <Text className="text-sm text-gray-500">
            No Google Ads spend detected. Start a campaign to see ROI metrics here.
          </Text>
        </div>
      </Card>
    );
  }

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${Math.round(value).toLocaleString()}`;
  };

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
                <MetricInfo
                  title="Total Ad Spend"
                  description="Total amount spent on Google Ads campaigns. This is the cost side of your marketing investment."
                />
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
                <MetricInfo
                  title="Marketing-Sourced Pipeline"
                  description="Total value of deals currently in the pipeline that came from Google Ads (PAID_SEARCH or Google UTM source)."
                />
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
                <MetricInfo
                  title="CPA (Cost Per Acquisition)"
                  description="Total ad spend divided by number of won deals. Shows how much it costs to acquire a paying customer through Google Ads."
                />
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
    </Card>
  );
};

export default MarketingEfficiency;
