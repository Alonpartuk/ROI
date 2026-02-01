-- ============================================================================
-- HubSpot CEO Metrics Suite - AI Executive Summary Engine
-- Powered by Gemini 1.5 Pro via BigQuery ML
-- ============================================================================
-- Prerequisites:
--   - BigQuery Connection: gemini_insight_conn (Vertex AI Remote Connection)
--   - Existing Views: v_pipeline_trend, v_deal_aging, v_multi_threading, v_owner_leaderboard
-- ============================================================================

-- ============================================================================
-- TASK 1: Remote Model Initialization
-- Creates a BigQuery ML model connected to Gemini 1.5 Pro
-- ============================================================================

CREATE OR REPLACE MODEL `octup-testing.hubspot_data.gemini_insight_model`
REMOTE WITH CONNECTION `octup-testing.us.gemini_insight_conn`
OPTIONS (
  endpoint = 'gemini-1.5-pro'
);

-- ============================================================================
-- TASK 2 & 3: The "Summary Engine" View (v_ai_executive_summary)
-- Aggregates KPIs, constructs dynamic prompt, calls Gemini, handles errors
-- ============================================================================

CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_ai_executive_summary` AS
WITH
-- Aggregate pipeline metrics from v_pipeline_trend
pipeline_metrics AS (
  SELECT
    COALESCE(SUM(total_pipeline_value), 0) AS total_pipeline_value,
    COALESCE(SUM(weighted_pipeline_value), 0) AS weighted_value,
    COALESCE(SUM(open_deals), 0) AS total_open_deals,
    COALESCE(SUM(deals_won_this_period), 0) AS deals_won,
    COALESCE(SUM(deals_lost_this_period), 0) AS deals_lost
  FROM `octup-testing.hubspot_data.v_pipeline_trend`
  WHERE snapshot_date = CURRENT_DATE()
),

-- Get deals at risk from v_deal_aging (Red status = at risk)
risk_metrics AS (
  SELECT
    COALESCE(COUNTIF(deal_age_status = 'Red'), 0) AS count_at_risk,
    COALESCE(COUNTIF(deal_age_status = 'Yellow'), 0) AS count_warning,
    COALESCE(COUNTIF(deal_age_status = 'Green'), 0) AS count_healthy,
    COALESCE(SUM(CASE WHEN deal_age_status = 'Red' THEN amount ELSE 0 END), 0) AS value_at_risk
  FROM `octup-testing.hubspot_data.v_deal_aging`
  WHERE snapshot_date = CURRENT_DATE()
),

-- Get win rate from v_owner_leaderboard
performance_metrics AS (
  SELECT
    COALESCE(AVG(win_rate_pct), 0) AS avg_win_rate,
    COALESCE(SUM(total_won_value), 0) AS total_won_value,
    COALESCE(SUM(total_open_deals), 0) AS total_open_by_owner
  FROM `octup-testing.hubspot_data.v_owner_leaderboard`
  WHERE snapshot_date = CURRENT_DATE()
),

-- Get multi-threading health
threading_metrics AS (
  SELECT
    COALESCE(SUM(CASE WHEN threading_level = 'No Contacts (Risk)' THEN deal_count ELSE 0 END), 0) AS no_contact_deals,
    COALESCE(SUM(CASE WHEN threading_level IN ('4+ Contacts (Strong)', '2-3 Contacts (Good)') THEN deal_count ELSE 0 END), 0) AS well_threaded_deals,
    COALESCE(SUM(deal_count), 0) AS total_deals_threading
  FROM `octup-testing.hubspot_data.v_multi_threading`
  WHERE snapshot_date = CURRENT_DATE()
),

-- Combine all metrics and build the prompt
combined_metrics AS (
  SELECT
    p.total_pipeline_value,
    p.weighted_value,
    p.total_open_deals,
    p.deals_won,
    p.deals_lost,
    r.count_at_risk,
    r.count_warning,
    r.value_at_risk,
    perf.avg_win_rate,
    perf.total_won_value,
    t.no_contact_deals,
    t.well_threaded_deals,
    -- Calculate additional insights
    ROUND(SAFE_DIVIDE(p.weighted_value, p.total_pipeline_value) * 100, 1) AS weighted_confidence_pct,
    ROUND(SAFE_DIVIDE(t.well_threaded_deals, t.total_deals_threading) * 100, 1) AS threading_health_pct
  FROM pipeline_metrics p
  CROSS JOIN risk_metrics r
  CROSS JOIN performance_metrics perf
  CROSS JOIN threading_metrics t
),

-- Construct the dynamic prompt
prompt_builder AS (
  SELECT
    CONCAT(
      'You are a Strategic Sales Analyst providing insights to a CEO. ',
      'Analyze the following sales pipeline data and provide actionable insights.\n\n',
      '## Current Pipeline Data (as of ', CAST(CURRENT_DATE() AS STRING), '):\n',
      '- **Total Pipeline Value:** $', FORMAT('%,.0f', total_pipeline_value), '\n',
      '- **Weighted Pipeline Value:** $', FORMAT('%,.0f', weighted_value),
      ' (', CAST(COALESCE(weighted_confidence_pct, 0) AS STRING), '% confidence)\n',
      '- **Open Deals:** ', CAST(total_open_deals AS STRING), '\n',
      '- **Historical Win Rate:** ', CAST(ROUND(avg_win_rate, 1) AS STRING), '%\n',
      '- **Deals Won (Recent):** ', CAST(deals_won AS STRING), '\n',
      '- **Deals Lost (Recent):** ', CAST(deals_lost AS STRING), '\n\n',
      '## Risk Assessment:\n',
      '- **Deals at Risk (Stalled/Aging):** ', CAST(count_at_risk AS STRING),
      ' ($', FORMAT('%,.0f', value_at_risk), ' at risk)\n',
      '- **Deals in Warning Status:** ', CAST(count_warning AS STRING), '\n',
      '- **Deals with No Contacts:** ', CAST(no_contact_deals AS STRING), ' (relationship risk)\n',
      '- **Well-Threaded Deals:** ', CAST(COALESCE(threading_health_pct, 0) AS STRING), '% have 2+ contacts\n\n',
      '## Instructions:\n',
      'In exactly 3 concise bullet points, provide a CEO-level executive summary. ',
      'Focus on:\n',
      '1. **Confidence in the Quarter** - How likely are we to hit targets based on weighted pipeline?\n',
      '2. **Immediate Risks** - What deals or patterns need urgent attention?\n',
      '3. **Recommended Action** - One specific action the sales team should take this week.\n\n',
      'Use a professional, direct tone. Be specific with numbers. No fluff.'
    ) AS prompt,
    total_pipeline_value,
    weighted_value,
    count_at_risk,
    avg_win_rate,
    weighted_confidence_pct
  FROM combined_metrics
)

-- Call Gemini and return the executive insight
SELECT
  pb.total_pipeline_value,
  pb.weighted_value,
  pb.count_at_risk,
  pb.avg_win_rate,
  pb.weighted_confidence_pct,
  COALESCE(
    ai_response.ml_generate_text_llm_result,
    CONCAT(
      '**AI Summary Unavailable** - Fallback metrics:\n',
      '- Pipeline: $', FORMAT('%,.0f', pb.total_pipeline_value), '\n',
      '- Weighted: $', FORMAT('%,.0f', pb.weighted_value), '\n',
      '- At Risk: ', CAST(pb.count_at_risk AS STRING), ' deals\n',
      '- Win Rate: ', CAST(ROUND(pb.avg_win_rate, 1) AS STRING), '%'
    )
  ) AS executive_insight,
  CURRENT_TIMESTAMP() AS generated_at
FROM prompt_builder pb
CROSS JOIN ML.GENERATE_TEXT(
  MODEL `octup-testing.hubspot_data.gemini_insight_model`,
  (SELECT prompt FROM prompt_builder),
  STRUCT(
    300 AS max_output_tokens,
    0.2 AS temperature,
    0.95 AS top_p,
    40 AS top_k,
    TRUE AS flatten_json_output
  )
) AS ai_response;


-- ============================================================================
-- BONUS: Simplified View for Looker Studio (just the insight text)
-- ============================================================================

CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_ai_insight_simple` AS
SELECT
  executive_insight,
  generated_at
FROM `octup-testing.hubspot_data.v_ai_executive_summary`;


-- ============================================================================
-- BONUS: Daily Cached Insights Table (for cost optimization)
-- Run this as a scheduled query to avoid repeated Gemini calls
-- ============================================================================

CREATE TABLE IF NOT EXISTS `octup-testing.hubspot_data.ai_insights_cache` (
  insight_date DATE,
  total_pipeline_value FLOAT64,
  weighted_value FLOAT64,
  count_at_risk INT64,
  avg_win_rate FLOAT64,
  executive_insight STRING,
  generated_at TIMESTAMP
)
PARTITION BY insight_date;

-- Scheduled query to populate cache (run once per day)
-- MERGE INTO `octup-testing.hubspot_data.ai_insights_cache` AS target
-- USING (
--   SELECT
--     CURRENT_DATE() AS insight_date,
--     total_pipeline_value,
--     weighted_value,
--     count_at_risk,
--     avg_win_rate,
--     executive_insight,
--     generated_at
--   FROM `octup-testing.hubspot_data.v_ai_executive_summary`
-- ) AS source
-- ON target.insight_date = source.insight_date
-- WHEN MATCHED THEN
--   UPDATE SET
--     total_pipeline_value = source.total_pipeline_value,
--     weighted_value = source.weighted_value,
--     count_at_risk = source.count_at_risk,
--     avg_win_rate = source.avg_win_rate,
--     executive_insight = source.executive_insight,
--     generated_at = source.generated_at
-- WHEN NOT MATCHED THEN
--   INSERT (insight_date, total_pipeline_value, weighted_value, count_at_risk, avg_win_rate, executive_insight, generated_at)
--   VALUES (source.insight_date, source.total_pipeline_value, source.weighted_value, source.count_at_risk, source.avg_win_rate, source.executive_insight, source.generated_at);


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test the model exists:
-- SELECT * FROM ML.MODELS WHERE model_name = 'gemini_insight_model';

-- Test the view (will incur Gemini API costs):
-- SELECT * FROM `octup-testing.hubspot_data.v_ai_executive_summary`;

-- Get just the insight text for Looker Studio:
-- SELECT executive_insight FROM `octup-testing.hubspot_data.v_ai_insight_simple`;
