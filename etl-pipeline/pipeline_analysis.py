"""
Sales & Pipeline Analysis Report
"""
from google.cloud import bigquery
from datetime import datetime

def run_analysis():
    client = bigquery.Client(project='octup-testing')

    print("=" * 80)
    print("SALES & PIPELINE ANALYSIS REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 80)

    # 1. Pipeline Overview
    print("\n" + "=" * 80)
    print("1. PIPELINE OVERVIEW")
    print("=" * 80)

    overview_query = """
    SELECT
      snapshot_date,
      COUNT(*) as total_deals,
      COUNTIF(is_open) as open_deals,
      COUNTIF(is_won) as won_deals,
      COUNTIF(is_lost) as lost_deals,
      ROUND(SUM(IF(is_open, amount, 0)), 0) as open_pipeline,
      ROUND(SUM(IF(is_open, weighted_amount, 0)), 0) as weighted_pipeline,
      ROUND(SUM(IF(is_won, amount, 0)), 0) as won_value,
      ROUND(AVG(IF(is_open, days_in_current_stage, NULL)), 1) as avg_days_in_stage,
      ROUND(SAFE_DIVIDE(COUNTIF(is_won), COUNTIF(is_won OR is_lost)) * 100, 1) as win_rate
    FROM `octup-testing.hubspot_data.deals_snapshots`
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
      AND pipeline_label = '3PL New Business'
    GROUP BY snapshot_date
    """
    result = client.query(overview_query).result()
    for row in result:
        print(f"\nReport Date: {row.snapshot_date}")
        print(f"Total Deals: {row.total_deals}")
        print(f"Open Deals: {row.open_deals}")
        print(f"Won Deals: {row.won_deals}")
        print(f"Lost Deals: {row.lost_deals}")
        print(f"\nOpen Pipeline Value: ${row.open_pipeline:,.0f}")
        print(f"Weighted Pipeline: ${row.weighted_pipeline:,.0f}")
        print(f"Total Won Value: ${row.won_value:,.0f}")
        print(f"\nAvg Days in Current Stage: {row.avg_days_in_stage}")
        print(f"Win Rate: {row.win_rate}%")

    # 2. Pipeline by Stage
    print("\n" + "=" * 80)
    print("2. PIPELINE BY STAGE")
    print("=" * 80)

    stage_query = """
    SELECT
      dealstage_label,
      COUNT(*) as deals,
      ROUND(SUM(amount), 0) as total_value,
      ROUND(AVG(amount), 0) as avg_deal_size,
      ROUND(AVG(days_in_current_stage), 1) as avg_days
    FROM `octup-testing.hubspot_data.deals_snapshots`
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
      AND pipeline_label = '3PL New Business'
      AND is_open = TRUE
    GROUP BY dealstage_label
    ORDER BY total_value DESC
    """
    result = client.query(stage_query).result()
    print(f"\n{'Stage':<35} {'Deals':>6} {'Value':>15} {'Avg Size':>12} {'Avg Days':>10}")
    print("-" * 80)
    for row in result:
        print(f"{row.dealstage_label:<35} {row.deals:>6} ${row.total_value:>13,.0f} ${row.avg_deal_size:>10,.0f} {row.avg_days:>10}")

    # 3. Enterprise vs Standard Breakdown
    print("\n" + "=" * 80)
    print("3. ENTERPRISE VS STANDARD DEALS")
    print("=" * 80)

    enterprise_query = """
    SELECT
      CASE WHEN COALESCE(hs_arr, amount) >= 100000 THEN 'Enterprise (>=$100K)' ELSE 'Standard (<$100K)' END as deal_type,
      COUNT(*) as deals,
      ROUND(SUM(COALESCE(hs_arr, amount)), 0) as total_arr,
      ROUND(AVG(COALESCE(hs_arr, amount)), 0) as avg_arr,
      ROUND(AVG(days_in_current_stage), 1) as avg_days
    FROM `octup-testing.hubspot_data.deals_snapshots`
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
      AND pipeline_label = '3PL New Business'
      AND is_open = TRUE
    GROUP BY deal_type
    ORDER BY total_arr DESC
    """
    result = client.query(enterprise_query).result()
    print(f"\n{'Deal Type':<25} {'Deals':>6} {'Total ARR':>15} {'Avg ARR':>12} {'Avg Days':>10}")
    print("-" * 70)
    for row in result:
        print(f"{row.deal_type:<25} {row.deals:>6} ${row.total_arr:>13,.0f} ${row.avg_arr:>10,.0f} {row.avg_days:>10}")

    # 4. Risk Analysis
    print("\n" + "=" * 80)
    print("4. RISK ANALYSIS")
    print("=" * 80)

    risk_query = """
    SELECT
      primary_risk_reason,
      COUNT(*) as deals,
      ROUND(SUM(arr_value), 0) as total_arr,
      STRING_AGG(CONCAT(dealname, ' ($', CAST(ROUND(arr_value/1000,0) AS STRING), 'K)'), ', ' ORDER BY arr_value DESC LIMIT 3) as top_deals
    FROM `octup-testing.hubspot_data.v_deals_at_risk`
    GROUP BY primary_risk_reason
    ORDER BY total_arr DESC
    """
    result = client.query(risk_query).result()
    print(f"\n{'Risk Category':<35} {'Deals':>6} {'ARR at Risk':>15}")
    print("-" * 60)
    for row in result:
        print(f"{row.primary_risk_reason:<35} {row.deals:>6} ${row.total_arr:>13,.0f}")
        if row.primary_risk_reason != 'Healthy':
            print(f"   Top deals: {row.top_deals[:80]}...")

    # 5. Activity & Engagement
    print("\n" + "=" * 80)
    print("5. ACTIVITY & ENGAGEMENT METRICS")
    print("=" * 80)

    activity_query = """
    SELECT
      COUNTIF(has_recent_activity) as deals_with_activity,
      ROUND(SUM(IF(has_recent_activity, arr_value, 0)), 0) as arr_with_activity,
      COUNTIF(has_upcoming_meeting) as deals_with_meetings,
      ROUND(SUM(IF(has_upcoming_meeting, arr_value, 0)), 0) as arr_with_meetings,
      ROUND(AVG(days_since_last_activity), 1) as avg_days_since_activity,
      COUNTIF(days_since_last_activity <= 3) as very_active,
      COUNTIF(days_since_last_activity > 7) as inactive
    FROM `octup-testing.hubspot_data.v_deals_at_risk`
    """
    result = client.query(activity_query).result()
    for row in result:
        print(f"\nDeals with Recent Activity (7 days): {row.deals_with_activity} worth ${row.arr_with_activity:,.0f}")
        print(f"Deals with Upcoming Meetings: {row.deals_with_meetings} worth ${row.arr_with_meetings:,.0f}")
        print(f"Average Days Since Last Activity: {row.avg_days_since_activity}")
        print(f"Very Active (<=3 days): {row.very_active} deals")
        print(f"Inactive (>7 days): {row.inactive} deals")

    # 6. Owner Performance
    print("\n" + "=" * 80)
    print("6. OWNER PERFORMANCE")
    print("=" * 80)

    owner_query = """
    SELECT
      owner_name,
      COUNT(*) as open_deals,
      ROUND(SUM(arr_value), 0) as pipeline_arr,
      COUNTIF(is_at_risk) as at_risk_deals,
      ROUND(SUM(IF(is_at_risk, arr_value, 0)), 0) as at_risk_arr,
      ROUND(AVG(days_in_current_stage), 1) as avg_days
    FROM `octup-testing.hubspot_data.v_deals_at_risk`
    GROUP BY owner_name
    HAVING pipeline_arr > 0
    ORDER BY pipeline_arr DESC
    LIMIT 10
    """
    result = client.query(owner_query).result()
    print(f"\n{'Owner':<25} {'Deals':>6} {'Pipeline':>12} {'At Risk':>8} {'Risk ARR':>12} {'Avg Days':>9}")
    print("-" * 75)
    for row in result:
        print(f"{row.owner_name[:25]:<25} {row.open_deals:>6} ${row.pipeline_arr:>10,.0f} {row.at_risk_deals:>8} ${row.at_risk_arr:>10,.0f} {row.avg_days:>9}")

    # 7. Top Deals
    print("\n" + "=" * 80)
    print("7. TOP 10 DEALS BY VALUE")
    print("=" * 80)

    top_deals_query = """
    SELECT
      dealname,
      ROUND(arr_value, 0) as arr,
      owner_name,
      dealstage_label,
      days_in_current_stage,
      primary_risk_reason,
      has_recent_activity,
      has_upcoming_meeting
    FROM `octup-testing.hubspot_data.v_deals_at_risk`
    ORDER BY arr_value DESC
    LIMIT 10
    """
    result = client.query(top_deals_query).result()
    print(f"\n{'Deal Name':<35} {'ARR':>10} {'Owner':<15} {'Stage':<20} {'Days':>5} {'Status':<15}")
    print("-" * 105)
    for row in result:
        status = row.primary_risk_reason if row.primary_risk_reason != 'Healthy' else ('Active' if row.has_recent_activity else 'Healthy')
        print(f"{row.dealname[:35]:<35} ${row.arr:>8,.0f} {row.owner_name[:15]:<15} {row.dealstage_label[:20]:<20} {row.days_in_current_stage:>5} {status[:15]:<15}")

    # 8. Deals Needing Attention
    print("\n" + "=" * 80)
    print("8. DEALS NEEDING IMMEDIATE ATTENTION")
    print("=" * 80)

    attention_query = """
    SELECT
      dealname,
      ROUND(arr_value, 0) as arr,
      owner_name,
      primary_risk_reason,
      days_in_current_stage,
      days_since_last_activity
    FROM `octup-testing.hubspot_data.v_deals_at_risk`
    WHERE is_at_risk = TRUE
      AND primary_risk_reason != 'Not 3PL Match'
    ORDER BY arr_value DESC
    LIMIT 15
    """
    result = client.query(attention_query).result()
    print(f"\n{'Deal Name':<35} {'ARR':>10} {'Owner':<15} {'Risk Reason':<25} {'Days':>5}")
    print("-" * 95)
    for row in result:
        print(f"{row.dealname[:35]:<35} ${row.arr:>8,.0f} {row.owner_name[:15]:<15} {row.primary_risk_reason[:25]:<25} {row.days_in_current_stage:>5}")

    # 9. Week-over-Week Changes
    print("\n" + "=" * 80)
    print("9. WEEK-OVER-WEEK CHANGES")
    print("=" * 80)

    wow_query = """
    WITH current_week AS (
      SELECT
        SUM(IF(is_open, amount, 0)) as pipeline,
        COUNTIF(is_open) as open_deals,
        COUNTIF(is_won) as won_deals,
        SUM(IF(is_won, amount, 0)) as won_value
      FROM `octup-testing.hubspot_data.deals_snapshots`
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
        AND pipeline_label = '3PL New Business'
    ),
    prev_week AS (
      SELECT
        SUM(IF(is_open, amount, 0)) as pipeline,
        COUNTIF(is_open) as open_deals,
        COUNTIF(is_won) as won_deals,
        SUM(IF(is_won, amount, 0)) as won_value
      FROM `octup-testing.hubspot_data.deals_snapshots`
      WHERE snapshot_date = DATE_SUB((SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`), INTERVAL 7 DAY)
        AND pipeline_label = '3PL New Business'
    )
    SELECT
      c.pipeline as current_pipeline,
      p.pipeline as prev_pipeline,
      c.pipeline - p.pipeline as pipeline_change,
      ROUND((c.pipeline - p.pipeline) / NULLIF(p.pipeline, 0) * 100, 1) as pipeline_change_pct,
      c.open_deals as current_deals,
      p.open_deals as prev_deals,
      c.won_value as current_won,
      p.won_value as prev_won
    FROM current_week c, prev_week p
    """
    result = client.query(wow_query).result()
    for row in result:
        print(f"\nPipeline Value:")
        print(f"  Current: ${row.current_pipeline:,.0f}")
        print(f"  Previous Week: ${row.prev_pipeline:,.0f}")
        change_indicator = "+" if row.pipeline_change >= 0 else ""
        print(f"  Change: {change_indicator}${row.pipeline_change:,.0f} ({change_indicator}{row.pipeline_change_pct}%)")
        print(f"\nOpen Deals: {row.current_deals} (was {row.prev_deals})")
        print(f"Won Value: ${row.current_won:,.0f} (was ${row.prev_won:,.0f})")

    # 10. Summary & Recommendations
    print("\n" + "=" * 80)
    print("10. KEY INSIGHTS & RECOMMENDATIONS")
    print("=" * 80)

    insights_query = """
    SELECT
      COUNT(*) as total_deals,
      ROUND(SUM(arr_value), 0) as total_arr,
      COUNTIF(is_at_risk) as at_risk_count,
      ROUND(SUM(IF(is_at_risk, arr_value, 0)), 0) as at_risk_arr,
      COUNTIF(is_unassigned_risk) as ownership_risk,
      ROUND(SUM(IF(is_unassigned_risk, arr_value, 0)), 0) as ownership_arr,
      COUNTIF(is_stalled) as stalled,
      COUNTIF(is_ghosted) as ghosted,
      COUNTIF(has_recent_activity) as active_deals,
      COUNTIF(NOT is_at_risk) as healthy_deals
    FROM `octup-testing.hubspot_data.v_deals_at_risk`
    """
    result = client.query(insights_query).result()
    for row in result:
        healthy_pct = round(row.healthy_deals / row.total_deals * 100, 1)
        at_risk_pct = round(row.at_risk_count / row.total_deals * 100, 1)

        print(f"\nPIPELINE HEALTH SCORE: {healthy_pct}% Healthy")
        print(f"\nKEY METRICS:")
        print(f"  - Total Pipeline: ${row.total_arr:,.0f} across {row.total_deals} deals")
        print(f"  - Healthy Deals: {row.healthy_deals} ({healthy_pct}%)")
        print(f"  - At-Risk Deals: {row.at_risk_count} ({at_risk_pct}%) worth ${row.at_risk_arr:,.0f}")
        print(f"  - Active Deals (recent activity): {row.active_deals}")

        print(f"\nACTION ITEMS:")
        if row.ownership_risk > 0:
            print(f"  1. URGENT: Reassign {row.ownership_risk} deals (${row.ownership_arr:,.0f}) from inactive owners")
        if row.stalled > 0:
            print(f"  2. Review {row.stalled} stalled deals - need stage progression or close")
        if row.ghosted > 0:
            print(f"  3. Re-engage {row.ghosted} ghosted deals - schedule follow-up calls")
        print(f"  4. Maintain momentum on {row.active_deals} active deals with recent engagement")

    print("\n" + "=" * 80)
    print("END OF REPORT")
    print("=" * 80)

if __name__ == "__main__":
    run_analysis()
