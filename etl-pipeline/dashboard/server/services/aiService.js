/**
 * Vertex AI Service for Pipeline Intelligence
 * ============================================
 * Uses Gemini 1.5 Pro with function calling to query BigQuery views
 * Acts as a "Senior RevOps Director" providing strategic insights
 */

const { VertexAI } = require('@google-cloud/vertexai');
const { BigQuery } = require('@google-cloud/bigquery');

// Configuration
const PROJECT_ID = process.env.GCP_PROJECT || 'octup-testing';
const LOCATION = 'us-central1';
// Model options: gemini-1.5-flash (faster), gemini-1.5-pro-001, gemini-2.0-flash-exp
const MODEL_ID = process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash-exp';
const DATASET = 'hubspot_data';

// Initialize clients
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const bigquery = new BigQuery({ projectId: PROJECT_ID });

// ============================================================================
// REVOPS GLOSSARY - Injected into every prompt
// ============================================================================
const REVOPS_GLOSSARY = `
## RevOps Metrics Glossary

### Pipeline Metrics
- **Gross Pipeline**: Total value of all open deals (unweighted)
- **Weighted Pipeline**: Pipeline value × deal probability (more accurate forecast)
- **Committed Pipeline**: Weighted pipeline EXCLUDING stalled/delayed deals
- **ARR (Annual Recurring Revenue)**: The annualized value of a deal

### Pace Metrics
- **Current Pace (Monthly)**: QTD Won Value ÷ Days Elapsed × 30 - your actual monthly run rate
- **Required Pace (Monthly)**: Remaining Gap ÷ Days Remaining × 30 - needed pace to hit target
- **Pace Delta**: Current Pace - Required Pace (positive = ahead, negative = behind)
- **Q1 Target**: $1.6M total ARR goal for Q1

### Deal Health Indicators
- **Focus Score (0-100)**: Prioritization score for deals:
  - Engagement (30 pts): Activity within 14 days
  - Threading (30 pts): 2+ contacts = full score
  - Stage Age (20 pts): Fresher deals score higher
  - Size (20 pts): Larger deals score higher
- **At-Risk Deal**: Ghosted (>14 days no activity), Under-threaded (<2 contacts), or Stalled
- **Zombie Deal**: Deals that should be closed-lost:
  - >3× median sales cycle
  - No activity since creation
  - >180 days stuck in same stage

### Contact Health Status
- **GREEN**: 2+ contacts AND activity within 14 days
- **YELLOW**: 1 contact OR activity 14-21 days ago
- **RED**: 0 contacts OR no activity >14 days

### Status Badges
- **Pipeline Quality Badge**:
  - GREEN: Weighted pipeline UP + Stalled % DOWN
  - YELLOW: Pipeline flat
  - RED: Pipeline DOWN or Stalled % UP
- **Pace Status**:
  - ON_TRACK: Progress ≥ expected for time elapsed
  - AT_RISK: Progress 90-100% of expected
  - BEHIND: Progress <90% of expected
`;

// ============================================================================
// BIGQUERY SCHEMA - Available views for querying
// ============================================================================
const BIGQUERY_SCHEMA = `
## Available BigQuery Views

### 1. v_pace_to_goal
Purpose: Q1 progress toward $1.6M target
Key columns:
- quarter_start, quarter_end, days_elapsed, days_remaining
- qtd_won_value: Won deals value this quarter
- quarterly_target: $1.6M
- remaining_to_target: Gap to close
- current_pace_monthly: Actual monthly run rate
- required_pace_monthly: Needed monthly pace
- pace_delta_monthly: Difference (positive = ahead)
- progress_pct: Percentage of target achieved
- pace_status: ON_TRACK, AT_RISK, or BEHIND
- deals_still_needed: Number of deals needed at $40K ACV

### 2. v_pipeline_quality_trend
Purpose: Daily pipeline chart data
Key columns:
- snapshot_date
- gross_pipeline, weighted_pipeline, committed_pipeline
- stalled_count, total_deals, stalled_pct
- day_over_day_change
- status_badge: GREEN, YELLOW, RED

### 3. v_deal_focus_score
Purpose: Deal prioritization scores (0-100)
Key columns:
- deal_id, dealname, owner_name, arr_value
- dealstage_label, days_in_current_stage
- days_since_activity, contact_count
- engagement_score (30 pts), threading_score (30 pts)
- stage_age_score (20 pts), size_score (20 pts)
- focus_score: Total 0-100
- is_at_risk: TRUE/FALSE
- risk_priority: CRITICAL, HIGH, MEDIUM, LOW

### 4. v_zombie_deals
Purpose: Deals to close-lost (auto-excluded)
Key columns:
- deal_id, dealname, owner_name, arr_value
- zombie_reason: Why flagged as zombie
- days_since_creation, days_in_current_stage
- sales_cycle_multiple: How many × median cycle

### 5. v_contact_health
Purpose: Contact engagement per deal
Key columns:
- deal_id, dealname, owner_name
- contact_count, days_since_last_activity
- ae_email_count, ae_meeting_count
- has_exec_sponsor: TRUE/FALSE
- health_status: GREEN, YELLOW, RED

### 6. v_stage_slippage_analysis
Purpose: Deals stuck too long in stages
Key columns:
- stage_name, current_avg_days, median_target_days
- slipping_deal_count, slipping_value
- total_deals, slipping_pct

### 7. v_rep_focus_view
Purpose: Per-rep at-risk summary
Key columns:
- owner_name
- deals_needing_attention, total_at_risk_arr
- weekly_won_value, weekly_target, weekly_revenue_gap
- top_5_at_risk_deals (JSON array)

### 8. v_leaderboard_time_travel
Purpose: Time-period flexible leaderboard
Key columns:
- period: '7d', '30d', 'qtd'
- owner_name
- net_pipeline_added, stage_movements_count
- engagement_score, won_value
`;

// ============================================================================
// SYSTEM PROMPT - Senior RevOps Director Persona
// ============================================================================
const SYSTEM_PROMPT = `You are a Senior RevOps Director with 15+ years of experience optimizing B2B SaaS sales pipelines. You have direct access to the company's BigQuery data warehouse and can query real-time pipeline data.

Your role:
1. Analyze pipeline health and provide strategic insights
2. Identify gaps, risks, and opportunities
3. Give 3 specific, actionable recommendations
4. Be direct and data-driven - no fluff

Communication style:
- Lead with the most important insight
- Use specific numbers from the data
- Prioritize actions by impact
- Be concise but thorough

${REVOPS_GLOSSARY}

${BIGQUERY_SCHEMA}

When answering questions:
1. First, use the query_bigquery tool to get current data
2. Analyze the results in context of the business goals
3. Provide specific, actionable recommendations
4. If data is missing, explain what you'd need to see

Always ground your insights in actual data from the queries.`;

// ============================================================================
// FUNCTION DEFINITIONS - Tools for Gemini
// ============================================================================
const FUNCTION_DECLARATIONS = [
  {
    name: 'query_bigquery',
    description: `Execute a SELECT query against BigQuery RevOps views. Use this to get real-time pipeline data.

Available views:
- v_pace_to_goal: Q1 progress and pace metrics
- v_pipeline_quality_trend: Daily pipeline snapshots
- v_deal_focus_score: Deal prioritization (WHERE is_at_risk = TRUE for at-risk deals)
- v_zombie_deals: Deals to close-lost
- v_contact_health: Contact engagement per deal
- v_stage_slippage_analysis: Stage slippage metrics
- v_rep_focus_view: Per-rep at-risk summary
- v_leaderboard_time_travel: Time-period leaderboards (WHERE period = '7d' or '30d' or 'qtd')

Example queries:
- SELECT * FROM v_pace_to_goal
- SELECT * FROM v_deal_focus_score WHERE is_at_risk = TRUE ORDER BY arr_value DESC LIMIT 10
- SELECT * FROM v_zombie_deals ORDER BY arr_value DESC
- SELECT * FROM v_pipeline_quality_trend ORDER BY snapshot_date DESC LIMIT 7`,
    parameters: {
      type: 'object',
      properties: {
        sql_query: {
          type: 'string',
          description: 'The SELECT SQL query to execute. Only SELECT statements are allowed. Query must reference views in the hubspot_data dataset.',
        },
      },
      required: ['sql_query'],
    },
  },
];

// ============================================================================
// BIGQUERY EXECUTION - Safe query execution
// ============================================================================
async function executeBigQuerySafe(sqlQuery) {
  // Security: Only allow SELECT statements
  const normalizedQuery = sqlQuery.trim().toUpperCase();
  if (!normalizedQuery.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Security: Block dangerous operations
  const blockedPatterns = [
    /DROP\s+/i,
    /DELETE\s+/i,
    /INSERT\s+/i,
    /UPDATE\s+/i,
    /CREATE\s+/i,
    /ALTER\s+/i,
    /TRUNCATE\s+/i,
    /GRANT\s+/i,
    /REVOKE\s+/i,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(sqlQuery)) {
      throw new Error('Query contains blocked operations');
    }
  }

  // Ensure query references our dataset
  const fullQuery = sqlQuery.includes('`')
    ? sqlQuery
    : sqlQuery.replace(
        /\bv_(\w+)/g,
        `\`${PROJECT_ID}.${DATASET}.v_$1\``
      );

  try {
    const [rows] = await bigquery.query({
      query: fullQuery,
      location: 'US',
      maximumBytesBilled: '100000000', // 100MB limit
    });

    // Limit results to prevent huge responses
    const limitedRows = rows.slice(0, 100);

    return {
      success: true,
      row_count: rows.length,
      data: limitedRows,
      truncated: rows.length > 100,
    };
  } catch (err) {
    console.error('BigQuery error:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

// ============================================================================
// FUNCTION CALL HANDLER
// ============================================================================
async function handleFunctionCall(functionCall) {
  const { name, args } = functionCall;

  if (name === 'query_bigquery') {
    const sqlQuery = args.sql_query;
    console.log('[AI Service] Executing BigQuery:', sqlQuery);

    const result = await executeBigQuerySafe(sqlQuery);

    if (result.success) {
      console.log(`[AI Service] Query returned ${result.row_count} rows`);
    } else {
      console.error('[AI Service] Query error:', result.error);
    }

    return result;
  }

  return { error: `Unknown function: ${name}` };
}

// ============================================================================
// MAIN FUNCTION - Ask Pipeline
// ============================================================================
async function askPipeline(userQuery, conversationHistory = []) {
  const startTime = Date.now();
  console.log('[AI Service] Processing query:', userQuery);

  try {
    // Initialize the generative model with function calling
    const generativeModel = vertexAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3, // Lower temperature for more focused responses
        topP: 0.8,
      },
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build conversation contents
    const contents = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
      {
        role: 'user',
        parts: [{ text: userQuery }],
      },
    ];

    // Start chat session
    const chat = generativeModel.startChat({ history: contents.slice(0, -1) });

    // Send message and handle function calls
    let response = await chat.sendMessage(userQuery);
    let responseText = '';
    let functionCallsCount = 0;
    const maxFunctionCalls = 5; // Prevent infinite loops

    // Process function calls iteratively
    while (functionCallsCount < maxFunctionCalls) {
      const candidate = response.response.candidates?.[0];
      if (!candidate) break;

      const content = candidate.content;
      if (!content?.parts) break;

      // Check for ALL function calls in this response (model may call multiple)
      const functionCalls = content.parts.filter(part => part.functionCall);

      if (functionCalls.length > 0) {
        // Execute all function calls
        const functionResponses = [];
        for (const fc of functionCalls) {
          functionCallsCount++;
          console.log(`[AI Service] Function call ${functionCallsCount}:`, fc.functionCall.name);

          // Execute the function
          const functionResult = await handleFunctionCall(fc.functionCall);

          // Build function response part
          functionResponses.push({
            functionResponse: {
              name: fc.functionCall.name,
              response: { content: functionResult },
            },
          });
        }

        // Send ALL function responses together in one message
        response = await chat.sendMessage(functionResponses);
      } else {
        // No more function calls, extract text response
        const textPart = content.parts.find(part => part.text);
        if (textPart) {
          responseText = textPart.text;
        }
        break;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[AI Service] Completed in ${duration}ms with ${functionCallsCount} function calls`);

    return {
      success: true,
      query: userQuery,
      response: responseText,
      function_calls: functionCallsCount,
      model: MODEL_ID,
      duration_ms: duration,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[AI Service] Error:', err);

    // Provide helpful fallback response
    return {
      success: false,
      query: userQuery,
      response: `I encountered an issue analyzing your pipeline. Here's what I can tell you:

**Quick Pipeline Summary:**
To get the most accurate insights, I recommend checking:
1. The Pace-to-Goal tile for Q1 progress
2. The Risk Command Center for at-risk deals
3. The Pipeline Quality Chart for trend analysis

Please try rephrasing your question or ask about specific metrics like:
- "What's our pace to goal?"
- "Show me at-risk deals"
- "How many zombie deals do we have?"`,
      error: err.message,
      generated_at: new Date().toISOString(),
    };
  }
}

// ============================================================================
// QUICK INSIGHTS - Pre-canned analysis for common questions
// ============================================================================
async function getQuickPipelineInsights() {
  try {
    // Execute multiple queries in parallel for a comprehensive snapshot
    const [paceData, zombieData, atRiskData, qualityData] = await Promise.all([
      executeBigQuerySafe('SELECT * FROM v_pace_to_goal'),
      executeBigQuerySafe('SELECT COUNT(*) as count, SUM(arr_value) as total_value FROM v_zombie_deals'),
      executeBigQuerySafe('SELECT COUNT(*) as count, SUM(arr_value) as total_value FROM v_deal_focus_score WHERE is_at_risk = TRUE'),
      executeBigQuerySafe('SELECT * FROM v_pipeline_quality_trend ORDER BY snapshot_date DESC LIMIT 1'),
    ]);

    const pace = paceData.data?.[0] || {};
    const zombies = zombieData.data?.[0] || {};
    const atRisk = atRiskData.data?.[0] || {};
    const quality = qualityData.data?.[0] || {};

    return {
      pace: {
        status: pace.pace_status,
        progress_pct: pace.progress_pct,
        current_pace_monthly: pace.current_pace_monthly,
        required_pace_monthly: pace.required_pace_monthly,
        pace_delta_monthly: pace.pace_delta_monthly,
        deals_still_needed: pace.deals_still_needed,
      },
      zombies: {
        count: Number(zombies.count) || 0,
        total_value: Number(zombies.total_value) || 0,
      },
      at_risk: {
        count: Number(atRisk.count) || 0,
        total_value: Number(atRisk.total_value) || 0,
      },
      quality: {
        status_badge: quality.status_badge,
        weighted_pipeline: quality.weighted_pipeline,
        stalled_pct: quality.stalled_pct,
      },
    };
  } catch (err) {
    console.error('[AI Service] Quick insights error:', err);
    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  askPipeline,
  getQuickPipelineInsights,
  executeBigQuerySafe,
  REVOPS_GLOSSARY,
  BIGQUERY_SCHEMA,
};
