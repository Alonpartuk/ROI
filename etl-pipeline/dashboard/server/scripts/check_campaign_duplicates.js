/**
 * Check for duplicate campaigns in Google Ads Campaign table
 */

const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery({ projectId: 'octup-testing' });

async function checkCampaignDuplicates() {
  console.log('=== Checking Campaign Table for Duplicates ===\n');

  // Check campaign table
  const [campaigns] = await bigquery.query({
    query: `
      SELECT
        campaign_id,
        campaign_name,
        campaign_status,
        COUNT(*) as row_count
      FROM \`octup-testing.google_ads.ads_Campaign_7489993974\`
      GROUP BY campaign_id, campaign_name, campaign_status
      ORDER BY row_count DESC
    `,
    location: 'US',
  });

  console.log('Campaign counts:');
  campaigns.forEach(c => {
    console.log(`  [${c.campaign_id}] ${c.campaign_name} (${c.campaign_status}): ${c.row_count} rows`);
  });

  // Total rows in campaign table
  const [totalRows] = await bigquery.query({
    query: `
      SELECT COUNT(*) as total_rows, COUNT(DISTINCT campaign_id) as unique_campaigns
      FROM \`octup-testing.google_ads.ads_Campaign_7489993974\`
    `,
    location: 'US',
  });
  console.log('\nTotal rows:', totalRows[0].total_rows);
  console.log('Unique campaigns:', totalRows[0].unique_campaigns);

  // Check the multiplier effect of the join
  const [joinTest] = await bigquery.query({
    query: `
      WITH stats AS (
        SELECT campaign_id, SUM(metrics_cost_micros)/1000000 as spend
        FROM \`octup-testing.google_ads.ads_CampaignStats_7489993974\`
        GROUP BY campaign_id
      ),
      campaigns AS (
        SELECT campaign_id, COUNT(*) as campaign_row_count
        FROM \`octup-testing.google_ads.ads_Campaign_7489993974\`
        GROUP BY campaign_id
      )
      SELECT
        s.campaign_id,
        s.spend,
        c.campaign_row_count,
        s.spend * c.campaign_row_count as multiplied_spend
      FROM stats s
      LEFT JOIN campaigns c ON s.campaign_id = c.campaign_id
      ORDER BY s.spend DESC
    `,
    location: 'US',
  });

  console.log('\n=== Join Multiplier Effect ===');
  let sumOriginal = 0;
  let sumMultiplied = 0;
  joinTest.forEach(r => {
    sumOriginal += r.spend;
    sumMultiplied += r.multiplied_spend || r.spend;
    console.log(`  Campaign ${r.campaign_id}: $${r.spend.toFixed(2)} x ${r.campaign_row_count} rows = $${(r.multiplied_spend || r.spend).toFixed(2)}`);
  });
  console.log(`\nOriginal total: $${sumOriginal.toFixed(2)}`);
  console.log(`After join multiplication: $${sumMultiplied.toFixed(2)}`);

  // What the correct query should return (using subquery to avoid join multiplication)
  const [correct] = await bigquery.query({
    query: `
      WITH campaign_spend AS (
        SELECT
          campaign_id,
          SUM(metrics_cost_micros)/1000000 as total_spend,
          SUM(metrics_clicks) as total_clicks,
          SUM(metrics_impressions) as total_impressions
        FROM \`octup-testing.google_ads.ads_CampaignStats_7489993974\`
        GROUP BY campaign_id
      )
      SELECT
        cs.campaign_id,
        (SELECT campaign_name FROM \`octup-testing.google_ads.ads_Campaign_7489993974\` c WHERE c.campaign_id = cs.campaign_id LIMIT 1) as campaign_name,
        cs.total_spend
      FROM campaign_spend cs
      ORDER BY cs.total_spend DESC
    `,
    location: 'US',
  });

  console.log('\n=== Correct Query (with subquery) ===');
  let correctTotal = 0;
  correct.forEach(r => {
    correctTotal += r.total_spend;
    console.log(`  ${r.campaign_name || r.campaign_id}: $${r.total_spend.toFixed(2)}`);
  });
  console.log(`\nCorrect total: $${correctTotal.toFixed(2)}`);
}

checkCampaignDuplicates().catch(console.error);
