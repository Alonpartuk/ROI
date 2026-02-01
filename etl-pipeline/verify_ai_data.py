"""
Verify the enhanced AI summary data is populated correctly
"""
from google.cloud import bigquery

def verify_data():
    client = bigquery.Client(project='octup-testing')

    query = """
    SELECT
      report_date,
      current_open_deals,
      ROUND(current_pipeline_value, 0) AS pipeline_value,

      -- Enterprise vs Standard
      enterprise_deals_count,
      ROUND(enterprise_arr, 0) AS enterprise_arr,
      standard_deals_count,
      ROUND(standard_arr, 0) AS standard_arr,

      -- Activity indicators
      deals_with_meetings,
      ROUND(arr_with_meetings, 0) AS arr_with_meetings,
      deals_with_recent_activity,
      ROUND(arr_with_recent_activity, 0) AS arr_with_recent_activity,

      -- Risk breakdown
      ownership_risk_count,
      ROUND(ownership_risk_arr, 0) AS ownership_risk_arr,
      stalled_count,
      ROUND(stalled_arr, 0) AS stalled_arr,
      ghosted_count,
      ROUND(ghosted_arr, 0) AS ghosted_arr,
      not_3pl_count,

      -- Healthy
      healthy_count,
      ROUND(healthy_arr, 0) AS healthy_arr,

      -- Activity metrics
      avg_days_since_activity,

      -- Lists
      upcoming_meetings,
      top_at_risk_deals,
      deals_saved_by_activity

    FROM `octup-testing.hubspot_data.v_weekly_summary_data`
    """

    print("=" * 70)
    print("ENHANCED AI SUMMARY DATA - VERIFICATION")
    print("=" * 70)

    result = client.query(query).result()

    for row in result:
        print(f"\nReport Date: {row.report_date}")
        print(f"Open Deals: {row.current_open_deals}")
        print(f"Pipeline Value: ${row.pipeline_value}")

        print("\n--- ENTERPRISE VS STANDARD ---")
        print(f"Enterprise Deals: {row.enterprise_deals_count} worth ${row.enterprise_arr}")
        print(f"Standard Deals: {row.standard_deals_count} worth ${row.standard_arr}")

        print("\n--- ACTIVITY INDICATORS ---")
        print(f"Deals with Upcoming Meetings: {row.deals_with_meetings} worth ${row.arr_with_meetings}")
        print(f"Deals with Recent Activity: {row.deals_with_recent_activity} worth ${row.arr_with_recent_activity}")
        print(f"Avg Days Since Activity: {row.avg_days_since_activity}")

        print("\n--- RISK BREAKDOWN ---")
        print(f"Ownership Risk: {row.ownership_risk_count} worth ${row.ownership_risk_arr}")
        print(f"Stalled: {row.stalled_count} worth ${row.stalled_arr}")
        print(f"Ghosted: {row.ghosted_count} worth ${row.ghosted_arr}")
        print(f"Not 3PL Match: {row.not_3pl_count}")

        print("\n--- HEALTHY PIPELINE ---")
        print(f"Healthy Deals: {row.healthy_count} worth ${row.healthy_arr}")

        print("\n--- UPCOMING MEETINGS ---")
        print(row.upcoming_meetings or "None")

        print("\n--- TOP AT-RISK DEALS ---")
        print(row.top_at_risk_deals or "None")

        print("\n--- DEALS SAVED BY ACTIVITY ---")
        print(row.deals_saved_by_activity or "None")

    print("\n" + "=" * 70)
    print("VERIFICATION COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    verify_data()
