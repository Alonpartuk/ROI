import { Card, Text, Flex, Badge } from '@tremor/react';
import {
  MegaphoneIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/**
 * Verified marketing leads — GA4 + HubSpot cross-reference (2026 YTD)
 * Contacts marked ga4Only: true were tracked in GA4 but NOT in HubSpot
 * (pixel was inactive before Jan 27, 2026).
 * This list serves as the baseline; future contacts post Jan-27 will come live from BigQuery.
 */
const SEED_LEADS = [
  // ── Customers ──────────────────────────────────────────────────────────────
  {
    name: 'Elor Kahalany',
    company: 'Logystico',
    lifecycle: 'customer',
    arr: 24000,
    dealStage: 'Closed Won',
    dealStatus: 'won',
    ga4Only: false,
    note: 'Jeff Uherek clicked the ad post-signup',
  },
  // ── Active Opportunities ────────────────────────────────────────────────────
  {
    name: 'Matt Bragg',
    company: 'Whitehouse Solutions',
    lifecycle: 'opportunity',
    arr: 24000,
    dealStage: 'Solution Alignment',
    dealStatus: 'open',
    ga4Only: false,
    note: '',
  },
  {
    name: 'Andy Kaye',
    company: 'L&M Distribution',
    lifecycle: 'opportunity',
    arr: 24000,
    dealStage: 'Discovery',
    dealStatus: 'open',
    ga4Only: true,
    note: '',
  },
  {
    name: 'Aaron Martinez',
    company: 'Prolific Brands',
    lifecycle: 'opportunity',
    arr: 12000,
    dealStage: 'Solution Alignment',
    dealStatus: 'open',
    ga4Only: true,
    note: '',
  },
  {
    name: 'Matt Lee',
    company: null,
    lifecycle: 'opportunity',
    arr: null,
    dealStage: 'In Progress',
    dealStatus: 'open',
    ga4Only: true,
    note: '',
  },
  {
    name: 'Ian Purrington',
    company: null,
    lifecycle: 'opportunity',
    arr: null,
    dealStage: 'In Progress',
    dealStatus: 'open',
    ga4Only: true,
    note: '',
  },
  // ── Closed Lost ────────────────────────────────────────────────────────────
  {
    name: null,
    company: 'Onncom',
    lifecycle: 'opportunity',
    arr: 12000,
    dealStage: 'Closed Lost',
    dealStatus: 'lost',
    ga4Only: false,
    note: '',
  },
  // ── Prospect ───────────────────────────────────────────────────────────────
  {
    name: 'Andrea Biagi',
    company: null,
    lifecycle: 'lead',
    arr: null,
    dealStage: null,
    dealStatus: null,
    ga4Only: false,
    note: 'Prospect — no deal yet',
  },
  // ── MQLs ───────────────────────────────────────────────────────────────────
  { name: 'Vedwattie',                    company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Ahmat Mahamat Tahir Senoussi', company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Desrosiers',                   company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Tamelfoster',                  company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Appolinaire',                  company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Accounting',                   company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Khamis',                       company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Adam Brown',                   company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Alimatou Wague',               company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Anureet Kaur Bains',           company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Anureet Bains',                company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: true,  note: '' },
  { name: 'Tony Carney',                  company: null, lifecycle: 'mql', arr: null, dealStage: null, dealStatus: null, ga4Only: true,  note: '' },
  // ── Unqualified ────────────────────────────────────────────────────────────
  { name: 'Eguiberto',        company: null, lifecycle: 'unqualified', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Carlos',           company: null, lifecycle: 'unqualified', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Cedric',           company: null, lifecycle: 'unqualified', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Riyad Ahmad Aliy', company: null, lifecycle: 'unqualified', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Zarina Sikandari', company: null, lifecycle: 'unqualified', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
  { name: 'Lavon Vines',      company: null, lifecycle: 'unqualified', arr: null, dealStage: null, dealStatus: null, ga4Only: false, note: '' },
];

// Optional upside (below direct attribution threshold)
const UPSIDE_DEAL = { company: 'Porter Logistics', arr: 18000, note: 'GA4 influence — below direct attribution threshold' };

const LIFECYCLE_CONFIG = {
  customer:    { label: 'Customer',    color: 'emerald', rowBg: 'bg-emerald-50/60' },
  opportunity: { label: 'Opportunity', color: 'blue',    rowBg: 'bg-blue-50/40' },
  lead:        { label: 'Prospect',    color: 'cyan',    rowBg: 'bg-cyan-50/40' },
  mql:         { label: 'MQL',         color: 'purple',  rowBg: 'bg-purple-50/30' },
  unqualified: { label: 'Unqualified', color: 'gray',    rowBg: 'bg-gray-50/40' },
};

const DEAL_STATUS_CONFIG = {
  won:  { label: 'Won',    color: 'emerald' },
  lost: { label: 'Lost',   color: 'red' },
  open: { label: 'Active', color: 'blue' },
};

const formatARR = (v) => {
  if (!v) return '—';
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
};

const MarketingLeadsTable = ({ liveContacts = [] }) => {
  // Merge: live HubSpot-tracked contacts override seed data where name matches
  const liveNames = new Set((liveContacts || []).map(c => c.name?.toLowerCase()));
  const seedRows = SEED_LEADS.map(lead => ({
    ...lead,
    // If BigQuery now tracks this contact, clear the ga4Only flag
    ga4Only: lead.ga4Only && !liveNames.has(lead.name?.toLowerCase()),
  }));

  // Add any truly new live contacts not in seed list
  const newLive = (liveContacts || []).filter(
    c => !SEED_LEADS.some(s => s.name?.toLowerCase() === c.name?.toLowerCase())
  ).map(c => ({
    name: c.name,
    company: c.company || null,
    lifecycle: c.lifecyclestage || 'mql',
    arr: c.deal_amount || null,
    dealStage: c.deal_stage || null,
    dealStatus: c.deal_status || null,
    ga4Only: false,
    note: 'Auto-tracked (post pixel fix)',
  }));

  const allRows = [...seedRows, ...newLive];

  // Sort order: customer → opportunity → lead → mql → unqualified
  const sortOrder = { customer: 0, opportunity: 1, lead: 2, mql: 3, unqualified: 4 };
  allRows.sort((a, b) => (sortOrder[a.lifecycle] ?? 9) - (sortOrder[b.lifecycle] ?? 9));

  const totalARR = allRows.reduce((s, r) => s + (r.arr || 0), 0);
  const openARR  = allRows.filter(r => r.dealStatus === 'open').reduce((s, r) => s + (r.arr || 0), 0);
  const wonARR   = allRows.filter(r => r.dealStatus === 'won').reduce((s, r)  => s + (r.arr || 0), 0);

  return (
    <Card className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-blue-100 shadow-xl">
      {/* Header */}
      <Flex justifyContent="between" alignItems="center" className="mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl shadow-sm">
            <MegaphoneIcon className="h-6 w-6 text-[#FF3489]" />
          </div>
          <div>
            <Text className="text-xl font-bold text-gray-900">Marketing Leads — All Contacts</Text>
            <Text className="text-sm text-gray-500">
              Google Ads 2026 YTD &bull; GA4 + HubSpot verified &bull; {allRows.length} contacts
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4 text-gray-400" />
          <Text className="text-xs text-gray-400">Updates with HubSpot sync</Text>
        </div>
      </Flex>

      {/* Pixel warning */}
      <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <Text className="text-xs text-amber-700">
          <strong>HubSpot pixel fixed Jan 27, 2026.</strong> Contacts marked{' '}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold text-[10px] mx-0.5">GA4*</span>{' '}
          were manually cross-referenced from Google Analytics and are not auto-tracked in HubSpot.
        </Text>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <Text className="text-2xl font-bold text-gray-900 font-mono">{formatARR(totalARR)}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Total Pipeline Created</Text>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <Text className="text-2xl font-bold text-blue-600 font-mono">{formatARR(openARR)}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Active Pipeline</Text>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <Text className="text-2xl font-bold text-emerald-600 font-mono">{formatARR(wonARR)}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Closed Won</Text>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lifecycle</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ARR</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deal Stage</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((lead, i) => {
              const lc = LIFECYCLE_CONFIG[lead.lifecycle] || LIFECYCLE_CONFIG.mql;
              const ds = lead.dealStatus ? DEAL_STATUS_CONFIG[lead.dealStatus] : null;
              return (
                <tr
                  key={i}
                  className={`${lc.rowBg} border-b border-gray-100/60 hover:brightness-95 transition-all`}
                >
                  <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <Text className="font-semibold text-gray-800 text-sm">
                      {lead.name || <span className="text-gray-400 italic">—</span>}
                    </Text>
                    {lead.note && (
                      <Text className="text-[10px] text-gray-400 mt-0.5">{lead.note}</Text>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Text className="text-sm text-gray-600">{lead.company || '—'}</Text>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge color={lc.color} size="xs">{lc.label}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Text className={`font-bold font-mono text-sm ${lead.arr ? 'text-gray-900' : 'text-gray-300'}`}>
                      {formatARR(lead.arr)}
                    </Text>
                  </td>
                  <td className="px-4 py-2.5">
                    <Text className="text-sm text-gray-600">{lead.dealStage || '—'}</Text>
                  </td>
                  <td className="px-4 py-2.5">
                    {ds ? (
                      <Badge color={ds.color} size="xs">{ds.label}</Badge>
                    ) : (
                      <Text className="text-gray-300 text-xs">—</Text>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {lead.ga4Only ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold text-[10px]">
                        GA4*
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold text-[10px]">
                        HubSpot
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Potential upside row */}
      <div className="mt-3 flex justify-between items-center px-4 py-2.5 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
        <div>
          <Text className="text-sm font-semibold text-gray-500">{UPSIDE_DEAL.company}</Text>
          <Text className="text-xs text-gray-400">{UPSIDE_DEAL.note}</Text>
        </div>
        <Text className="text-sm font-bold text-gray-400 font-mono">+{formatARR(UPSIDE_DEAL.arr)} potential</Text>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <Text className="text-xs text-gray-400">
          Baseline data: GA4 + HubSpot manual cross-reference (Jan 2026). New contacts post Jan 27 auto-sync from HubSpot every 6h.
        </Text>
      </div>
    </Card>
  );
};

export default MarketingLeadsTable;
