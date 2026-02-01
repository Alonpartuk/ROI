/**
 * Quick script to check Google Ads data for Account ID 748-999-3974 (SW: Octup)
 * Account ID stored as: 7489993974 (without dashes)
 */

const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'octup-testing';
const bigquery = new BigQuery({ projectId: PROJECT_ID });

async function checkGoogleAdsData() {
  console.log('=== Google Ads Data Audit ===\n');

  // 1. Check if views have any data
  console.log('1. Checking if CampaignStats view has data...');
  try {
    const [countResult] = await bigquery.query({
      query: `SELECT COUNT(*) as total FROM \`octup-testing.google_ads.ads_CampaignStats_7356310409\``,
      location: 'US',
    });
    console.log(`   Total rows in CampaignStats: ${countResult[0].total}`);
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }

  // 2. Check which customer IDs exist
  console.log('\n2. Checking available customer IDs...');
  try {
    const [customerIds] = await bigquery.query({
      query: `
        SELECT DISTINCT customer_id
        FROM \`octup-testing.google_ads.ads_CampaignStats_7356310409\`
        LIMIT 10
      `,
      location: 'US',
    });
    if (customerIds.length === 0) {
      console.log('   No customer IDs found in CampaignStats');
    } else {
      console.log('   Customer IDs found:');
      customerIds.forEach(row => {
        const id = row.customer_id;
        const formattedId = id ? String(id).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : 'NULL';
        console.log(`   - ${formattedId} (${id})`);
      });
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }

  // 3. Check for target account 7489993974
  const targetAccountId = 7489993974;
  console.log(`\n3. Checking for target account 748-999-3974 (${targetAccountId})...`);
  try {
    const [targetData] = await bigquery.query({
      query: `
        SELECT
          customer_id,
          COUNT(*) as total_rows
        FROM \`octup-testing.google_ads.ads_CampaignStats_7356310409\`
        WHERE customer_id = ${targetAccountId}
        GROUP BY customer_id
      `,
      location: 'US',
    });

    if (targetData.length === 0) {
      console.log('   ❌ Target account NOT found in dataset');
    } else {
      console.log('   ✓ Target account FOUND!');
      console.log(`   Total rows: ${targetData[0].total_rows}`);
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }

  // 4. Check Campaign view
  console.log('\n4. Getting campaigns from Campaign view...');
  try {
    const [campaigns] = await bigquery.query({
      query: `
        SELECT DISTINCT
          campaign_id,
          campaign_name,
          campaign_status
        FROM \`octup-testing.google_ads.ads_Campaign_7356310409\`
        LIMIT 20
      `,
      location: 'US',
    });
    if (campaigns.length === 0) {
      console.log('   No campaigns found');
    } else {
      console.log('   Campaigns:');
      campaigns.forEach(row => {
        console.log(`   - [${row.campaign_id}] ${row.campaign_name} (${row.campaign_status})`);
      });
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }

  // 5. Check date range
  console.log('\n5. Checking date range of data...');
  try {
    const [dateRange] = await bigquery.query({
      query: `
        SELECT
          MIN(segments_date) as earliest_date,
          MAX(segments_date) as latest_date
        FROM \`octup-testing.google_ads.ads_CampaignStats_7356310409\`
      `,
      location: 'US',
    });
    if (dateRange[0].earliest_date) {
      console.log(`   Date range: ${dateRange[0].earliest_date} to ${dateRange[0].latest_date}`);
    } else {
      console.log('   No date data found');
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }

  // 6. Sample data
  console.log('\n6. Sample row from CampaignStats...');
  try {
    const [sample] = await bigquery.query({
      query: `
        SELECT *
        FROM \`octup-testing.google_ads.ads_CampaignStats_7356310409\`
        LIMIT 1
      `,
      location: 'US',
    });
    if (sample.length > 0) {
      console.log('   Sample row:');
      console.log(JSON.stringify(sample[0], null, 2));
    } else {
      console.log('   No data found');
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }

  // 7. Check if there are other Google Ads datasets
  console.log('\n7. Listing all tables in google_ads dataset...');
  try {
    const [tables] = await bigquery.dataset('google_ads').getTables();
    console.log(`   Found ${tables.length} tables/views:`);
    tables.slice(0, 10).forEach(t => {
      console.log(`   - ${t.id}`);
    });
    if (tables.length > 10) {
      console.log(`   ... and ${tables.length - 10} more`);
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }

  console.log('\n=== Audit Complete ===');
}

checkGoogleAdsData().catch(console.error);
