/**
 * Fix v_marketing_roi_unified view - Remove duplicate JOIN issue
 *
 * Issue: Campaign table has 2 rows per campaign_id, causing 2x spend multiplication
 * Solution: Deduplicate campaign table before joining
 */

const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery({ projectId: 'octup-testing' });

async function fixROIView() {
  console.log('=== Fixing v_marketing_roi_unified View ===\n');

  // The fixed view query - deduplicate campaigns first
  const viewQuery = `
    -- v_marketing_roi_unified: Google Ads Spend + HubSpot Deal Revenue
    -- FIXED: Deduplicate campaign table before join to avoid 2x multiplication
    -- Account: 748-999-3974 (SW: Octup)

    WITH campaign_info AS (
      -- Deduplicate campaign table - take latest status per campaign
      SELECT
        campaign_id,
        ARRAY_AGG(campaign_name ORDER BY campaign_name LIMIT 1)[OFFSET(0)] AS campaign_name,
        ARRAY_AGG(campaign_status ORDER BY campaign_status LIMIT 1)[OFFSET(0)] AS campaign_status
      FROM \`octup-testing.google_ads.ads_Campaign_7489993974\`
      GROUP BY campaign_id
    ),

    google_ads_spend AS (
      -- Aggregate spend by campaign (from stats table)
      SELECT
        campaign_id,
        SUM(metrics_cost_micros) / 1000000 AS total_spend,
        SUM(metrics_clicks) AS total_clicks,
        SUM(metrics_impressions) AS total_impressions,
        SUM(metrics_conversions) AS total_conversions,
        MIN(segments_date) AS first_date,
        MAX(segments_date) AS last_date
      FROM \`octup-testing.google_ads.ads_CampaignStats_7489993974\`
      GROUP BY campaign_id
    ),

    hubspot_revenue AS (
      -- Aggregate revenue by campaign name from HubSpot
      SELECT
        COALESCE(
          JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source_data_1'),
          JSON_EXTRACT_SCALAR(all_properties_json, '$.utm_campaign')
        ) AS campaign_name,
        COUNT(*) AS deal_count,
        SUM(CASE WHEN hs_date_entered_closedwon IS NOT NULL THEN 1 ELSE 0 END) AS won_deals,
        SUM(CASE WHEN hs_date_entered_closedwon IS NOT NULL THEN COALESCE(hs_arr, amount, 0) ELSE 0 END) AS won_arr,
        SUM(COALESCE(hs_arr, amount, 0)) AS total_pipeline_value
      FROM \`octup-testing.hubspot_data.deals_snapshots\`
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM \`octup-testing.hubspot_data.deals_snapshots\`)
        AND (
          JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source') = 'PAID_SEARCH'
          OR LOWER(JSON_EXTRACT_SCALAR(all_properties_json, '$.utm_source')) LIKE '%google%'
          OR LOWER(JSON_EXTRACT_SCALAR(all_properties_json, '$.utm_medium')) IN ('cpc', 'ppc', 'paid')
        )
      GROUP BY campaign_name
    )

    SELECT
      g.campaign_id,
      c.campaign_name,
      c.campaign_status,

      -- Google Ads Metrics
      g.total_spend,
      g.total_clicks,
      g.total_impressions,
      g.total_conversions,
      SAFE_DIVIDE(g.total_clicks, g.total_impressions) * 100 AS ctr_pct,
      SAFE_DIVIDE(g.total_spend, g.total_clicks) AS cpc,
      g.first_date AS spend_start_date,
      g.last_date AS spend_end_date,

      -- HubSpot Revenue Metrics
      COALESCE(h.deal_count, 0) AS attributed_deals,
      COALESCE(h.won_deals, 0) AS won_deals,
      COALESCE(h.won_arr, 0) AS arr_generated,
      COALESCE(h.total_pipeline_value, 0) AS pipeline_value,

      -- ROI Calculations
      SAFE_DIVIDE(COALESCE(h.won_arr, 0), g.total_spend) AS roas,
      SAFE_DIVIDE(g.total_spend, NULLIF(h.won_deals, 0)) AS cost_per_acquisition,
      SAFE_DIVIDE(g.total_spend, NULLIF(h.deal_count, 0)) AS cost_per_lead,

      -- Status
      CASE
        WHEN h.won_arr > 0 AND g.total_spend > 0 THEN 'GENERATING_REVENUE'
        WHEN h.deal_count > 0 AND g.total_spend > 0 THEN 'LEADS_IN_PIPELINE'
        WHEN g.total_spend > 0 THEN 'SPENDING_NO_ATTRIBUTION'
        ELSE 'NO_SPEND'
      END AS campaign_roi_status

    FROM google_ads_spend g
    LEFT JOIN campaign_info c ON g.campaign_id = c.campaign_id
    LEFT JOIN hubspot_revenue h ON LOWER(c.campaign_name) = LOWER(h.campaign_name)
    ORDER BY g.total_spend DESC
  `;

  try {
    // Delete existing view and recreate
    console.log('Deleting existing view...');
    try {
      await bigquery.dataset('hubspot_data').table('v_marketing_roi_unified').delete();
      console.log('✓ Deleted old view');
    } catch (e) {
      if (e.code !== 404) throw e;
      console.log('View did not exist');
    }

    console.log('Creating new view...');
    const [view] = await bigquery.dataset('hubspot_data').createTable('v_marketing_roi_unified', {
      view: {
        query: viewQuery,
        useLegacySql: false,
      },
    });
    console.log(`✓ Created fixed view: ${view.id}`);

    // Verify the fix
    console.log('\n=== Verifying Fix ===');
    const [results] = await bigquery.query({
      query: `SELECT SUM(total_spend) as total_spend FROM \`octup-testing.hubspot_data.v_marketing_roi_unified\``,
      location: 'US',
    });
    console.log(`New view total spend: $${results[0].total_spend.toFixed(2)}`);

    // Show all campaigns
    const [campaigns] = await bigquery.query({
      query: `SELECT campaign_name, campaign_status, total_spend, total_clicks, attributed_deals FROM \`octup-testing.hubspot_data.v_marketing_roi_unified\` ORDER BY total_spend DESC`,
      location: 'US',
    });
    console.log('\nCampaign breakdown:');
    campaigns.forEach(c => {
      console.log(`  ${c.campaign_name}: $${c.total_spend.toFixed(2)} | ${c.total_clicks} clicks | ${c.attributed_deals} deals`);
    });

    console.log('\n✅ View fixed successfully!');

  } catch (err) {
    console.error('Error:', err.message);
    throw err;
  }
}

fixROIView().catch(console.error);
