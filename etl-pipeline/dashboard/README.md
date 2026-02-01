# Octup Sales Risk & Performance Dashboard

A React-based dashboard for monitoring sales pipeline health, deal risks, and rep performance. Connects to BigQuery for real-time data.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  React Frontend │─────▶│  Express API    │─────▶│    BigQuery     │
│  (localhost:3000)│      │  (localhost:3001)│      │  octup-testing  │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Features

- **AI Executive Summary**: Gemini-powered insights displayed prominently at the top
- **KPI Cards**: Total Pipeline, Weighted Pipeline, % At Risk, Win Rate
- **Risk Command Center**: Filterable table with conditional formatting for at-risk deals
- **Rep Ramp Curve**: Area chart showing cumulative ARR by tenure quarter (Q1-Q6)
- **Pending Rebook Queue**: Chanan's queue for no-show/canceled meetings (separate from risk)

## Quick Start

### Prerequisites

1. **Node.js 18+** installed
2. **Google Cloud authentication** configured (one of these options):
   - Run `gcloud auth application-default login` (recommended for local dev)
   - Or set `GOOGLE_APPLICATION_CREDENTIALS` to a service account key file

### Step 1: Start the Backend API

```bash
cd etl-pipeline/dashboard/server
npm install
npm start
```

You should see:
```
╔══════════════════════════════════════════════════════════════╗
║           Octup Dashboard API Server                         ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:3001                    ║
║  BigQuery Project:  octup-testing                            ║
║  Dataset:           hubspot_data                             ║
╚══════════════════════════════════════════════════════════════╝
```

### Step 2: Start the React Frontend

In a **new terminal**:

```bash
cd etl-pipeline/dashboard
npm install
npm start
```

The dashboard opens at http://localhost:3000

## Environment Variables

### Backend (`server/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `BIGQUERY_PROJECT_ID` | GCP project ID | `octup-testing` |
| `BIGQUERY_DATASET` | BigQuery dataset | `hubspot_data` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key | Uses ADC |
| `PORT` | Server port | `3001` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:3000` |
| `HUBSPOT_PORTAL_ID` | For generating HubSpot links | - |

### Frontend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:3001/api` |
| `REACT_APP_DATA_SOURCE` | `api` for BigQuery, `mock` for demo | `api` |

## BigQuery Views Used

| View | Purpose | Query Pattern |
|------|---------|---------------|
| `v_ceo_dashboard` | Top-line KPIs | Single row, latest data |
| `v_ai_executive_summary` | AI insights | ORDER BY generated_at DESC LIMIT 1 |
| `v_deals_at_risk` | Risk Command Center | WHERE snapshot_date = MAX(snapshot_date) |
| `v_rep_ramp_chart` | Rep performance | All data, filtered Q1-Q6 |
| `v_multi_threading` | Threading analysis | WHERE snapshot_date = MAX(snapshot_date) |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/dashboard` | All data in one call (recommended) |
| `GET /api/kpis` | CEO Dashboard KPIs |
| `GET /api/ai-summary` | AI Executive Summary |
| `GET /api/deals-at-risk` | Risk Command Center |
| `GET /api/pending-rebook` | Pending Rebook Queue |
| `GET /api/rep-ramp` | Rep Ramp Chart |
| `GET /api/multi-threading` | Threading Analysis |

## Business Logic

### Risk Thresholds (from v_deals_at_risk)
- **Enterprise deals**: ARR >= $100,000
- **Stalled**: 14 days (standard) / 30 days (enterprise) in same stage
- **Ghosted**: 5 days (standard) / 10 days (enterprise) no activity

### Overrides
Deals are NOT marked at-risk if:
- `has_upcoming_meeting = TRUE`
- `has_recent_activity = TRUE`

### Pending Rebook (Chanan)
`is_pending_rebook = TRUE` means the deal needs meeting rescheduled.
This is NOT a risk status - it's a separate operational queue.

### Rep Ramp Quarter
```sql
quarter_of_tenure = FLOOR(DATE_DIFF(closedate, hire_date, DAY) / 91) + 1
```

## Project Structure

```
dashboard/
├── public/
│   └── index.html
├── server/                        # Backend API
│   ├── services/
│   │   └── bigQueryService.js     # BigQuery queries
│   ├── index.js                   # Express server
│   ├── package.json
│   └── .env                       # Backend config
├── src/
│   ├── components/
│   │   ├── AIExecutiveSummary.jsx
│   │   ├── KPICards.jsx
│   │   ├── PendingRebook.jsx
│   │   ├── RepRampChart.jsx
│   │   └── RiskCommandCenter.jsx
│   ├── data/
│   │   └── mockData.js            # Demo data (fallback)
│   ├── services/
│   │   └── api.js                 # API client
│   ├── App.jsx
│   ├── index.css
│   └── index.js
├── package.json
├── tailwind.config.js
├── .env                           # Frontend config
└── README.md
```

## Troubleshooting

### "Cannot connect to API server"

1. Make sure the backend is running on port 3001
2. Check that `REACT_APP_API_URL` matches the backend URL

### "BigQuery authentication error"

1. Run `gcloud auth application-default login`
2. Or set `GOOGLE_APPLICATION_CREDENTIALS` in `server/.env`

### "No data returned"

1. Verify the BigQuery views exist: `bq ls octup-testing:hubspot_data`
2. Check that `snapshot_date` has recent data

### Use Demo Mode

If you can't connect to BigQuery, use mock data:

```bash
# In .env
REACT_APP_DATA_SOURCE=mock
```

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Tremor UI
- **Backend**: Express.js, @google-cloud/bigquery
- **Data**: BigQuery (octup-testing.hubspot_data)
