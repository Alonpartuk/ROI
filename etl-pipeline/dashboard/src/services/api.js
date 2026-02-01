/**
 * API Service for Octup Dashboard
 * ================================
 * Connects React frontend to the Express backend which queries BigQuery.
 *
 * Configuration:
 * - Set REACT_APP_API_URL in .env to point to your backend
 * - Default: http://localhost:3001/api
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Default timeout for API requests (30 seconds)
const DEFAULT_TIMEOUT = 30000;

/**
 * Custom error class for API errors
 */
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new APIError('Request timeout - BigQuery may be slow', 408, null);
    }
    throw error;
  }
}

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(
        data.message || data.error || 'API request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError(
        'Cannot connect to API server. Make sure the backend is running.',
        0,
        null
      );
    }

    throw new APIError(error.message, 500, null);
  }
}

// =============================================================================
// API Endpoints
// =============================================================================

/**
 * Health check
 */
export async function checkHealth() {
  return apiRequest('/health');
}

/**
 * Fetch all dashboard data in one call (recommended)
 * Returns all data needed for the 4-tab dashboard
 */
export async function fetchDashboardData() {
  const data = await apiRequest('/dashboard');

  // Map response to expected format for components
  return {
    kpis: data.kpis,
    aiSummary: data.aiSummary,
    dealsAtRisk: data.dealsAtRisk || [],
    pendingRebook: data.pendingRebook || [],
    repRamp: data.repRamp || [],
    multiThreading: data.multiThreading || [],
    forecastAnalysis: data.forecastAnalysis,
    stageLeakage: data.stageLeakage || [],
    closeDateSlippage: data.closeDateSlippage || [],
    salesVelocity: data.salesVelocity || [],
    winRateAnalysis: data.winRateAnalysis || [],
    nextStepCoverage: data.nextStepCoverage || [],
    owners: data.owners || [],
    ownerLeaderboard: data.ownerLeaderboard || [],
    sdrLeaderboard: data.sdrLeaderboard || [],
    sdrMeetingOutcomes: data.sdrMeetingOutcomes || [],
    pipelineTrend: data.pipelineTrend || [],
    dailyDealMovements: data.dailyDealMovements || [],
    dealVelocity: data.dealVelocity || {},
    periodWonDeals: data.periodWonDeals || [],
    // RevOps Layer 1 data
    paceToGoal: data.paceToGoal || null,
    pipelineQualityTrend: data.pipelineQualityTrend || [],
  };
}

/**
 * Fetch CEO Dashboard KPIs
 */
export async function fetchKPIs() {
  return apiRequest('/kpis');
}

/**
 * Fetch AI Executive Summary
 */
export async function fetchAISummary() {
  return apiRequest('/ai-summary');
}

/**
 * Fetch Deals At Risk
 */
export async function fetchDealsAtRisk() {
  return apiRequest('/deals-at-risk');
}

/**
 * Fetch Pending Rebook Deals (Chanan's Queue)
 */
export async function fetchPendingRebook() {
  return apiRequest('/pending-rebook');
}

/**
 * Fetch Rep Ramp Chart Data
 */
export async function fetchRepRamp() {
  return apiRequest('/rep-ramp');
}

/**
 * Fetch Multi-Threading Analysis
 */
export async function fetchMultiThreading() {
  return apiRequest('/multi-threading');
}

/**
 * Fetch AI Forecast Analysis
 */
export async function fetchForecastAnalysis() {
  return apiRequest('/forecast-analysis');
}

/**
 * Fetch Stage Leakage Data
 */
export async function fetchStageLeakage() {
  return apiRequest('/stage-leakage');
}

/**
 * Fetch Close Date Slippage Data
 */
export async function fetchCloseDateSlippage() {
  return apiRequest('/close-date-slippage');
}

/**
 * Fetch Sales Velocity Data (with optional owner filter)
 */
export async function fetchSalesVelocity(owner = null) {
  const endpoint = owner && owner !== 'all'
    ? `/sales-velocity?owner=${encodeURIComponent(owner)}`
    : '/sales-velocity';
  return apiRequest(endpoint);
}

/**
 * Fetch Win Rate Analysis Data (with optional owner filter)
 */
export async function fetchWinRateAnalysis(owner = null) {
  const endpoint = owner && owner !== 'all'
    ? `/win-rate-analysis?owner=${encodeURIComponent(owner)}`
    : '/win-rate-analysis';
  return apiRequest(endpoint);
}

/**
 * Fetch Next Step Coverage Data
 */
export async function fetchNextStepCoverage() {
  return apiRequest('/next-step-coverage');
}

/**
 * Fetch Recent Closed Deals for Win Rate drill-down
 */
export async function fetchRecentClosedDeals() {
  return apiRequest('/recent-closed-deals');
}

/**
 * Fetch unique owner names for dropdown
 */
export async function fetchOwners() {
  return apiRequest('/owners');
}

/**
 * Process AI Natural Language Query
 * Only sends necessary fields to avoid large payloads
 */
export async function processAIQuery(query, context) {
  // Extract only the fields needed by the backend
  const minimalContext = {
    kpis: context?.kpis || {},
    forecastAnalysis: context?.forecastAnalysis || {},
    // Send minimal deal data - only fields needed for analysis
    dealsAtRisk: (context?.dealsAtRisk || []).map(d => ({
      is_at_risk: d.is_at_risk,
      is_stalled: d.is_stalled,
      is_ghosted: d.is_ghosted,
      arr_value: d.arr_value,
    })),
  };

  return apiRequest('/ai-query', {
    method: 'POST',
    body: JSON.stringify({ query, context: minimalContext }),
  });
}

/**
 * Ask Pipeline - Vertex AI powered natural language query
 * Uses Gemini 1.5 Pro with function calling to query BigQuery views
 * Acts as a "Senior RevOps Director" providing strategic insights
 */
export async function askPipeline(query, conversationHistory = []) {
  return apiRequest('/ask-pipeline', {
    method: 'POST',
    body: JSON.stringify({
      query,
      conversation_history: conversationHistory,
    }),
  });
}

/**
 * Get Quick Pipeline Insights
 * Returns pre-computed summary of pace, zombies, at-risk deals, and quality
 */
export async function getPipelineInsights() {
  return apiRequest('/pipeline-insights');
}

// =============================================================================
// RevOps Strategic Layer Endpoints
// =============================================================================

/**
 * Fetch Pipeline Quality Trend (8-12 week timeline)
 * Returns: gross_pipeline, weighted_pipeline, committed_pipeline, status_badge
 */
export async function fetchPipelineQualityTrend(days = 30) {
  return apiRequest(`/pipeline-quality-trend?days=${days}`);
}

/**
 * Fetch Pace-to-Goal Metrics
 * Returns: current_pace, required_pace, delta, qtd_won_value, quarterly_target
 */
export async function fetchPaceToGoal() {
  return apiRequest('/pace-to-goal');
}

/**
 * Fetch Stage Slippage Analysis
 * Returns: stage, avg_days, median_target, slipping deals
 */
export async function fetchStageSlippage() {
  return apiRequest('/stage-slippage');
}

/**
 * Fetch Contact Health Status per Deal
 * Returns: deal_id, contact_count, days_since_activity, health_status (RED/YELLOW/GREEN)
 */
export async function fetchContactHealth() {
  return apiRequest('/contact-health');
}

/**
 * Fetch Zombie Deals (auto-excluded stale deals)
 * Returns: deal_id, dealname, owner, arr_value, zombie_reason
 */
export async function fetchZombieDeals() {
  return apiRequest('/zombie-deals');
}

/**
 * Fetch Deal Focus Scores (0-100 prioritization)
 * Returns: deal_id, focus_score, stage_age_score, engagement_score, threading_score, size_score
 */
export async function fetchDealFocusScores() {
  return apiRequest('/deal-focus-scores');
}

/**
 * Fetch Rep Focus View (Top 5 at-risk deals per rep)
 * @param {string} owner - Owner name to filter by
 * Returns: owner_name, top_5_at_risk_deals, weekly_revenue_gap, deals_needing_attention
 */
export async function fetchRepFocus(owner) {
  return apiRequest(`/rep-focus/${encodeURIComponent(owner)}`);
}

/**
 * Fetch Leaderboard with Time-Travel (7d/30d/qtd)
 * @param {string} period - Time period: '7d', '30d', or 'qtd'
 * @param {string} sortBy - Sort field: 'net_pipeline_added', 'stage_movements', 'engagement_score', 'won_value'
 * Returns: owner_name, net_pipeline_added, stage_movements, engagement_score, won_value
 */
export async function fetchLeaderboard(period = '7d', sortBy = 'net_pipeline_added') {
  return apiRequest(`/leaderboard/${period}?sort=${sortBy}`);
}

// =============================================================================
// SDR Leaderboard Endpoints
// =============================================================================

/**
 * Fetch SDR Leaderboard Data with optional week filter
 * @param {string} weekStart - Optional week start date (YYYY-MM-DD format)
 */
export async function fetchSDRLeaderboard(weekStart = null) {
  const endpoint = weekStart
    ? `/sdr-leaderboard?week=${encodeURIComponent(weekStart)}`
    : '/sdr-leaderboard';
  return apiRequest(endpoint);
}

/**
 * Fetch available weeks for SDR Leaderboard dropdown
 * Returns list of week_start dates
 */
export async function fetchSDRAvailableWeeks() {
  return apiRequest('/sdr-available-weeks');
}

/**
 * Fetch NBM deals for a specific SDR in a specific week
 * @param {string} sdrName - The SDR/owner name
 * @param {string} weekStart - Week start date (YYYY-MM-DD format)
 */
export async function fetchSDRDeals(sdrName, weekStart) {
  return apiRequest(`/sdr-deals?sdr=${encodeURIComponent(sdrName)}&week=${encodeURIComponent(weekStart)}`);
}

// =============================================================================
// Utility exports
// =============================================================================

export { APIError };

/**
 * Format currency for display
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-';
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
};

/**
 * Format percentage for display (with 1 decimal)
 */
export const formatPercent = (value) => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(1)}%`;
};

/**
 * Format percentage as whole number (no decimals)
 * Use for Win Rate and similar KPIs
 */
export const formatPercentWhole = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Math.round(value)}%`;
};

/**
 * Format currency rounded to nearest dollar
 */
export const formatCurrencyRounded = (value) => {
  if (value === null || value === undefined) return '-';
  const rounded = Math.round(value);
  if (rounded >= 1000000) {
    return `$${(rounded / 1000000).toFixed(1)}M`;
  } else if (rounded >= 1000) {
    return `$${Math.round(rounded / 1000)}K`;
  }
  return `$${rounded.toLocaleString()}`;
};

/**
 * Format date for display (e.g., "Jan 15, 2025")
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
