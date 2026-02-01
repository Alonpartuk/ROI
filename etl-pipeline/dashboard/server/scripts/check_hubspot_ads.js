/**
 * Check HubSpot deals for analytics source fields
 */

const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'octup-testing';
const bigquery = new BigQuery({ projectId: PROJECT_ID });

async function checkHubSpotAdsData() {
  console.log('=== HubSpot Analytics Source Check ===\n');

  // 1. Check if all_properties_json contains analytics source data
  console.log('1. Checking for analytics source in all_properties_json...');
  try {
    const [sample] = await bigquery.query({
      query: `
        SELECT
          hs_object_id,
          dealname,
          amount,
          hs_arr,
          JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source') as hs_analytics_source,
          JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source_data_1') as hs_analytics_source_data_1,
          JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source_data_2') as hs_analytics_source_data_2,
          JSON_EXTRACT_SCALAR(all_properties_json, '$.utm_campaign') as utm_campaign,
          JSON_EXTRACT_SCALAR(all_properties_json, '$.utm_source') as utm_source,
          JSON_EXTRACT_SCALAR(all_properties_json, '$.utm_medium') as utm_medium
        FROM \`octup-testing.hubspot_data.deals_snapshots\`
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM \`octup-testing.hubspot_data.deals_snapshots\`)
          AND JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source') IS NOT NULL
        LIMIT 10
      `,
      location: 'US',
    });

    if (sample.length > 0) {
      console.log(`Found ${sample.length} deals with analytics source data:\n`);
      sample.forEach(row => {
        console.log(`Deal: ${row.dealname}`);
        console.log(`  Source: ${row.hs_analytics_source}`);
        console.log(`  Source Data 1: ${row.hs_analytics_source_data_1}`);
        console.log(`  Source Data 2: ${row.hs_analytics_source_data_2}`);
        console.log(`  UTM Campaign: ${row.utm_campaign}`);
        console.log(`  Amount: ${row.amount}, ARR: ${row.hs_arr}`);
        console.log('');
      });
    } else {
      console.log('No deals with hs_analytics_source found');
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }

  // 2. Check distinct analytics sources
  console.log('\n2. Distinct analytics sources...');
  try {
    const [sources] = await bigquery.query({
      query: `
        SELECT
          JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source') as source,
          COUNT(*) as deal_count,
          SUM(COALESCE(hs_arr, amount, 0)) as total_value
        FROM \`octup-testing.hubspot_data.deals_snapshots\`
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM \`octup-testing.hubspot_data.deals_snapshots\`)
          AND JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source') IS NOT NULL
        GROUP BY 1
        ORDER BY 2 DESC
      `,
      location: 'US',
    });

    if (sources.length > 0) {
      console.log('Analytics Sources:');
      sources.forEach(row => {
        console.log(`  ${row.source}: ${row.deal_count} deals, $${Math.round(row.total_value).toLocaleString()}`);
      });
    } else {
      console.log('No analytics source data found');
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }

  // 3. Check PAID_SEARCH specifically
  console.log('\n3. PAID_SEARCH deals...');
  try {
    const [paidSearch] = await bigquery.query({
      query: `
        SELECT
          hs_object_id,
          dealname,
          owner_name,
          dealstage_label,
          COALESCE(hs_arr, amount) as deal_value,
          JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source_data_1') as campaign_name,
          JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source_data_2') as keyword
        FROM \`octup-testing.hubspot_data.deals_snapshots\`
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM \`octup-testing.hubspot_data.deals_snapshots\`)
          AND JSON_EXTRACT_SCALAR(all_properties_json, '$.hs_analytics_source') = 'PAID_SEARCH'
        ORDER BY deal_value DESC
        LIMIT 20
      `,
      location: 'US',
    });

    if (paidSearch.length > 0) {
      console.log(`Found ${paidSearch.length} PAID_SEARCH deals:\n`);
      paidSearch.forEach(row => {
        console.log(`${row.dealname}`);
        console.log(`  Value: $${Math.round(row.deal_value || 0).toLocaleString()}`);
        console.log(`  Campaign: ${row.campaign_name || 'N/A'}`);
        console.log(`  Stage: ${row.dealstage_label}`);
        console.log('');
      });
    } else {
      console.log('No PAID_SEARCH deals found');
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }

  console.log('\n=== Check Complete ===');
}

checkHubSpotAdsData().catch(console.error);
