# Vertex AI Pipeline Intelligence

## Overview

The "Ask about your pipeline" feature has been upgraded to use **Vertex AI (Gemini 2.0 Flash)** with direct access to BigQuery RevOps views. The AI acts as a **Senior RevOps Director** providing strategic insights and actionable recommendations.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Express API   │────▶│   Vertex AI     │
│   (React)       │     │   /ask-pipeline │     │   Gemini 2.0    │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 │                       │ Function
                                 │                       │ Calling
                                 │                       ▼
                                 │              ┌─────────────────┐
                                 └─────────────▶│   BigQuery      │
                                                │   RevOps Views  │
                                                └─────────────────┘
```

---

## API Endpoints

### POST `/api/ask-pipeline`

Natural language query powered by Gemini 2.0 Flash with function calling.

**Request:**
```json
{
  "query": "How is my pipeline doing?",
  "conversation_history": []  // Optional: for multi-turn conversations
}
```

**Response:**
```json
{
  "success": true,
  "query": "How is my pipeline doing?",
  "response": "Here's a snapshot of your current pipeline health...",
  "function_calls": 2,
  "model": "gemini-2.0-flash-exp",
  "duration_ms": 8531,
  "generated_at": "2026-01-31T22:40:54.595Z"
}
```

### GET `/api/pipeline-insights`

Quick pre-computed snapshot of key metrics (no AI processing).

**Response:**
```json
{
  "pace": {
    "status": "BEHIND",
    "progress_pct": 4.7,
    "current_pace_monthly": 46452,
    "required_pace_monthly": 489536,
    "pace_delta_monthly": -443084,
    "deals_still_needed": 25
  },
  "zombies": {
    "count": 7,
    "total_value": 384000
  },
  "at_risk": {
    "count": 76,
    "total_value": 3314000
  },
  "quality": {
    "status_badge": "YELLOW",
    "weighted_pipeline": 867700,
    "stalled_pct": 24.7
  }
}
```

---

## BigQuery Views Available

The AI can query these 8 RevOps views via function calling:

| View | Purpose | Key Columns |
|------|---------|-------------|
| `v_pace_to_goal` | Q1 progress toward $1.6M target | pace_status, current_pace_monthly, required_pace_monthly |
| `v_pipeline_quality_trend` | Daily pipeline snapshots | gross_pipeline, weighted_pipeline, committed_pipeline, status_badge |
| `v_deal_focus_score` | Deal prioritization (0-100) | focus_score, is_at_risk, risk_priority |
| `v_zombie_deals` | Deals to close-lost | zombie_reason, days_since_creation |
| `v_contact_health` | Contact engagement per deal | contact_count, health_status |
| `v_stage_slippage_analysis` | Stage slippage metrics | slipping_deal_count, slipping_value |
| `v_rep_focus_view` | Per-rep at-risk summary | deals_needing_attention, total_at_risk_arr |
| `v_leaderboard_time_travel` | Time-period leaderboards | net_pipeline_added, won_value |

---

## RevOps Glossary (Injected into AI Context)

### Pipeline Metrics
- **Gross Pipeline**: Total value of all open deals (unweighted)
- **Weighted Pipeline**: Pipeline value × deal probability
- **Committed Pipeline**: Weighted pipeline EXCLUDING stalled/delayed deals
- **ARR**: Annual Recurring Revenue

### Pace Metrics
- **Current Pace (Monthly)**: `QTD Won Value ÷ Days Elapsed × 30`
- **Required Pace (Monthly)**: `Remaining Gap ÷ Days Remaining × 30`
- **Pace Delta**: Current Pace - Required Pace (positive = ahead)

### Deal Health Indicators
- **Focus Score (0-100)**:
  - Engagement (30 pts): Activity within 14 days
  - Threading (30 pts): 2+ contacts = full score
  - Stage Age (20 pts): Fresher deals score higher
  - Size (20 pts): Larger deals score higher
- **At-Risk Deal**: Ghosted, Under-threaded, or Stalled
- **Zombie Deal**: >3× median sales cycle, no activity, or >180 days stuck

### Contact Health Status
- **GREEN**: 2+ contacts AND activity within 14 days
- **YELLOW**: 1 contact OR activity 14-21 days ago
- **RED**: 0 contacts OR no activity >14 days

---

## AI Persona: Senior RevOps Director

The AI is instructed to:

1. **Lead with the most important insight**
2. **Use specific numbers from the data**
3. **Provide 3 actionable recommendations**
4. **Be direct and data-driven - no fluff**

### Example Query & Response

**Query:** "How is my pipeline doing?"

**Response:**
```
Here's a snapshot of your current pipeline health:

**The most important insight: We are significantly behind pace to hit the Q1 target.**

- **Pace Status:** BEHIND. Only 4.7% of the $1.6M target has been achieved.
- **Current Pace:** $46K monthly ARR.
- **Required Pace:** $490K monthly ARR needed to hit the target.
- **Pace Delta:** -$443K gap between where we are and where we need to be.
- **Deals Needed:** 25 more deals at $40K ACV.
- **Pipeline Quality:** YELLOW. Stalled percentage is high at 24.7%

**Recommendations:**

1. **Address Stalled Deals Urgently:** 25% of deals are stalled. Focus on
   re-engaging the largest stalled deals by ARR.
2. **Improve Deal Velocity:** Analyze stage slippage to identify bottlenecks.
3. **Increase Pipeline Generation:** With 25 deals needed, ramp up lead
   generation immediately.
```

---

## Function Calling Implementation

The AI uses Vertex AI's function calling to execute BigQuery queries:

```javascript
// Function declaration
{
  name: 'query_bigquery',
  description: 'Execute a SELECT query against BigQuery RevOps views',
  parameters: {
    type: 'object',
    properties: {
      sql_query: {
        type: 'string',
        description: 'The SELECT SQL query to execute'
      }
    },
    required: ['sql_query']
  }
}
```

### Security Measures
- Only SELECT statements allowed
- Blocked: DROP, DELETE, INSERT, UPDATE, CREATE, ALTER, TRUNCATE
- 100MB query limit
- Results limited to 100 rows

---

## Frontend Integration

### Using the API

```javascript
import { askPipeline, getPipelineInsights } from './services/api';

// Natural language query
const result = await askPipeline("Show me zombie deals");
console.log(result.response);

// Quick insights (no AI)
const insights = await getPipelineInsights();
console.log(insights.pace.status);
```

### Example Queries to Try

- "How is my pipeline doing?"
- "Show me the zombie deals that need attention"
- "What's our pace to goal?"
- "Which reps have the most at-risk deals?"
- "What deals are stuck in negotiation?"
- "Give me a summary of pipeline quality this week"

---

## Files Modified/Created

| File | Change |
|------|--------|
| `server/services/aiService.js` | **NEW** - Vertex AI integration |
| `server/index.js` | Added `/api/ask-pipeline` and `/api/pipeline-insights` endpoints |
| `server/package.json` | Added `@google-cloud/vertexai` dependency |
| `src/services/api.js` | Added `askPipeline()` and `getPipelineInsights()` functions |

---

## Configuration

### Environment Variables

```bash
# Optional: Override defaults
GCP_PROJECT=octup-testing
VERTEX_AI_MODEL=gemini-2.0-flash-exp  # or gemini-1.5-pro, gemini-1.5-flash
```

### Model Options

| Model | Speed | Cost | Best For |
|-------|-------|------|----------|
| `gemini-2.0-flash-exp` | Fast | Low | Default choice |
| `gemini-1.5-flash` | Fast | Low | Simple queries |
| `gemini-1.5-pro` | Slower | Higher | Complex analysis |

---

## Testing

```bash
# Test quick insights
curl http://localhost:3001/api/pipeline-insights

# Test AI query
curl -X POST http://localhost:3001/api/ask-pipeline \
  -H "Content-Type: application/json" \
  -d '{"query": "How is my pipeline doing?"}'
```

---

## Performance

| Metric | Value |
|--------|-------|
| Average response time | 3-8 seconds |
| Function calls per query | 1-3 |
| BigQuery cost per query | ~$0.001 |
| Vertex AI cost per query | ~$0.01 |

---

## Future Enhancements

1. **Conversation Memory**: Store conversation history for follow-up questions
2. **Caching**: Cache common queries for faster responses
3. **Alerts**: Proactive notifications when metrics cross thresholds
4. **Export**: Generate PDF reports from AI insights
5. **Voice**: Add speech-to-text for voice queries
