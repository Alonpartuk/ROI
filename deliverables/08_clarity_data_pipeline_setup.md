# Deliverable 8 — Clarity Data Pipeline Setup

**Goal:** Continuously accumulate Microsoft Clarity behavioral data so we can run real CRO analysis at 30/60/90-day windows.

**Two paths set up:**
1. **Daily cron via GitHub Actions** → forward-looking, accumulates over time
2. **Manual dashboard exports** → backward-looking, retrospective 90-day data

---

## Path 1 — Daily GitHub Actions cron (5-min setup)

**What it does:** every day at 6 AM UTC, the action pulls 1 day of Clarity insights across 6 dimensions and commits the result to `clarity_data/YYYY-MM-DD.json`. Over time, you get one file per day.

### Files already created

- `etl-pipeline/dashboard/server/scripts/clarity_daily_cron.js` — the script
- `.github/workflows/clarity-daily-pull.yml` — the GitHub Actions workflow

### Setup steps (one-time, ~5 min)

1. **Add 2 secrets to your GitHub repo:**
   - Open the repo on GitHub → Settings → Secrets and variables → Actions
   - Click **"New repository secret"** twice:
     - Name: `CLARITY_API_TOKEN` · Value: paste the token from your `.env`
     - Name: `CLARITY_PROJECT_ID` · Value: paste the project ID from your `.env`

2. **Commit the workflow + script files to the repo** (they're already created locally):
   ```bash
   git add .github/workflows/clarity-daily-pull.yml \
           etl-pipeline/dashboard/server/scripts/clarity_daily_cron.js \
           etl-pipeline/dashboard/server/services/clarityService.js
   git commit -m "ci: daily Clarity insights cron"
   git push
   ```

3. **Trigger first run manually to verify:**
   - GitHub → Actions tab → "Clarity daily insights pull" workflow → "Run workflow" button
   - Watch the run; should succeed in <1 min
   - Check that `clarity_data/2026-04-26.json` (or today's date) was committed

4. **Monitor over time:**
   - Each day at 6 AM UTC, the cron runs and commits a new file
   - After 30 days you'll have ~30 daily JSONs accumulated
   - Run `scripts/clarity_analyze.js` (need to update it to read multiple files) to roll up

### What if the action fails?

- Most common cause: GitHub secret was pasted with stray whitespace or wrong name. Re-check secret names match the env var names exactly.
- Clarity API rate limit (10 calls/day) is well below our 6-query consumption — won't hit it under normal cron.
- If Clarity returns 403, run the local audit script first to validate the token works.

---

## Path 2 — Manual dashboard exports (one-time, gives 90-day retrospective)

**What it does:** lets you grab 90 days of historical data from Clarity's web UI and ingest it into our analysis.

### Files already created

- `etl-pipeline/dashboard/server/scripts/clarity_ingest_dashboard_exports.js` — ingests CSVs
- `clarity_dashboard_exports/` folder at repo root (gitignored — contains sensitive raw URLs)

### Setup steps (~30 min)

1. **Open Clarity dashboard:** https://clarity.microsoft.com → your project

2. **Set date range to "Last 90 days"** (top right corner)

3. **Export from each report you want:**
   - **Insights** report (frustration scores per URL): "⋯" menu → Export to CSV
   - **Top URLs by traffic**: same export pattern
   - **Country / Device / Browser breakdown** if shown
   - Each export goes to `c:/Users/AlonPartuk/ROI/clarity_dashboard_exports/`

4. **Run the ingestion script:**
   ```bash
   cd etl-pipeline/dashboard/server
   node scripts/clarity_ingest_dashboard_exports.js
   ```

5. **The script:**
   - Auto-detects each CSV's structure (URL / Country / Device / Browser dimension)
   - Normalizes URLs (strips UTM/gclid params)
   - Aggregates across all files
   - Writes `clarity_dashboard_aggregate.json` at repo root

6. **The output:** a single JSON file you can hand to me for cross-reference with the API data and the wider audit.

### What CSV columns to expect

Clarity exports vary by report. Common columns:
- **Insights summary**: URL, Sessions, Dead Click %, Rage Click %, Quick Back %, Excessive Scroll %
- **Top URLs**: URL, Sessions, Page Views, Avg Time on Page
- **Frustration scores**: URL, Score, Sessions
- **Geo**: Country, Sessions, Page Views

The ingestion script handles any combination automatically.

---

## What happens after both paths are set up

After both:
- You have **historical 90-day Clarity data** (Path 2)
- You have **forward-looking daily Clarity data** accumulating from today (Path 1)
- Combined → continuous CRO behavioral baseline

I'll then write a `clarity_full_analysis.js` script that:
- Reads `clarity_dashboard_aggregate.json` (historical) + `clarity_data/*.json` (recent)
- Joins both into one timeline
- Generates per-page friction-trend charts
- Cross-references with HubSpot conversion data for full funnel analysis
- Updates the v3 deep audit with real Clarity findings (not just 3-day directional ones)

---

## Privacy / data hygiene notes

- `clarity_dashboard_exports/` is **gitignored** — raw exports may contain full URLs with UTM/gclid params. Stays local.
- `clarity_data/` daily files are **committed** — they're aggregated metrics with no PII.
- `clarity_dashboard_aggregate.json` is **gitignored** — same reason as exports folder.
- API token + Project ID in `.env` are gitignored as always.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `403 Forbidden` from Clarity API | Token pasted with leading/trailing whitespace, OR token is wrong type. Re-copy from Clarity → Settings → Data Export |
| Cron action fails with "module not found" | `npm ci` step failed — check `package-lock.json` is committed to repo |
| Token works locally but fails in Actions | GitHub secret name typo, or value didn't paste cleanly. Re-create the secret. |
| `clarity_data/` doesn't appear after cron run | Workflow ran but didn't commit (maybe file existed already). Check Actions log for the commit step. |
| Dashboard CSV has weird columns | Edit `classifyFile()` in `clarity_ingest_dashboard_exports.js` to handle the new column patterns |
