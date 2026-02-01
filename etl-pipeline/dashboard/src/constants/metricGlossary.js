/**
 * METRIC_GLOSSARY
 * Official Octup Metric Glossary (English)
 * Central repository for all metric definitions, formulas, and time frames
 * Used by tooltips throughout the dashboard for consistent explanations
 */

export const METRIC_GLOSSARY = {
  // ============================================
  // Executive KPIs
  // ============================================
  'Total Pipeline': {
    definition: 'Total value of all active, non-closed opportunities currently in the funnel.',
    formula: 'SUM(ARR) where isClosed = false',
    timeFrame: 'Current Snapshot',
    category: 'Executive',
  },
  'Weighted Pipeline': {
    definition: 'The forecast-adjusted value of the pipeline based on stage probabilities.',
    formula: 'SUM(ARR * Stage_Probability %)',
    timeFrame: 'Current Snapshot',
    category: 'Executive',
  },
  'At Risk': {
    definition: 'Percentage of pipeline value flagged as at-risk based on activity gaps, stage time, and engagement signals.',
    formula: '(At-Risk Deal Value / Total Pipeline Value) × 100',
    timeFrame: 'Current Snapshot',
    category: 'Executive',
  },
  'Win Rate': {
    definition: 'The ratio of deals successfully closed versus total deals closed (Won + Lost).',
    formula: '(Closed Won Count / Total Closed Count) * 100',
    timeFrame: 'Last 90 Days',
    category: 'Executive',
  },

  // ============================================
  // Pipeline & Forecast
  // ============================================
  'Pipeline Forecast': {
    definition: 'AI-generated revenue projection based on current pipeline health, historical conversion rates, and deal velocity.',
    formula: 'ML model combining weighted pipeline, win rate trends, and seasonality',
    timeFrame: 'Current Quarter',
    category: 'Forecast',
  },
  'Forecast Confidence': {
    definition: 'Statistical confidence level in the revenue forecast based on data quality and historical accuracy.',
    formula: 'Model accuracy score based on backtesting',
    timeFrame: 'Current Quarter',
    category: 'Forecast',
  },
  'Gap to Goal': {
    definition: 'The difference between your quarterly target and the forecasted revenue.',
    formula: 'Quarterly Target - Forecasted Revenue',
    timeFrame: 'Current Quarter',
    category: 'Forecast',
  },
  'Pipeline Trend': {
    definition: 'Historical view of pipeline value over time, showing growth or contraction patterns.',
    formula: 'Daily snapshot of total pipeline value',
    timeFrame: 'Last 30 Days',
    category: 'Forecast',
  },

  // ============================================
  // Risk Metrics
  // ============================================
  'Deals at Risk': {
    definition: 'Deals showing warning signs such as lack of activity, extended time in stage, or missed close dates.',
    formula: 'Deals where: Days Since Activity > 10 OR Days in Stage > Threshold OR Close Date Slipped',
    timeFrame: 'Current Snapshot',
    category: 'Risk',
  },
  'Close Date Slippage': {
    definition: 'Deals where the expected close date has been pushed back, categorized by severity.',
    formula: 'Current Close Date - Original Close Date (in days)',
    timeFrame: 'Last 7 Days',
    category: 'Risk',
  },
  'Stage Leakage': {
    definition: 'The percentage of deals that drop out or are lost at each specific funnel stage.',
    formula: '(Lost Deals in Stage / Total Deals in Stage) over last 90 days',
    timeFrame: 'Last 90 Days',
    category: 'Risk',
  },
  'Pending Rebook': {
    definition: 'High-priority deals that were previously stalled and require immediate re-engagement.',
    formula: "Deals with 'Rebook' status sorted by last activity date > 14 days",
    timeFrame: 'Current Snapshot',
    category: 'Risk',
  },
  'Pending Rebook Queue': {
    definition: 'High-priority deals that were previously stalled and require immediate re-engagement.',
    formula: "Deals with 'Rebook' status sorted by last activity date > 14 days",
    timeFrame: 'Current Snapshot',
    category: 'Risk',
  },
  'Days in Stage': {
    definition: 'Number of days a deal has been in its current pipeline stage. Extended time may indicate stalling.',
    formula: 'Current Date - Stage Entry Date',
    timeFrame: 'Current Snapshot',
    category: 'Risk',
  },
  'Days Since Activity': {
    definition: 'Number of days since the last recorded activity (call, email, meeting) on a deal.',
    formula: 'Current Date - Last Activity Date',
    timeFrame: 'Current Snapshot',
    category: 'Risk',
  },

  // ============================================
  // Sales Velocity & Performance
  // ============================================
  'Sales Velocity': {
    definition: 'Measures the daily revenue generation speed of your sales engine.',
    formula: '(Deals * Avg Size * Win Rate) / Sales Cycle Length',
    timeFrame: 'Last 90 Days',
    category: 'Performance',
  },
  'Daily Velocity Pulse': {
    definition: 'A real-time momentum indicator showing the financial volume of deal movements today.',
    formula: 'SUM(ARR of deals moved forward today) / Avg Team Cycle',
    timeFrame: 'Last 24 Hours',
    category: 'Performance',
  },
  'Velocity Factor Breakdown': {
    definition: 'A deep-dive into the 4 levers driving sales speed: Volume, Size, Conversion, and Time.',
    formula: 'Analysis of Count, Avg ARR, Win% and Days-to-Close per Rep',
    timeFrame: 'Last 90 Days',
    category: 'Performance',
  },
  'Average Deal Size': {
    definition: 'The mean value of closed-won deals, indicating typical contract size.',
    formula: 'Total Won Revenue / Number of Won Deals',
    timeFrame: 'Last 90 Days',
    category: 'Performance',
  },
  'Average Sales Cycle': {
    definition: 'The average number of days from deal creation to close, measuring sales efficiency.',
    formula: 'Sum of (Close Date - Create Date) / Number of Closed Deals',
    timeFrame: 'Last 90 Days',
    category: 'Performance',
  },
  'Rep Ramp': {
    definition: 'Tracks the productivity and performance of new hires over their first 6 months.',
    formula: 'Monthly ARR growth normalized by months since hire date',
    timeFrame: 'First 6 Months',
    category: 'Performance',
  },
  'Rep Ramp Curve': {
    definition: 'Tracks the productivity and performance of new hires over their first 6 months.',
    formula: 'Monthly ARR growth normalized by months since hire date',
    timeFrame: 'First 6 Months',
    category: 'Performance',
  },

  // ============================================
  // Win/Loss Analysis
  // ============================================
  'Win Rate Analysis': {
    definition: 'Detailed breakdown of won vs lost deals by rep, showing performance variance.',
    formula: 'Won Deals / (Won Deals + Lost Deals) per Rep',
    timeFrame: 'Last 90 Days',
    category: 'Performance',
  },
  'Won Value': {
    definition: 'Total ARR value of deals closed as won in the selected period.',
    formula: 'Sum of ARR for Closed Won deals',
    timeFrame: 'Last 90 Days',
    category: 'Performance',
  },
  'Lost Value': {
    definition: 'Total ARR value of deals closed as lost in the selected period.',
    formula: 'Sum of ARR for Closed Lost deals',
    timeFrame: 'Last 90 Days',
    category: 'Performance',
  },

  // ============================================
  // Behavioral & Activity Metrics
  // ============================================
  'Next Step Coverage': {
    definition: 'Percentage of open deals that have a defined next step, indicating proper deal management.',
    formula: '(Deals with Next Step / Total Open Deals) × 100',
    timeFrame: 'Current Snapshot',
    category: 'Behavioral',
  },
  'Multi-Threading': {
    definition: 'Distribution of deals by number of contacts engaged. More threads typically increase win probability.',
    formula: 'Count of unique contacts per deal, grouped by threading level',
    timeFrame: 'Current Snapshot',
    category: 'Behavioral',
  },
  'Threading Level': {
    definition: 'Classification of deal engagement depth: Single (1), Light (2-3), Multi (4-5), Deep (6+).',
    formula: 'Distinct contact count per deal',
    timeFrame: 'Current Snapshot',
    category: 'Behavioral',
  },

  // ============================================
  // SDR Metrics
  // ============================================
  'SDR Leaderboard': {
    definition: 'Ranking of SDRs by meeting outcomes, showing conversion from booked to held meetings.',
    formula: 'Meetings Held / Meetings Booked per SDR',
    timeFrame: 'Current Week',
    category: 'SDR',
  },
  'SDR Outreach Efficiency': {
    definition: 'Measures the conversion of outbound activities into qualified pipeline opportunities.',
    formula: '(New Created Deals / Total Outbound Activities)',
    timeFrame: 'Current Week',
    category: 'SDR',
  },
  'Meetings Booked': {
    definition: 'Total number of meetings scheduled by an SDR in the selected period.',
    formula: 'Count of meetings with status = Booked',
    timeFrame: 'Current Week',
    category: 'SDR',
  },
  'Meetings Held': {
    definition: 'Total number of meetings that actually occurred (not canceled or no-show).',
    formula: 'Count of meetings with status = Held',
    timeFrame: 'Current Week',
    category: 'SDR',
  },
  'Show Rate': {
    definition: 'Percentage of booked meetings that resulted in actual meetings held.',
    formula: '(Meetings Held / Meetings Booked) × 100',
    timeFrame: 'Current Week',
    category: 'SDR',
  },
  'No-Show Rate': {
    definition: 'Percentage of booked meetings where the prospect did not attend.',
    formula: '(No-Show Meetings / Meetings Booked) × 100',
    timeFrame: 'Current Week',
    category: 'SDR',
  },

  // ============================================
  // Deal Movement & Momentum
  // ============================================
  'Deal Movements': {
    definition: 'Real-time feed of pipeline changes including new deals, stage transitions, and closures.',
    formula: 'Tracked events: New Deal, Stage Change, Closed Won, Closed Lost',
    timeFrame: 'Last 7 Days',
    category: 'Momentum',
  },
  'Stage Transition Matrix': {
    definition: 'Visual map showing how deals flow between stages, revealing common paths and bottlenecks.',
    formula: 'Count of transitions from Stage A to Stage B',
    timeFrame: 'Last 30 Days',
    category: 'Momentum',
  },
  'New Deals': {
    definition: 'Deals that entered the pipeline in the selected time period.',
    formula: 'Count of deals where Create Date is within period',
    timeFrame: 'Last 7 Days',
    category: 'Momentum',
  },

  // ============================================
  // Leaderboard Metrics
  // ============================================
  'Rep Leaderboard': {
    definition: 'Ranking of sales reps based on a blend of revenue attainment and pipeline speed.',
    formula: 'Weighted average of Quota Attainment % and Velocity Score',
    timeFrame: 'Current Quarter',
    category: 'Performance',
  },
  'Owner Leaderboard': {
    definition: 'Ranking of sales reps based on a blend of revenue attainment and pipeline speed.',
    formula: 'Weighted average of Quota Attainment % and Velocity Score',
    timeFrame: 'Current Quarter',
    category: 'Performance',
  },
  'Pipeline by Owner': {
    definition: 'Distribution of pipeline value across the sales team.',
    formula: 'Group Sum of Deal Amount by Owner',
    timeFrame: 'Current Snapshot',
    category: 'Performance',
  },

  // ============================================
  // AI Insights
  // ============================================
  'AI Executive Summary': {
    definition: 'Automated narrative analysis of your pipeline health and primary risks.',
    formula: 'LLM analysis of v_ceo_dashboard and risk views',
    timeFrame: 'Current Snapshot',
    category: 'AI',
  },
};

/**
 * Get metric info by key
 * Returns definition, formula, and timeFrame, or defaults if not found
 */
export const getMetricInfo = (metricKey) => {
  const metric = METRIC_GLOSSARY[metricKey];
  if (metric) {
    return metric;
  }
  // Return default for unknown metrics
  return {
    definition: 'This metric helps track pipeline performance.',
    formula: 'See documentation for calculation details.',
    timeFrame: 'Current Snapshot',
    category: 'General',
  };
};

/**
 * Get all metrics by category
 */
export const getMetricsByCategory = (category) => {
  return Object.entries(METRIC_GLOSSARY)
    .filter(([_, value]) => value.category === category)
    .map(([key, value]) => ({ key, ...value }));
};

export default METRIC_GLOSSARY;
