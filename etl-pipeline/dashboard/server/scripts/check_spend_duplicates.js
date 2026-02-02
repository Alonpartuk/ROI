/**
 * Check for duplicate spend records in Google Ads data
 */

const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery({ projectId: 'octup-testing' });

async function checkDuplicates() {
  console.log('=== Analyzing Google Ads Spend Data ===\n');

  // Check raw spend
  const [rawSpend] = await bigquery.query({
    query: `
      SELECT
        COUNT(*) as row_count,
        COUNT(DISTINCT CONCAT(CAST(campaign_id AS STRING), '-', CAST(segments_date AS STRING))) as unique_campaign_dates,
        SUM(metrics_cost_micros)/1000000 as total_spend_usd
      FROM \`octup-testing.google_ads.ads_CampaignStats_7489993974\`
    `,
    location: 'US',
  });
  console.log('=== Raw Table Stats ===');
  console.log('Row count:', rawSpend[0].row_count);
  console.log('Unique campaign-date combinations:', rawSpend[0].unique_campaign_dates);
  console.log('Total spend (raw):', '$' + rawSpend[0].total_spend_usd.toFixed(2));

  // Check for duplicate dates per campaign
  const [duplicates] = await bigquery.query({
    query: `
      SELECT
        campaign_id,
        segments_date,
        COUNT(*) as record_count,
        SUM(metrics_cost_micros)/1000000 as spend
      FROM \`octup-testing.google_ads.ads_CampaignStats_7489993974\`
      GROUP BY campaign_id, segments_date
      HAVING COUNT(*) > 1
      ORDER BY record_count DESC
      LIMIT 10
    `,
    location: 'US',
  });
  console.log('\n=== Duplicate Records per Date ===');
  console.log('Duplicates found:', duplicates.length);
  if (duplicates.length > 0) {
    duplicates.forEach(d => {
      console.log(`  Campaign ${d.campaign_id} on ${d.segments_date}: ${d.record_count} records, $${d.spend.toFixed(2)}`);
    });
  }

  // Check current view total
  const [viewTotal] = await bigquery.query({
    query: `
      SELECT SUM(total_spend) as view_total_spend
      FROM \`octup-testing.hubspot_data.v_marketing_roi_unified\`
    `,
    location: 'US',
  });
  console.log('\n=== Current View Total ===');
  console.log('View total spend:', '$' + (viewTotal[0].view_total_spend || 0).toFixed(2));

  // Check what the correct deduplicated spend should be
  const [deduped] = await bigquery.query({
    query: `
      WITH deduplicated AS (
        SELECT
          campaign_id,
          segments_date,
          MAX(metrics_cost_micros) as cost_micros
        FROM \`octup-testing.google_ads.ads_CampaignStats_7489993974\`
        GROUP BY campaign_id, segments_date
      )
      SELECT SUM(cost_micros)/1000000 as correct_spend
      FROM deduplicated
    `,
    location: 'US',
  });
  console.log('\n=== Deduplicated (MAX per date) ===');
  console.log('Correct spend:', '$' + (deduped[0].correct_spend || 0).toFixed(2));

  // Also check table schema to see what other dimensions might cause duplicates
  const [schema] = await bigquery.query({
    query: `
      SELECT column_name, data_type
      FROM \`octup-testing.google_ads.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = 'ads_CampaignStats_7489993974'
        AND column_name LIKE 'segments_%'
      ORDER BY column_name
    `,
    location: 'US',
  });
  console.log('\n=== Segment Columns (potential duplicate sources) ===');
  schema.forEach(s => console.log(`  ${s.column_name}: ${s.data_type}`));

  // Check distinct segment values
  const [segmentValues] = await bigquery.query({
    query: `
      SELECT
        COUNT(DISTINCT segments_date) as unique_dates,
        COUNT(DISTINCT segments_ad_network_type) as unique_network_types,
        COUNT(DISTINCT segments_device) as unique_devices
      FROM \`octup-testing.google_ads.ads_CampaignStats_7489993974\`
    `,
    location: 'US',
  });
  console.log('\n=== Segment Breakdown ===');
  console.log('Unique dates:', segmentValues[0].unique_dates);
  console.log('Unique network types:', segmentValues[0].unique_network_types);
  console.log('Unique devices:', segmentValues[0].unique_devices);
}

checkDuplicates().catch(console.error);
