/**
 * Daily Clarity data pull — designed to run on a schedule (GitHub Actions, cron, etc.).
 *
 * Behavior:
 *   - Pulls 1 day of Clarity insights across 6 dimension cuts (overall, URL, Device, Country, URL×Device, Browser)
 *   - Saves to clarity_data/YYYY-MM-DD.json (one file per day)
 *   - Stays under Clarity's 10 API call/day rate limit
 *   - Idempotent: if today's file already exists, skips (so you can re-run safely)
 *
 * Setup:
 *   - Required env vars: CLARITY_API_TOKEN, CLARITY_PROJECT_ID
 *   - Output dir: <repo-root>/clarity_data/
 */

const fs = require('fs');
const path = require('path');
const clarity = require('../services/clarityService');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DATA_DIR = path.join(REPO_ROOT, 'clarity_data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const OUT = path.join(DATA_DIR, `${today}.json`);

// Idempotency: skip if today's data already pulled
if (fs.existsSync(OUT)) {
  console.log(`[clarity-cron] ${today} data already exists at ${OUT} — skipping.`);
  process.exit(0);
}

(async () => {
  console.log(`[clarity-cron] Pulling Clarity data for ${today}...`);
  const data = { pulledAt: new Date().toISOString(), date: today, queries: {} };

  const queries = [
    { key: 'overall',      opts: { numOfDays: 1 } },
    { key: 'byUrl',        opts: { numOfDays: 1, dimension1: 'URL' } },
    { key: 'byDevice',     opts: { numOfDays: 1, dimension1: 'Device' } },
    { key: 'byCountry',    opts: { numOfDays: 1, dimension1: 'Country' } },
    { key: 'byUrlDevice',  opts: { numOfDays: 1, dimension1: 'URL', dimension2: 'Device' } },
    { key: 'byBrowser',    opts: { numOfDays: 1, dimension1: 'Browser' } },
  ];

  for (const q of queries) {
    process.stdout.write(`  ${q.key}... `);
    try {
      data.queries[q.key] = await clarity.fetchInsights(q.opts);
      console.log('ok');
    } catch (e) {
      data.queries[q.key] = { error: e.message };
      console.log(`error: ${e.message.slice(0, 100)}`);
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  const sizeKb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`[clarity-cron] Saved ${OUT} (${sizeKb} KB)`);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
