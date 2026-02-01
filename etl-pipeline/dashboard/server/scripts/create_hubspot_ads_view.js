/**
 * Create v_hubspot_ads_leads view in BigQuery
 * Extracts deals from PAID_SEARCH or with Google UTM parameters
 */

const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'octup-testing';
const DATASET_ID = 'hubspot_data';
const bigquery = new BigQuery({ projectId: PROJECT_ID });

async function createHubSpotAdsView() {
  console.log('=== Creating v_hubspot_ads_leads View ===\n');

  const viewQuery = `
    -- v_hubspot_ads_leads: HubSpot deals attributed to Paid Search / Google Ads
    -- Created for Marketing ROI analysis

    SELECT
      d.hs_object_id AS deal_id,
      d.dealname,
      d.owner_name,
      d.dealstage_label,
      d.pipeline_label,
      d.createdate AS deal_created_date,
      d.closedate AS deal_close_date,
      d.hs_date_entered_closedwon AS won_date,

      -- Deal Values
      COALESCE(d.hs_arr, d.amount, 0) AS arr_value,
      COALESCE(d.amount, 0) AS deal_amount,

      -- Analytics Source Attribution
      JSON_EXTRACT_SCALAR(d.all_properties_json, '$.hs_analytics_source') AS analytics_source,
      JSON_EXTRACT_SCALAR(d.all_properties_json, '$.hs_analytics_source_data_1') AS campaign_name,
      JSON_EXTRACT_SCALAR(d.all_properties_json, '$.hs_analytics_source_data_2') AS keyword_or_ad_group,

      -- UTM Parameters (fallback attribution)
      JSON_EXTRACT_SCALAR(d.all_properties_json, '$.utm_source') AS utm_source,
      JSON_EXTRACT_SCALAR(d.all_properties_json, '$.utm_medium') AS utm_medium,
      JSON_EXTRACT_SCALAR(d.all_properties_json, '$.utm_campaign') AS utm_campaign,
      JSON_EXTRACT_SCALAR(d.all_properties_json, '$.utm_content') AS utm_content,
      JSON_EXTRACT_SCALAR(d.all_properties_json, '$.utm_term') AS utm_term,

      -- Deal Status
      CASE
        WHEN d.hs_date_entered_closedwon IS NOT NULL THEN 'WON'
        WHEN d.hs_date_entered_closedlost IS NOT NULL THEN 'LOST'
        ELSE 'OPEN'
      END AS deal_status,

      -- Is this a Google Ads attributed deal?
      CASE
        WHEN JSON_EXTRACT_SCALAR(d.all_properties_json, '$.hs_analytics_source') = 'PAID_SEARCH' THEN TRUE
        WHEN LOWER(JSON_EXTRACT_SCALAR(d.all_properties_json, '$.utm_source')) LIKE '%google%' THEN TRUE
        WHEN LOWER(JSON_EXTRACT_SCALAR(d.all_properties_json, '$.utm_medium')) IN ('cpc', 'ppc', 'paid') THEN TRUE
        ELSE FALSE
      END AS is_google_ads_attributed,

      d.snapshot_date

    FROM \`${PROJECT_ID}.${DATASET_ID}.deals_snapshots\` d
    WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM \`${PROJECT_ID}.${DATASET_ID}.deals_snapshots\`)
      AND (
        -- PAID_SEARCH source
        JSON_EXTRACT_SCALAR(d.all_properties_json, '$.hs_analytics_source') = 'PAID_SEARCH'
        -- OR Google UTM source
        OR LOWER(JSON_EXTRACT_SCALAR(d.all_properties_json, '$.utm_source')) LIKE '%google%'
        -- OR paid medium
        OR LOWER(JSON_EXTRACT_SCALAR(d.all_properties_json, '$.utm_medium')) IN ('cpc', 'ppc', 'paid')
      )
  `;

  try {
    // Create or replace the view
    const [view] = await bigquery.dataset(DATASET_ID).createTable('v_hubspot_ads_leads', {
      view: {
        query: viewQuery,
        useLegacySql: false,
      },
    });

    console.log(`✓ Created view: ${view.id}`);
  } catch (err) {
    if (err.code === 409) {
      // View already exists, update it
      console.log('View exists, updating...');
      await bigquery.dataset(DATASET_ID).table('v_hubspot_ads_leads').delete();
      const [view] = await bigquery.dataset(DATASET_ID).createTable('v_hubspot_ads_leads', {
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

  // Test the view
  console.log('\nTesting view...');
  const [rows] = await bigquery.query({
    query: `SELECT COUNT(*) as total_deals, SUM(arr_value) as total_arr FROM \`${PROJECT_ID}.${DATASET_ID}.v_hubspot_ads_leads\``,
    location: 'US',
  });

  console.log(`\nView Results:`);
  console.log(`  Total Deals: ${rows[0].total_deals}`);
  console.log(`  Total ARR: $${Math.round(rows[0].total_arr || 0).toLocaleString()}`);

  if (rows[0].total_deals === 0) {
    console.log('\n⚠️  No PAID_SEARCH or Google UTM deals found yet.');
    console.log('   The view is ready and will populate when deals are attributed to Google Ads.');
  }

  console.log('\n=== View Created Successfully ===');
}

createHubSpotAdsView().catch(console.error);
