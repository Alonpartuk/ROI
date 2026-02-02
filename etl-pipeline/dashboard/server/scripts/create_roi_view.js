/**
 * Create v_marketing_roi_unified view
 * Combines Google Ads spend with HubSpot deal revenue for ROAS calculation
 */

const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'octup-testing';
const bigquery = new BigQuery({ projectId: PROJECT_ID });

async function createROIView() {
  console.log('=== Creating v_marketing_roi_unified View ===\n');

  // First, let's see the campaign names
  console.log('1. Fetching campaign names...');
  const [campaigns] = await bigquery.query({
    query: `
      SELECT
        campaign_id,
        campaign_name,
        campaign_status
      FROM \`octup-testing.google_ads.ads_Campaign_7489993974\`
      ORDER BY campaign_name
    `,
    location: 'US',
  });

  console.log('Campaigns found:');
  campaigns.forEach(c => {
    console.log(`  [${c.campaign_id}] ${c.campaign_name} (${c.campaign_status})`);
  });

  // Create the unified ROI view
  console.log('\n2. Creating v_marketing_roi_unified view...');

  const viewQuery = `
    -- v_marketing_roi_unified: Google Ads Spend + HubSpot Deal Revenue
    -- Calculates ROAS (Return on Ad Spend) per campaign
    -- Account: 748-999-3974 (SW: Octup)
    -- FIXED: Deduplicate campaign table before join to avoid 2x multiplication

    WITH campaign_info AS (
      -- Deduplicate campaign table - take first value per campaign
      SELECT
        campaign_id,
        ARRAY_AGG(campaign_name ORDER BY campaign_name LIMIT 1)[OFFSET(0)] AS campaign_name,
        ARRAY_AGG(campaign_status ORDER BY campaign_status LIMIT 1)[OFFSET(0)] AS campaign_status
      FROM \`octup-testing.google_ads.ads_Campaign_7489993974\`
      GROUP BY campaign_id
    ),

    google_ads_spend AS (
      -- Aggregate spend by campaign (from stats table only)
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
      -- Matches on campaign_name from analytics_source_data_1 or utm_campaign
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
    // Try to create the view
    const [view] = await bigquery.dataset('hubspot_data').createTable('v_marketing_roi_unified', {
      view: {
        query: viewQuery,
        useLegacySql: false,
      },
    });
    console.log(`✓ Created view: ${view.id}`);
  } catch (err) {
    if (err.code === 409) {
      // View exists, update it
      console.log('View exists, updating...');
      await bigquery.dataset('hubspot_data').table('v_marketing_roi_unified').delete();
      const [view] = await bigquery.dataset('hubspot_data').createTable('v_marketing_roi_unified', {
        view: {
          query: viewQuery,
          useLegacySql: false,
        },
      });
      console.log(`✓ Updated view: ${view.id}`);
    } else {
      throw err;
    }
  }

  // Query the view to show results
  console.log('\n3. Querying v_marketing_roi_unified...\n');
  const [results] = await bigquery.query({
    query: `SELECT * FROM \`octup-testing.hubspot_data.v_marketing_roi_unified\` ORDER BY total_spend DESC`,
    location: 'US',
  });

  console.log('=== MARKETING ROI REPORT ===\n');
  console.log(`Total Campaigns: ${results.length}`);

  let totalSpend = 0;
  let totalARR = 0;

  results.forEach(r => {
    totalSpend += r.total_spend || 0;
    totalARR += r.arr_generated || 0;

    console.log(`\n${r.campaign_name || 'Unknown Campaign'}`);
    console.log(`  Campaign ID: ${r.campaign_id}`);
    console.log(`  Status: ${r.campaign_status}`);
    console.log(`  ────────────────────────────`);
    console.log(`  Spend: $${(r.total_spend || 0).toFixed(2)}`);
    console.log(`  Clicks: ${r.total_clicks || 0} | Impressions: ${r.total_impressions || 0}`);
    console.log(`  CTR: ${(r.ctr_pct || 0).toFixed(2)}% | CPC: $${(r.cpc || 0).toFixed(2)}`);
    console.log(`  ────────────────────────────`);
    console.log(`  Attributed Deals: ${r.attributed_deals}`);
    console.log(`  Won Deals: ${r.won_deals}`);
    console.log(`  ARR Generated: $${(r.arr_generated || 0).toLocaleString()}`);
    console.log(`  Pipeline Value: $${(r.pipeline_value || 0).toLocaleString()}`);
    console.log(`  ────────────────────────────`);
    console.log(`  ROAS: ${r.roas ? r.roas.toFixed(2) + 'x' : 'N/A'}`);
    console.log(`  Cost per Lead: ${r.cost_per_lead ? '$' + r.cost_per_lead.toFixed(2) : 'N/A'}`);
    console.log(`  ROI Status: ${r.campaign_roi_status}`);
  });

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total Spend: $${totalSpend.toFixed(2)}`);
  console.log(`Total ARR Generated: $${totalARR.toLocaleString()}`);
  console.log(`Overall ROAS: ${totalSpend > 0 ? (totalARR / totalSpend).toFixed(2) + 'x' : 'N/A'}`);
  console.log('========================================\n');

  console.log('✅ v_marketing_roi_unified view created successfully!');
}

createROIView().catch(console.error);
