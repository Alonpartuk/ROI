"""
Deploy enhanced AI Summary views to BigQuery
Updated: Now includes Chanan pending rebook logic
"""
from google.cloud import bigquery

def deploy_views():
    client = bigquery.Client(project='octup-testing')

    # First, deploy v_deals_at_risk with the new pending_rebook flag
    v_deals_at_risk = """
    CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_deals_at_risk` AS
    WITH latest_deals AS (
      SELECT *
      FROM `octup-testing.hubspot_data.deals_snapshots`
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
        AND pipeline_label = '3PL New Business'
        AND is_open = TRUE
    ),
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
        dm.next_meeting_scheduled,
        dm.last_meeting_date,
        dm.recent_meetings_count,
        DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) AS days_since_last_activity,
        CASE WHEN COALESCE(d.hs_arr, d.amount) >= 100000 THEN TRUE ELSE FALSE END AS is_enterprise,
        CASE WHEN dm.next_meeting_scheduled IS NOT NULL THEN TRUE ELSE FALSE END AS has_upcoming_meeting,
        CASE WHEN DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) <= 7 THEN TRUE ELSE FALSE END AS has_recent_activity,
        -- Ownership Risk (Kurt/Hanan/Deactivated - NOT Chanan)
        CASE
          WHEN LOWER(d.owner_name) LIKE '%kurt%'
            OR LOWER(d.owner_name) LIKE '%hanan%'
            OR LOWER(d.owner_name) LIKE '%deactivated%'
          THEN TRUE
          ELSE FALSE
        END AS is_unassigned_risk,
        -- Pending Rebook (Chanan's deals)
        CASE
          WHEN LOWER(d.owner_name) LIKE '%chanan%' THEN TRUE
          ELSE FALSE
        END AS is_pending_rebook,
        -- Stalled
        CASE
          WHEN dm.next_meeting_scheduled IS NOT NULL THEN FALSE
          WHEN DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) <= 7 THEN FALSE
          WHEN COALESCE(d.hs_arr, d.amount) >= 100000 AND d.days_in_current_stage > 30 THEN TRUE
          WHEN COALESCE(d.hs_arr, d.amount) < 100000 AND d.days_in_current_stage > 14 THEN TRUE
          ELSE FALSE
        END AS is_stalled,
        -- Ghosted
        CASE
          WHEN dm.next_meeting_scheduled IS NOT NULL THEN FALSE
          WHEN DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) <= 7 THEN FALSE
          WHEN COALESCE(d.hs_arr, d.amount) >= 100000
            AND (d.notes_last_contacted IS NULL OR DATE_DIFF(CURRENT_DATE(), DATE(d.notes_last_contacted), DAY) > 10)
            AND DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) > 10
          THEN TRUE
          WHEN COALESCE(d.hs_arr, d.amount) < 100000
            AND (d.notes_last_contacted IS NULL OR DATE_DIFF(CURRENT_DATE(), DATE(d.notes_last_contacted), DAY) > 5)
            AND DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) > 5
          THEN TRUE
          ELSE FALSE
        END AS is_ghosted,
        -- Not 3PL Match
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
        -- Stalled Delayed
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
      (is_unassigned_risk OR is_stalled OR is_ghosted OR is_not_3pl_match) AS is_at_risk,
      CASE
        WHEN is_pending_rebook THEN 'Pending Rebook (Chanan)'
        WHEN is_unassigned_risk THEN 'Ownership Risk'
        WHEN is_stalled AND is_ghosted THEN 'Stalled & Ghosted'
        WHEN is_stalled THEN CASE WHEN is_enterprise THEN 'Stalled (>30 days - Enterprise)' ELSE 'Stalled (>14 days)' END
        WHEN is_ghosted THEN CASE WHEN is_enterprise THEN 'Ghosted (>10 days - Enterprise)' ELSE 'Ghosted (>5 days)' END
        WHEN is_not_3pl_match THEN 'Not 3PL Match'
        ELSE 'Healthy'
      END AS primary_risk_reason,
      (CASE WHEN is_unassigned_risk THEN 1 ELSE 0 END +
       CASE WHEN is_stalled THEN 1 ELSE 0 END +
       CASE WHEN is_ghosted THEN 1 ELSE 0 END +
       CASE WHEN is_not_3pl_match THEN 1 ELSE 0 END) AS risk_flag_count
    FROM risk_flags
    ORDER BY arr_value DESC
    """

    print("Deploying v_deals_at_risk (with pending_rebook)...")
    client.query(v_deals_at_risk).result()
    print("[OK] v_deals_at_risk deployed successfully")

    # Deploy v_pending_rebook_summary view
    v_pending_rebook_summary = """
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
    WHERE is_pending_rebook = TRUE
    """

    print("Deploying v_pending_rebook_summary...")
    client.query(v_pending_rebook_summary).result()
    print("[OK] v_pending_rebook_summary deployed successfully")

    # View: Enhanced v_weekly_summary_data with pending_rebook metrics
    v_weekly_summary_data = """
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
    risk_analysis AS (
      SELECT
        COUNT(*) AS total_open_deals,
        COUNTIF(is_at_risk) AS at_risk_count,
        SUM(IF(is_at_risk, arr_value, 0)) AS at_risk_arr,
        COUNTIF(is_enterprise) AS enterprise_deals_count,
        SUM(IF(is_enterprise, arr_value, 0)) AS enterprise_arr,
        COUNTIF(NOT is_enterprise) AS standard_deals_count,
        SUM(IF(NOT is_enterprise, arr_value, 0)) AS standard_arr,
        COUNTIF(has_upcoming_meeting) AS deals_with_meetings,
        SUM(IF(has_upcoming_meeting, arr_value, 0)) AS arr_with_meetings,
        COUNTIF(has_recent_activity) AS deals_with_recent_activity,
        SUM(IF(has_recent_activity, arr_value, 0)) AS arr_with_recent_activity,
        COUNTIF(is_unassigned_risk) AS ownership_risk_count,
        SUM(IF(is_unassigned_risk, arr_value, 0)) AS ownership_risk_arr,
        COUNTIF(is_stalled) AS stalled_count,
        SUM(IF(is_stalled, arr_value, 0)) AS stalled_arr,
        COUNTIF(is_ghosted) AS ghosted_count,
        SUM(IF(is_ghosted, arr_value, 0)) AS ghosted_arr,
        COUNTIF(is_not_3pl_match) AS not_3pl_count,
        SUM(IF(is_not_3pl_match, arr_value, 0)) AS not_3pl_arr,
        -- Pending Rebook (Chanan)
        COUNTIF(is_pending_rebook) AS pending_rebook_count,
        SUM(IF(is_pending_rebook, arr_value, 0)) AS pending_rebook_arr,
        ROUND(AVG(IF(is_pending_rebook, days_in_current_stage, NULL)), 1) AS avg_days_pending_rebook,
        COUNTIF(is_enterprise AND is_stalled) AS enterprise_stalled_count,
        SUM(IF(is_enterprise AND is_stalled, arr_value, 0)) AS enterprise_stalled_arr,
        COUNTIF(NOT is_at_risk AND NOT is_pending_rebook) AS healthy_count,
        SUM(IF(NOT is_at_risk AND NOT is_pending_rebook, arr_value, 0)) AS healthy_arr,
        ROUND(AVG(days_in_current_stage), 1) AS avg_days_in_stage_all,
        ROUND(AVG(IF(is_enterprise, days_in_current_stage, NULL)), 1) AS avg_days_enterprise,
        ROUND(AVG(IF(NOT is_enterprise, days_in_current_stage, NULL)), 1) AS avg_days_standard,
        ROUND(AVG(days_since_last_activity), 1) AS avg_days_since_activity
      FROM `octup-testing.hubspot_data.v_deals_at_risk`
    ),
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
        AND days_in_current_stage > 14
    ),
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
      r.pending_rebook_count,
      r.pending_rebook_arr,
      r.avg_days_pending_rebook,
      r.enterprise_stalled_count,
      r.enterprise_stalled_arr,
      r.healthy_count,
      r.healthy_arr,
      r.avg_days_since_activity,
      (SELECT top_risk_deals_list FROM top_at_risk_deals) AS top_at_risk_deals,
      (SELECT upcoming_meetings_list FROM deals_with_meetings) AS upcoming_meetings,
      (SELECT recent_activity_list FROM recent_activity_deals) AS deals_saved_by_activity,
      (SELECT pending_rebook_list FROM pending_rebook_deals) AS pending_rebook_deals
    FROM current_data c, previous_data p, risk_analysis r
    """

    print("Deploying v_weekly_summary_data (with pending_rebook)...")
    client.query(v_weekly_summary_data).result()
    print("[OK] v_weekly_summary_data deployed successfully")

    # Enhanced fn_generate_ceo_summary with Chanan context
    fn_generate_ceo_summary = '''
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
            'Enterprise deals (>$100K) have longer sales cycles and different thresholds.\\n\\n',

            '===== PIPELINE OVERVIEW (Report Date: ', CAST(report_date AS STRING), ') =====\\n',
            '- Total Open Deals: ', CAST(current_open_deals AS STRING), '\\n',
            '- Total Pipeline Value: $', CAST(ROUND(current_pipeline_value, 0) AS STRING), '\\n',
            '- Weighted Pipeline: $', CAST(ROUND(current_weighted_pipeline, 0) AS STRING), '\\n',
            '- Won This Period: $', CAST(ROUND(current_won_value, 0) AS STRING), '\\n',
            '- Win Rate: ', CAST(current_win_rate AS STRING), '%\\n',
            '- Avg Days in Current Stage: ', CAST(ROUND(current_avg_days_in_stage, 1) AS STRING), '\\n\\n',

            '===== ENTERPRISE VS STANDARD DEALS =====\\n',
            '- Enterprise Deals (>=$100K ARR): ', CAST(enterprise_deals_count AS STRING), ' deals worth $', CAST(ROUND(enterprise_arr, 0) AS STRING), '\\n',
            '  These have longer sales cycles; 30-day stalled threshold vs 14 days for standard\\n',
            '- Standard Deals (<$100K ARR): ', CAST(standard_deals_count AS STRING), ' deals worth $', CAST(ROUND(standard_arr, 0) AS STRING), '\\n\\n',

            '===== DEAL ACTIVITY & ENGAGEMENT =====\\n',
            '- Deals with Upcoming Meetings Scheduled: ', CAST(deals_with_meetings AS STRING), ' worth $', CAST(ROUND(arr_with_meetings, 0) AS STRING), '\\n',
            '  These deals are ACTIVE and should NOT be flagged as stalled\\n',
            '  Upcoming meetings: ', COALESCE(upcoming_meetings, 'None'), '\\n\\n',
            '- Deals with Recent Activity (last 7 days): ', CAST(deals_with_recent_activity AS STRING), ' worth $', CAST(ROUND(arr_with_recent_activity, 0) AS STRING), '\\n',
            '  These show engagement even if stage has not changed\\n',
            '  Deals saved from stalled flag by activity: ', COALESCE(deals_saved_by_activity, 'None'), '\\n\\n',
            '- Average Days Since Last Activity: ', CAST(avg_days_since_activity AS STRING), ' days\\n\\n',

            '===== PENDING REBOOK (Chanan) =====\\n',
            'IMPORTANT: Chanan is NOT an inactive owner - he actively works on rebooking meetings\\n',
            'Deals assigned to Chanan = First meeting did not happen OR meeting scheduled too far out\\n',
            'Chanans job: Rebook these meetings with the sales team (AEs)\\n',
            'GOAL: Chanan should have 0 deals - all should be rebooked with AEs\\n\\n',
            '- Pending Rebook: ', CAST(pending_rebook_count AS STRING), ' deals worth $', CAST(ROUND(pending_rebook_arr, 0) AS STRING), '\\n',
            '- Avg Days Pending: ', CAST(COALESCE(avg_days_pending_rebook, 0) AS STRING), ' days\\n',
            '- Deals: ', COALESCE(pending_rebook_deals, 'None'), '\\n\\n',

            '===== HEALTHY PIPELINE =====\\n',
            '- Healthy Deals (no risk flags, not pending rebook): ', CAST(healthy_count AS STRING), ' deals worth $', CAST(ROUND(healthy_arr, 0) AS STRING), '\\n',
            '  These deals have recent activity, meetings scheduled, or are progressing normally\\n\\n',

            '===== RISK BREAKDOWN (Detailed) =====\\n',
            '- OWNERSHIP RISK (Kurt/Hanan/Deactivated - NOT Chanan): ', CAST(ownership_risk_count AS STRING), ' deals worth $', CAST(ROUND(ownership_risk_arr, 0) AS STRING), '\\n',
            '  These need immediate reassignment to active reps\\n',
            '  These are truly orphaned deals with no active owner working them\\n\\n',
            '- STALLED DEALS (no stage movement beyond threshold): ', CAST(stalled_count AS STRING), ' deals worth $', CAST(ROUND(stalled_arr, 0) AS STRING), '\\n',
            '  Enterprise stalled (>30 days): ', CAST(enterprise_stalled_count AS STRING), ' worth $', CAST(ROUND(enterprise_stalled_arr, 0) AS STRING), '\\n',
            '  Standard stalled (>14 days): ', CAST(stalled_count - enterprise_stalled_count AS STRING), ' worth $', CAST(ROUND(stalled_arr - enterprise_stalled_arr, 0) AS STRING), '\\n\\n',
            '- GHOSTED DEALS (no engagement): ', CAST(ghosted_count AS STRING), ' deals worth $', CAST(ROUND(ghosted_arr, 0) AS STRING), '\\n',
            '  No contact or activity beyond threshold (10 days enterprise, 5 days standard)\\n\\n',
            '- NOT 3PL MATCH (prospect may not be target customer): ', CAST(not_3pl_count AS STRING), ' deals worth $', CAST(ROUND(not_3pl_arr, 0) AS STRING), '\\n',
            '  Company does not match logistics/fulfillment/warehouse industry keywords\\n\\n',
            '- TOP AT-RISK DEALS: ', COALESCE(top_at_risk_deals, 'None'), '\\n\\n',

            '===== WEEK-OVER-WEEK CHANGES =====\\n',
            '- Pipeline Change: $', CAST(ROUND(pipeline_change, 0) AS STRING), ' (', CAST(pipeline_change_pct AS STRING), '%)\\n',
            '- Previous Week Open Deals: ', CAST(previous_open_deals AS STRING), '\\n',
            '- Previous Week Pipeline: $', CAST(ROUND(previous_pipeline_value, 0) AS STRING), '\\n',
            '- Deals with Slipped Close Dates: ', CAST(deals_slipped AS STRING), ' worth $', CAST(ROUND(slipped_value, 0) AS STRING), '\\n\\n',

            '===== TOP PERFORMERS =====\\n',
            top_owners_summary, '\\n\\n',

            '===== ANALYSIS REQUEST =====\\n',
            'Please provide:\\n',
            '1. EXECUTIVE SUMMARY (2-3 sentences on overall pipeline health)\\n',
            '2. KEY WINS & POSITIVE SIGNALS (bullet points)\\n',
            '   - Highlight deals with upcoming meetings or recent activity\\n',
            '   - Note any enterprise deals progressing well\\n',
            '3. RISKS & CONCERNS (bullet points)\\n',
            '   - Be specific about which deals need attention\\n',
            '   - Distinguish between ownership risk vs engagement risk\\n',
            '   - Note if enterprise deals are stalling (these need white-glove attention)\\n',
            '4. PENDING REBOOK STATUS (Chanan queue)\\n',
            '   - If Chanan has deals, note how many and total ARR\\n',
            '   - Goal is for Chanan to have 0 deals (all rebooked with AEs)\\n',
            '   - Flag any deals that have been pending rebook for too long\\n',
            '5. RECOMMENDED ACTIONS (3-4 specific, actionable items)\\n',
            '   - Prioritize ownership risk (reassignments from Kurt/Hanan/Deactivated)\\n',
            '   - Help Chanan rebook high-value deals with AEs\\n',
            '   - Suggest outreach for ghosted deals\\n',
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
    )
    '''

    # Check if gemini model exists before deploying model-dependent functions
    try:
        print("Deploying fn_generate_ceo_summary (with Chanan context)...")
        client.query(fn_generate_ceo_summary).result()
        print("[OK] fn_generate_ceo_summary deployed successfully")

        # Update v_ceo_ai_summary view
        v_ceo_ai_summary = """
        CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_ceo_ai_summary` AS
        SELECT
          CURRENT_TIMESTAMP() AS generated_at,
          summary
        FROM `octup-testing.hubspot_data.fn_generate_ceo_summary`()
        """

        print("Deploying v_ceo_ai_summary...")
        client.query(v_ceo_ai_summary).result()
        print("[OK] v_ceo_ai_summary deployed successfully")
    except Exception as e:
        if "gemini_pro_model" in str(e) or "Not found: Model" in str(e):
            print("[SKIP] fn_generate_ceo_summary and v_ceo_ai_summary skipped")
            print("       Reason: gemini_pro_model not found. Run gemini_setup.sql first to create the model.")
            print("       The v_weekly_summary_data view is ready - it provides the enhanced data.")
        else:
            raise e

    print("\n" + "="*60)
    print("DEPLOYMENT COMPLETE!")
    print("="*60)
    print("\nDeployed views:")
    print("  - v_deals_at_risk (with is_pending_rebook flag)")
    print("  - v_pending_rebook_summary (Chanan's rebook queue)")
    print("  - v_weekly_summary_data (with pending_rebook metrics)")
    print("\nKey changes:")
    print("  - Chanan deals are now 'Pending Rebook' (NOT ownership risk)")
    print("  - Goal: Chanan should have 0 deals (all rebooked with AEs)")
    print("  - AI prompt now understands Chanan's rebook coordinator role")
    print("="*60)

if __name__ == "__main__":
    deploy_views()
