-- ============================================================================
-- Gemini AI Integration for CEO Executive Summaries
-- ============================================================================
-- This script sets up BigQuery ML with Gemini 1.5 Pro for generating
-- natural language executive summaries from sales data
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Cloud Resource Connection (Run once)
-- ============================================================================
-- First, create a connection in BigQuery to access Vertex AI
-- Run this command in Cloud Shell or gcloud CLI:
--
-- bq mk --connection \
--   --location=US \
--   --project_id=octup-testing \
--   --connection_type=CLOUD_RESOURCE \
--   gemini-connection
--
-- Then grant the service account access to Vertex AI:
--
-- gcloud projects add-iam-policy-binding octup-testing \
--   --member="serviceAccount:$(bq show --format=json --connection octup-testing.US.gemini-connection | jq -r '.cloudResource.serviceAccountId')" \
--   --role="roles/aiplatform.user"

-- ============================================================================
-- STEP 2: Create Remote Model for Gemini
-- ============================================================================
CREATE OR REPLACE MODEL `octup-testing.hubspot_data.gemini_pro_model`
REMOTE WITH CONNECTION `octup-testing.US.gemini-connection`
OPTIONS (
  endpoint = 'gemini-1.5-pro'
);

-- ============================================================================
-- STEP 3: Create Weekly Summary Data View (ENHANCED with Activity & Risk Data)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_weekly_summary_data` AS
WITH latest_snapshot AS (
  SELECT MAX(snapshot_date) AS max_date
  FROM `octup-testing.hubspot_data.deals_snapshots`
),
week_ago AS (
  SELECT DATE_SUB((SELECT max_date FROM latest_snapshot), INTERVAL 7 DAY) AS week_ago_date
),
current_data AS (
  SELECT
    'current' AS period,
    COUNT(*) AS total_deals,
    COUNTIF(is_open) AS open_deals,
    COUNTIF(is_won) AS won_deals,
    COUNTIF(is_lost) AS lost_deals,
    SUM(IF(is_open, amount, 0)) AS pipeline_value,
    SUM(IF(is_open, weighted_amount, 0)) AS weighted_pipeline,
    SUM(IF(is_won, amount, 0)) AS won_value,
    AVG(IF(is_open, days_in_current_stage, NULL)) AS avg_days_in_stage,
    COUNTIF(is_open AND deal_age_status = 'Red') AS at_risk_deals,
    SUM(IF(is_open AND deal_age_status = 'Red', amount, 0)) AS at_risk_value,
    ROUND(SAFE_DIVIDE(COUNTIF(is_won), COUNTIF(is_won OR is_lost)) * 100, 2) AS win_rate
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT max_date FROM latest_snapshot)
),
previous_data AS (
  SELECT
    'previous' AS period,
    COUNT(*) AS total_deals,
    COUNTIF(is_open) AS open_deals,
    COUNTIF(is_won) AS won_deals,
    COUNTIF(is_lost) AS lost_deals,
    SUM(IF(is_open, amount, 0)) AS pipeline_value,
    SUM(IF(is_open, weighted_amount, 0)) AS weighted_pipeline,
    SUM(IF(is_won, amount, 0)) AS won_value,
    AVG(IF(is_open, days_in_current_stage, NULL)) AS avg_days_in_stage,
    COUNTIF(is_open AND deal_age_status = 'Red') AS at_risk_deals,
    SUM(IF(is_open AND deal_age_status = 'Red', amount, 0)) AS at_risk_value,
    ROUND(SAFE_DIVIDE(COUNTIF(is_won), COUNTIF(is_won OR is_lost)) * 100, 2) AS win_rate
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT week_ago_date FROM week_ago)
),
top_owners AS (
  SELECT
    owner_name,
    SUM(IF(is_open, amount, 0)) AS pipeline_value,
    COUNTIF(is_won) AS won_deals
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT max_date FROM latest_snapshot)
  GROUP BY owner_name
  ORDER BY pipeline_value DESC
  LIMIT 5
),
slippage_data AS (
  SELECT
    COUNT(*) AS slipped_count,
    SUM(curr.amount) AS slipped_value
  FROM `octup-testing.hubspot_data.deals_snapshots` curr
  JOIN `octup-testing.hubspot_data.deals_snapshots` prev
    ON curr.hs_object_id = prev.hs_object_id
    AND curr.snapshot_date = DATE_ADD(prev.snapshot_date, INTERVAL 1 DAY)
  WHERE curr.closedate > prev.closedate
    AND curr.is_open = TRUE
    AND curr.snapshot_date = (SELECT max_date FROM latest_snapshot)
),
-- NEW: Risk analysis from v_deals_at_risk
risk_analysis AS (
  SELECT
    -- Overall risk counts
    COUNT(*) AS total_open_deals,
    COUNTIF(is_at_risk) AS at_risk_count,
    SUM(IF(is_at_risk, arr_value, 0)) AS at_risk_arr,

    -- Enterprise vs Standard breakdown
    COUNTIF(is_enterprise) AS enterprise_deals_count,
    SUM(IF(is_enterprise, arr_value, 0)) AS enterprise_arr,
    COUNTIF(NOT is_enterprise) AS standard_deals_count,
    SUM(IF(NOT is_enterprise, arr_value, 0)) AS standard_arr,

    -- Activity indicators
    COUNTIF(has_upcoming_meeting) AS deals_with_meetings,
    SUM(IF(has_upcoming_meeting, arr_value, 0)) AS arr_with_meetings,
    COUNTIF(has_recent_activity) AS deals_with_recent_activity,
    SUM(IF(has_recent_activity, arr_value, 0)) AS arr_with_recent_activity,

    -- Specific risk flags
    COUNTIF(is_unassigned_risk) AS ownership_risk_count,
    SUM(IF(is_unassigned_risk, arr_value, 0)) AS ownership_risk_arr,
    COUNTIF(is_stalled) AS stalled_count,
    SUM(IF(is_stalled, arr_value, 0)) AS stalled_arr,
    COUNTIF(is_ghosted) AS ghosted_count,
    SUM(IF(is_ghosted, arr_value, 0)) AS ghosted_arr,
    COUNTIF(is_not_3pl_match) AS not_3pl_count,
    SUM(IF(is_not_3pl_match, arr_value, 0)) AS not_3pl_arr,

    -- Pending Rebook (Chanan's deals) - NOT a risk, but needs action
    COUNTIF(is_pending_rebook) AS pending_rebook_count,
    SUM(IF(is_pending_rebook, arr_value, 0)) AS pending_rebook_arr,
    ROUND(AVG(IF(is_pending_rebook, days_in_current_stage, NULL)), 1) AS avg_days_pending_rebook,

    -- Enterprise risk (stalled enterprise deals)
    COUNTIF(is_enterprise AND is_stalled) AS enterprise_stalled_count,
    SUM(IF(is_enterprise AND is_stalled, arr_value, 0)) AS enterprise_stalled_arr,

    -- Healthy deals (no risk flags)
    COUNTIF(NOT is_at_risk) AS healthy_count,
    SUM(IF(NOT is_at_risk, arr_value, 0)) AS healthy_arr,

    -- Average days metrics
    ROUND(AVG(days_in_current_stage), 1) AS avg_days_in_stage_all,
    ROUND(AVG(IF(is_enterprise, days_in_current_stage, NULL)), 1) AS avg_days_enterprise,
    ROUND(AVG(IF(NOT is_enterprise, days_in_current_stage, NULL)), 1) AS avg_days_standard,
    ROUND(AVG(days_since_last_activity), 1) AS avg_days_since_activity
  FROM `octup-testing.hubspot_data.v_deals_at_risk`
),
-- NEW: Top at-risk deals list
top_at_risk_deals AS (
  SELECT STRING_AGG(
    CONCAT(dealname, ' ($', CAST(ROUND(arr_value/1000, 0) AS STRING), 'K) - ', primary_risk_reason),
    '; '
    ORDER BY arr_value DESC
    LIMIT 5
  ) AS top_risk_deals_list
  FROM `octup-testing.hubspot_data.v_deals_at_risk`
  WHERE is_at_risk = TRUE
),
-- NEW: Deals with upcoming meetings
deals_with_meetings AS (
  SELECT STRING_AGG(
    CONCAT(dealname, ' ($', CAST(ROUND(arr_value/1000, 0) AS STRING), 'K) - meeting ',
           CAST(DATE(next_meeting_scheduled) AS STRING)),
    '; '
    ORDER BY next_meeting_scheduled
    LIMIT 5
  ) AS upcoming_meetings_list
  FROM `octup-testing.hubspot_data.v_deals_at_risk`
  WHERE has_upcoming_meeting = TRUE
),
-- NEW: Recent activity deals (saved from being flagged)
recent_activity_deals AS (
  SELECT STRING_AGG(
    CONCAT(dealname, ' ($', CAST(ROUND(arr_value/1000, 0) AS STRING), 'K) - ',
           CAST(days_since_last_activity AS STRING), ' days ago'),
    '; '
    ORDER BY arr_value DESC
    LIMIT 5
  ) AS recent_activity_list
  FROM `octup-testing.hubspot_data.v_deals_at_risk`
  WHERE has_recent_activity = TRUE
    AND days_in_current_stage > 14  -- Would have been flagged without activity
),
-- NEW: Pending rebook deals (Chanan's deals needing meeting rescheduling)
pending_rebook_deals AS (
  SELECT STRING_AGG(
    CONCAT(dealname, ' ($', CAST(ROUND(arr_value/1000, 0) AS STRING), 'K) - ',
           CAST(days_in_current_stage AS STRING), ' days',
           IF(has_upcoming_meeting, ' [has meeting]', ' [NEEDS MEETING]')),
    '; '
    ORDER BY arr_value DESC
    LIMIT 5
  ) AS pending_rebook_list
  FROM `octup-testing.hubspot_data.v_deals_at_risk`
  WHERE is_pending_rebook = TRUE
)
SELECT
  (SELECT max_date FROM latest_snapshot) AS report_date,
  c.open_deals AS current_open_deals,
  c.pipeline_value AS current_pipeline_value,
  c.weighted_pipeline AS current_weighted_pipeline,
  c.won_value AS current_won_value,
  c.win_rate AS current_win_rate,
  c.at_risk_deals AS current_at_risk_deals,
  c.at_risk_value AS current_at_risk_value,
  c.avg_days_in_stage AS current_avg_days_in_stage,
  p.open_deals AS previous_open_deals,
  p.pipeline_value AS previous_pipeline_value,
  p.won_value AS previous_won_value,
  p.win_rate AS previous_win_rate,
  c.pipeline_value - p.pipeline_value AS pipeline_change,
  ROUND((c.pipeline_value - p.pipeline_value) / NULLIF(p.pipeline_value, 0) * 100, 2) AS pipeline_change_pct,
  (SELECT slipped_count FROM slippage_data) AS deals_slipped,
  (SELECT slipped_value FROM slippage_data) AS slipped_value,
  (SELECT STRING_AGG(CONCAT(owner_name, ': $', CAST(ROUND(pipeline_value, 0) AS STRING)), ', ') FROM top_owners) AS top_owners_summary,

  -- NEW: Risk analysis data
  r.enterprise_deals_count,
  r.enterprise_arr,
  r.standard_deals_count,
  r.standard_arr,
  r.deals_with_meetings,
  r.arr_with_meetings,
  r.deals_with_recent_activity,
  r.arr_with_recent_activity,
  r.ownership_risk_count,
  r.ownership_risk_arr,
  r.stalled_count,
  r.stalled_arr,
  r.ghosted_count,
  r.ghosted_arr,
  r.not_3pl_count,
  r.not_3pl_arr,
  r.enterprise_stalled_count,
  r.enterprise_stalled_arr,
  r.healthy_count,
  r.healthy_arr,
  r.avg_days_since_activity,
  r.pending_rebook_count,
  r.pending_rebook_arr,
  r.avg_days_pending_rebook,
  (SELECT top_risk_deals_list FROM top_at_risk_deals) AS top_at_risk_deals,
  (SELECT upcoming_meetings_list FROM deals_with_meetings) AS upcoming_meetings,
  (SELECT recent_activity_list FROM recent_activity_deals) AS deals_saved_by_activity,
  (SELECT pending_rebook_list FROM pending_rebook_deals) AS pending_rebook_deals
FROM current_data c, previous_data p, risk_analysis r;

-- ============================================================================
-- STEP 4: Function to Generate CEO Executive Summary (ENHANCED with Full Context)
-- ============================================================================
CREATE OR REPLACE TABLE FUNCTION `octup-testing.hubspot_data.fn_generate_ceo_summary`()
RETURNS TABLE<summary STRING>
AS (
  WITH summary_data AS (
    SELECT * FROM `octup-testing.hubspot_data.v_weekly_summary_data`
  ),
  prompt_data AS (
    SELECT
      CONCAT(
        'You are a senior sales analyst preparing an executive summary for the CEO of a 3PL (third-party logistics) software company. ',
        'Based on the following sales pipeline data, write a concise 4-5 paragraph executive summary. ',
        'Be specific about deal names, ARR values, and actionable insights. ',
        'Enterprise deals (>$100K) have longer sales cycles and different thresholds.\n\n',

        '═══════════════════════════════════════════════════════════════════════\n',
        'PIPELINE OVERVIEW (Report Date: ', CAST(report_date AS STRING), ')\n',
        '═══════════════════════════════════════════════════════════════════════\n',
        '• Total Open Deals: ', CAST(current_open_deals AS STRING), '\n',
        '• Total Pipeline Value: $', FORMAT('%,.0f', current_pipeline_value), '\n',
        '• Weighted Pipeline: $', FORMAT('%,.0f', current_weighted_pipeline), '\n',
        '• Won This Period: $', FORMAT('%,.0f', current_won_value), '\n',
        '• Win Rate: ', CAST(current_win_rate AS STRING), '%\n',
        '• Avg Days in Current Stage: ', CAST(ROUND(current_avg_days_in_stage, 1) AS STRING), '\n\n',

        '═══════════════════════════════════════════════════════════════════════\n',
        'ENTERPRISE VS STANDARD DEALS\n',
        '═══════════════════════════════════════════════════════════════════════\n',
        '• Enterprise Deals (≥$100K ARR): ', CAST(enterprise_deals_count AS STRING), ' deals worth $', FORMAT('%,.0f', enterprise_arr), '\n',
        '  - These have longer sales cycles; 30-day stalled threshold vs 14 days for standard\n',
        '• Standard Deals (<$100K ARR): ', CAST(standard_deals_count AS STRING), ' deals worth $', FORMAT('%,.0f', standard_arr), '\n\n',

        '═══════════════════════════════════════════════════════════════════════\n',
        'DEAL ACTIVITY & ENGAGEMENT\n',
        '═══════════════════════════════════════════════════════════════════════\n',
        '• Deals with Upcoming Meetings Scheduled: ', CAST(deals_with_meetings AS STRING), ' worth $', FORMAT('%,.0f', arr_with_meetings), '\n',
        '  - These deals are ACTIVE and should NOT be flagged as stalled\n',
        '  - Upcoming meetings: ', COALESCE(upcoming_meetings, 'None'), '\n\n',
        '• Deals with Recent Activity (last 7 days): ', CAST(deals_with_recent_activity AS STRING), ' worth $', FORMAT('%,.0f', arr_with_recent_activity), '\n',
        '  - These show engagement even if stage hasn''t changed\n',
        '  - Deals saved from stalled flag by activity: ', COALESCE(deals_saved_by_activity, 'None'), '\n\n',
        '• Average Days Since Last Activity: ', CAST(avg_days_since_activity AS STRING), ' days\n\n',

        '═══════════════════════════════════════════════════════════════════════\n',
        'HEALTHY PIPELINE\n',
        '═══════════════════════════════════════════════════════════════════════\n',
        '• Healthy Deals (no risk flags): ', CAST(healthy_count AS STRING), ' deals worth $', FORMAT('%,.0f', healthy_arr), '\n',
        '  - These deals have recent activity, meetings scheduled, or are progressing normally\n\n',

        '═══════════════════════════════════════════════════════════════════════\n',
        'PENDING REBOOK (Chanan''s Deals)\n',
        '═══════════════════════════════════════════════════════════════════════\n',
        '• IMPORTANT: Chanan is NOT an inactive owner - he actively works on rebooking meetings\n',
        '• Deals assigned to Chanan = First meeting didn''t happen OR meeting scheduled too far out\n',
        '• Chanan''s job: Rebook these meetings with the sales team (AEs)\n',
        '• GOAL: Chanan should have 0 deals - all should be rebooked with AEs\n\n',
        '• Pending Rebook: ', CAST(pending_rebook_count AS STRING), ' deals worth $', FORMAT('%,.0f', pending_rebook_arr), '\n',
        '• Avg Days Pending: ', CAST(COALESCE(avg_days_pending_rebook, 0) AS STRING), ' days\n',
        '• Deals: ', COALESCE(pending_rebook_deals, 'None'), '\n\n',

        '═══════════════════════════════════════════════════════════════════════\n',
        'RISK BREAKDOWN (Detailed)\n',
        '═══════════════════════════════════════════════════════════════════════\n',
        '• OWNERSHIP RISK (Kurt/Hanan/Deactivated Users - NOT Chanan): ', CAST(ownership_risk_count AS STRING), ' deals worth $', FORMAT('%,.0f', ownership_risk_arr), '\n',
        '  - These need immediate reassignment to active reps\n',
        '  - These are truly orphaned deals with no active owner working them\n\n',
        '• STALLED DEALS (no stage movement beyond threshold): ', CAST(stalled_count AS STRING), ' deals worth $', FORMAT('%,.0f', stalled_arr), '\n',
        '  - Enterprise stalled (>30 days): ', CAST(enterprise_stalled_count AS STRING), ' worth $', FORMAT('%,.0f', enterprise_stalled_arr), '\n',
        '  - Standard stalled (>14 days): ', CAST(stalled_count - enterprise_stalled_count AS STRING), ' worth $', FORMAT('%,.0f', stalled_arr - enterprise_stalled_arr), '\n\n',
        '• GHOSTED DEALS (no engagement): ', CAST(ghosted_count AS STRING), ' deals worth $', FORMAT('%,.0f', ghosted_arr), '\n',
        '  - No contact or activity beyond threshold (10 days enterprise, 5 days standard)\n\n',
        '• NOT 3PL MATCH (prospect may not be target customer): ', CAST(not_3pl_count AS STRING), ' deals worth $', FORMAT('%,.0f', not_3pl_arr), '\n',
        '  - Company doesn''t match logistics/fulfillment/warehouse industry keywords\n\n',
        '• TOP AT-RISK DEALS: ', COALESCE(top_at_risk_deals, 'None'), '\n\n',

        '═══════════════════════════════════════════════════════════════════════\n',
        'WEEK-OVER-WEEK CHANGES\n',
        '═══════════════════════════════════════════════════════════════════════\n',
        '• Pipeline Change: $', FORMAT('%,.0f', pipeline_change), ' (', CAST(pipeline_change_pct AS STRING), '%)\n',
        '• Previous Week Open Deals: ', CAST(previous_open_deals AS STRING), '\n',
        '• Previous Week Pipeline: $', FORMAT('%,.0f', previous_pipeline_value), '\n',
        '• Deals with Slipped Close Dates: ', CAST(deals_slipped AS STRING), ' worth $', FORMAT('%,.0f', slipped_value), '\n\n',

        '═══════════════════════════════════════════════════════════════════════\n',
        'TOP PERFORMERS\n',
        '═══════════════════════════════════════════════════════════════════════\n',
        top_owners_summary, '\n\n',

        '═══════════════════════════════════════════════════════════════════════\n',
        'ANALYSIS REQUEST\n',
        '═══════════════════════════════════════════════════════════════════════\n',
        'Please provide:\n',
        '1. EXECUTIVE SUMMARY (2-3 sentences on overall pipeline health)\n',
        '2. KEY WINS & POSITIVE SIGNALS (bullet points)\n',
        '   - Highlight deals with upcoming meetings or recent activity\n',
        '   - Note any enterprise deals progressing well\n',
        '3. RISKS & CONCERNS (bullet points)\n',
        '   - Be specific about which deals need attention\n',
        '   - Distinguish between ownership risk vs engagement risk\n',
        '   - Note if enterprise deals are stalling (these need white-glove attention)\n',
        '4. PENDING REBOOK STATUS (Chanan''s queue)\n',
        '   - If Chanan has deals, note how many and total ARR\n',
        '   - Goal is for Chanan to have 0 deals (all rebooked with AEs)\n',
        '   - Flag any deals that have been pending rebook for too long\n',
        '5. RECOMMENDED ACTIONS (3-4 specific, actionable items)\n',
        '   - Prioritize ownership risk (reassignments from Kurt/Hanan/Deactivated)\n',
        '   - Help Chanan rebook high-value deals with AEs\n',
        '   - Suggest outreach for ghosted deals\n',
        '   - Recommend next steps for stalled deals'
      ) AS prompt
    FROM summary_data
  )
  SELECT
    ml_generate_text_result.predictions[0].content AS summary
  FROM ML.GENERATE_TEXT(
    MODEL `octup-testing.hubspot_data.gemini_pro_model`,
    (SELECT prompt FROM prompt_data),
    STRUCT(
      0.3 AS temperature,
      2048 AS max_output_tokens,
      TRUE AS flatten_json_output
    )
  )
);

-- ============================================================================
-- STEP 5: Create a View for Easy Access to Latest Summary
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_ceo_ai_summary` AS
SELECT
  CURRENT_TIMESTAMP() AS generated_at,
  summary
FROM `octup-testing.hubspot_data.fn_generate_ceo_summary`();

-- ============================================================================
-- STEP 6: Scheduled Query for Weekly Summaries (Optional)
-- ============================================================================
-- To schedule this to run weekly, use the BigQuery UI or run:
--
-- bq mk \
--   --transfer_config \
--   --project_id=octup-testing \
--   --target_dataset=hubspot_data \
--   --display_name='Weekly CEO AI Summary' \
--   --data_source=scheduled_query \
--   --schedule='every monday 09:00' \
--   --params='{
--     "query":"INSERT INTO `octup-testing.hubspot_data.ceo_summaries_history` (generated_at, summary) SELECT CURRENT_TIMESTAMP(), summary FROM `octup-testing.hubspot_data.fn_generate_ceo_summary`()"
--   }'

-- ============================================================================
-- STEP 7: Create History Table for Summaries (Optional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `octup-testing.hubspot_data.ceo_summaries_history` (
  generated_at TIMESTAMP,
  summary STRING
);

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Get the latest AI-generated CEO summary:
-- SELECT * FROM `octup-testing.hubspot_data.v_ceo_ai_summary`;

-- Generate a fresh summary on demand:
-- SELECT * FROM `octup-testing.hubspot_data.fn_generate_ceo_summary`();

-- View summary history:
-- SELECT * FROM `octup-testing.hubspot_data.ceo_summaries_history`
-- ORDER BY generated_at DESC
-- LIMIT 10;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'Gemini AI Integration setup complete!' AS status;
