const { BigQuery } = require('@google-cloud/bigquery');
const bq = new BigQuery({ projectId: 'octup-testing' });

async function checkMovements() {
  try {
    // Check latest snapshot date
    const [snapshots] = await bq.query({
      query: 'SELECT MAX(snapshot_date) as latest FROM `octup-testing.hubspot_data.deals_snapshots`',
    });
    console.log('Latest snapshot:', snapshots[0].latest?.value || snapshots[0].latest);

    // Check recent movements
    const [movements] = await bq.query({
      query: `
        SELECT COUNT(*) as count, MAX(transition_date) as latest_movement
        FROM \`octup-testing.hubspot_data.v_daily_deal_movements\`
        WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      `,
    });
    console.log('Movements in last 7 days:', movements[0].count);
    console.log('Latest movement date:', movements[0].latest_movement?.value || movements[0].latest_movement);

    // Show sample movements
    const [sample] = await bq.query({
      query: `
        SELECT deal_name, previous_stage, current_stage, transition_date, movement_type, owner_name
        FROM \`octup-testing.hubspot_data.v_daily_deal_movements\`
        WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        ORDER BY transition_date DESC
        LIMIT 10
      `,
    });
    console.log('\nRecent movements:');
    sample.forEach((m) => {
      const date = m.transition_date?.value || m.transition_date;
      console.log(`  ${date}: ${m.deal_name} | ${m.previous_stage || 'NEW'} → ${m.current_stage} (${m.movement_type})`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkMovements();
