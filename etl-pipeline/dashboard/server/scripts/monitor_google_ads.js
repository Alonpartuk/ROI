/**
 * Monitor Google Ads dataset for new tables from account 748-999-3974
 * Expected table suffix: _7489993974
 */

const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'octup-testing';
const DATASET_ID = 'google_ads';
const TARGET_ACCOUNT_SUFFIX = '_7489993974';
const bigquery = new BigQuery({ projectId: PROJECT_ID });

async function checkForGoogleAdsData() {
  const timestamp = new Date().toLocaleTimeString();

  try {
    // Check for tables with the target account suffix
    const [tables] = await bigquery.dataset(DATASET_ID).getTables();

    const targetTables = tables.filter(t => t.id.includes(TARGET_ACCOUNT_SUFFIX));

    if (targetTables.length > 0) {
      console.log(`\n🎉 [${timestamp}] GOOGLE ADS DATA DETECTED!`);
      console.log(`Found ${targetTables.length} tables for account 748-999-3974:\n`);

      targetTables.forEach(t => {
        console.log(`  ✓ ${t.id}`);
      });

      // Check if Campaign stats have data
      const campaignStatsTable = targetTables.find(t => t.id.includes('CampaignStats'));
      if (campaignStatsTable) {
        console.log(`\nChecking ${campaignStatsTable.id} for cost data...`);

        const [rows] = await bigquery.query({
          query: `
            SELECT
              COUNT(*) as row_count,
              SUM(metrics_cost_micros) / 1000000 as total_spend,
              MIN(segments_date) as earliest_date,
              MAX(segments_date) as latest_date
            FROM \`${PROJECT_ID}.${DATASET_ID}.${campaignStatsTable.id}\`
          `,
          location: 'US',
        });

        if (rows[0].row_count > 0) {
          console.log(`\n💰 COST DATA AVAILABLE!`);
          console.log(`  Rows: ${rows[0].row_count}`);
          console.log(`  Total Spend: $${rows[0].total_spend?.toFixed(2)}`);
          console.log(`  Date Range: ${rows[0].earliest_date} to ${rows[0].latest_date}`);

          // List campaigns
          console.log('\nCampaigns with spend:');
          const [campaigns] = await bigquery.query({
            query: `
              SELECT
                campaign_id,
                SUM(metrics_cost_micros) / 1000000 as spend,
                SUM(metrics_clicks) as clicks,
                SUM(metrics_impressions) as impressions
              FROM \`${PROJECT_ID}.${DATASET_ID}.${campaignStatsTable.id}\`
              GROUP BY campaign_id
              ORDER BY spend DESC
              LIMIT 10
            `,
            location: 'US',
          });

          campaigns.forEach(c => {
            console.log(`  Campaign ${c.campaign_id}: $${c.spend?.toFixed(2)} | ${c.clicks} clicks | ${c.impressions} impressions`);
          });

          return { found: true, hasData: true, tables: targetTables.map(t => t.id) };
        } else {
          console.log(`\n⏳ Tables exist but no data rows yet`);
          return { found: true, hasData: false, tables: targetTables.map(t => t.id) };
        }
      }

      return { found: true, hasData: false, tables: targetTables.map(t => t.id) };
    } else {
      console.log(`[${timestamp}] Waiting for Google Ads data... (${tables.length} tables in dataset, none for target account)`);
      return { found: false, hasData: false, tables: [] };
    }
  } catch (err) {
    console.error(`[${timestamp}] Error: ${err.message}`);
    return { found: false, hasData: false, error: err.message };
  }
}

// Main execution
async function main() {
  console.log('=== Google Ads Data Monitor ===');
  console.log(`Target Account: 748-999-3974 (suffix: ${TARGET_ACCOUNT_SUFFIX})`);
  console.log(`Dataset: ${PROJECT_ID}.${DATASET_ID}`);
  console.log('Checking now...\n');

  const result = await checkForGoogleAdsData();

  if (result.found && result.hasData) {
    console.log('\n✅ Ready to create v_marketing_roi_unified view!');
  } else if (result.found) {
    console.log('\n📊 Tables created, waiting for data to sync...');
  } else {
    console.log('\n⏳ No tables yet. Data transfer in progress...');
  }
}

main().catch(console.error);
