"""
Q1 Target Progress Report - $1.6M ARR Target
"""
from google.cloud import bigquery
from datetime import datetime, date

Q1_TARGET = 1600000  # $1.6M ARR

def generate_report():
    client = bigquery.Client(project='octup-testing')

    print("=" * 80)
    print("Q1 2026 TARGET PROGRESS REPORT")
    print(f"Target: ${Q1_TARGET:,.0f} ARR")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 80)

    # Query 1: Current snapshot overview
    overview_query = """
    WITH current_snapshot AS (
      SELECT *
      FROM `octup-testing.hubspot_data.deals_snapshots`
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
        AND pipeline_label = '3PL New Business'
    ),
    q1_won AS (
      SELECT
        SUM(COALESCE(hs_arr, amount)) as won_arr,
        COUNT(*) as won_count
      FROM current_snapshot
      WHERE is_won = TRUE
        AND closedate >= '2026-01-01'
        AND closedate < '2026-04-01'
    )
    SELECT
      (SELECT won_arr FROM q1_won) as q1_won_arr,
      (SELECT won_count FROM q1_won) as q1_won_deals,
      SUM(IF(is_open, COALESCE(hs_arr, amount), 0)) as open_pipeline_arr,
      COUNTIF(is_open) as open_deals,
      SUM(IF(is_open, weighted_amount, 0)) as weighted_pipeline,
      MAX(snapshot_date) as report_date
    FROM current_snapshot
    """

    result = client.query(overview_query).result()
    for row in result:
        q1_won = row.q1_won_arr or 0
        open_pipeline = row.open_pipeline_arr or 0
        weighted = row.weighted_pipeline or 0

        remaining_target = Q1_TARGET - q1_won
        pct_achieved = (q1_won / Q1_TARGET) * 100

        # Calculate days remaining in Q1
        today = date.today()
        q1_end = date(2026, 3, 31)
        days_remaining = (q1_end - today).days
        days_in_q1 = 90
        days_elapsed = days_in_q1 - days_remaining

        print(f"\n--- TARGET PROGRESS ---")
        print(f"Q1 Target:           ${Q1_TARGET:>12,.0f}")
        print(f"Q1 Won (YTD):        ${q1_won:>12,.0f}")
        print(f"Remaining to Target: ${remaining_target:>12,.0f}")
        print(f"Achievement:         {pct_achieved:>12.1f}%")

        print(f"\n--- TIME REMAINING ---")
        print(f"Days Elapsed:        {days_elapsed:>12} days")
        print(f"Days Remaining:      {days_remaining:>12} days")
        print(f"Expected Run Rate:   ${(Q1_TARGET / days_in_q1 * days_elapsed):>12,.0f} (where we should be)")

        run_rate_variance = q1_won - (Q1_TARGET / days_in_q1 * days_elapsed)
        if run_rate_variance >= 0:
            print(f"Status:              AHEAD by ${run_rate_variance:,.0f}")
        else:
            print(f"Status:              BEHIND by ${abs(run_rate_variance):,.0f}")

        print(f"\n--- PIPELINE COVERAGE ---")
        print(f"Open Pipeline:       ${open_pipeline:>12,.0f}")
        print(f"Weighted Pipeline:   ${weighted:>12,.0f}")
        print(f"Coverage Ratio:      {open_pipeline / remaining_target:>12.1f}x (need {remaining_target:,.0f})")

        # Calculate required close rate
        if days_remaining > 0:
            required_daily = remaining_target / days_remaining
            required_weekly = required_daily * 7
            print(f"\n--- REQUIRED RUN RATE ---")
            print(f"Need to Close Daily: ${required_daily:>12,.0f}")
            print(f"Need to Close Weekly:${required_weekly:>12,.0f}")

    # Query 2: Won deals this quarter
    won_query = """
    SELECT
      dealname,
      ROUND(COALESCE(hs_arr, amount), 0) as arr,
      owner_name,
      closedate
    FROM `octup-testing.hubspot_data.deals_snapshots`
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
      AND pipeline_label = '3PL New Business'
      AND is_won = TRUE
      AND closedate >= '2026-01-01'
      AND closedate < '2026-04-01'
    ORDER BY arr DESC
    LIMIT 10
    """

    print(f"\n--- Q1 CLOSED WON DEALS ---")
    result = client.query(won_query).result()
    rows = list(result)
    if rows:
        print(f"{'Deal Name':<40} {'ARR':>12} {'Owner':<20} {'Close Date'}")
        print("-" * 85)
        for row in rows:
            print(f"{row.dealname[:40]:<40} ${row.arr:>10,.0f} {row.owner_name[:20]:<20} {row.closedate}")
    else:
        print("No deals closed won in Q1 yet.")

    # Query 3: High-value deals in pipeline
    pipeline_query = """
    SELECT
      dealname,
      ROUND(COALESCE(hs_arr, amount), 0) as arr,
      owner_name,
      dealstage_label,
      closedate,
      days_in_current_stage
    FROM `octup-testing.hubspot_data.deals_snapshots`
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
      AND pipeline_label = '3PL New Business'
      AND is_open = TRUE
      AND closedate < '2026-04-01'
    ORDER BY COALESCE(hs_arr, amount) DESC
    LIMIT 15
    """

    print(f"\n--- TOP DEALS EXPECTED TO CLOSE IN Q1 ---")
    result = client.query(pipeline_query).result()
    rows = list(result)
    if rows:
        total_q1_pipeline = 0
        print(f"{'Deal Name':<35} {'ARR':>10} {'Owner':<15} {'Stage':<20} {'Close Date'}")
        print("-" * 95)
        for row in rows:
            total_q1_pipeline += row.arr
            print(f"{row.dealname[:35]:<35} ${row.arr:>8,.0f} {row.owner_name[:15]:<15} {row.dealstage_label[:20]:<20} {row.closedate}")
        print("-" * 95)
        print(f"{'TOTAL Q1 PIPELINE':<35} ${total_q1_pipeline:>8,.0f}")

    # Query 4: Risk breakdown for Q1 deals
    risk_query = """
    SELECT
      primary_risk_reason,
      COUNT(*) as deals,
      ROUND(SUM(arr_value), 0) as total_arr
    FROM `octup-testing.hubspot_data.v_deals_at_risk`
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    GROUP BY primary_risk_reason
    ORDER BY total_arr DESC
    """

    print(f"\n--- PIPELINE RISK BREAKDOWN ---")
    try:
        result = client.query(risk_query).result()
        print(f"{'Risk Category':<35} {'Deals':>6} {'ARR':>15}")
        print("-" * 60)
        for row in result:
            print(f"{row.primary_risk_reason:<35} {row.deals:>6} ${row.total_arr:>13,.0f}")
    except Exception as e:
        print(f"Risk view not yet deployed: {e}")

    # Query 5: Owner contribution to target
    owner_query = """
    SELECT
      owner_name,
      SUM(IF(is_won AND closedate >= '2026-01-01' AND closedate < '2026-04-01', COALESCE(hs_arr, amount), 0)) as won_arr,
      COUNTIF(is_won AND closedate >= '2026-01-01' AND closedate < '2026-04-01') as won_deals,
      SUM(IF(is_open, COALESCE(hs_arr, amount), 0)) as pipeline_arr,
      COUNTIF(is_open) as open_deals
    FROM `octup-testing.hubspot_data.deals_snapshots`
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
      AND pipeline_label = '3PL New Business'
    GROUP BY owner_name
    HAVING won_arr > 0 OR pipeline_arr > 0
    ORDER BY won_arr DESC
    """

    print(f"\n--- OWNER CONTRIBUTION TO Q1 TARGET ---")
    result = client.query(owner_query).result()
    print(f"{'Owner':<25} {'Won ARR':>12} {'Won #':>6} {'Pipeline':>12} {'Open #':>6}")
    print("-" * 65)
    for row in result:
        print(f"{row.owner_name[:25]:<25} ${row.won_arr:>10,.0f} {row.won_deals:>6} ${row.pipeline_arr:>10,.0f} {row.open_deals:>6}")

    print("\n" + "=" * 80)
    print("END OF Q1 TARGET REPORT")
    print("=" * 80)

if __name__ == "__main__":
    generate_report()
