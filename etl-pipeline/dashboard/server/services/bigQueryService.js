/**
 * BigQuery Service Layer
 * ======================
 * Connects to octup-testing.hubspot_data and queries dashboard views.
 *
 * Column names verified against BIGQUERY_ARCHITECTURE.md
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID || 'octup-testing',
});

const DATASET = process.env.BIGQUERY_DATASET || 'hubspot_data';
const PROJECT = process.env.BIGQUERY_PROJECT_ID || 'octup-testing';

// =============================================================================
// Server-side Cache for Performance (15 minutes)
// =============================================================================
const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    console.log(`[Cache] HIT: ${key}`);
    return entry.data;
  }
  if (entry) {
    cache.delete(key);
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`[Cache] SET: ${key}`);
}

/**
 * Execute a BigQuery query and return results
 */
async function executeQuery(sql) {
  const options = {
    query: sql,
    location: 'US',
  };

  const [rows] = await bigquery.query(options);
  return rows;
}

/**
 * Fetch CEO Dashboard KPIs
 * Source: v_ceo_dashboard
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 817-843
 */
async function fetchCEODashboard() {
  const sql = `
    SELECT
      report_date,
      total_open_deals,
      total_pipeline_value,
      weighted_pipeline_value,
      avg_deal_size,
      win_rate_pct,
      avg_sales_cycle_days,
      red_deals_count,
      red_deals_value,
      pct_deals_at_risk,
      deals_won_count,
      deals_won_value,
      deals_lost_count,
      deals_lost_value
    FROM \`${PROJECT}.${DATASET}.v_ceo_dashboard\`
    LIMIT 1
  `;

  const rows = await executeQuery(sql);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    // Map to frontend expected field names
    total_pipeline_value: Number(row.total_pipeline_value) || 0,
    weighted_pipeline_value: Number(row.weighted_pipeline_value) || 0,
    total_deals_count: Number(row.total_open_deals) || 0,
    at_risk_deals_count: Number(row.red_deals_count) || 0,
    at_risk_value: Number(row.red_deals_value) || 0,
    pct_deals_at_risk: Number(row.pct_deals_at_risk) || 0,
    win_rate_pct: Number(row.win_rate_pct) || 0,
    avg_deal_size: Number(row.avg_deal_size) || 0,
    avg_sales_cycle_days: Number(row.avg_sales_cycle_days) || 0,
    deals_closed_won_this_month: Number(row.deals_won_count) || 0,
    deals_closed_lost_this_month: Number(row.deals_lost_count) || 0,
    snapshot_date: row.report_date,
  };
}

/**
 * Fetch AI Executive Summary
 * Source: ceo_summaries_history table (direct query - avoids broken views)
 */
async function fetchAIExecutiveSummary() {
  // Query the history table directly to avoid broken view dependencies
  const sql = `
    SELECT
      summary AS executive_insight,
      generated_at
    FROM \`${PROJECT}.${DATASET}.ceo_summaries_history\`
    ORDER BY generated_at DESC
    LIMIT 1
  `;

  try {
    const rows = await executeQuery(sql);

    if (rows.length === 0) {
      return {
        executive_insight: 'No AI summary available yet. Run the Gemini summary generation to create one.',
        generated_at: new Date().toISOString(),
        model_version: 'gemini-1.5-pro',
        confidence_score: null,
      };
    }

    const row = rows[0];

    // Handle BigQuery timestamp format (may be object with .value or string)
    let generatedAt = new Date().toISOString();
    if (row.generated_at) {
      try {
        // BigQuery timestamps can come as { value: "..." } objects or strings
        const tsValue = row.generated_at.value || row.generated_at;
        generatedAt = new Date(tsValue).toISOString();
      } catch (e) {
        // If parsing fails, use current time
        generatedAt = new Date().toISOString();
      }
    }

    return {
      executive_insight: row.executive_insight || '',
      generated_at: generatedAt,
      model_version: 'gemini-1.5-pro',
      confidence_score: null,
    };
  } catch (err) {
    // If table doesn't exist or other error, return placeholder
    console.error('AI summary table error:', err.message);
    return {
      executive_insight: 'AI summary is being generated. Check back shortly for pipeline insights.',
      generated_at: new Date().toISOString(),
      model_version: 'gemini-1.5-pro',
      confidence_score: null,
    };
  }
}

/**
 * Fetch Deals At Risk
 * Source: v_deals_at_risk
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 75-112
 * Note: is_pending_rebook is calculated from owner_name containing 'chanan'
 */
async function fetchDealsAtRisk() {
  const sql = `
    SELECT
      hs_object_id,
      dealname,
      company_name,
      arr_value,
      amount,
      dealstage_label,
      owner_name,
      owner_email,
      days_in_current_stage,
      days_since_last_activity,
      notes_last_contacted,
      next_meeting_scheduled,
      has_upcoming_meeting,
      has_recent_activity,
      is_enterprise,
      is_stalled,
      is_ghosted,
      is_at_risk,
      is_unassigned_risk,
      primary_risk_reason,
      snapshot_date,
      -- Calculate is_pending_rebook based on owner containing 'chanan'
      LOWER(owner_name) LIKE '%chanan%' AS is_pending_rebook
    FROM \`${PROJECT}.${DATASET}.v_deals_at_risk\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_deals_at_risk\`
    )
    -- Exclude Chanan's deals (pending rebook queue)
    AND LOWER(owner_name) NOT LIKE '%chanan%'
    ORDER BY is_at_risk DESC, arr_value DESC
  `;

  const rows = await executeQuery(sql);

  // Get threading data to merge
  const threadingData = await fetchMultiThreadingMap();

  return rows.map(row => {
    const threading = threadingData[row.hs_object_id] || {};
    return {
      deal_id: row.hs_object_id,
      dealname: row.dealname || 'Unnamed Deal',
      company_name: row.company_name || '',
      arr_value: Number(row.arr_value) || 0,
      amount: Number(row.amount) || 0,
      deal_stage_label: row.dealstage_label || 'Unknown',
      pipeline_label: '3PL New Business',
      owner_name: row.owner_name || 'Unassigned',
      owner_email: row.owner_email || '',
      days_in_current_stage: Number(row.days_in_current_stage) || 0,
      days_since_last_activity: Number(row.days_since_last_activity) || 0,
      last_activity_date: row.notes_last_contacted,
      next_meeting_date: row.next_meeting_scheduled,
      has_upcoming_meeting: Boolean(row.has_upcoming_meeting),
      has_recent_activity: Boolean(row.has_recent_activity),
      contact_count: threading.contact_count || 0,
      is_enterprise: Boolean(row.is_enterprise),
      is_stalled: Boolean(row.is_stalled),
      is_ghosted: Boolean(row.is_ghosted),
      is_at_risk: Boolean(row.is_at_risk),
      is_unassigned_risk: Boolean(row.is_unassigned_risk),
      is_pending_rebook: Boolean(row.is_pending_rebook),
      primary_risk_reason: row.primary_risk_reason || null,
      snapshot_date: row.snapshot_date,
      threading_level: threading.threading_level || 'Unknown',
      is_critical_risk_loss_of_momentum: threading.is_critical_risk_loss_of_momentum || false,
      hubspot_url: row.hs_object_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.hs_object_id}` : null,
    };
  });
}

/**
 * Fetch Pending Rebook Deals (Chanan's Queue)
 * Source: v_deals_at_risk filtered for Chanan
 */
async function fetchPendingRebook() {
  const sql = `
    SELECT
      hs_object_id,
      dealname,
      company_name,
      arr_value,
      amount,
      dealstage_label,
      owner_name,
      owner_email,
      days_in_current_stage,
      days_since_last_activity,
      notes_last_contacted,
      snapshot_date
    FROM \`${PROJECT}.${DATASET}.v_deals_at_risk\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_deals_at_risk\`
    )
    AND LOWER(owner_name) LIKE '%chanan%'
    ORDER BY days_in_current_stage DESC
  `;

  const rows = await executeQuery(sql);

  return rows.map(row => ({
    deal_id: row.hs_object_id,
    dealname: row.dealname || 'Unnamed Deal',
    company_name: row.company_name || '',
    arr_value: Number(row.arr_value) || 0,
    amount: Number(row.amount) || 0,
    deal_stage_label: row.dealstage_label || 'Meeting No-Show',
    owner_name: row.owner_name || 'Chanan',
    owner_email: row.owner_email || '',
    days_in_current_stage: Number(row.days_in_current_stage) || 0,
    days_since_last_activity: Number(row.days_since_last_activity) || 0,
    last_activity_date: row.notes_last_contacted,
    original_meeting_date: row.notes_last_contacted,
    rebook_attempts: 0,
    is_pending_rebook: true,
    is_at_risk: false,
    contact_count: 0,
    hubspot_url: row.hs_object_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.hs_object_id}` : null,
  }));
}

/**
 * Fetch Rep Ramp Chart Data
 * Source: v_rep_ramp_chart
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 319-354
 */
async function fetchRepRampChart() {
  const sql = `
    SELECT
      owner_name,
      quarter_of_tenure,
      cumulative_arr,
      cumulative_deals,
      deals_won
    FROM \`${PROJECT}.${DATASET}.v_rep_ramp_chart\`
    WHERE quarter_of_tenure BETWEEN 1 AND 6
    ORDER BY owner_name, quarter_of_tenure
  `;

  const rows = await executeQuery(sql);

  return rows.map(row => ({
    owner_name: row.owner_name || 'Unknown',
    quarter_of_tenure: Number(row.quarter_of_tenure) || 1,
    cumulative_arr: Number(row.cumulative_arr) || 0,
    cumulative_deals: Number(row.cumulative_deals) || 0,
    deals_won: Number(row.deals_won) || 0,
  }));
}

/**
 * Fetch Multi-Threading Data as a map for joining
 * Source: v_multi_threading
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 232-275
 */
async function fetchMultiThreadingMap() {
  const sql = `
    SELECT
      hs_object_id,
      dealname,
      contact_count,
      threading_level,
      is_critical_risk_loss_of_momentum
    FROM \`${PROJECT}.${DATASET}.v_multi_threading\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_multi_threading\`
    )
  `;

  const rows = await executeQuery(sql);

  // Return as a map keyed by hs_object_id
  const map = {};
  for (const row of rows) {
    map[row.hs_object_id] = {
      contact_count: Number(row.contact_count) || 0,
      threading_level: row.threading_level || 'Unknown',
      is_critical_risk_loss_of_momentum: Boolean(row.is_critical_risk_loss_of_momentum),
    };
  }
  return map;
}

/**
 * Fetch Multi-Threading Data as array
 */
async function fetchMultiThreading() {
  const sql = `
    SELECT
      hs_object_id,
      dealname,
      contact_count,
      threading_level,
      is_critical_risk_loss_of_momentum
    FROM \`${PROJECT}.${DATASET}.v_multi_threading\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_multi_threading\`
    )
  `;

  const rows = await executeQuery(sql);

  return rows.map(row => ({
    deal_id: row.hs_object_id,
    dealname: row.dealname || 'Unnamed Deal',
    contact_count: Number(row.contact_count) || 0,
    threading_level: row.threading_level || 'Unknown',
    is_critical_risk_loss_of_momentum: Boolean(row.is_critical_risk_loss_of_momentum),
  }));
}

/**
 * Fetch AI Forecast Analysis
 * Source: v_ai_forecast_analysis
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 917-930
 *
 * Note: quarterly_target is for NEW ARR (closed won this quarter)
 * We also fetch QTD (quarter-to-date) won value to compare against target
 */
async function fetchForecastAnalysis() {
  // Main forecast query
  const forecastSql = `
    SELECT
      forecasted_revenue_amount,
      optimistic_revenue,
      pessimistic_revenue,
      confidence_score,
      gap_to_goal,
      forecasting_rationale,
      quarterly_target,
      total_pipeline_value,
      total_weighted_value,
      historical_win_rate_pct,
      generated_at
    FROM \`${PROJECT}.${DATASET}.v_ai_forecast_analysis\`
    ORDER BY generated_at DESC
    LIMIT 1
  `;

  // Query for quarter-to-date won deals (NEW ARR closed this quarter)
  // Uses dynamic quarter calculation based on current date
  // Cast closedate to DATE for proper comparison (it's stored as TIMESTAMP)
  // Filter to only New Business pipeline (not renewals/upsells)
  const qtdWonSql = `
    SELECT
      COUNT(*) as qtd_won_count,
      SUM(COALESCE(hs_arr, amount, 0)) as qtd_won_value
    FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    )
    AND is_won = TRUE
    AND DATE(closedate) >= DATE_TRUNC(CURRENT_DATE(), QUARTER)
    AND DATE(closedate) <= CURRENT_DATE()
    AND pipeline_label = '3PL New Business'
  `;

  // Debug query to see which deals are being counted
  const qtdWonDetailsSql = `
    SELECT
      hs_object_id,
      dealname,
      pipeline_label,
      owner_name,
      COALESCE(hs_arr, amount, 0) as arr_value,
      DATE(closedate) as close_date
    FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    )
    AND is_won = TRUE
    AND DATE(closedate) >= DATE_TRUNC(CURRENT_DATE(), QUARTER)
    AND DATE(closedate) <= CURRENT_DATE()
    AND pipeline_label = '3PL New Business'
    ORDER BY closedate DESC
  `;

  try {
    const [forecastRows, qtdRows, qtdDetailsRows] = await Promise.all([
      executeQuery(forecastSql),
      executeQuery(qtdWonSql),
      executeQuery(qtdWonDetailsSql)
    ]);

    // Log the Q-T-D won deals details for debugging
    console.log('=== Q-T-D Won Deals Debug (New Business Pipeline) ===');
    console.log(`Found ${qtdDetailsRows.length} deals:`);
    for (const deal of qtdDetailsRows) {
      const closeDate = deal.close_date?.value || deal.close_date;
      console.log(`  - ${deal.dealname}: $${deal.arr_value} (closed ${closeDate}) [${deal.pipeline_label}] - ${deal.owner_name}`);
    }
    const totalFromDetails = qtdDetailsRows.reduce((sum, d) => sum + (Number(d.arr_value) || 0), 0);
    console.log(`Total from details: $${totalFromDetails.toLocaleString()} from ${qtdDetailsRows.length} deals`);
    console.log('=================================================');

    // Q1 2025 target - $1.6M NEW ARR
    const Q1_TARGET = 1600000;

    // Extract QTD won metrics
    const qtdMetrics = qtdRows[0] || {};
    const qtdWonCount = Number(qtdMetrics.qtd_won_count) || 0;
    const qtdWonValue = Number(qtdMetrics.qtd_won_value) || 0;

    // Gap to goal is based on ACTUAL QTD won value vs target (not forecast)
    const gapToGoal = Q1_TARGET - qtdWonValue;

    if (forecastRows.length === 0) {
      return {
        forecasted_revenue: 0,
        optimistic_revenue: 0,
        pessimistic_revenue: 0,
        confidence_score: 0,
        gap_to_goal: gapToGoal,
        forecasting_rationale: 'No forecast data available. Run the AI forecast generation.',
        quarterly_target: Q1_TARGET,
        qtd_won_value: qtdWonValue,
        qtd_won_count: qtdWonCount,
        total_pipeline_value: 0,
        total_weighted_value: 0,
        historical_win_rate_pct: 0,
        generated_at: new Date().toISOString(),
      };
    }

    const row = forecastRows[0];
    const forecastedRevenue = Number(row.forecasted_revenue_amount) || 0;
    const totalWeightedValue = Number(row.total_weighted_value) || 0;

    return {
      forecasted_revenue: forecastedRevenue,
      optimistic_revenue: Number(row.optimistic_revenue) || 0,
      pessimistic_revenue: Number(row.pessimistic_revenue) || 0,
      confidence_score: Number(row.confidence_score) || 0,
      gap_to_goal: gapToGoal,
      forecasting_rationale: row.forecasting_rationale || '',
      quarterly_target: Q1_TARGET,
      qtd_won_value: qtdWonValue,
      qtd_won_count: qtdWonCount,
      total_pipeline_value: Number(row.total_pipeline_value) || 0,
      total_weighted_value: totalWeightedValue,
      historical_win_rate_pct: Number(row.historical_win_rate_pct) || 0,
      generated_at: row.generated_at ? new Date(row.generated_at.value || row.generated_at).toISOString() : new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error fetching forecast analysis:', err.message);
    return {
      forecasted_revenue: 0,
      optimistic_revenue: 0,
      pessimistic_revenue: 0,
      confidence_score: 0,
      gap_to_goal: 1600000,
      forecasting_rationale: 'Forecast analysis unavailable.',
      quarterly_target: 1600000,
      qtd_won_value: 0,
      qtd_won_count: 0,
      total_pipeline_value: 0,
      total_weighted_value: 0,
      historical_win_rate_pct: 0,
      generated_at: new Date().toISOString(),
    };
  }
}

/**
 * Fetch Stage Leakage Data
 * Source: v_stage_leakage
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 751-761
 */
async function fetchStageLeakage() {
  const sql = `
    SELECT
      snapshot_date,
      pipeline_label,
      from_stage,
      exit_type,
      exit_count,
      exit_value
    FROM \`${PROJECT}.${DATASET}.v_stage_leakage\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_stage_leakage\`
    )
    ORDER BY exit_value DESC
  `;

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => ({
      snapshot_date: row.snapshot_date,
      pipeline_label: row.pipeline_label || '3PL New Business',
      from_stage: row.from_stage || 'Unknown',
      exit_type: row.exit_type || 'Unknown',
      exit_count: Number(row.exit_count) || 0,
      exit_value: Number(row.exit_value) || 0,
    }));
  } catch (err) {
    console.error('Error fetching stage leakage:', err.message);
    return [];
  }
}

/**
 * Fetch Close Date Slippage Data
 * Source: v_close_date_slippage
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 708-732
 */
async function fetchCloseDateSlippage() {
  const sql = `
    SELECT
      snapshot_date,
      hs_object_id,
      dealname,
      pipeline_label,
      owner_name,
      amount,
      prev_closedate,
      curr_closedate,
      days_slipped,
      slippage_category
    FROM \`${PROJECT}.${DATASET}.v_close_date_slippage\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_close_date_slippage\`
    )
    ORDER BY days_slipped DESC
  `;

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => ({
      snapshot_date: row.snapshot_date,
      deal_id: row.hs_object_id,
      dealname: row.dealname || 'Unnamed Deal',
      pipeline_label: row.pipeline_label || '3PL New Business',
      owner_name: row.owner_name || 'Unassigned',
      amount: Number(row.amount) || 0,
      prev_closedate: row.prev_closedate,
      curr_closedate: row.curr_closedate,
      days_slipped: Number(row.days_slipped) || 0,
      slippage_category: row.slippage_category || 'No Change',
      hubspot_url: row.hs_object_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.hs_object_id}` : null,
    }));
  } catch (err) {
    console.error('Error fetching close date slippage:', err.message);
    return [];
  }
}

/**
 * Fetch Sales Velocity Data
 * Source: v_sales_velocity
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 947-968
 */
async function fetchSalesVelocity(ownerName = null) {
  let sql = `
    SELECT
      snapshot_date,
      pipeline_label,
      owner_name,
      num_opportunities,
      avg_deal_value,
      win_rate_pct,
      avg_sales_cycle_days,
      sales_velocity_daily,
      sales_velocity_monthly
    FROM \`${PROJECT}.${DATASET}.v_sales_velocity\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_sales_velocity\`
    )
  `;

  if (ownerName && ownerName !== 'all') {
    sql += ` AND owner_name = '${ownerName.replace(/'/g, "''")}'`;
  }

  sql += ' ORDER BY sales_velocity_monthly DESC';

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => ({
      snapshot_date: row.snapshot_date,
      pipeline_label: row.pipeline_label || '3PL New Business',
      owner_name: row.owner_name || 'Unknown',
      num_opportunities: Number(row.num_opportunities) || 0,
      avg_deal_value: Number(row.avg_deal_value) || 0,
      win_rate_pct: Number(row.win_rate_pct) || 0,
      avg_sales_cycle_days: Number(row.avg_sales_cycle_days) || 0,
      sales_velocity_daily: Number(row.sales_velocity_daily) || 0,
      sales_velocity_monthly: Number(row.sales_velocity_monthly) || 0,
    }));
  } catch (err) {
    console.error('Error fetching sales velocity:', err.message);
    return [];
  }
}

/**
 * Fetch Win Rate Analysis Data
 * Source: v_win_rate_analysis
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 970-986
 */
async function fetchWinRateAnalysis(ownerName = null) {
  let sql = `
    SELECT
      snapshot_date,
      pipeline_label,
      owner_name,
      won_count,
      lost_count,
      closed_count,
      win_rate_pct,
      won_value,
      lost_value,
      avg_won_deal_size,
      avg_lost_deal_size
    FROM \`${PROJECT}.${DATASET}.v_win_rate_analysis\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_win_rate_analysis\`
    )
  `;

  if (ownerName && ownerName !== 'all') {
    sql += ` AND owner_name = '${ownerName.replace(/'/g, "''")}'`;
  }

  sql += ' ORDER BY win_rate_pct DESC';

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => ({
      snapshot_date: row.snapshot_date,
      pipeline_label: row.pipeline_label || '3PL New Business',
      owner_name: row.owner_name || 'Unknown',
      won_count: Number(row.won_count) || 0,
      lost_count: Number(row.lost_count) || 0,
      closed_count: Number(row.closed_count) || 0,
      win_rate_pct: Number(row.win_rate_pct) || 0,
      won_value: Number(row.won_value) || 0,
      lost_value: Number(row.lost_value) || 0,
      avg_won_deal_size: Number(row.avg_won_deal_size) || 0,
      avg_lost_deal_size: Number(row.avg_lost_deal_size) || 0,
    }));
  } catch (err) {
    console.error('Error fetching win rate analysis:', err.message);
    return [];
  }
}

/**
 * Fetch Next Step Coverage Data
 * Source: v_next_step_coverage
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 1051-1061
 */
async function fetchNextStepCoverage() {
  const sql = `
    SELECT
      snapshot_date,
      pipeline_label,
      owner_name,
      total_open_deals,
      deals_with_next_step,
      next_step_coverage_pct
    FROM \`${PROJECT}.${DATASET}.v_next_step_coverage\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_next_step_coverage\`
    )
    ORDER BY next_step_coverage_pct ASC
  `;

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => ({
      snapshot_date: row.snapshot_date,
      pipeline_label: row.pipeline_label || '3PL New Business',
      owner_name: row.owner_name || 'Unknown',
      total_open_deals: Number(row.total_open_deals) || 0,
      deals_with_next_step: Number(row.deals_with_next_step) || 0,
      next_step_coverage_pct: Number(row.next_step_coverage_pct) || 0,
    }));
  } catch (err) {
    console.error('Error fetching next step coverage:', err.message);
    return [];
  }
}

/**
 * Fetch Owner Leaderboard Data
 * Source: v_owner_leaderboard
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 280-314
 */
async function fetchOwnerLeaderboard() {
  const sql = `
    SELECT
      snapshot_date,
      owner_name,
      owner_email,
      open_deals,
      won_deals,
      lost_deals,
      pipeline_value,
      weighted_pipeline,
      won_value,
      at_risk_value,
      clean_pipeline_value,
      win_rate_pct,
      avg_sales_cycle_days,
      at_risk_deals
    FROM \`${PROJECT}.${DATASET}.v_owner_leaderboard\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_owner_leaderboard\`
    )
    ORDER BY won_value DESC
  `;

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => ({
      snapshot_date: row.snapshot_date,
      owner_name: row.owner_name || 'Unknown',
      owner_email: row.owner_email || '',
      open_deals: Number(row.open_deals) || 0,
      won_deals: Number(row.won_deals) || 0,
      lost_deals: Number(row.lost_deals) || 0,
      pipeline_value: Number(row.pipeline_value) || 0,
      weighted_pipeline: Number(row.weighted_pipeline) || 0,
      won_value: Number(row.won_value) || 0,
      at_risk_value: Number(row.at_risk_value) || 0,
      clean_pipeline_value: Number(row.clean_pipeline_value) || 0,
      win_rate_pct: Number(row.win_rate_pct) || 0,
      avg_sales_cycle_days: Number(row.avg_sales_cycle_days) || 0,
      at_risk_deals: Number(row.at_risk_deals) || 0,
    }));
  } catch (err) {
    console.error('Error fetching owner leaderboard:', err.message);
    return [];
  }
}

/**
 * Fetch SDR Leaderboard Data
 * Source: v_sdr_leaderboard
 * Updated: Now includes nbm_deals_created (deals entering NBM Scheduled stage)
 * This replaces meetings_booked_count due to HubSpot attribution limitations.
 * @param {string} weekStart - Optional specific week to query (format: YYYY-MM-DD)
 */
async function fetchSDRLeaderboard(weekStart = null) {
  let weekFilter;
  if (weekStart) {
    // Use specific week provided
    weekFilter = `week_start = DATE('${weekStart}')`;
  } else {
    // Default to most recent week that's not in the future
    weekFilter = `week_start = (
      SELECT MAX(week_start)
      FROM \`${PROJECT}.${DATASET}.v_sdr_leaderboard\`
      WHERE week_start <= DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY))
    )`;
  }

  const sql = `
    SELECT
      sdr_name,
      sdr_email,
      week_start,
      nbm_deals_created,
      nbm_arr_value,
      meetings_booked_count,
      meetings_held_count,
      meetings_no_show_count,
      held_rate_pct,
      no_show_rate_pct,
      total_open_deals,
      total_pipeline_arr,
      at_risk_deals_count,
      at_risk_value,
      stalled_deals,
      ghosted_deals,
      rank_by_meetings_held,
      rank_by_meetings_booked,
      rank_by_held_rate,
      rank_by_risk
    FROM \`${PROJECT}.${DATASET}.v_sdr_leaderboard\`
    WHERE ${weekFilter}
    ORDER BY nbm_deals_created DESC
  `;

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => ({
      sdr_name: row.sdr_name || 'Unknown',
      sdr_email: row.sdr_email || '',
      week_start: row.week_start,
      // New fields for NBM tracking
      nbm_deals_created: Number(row.nbm_deals_created) || 0,
      nbm_arr_value: Number(row.nbm_arr_value) || 0,
      // Legacy field mapped to NBM for backward compatibility
      meetings_booked_count: Number(row.nbm_deals_created) || Number(row.meetings_booked_count) || 0,
      meetings_held_count: Number(row.meetings_held_count) || 0,
      meetings_no_show_count: Number(row.meetings_no_show_count) || 0,
      held_rate_pct: Number(row.held_rate_pct) || 0,
      no_show_rate_pct: Number(row.no_show_rate_pct) || 0,
      total_open_deals: Number(row.total_open_deals) || 0,
      total_pipeline_arr: Number(row.total_pipeline_arr) || 0,
      at_risk_deals_count: Number(row.at_risk_deals_count) || 0,
      at_risk_value: Number(row.at_risk_value) || 0,
      stalled_deals: Number(row.stalled_deals) || 0,
      ghosted_deals: Number(row.ghosted_deals) || 0,
      rank_by_meetings_held: Number(row.rank_by_meetings_held) || 0,
      rank_by_meetings_booked: Number(row.rank_by_meetings_booked) || 0,
      rank_by_held_rate: Number(row.rank_by_held_rate) || 0,
      rank_by_risk: Number(row.rank_by_risk) || 0,
    }));
  } catch (err) {
    console.error('Error fetching SDR leaderboard:', err.message);
    return [];
  }
}

/**
 * Fetch available weeks for SDR Leaderboard
 * Returns list of week_start dates with data
 */
async function fetchSDRAvailableWeeks() {
  const sql = `
    SELECT DISTINCT week_start
    FROM \`${PROJECT}.${DATASET}.v_sdr_leaderboard\`
    WHERE week_start <= DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY))
    ORDER BY week_start DESC
    LIMIT 12
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      week_start: row.week_start?.value || row.week_start,
    }));
  } catch (err) {
    console.error('Error fetching SDR available weeks:', err.message);
    return [];
  }
}

/**
 * Fetch NBM deals for a specific SDR in a specific week
 * Returns deal details for drill-down modal
 * @param {string} sdrName - The SDR/owner name
 * @param {string} weekStart - Week start date (format: YYYY-MM-DD)
 */
async function fetchSDRDeals(sdrName, weekStart) {
  const safeSdrName = (sdrName || '').replace(/'/g, "''");

  const sql = `
    SELECT
      deal_id,
      deal_name,
      value_arr,
      current_stage,
      transition_date,
      owner_name
    FROM \`${PROJECT}.${DATASET}.v_daily_deal_movements\`
    WHERE current_stage = 'NBM Scheduled'
      AND (previous_stage IS NULL OR previous_stage != 'NBM Scheduled')
      AND owner_name = '${safeSdrName}'
      AND DATE_TRUNC(transition_date, WEEK(MONDAY)) = DATE('${weekStart}')
    ORDER BY value_arr DESC
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      deal_id: row.deal_id,
      deal_name: row.deal_name || 'Unnamed Deal',
      arr_value: Number(row.value_arr) || 0,
      stage: row.current_stage,
      transition_date: row.transition_date?.value || row.transition_date,
      owner_name: row.owner_name,
      hubspot_url: row.deal_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.deal_id}` : null,
    }));
  } catch (err) {
    console.error('Error fetching SDR deals:', err.message);
    return [];
  }
}

/**
 * Fetch SDR Meeting Outcomes Data
 * Source: v_sdr_meeting_outcomes
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 602-611
 */
async function fetchSDRMeetingOutcomes() {
  const sql = `
    SELECT
      week_start,
      sdr_name,
      meeting_outcome,
      meeting_count,
      pct_of_total
    FROM \`${PROJECT}.${DATASET}.v_sdr_meeting_outcomes\`
    WHERE week_start = (
      SELECT MAX(week_start)
      FROM \`${PROJECT}.${DATASET}.v_sdr_meeting_outcomes\`
    )
    ORDER BY sdr_name, meeting_count DESC
  `;

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => ({
      week_start: row.week_start,
      sdr_name: row.sdr_name || 'Unknown',
      meeting_outcome: row.meeting_outcome || 'Unknown',
      meeting_count: Number(row.meeting_count) || 0,
      pct_of_total: Number(row.pct_of_total) || 0,
    }));
  } catch (err) {
    console.error('Error fetching SDR meeting outcomes:', err.message);
    return [];
  }
}

/**
 * Fetch Pipeline Trend Data
 * Source: v_pipeline_trend
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 420-435
 *
 * Note: won_deals in the view is CUMULATIVE. For period-specific counts,
 * we fetch deals closed within the 30-day window separately.
 */
async function fetchPipelineTrend() {
  // Main trend query
  const trendSql = `
    SELECT
      snapshot_date,
      total_deals,
      open_deals,
      won_deals,
      lost_deals,
      open_pipeline_value,
      weighted_pipeline_value,
      won_value,
      lost_value,
      prev_pipeline_value,
      pipeline_change
    FROM \`${PROJECT}.${DATASET}.v_pipeline_trend\`
    ORDER BY snapshot_date DESC
    LIMIT 30
  `;

  // Query for deals actually closed within the last 30 days
  // Uses closedate field from deals_snapshots to get accurate period counts
  // Cast closedate to DATE for proper comparison (it's stored as TIMESTAMP)
  const periodClosedSql = `
    SELECT
      COUNTIF(is_won = TRUE) as period_won_deals,
      COUNTIF(is_lost = TRUE) as period_lost_deals,
      SUM(CASE WHEN is_won = TRUE THEN COALESCE(hs_arr, amount, 0) ELSE 0 END) as period_won_value,
      SUM(CASE WHEN is_lost = TRUE THEN COALESCE(hs_arr, amount, 0) ELSE 0 END) as period_lost_value
    FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    )
    AND (is_won = TRUE OR is_lost = TRUE)
    AND DATE(closedate) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  `;

  try {
    // Run queries separately to isolate errors
    let trendRows = [];
    let periodRows = [];

    try {
      trendRows = await executeQuery(trendSql);
    } catch (trendErr) {
      console.error('Error in trendSql query:', trendErr.message);
      // Continue with empty trend data
    }

    try {
      periodRows = await executeQuery(periodClosedSql);
    } catch (periodErr) {
      console.error('Error in periodClosedSql query:', periodErr.message);
      // Continue with empty period data
    }

    // If no trend data, return empty
    if (!trendRows || trendRows.length === 0) {
      console.warn('No trend data returned from v_pipeline_trend');
      return [];
    }

    // Extract period-specific closed deal metrics
    const periodMetrics = (periodRows && periodRows[0]) || {};
    const periodWonDeals = Number(periodMetrics.period_won_deals) || 0;
    const periodLostDeals = Number(periodMetrics.period_lost_deals) || 0;
    const periodWonValue = Number(periodMetrics.period_won_value) || 0;
    const periodLostValue = Number(periodMetrics.period_lost_value) || 0;

    // Add period metrics to first row (latest) for frontend access
    const result = trendRows.map((row, index) => ({
      snapshot_date: row.snapshot_date?.value || row.snapshot_date,
      total_deals: Number(row.total_deals) || 0,
      open_deals: Number(row.open_deals) || 0,
      won_deals: Number(row.won_deals) || 0,
      lost_deals: Number(row.lost_deals) || 0,
      open_pipeline_value: Number(row.open_pipeline_value) || 0,
      weighted_pipeline_value: Number(row.weighted_pipeline_value) || 0,
      won_value: Number(row.won_value) || 0,
      lost_value: Number(row.lost_value) || 0,
      prev_pipeline_value: Number(row.prev_pipeline_value) || 0,
      pipeline_change: Number(row.pipeline_change) || 0,
      // Add period-specific metrics to latest snapshot (index 0)
      ...(index === 0 ? {
        period_won_deals: periodWonDeals,
        period_lost_deals: periodLostDeals,
        period_won_value: periodWonValue,
        period_lost_value: periodLostValue,
      } : {}),
    }));

    return result;
  } catch (err) {
    console.error('Error fetching pipeline trend:', err.message);
    return [];
  }
}

/**
 * Fetch Daily Deal Movements Data
 * Source: v_daily_deal_movements
 * Columns verified from BIGQUERY_ARCHITECTURE.md lines 663-688
 */
async function fetchDailyDealMovements() {
  const sql = `
    SELECT
      deal_id,
      deal_name,
      value_arr,
      previous_stage,
      current_stage,
      transition_date,
      owner_name,
      days_in_previous_stage,
      movement_type,
      movement_description
    FROM \`${PROJECT}.${DATASET}.v_daily_deal_movements\`
    WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    ORDER BY transition_date DESC, value_arr DESC
  `;

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => ({
      deal_id: row.deal_id,
      deal_name: row.deal_name || 'Unnamed Deal',
      value_arr: Number(row.value_arr) || 0,
      previous_stage: row.previous_stage || 'New',
      current_stage: row.current_stage || 'Unknown',
      transition_date: row.transition_date?.value || row.transition_date,
      owner_name: row.owner_name || 'Unassigned',
      days_in_previous_stage: Number(row.days_in_previous_stage) || 0,
      movement_type: row.movement_type || 'Unknown',
      movement_description: row.movement_description || '',
      hubspot_url: row.deal_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.deal_id}` : null,
    }));
  } catch (err) {
    console.error('Error fetching daily deal movements:', err.message);
    return [];
  }
}

/**
 * Fetch Deal Velocity Timeline Data (14-day stage movements)
 * Source: v_daily_deal_movements
 * Returns movements grouped by deal_id for timeline display
 */
async function fetchDealVelocity() {
  const sql = `
    SELECT
      deal_id,
      deal_name,
      value_arr,
      previous_stage,
      current_stage,
      transition_date,
      owner_name,
      days_in_previous_stage,
      movement_type,
      movement_description
    FROM \`${PROJECT}.${DATASET}.v_daily_deal_movements\`
    WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
    ORDER BY deal_id, transition_date ASC
  `;

  try {
    const rows = await executeQuery(sql);

    // Group movements by deal_id
    const dealMovements = {};
    for (const row of rows) {
      const dealId = row.deal_id;
      if (!dealMovements[dealId]) {
        dealMovements[dealId] = [];
      }
      dealMovements[dealId].push({
        previous_stage: row.previous_stage || 'New',
        current_stage: row.current_stage || 'Unknown',
        transition_date: row.transition_date,
        days_in_previous_stage: Number(row.days_in_previous_stage) || 0,
        movement_type: row.movement_type || 'Unknown',
      });
    }

    return dealMovements;
  } catch (err) {
    console.error('Error fetching deal velocity:', err.message);
    return {};
  }
}

/**
 * Fetch Recent Closed Deals (Won and Lost) for Win Rate drill-down
 * Returns 15 most recent closed deals with sales cycle time
 * Uses deals_snapshots table which has is_won and is_lost boolean flags
 */
async function fetchRecentClosedDeals() {
  const sql = `
    SELECT
      hs_object_id,
      dealname,
      amount,
      COALESCE(hs_arr, amount) as arr_value,
      owner_name,
      dealstage_label,
      is_won,
      is_lost,
      createdate,
      closedate,
      CASE
        WHEN closedate IS NOT NULL AND createdate IS NOT NULL
        THEN DATE_DIFF(CAST(closedate AS DATE), CAST(createdate AS DATE), DAY)
        ELSE 0
      END as sales_cycle_days
    FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    )
    AND (is_won = TRUE OR is_lost = TRUE)
    ORDER BY closedate DESC NULLS LAST
    LIMIT 15
  `;

  try {
    const rows = await executeQuery(sql);

    return rows.map(row => {
      // Handle BigQuery date/timestamp formats
      let closeDate = null;
      let createDate = null;

      if (row.closedate) {
        try {
          const closeDateValue = row.closedate.value || row.closedate;
          closeDate = new Date(closeDateValue).toISOString().split('T')[0];
        } catch (e) {
          closeDate = null;
        }
      }
      if (row.createdate) {
        try {
          const createDateValue = row.createdate.value || row.createdate;
          createDate = new Date(createDateValue).toISOString().split('T')[0];
        } catch (e) {
          createDate = null;
        }
      }

      const isWon = Boolean(row.is_won);

      return {
        deal_id: row.hs_object_id,
        dealname: row.dealname || 'Unnamed Deal',
        amount: Math.round(Number(row.amount) || Number(row.arr_value) || 0),
        owner_name: row.owner_name || 'Unassigned',
        stage_label: row.dealstage_label || 'Unknown',
        is_won: isWon,
        status: isWon ? 'Won' : 'Lost',
        create_date: createDate,
        close_date: closeDate,
        sales_cycle_days: Math.round(Number(row.sales_cycle_days) || 0),
        hubspot_url: row.hs_object_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.hs_object_id}` : null,
      };
    });
  } catch (err) {
    console.error('Error fetching recent closed deals:', err.message);
    return [];
  }
}

/**
 * Debug function: Fetch Q-T-D won deals with details
 * Shows ALL won deals in current quarter to help identify what's being counted
 */
async function fetchQTDWonDealsDebug() {
  // Query 1: All won deals in current quarter (regardless of pipeline)
  const allWonSql = `
    SELECT
      hs_object_id,
      dealname,
      pipeline_label,
      owner_name,
      COALESCE(hs_arr, amount, 0) as arr_value,
      amount,
      hs_arr,
      DATE(closedate) as close_date,
      closedate as closedate_raw,
      DATE_TRUNC(CURRENT_DATE(), QUARTER) as quarter_start,
      CURRENT_DATE() as current_date
    FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    )
    AND is_won = TRUE
    AND DATE(closedate) >= DATE_TRUNC(CURRENT_DATE(), QUARTER)
    AND DATE(closedate) <= CURRENT_DATE()
    ORDER BY closedate DESC
  `;

  // Query 2: Only New Business pipeline
  const newBusinessSql = `
    SELECT
      hs_object_id,
      dealname,
      pipeline_label,
      owner_name,
      COALESCE(hs_arr, amount, 0) as arr_value,
      amount,
      hs_arr,
      DATE(closedate) as close_date
    FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    )
    AND is_won = TRUE
    AND DATE(closedate) >= DATE_TRUNC(CURRENT_DATE(), QUARTER)
    AND DATE(closedate) <= CURRENT_DATE()
    AND pipeline_label = '3PL New Business'
    ORDER BY closedate DESC
  `;

  // Query 3: Distinct pipeline labels to see what exists
  const pipelinesSql = `
    SELECT DISTINCT pipeline_label, COUNT(*) as deal_count
    FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    )
    AND is_won = TRUE
    GROUP BY pipeline_label
    ORDER BY deal_count DESC
  `;

  try {
    const [allWonRows, newBusinessRows, pipelinesRows] = await Promise.all([
      executeQuery(allWonSql),
      executeQuery(newBusinessSql),
      executeQuery(pipelinesSql)
    ]);

    // Calculate totals
    const allWonTotal = allWonRows.reduce((sum, d) => sum + (Number(d.arr_value) || 0), 0);
    const newBusinessTotal = newBusinessRows.reduce((sum, d) => sum + (Number(d.arr_value) || 0), 0);

    return {
      summary: {
        all_won_deals_q1: {
          count: allWonRows.length,
          total_arr: allWonTotal,
        },
        new_business_only: {
          count: newBusinessRows.length,
          total_arr: newBusinessTotal,
        },
        pipelines_with_won_deals: pipelinesRows.map(p => ({
          pipeline: p.pipeline_label,
          won_count: Number(p.deal_count),
        })),
      },
      all_won_deals: allWonRows.map(d => ({
        deal_id: d.hs_object_id,
        dealname: d.dealname,
        pipeline: d.pipeline_label,
        owner: d.owner_name,
        arr_value: Number(d.arr_value) || 0,
        amount: Number(d.amount) || 0,
        hs_arr: Number(d.hs_arr) || 0,
        close_date: d.close_date?.value || d.close_date,
      })),
      new_business_only: newBusinessRows.map(d => ({
        deal_id: d.hs_object_id,
        dealname: d.dealname,
        pipeline: d.pipeline_label,
        owner: d.owner_name,
        arr_value: Number(d.arr_value) || 0,
        close_date: d.close_date?.value || d.close_date,
      })),
    };
  } catch (err) {
    console.error('Error in fetchQTDWonDealsDebug:', err.message);
    throw err;
  }
}

/**
 * Debug function: Fetch Stage Transition Matrix data with details
 * Helps diagnose issues with the transition matrix
 */
async function fetchStageTransitionsDebug() {
  // Query 1: Raw transition counts by from/to stage (last 7 days)
  const transitionCountsSql = `
    SELECT
      previous_stage,
      current_stage,
      movement_type,
      COUNT(*) as transition_count,
      SUM(value_arr) as total_value,
      MIN(transition_date) as earliest_date,
      MAX(transition_date) as latest_date
    FROM \`${PROJECT}.${DATASET}.v_daily_deal_movements\`
    WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    GROUP BY previous_stage, current_stage, movement_type
    ORDER BY transition_count DESC
    LIMIT 30
  `;

  // Query 2: Sample deals for New -> Closed Lost transitions
  const newToLostSampleSql = `
    SELECT
      deal_id,
      deal_name,
      value_arr,
      previous_stage,
      current_stage,
      transition_date,
      owner_name,
      movement_type
    FROM \`${PROJECT}.${DATASET}.v_daily_deal_movements\`
    WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    AND (previous_stage IS NULL OR previous_stage = 'New')
    AND current_stage = 'Closed Lost'
    ORDER BY value_arr DESC
    LIMIT 20
  `;

  // Query 3: Total unique deals and total transitions
  const summaryStatsSql = `
    SELECT
      COUNT(DISTINCT deal_id) as unique_deals,
      COUNT(*) as total_transitions,
      SUM(value_arr) as total_value,
      MIN(transition_date) as earliest_date,
      MAX(transition_date) as latest_date
    FROM \`${PROJECT}.${DATASET}.v_daily_deal_movements\`
    WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  `;

  try {
    const [transitionCounts, newToLostSample, summaryStats] = await Promise.all([
      executeQuery(transitionCountsSql),
      executeQuery(newToLostSampleSql),
      executeQuery(summaryStatsSql),
    ]);

    return {
      summaryStats: summaryStats[0] || {},
      transitionCounts: transitionCounts.map(row => ({
        from_stage: row.previous_stage || '(NULL - New Deal)',
        to_stage: row.current_stage,
        movement_type: row.movement_type,
        count: row.transition_count,
        total_value: Number(row.total_value) || 0,
        earliest_date: row.earliest_date,
        latest_date: row.latest_date,
      })),
      newToLostSample: newToLostSample.map(row => ({
        deal_id: row.deal_id,
        deal_name: row.deal_name,
        value: Number(row.value_arr) || 0,
        previous_stage: row.previous_stage || '(NULL)',
        current_stage: row.current_stage,
        transition_date: row.transition_date,
        owner: row.owner_name,
        movement_type: row.movement_type,
      })),
      debug_info: {
        query_date_range: 'Last 7 days',
        view_name: 'v_daily_deal_movements',
      },
    };
  } catch (err) {
    console.error('Error in fetchStageTransitionsDebug:', err.message);
    throw err;
  }
}

/**
 * Fetch Deals by Stage Exit
 * Returns deals that exited at a specific stage with given exit type
 */
async function fetchDealsByStageExit(fromStage, exitType) {
  // Sanitize inputs to prevent SQL injection
  const safeExitType = (exitType || '').replace(/'/g, "''");
  const safeFromStage = (fromStage || '').replace(/'/g, "''");

  let sql;

  if (safeExitType === 'Won' || safeExitType === 'Closed Won') {
    // Get won deals
    sql = `
      SELECT
        hs_object_id as deal_id,
        dealname,
        owner_name as owner,
        COALESCE(hs_arr, amount, 0) as arr_value,
        dealstage_label as stage,
        DATE(closedate) as close_date,
        company_name
      FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
      WHERE snapshot_date = (
        SELECT MAX(snapshot_date) FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
      )
      AND pipeline_label = '3PL New Business'
      AND is_won = TRUE
      ORDER BY COALESCE(hs_arr, amount, 0) DESC
      LIMIT 50
    `;
  } else if (safeExitType === 'Lost' || safeExitType === 'Closed Lost') {
    // Get lost deals
    sql = `
      SELECT
        hs_object_id as deal_id,
        dealname,
        owner_name as owner,
        COALESCE(hs_arr, amount, 0) as arr_value,
        dealstage_label as stage,
        DATE(closedate) as close_date,
        company_name
      FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
      WHERE snapshot_date = (
        SELECT MAX(snapshot_date) FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
      )
      AND pipeline_label = '3PL New Business'
      AND is_lost = TRUE
      ORDER BY COALESCE(hs_arr, amount, 0) DESC
      LIMIT 50
    `;
  } else if (safeExitType === 'Moved' && safeFromStage) {
    // For "Moved" exit type - find deals that were in the fromStage in a previous snapshot
    // but are now in a different stage (progressed forward)
    sql = `
      WITH latest_snapshot AS (
        SELECT MAX(snapshot_date) as max_date
        FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
      ),
      previous_snapshot AS (
        SELECT MAX(snapshot_date) as prev_date
        FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
        WHERE snapshot_date < (SELECT max_date FROM latest_snapshot)
      ),
      moved_deals AS (
        SELECT
          curr.hs_object_id,
          curr.dealname,
          curr.owner_name,
          COALESCE(curr.hs_arr, curr.amount, 0) as arr_value,
          prev.dealstage_label as from_stage,
          curr.dealstage_label as to_stage,
          curr.company_name
        FROM \`${PROJECT}.${DATASET}.deals_snapshots\` curr
        JOIN \`${PROJECT}.${DATASET}.deals_snapshots\` prev
          ON curr.hs_object_id = prev.hs_object_id
        WHERE curr.snapshot_date = (SELECT max_date FROM latest_snapshot)
          AND prev.snapshot_date = (SELECT prev_date FROM previous_snapshot)
          AND curr.pipeline_label = '3PL New Business'
          AND prev.dealstage_label = '${safeFromStage}'
          AND curr.dealstage_label != prev.dealstage_label
          AND curr.is_open = TRUE
      )
      SELECT
        hs_object_id as deal_id,
        dealname,
        owner_name as owner,
        arr_value,
        to_stage as stage,
        from_stage,
        company_name
      FROM moved_deals
      ORDER BY arr_value DESC
      LIMIT 50
    `;
  } else {
    // Unknown exit type
    return [];
  }

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      deal_id: row.deal_id,
      dealname: row.dealname || 'Unnamed Deal',
      owner: row.owner || 'Unassigned',
      arr_value: Number(row.arr_value) || 0,
      stage: row.stage || 'Unknown',
      close_date: row.close_date?.value || row.close_date,
      company_name: row.company_name || '',
      hubspot_url: row.deal_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.deal_id}` : null,
    }));
  } catch (err) {
    console.error('Error fetching deals by stage exit:', err.message);
    return [];
  }
}

/**
 * Fetch Period Won Deals (last 30 days or current quarter)
 * Returns list of won deals with owner and deal size
 */
async function fetchPeriodWonDeals() {
  const sql = `
    SELECT
      hs_object_id as deal_id,
      dealname,
      owner_name as owner,
      COALESCE(hs_arr, amount, 0) as arr_value,
      DATE(closedate) as close_date
    FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM \`${PROJECT}.${DATASET}.deals_snapshots\`
    )
    AND is_won = TRUE
    AND DATE(closedate) >= DATE_TRUNC(CURRENT_DATE(), QUARTER)
    AND DATE(closedate) <= CURRENT_DATE()
    AND pipeline_label = '3PL New Business'
    ORDER BY closedate DESC
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      deal_id: row.deal_id,
      dealname: row.dealname || 'Unnamed Deal',
      owner: row.owner || 'Unassigned',
      arr_value: Number(row.arr_value) || 0,
      close_date: row.close_date?.value || row.close_date,
    }));
  } catch (err) {
    console.error('Error fetching period won deals:', err.message);
    return [];
  }
}

/**
 * Fetch unique owner names for dropdown
 */
async function fetchOwners() {
  const sql = `
    SELECT DISTINCT owner_name
    FROM \`${PROJECT}.${DATASET}.v_deals_at_risk\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM \`${PROJECT}.${DATASET}.v_deals_at_risk\`
    )
    AND owner_name IS NOT NULL
    AND owner_name != ''
    ORDER BY owner_name
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => row.owner_name);
  } catch (err) {
    console.error('Error fetching owners:', err.message);
    return [];
  }
}

/**
 * Process AI Natural Language Query
 * Uses current dashboard context to answer questions
 */
async function processAIQuery(query, context) {
  try {
    // Safely extract context values with defaults
    const ctx = context || {};
    const kpis = ctx.kpis || {};
    const forecast = ctx.forecastAnalysis || {};
    const dealsAtRisk = Array.isArray(ctx.dealsAtRisk) ? ctx.dealsAtRisk : [];

    // Safe value extraction
    const totalPipeline = Number(kpis.total_pipeline_value) || 0;
    const weightedPipeline = Number(kpis.weighted_pipeline_value) || 0;
    const totalDeals = Number(kpis.total_deals_count) || 0;
    const atRiskDealsCount = Number(kpis.at_risk_deals_count) || 0;
    const pctAtRisk = Number(kpis.pct_deals_at_risk) || 0;
    const winRate = Number(kpis.win_rate_pct) || 0;
    const avgCycleDays = Number(kpis.avg_sales_cycle_days) || 0;
    const quarterlyTarget = Number(forecast.quarterly_target) || 0;
    const forecastedRevenue = Number(forecast.forecasted_revenue) || 0;
    const gapToGoal = Number(forecast.gap_to_goal) || 0;
    const confidenceScore = Number(forecast.confidence_score) || 0;

    // Safe array operations
    const atRiskDeals = dealsAtRisk.filter(d => d && d.is_at_risk);
    const stalledDeals = dealsAtRisk.filter(d => d && d.is_stalled);
    const ghostedDeals = dealsAtRisk.filter(d => d && d.is_ghosted);
    const atRiskValue = atRiskDeals.reduce((sum, d) => sum + (Number(d.arr_value) || 0), 0);

    // Build context summary for AI
    const contextSummary = `
Current Pipeline Status:
- Total Pipeline Value: $${totalPipeline.toLocaleString()}
- Weighted Pipeline Value: $${weightedPipeline.toLocaleString()}
- Total Open Deals: ${totalDeals}
- Deals at Risk: ${atRiskDealsCount} (${pctAtRisk}%)
- Win Rate: ${winRate}%
- Avg Sales Cycle: ${avgCycleDays} days

Forecast Analysis:
- Quarterly Target: $${quarterlyTarget.toLocaleString()}
- Forecasted Revenue: $${forecastedRevenue.toLocaleString()}
- Gap to Goal: $${gapToGoal.toLocaleString()}
- Confidence Score: ${confidenceScore}%

Risk Summary:
- At-Risk Deals: ${atRiskDeals.length}
- Stalled Deals: ${stalledDeals.length}
- Ghosted Deals: ${ghostedDeals.length}
- Total At-Risk Value: $${atRiskValue.toLocaleString()}
`;

    let insight = '';

    if (query.toLowerCase().includes('on track') || query.toLowerCase().includes('goal') || query.toLowerCase().includes('target')) {
      if (gapToGoal > 0) {
        insight = `Based on current data, you are $${Math.abs(gapToGoal).toLocaleString()} behind your quarterly target. `;
        insight += `With ${atRiskDeals.length} deals at risk and a ${winRate}% win rate, you'll need to accelerate pipeline conversion. `;
        insight += `Focus on the ${atRiskDeals.length} at-risk deals totaling $${atRiskValue.toLocaleString()} in potential ARR.`;
      } else {
        insight = `You're on track to meet your quarterly target with a projected surplus of $${Math.abs(gapToGoal).toLocaleString()}. `;
        insight += `Maintain focus on the ${atRiskDeals.length} at-risk deals to protect this position.`;
      }
    } else if (query.toLowerCase().includes('risk') || query.toLowerCase().includes('at risk')) {
      insight = `You have ${atRiskDeals.length} deals at risk. `;
      if (stalledDeals.length > 0) {
        insight += `${stalledDeals.length} deals are stalled (no stage movement). `;
      }
      if (ghostedDeals.length > 0) {
        insight += `${ghostedDeals.length} deals show no recent activity (ghosted). `;
      }
      insight += `Total at-risk value: $${atRiskValue.toLocaleString()}.`;
    } else {
      insight = `Pipeline Summary: $${totalPipeline.toLocaleString()} total pipeline with ${totalDeals} deals. `;
      insight += `${atRiskDeals.length} deals (${pctAtRisk}%) are at risk. `;
      insight += `Current win rate: ${winRate}%. Ask about specific areas for more details.`;
    }

    return {
      query,
      insight,
      context_summary: contextSummary,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error in processAIQuery:', err);
    // Return a fallback response instead of throwing
    return {
      query,
      insight: 'I was unable to fully analyze your pipeline data. Please try rephrasing your question or ask about specific metrics like "deals at risk" or "win rate".',
      context_summary: 'Context analysis unavailable',
      generated_at: new Date().toISOString(),
    };
  }
}

// ============================================================================
// RevOps Strategic Layer Functions
// ============================================================================

/**
 * Fetch Pipeline Quality Trend (3-line chart data)
 * Source: v_pipeline_quality_trend
 * Returns ALL available weeks of Total, Weighted, Committed pipeline with status badge
 */
async function fetchPipelineQualityTrend(days = 30) {
  const sql = `
    SELECT
      snapshot_date,
      gross_pipeline,
      weighted_pipeline,
      committed_pipeline,
      stalled_count,
      total_deals,
      stalled_pct,
      day_over_day_change,
      status_badge
    FROM \`${PROJECT}.${DATASET}.v_pipeline_quality_trend\`
    WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${parseInt(days)} DAY)
    ORDER BY snapshot_date ASC
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      snapshot_date: row.snapshot_date?.value || row.snapshot_date,
      gross_pipeline: Number(row.gross_pipeline) || 0,
      weighted_pipeline: Number(row.weighted_pipeline) || 0,
      committed_pipeline: Number(row.committed_pipeline) || 0,
      stalled_count: Number(row.stalled_count) || 0,
      total_deals: Number(row.total_deals) || 0,
      stalled_pct: Number(row.stalled_pct) || 0,
      day_over_day_change: Number(row.day_over_day_change) || 0,
      status_badge: row.status_badge || 'YELLOW',
    }));
  } catch (err) {
    console.error('Error fetching pipeline quality trend:', err.message);
    return [];
  }
}

/**
 * Fetch Pace-to-Goal Metrics
 * Source: v_pace_to_goal
 * Returns Q1 ARR progress toward $1.6M target with linear pace tracking
 */
async function fetchPaceToGoal() {
  const sql = `
    SELECT *
    FROM \`${PROJECT}.${DATASET}.v_pace_to_goal\`
    LIMIT 1
  `;

  try {
    const rows = await executeQuery(sql);
    if (rows.length === 0) {
      return {
        quarter_start: null,
        quarter_end: null,
        days_elapsed: 0,
        days_remaining: 0,
        total_quarter_days: 90,
        starting_arr: 0,
        starting_deal_count: 0,
        lifetime_arr: 0,
        lifetime_won_count: 0,
        qtd_won_value: 0,
        qtd_won_count: 0,
        quarterly_target: 1600000,
        remaining_to_target: 1600000,
        deals_needed: 40,
        deals_still_needed: 40,
        progress_pct: 0,
        time_elapsed_pct: 0,
        expected_by_now: 0,
        gap_vs_expected: 0,
        pace_status: 'BEHIND',
        current_pace_monthly: 0,
        required_pace_monthly: 0,
        pace_delta_monthly: 0,
      };
    }

    const row = rows[0];
    return {
      quarter_start: row.quarter_start?.value || row.quarter_start,
      quarter_end: row.quarter_end?.value || row.quarter_end,
      days_elapsed: Number(row.days_elapsed) || 0,
      days_remaining: Number(row.days_remaining) || 0,
      total_quarter_days: Number(row.total_quarter_days) || 90,
      // New fields for Pace to Goal
      starting_arr: Number(row.starting_arr) || 0,
      starting_deal_count: Number(row.starting_deal_count) || 0,
      lifetime_arr: Number(row.lifetime_arr) || 0,
      lifetime_won_count: Number(row.lifetime_won_count) || 0,
      qtd_won_value: Number(row.qtd_won_value) || 0,
      qtd_won_count: Number(row.qtd_won_count) || 0,
      quarterly_target: Number(row.quarterly_target) || 1600000,
      remaining_to_target: Number(row.remaining_to_target) || 1600000,
      deals_needed: Number(row.deals_needed) || 0,
      deals_still_needed: Number(row.deals_still_needed) || 0,
      progress_pct: Number(row.progress_pct) || 0,
      time_elapsed_pct: Number(row.time_elapsed_pct) || 0,
      expected_by_now: Number(row.expected_by_now) || 0,
      gap_vs_expected: Number(row.gap_vs_expected) || 0,
      pace_status: row.pace_status || 'BEHIND',
      // Pace calculations (monthly rates)
      current_pace_monthly: Number(row.current_pace_monthly) || 0,
      required_pace_monthly: Number(row.required_pace_monthly) || 0,
      pace_delta_monthly: Number(row.pace_delta_monthly) || 0,
    };
  } catch (err) {
    console.error('Error fetching pace to goal:', err.message);
    return null;
  }
}

/**
 * Fetch Stage Slippage Analysis
 * Source: v_stage_slippage_analysis
 * Returns stage-by-stage slippage metrics
 */
async function fetchStageSlippageAnalysis() {
  const sql = `
    SELECT
      stage_name,
      current_avg_days,
      median_target_days,
      slipping_deal_count,
      slipping_value,
      total_deals,
      slipping_pct,
      top_slipping_deals
    FROM \`${PROJECT}.${DATASET}.v_stage_slippage_analysis\`
    ORDER BY slipping_value DESC
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      stage_name: row.stage_name,
      current_avg_days: Number(row.current_avg_days) || 0,
      median_target_days: Number(row.median_target_days) || 14,
      slipping_deal_count: Number(row.slipping_deal_count) || 0,
      slipping_value: Number(row.slipping_value) || 0,
      total_deals: Number(row.total_deals) || 0,
      slipping_pct: Number(row.slipping_pct) || 0,
      top_slipping_deals: row.top_slipping_deals || [],
    }));
  } catch (err) {
    console.error('Error fetching stage slippage analysis:', err.message);
    return [];
  }
}

/**
 * Fetch Contact Health data
 * Source: v_contact_health
 * Returns deals with health status (RED/YELLOW/GREEN)
 */
async function fetchContactHealth() {
  const sql = `
    SELECT
      deal_id,
      dealname,
      owner_name,
      arr_value,
      dealstage_label,
      contact_count,
      days_since_activity,
      ae_email_count,
      ae_meeting_count,
      has_exec_sponsor,
      health_status,
      health_score
    FROM \`${PROJECT}.${DATASET}.v_contact_health\`
    ORDER BY
      CASE health_status WHEN 'RED' THEN 1 WHEN 'YELLOW' THEN 2 ELSE 3 END,
      arr_value DESC
    LIMIT 100
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      deal_id: row.deal_id,
      dealname: row.dealname,
      owner_name: row.owner_name,
      arr_value: Number(row.arr_value) || 0,
      dealstage_label: row.dealstage_label,
      contact_count: Number(row.contact_count) || 0,
      days_since_activity: Number(row.days_since_activity) || 0,
      ae_email_count: Number(row.ae_email_count) || 0,
      ae_meeting_count: Number(row.ae_meeting_count) || 0,
      has_exec_sponsor: row.has_exec_sponsor || false,
      health_status: row.health_status || 'YELLOW',
      health_score: Number(row.health_score) || 0,
      hubspot_url: row.deal_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.deal_id}` : null,
    }));
  } catch (err) {
    console.error('Error fetching contact health:', err.message);
    return [];
  }
}

/**
 * Fetch Zombie Deals
 * Source: v_zombie_deals
 * Returns deals that should be excluded from main pipeline
 */
async function fetchZombieDeals() {
  const sql = `
    SELECT
      deal_id,
      dealname,
      owner_name,
      arr_value,
      dealstage_label,
      days_since_creation,
      days_since_activity,
      days_in_current_stage,
      median_sales_cycle,
      zombie_reason,
      is_zombie
    FROM \`${PROJECT}.${DATASET}.v_zombie_deals\`
    ORDER BY arr_value DESC
    LIMIT 50
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      deal_id: row.deal_id,
      dealname: row.dealname,
      owner_name: row.owner_name,
      arr_value: Number(row.arr_value) || 0,
      dealstage_label: row.dealstage_label,
      days_since_creation: Number(row.days_since_creation) || 0,
      days_since_activity: Number(row.days_since_activity) || 0,
      days_in_current_stage: Number(row.days_in_current_stage) || 0,
      median_sales_cycle: Number(row.median_sales_cycle) || 45,
      zombie_reason: row.zombie_reason,
      is_zombie: row.is_zombie || false,
      hubspot_url: row.deal_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.deal_id}` : null,
    }));
  } catch (err) {
    console.error('Error fetching zombie deals:', err.message);
    return [];
  }
}

/**
 * Fetch Deal Focus Scores
 * Source: v_deal_focus_score
 * Returns deals with 0-100 prioritization scores
 */
async function fetchDealFocusScores() {
  const sql = `
    SELECT
      deal_id,
      dealname,
      owner_name,
      arr_value,
      dealstage_label,
      days_in_current_stage,
      days_since_activity,
      contact_count,
      stage_age_score,
      engagement_score,
      threading_score,
      size_score,
      focus_score
    FROM \`${PROJECT}.${DATASET}.v_deal_focus_score\`
    ORDER BY focus_score DESC
    LIMIT 100
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      deal_id: row.deal_id,
      dealname: row.dealname,
      owner_name: row.owner_name,
      arr_value: Number(row.arr_value) || 0,
      dealstage_label: row.dealstage_label,
      days_in_current_stage: Number(row.days_in_current_stage) || 0,
      days_since_activity: Number(row.days_since_activity) || 0,
      contact_count: Number(row.contact_count) || 0,
      stage_age_score: Number(row.stage_age_score) || 0,
      engagement_score: Number(row.engagement_score) || 0,
      threading_score: Number(row.threading_score) || 0,
      size_score: Number(row.size_score) || 0,
      focus_score: Number(row.focus_score) || 0,
      hubspot_url: row.deal_id ? `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID || '0'}/deal/${row.deal_id}` : null,
    }));
  } catch (err) {
    console.error('Error fetching deal focus scores:', err.message);
    return [];
  }
}

/**
 * Fetch Rep Focus View
 * Source: v_rep_focus_view
 * Returns per-rep focus dashboard with top 5 at-risk deals
 */
async function fetchRepFocusView(owner = null) {
  let sql = `
    SELECT
      owner_name,
      deals_needing_attention,
      total_at_risk_arr,
      weekly_won_value,
      weekly_target,
      weekly_revenue_gap,
      top_5_at_risk_deals
    FROM \`${PROJECT}.${DATASET}.v_rep_focus_view\`
  `;

  if (owner) {
    sql += ` WHERE owner_name = '${owner.replace(/'/g, "''")}'`;
  }

  sql += ` ORDER BY total_at_risk_arr DESC`;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      owner_name: row.owner_name,
      deals_needing_attention: Number(row.deals_needing_attention) || 0,
      total_at_risk_arr: Number(row.total_at_risk_arr) || 0,
      weekly_won_value: Number(row.weekly_won_value) || 0,
      weekly_target: Number(row.weekly_target) || 20500,
      weekly_revenue_gap: Number(row.weekly_revenue_gap) || 0,
      top_5_at_risk_deals: row.top_5_at_risk_deals || [],
    }));
  } catch (err) {
    console.error('Error fetching rep focus view:', err.message);
    return [];
  }
}

/**
 * Fetch Leaderboard with Time Travel
 * Source: v_leaderboard_time_travel
 * Returns leaderboard data for specified period (7d, 30d, qtd)
 */
async function fetchLeaderboardTimeTravel(period = '7d', sortBy = 'net_pipeline') {
  const validPeriods = ['7d', '30d', 'qtd'];
  const safePeriod = validPeriods.includes(period) ? period : '7d';

  const sortColumn = {
    'net_pipeline': 'net_pipeline_added',
    'stage_movements': 'stage_movements_count',
    'engagement_score': 'engagement_score',
  }[sortBy] || 'net_pipeline_added';

  const sql = `
    SELECT
      period,
      owner_name,
      net_pipeline_added,
      won_value,
      won_count,
      stage_movements_count,
      engagement_score,
      rank_by_pipeline,
      rank_by_movements,
      rank_by_engagement
    FROM \`${PROJECT}.${DATASET}.v_leaderboard_time_travel\`
    WHERE period = '${safePeriod}'
    ORDER BY ${sortColumn} DESC
  `;

  try {
    const rows = await executeQuery(sql);
    return rows.map(row => ({
      period: row.period,
      owner_name: row.owner_name,
      net_pipeline_added: Number(row.net_pipeline_added) || 0,
      won_value: Number(row.won_value) || 0,
      won_count: Number(row.won_count) || 0,
      stage_movements_count: Number(row.stage_movements_count) || 0,
      engagement_score: Number(row.engagement_score) || 0,
      rank_by_pipeline: Number(row.rank_by_pipeline) || 0,
      rank_by_movements: Number(row.rank_by_movements) || 0,
      rank_by_engagement: Number(row.rank_by_engagement) || 0,
    }));
  } catch (err) {
    console.error('Error fetching leaderboard time travel:', err.message);
    return [];
  }
}

/**
 * Fetch Marketing Efficiency Data (Google Ads ROI)
 * Source: v_marketing_roi_unified
 * Combines Google Ads spend with HubSpot deal revenue
 */
async function fetchMarketingEfficiency() {
  const sql = `
    SELECT
      campaign_id,
      campaign_name,
      campaign_status,
      total_spend,
      total_clicks,
      total_impressions,
      total_conversions,
      ctr_pct,
      cpc,
      spend_start_date,
      spend_end_date,
      attributed_deals,
      won_deals,
      arr_generated,
      pipeline_value,
      roas,
      cost_per_acquisition,
      cost_per_lead,
      campaign_roi_status
    FROM \`${PROJECT}.${DATASET}.v_marketing_roi_unified\`
    ORDER BY total_spend DESC
  `;

  try {
    const rows = await executeQuery(sql);

    // Aggregate totals
    let totalSpend = 0;
    let totalPipelineValue = 0;
    let totalARR = 0;
    let totalDeals = 0;
    let totalWonDeals = 0;

    const campaigns = rows.map(row => {
      totalSpend += Number(row.total_spend) || 0;
      totalPipelineValue += Number(row.pipeline_value) || 0;
      totalARR += Number(row.arr_generated) || 0;
      totalDeals += Number(row.attributed_deals) || 0;
      totalWonDeals += Number(row.won_deals) || 0;

      return {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name || 'Unknown Campaign',
        campaign_status: row.campaign_status,
        total_spend: Number(row.total_spend) || 0,
        total_clicks: Number(row.total_clicks) || 0,
        total_impressions: Number(row.total_impressions) || 0,
        total_conversions: Number(row.total_conversions) || 0,
        ctr_pct: Number(row.ctr_pct) || 0,
        cpc: Number(row.cpc) || 0,
        spend_start_date: row.spend_start_date,
        spend_end_date: row.spend_end_date,
        attributed_deals: Number(row.attributed_deals) || 0,
        won_deals: Number(row.won_deals) || 0,
        arr_generated: Number(row.arr_generated) || 0,
        pipeline_value: Number(row.pipeline_value) || 0,
        roas: Number(row.roas) || 0,
        cost_per_acquisition: Number(row.cost_per_acquisition) || 0,
        cost_per_lead: Number(row.cost_per_lead) || 0,
        campaign_roi_status: row.campaign_roi_status,
      };
    });

    // Calculate overall CPA
    const overallCPA = totalWonDeals > 0 ? totalSpend / totalWonDeals : null;
    const overallCPL = totalDeals > 0 ? totalSpend / totalDeals : null;
    const overallROAS = totalSpend > 0 ? totalARR / totalSpend : 0;

    return {
      summary: {
        total_spend: totalSpend,
        total_pipeline_value: totalPipelineValue,
        total_arr_generated: totalARR,
        total_attributed_deals: totalDeals,
        total_won_deals: totalWonDeals,
        overall_cpa: overallCPA,
        overall_cpl: overallCPL,
        overall_roas: overallROAS,
        campaign_count: campaigns.length,
        has_spend: totalSpend > 0,
        has_attribution: totalDeals > 0,
      },
      campaigns,
    };
  } catch (err) {
    console.error('Error fetching marketing efficiency:', err.message);
    // Return empty structure with has_data false
    return {
      summary: {
        total_spend: 0,
        total_pipeline_value: 0,
        total_arr_generated: 0,
        total_attributed_deals: 0,
        total_won_deals: 0,
        overall_cpa: null,
        overall_cpl: null,
        overall_roas: 0,
        campaign_count: 0,
        has_spend: false,
        has_attribution: false,
      },
      campaigns: [],
    };
  }
}

/**
 * Fetch all dashboard data in batched parallel groups
 * Batches queries in groups of 5 to prevent overwhelming BigQuery
 * and provide better error isolation
 */
async function fetchAllDashboardData() {
  // Check cache first
  const cached = getCached('dashboard');
  if (cached) {
    return cached;
  }

  const startTime = Date.now();
  console.log('[fetchAllDashboardData] Starting batched data fetch...');

  // Define fetch functions with their fallback values
  const fetchConfig = [
    // Batch 1: Critical KPIs, Pace and summary data
    { name: 'kpis', fn: fetchCEODashboard, fallback: null },
    { name: 'aiSummary', fn: fetchAIExecutiveSummary, fallback: {
      executive_insight: 'AI summary is currently unavailable. The system is analyzing your pipeline data.',
      generated_at: new Date().toISOString(),
      model_version: 'gemini-1.5-pro',
      confidence_score: null,
    }},
    { name: 'paceToGoal', fn: fetchPaceToGoal, fallback: null },
    { name: 'pipelineQualityTrend', fn: () => fetchPipelineQualityTrend(30), fallback: [] },
    { name: 'forecastAnalysis', fn: fetchForecastAnalysis, fallback: null },

    // Batch 2: Risk and deal data
    { name: 'dealsAtRisk', fn: fetchDealsAtRisk, fallback: [] },
    { name: 'pendingRebook', fn: fetchPendingRebook, fallback: [] },
    { name: 'dailyDealMovements', fn: fetchDailyDealMovements, fallback: [] },
    { name: 'dealVelocity', fn: fetchDealVelocity, fallback: {} },
    { name: 'periodWonDeals', fn: fetchPeriodWonDeals, fallback: [] },

    // Batch 3: Leaderboards and performance
    { name: 'ownerLeaderboard', fn: fetchOwnerLeaderboard, fallback: [] },
    { name: 'sdrLeaderboard', fn: fetchSDRLeaderboard, fallback: [] },
    { name: 'sdrMeetingOutcomes', fn: fetchSDRMeetingOutcomes, fallback: [] },
    { name: 'repRamp', fn: fetchRepRampChart, fallback: [] },
    { name: 'winRateAnalysis', fn: fetchWinRateAnalysis, fallback: [] },

    // Batch 4: Analysis and metrics
    { name: 'multiThreading', fn: fetchMultiThreading, fallback: [] },
    { name: 'stageLeakage', fn: fetchStageLeakage, fallback: [] },
    { name: 'closeDateSlippage', fn: fetchCloseDateSlippage, fallback: [] },
    { name: 'salesVelocity', fn: fetchSalesVelocity, fallback: [] },
    { name: 'nextStepCoverage', fn: fetchNextStepCoverage, fallback: [] },

    // Batch 5: Additional data
    { name: 'pipelineTrend', fn: fetchPipelineTrend, fallback: [] },
    { name: 'owners', fn: fetchOwners, fallback: [] },

    // Batch 6: Marketing Efficiency (Google Ads ROI)
    { name: 'marketingEfficiency', fn: fetchMarketingEfficiency, fallback: {
      summary: { total_spend: 0, total_pipeline_value: 0, has_spend: false, has_attribution: false },
      campaigns: [],
    }},
  ];

  const results = {};

  // Run ALL queries in parallel for maximum speed
  console.log(`[fetchAllDashboardData] Running ${fetchConfig.length} queries in parallel...`);

  const allResults = await Promise.all(
    fetchConfig.map(async ({ name, fn, fallback }) => {
      const queryStart = Date.now();
      try {
        const data = await fn();
        console.log(`[fetchAllDashboardData] ${name} completed in ${Date.now() - queryStart}ms`);
        return { name, data };
      } catch (err) {
        console.error(`[fetchAllDashboardData] Error fetching ${name}:`, err.message);
        return { name, data: fallback };
      }
    })
  );

  // Collect all results
  for (const { name, data } of allResults) {
    results[name] = data;
  }

  const totalTime = Date.now() - startTime;
  console.log(`[fetchAllDashboardData] All batches completed in ${totalTime}ms`);

  const result = {
    ...results,
    fetchedAt: new Date().toISOString(),
  };

  // Cache the result
  setCache('dashboard', result);

  return result;
}

/**
 * Fetch CRITICAL data first (Pace layer) - for instant UI render
 * This is the minimum data needed to show something meaningful
 */
async function fetchCriticalData() {
  // Check cache first
  const cached = getCached('critical');
  if (cached) {
    return cached;
  }

  const startTime = Date.now();
  console.log('[fetchCriticalData] Fetching critical pace data...');

  // Fetch only the most important data in parallel
  const [kpis, paceToGoal, pipelineQualityTrend, aiSummary, forecastAnalysis] = await Promise.all([
    fetchCEODashboard().catch(() => null),
    fetchPaceToGoal().catch(() => null),
    fetchPipelineQualityTrend(30).catch(() => []),
    fetchAIExecutiveSummary().catch(() => ({
      executive_insight: 'Loading insights...',
      generated_at: new Date().toISOString(),
    })),
    fetchForecastAnalysis().catch(() => null),
  ]);

  const result = {
    kpis,
    paceToGoal,
    pipelineQualityTrend,
    aiSummary,
    forecastAnalysis,
    fetchedAt: new Date().toISOString(),
  };

  console.log(`[fetchCriticalData] Completed in ${Date.now() - startTime}ms`);
  setCache('critical', result);

  return result;
}

/**
 * Fetch SECONDARY data (everything else) - lazy loaded after critical
 */
async function fetchSecondaryData() {
  // Check cache first
  const cached = getCached('secondary');
  if (cached) {
    return cached;
  }

  const startTime = Date.now();
  console.log('[fetchSecondaryData] Fetching secondary data...');

  const fetchConfig = [
    { name: 'dealsAtRisk', fn: fetchDealsAtRisk, fallback: [] },
    { name: 'pendingRebook', fn: fetchPendingRebook, fallback: [] },
    { name: 'dailyDealMovements', fn: fetchDailyDealMovements, fallback: [] },
    { name: 'dealVelocity', fn: fetchDealVelocity, fallback: {} },
    { name: 'periodWonDeals', fn: fetchPeriodWonDeals, fallback: [] },
    { name: 'ownerLeaderboard', fn: fetchOwnerLeaderboard, fallback: [] },
    { name: 'sdrLeaderboard', fn: fetchSDRLeaderboard, fallback: [] },
    { name: 'sdrMeetingOutcomes', fn: fetchSDRMeetingOutcomes, fallback: [] },
    { name: 'repRamp', fn: fetchRepRampChart, fallback: [] },
    { name: 'winRateAnalysis', fn: fetchWinRateAnalysis, fallback: [] },
    { name: 'multiThreading', fn: fetchMultiThreading, fallback: [] },
    { name: 'stageLeakage', fn: fetchStageLeakage, fallback: [] },
    { name: 'closeDateSlippage', fn: fetchCloseDateSlippage, fallback: [] },
    { name: 'salesVelocity', fn: fetchSalesVelocity, fallback: [] },
    { name: 'nextStepCoverage', fn: fetchNextStepCoverage, fallback: [] },
    { name: 'pipelineTrend', fn: fetchPipelineTrend, fallback: [] },
    { name: 'owners', fn: fetchOwners, fallback: [] },
  ];

  const results = {};
  const allResults = await Promise.all(
    fetchConfig.map(async ({ name, fn, fallback }) => {
      try {
        const data = await fn();
        return { name, data };
      } catch (err) {
        console.error(`[fetchSecondaryData] Error fetching ${name}:`, err.message);
        return { name, data: fallback };
      }
    })
  );

  for (const { name, data } of allResults) {
    results[name] = data;
  }

  const result = {
    ...results,
    fetchedAt: new Date().toISOString(),
  };

  console.log(`[fetchSecondaryData] Completed in ${Date.now() - startTime}ms`);
  setCache('secondary', result);

  return result;
}

module.exports = {
  fetchCEODashboard,
  fetchAIExecutiveSummary,
  fetchDealsAtRisk,
  fetchPendingRebook,
  fetchRepRampChart,
  fetchMultiThreading,
  fetchForecastAnalysis,
  fetchStageLeakage,
  fetchCloseDateSlippage,
  fetchSalesVelocity,
  fetchWinRateAnalysis,
  fetchNextStepCoverage,
  fetchRecentClosedDeals,
  fetchOwners,
  fetchOwnerLeaderboard,
  fetchSDRLeaderboard,
  fetchSDRMeetingOutcomes,
  fetchSDRAvailableWeeks,
  fetchSDRDeals,
  fetchPipelineTrend,
  fetchDailyDealMovements,
  fetchDealVelocity,
  processAIQuery,
  fetchAllDashboardData,
  fetchCriticalData,
  fetchSecondaryData,
  fetchQTDWonDealsDebug,
  fetchPeriodWonDeals,
  fetchDealsByStageExit,
  fetchStageTransitionsDebug,
  // RevOps Strategic Layer
  fetchPipelineQualityTrend,
  fetchPaceToGoal,
  fetchStageSlippageAnalysis,
  fetchContactHealth,
  fetchZombieDeals,
  fetchDealFocusScores,
  fetchRepFocusView,
  fetchLeaderboardTimeTravel,
  fetchMarketingEfficiency,
};
