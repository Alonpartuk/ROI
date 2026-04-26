/**
 * Ingest manually-exported CSVs from the Clarity dashboard.
 *
 * Drop any CSV exports from clarity.microsoft.com into:
 *   <repo-root>/clarity_dashboard_exports/
 *
 * The script will:
 *   - Detect each CSV's structure (columns)
 *   - Parse and normalize URLs
 *   - Aggregate metrics across files
 *   - Write a unified JSON to clarity_dashboard_aggregate.json
 *
 * Clarity dashboard CSV exports vary by report — common formats:
 *   - Insights summary: columns like URL, Sessions, Dead Click %, Rage Click %, etc.
 *   - Top URLs by traffic: URL, Sessions, Page Views, Time on Page
 *   - Frustration scores by URL: URL, Score, Sessions
 *   - Country breakdown: Country, Sessions
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const EXPORTS_DIR = path.join(REPO_ROOT, 'clarity_dashboard_exports');
const OUT = path.join(REPO_ROOT, 'clarity_dashboard_aggregate.json');

if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  console.log(`Created ${EXPORTS_DIR}`);
  console.log('Drop your Clarity CSV exports there and re-run this script.');
  process.exit(0);
}

function parseCsv(text) {
  // Simple CSV parser — handles quoted fields and embedded commas
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
        else if (c === '"') inQuotes = false;
        else cur += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const fields = parseLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = fields[i] !== undefined ? fields[i].trim() : ''; });
    return row;
  });
  return { headers, rows };
}

function normalizeUrl(u) {
  if (!u) return '(none)';
  try {
    const url = new URL(u);
    return (url.origin + url.pathname).replace(/\/$/, '');
  } catch {
    return u.split('?')[0].replace(/\/$/, '');
  }
}

function classifyFile(headers) {
  const lc = headers.map(h => h.toLowerCase());
  if (lc.some(h => h.includes('country'))) return 'country';
  if (lc.some(h => h.includes('url')) || lc.some(h => h.includes('page'))) return 'url';
  if (lc.some(h => h.includes('device'))) return 'device';
  if (lc.some(h => h.includes('browser'))) return 'browser';
  if (lc.some(h => h.includes('os') || h.includes('operating'))) return 'os';
  return 'unknown';
}

(async () => {
  const files = fs.readdirSync(EXPORTS_DIR).filter(f => f.toLowerCase().endsWith('.csv'));
  if (!files.length) {
    console.log(`No CSV files found in ${EXPORTS_DIR}`);
    console.log('\nTo export from Clarity:');
    console.log('  1. https://clarity.microsoft.com → your project');
    console.log('  2. Set date range to "Last 90 days" (or custom)');
    console.log('  3. From Insights / Top URLs / Sessions reports, click "⋯" → Export CSV');
    console.log(`  4. Save CSVs to: ${EXPORTS_DIR}`);
    console.log('  5. Re-run this script');
    process.exit(0);
  }

  console.log(`Found ${files.length} CSV file(s) in ${EXPORTS_DIR}\n`);

  const result = {
    ingestedAt: new Date().toISOString(),
    files: [],
    perUrl: {},
    perCountry: {},
    perDevice: {},
    perBrowser: {},
  };

  for (const file of files) {
    const fullPath = path.join(EXPORTS_DIR, file);
    const text = fs.readFileSync(fullPath, 'utf8');
    const { headers, rows } = parseCsv(text);
    const kind = classifyFile(headers);
    console.log(`  ${file} — ${kind} dimension, ${rows.length} rows, columns: [${headers.join(', ')}]`);
    result.files.push({ name: file, kind, rowCount: rows.length, columns: headers });

    // Try to aggregate based on detected kind
    for (const row of rows) {
      const obj = {};
      headers.forEach(h => { obj[h] = row[h]; });

      if (kind === 'url') {
        // Find the URL column
        const urlKey = headers.find(h => /url|page/i.test(h));
        if (!urlKey) continue;
        const url = normalizeUrl(row[urlKey]);
        if (!result.perUrl[url]) result.perUrl[url] = [];
        result.perUrl[url].push({ source: file, ...obj });
      } else if (kind === 'country') {
        const ckey = headers.find(h => /country/i.test(h));
        if (!ckey) continue;
        const country = row[ckey];
        if (!result.perCountry[country]) result.perCountry[country] = [];
        result.perCountry[country].push({ source: file, ...obj });
      } else if (kind === 'device') {
        const dkey = headers.find(h => /device/i.test(h));
        if (!dkey) continue;
        const device = row[dkey];
        if (!result.perDevice[device]) result.perDevice[device] = [];
        result.perDevice[device].push({ source: file, ...obj });
      } else if (kind === 'browser') {
        const bkey = headers.find(h => /browser/i.test(h));
        if (!bkey) continue;
        const browser = row[bkey];
        if (!result.perBrowser[browser]) result.perBrowser[browser] = [];
        result.perBrowser[browser].push({ source: file, ...obj });
      }
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(`\nAggregate saved to ${OUT}`);
  console.log('\nQuick summary:');
  console.log(`  URLs covered: ${Object.keys(result.perUrl).length}`);
  console.log(`  Countries: ${Object.keys(result.perCountry).length}`);
  console.log(`  Devices: ${Object.keys(result.perDevice).length}`);
  console.log(`  Browsers: ${Object.keys(result.perBrowser).length}`);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
