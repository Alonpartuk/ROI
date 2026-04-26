/**
 * Clarity audit — pull on-page behavior insights for our priority landing pages.
 * Saves to clarity_audit.json at repo root.
 */
const fs = require('fs');
const path = require('path');
const clarity = require('../services/clarityService');

const PRIORITY_URLS = [
  'https://www.octup.com/',
  'https://www.octup.com/get-demo',
  'https://www.octup.com/pricing',
  'https://www.octup.com/features/billing',
  'https://www.octup.com/features/analytics',
  'https://www.octup.com/features/octup-ai',
  'https://www.octup.com/customer-stories',
  'https://www.octup.com/features/integrations',
  'https://www.octup.com/features/brand-portal',
];

const OUT = path.resolve(__dirname, '..', '..', '..', '..', 'clarity_audit.json');

(async () => {
  console.log('=== Clarity Audit ===');
  console.log(`Project ID: ${clarity.PROJECT_ID.slice(0, 6)}...`);
  console.log(`Pulling 3-day insights, multiple dimension cuts...\n`);

  const audit = { generatedAt: new Date().toISOString(), queries: {} };

  // Q1 — Overall, no dimensions (sanity check + global metrics)
  console.log('Q1: Overall metrics (no dimensions, last 3 days)...');
  try {
    const r = await clarity.fetchInsights({ numOfDays: 3 });
    audit.queries.overall = r;
    console.log(`  → ${JSON.stringify(r).length} bytes returned`);
  } catch (e) { console.log(`  ERROR: ${e.message.slice(0, 200)}`); audit.queries.overall = { error: e.message }; }

  // Q2 — By URL (the main one)
  console.log('Q2: By URL...');
  try {
    const r = await clarity.fetchInsights({ numOfDays: 3, dimension1: 'URL' });
    audit.queries.byUrl = r;
    console.log(`  → ${JSON.stringify(r).length} bytes returned`);
  } catch (e) { console.log(`  ERROR: ${e.message.slice(0, 200)}`); audit.queries.byUrl = { error: e.message }; }

  // Q3 — By Device
  console.log('Q3: By Device (mobile vs desktop)...');
  try {
    const r = await clarity.fetchInsights({ numOfDays: 3, dimension1: 'Device' });
    audit.queries.byDevice = r;
    console.log(`  → ${JSON.stringify(r).length} bytes returned`);
  } catch (e) { console.log(`  ERROR: ${e.message.slice(0, 200)}`); audit.queries.byDevice = { error: e.message }; }

  // Q4 — By Country (where are visitors from)
  console.log('Q4: By Country...');
  try {
    const r = await clarity.fetchInsights({ numOfDays: 3, dimension1: 'Country' });
    audit.queries.byCountry = r;
    console.log(`  → ${JSON.stringify(r).length} bytes returned`);
  } catch (e) { console.log(`  ERROR: ${e.message.slice(0, 200)}`); audit.queries.byCountry = { error: e.message }; }

  // Q5 — URL × Device (combined)
  console.log('Q5: URL × Device (combined)...');
  try {
    const r = await clarity.fetchInsights({ numOfDays: 3, dimension1: 'URL', dimension2: 'Device' });
    audit.queries.byUrlAndDevice = r;
    console.log(`  → ${JSON.stringify(r).length} bytes returned`);
  } catch (e) { console.log(`  ERROR: ${e.message.slice(0, 200)}`); audit.queries.byUrlAndDevice = { error: e.message }; }

  // Q6 — By Browser (catch any browser-specific JS issues)
  console.log('Q6: By Browser...');
  try {
    const r = await clarity.fetchInsights({ numOfDays: 3, dimension1: 'Browser' });
    audit.queries.byBrowser = r;
    console.log(`  → ${JSON.stringify(r).length} bytes returned`);
  } catch (e) { console.log(`  ERROR: ${e.message.slice(0, 200)}`); audit.queries.byBrowser = { error: e.message }; }

  fs.writeFileSync(OUT, JSON.stringify(audit, null, 2));
  console.log(`\nSaved ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);

  // Console-readable summary of the most useful query
  console.log('\n=== SAMPLE OF Q2 (By URL) ===');
  const byUrl = audit.queries.byUrl;
  if (byUrl && !byUrl.error) {
    const sample = Array.isArray(byUrl) ? byUrl : (byUrl.data || byUrl);
    console.log(JSON.stringify(sample, null, 2).slice(0, 4000));
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
