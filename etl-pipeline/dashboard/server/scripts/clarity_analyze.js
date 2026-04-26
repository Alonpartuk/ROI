/**
 * Analyze the raw Clarity audit data:
 *   - Normalize URLs (strip query params + trailing slashes)
 *   - Aggregate metrics per normalized URL
 *   - Surface hotspots (dead clicks, rage clicks, quick backs, excessive scrolling, JS errors, scroll depth)
 *   - Compare across the 9 priority landing pages
 */
const fs = require('fs');
const path = require('path');

const IN = path.resolve(__dirname, '..', '..', '..', '..', 'clarity_audit.json');
const OUT = path.resolve(__dirname, '..', '..', '..', '..', 'clarity_analysis.json');
const audit = JSON.parse(fs.readFileSync(IN, 'utf8'));

function normalizeUrl(u) {
  if (!u) return '(none)';
  try {
    const url = new URL(u);
    return (url.origin + url.pathname).replace(/\/$/, '');
  } catch {
    return u.split('?')[0].replace(/\/$/, '');
  }
}

function num(v) { return parseFloat(v) || 0; }

const PRIORITY_PAGES = [
  'https://www.octup.com',
  'https://www.octup.com/get-demo',
  'https://www.octup.com/pricing',
  'https://www.octup.com/features/billing',
  'https://www.octup.com/features/analytics',
  'https://www.octup.com/features/octup-ai',
  'https://www.octup.com/customer-stories',
  'https://www.octup.com/features/integrations',
  'https://www.octup.com/features/brand-portal',
  'https://www.octup.com/platform',
];

// --- Aggregate "by URL" data ---
const byUrl = audit.queries.byUrl;
const aggregated = {}; // normalizedUrl → { metric: { sessions, sessionsWithMetric, subTotal, ... } }

if (Array.isArray(byUrl)) {
  for (const metric of byUrl) {
    const name = metric.metricName;
    for (const info of (metric.information || [])) {
      const normUrl = normalizeUrl(info.Url);
      if (!aggregated[normUrl]) aggregated[normUrl] = {};
      if (!aggregated[normUrl][name]) {
        aggregated[normUrl][name] = {
          totalSessions: 0,
          sessionsWithMetric: 0,
          totalSubTotal: 0,
          rawRows: 0,
        };
      }
      const slot = aggregated[normUrl][name];
      slot.totalSessions += num(info.sessionsCount);
      slot.sessionsWithMetric += (num(info.sessionsWithMetricPercentage) / 100) * num(info.sessionsCount);
      slot.totalSubTotal += num(info.subTotal);
      slot.rawRows += 1;
    }
  }
}

// --- Build per-page summary, prioritizing priority pages ---
console.log('=== CLARITY ANALYSIS — ON-PAGE BEHAVIOR (last 3 days) ===\n');

// 1. Total sessions per page
console.log('--- SESSION VOLUME BY PAGE (ranked) ---');
const pagesWithVolume = Object.entries(aggregated)
  .map(([url, metrics]) => ({
    url,
    isPriority: PRIORITY_PAGES.includes(url),
    sessions: Object.values(metrics).reduce((max, m) => Math.max(max, m.totalSessions), 0),
    metrics,
  }))
  .filter(p => p.sessions > 0)
  .sort((a, b) => b.sessions - a.sessions)
  .slice(0, 30);

pagesWithVolume.forEach(p => {
  const tag = p.isPriority ? '⭐' : '  ';
  console.log(`  ${tag} ${String(p.sessions).padStart(4)} sessions  ${p.url}`);
});

// 2. Friction signals per priority page
console.log('\n--- FRICTION SIGNALS PER PRIORITY PAGE ---\n');
for (const url of PRIORITY_PAGES) {
  const m = aggregated[url];
  if (!m) {
    console.log(`${url}: (no data — page had no sessions in last 3 days)`);
    continue;
  }

  const sessions = Math.max(...Object.values(m).map(x => x.totalSessions));
  console.log(`▼ ${url}  (${sessions} sessions)`);

  const metricsToCheck = [
    'DeadClickCount',
    'RageClickCount',
    'ExcessiveScroll',
    'QuickbackClick',
    'ScriptErrorCount',
    'ScrollDepth',
  ];

  for (const metric of metricsToCheck) {
    if (m[metric]) {
      const pct = sessions ? (m[metric].sessionsWithMetric / sessions * 100).toFixed(1) : '0.0';
      const subTotal = m[metric].totalSubTotal.toFixed(0);
      console.log(`    ${metric.padEnd(25)} ${pct}% sessions affected  (subtotal: ${subTotal})`);
    }
  }
  console.log('');
}

// 3. Worst-offenders summary
console.log('\n--- WORST OFFENDERS BY METRIC (across all URLs) ---\n');
function worstByMetric(metric, top = 5) {
  const candidates = Object.entries(aggregated)
    .map(([url, m]) => ({
      url,
      sessions: m[metric]?.totalSessions || 0,
      pct: m[metric]?.totalSessions ? (m[metric].sessionsWithMetric / m[metric].totalSessions * 100) : 0,
    }))
    .filter(c => c.sessions >= 5) // require minimum sample
    .sort((a, b) => b.pct - a.pct)
    .slice(0, top);
  return candidates;
}

for (const metric of ['DeadClickCount', 'RageClickCount', 'ExcessiveScroll', 'QuickbackClick', 'ScriptErrorCount']) {
  console.log(`${metric}:`);
  const worst = worstByMetric(metric, 8);
  if (!worst.length) {
    console.log('  (no rows with enough sessions)');
  } else {
    worst.forEach(w => {
      console.log(`  ${w.pct.toFixed(1).padStart(5)}%  (${String(w.sessions).padStart(3)} sess)  ${w.url}`);
    });
  }
  console.log('');
}

// 4. Device breakdown
console.log('\n--- DEVICE BREAKDOWN (overall) ---\n');
const byDevice = audit.queries.byDevice;
if (Array.isArray(byDevice)) {
  for (const metric of byDevice.slice(0, 4)) {
    console.log(`${metric.metricName}:`);
    for (const info of (metric.information || []).slice(0, 5)) {
      const dev = info.Device || '(?)';
      console.log(`  ${dev.padEnd(15)} ${info.sessionsCount} sessions, ${info.sessionsWithMetricPercentage}% with metric`);
    }
    console.log('');
  }
}

// 5. Country breakdown
console.log('\n--- COUNTRY BREAKDOWN (sessions volume) ---\n');
const byCountry = audit.queries.byCountry;
if (Array.isArray(byCountry)) {
  // Find the metric with most info rows (typically Traffic or sessions)
  const m0 = byCountry[0];
  if (m0?.information) {
    const sorted = [...m0.information]
      .map(i => ({ country: i.Country, sessions: num(i.sessionsCount) }))
      .filter(x => x.country && x.sessions > 0)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 15);
    sorted.forEach(s => console.log(`  ${String(s.sessions).padStart(4)}  ${s.country}`));
  }
}

// Save aggregated for downstream use
fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'Clarity Live Insights API (3 days)',
  pagesByVolume: pagesWithVolume,
  perPageMetrics: Object.fromEntries(PRIORITY_PAGES.map(url => [url, aggregated[url] || null])),
  worstOffenders: Object.fromEntries(['DeadClickCount', 'RageClickCount', 'ExcessiveScroll', 'QuickbackClick', 'ScriptErrorCount'].map(m => [m, worstByMetric(m, 10)])),
}, null, 2));
console.log(`\nSaved ${OUT}`);
