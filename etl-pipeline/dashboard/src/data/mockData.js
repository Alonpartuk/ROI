/**
 * Mock Data for Octup Sales Dashboard
 * ====================================
 * This file mirrors the BigQuery view schemas from octup-testing.hubspot_data
 * Replace these with actual API calls to BigQuery when ready.
 *
 * Views mirrored:
 * - v_ceo_dashboard (KPIs)
 * - v_ai_executive_summary (AI insights)
 * - v_deals_at_risk (Risk Command Center)
 * - v_rep_ramp_chart (Rep Ramp Curve)
 * - v_multi_threading (Threading warnings)
 */

// =============================================================================
// v_ai_executive_summary - AI-generated executive insights
// =============================================================================
export const aiExecutiveSummary = {
  executive_insight: `**Pipeline Health Alert**: 23% of open deals ($2.4M ARR) are currently at risk.

Key concerns:
- **3 Enterprise deals** ($1.2M combined) have been stalled >30 days in negotiation
- **AcmeCorp** ($450K) showing ghosting pattern - no response in 12 days
- **Multi-threading critical**: 4 deals have single-threaded contacts

Recommended actions:
1. Immediate exec-to-exec outreach on AcmeCorp before Q1 close
2. Schedule pipeline review with Sarah Chen (highest risk exposure: $890K)
3. Enable champions in LogiFlow deal - currently blocked at procurement`,
  generated_at: new Date().toISOString(),
  model_version: 'gemini-1.5-pro',
  confidence_score: 0.87
};

// =============================================================================
// v_ceo_dashboard - Top-line KPIs
// =============================================================================
export const ceoDashboard = {
  // Pipeline metrics
  total_pipeline_value: 10450000,
  weighted_pipeline_value: 6270000,
  total_deals_count: 47,

  // Risk metrics
  at_risk_deals_count: 11,
  at_risk_value: 2400000,
  pct_deals_at_risk: 23.4,

  // Performance metrics
  win_rate_pct: 32.5,
  avg_deal_size: 222340,
  avg_sales_cycle_days: 45,

  // Velocity metrics
  deals_created_this_month: 12,
  deals_closed_won_this_month: 4,
  deals_closed_lost_this_month: 2,

  // Time period
  snapshot_date: new Date().toISOString().split('T')[0]
};

// =============================================================================
// v_deals_at_risk - Risk Command Center data
// Schema matches BigQuery exactly: 30 columns
// =============================================================================
export const dealsAtRisk = [
  {
    deal_id: 'deal_001',
    dealname: 'AcmeCorp Enterprise Platform',
    company_name: 'AcmeCorp Inc.',
    arr_value: 450000,
    amount: 450000,
    hs_arr: 450000,
    deal_stage_label: 'Contract Negotiation',
    pipeline_label: '3PL New Business',
    owner_name: 'Sarah Chen',
    owner_email: 'sarah.chen@octup.com',
    days_in_current_stage: 34,
    days_since_last_activity: 12,
    last_activity_date: '2026-01-17',
    next_meeting_date: null,
    has_upcoming_meeting: false,
    has_recent_activity: false,
    contact_count: 1,
    is_enterprise: true,
    is_stalled: true,
    is_ghosted: true,
    is_at_risk: true,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: 'Ghosted - No response in 12 days',
    closedate: '2026-02-15',
    createdate: '2025-11-01',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Critical',
    is_critical_risk_loss_of_momentum: true,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_001'
  },
  {
    deal_id: 'deal_002',
    dealname: 'LogiFlow Warehouse Automation',
    company_name: 'LogiFlow Systems',
    arr_value: 380000,
    amount: 380000,
    hs_arr: 380000,
    deal_stage_label: 'Proposal Sent',
    pipeline_label: '3PL New Business',
    owner_name: 'Sarah Chen',
    owner_email: 'sarah.chen@octup.com',
    days_in_current_stage: 42,
    days_since_last_activity: 8,
    last_activity_date: '2026-01-21',
    next_meeting_date: null,
    has_upcoming_meeting: false,
    has_recent_activity: false,
    contact_count: 2,
    is_enterprise: true,
    is_stalled: true,
    is_ghosted: false,
    is_at_risk: true,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: 'Stalled - 42 days in Proposal stage',
    closedate: '2026-02-28',
    createdate: '2025-10-15',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Low',
    is_critical_risk_loss_of_momentum: false,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_002'
  },
  {
    deal_id: 'deal_003',
    dealname: 'FreightMax Integration',
    company_name: 'FreightMax Logistics',
    arr_value: 370000,
    amount: 370000,
    hs_arr: 370000,
    deal_stage_label: 'Discovery',
    pipeline_label: '3PL New Business',
    owner_name: 'Michael Torres',
    owner_email: 'michael.torres@octup.com',
    days_in_current_stage: 38,
    days_since_last_activity: 15,
    last_activity_date: '2026-01-14',
    next_meeting_date: null,
    has_upcoming_meeting: false,
    has_recent_activity: false,
    contact_count: 1,
    is_enterprise: true,
    is_stalled: true,
    is_ghosted: true,
    is_at_risk: true,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: 'Ghosted + Single-threaded',
    closedate: '2026-03-15',
    createdate: '2025-12-01',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Critical',
    is_critical_risk_loss_of_momentum: true,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_003'
  },
  {
    deal_id: 'deal_004',
    dealname: 'QuickShip Pro License',
    company_name: 'QuickShip Inc.',
    arr_value: 85000,
    amount: 85000,
    hs_arr: 85000,
    deal_stage_label: 'Qualification',
    pipeline_label: '3PL New Business',
    owner_name: 'Emily Watson',
    owner_email: 'emily.watson@octup.com',
    days_in_current_stage: 18,
    days_since_last_activity: 7,
    last_activity_date: '2026-01-22',
    next_meeting_date: null,
    has_upcoming_meeting: false,
    has_recent_activity: false,
    contact_count: 1,
    is_enterprise: false,
    is_stalled: true,
    is_ghosted: true,
    is_at_risk: true,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: 'Ghosted - 7 days no response',
    closedate: '2026-02-20',
    createdate: '2026-01-04',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Critical',
    is_critical_risk_loss_of_momentum: true,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_004'
  },
  {
    deal_id: 'deal_005',
    dealname: 'TransGlobal WMS Upgrade',
    company_name: 'TransGlobal Shipping',
    arr_value: 520000,
    amount: 520000,
    hs_arr: 520000,
    deal_stage_label: 'Demo Scheduled',
    pipeline_label: '3PL New Business',
    owner_name: 'David Kim',
    owner_email: 'david.kim@octup.com',
    days_in_current_stage: 5,
    days_since_last_activity: 2,
    last_activity_date: '2026-01-27',
    next_meeting_date: '2026-01-31',
    has_upcoming_meeting: true,
    has_recent_activity: true,
    contact_count: 4,
    is_enterprise: true,
    is_stalled: false,
    is_ghosted: false,
    is_at_risk: false,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: null,
    closedate: '2026-03-30',
    createdate: '2026-01-10',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Healthy',
    is_critical_risk_loss_of_momentum: false,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_005'
  },
  {
    deal_id: 'deal_006',
    dealname: 'Harbor Logistics Platform',
    company_name: 'Harbor Logistics Co.',
    arr_value: 290000,
    amount: 290000,
    hs_arr: 290000,
    deal_stage_label: 'Proposal Sent',
    pipeline_label: '3PL New Business',
    owner_name: 'Sarah Chen',
    owner_email: 'sarah.chen@octup.com',
    days_in_current_stage: 21,
    days_since_last_activity: 4,
    last_activity_date: '2026-01-25',
    next_meeting_date: '2026-02-03',
    has_upcoming_meeting: true,
    has_recent_activity: true,
    contact_count: 3,
    is_enterprise: true,
    is_stalled: false,
    is_ghosted: false,
    is_at_risk: false,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: null,
    closedate: '2026-02-28',
    createdate: '2025-12-15',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Moderate',
    is_critical_risk_loss_of_momentum: false,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_006'
  },
  {
    deal_id: 'deal_007',
    dealname: 'CargoNet Express',
    company_name: 'CargoNet Solutions',
    arr_value: 95000,
    amount: 95000,
    hs_arr: 95000,
    deal_stage_label: 'Contract Negotiation',
    pipeline_label: '3PL New Business',
    owner_name: 'Emily Watson',
    owner_email: 'emily.watson@octup.com',
    days_in_current_stage: 16,
    days_since_last_activity: 6,
    last_activity_date: '2026-01-23',
    next_meeting_date: null,
    has_upcoming_meeting: false,
    has_recent_activity: false,
    contact_count: 2,
    is_enterprise: false,
    is_stalled: true,
    is_ghosted: true,
    is_at_risk: true,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: 'Stalled in negotiation',
    closedate: '2026-02-10',
    createdate: '2025-12-20',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Low',
    is_critical_risk_loss_of_momentum: false,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_007'
  },
  {
    deal_id: 'deal_008',
    dealname: 'DistroHub Expansion',
    company_name: 'DistroHub LLC',
    arr_value: 175000,
    amount: 175000,
    hs_arr: 175000,
    deal_stage_label: 'Discovery',
    pipeline_label: '3PL New Business',
    owner_name: 'Michael Torres',
    owner_email: 'michael.torres@octup.com',
    days_in_current_stage: 12,
    days_since_last_activity: 3,
    last_activity_date: '2026-01-26',
    next_meeting_date: '2026-01-30',
    has_upcoming_meeting: true,
    has_recent_activity: true,
    contact_count: 2,
    is_enterprise: true,
    is_stalled: false,
    is_ghosted: false,
    is_at_risk: false,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: null,
    closedate: '2026-04-15',
    createdate: '2026-01-14',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Low',
    is_critical_risk_loss_of_momentum: false,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_008'
  },
  {
    deal_id: 'deal_009',
    dealname: 'PrimeRoute Analytics',
    company_name: 'PrimeRoute Inc.',
    arr_value: 65000,
    amount: 65000,
    hs_arr: 65000,
    deal_stage_label: 'Demo Scheduled',
    pipeline_label: '3PL New Business',
    owner_name: 'David Kim',
    owner_email: 'david.kim@octup.com',
    days_in_current_stage: 8,
    days_since_last_activity: 1,
    last_activity_date: '2026-01-28',
    next_meeting_date: '2026-01-29',
    has_upcoming_meeting: true,
    has_recent_activity: true,
    contact_count: 3,
    is_enterprise: false,
    is_stalled: false,
    is_ghosted: false,
    is_at_risk: false,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: null,
    closedate: '2026-03-01',
    createdate: '2026-01-15',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Moderate',
    is_critical_risk_loss_of_momentum: false,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_009'
  },
  {
    deal_id: 'deal_010',
    dealname: 'SwiftBox Implementation',
    company_name: 'SwiftBox Fulfillment',
    arr_value: 42000,
    amount: 42000,
    hs_arr: 42000,
    deal_stage_label: 'Qualification',
    pipeline_label: '3PL New Business',
    owner_name: 'Emily Watson',
    owner_email: 'emily.watson@octup.com',
    days_in_current_stage: 20,
    days_since_last_activity: 9,
    last_activity_date: '2026-01-20',
    next_meeting_date: null,
    has_upcoming_meeting: false,
    has_recent_activity: false,
    contact_count: 1,
    is_enterprise: false,
    is_stalled: true,
    is_ghosted: true,
    is_at_risk: true,
    is_unassigned_risk: false,
    is_pending_rebook: false,
    primary_risk_reason: 'Ghosted + Single-threaded',
    closedate: '2026-02-28',
    createdate: '2026-01-05',
    snapshot_date: new Date().toISOString().split('T')[0],
    threading_level: 'Critical',
    is_critical_risk_loss_of_momentum: true,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_010'
  }
];

// =============================================================================
// Pending Rebook Deals (Chanan's Queue)
// These are NOT at-risk, they're in a special rebook queue
// =============================================================================
export const pendingRebookDeals = [
  {
    deal_id: 'deal_ch_001',
    dealname: 'MegaFreight Contract Renewal',
    company_name: 'MegaFreight Corp',
    arr_value: 320000,
    amount: 320000,
    deal_stage_label: 'Meeting No-Show',
    owner_name: 'Chanan',
    owner_email: 'chanan@octup.com',
    days_in_current_stage: 3,
    days_since_last_activity: 3,
    last_activity_date: '2026-01-26',
    original_meeting_date: '2026-01-26',
    rebook_attempts: 1,
    is_pending_rebook: true,
    is_at_risk: false,
    contact_count: 2,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_ch_001'
  },
  {
    deal_id: 'deal_ch_002',
    dealname: 'PackRight Distribution Setup',
    company_name: 'PackRight Inc.',
    arr_value: 145000,
    amount: 145000,
    deal_stage_label: 'Meeting No-Show',
    owner_name: 'Chanan',
    owner_email: 'chanan@octup.com',
    days_in_current_stage: 5,
    days_since_last_activity: 5,
    last_activity_date: '2026-01-24',
    original_meeting_date: '2026-01-24',
    rebook_attempts: 2,
    is_pending_rebook: true,
    is_at_risk: false,
    contact_count: 1,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_ch_002'
  },
  {
    deal_id: 'deal_ch_003',
    dealname: 'FlexWare Pilot Program',
    company_name: 'FlexWare Solutions',
    arr_value: 78000,
    amount: 78000,
    deal_stage_label: 'Meeting Canceled',
    owner_name: 'Chanan',
    owner_email: 'chanan@octup.com',
    days_in_current_stage: 2,
    days_since_last_activity: 2,
    last_activity_date: '2026-01-27',
    original_meeting_date: '2026-01-27',
    rebook_attempts: 0,
    is_pending_rebook: true,
    is_at_risk: false,
    contact_count: 3,
    hubspot_url: 'https://app.hubspot.com/contacts/deals/deal_ch_003'
  }
];

// =============================================================================
// v_rep_ramp_chart - Rep Performance by Tenure Quarter
// quarter_of_tenure = FLOOR(DATE_DIFF(closedate, hire_date, DAY) / 91) + 1
// =============================================================================
export const repRampData = [
  // Sarah Chen - Senior Rep (6 quarters tenure)
  { owner_name: 'Sarah Chen', quarter_of_tenure: 1, cumulative_arr: 180000, cumulative_deals: 3, deals_won: 3 },
  { owner_name: 'Sarah Chen', quarter_of_tenure: 2, cumulative_arr: 420000, cumulative_deals: 7, deals_won: 4 },
  { owner_name: 'Sarah Chen', quarter_of_tenure: 3, cumulative_arr: 780000, cumulative_deals: 12, deals_won: 5 },
  { owner_name: 'Sarah Chen', quarter_of_tenure: 4, cumulative_arr: 1250000, cumulative_deals: 18, deals_won: 6 },
  { owner_name: 'Sarah Chen', quarter_of_tenure: 5, cumulative_arr: 1680000, cumulative_deals: 24, deals_won: 6 },
  { owner_name: 'Sarah Chen', quarter_of_tenure: 6, cumulative_arr: 2150000, cumulative_deals: 31, deals_won: 7 },

  // Michael Torres - Mid-level Rep (4 quarters tenure)
  { owner_name: 'Michael Torres', quarter_of_tenure: 1, cumulative_arr: 120000, cumulative_deals: 2, deals_won: 2 },
  { owner_name: 'Michael Torres', quarter_of_tenure: 2, cumulative_arr: 310000, cumulative_deals: 5, deals_won: 3 },
  { owner_name: 'Michael Torres', quarter_of_tenure: 3, cumulative_arr: 580000, cumulative_deals: 9, deals_won: 4 },
  { owner_name: 'Michael Torres', quarter_of_tenure: 4, cumulative_arr: 890000, cumulative_deals: 14, deals_won: 5 },

  // David Kim - Newer Rep (3 quarters tenure)
  { owner_name: 'David Kim', quarter_of_tenure: 1, cumulative_arr: 95000, cumulative_deals: 2, deals_won: 2 },
  { owner_name: 'David Kim', quarter_of_tenure: 2, cumulative_arr: 245000, cumulative_deals: 4, deals_won: 2 },
  { owner_name: 'David Kim', quarter_of_tenure: 3, cumulative_arr: 485000, cumulative_deals: 7, deals_won: 3 },

  // Emily Watson - New Rep (2 quarters tenure)
  { owner_name: 'Emily Watson', quarter_of_tenure: 1, cumulative_arr: 65000, cumulative_deals: 1, deals_won: 1 },
  { owner_name: 'Emily Watson', quarter_of_tenure: 2, cumulative_arr: 185000, cumulative_deals: 3, deals_won: 2 },
];

// =============================================================================
// v_multi_threading - Contact Threading Analysis
// =============================================================================
export const multiThreadingData = [
  { deal_id: 'deal_001', dealname: 'AcmeCorp Enterprise Platform', contact_count: 1, threading_level: 'Critical', is_critical_risk_loss_of_momentum: true },
  { deal_id: 'deal_002', dealname: 'LogiFlow Warehouse Automation', contact_count: 2, threading_level: 'Low', is_critical_risk_loss_of_momentum: false },
  { deal_id: 'deal_003', dealname: 'FreightMax Integration', contact_count: 1, threading_level: 'Critical', is_critical_risk_loss_of_momentum: true },
  { deal_id: 'deal_004', dealname: 'QuickShip Pro License', contact_count: 1, threading_level: 'Critical', is_critical_risk_loss_of_momentum: true },
  { deal_id: 'deal_005', dealname: 'TransGlobal WMS Upgrade', contact_count: 4, threading_level: 'Healthy', is_critical_risk_loss_of_momentum: false },
  { deal_id: 'deal_010', dealname: 'SwiftBox Implementation', contact_count: 1, threading_level: 'Critical', is_critical_risk_loss_of_momentum: true },
];

// =============================================================================
// API Service Layer (Replace with real BigQuery calls)
// =============================================================================
export const fetchDashboardData = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    aiSummary: aiExecutiveSummary,
    kpis: ceoDashboard,
    dealsAtRisk: dealsAtRisk,
    pendingRebook: pendingRebookDeals,
    repRamp: repRampData,
    multiThreading: multiThreadingData,
  };
};

// =============================================================================
// Helper: Format currency
// =============================================================================
export const formatCurrency = (value) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
};

// =============================================================================
// Helper: Format percentage
// =============================================================================
export const formatPercent = (value) => {
  return `${value.toFixed(1)}%`;
};
