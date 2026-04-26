/**
 * Microsoft Clarity Data Export API service.
 *
 * Endpoint: https://www.clarity.ms/export-data/api/v1/project-live-insights
 *
 * The API returns aggregated metrics for the last 1, 2, or 3 days, optionally
 * filtered by up to 3 dimensions (Browser, Device, OS, Country, URL, etc.).
 *
 * Auth: Bearer token (Clarity Data Export API key from Settings → Data Export).
 * Rate limit: per Microsoft docs, 10 requests/day with 24h soft window for the
 * data-export endpoint variant. The live-insights endpoint is more lenient but
 * we'll still throttle conservatively.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const TOKEN = process.env.CLARITY_API_TOKEN;
const PROJECT_ID = process.env.CLARITY_PROJECT_ID;
if (!TOKEN) throw new Error('CLARITY_API_TOKEN is not set in .env');
if (!PROJECT_ID) throw new Error('CLARITY_PROJECT_ID is not set in .env');

const ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';

const MIN_GAP_MS = 1500;
let lastCallAt = 0;

async function throttle() {
  const now = Date.now();
  const wait = lastCallAt + MIN_GAP_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

/**
 * Build a Clarity query URL.
 *
 * @param {Object} opts
 * @param {number} opts.numOfDays  1, 2, or 3 (default: 3)
 * @param {string} [opts.dimension1] e.g. "URL", "Browser", "Device", "Country", "OS"
 * @param {string} [opts.dimension2]
 * @param {string} [opts.dimension3]
 */
function buildUrl({ numOfDays = 3, dimension1, dimension2, dimension3 } = {}) {
  const params = new URLSearchParams();
  params.set('numOfDays', String(numOfDays));
  if (dimension1) params.set('dimension1', dimension1);
  if (dimension2) params.set('dimension2', dimension2);
  if (dimension3) params.set('dimension3', dimension3);
  return `${ENDPOINT}?${params.toString()}`;
}

async function fetchInsights(opts = {}) {
  await throttle();
  const url = buildUrl(opts);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Clarity API ${res.status}: ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Clarity returned non-JSON: ${text.slice(0, 400)}`);
  }
}

module.exports = {
  fetchInsights,
  buildUrl,
  PROJECT_ID,
};
