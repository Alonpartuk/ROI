import { Card, Text, Flex, Badge, Grid } from '@tremor/react';
import {
  CursorArrowRaysIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * GA4-verified attribution data (cross-referenced with HubSpot)
 * Note: HubSpot pixel was broken before Jan 27 — starred contacts (* ) were
 * tracked in GA4 but not in HubSpot and therefore not reflected in BigQuery.
 * Numbers below represent the full, manually verified picture.
 */
const GA4_VERIFIED = {
  total_contacts: 25,
  qualified_contacts: 19,
  total_mqls: 12,
  total_opportunities: 5,
  total_customers: 1,
  total_unqualified: 6,
  pixel_fix_date: 'Jan 27, 2026',
  missing_in_hubspot: 6, // contacts marked with * in GA4 report
};

const GoogleAdsLeads = ({ data }) => {
  const { summary = {}, monthlyTrend = [] } = data || {};

  const {
    total_gclid_contacts = 0,
    has_data = false,
  } = summary;

  // Use GA4-verified totals (more complete than HubSpot alone)
  const verified = GA4_VERIFIED;
  const hubspotIncomplete = !has_data || total_gclid_contacts < verified.qualified_contacts;

  // Status based on GA4-verified funnel
  const getStatus = () => {
    if (verified.total_customers > 0) {
      return { label: 'Converting', color: 'emerald', bg: 'bg-emerald-50/80', border: 'border-emerald-200/50' };
    }
    if (verified.total_opportunities > 0) {
      return { label: 'In Pipeline', color: 'amber', bg: 'bg-amber-50/80', border: 'border-amber-200/50' };
    }
    return { label: 'Tracking', color: 'blue', bg: 'bg-blue-50/80', border: 'border-blue-200/50' };
  };

  const status = getStatus();

  // Lifecycle funnel using GA4-verified numbers
  const funnelStages = [
    { label: 'MQL', count: verified.total_mqls, color: '#a78bfa' },
    { label: 'Opportunity', count: verified.total_opportunities, color: '#f97316' },
    { label: 'Customer', count: verified.total_customers, color: '#10b981' },
    { label: 'Unqualified', count: verified.total_unqualified, color: '#d1d5db' },
  ];
  const funnelTotal = funnelStages.reduce((sum, s) => sum + s.count, 0) || 1;

  const formatMonth = (month) => {
    if (!month) return '';
    const [y, m] = month.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload || {};
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-xl p-3 shadow-lg border border-gray-200/50 text-xs">
        <p className="font-semibold text-gray-900 mb-1">{formatMonth(label)}</p>
        <p className="text-blue-600">Total Leads: {d.total_leads}</p>
        {d.mqls > 0 && <p className="text-purple-600">MQLs: {d.mqls}</p>}
        {d.sqls > 0 && <p className="text-amber-600">SQLs: {d.sqls}</p>}
        {d.opportunities > 0 && <p className="text-orange-600">Opportunities: {d.opportunities}</p>}
        {d.customers > 0 && <p className="text-emerald-600">Customers: {d.customers}</p>}
      </div>
    );
  };

  return (
    <Card className={`${status.bg} backdrop-blur-2xl rounded-3xl border ${status.border} shadow-xl`}>
      {/* Header */}
      <Flex justifyContent="between" alignItems="center" className="mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/70 rounded-xl shadow-sm">
            <CursorArrowRaysIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <Text className="text-xl font-bold text-gray-900">Google Ads Lead Tracking</Text>
            <Text className="text-sm text-gray-500">
              GA4 + HubSpot Cross-Referenced &bull; {verified.total_contacts} total contacts
            </Text>
          </div>
        </div>
        <Badge color={status.color} size="lg">{status.label}</Badge>
      </Flex>

      {/* Pixel Tracking Note */}
      {hubspotIncomplete && (
        <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <Text className="text-xs text-amber-700">
            <strong>HubSpot pixel was inactive before {verified.pixel_fix_date}.</strong>{' '}
            {verified.missing_in_hubspot} contacts tracked in GA4 are missing from HubSpot.
            Numbers below are GA4-verified and include manual cross-reference.
          </Text>
        </div>
      )}

      {/* GA4-Verified Metrics */}
      <Grid numItems={1} numItemsSm={3} className="gap-4">
        {/* Total Contacts */}
        <div className="bg-white/70 rounded-2xl p-5 shadow-sm">
          <Flex alignItems="start" className="gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
            </div>
            <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold pt-1">
              Google Ads Contacts
            </Text>
          </Flex>
          <Text className="text-3xl font-bold text-gray-900 font-mono">{verified.total_contacts}</Text>
          <Text className="text-xs text-gray-500 mt-1">
            {verified.qualified_contacts} qualified &bull; {verified.total_unqualified} unqualified
          </Text>
          {hubspotIncomplete && (
            <Text className="text-xs text-amber-600 mt-1">
              HubSpot tracks {total_gclid_contacts} (incomplete)
            </Text>
          )}
        </div>

        {/* Opportunities */}
        <div className="bg-white/70 rounded-2xl p-5 shadow-sm">
          <Flex alignItems="start" className="gap-3 mb-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-amber-600" />
            </div>
            <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold pt-1">
              In Pipeline
            </Text>
          </Flex>
          <Text className="text-3xl font-bold text-gray-900 font-mono">{verified.total_opportunities}</Text>
          <Text className="text-xs text-gray-500 mt-1">
            opportunities &bull; {verified.total_mqls} MQLs
          </Text>
        </div>

        {/* Customers */}
        <div className="bg-white/70 rounded-2xl p-5 shadow-sm">
          <Flex alignItems="start" className="gap-3 mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold pt-1">
              Customers
            </Text>
          </Flex>
          <Text className="text-3xl font-bold text-gray-900 font-mono">{verified.total_customers}</Text>
          <Text className="text-xs text-gray-500 mt-1">
            {((verified.total_customers / verified.qualified_contacts) * 100).toFixed(1)}% conversion rate
          </Text>
        </div>
      </Grid>

      {/* Lifecycle Funnel Bar */}
      <div className="mt-5">
        <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
          Lifecycle Funnel (GA4 Verified)
        </Text>
        <div className="flex rounded-xl overflow-hidden h-7">
          {funnelStages.map((stage) => {
            if (stage.count === 0) return null;
            const widthPct = Math.max((stage.count / funnelTotal) * 100, 6);
            return (
              <div
                key={stage.label}
                style={{ width: `${widthPct}%`, backgroundColor: stage.color }}
                className="flex items-center justify-center transition-all duration-300"
                title={`${stage.label}: ${stage.count}`}
              >
                <span className="text-white text-[10px] font-semibold truncate px-1">
                  {stage.count}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 flex-wrap">
          {funnelStages.map((stage) => (
            stage.count > 0 && (
              <div key={stage.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <Text className="text-xs text-gray-500">{stage.label} ({stage.count})</Text>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Monthly Trend Chart (HubSpot data when available) */}
      {monthlyTrend.length > 1 && (
        <div className="mt-6">
          <Text className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
            Monthly Google Ads Leads (HubSpot Tracked)
          </Text>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_leads" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200/50">
        <Text className="text-xs text-gray-400">
          Source: GA4 + HubSpot cross-reference. HubSpot pixel fixed {verified.pixel_fix_date} — contacts before that date verified manually via GA4.
        </Text>
      </div>
    </Card>
  );
};

export default GoogleAdsLeads;
