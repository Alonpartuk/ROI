-- ============================================================================
-- FILE: 02_sdr_activity_views.sql
-- PRIORITY: 2 (Run SECOND - depends on deal movement views)
-- DESCRIPTION: SDR Activity Views - Weekly Performance Tracking
-- DEPENDS_ON: 01_deal_risk_views.sql (v_daily_deal_movements)
-- CREATES: v_sdr_activity_weekly
-- ============================================================================
-- UPDATED: Uses deal stage tracking instead of meeting booking attribution
--
-- Problem: HubSpot doesn't track "who booked" vs "whose calendar" separately.
--          When SDR books on AE calendar, meeting is attributed to AE.
--
-- Solution: Track deals entering "NBM Scheduled" stage as proxy for SDR activity.
--           This gives visibility into pipeline generation without broken attribution.
--
-- Key Metrics:
--   - NBM Deals Created: Deals that moved to "NBM Scheduled" stage this week
--   - Meetings Held: Meetings with outcome = COMPLETED (still accurate)
--   - At Risk Deals: From v_deals_at_risk (existing)
-- ============================================================================

-- ============================================================================
-- VIEW: v_sdr_activity_weekly
-- ============================================================================
-- Logic:
--   - Uses v_daily_deal_movements to find deals entering "NBM Scheduled" stage
--   - Groups by week using DATE_TRUNC(transition_date, WEEK(MONDAY))
--   - Uses owner_name from deal (who owns the deal, typically AE)
--   - Joins with meetings_snapshots for meetings held count
-- ============================================================================

CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_sdr_activity_weekly` AS
WITH
-- Track deals entering NBM Scheduled stage
nbm_entries AS (
  SELECT
    DATE_TRUNC(transition_date, WEEK(MONDAY)) AS week_start,
    owner_name,
    deal_id,
    value_arr,
    transition_date
  FROM `octup-testing.hubspot_data.v_daily_deal_movements`
  WHERE current_stage = 'NBM Scheduled'
    AND (previous_stage IS NULL OR previous_stage != 'NBM Scheduled')
    AND transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    AND owner_name IS NOT NULL
    AND owner_name != ''
),

-- Weekly NBM stats per owner
nbm_weekly AS (
  SELECT
    week_start,
    owner_name,
    COUNT(DISTINCT deal_id) AS nbm_deals_created,
    SUM(value_arr) AS nbm_arr_value
  FROM nbm_entries
  GROUP BY week_start, owner_name
),

-- Meetings held per owner (COMPLETED outcome is accurate) - excludes future dates
meetings_held AS (
  SELECT
    DATE_TRUNC(DATE(start_time), WEEK(MONDAY)) AS week_start,
    owner_name,
    COUNT(*) AS meetings_held_count,
    COUNTIF(meeting_outcome = 'NO_SHOW') AS meetings_no_show_count
  FROM `octup-testing.hubspot_data.meetings_snapshots`
  WHERE meeting_outcome = 'COMPLETED'
    AND DATE(start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    AND DATE(start_time) <= CURRENT_DATE() -- Exclude future meetings
    AND owner_name IS NOT NULL
    AND owner_name != ''
  GROUP BY 1, 2
),

-- All meetings (for rate calculations) - excludes future dates
all_meetings AS (
  SELECT
    DATE_TRUNC(DATE(start_time), WEEK(MONDAY)) AS week_start,
    owner_name,
    COUNT(*) AS total_meetings,
    COUNTIF(meeting_outcome = 'COMPLETED') AS completed_count,
    COUNTIF(meeting_outcome = 'NO_SHOW') AS no_show_count
  FROM `octup-testing.hubspot_data.meetings_snapshots`
  WHERE DATE(start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    AND DATE(start_time) <= CURRENT_DATE() -- Exclude future scheduled meetings
    AND owner_name IS NOT NULL
    AND owner_name != ''
  GROUP BY 1, 2
)

SELECT
  COALESCE(n.week_start, m.week_start, am.week_start) AS week_start,
  COALESCE(n.owner_name, m.owner_name, am.owner_name) AS sdr_name,
  '' AS sdr_email, -- Email not tracked at deal level

  -- NBM Deals Created (new metric replacing meetings_booked)
  COALESCE(n.nbm_deals_created, 0) AS nbm_deals_created,
  COALESCE(n.nbm_arr_value, 0) AS nbm_arr_value,

  -- Meetings Held (still accurate from meeting outcomes)
  COALESCE(m.meetings_held_count, 0) AS meetings_held_count,
  COALESCE(am.no_show_count, 0) AS meetings_no_show_count,

  -- Rates (based on all meetings)
  ROUND(SAFE_DIVIDE(COALESCE(m.meetings_held_count, 0), COALESCE(am.total_meetings, 1)) * 100, 1) AS held_rate_pct,
  ROUND(SAFE_DIVIDE(COALESCE(am.no_show_count, 0), COALESCE(am.total_meetings, 1)) * 100, 1) AS no_show_rate_pct,

  -- Legacy field names for backwards compatibility with component
  COALESCE(n.nbm_deals_created, 0) AS meetings_booked_count -- Maps to NBM deals for backward compat

FROM nbm_weekly n
FULL OUTER JOIN meetings_held m
  ON n.week_start = m.week_start AND n.owner_name = m.owner_name
FULL OUTER JOIN all_meetings am
  ON COALESCE(n.week_start, m.week_start) = am.week_start
  AND COALESCE(n.owner_name, m.owner_name) = am.owner_name
WHERE COALESCE(n.owner_name, m.owner_name, am.owner_name) IS NOT NULL
ORDER BY week_start DESC, nbm_deals_created DESC;


-- ============================================================================
-- VIEW: v_sdr_meeting_outcomes - Detailed Meeting Outcome Analysis
-- ============================================================================
-- Note: Still useful for understanding meeting outcomes (COMPLETED vs NO_SHOW)
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_sdr_meeting_outcomes` AS
WITH
outcome_counts AS (
  SELECT
    DATE_TRUNC(DATE(start_time), WEEK(MONDAY)) AS week_start,
    owner_name AS sdr_name,
    COALESCE(NULLIF(meeting_outcome, ''), 'PENDING') AS meeting_outcome,
    COUNT(*) AS meeting_count
  FROM `octup-testing.hubspot_data.meetings_snapshots`
  WHERE DATE(start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    AND owner_name IS NOT NULL
    AND owner_name != ''
  GROUP BY 1, 2, 3
)
SELECT
  week_start,
  sdr_name,
  meeting_outcome,
  meeting_count,
  ROUND(meeting_count * 100.0 / SUM(meeting_count) OVER (PARTITION BY week_start, sdr_name), 1) AS pct_of_total
FROM outcome_counts
ORDER BY week_start DESC, sdr_name, meeting_count DESC;


-- ============================================================================
-- VIEW: v_sdr_leaderboard - Weekly SDR Performance Ranking with At-Risk ARR
-- ============================================================================
-- Updated: Uses NBM deals created instead of meetings booked
-- Note: Only considers weeks up to current week (excludes future scheduled meetings)
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_sdr_leaderboard` AS
WITH latest_week AS (
  SELECT MAX(week_start) AS week_start
  FROM `octup-testing.hubspot_data.v_sdr_activity_weekly`
  WHERE week_start <= DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY))
),

-- Get at-risk ARR per owner from deals
at_risk_summary AS (
  SELECT
    owner_name,
    COUNT(*) AS total_open_deals,
    SUM(arr_value) AS total_pipeline_arr,
    COUNTIF(is_at_risk) AS at_risk_deals_count,
    SUM(CASE WHEN is_at_risk THEN arr_value ELSE 0 END) AS at_risk_value,
    COUNTIF(is_stalled) AS stalled_count,
    COUNTIF(is_ghosted) AS ghosted_count,
    COUNTIF(is_unassigned_risk) AS ownership_risk_count
  FROM `octup-testing.hubspot_data.v_deals_at_risk`
  GROUP BY owner_name
)

SELECT
  a.sdr_name,
  a.sdr_email,
  a.week_start,

  -- NBM Deals Created (replacing meetings_booked)
  a.nbm_deals_created,
  a.nbm_arr_value,

  -- Meetings metrics (still valid)
  a.meetings_held_count,
  a.meetings_no_show_count,
  a.held_rate_pct,
  a.no_show_rate_pct,

  -- Legacy field for backward compatibility
  a.meetings_booked_count,

  -- Deal portfolio metrics
  COALESCE(r.total_open_deals, 0) AS total_open_deals,
  COALESCE(r.total_pipeline_arr, 0) AS total_pipeline_arr,

  -- At Risk metrics
  COALESCE(r.at_risk_deals_count, 0) AS at_risk_deals_count,
  COALESCE(r.at_risk_value, 0) AS at_risk_value,
  COALESCE(r.stalled_count, 0) AS stalled_deals,
  COALESCE(r.ghosted_count, 0) AS ghosted_deals,

  -- Rankings
  RANK() OVER (ORDER BY a.meetings_held_count DESC) AS rank_by_meetings_held,
  RANK() OVER (ORDER BY a.nbm_deals_created DESC) AS rank_by_meetings_booked,
  RANK() OVER (ORDER BY a.held_rate_pct DESC) AS rank_by_held_rate,
  RANK() OVER (ORDER BY COALESCE(r.at_risk_value, 0) ASC) AS rank_by_risk  -- Lower risk = better

FROM `octup-testing.hubspot_data.v_sdr_activity_weekly` a
LEFT JOIN at_risk_summary r ON a.sdr_name = r.owner_name
WHERE a.week_start = (SELECT week_start FROM latest_week)
ORDER BY a.nbm_deals_created DESC;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to test the views after creation:
--
-- SELECT * FROM `octup-testing.hubspot_data.v_sdr_activity_weekly` LIMIT 10;
--
-- SELECT * FROM `octup-testing.hubspot_data.v_sdr_leaderboard` LIMIT 10;
--
-- Check NBM deals entering pipeline:
-- SELECT
--   owner_name,
--   COUNT(*) as nbm_entries,
--   SUM(value_arr) as total_arr
-- FROM `octup-testing.hubspot_data.v_daily_deal_movements`
-- WHERE current_stage = 'NBM Scheduled'
--   AND transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
-- GROUP BY owner_name
-- ORDER BY nbm_entries DESC;

