import React, { createContext, useContext } from 'react';

/**
 * GLOSSARY_DATA
 * Central repository for all metric definitions, logic, and time frames
 * Used by MetricInfo tooltips throughout the dashboard
 */
export const GLOSSARY_DATA = {
  // ============================================
  // Executive KPIs
  // ============================================
  'Total Pipeline': {
    definition: 'Total value of all active, non-closed opportunities currently in the funnel.',
    logic: 'SUM(ARR) where isClosed = false',
    timeFrame: 'Current Snapshot',
  },
  'Weighted Pipeline': {
    definition: 'The forecast-adjusted value of the pipeline based on stage probabilities.',
    logic: 'SUM(ARR * Stage_Probability %)',
    timeFrame: 'Current Snapshot',
  },
  'At Risk': {
    definition: 'Percentage of pipeline value flagged as at-risk based on activity gaps, stage time, and engagement signals.',
    logic: '(At-Risk Deal Value / Total Pipeline Value) × 100',
    timeFrame: 'Current Snapshot',
  },
  'Win Rate': {
    definition: 'The ratio of deals successfully closed versus total deals closed (Won + Lost).',
    logic: '(Closed Won Count / Total Closed Count) * 100',
    timeFrame: 'Last 90 Days',
  },
  'Win Rate 6mo': {
    definition: 'Historical win rate based on the last 6 months of closed deals. Used for forecasting accuracy.',
    logic: 'Deals Won (6mo) / (Deals Won (6mo) + Deals Lost (6mo)) × 100',
    timeFrame: 'Last 6 Months',
  },

  // ============================================
  // Pipeline & Forecast
  // ============================================
  'Pipeline Forecast': {
    definition: 'AI-generated revenue projection based on current pipeline health, historical conversion rates, and deal velocity.',
    logic: 'ML model combining weighted pipeline, win rate trends, and seasonality',
    timeFrame: 'Current Quarter',
  },
  'Quarterly Forecast': {
    definition: 'AI-generated revenue projection based on current pipeline health, historical conversion rates, and deal velocity.',
    logic: 'ML model combining weighted pipeline, win rate trends, and seasonality',
    timeFrame: 'Current Quarter',
  },
  'Forecast Confidence': {
    definition: 'Statistical confidence level in the revenue forecast based on data quality and historical accuracy.',
    logic: 'Model accuracy score based on backtesting',
    timeFrame: 'Current Quarter',
  },
  'Gap to Goal': {
    definition: 'The difference between your quarterly target and actual Q-T-D closed won ARR.',
    logic: 'Quarterly Target - Q-T-D New ARR',
    timeFrame: 'Current Quarter',
  },
  'Q-T-D New ARR': {
    definition: 'Quarter-to-date new ARR from closed won deals. This is the actual revenue booked this quarter.',
    logic: 'SUM(ARR) where is_won = true AND closedate within current quarter',
    timeFrame: 'Current Quarter (Jan 1 - today)',
  },
  'Pipeline Trend': {
    definition: 'Historical view of pipeline value over time, showing growth or contraction patterns.',
    logic: 'Daily snapshot of total pipeline value',
    timeFrame: 'Last 30 Days',
  },

  // ============================================
  // Risk Metrics
  // ============================================
  'Deals at Risk': {
    definition: 'Deals showing warning signs such as lack of activity, extended time in stage, or missed close dates.',
    logic: 'Deals where: Days Since Activity > 10 OR Days in Stage > Threshold OR Close Date Slipped',
    timeFrame: 'Current Snapshot',
  },
  'Risk Command Center': {
    definition: 'Central hub for monitoring and managing pipeline health risks across all active deals.',
    logic: 'Aggregation of stalled, ghosted, and at-risk deals with severity scoring',
    timeFrame: 'Current Snapshot',
  },
  'Close Date Slippage': {
    definition: 'Deals where the expected close date has been pushed back, categorized by severity.',
    logic: 'Current Close Date - Original Close Date (in days)',
    timeFrame: 'Last 7 Days',
  },
  'Stage Leakage': {
    definition: 'The percentage of deals that drop out or are lost at each specific funnel stage.',
    logic: '(Lost Deals in Stage / Total Deals in Stage) over last 90 days',
    timeFrame: 'Last 90 Days',
  },
  'Pending Rebook': {
    definition: 'High-priority deals that were previously stalled and require immediate re-engagement.',
    logic: "Deals with 'Rebook' status sorted by last activity date > 14 days",
    timeFrame: 'Current Snapshot',
  },
  'Pending Rebook Queue': {
    definition: 'High-priority deals that were previously stalled and require immediate re-engagement.',
    logic: "Deals with 'Rebook' status sorted by last activity date > 14 days",
    timeFrame: 'Current Snapshot',
  },

  // ============================================
  // Sales Velocity & Performance
  // ============================================
  'Sales Velocity': {
    definition: 'Measures the daily revenue generation speed of your sales engine.',
    logic: '(Deals * Avg Size * Win Rate) / Sales Cycle Length',
    timeFrame: 'Last 90 Days',
  },
  'Velocity Pulse': {
    definition: 'A real-time momentum indicator showing the financial volume of deal movements today.',
    logic: 'SUM(ARR of deals moved forward today) / Avg Team Cycle',
    timeFrame: 'Last 24 Hours',
  },
  'Daily Velocity Pulse': {
    definition: 'A real-time momentum indicator showing the financial volume of deal movements today.',
    logic: 'SUM(ARR of deals moved forward today) / Avg Team Cycle',
    timeFrame: 'Last 24 Hours',
  },
  'Velocity Factor Breakdown': {
    definition: 'The four key components that drive sales velocity: deal count, average size, win rate, and cycle time.',
    logic: 'V = (N × W × S) / T where N=Deals, W=Win Rate, S=Avg Size, T=Cycle Days',
    timeFrame: 'Last 90 Days',
  },
  'Deal Velocity': {
    definition: 'Speed at which deals move through the pipeline stages.',
    logic: 'Days between stage transitions',
    timeFrame: 'Last 14 Days',
  },
  'Average Deal Size': {
    definition: 'The mean value of closed-won deals, indicating typical contract size.',
    logic: 'Total Won Revenue / Number of Won Deals',
    timeFrame: 'Last 90 Days',
  },
  'Average Sales Cycle': {
    definition: 'The average number of days from deal creation to close, measuring sales efficiency.',
    logic: 'Sum of (Close Date - Create Date) / Number of Closed Deals',
    timeFrame: 'Last 90 Days',
  },
  'Rep Ramp': {
    definition: 'Tracks the productivity and performance of new hires over their first 6 months.',
    logic: 'Monthly ARR growth normalized by months since hire date',
    timeFrame: 'First 6 Months',
  },
  'Rep Ramp Curve': {
    definition: 'Tracks the productivity and performance of new hires over their first 6 months.',
    logic: 'Monthly ARR growth normalized by months since hire date',
    timeFrame: 'First 6 Months',
  },

  // ============================================
  // Win/Loss Analysis
  // ============================================
  'Win Rate Analysis': {
    definition: 'Detailed breakdown of won vs lost deals by rep, showing performance variance.',
    logic: 'Won Deals / (Won Deals + Lost Deals) per Rep',
    timeFrame: 'Last 90 Days',
  },

  // ============================================
  // Behavioral & Activity Metrics
  // ============================================
  'Next Step Coverage': {
    definition: 'Percentage of open deals that have a defined next step, indicating proper deal management.',
    logic: '(Deals with Next Step / Total Open Deals) × 100',
    timeFrame: 'Current Snapshot',
  },
  'Multi-Threading': {
    definition: 'Distribution of deals by number of contacts engaged. More threads typically increase win probability.',
    logic: 'Count of unique contacts per deal, grouped by threading level',
    timeFrame: 'Current Snapshot',
  },

  // ============================================
  // SDR Metrics
  // ============================================
  'SDR Leaderboard': {
    definition: 'Ranking of SDRs by meeting outcomes, showing conversion from booked to held meetings.',
    logic: 'Meetings Held / Meetings Booked per SDR',
    timeFrame: 'Current Week',
  },

  // ============================================
  // Deal Movement & Momentum
  // ============================================
  'Deal Movements': {
    definition: 'Real-time feed of pipeline changes including new deals, stage transitions, and closures.',
    logic: 'Tracked events: New Deal, Stage Change, Closed Won, Closed Lost',
    timeFrame: 'Last 7 Days',
  },
  'Daily Deal Movements': {
    definition: 'Real-time feed of pipeline changes including new deals, stage transitions, and closures.',
    logic: 'Tracked events: New Deal, Stage Change, Closed Won, Closed Lost',
    timeFrame: 'Last 7 Days',
  },
  'Stage Transition Matrix': {
    definition: 'Visual map showing how deals flow between stages, revealing common paths and bottlenecks.',
    logic: 'Count of transitions from Stage A to Stage B',
    timeFrame: 'Last 30 Days',
  },

  // ============================================
  // Leaderboard Metrics
  // ============================================
  'Rep Leaderboard': {
    definition: 'Ranking of sales reps based on a blend of revenue attainment and pipeline speed.',
    logic: 'Weighted average of Quota Attainment % and Velocity Score',
    timeFrame: 'Current Quarter',
  },
  'Owner Leaderboard': {
    definition: 'Ranking of sales reps based on a blend of revenue attainment and pipeline speed.',
    logic: 'Weighted average of Quota Attainment % and Velocity Score',
    timeFrame: 'Current Quarter',
  },

  // ============================================
  // AI Insights
  // ============================================
  'AI Executive Summary': {
    definition: 'Automated narrative analysis of your pipeline health and primary risks.',
    logic: 'LLM analysis of v_ceo_dashboard and risk views',
    timeFrame: 'Current Snapshot',
  },

  // ============================================
  // RevOps Strategic Layer Metrics
  // ============================================
  'Contact Health Shield': {
    definition: 'Deal contact engagement health indicator. RED = critical (no contacts or 14+ days inactive), YELLOW = at risk (single contact or 14-21 days inactive), GREEN = healthy (2+ contacts and active within 14 days).',
    logic: 'RED: contacts=0 OR days_inactive>14 | YELLOW: contacts=1 OR 14<days_inactive≤21 | GREEN: contacts≥2 AND days_inactive≤14',
    timeFrame: 'Current Snapshot',
  },
  'Zombie Deals': {
    definition: 'Auto-excluded stale deals that pollute pipeline accuracy. These deals are removed from active metrics but can be reactivated or closed.',
    logic: 'Any of: days_since_creation > 3× median_sales_cycle | no_activity_since_creation | days_no_stage_movement > 180',
    timeFrame: 'Current Snapshot',
  },
  'Deal Focus Score': {
    definition: 'AI-powered prioritization score (0-100) to help reps focus on the right deals. Higher scores indicate deals needing immediate attention.',
    logic: 'Score = Stage Age (25pts) + Engagement (25pts) + Threading (25pts) + Size (25pts). Stage Age = 25×(1-days/max_days), Engagement = 25×(1-days_inactive/21), Threading = MIN(25, 25×contacts/3), Size = 25×(ARR/max_ARR)',
    timeFrame: 'Current Snapshot',
  },
  'Pipeline Quality Trend': {
    definition: '8-12 week visualization of pipeline health showing total, weighted, and committed pipeline values with trend indicators.',
    logic: 'Committed = Weighted Pipeline excluding Stalled/Delayed deals. Status: GREEN = weighted↑ AND stalled%↓, YELLOW = pipeline↑ but stalled flat, RED = pipeline↓ OR stalled↑',
    timeFrame: 'Last 8-12 Weeks',
  },
  'Pace to Goal': {
    definition: 'Compares your current revenue pace to the required pace to hit quarterly target.',
    logic: 'Current Pace = QTD Won / Days Elapsed × 30. Required Pace = (Target - QTD Won) / Days Remaining × 30',
    timeFrame: 'Current Quarter',
  },
  'Stage Slippage': {
    definition: 'Identifies deals stuck too long in each stage compared to healthy benchmarks.',
    logic: 'Flagged when days_in_stage > median_target_days. High priority if Value > $100K AND days > 2× median',
    timeFrame: 'Current Snapshot',
  },
  'Leaderboard Time Travel': {
    definition: 'Flexible rep performance leaderboard with adjustable time periods (7d/30d/QTD) and multiple sort dimensions.',
    logic: 'Tracks: Net Pipeline Added, Stage Movements, Engagement Score, Won Value per rep',
    timeFrame: '7 Days / 30 Days / QTD',
  },

  // ============================================
  // Marketing Efficiency (Google Ads)
  // ============================================
  'Total Ad Spend': {
    definition: 'Total investment in Google Ads campaigns. This is the cost side of your marketing investment pulled from BigQuery Transfer.',
    logic: 'SUM(metrics_cost_micros / 1,000,000) from Google Ads Campaign Stats',
    timeFrame: 'Lifetime',
  },
  'Marketing Pipeline': {
    definition: 'Total value of deals in HubSpot attributed to Google Ads campaigns (via PAID_SEARCH or Google UTM source).',
    logic: 'SUM(deal_value) WHERE hs_analytics_source = PAID_SEARCH OR utm_source LIKE google',
    timeFrame: 'Current Snapshot',
  },
  'Cost Per Acquisition': {
    definition: 'Total ad spend divided by number of won deals. Shows how much it costs to acquire a paying customer through Google Ads.',
    logic: 'Total Ad Spend / Won Deals Count',
    timeFrame: 'Lifetime',
  },
  'ROAS': {
    definition: 'Return on Ad Spend: How many dollars in ARR generated per $1 spent on Google Ads.',
    logic: 'ARR Generated / Total Ad Spend',
    timeFrame: 'Lifetime',
  },

  // ============================================
  // Q1 Mission Control
  // ============================================
  'Q1 Goal Progress': {
    definition: 'Progress toward the quarterly revenue target based on closed-won ARR.',
    logic: '(Q-T-D Won ARR / Quarterly Target) × 100',
    timeFrame: 'Current Quarter',
  },
  'Monthly Pace': {
    definition: 'Compares your current revenue pace to the required pace to hit quarterly target. Current = what you\'re on track to close. Required = what you need to close.',
    logic: 'Current Pace = QTD Won / Days Elapsed × 30. Required Pace = (Target - QTD Won) / Days Remaining × 30',
    timeFrame: 'Current Quarter',
  },
  'Pace Gap': {
    definition: 'The difference between your current monthly pace and the required pace to hit target.',
    logic: 'Current Monthly Pace - Required Monthly Pace',
    timeFrame: 'Current Quarter',
  },
  'AI Forecast': {
    definition: 'AI-generated revenue projection with Low/Expected/High scenarios based on pipeline health and historical patterns.',
    logic: 'ML model combining weighted pipeline, win rate trends, stage velocity, and seasonality',
    timeFrame: 'Current Quarter',
  },
  'Pipeline Coverage': {
    definition: 'Pipeline value relative to remaining revenue gap. Shows if you have enough pipeline to hit target.',
    logic: 'Total Pipeline Value / (Target - Q-T-D Won)',
    timeFrame: 'Current Quarter',
  },

  // ============================================
  // Deal Rescue Center
  // ============================================
  'Deal Rescue Center': {
    definition: 'The single source of truth for deal-level intervention. Shows Contact Health, Threading Level, Risk Status, and Recommended Actions.',
    logic: 'Combines: Contact count, days since activity, stage duration, and meeting status',
    timeFrame: 'Current Snapshot',
  },
  'Contact Health': {
    definition: 'Deal contact engagement health indicator. RED = critical (no contacts or 14+ days inactive), YELLOW = at risk (single contact or 7-14 days inactive), GREEN = healthy (2+ contacts and active within 7 days).',
    logic: 'RED: contacts=0 OR days_inactive>14 | YELLOW: contacts=1 OR 7≤days_inactive≤14 | GREEN: contacts≥2 AND days_inactive<7',
    timeFrame: 'Current Snapshot',
  },
  'Threading Level': {
    definition: 'Multi-threading status based on number of contacts engaged. Critical = 0 contacts, Low = 1 contact, Moderate = 2 contacts, Healthy = 3+ contacts.',
    logic: 'Critical: 0 | Low: 1 | Moderate: 2 | Healthy: 3+',
    timeFrame: 'Current Snapshot',
  },
};

/**
 * GlossaryContext
 */
const GlossaryContext = createContext(GLOSSARY_DATA);

/**
 * GlossaryProvider - Wraps the app to provide glossary data
 */
export const GlossaryProvider = ({ children }) => {
  return (
    <GlossaryContext.Provider value={GLOSSARY_DATA}>
      {children}
    </GlossaryContext.Provider>
  );
};

/**
 * useGlossary - Hook to access glossary data
 */
export const useGlossary = () => {
  return useContext(GlossaryContext);
};

/**
 * getGlossaryEntry - Get a specific metric's glossary entry
 */
export const getGlossaryEntry = (metricKey) => {
  const entry = GLOSSARY_DATA[metricKey];
  if (entry) {
    return entry;
  }
  // Return default for unknown metrics
  return {
    definition: 'This metric helps track pipeline performance.',
    logic: 'See documentation for calculation details.',
    timeFrame: 'Current Snapshot',
  };
};

export default GlossaryContext;
