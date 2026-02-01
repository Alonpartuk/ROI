-- ============================================================================
-- FILE: 01_deal_risk_views.sql
-- PRIORITY: 1 (Run AFTER setup.sql)
-- DESCRIPTION: Deal Risk & Movement Analysis Views
-- DEPENDS_ON: 00_setup.sql (v_latest_snapshot, deals_snapshots)
-- CREATES: v_deals_at_risk, v_daily_deal_movements, v_at_risk_by_owner,
--          v_stalled_deal_analysis
-- ============================================================================
-- Business Requirements:
-- 1. Flag deals owned by Kurt/Hanan/Deactivated as Unassigned_Risk
-- 2. Flag deals owned by Chanan as Pending_Rebook (NOT risk - actively being worked)
--    - Chanan deals = first meeting didn't happen OR meeting too far out
--    - Goal: Chanan should have 0 deals (all rebooked with AEs)
-- 3. Track daily stage transitions
-- 4. Define At Risk criteria (Stalled, Ghosted, Ownership, 3PL Match)
-- 5. Stalled/Delayed analysis for 30+ day deals
-- 6. Enterprise deals (>$100K) have different thresholds (longer cycles)
-- 7. Recent activity (hs_lastmodifieddate) overrides stalled flags
-- 8. Upcoming scheduled meetings override stalled/ghosted flags
-- ============================================================================


-- ============================================================================
-- VIEW: v_deals_at_risk - Flag deals with risk indicators
-- ============================================================================
-- UPDATED: Now considers recent activity, enterprise deal thresholds, and meetings
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_deals_at_risk` AS
WITH latest_deals AS (
  SELECT *
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND pipeline_label = '3PL New Business'
    AND is_open = TRUE
),

-- Check for upcoming meetings per deal
deal_meetings AS (
  SELECT
    d.hs_object_id,
    MAX(CASE WHEN m.start_time >= CURRENT_TIMESTAMP() THEN m.start_time END) AS next_meeting_scheduled,
    MAX(m.start_time) AS last_meeting_date,
    COUNT(CASE WHEN m.start_time >= DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY) THEN 1 END) AS recent_meetings_count
  FROM latest_deals d
  LEFT JOIN `octup-testing.hubspot_data.meetings_snapshots` m
    ON m.associated_deal_ids LIKE CONCAT('%', CAST(d.hs_object_id AS STRING), '%')
    AND m.snapshot_date = d.snapshot_date
  GROUP BY d.hs_object_id
),

risk_flags AS (
  SELECT
    d.hs_object_id,
    d.dealname,
    d.amount,
    COALESCE(d.hs_arr, d.amount) AS arr_value,
    d.dealstage_label,
    d.owner_name,
    d.owner_email,
    d.company_name,
    d.company_industry,
    d.days_in_current_stage,
    d.notes_last_contacted,
    d.hs_next_step,
    d.createdate,
    d.hs_lastmodifieddate,
    d.snapshot_date,

    -- Meeting info
    dm.next_meeting_scheduled,
    dm.last_meeting_date,
    dm.recent_meetings_count,

    -- Days since last activity (using lastmodified as activity indicator)
    DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) AS days_since_last_activity,

    -- Is Enterprise deal (>$100K ARR - longer sales cycles expected)
    CASE WHEN COALESCE(d.hs_arr, d.amount) >= 100000 THEN TRUE ELSE FALSE END AS is_enterprise,

    -- Has upcoming meeting scheduled
    CASE WHEN dm.next_meeting_scheduled IS NOT NULL THEN TRUE ELSE FALSE END AS has_upcoming_meeting,

    -- Has recent activity (modified in last 7 days)
    CASE WHEN DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) <= 7 THEN TRUE ELSE FALSE END AS has_recent_activity,

    -- Risk Flag 1: Ownership Risk (Kurt or Hanan or deactivated users - NOT Chanan)
    -- Chanan is handled separately as pending_rebook
    CASE
      WHEN LOWER(d.owner_name) LIKE '%kurt%'
        OR LOWER(d.owner_name) LIKE '%hanan%'
        OR LOWER(d.owner_name) LIKE '%deactivated%'
      THEN TRUE
      ELSE FALSE
    END AS is_unassigned_risk,

    -- Flag for Pending Rebook (Chanan's deals)
    -- Chanan holds deals where: first meeting didn't happen OR meeting is too far out
    -- Goal: Chanan should have 0 deals (all should be rebooked with AEs)
    CASE
      WHEN LOWER(d.owner_name) LIKE '%chanan%' THEN TRUE
      ELSE FALSE
    END AS is_pending_rebook,

    -- Risk Flag 2: Stalled (no stage movement beyond threshold)
    -- UPDATED:
    --   - Enterprise deals: 30 days threshold (longer sales cycle)
    --   - Standard deals: 14 days threshold
    --   - NOT stalled if: recent activity OR upcoming meeting scheduled
    CASE
      -- Has upcoming meeting = not stalled
      WHEN dm.next_meeting_scheduled IS NOT NULL THEN FALSE
      -- Recent activity in last 7 days = not stalled
      WHEN DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) <= 7 THEN FALSE
      -- Enterprise deal: 30 day threshold
      WHEN COALESCE(d.hs_arr, d.amount) >= 100000 AND d.days_in_current_stage > 30 THEN TRUE
      -- Standard deal: 14 day threshold
      WHEN COALESCE(d.hs_arr, d.amount) < 100000 AND d.days_in_current_stage > 14 THEN TRUE
      ELSE FALSE
    END AS is_stalled,

    -- Risk Flag 3: Ghosted (no engagement beyond threshold)
    -- UPDATED:
    --   - NOT ghosted if: recent activity OR upcoming meeting
    --   - Uses hs_lastmodifieddate as activity fallback
    CASE
      -- Has upcoming meeting = not ghosted
      WHEN dm.next_meeting_scheduled IS NOT NULL THEN FALSE
      -- Recent activity = not ghosted
      WHEN DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) <= 7 THEN FALSE
      -- Enterprise: 10 day threshold
      WHEN COALESCE(d.hs_arr, d.amount) >= 100000
        AND (d.notes_last_contacted IS NULL OR DATE_DIFF(CURRENT_DATE(), DATE(d.notes_last_contacted), DAY) > 10)
        AND DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) > 10
      THEN TRUE
      -- Standard: 5 day threshold
      WHEN COALESCE(d.hs_arr, d.amount) < 100000
        AND (d.notes_last_contacted IS NULL OR DATE_DIFF(CURRENT_DATE(), DATE(d.notes_last_contacted), DAY) > 5)
        AND DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) > 5
      THEN TRUE
      ELSE FALSE
    END AS is_ghosted,

    -- Risk Flag 4: Not a 3PL firm (based on company name/industry)
    CASE
      WHEN d.company_industry IS NULL AND (
        LOWER(COALESCE(d.company_name, '')) NOT LIKE '%3pl%'
        AND LOWER(COALESCE(d.company_name, '')) NOT LIKE '%fulfillment%'
        AND LOWER(COALESCE(d.company_name, '')) NOT LIKE '%logistics%'
        AND LOWER(COALESCE(d.company_name, '')) NOT LIKE '%warehouse%'
        AND LOWER(COALESCE(d.company_name, '')) NOT LIKE '%shipping%'
        AND LOWER(COALESCE(d.company_name, '')) NOT LIKE '%freight%'
        AND LOWER(COALESCE(d.company_name, '')) NOT LIKE '%distribution%'
      ) THEN TRUE
      WHEN LOWER(COALESCE(d.company_industry, '')) NOT LIKE '%logistics%'
        AND LOWER(COALESCE(d.company_industry, '')) NOT LIKE '%transport%'
        AND LOWER(COALESCE(d.company_industry, '')) NOT LIKE '%warehouse%'
        AND LOWER(COALESCE(d.company_industry, '')) NOT LIKE '%supply chain%'
        AND LOWER(COALESCE(d.company_name, '')) NOT LIKE '%3pl%'
        AND LOWER(COALESCE(d.company_name, '')) NOT LIKE '%fulfillment%'
        AND LOWER(COALESCE(d.company_name, '')) NOT LIKE '%logistics%'
      THEN TRUE
      ELSE FALSE
    END AS is_not_3pl_match,

    -- Risk Flag 5: Delayed > 30 days without next step
    CASE
      WHEN LOWER(d.dealstage_label) LIKE '%delay%'
        AND d.days_in_current_stage > 30
        AND (d.hs_next_step IS NULL OR d.hs_next_step = '')
      THEN TRUE
      ELSE FALSE
    END AS is_stalled_delayed

  FROM latest_deals d
  LEFT JOIN deal_meetings dm ON d.hs_object_id = dm.hs_object_id
)

SELECT
  *,
  -- Overall At Risk flag (any condition met)
  -- NOTE: is_pending_rebook (Chanan) is NOT included - those are actively being worked
  (is_unassigned_risk OR is_stalled OR is_ghosted OR is_not_3pl_match) AS is_at_risk,

  -- Risk category for reporting
  -- Pending Rebook (Chanan) is shown separately - not a "risk" but needs rebooking action
  CASE
    WHEN is_pending_rebook THEN 'Pending Rebook (Chanan)'
    WHEN is_unassigned_risk THEN 'Ownership Risk'
    WHEN is_stalled AND is_ghosted THEN 'Stalled & Ghosted'
    WHEN is_stalled THEN CASE WHEN is_enterprise THEN 'Stalled (>30 days - Enterprise)' ELSE 'Stalled (>14 days)' END
    WHEN is_ghosted THEN CASE WHEN is_enterprise THEN 'Ghosted (>10 days - Enterprise)' ELSE 'Ghosted (>5 days)' END
    WHEN is_not_3pl_match THEN 'Not 3PL Match'
    ELSE 'Healthy'
  END AS primary_risk_reason,

  -- Count of risk flags (excluding pending_rebook which is not a risk)
  (CASE WHEN is_unassigned_risk THEN 1 ELSE 0 END +
   CASE WHEN is_stalled THEN 1 ELSE 0 END +
   CASE WHEN is_ghosted THEN 1 ELSE 0 END +
   CASE WHEN is_not_3pl_match THEN 1 ELSE 0 END) AS risk_flag_count

FROM risk_flags
ORDER BY arr_value DESC;


-- ============================================================================
-- VIEW: v_orphaned_deals_summary - Deals owned by Kurt/Hanan/Deactivated (NOT Chanan)
-- Chanan deals are tracked separately via is_pending_rebook
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_orphaned_deals_summary` AS
SELECT
  owner_name,
  COUNT(*) AS deal_count,
  SUM(arr_value) AS total_arr_at_risk,
  ROUND(AVG(days_in_current_stage), 0) AS avg_days_in_stage,
  STRING_AGG(dealname, ', ' ORDER BY arr_value DESC LIMIT 5) AS top_deals
FROM `octup-testing.hubspot_data.v_deals_at_risk`
WHERE is_unassigned_risk = TRUE
GROUP BY owner_name
ORDER BY total_arr_at_risk DESC;


-- ============================================================================
-- VIEW: v_pending_rebook_summary - Deals with Chanan needing rebook
-- Goal: Chanan should have 0 deals (all should be rebooked with AEs)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_pending_rebook_summary` AS
SELECT
  'Chanan' AS rebook_coordinator,
  COUNT(*) AS deal_count,
  SUM(arr_value) AS total_arr_pending,
  ROUND(AVG(days_in_current_stage), 0) AS avg_days_pending,
  COUNTIF(has_upcoming_meeting) AS deals_with_meeting_scheduled,
  COUNTIF(NOT has_upcoming_meeting) AS deals_needing_meeting,
  SUM(CASE WHEN NOT has_upcoming_meeting THEN arr_value ELSE 0 END) AS arr_needing_meeting,
  STRING_AGG(
    CONCAT(dealname, ' ($', CAST(ROUND(arr_value/1000, 0) AS STRING), 'K - ', CAST(days_in_current_stage AS STRING), ' days)'),
    ', '
    ORDER BY arr_value DESC
    LIMIT 5
  ) AS top_deals_pending
FROM `octup-testing.hubspot_data.v_deals_at_risk`
WHERE is_pending_rebook = TRUE;


-- ============================================================================
-- VIEW: v_daily_deal_movements - Stage Transition Tracker
-- ============================================================================
-- UPDATED: Uses actual createdate to determine "New Deal" vs "Stage Change"
-- This prevents existing deals from being marked as "New" when snapshots start
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_daily_deal_movements` AS
WITH deal_history AS (
  SELECT
    hs_object_id,
    dealname,
    amount,
    COALESCE(hs_arr, amount) AS arr_value,
    dealstage_label,
    owner_name,
    snapshot_date,
    createdate,  -- Add actual deal creation date
    LAG(dealstage_label) OVER (
      PARTITION BY hs_object_id
      ORDER BY snapshot_date
    ) AS previous_stage,
    LAG(snapshot_date) OVER (
      PARTITION BY hs_object_id
      ORDER BY snapshot_date
    ) AS previous_snapshot_date
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE pipeline_label = '3PL New Business'
),

stage_transitions AS (
  SELECT
    hs_object_id AS deal_id,
    dealname AS deal_name,
    arr_value AS value_arr,
    previous_stage,
    dealstage_label AS current_stage,
    snapshot_date AS transition_date,
    owner_name,
    createdate,
    -- Days between transitions
    DATE_DIFF(snapshot_date, previous_snapshot_date, DAY) AS days_in_previous_stage,
    -- Direction of movement - use actual createdate for New Deal determination
    CASE
      -- Only mark as "New Deal" if created within 7 days of the snapshot
      WHEN previous_stage IS NULL AND DATE(createdate) >= DATE_SUB(snapshot_date, INTERVAL 7 DAY) THEN 'New Deal'
      -- First snapshot but deal was created earlier = just tracking started
      WHEN previous_stage IS NULL THEN 'Initial Snapshot'
      WHEN dealstage_label = previous_stage THEN 'No Change'
      WHEN dealstage_label IN ('Closed Won', 'Closed Lost') THEN 'Closed'
      WHEN previous_stage IN ('Closed Won', 'Closed Lost') THEN 'Reopened'
      ELSE 'Stage Change'
    END AS movement_type
  FROM deal_history
  WHERE
    -- Only show actual stage changes
    (dealstage_label != previous_stage OR previous_stage IS NULL)
)

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
  -- Formatted message for dashboard
  CONCAT(
    deal_name,
    ' moved from ',
    COALESCE(previous_stage, 'New'),
    ' to ',
    current_stage,
    ' (Value: $',
    CAST(ROUND(COALESCE(value_arr, 0), 0) AS STRING),
    ')'
  ) AS movement_description
FROM stage_transitions
WHERE movement_type NOT IN ('No Change', 'Initial Snapshot')
ORDER BY transition_date DESC, value_arr DESC;


-- ============================================================================
-- VIEW: v_stalled_deals_alert - Deals in Delayed status > 30 days
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_stalled_deals_alert` AS
SELECT
  hs_object_id AS deal_id,
  dealname AS deal_name,
  arr_value AS value_arr,
  owner_name,
  dealstage_label AS current_stage,
  days_in_current_stage,
  hs_next_step AS next_step,
  notes_last_contacted AS last_contact_date,
  createdate AS deal_created,

  -- Recommendation
  CASE
    WHEN is_stalled_delayed THEN 'Recommend: Move to Closed Lost - No Response'
    WHEN days_in_current_stage > 30 AND is_ghosted THEN 'Action: Re-engage or Close'
    WHEN days_in_current_stage > 21 THEN 'Warning: Approaching stale threshold'
    ELSE 'Monitor'
  END AS recommended_action,

  -- Priority score
  CASE
    WHEN is_stalled_delayed THEN 1
    WHEN days_in_current_stage > 30 THEN 2
    WHEN days_in_current_stage > 21 THEN 3
    ELSE 4
  END AS priority_rank

FROM `octup-testing.hubspot_data.v_deals_at_risk`
WHERE days_in_current_stage > 14
  OR is_stalled_delayed = TRUE
ORDER BY priority_rank, days_in_current_stage DESC;


-- ============================================================================
-- VIEW: v_at_risk_by_owner - At Risk ARR by Deal Owner
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_at_risk_by_owner` AS
SELECT
  owner_name,
  owner_email,

  -- Total deals and ARR
  COUNT(*) AS total_open_deals,
  SUM(arr_value) AS total_arr,

  -- At Risk metrics
  COUNTIF(is_at_risk) AS at_risk_deals,
  SUM(CASE WHEN is_at_risk THEN arr_value ELSE 0 END) AS at_risk_value,

  -- Risk breakdown
  COUNTIF(is_stalled) AS stalled_deals,
  COUNTIF(is_ghosted) AS ghosted_deals,
  COUNTIF(is_not_3pl_match) AS non_3pl_deals,

  -- Percentages
  ROUND(SAFE_DIVIDE(COUNTIF(is_at_risk), COUNT(*)) * 100, 1) AS at_risk_pct,
  ROUND(SAFE_DIVIDE(SUM(CASE WHEN is_at_risk THEN arr_value ELSE 0 END), SUM(arr_value)) * 100, 1) AS at_risk_arr_pct

FROM `octup-testing.hubspot_data.v_deals_at_risk`
GROUP BY owner_name, owner_email
ORDER BY at_risk_value DESC;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Test v_deals_at_risk:
-- SELECT * FROM `octup-testing.hubspot_data.v_deals_at_risk` WHERE is_at_risk = TRUE LIMIT 10;

-- Test v_daily_deal_movements:
-- SELECT * FROM `octup-testing.hubspot_data.v_daily_deal_movements` WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) LIMIT 20;

-- Test v_stalled_deals_alert:
-- SELECT * FROM `octup-testing.hubspot_data.v_stalled_deals_alert` LIMIT 10;
