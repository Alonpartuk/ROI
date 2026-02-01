/**
 * Script to clean up empty Google Ads views in BigQuery
 * These views are for account 735-631-0409 which is not the target account
 */

const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'octup-testing';
const DATASET_ID = 'google_ads';
const bigquery = new BigQuery({ projectId: PROJECT_ID });

async function cleanGoogleAdsDataset() {
  console.log('=== Cleaning Google Ads Dataset ===\n');

  try {
    // Get all tables/views in the dataset
    const [tables] = await bigquery.dataset(DATASET_ID).getTables();
    console.log(`Found ${tables.length} tables/views to delete\n`);

    if (tables.length === 0) {
      console.log('Dataset is already empty.');
      return;
    }

    // Delete each table/view
    let deleted = 0;
    let errors = 0;

    for (const table of tables) {
      try {
        await bigquery.dataset(DATASET_ID).table(table.id).delete();
        deleted++;
        if (deleted % 20 === 0) {
          console.log(`Deleted ${deleted}/${tables.length} views...`);
        }
      } catch (err) {
        console.error(`Error deleting ${table.id}: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n✓ Deleted ${deleted} tables/views`);
    if (errors > 0) {
      console.log(`✗ ${errors} errors occurred`);
    }

    // Verify dataset is empty
    const [remaining] = await bigquery.dataset(DATASET_ID).getTables();
    console.log(`\nRemaining tables in dataset: ${remaining.length}`);

  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n=== Cleanup Complete ===');
}

cleanGoogleAdsDataset().catch(console.error);
