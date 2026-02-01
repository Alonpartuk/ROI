/**
 * Octup Dashboard API Server
 * ==========================
 * Express server that connects React frontend to BigQuery data.
 *
 * Endpoints:
 * - GET /api/dashboard         - All dashboard data (parallel fetch)
 * - GET /api/kpis              - CEO Dashboard KPIs
 * - GET /api/ai-summary        - AI Executive Summary
 * - GET /api/deals-at-risk     - Risk Command Center data
 * - GET /api/pending-rebook    - Chanan's rebook queue
 * - GET /api/rep-ramp          - Rep Ramp Chart data
 * - GET /api/multi-threading   - Multi-threading analysis
 * - GET /api/health            - Health check
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const bigQueryService = require('./services/bigQueryService');
const userService = require('./services/userService');
const aiService = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 8080; // Cloud Run uses 8080 by default
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize users table on startup
userService.ensureUsersTable()
  .then(() => userService.seedInitialUsers())
  .catch(err => console.error('User service init error:', err.message));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Serve static files in production (React build)
if (NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../build');
  app.use(express.static(buildPath));
  console.log(`Serving static files from: ${buildPath}`);
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// =============================================================================
// API Routes
// =============================================================================

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    project: process.env.BIGQUERY_PROJECT_ID || 'octup-testing',
    dataset: process.env.BIGQUERY_DATASET || 'hubspot_data',
  });
});

/**
 * Fetch all dashboard data in one call (recommended for initial load)
 */
app.get('/api/dashboard', async (req, res) => {
  try {
    const data = await bigQueryService.fetchAllDashboardData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Fetch CEO Dashboard KPIs
 */
app.get('/api/kpis', async (req, res) => {
  try {
    const data = await bigQueryService.fetchCEODashboard();
    if (!data) {
      return res.status(404).json({ error: 'No KPI data found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({
      error: 'Failed to fetch KPIs',
      message: error.message,
    });
  }
});

/**
 * Fetch AI Executive Summary
 */
app.get('/api/ai-summary', async (req, res) => {
  try {
    const data = await bigQueryService.fetchAIExecutiveSummary();
    res.json(data);
  } catch (error) {
    console.error('Error fetching AI summary:', error);
    res.status(500).json({
      error: 'Failed to fetch AI summary',
      message: error.message,
    });
  }
});

/**
 * Fetch Deals At Risk
 */
app.get('/api/deals-at-risk', async (req, res) => {
  try {
    const data = await bigQueryService.fetchDealsAtRisk();
    res.json(data);
  } catch (error) {
    console.error('Error fetching deals at risk:', error);
    res.status(500).json({
      error: 'Failed to fetch deals at risk',
      message: error.message,
    });
  }
});

/**
 * Fetch Pending Rebook Deals (Chanan's Queue)
 */
app.get('/api/pending-rebook', async (req, res) => {
  try {
    const data = await bigQueryService.fetchPendingRebook();
    res.json(data);
  } catch (error) {
    console.error('Error fetching pending rebook:', error);
    res.status(500).json({
      error: 'Failed to fetch pending rebook deals',
      message: error.message,
    });
  }
});

/**
 * Fetch Rep Ramp Chart Data
 */
app.get('/api/rep-ramp', async (req, res) => {
  try {
    const data = await bigQueryService.fetchRepRampChart();
    res.json(data);
  } catch (error) {
    console.error('Error fetching rep ramp:', error);
    res.status(500).json({
      error: 'Failed to fetch rep ramp data',
      message: error.message,
    });
  }
});

/**
 * Fetch Multi-Threading Analysis
 */
app.get('/api/multi-threading', async (req, res) => {
  try {
    const data = await bigQueryService.fetchMultiThreading();
    res.json(data);
  } catch (error) {
    console.error('Error fetching multi-threading:', error);
    res.status(500).json({
      error: 'Failed to fetch multi-threading data',
      message: error.message,
    });
  }
});

/**
 * Fetch AI Forecast Analysis
 */
app.get('/api/forecast-analysis', async (req, res) => {
  try {
    const data = await bigQueryService.fetchForecastAnalysis();
    res.json(data);
  } catch (error) {
    console.error('Error fetching forecast analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch forecast analysis',
      message: error.message,
    });
  }
});

/**
 * Debug endpoint: Show Q-T-D won deals details
 * Helps identify which deals are being counted for Q-T-D New ARR
 */
app.get('/api/debug/qtd-won-deals', async (req, res) => {
  try {
    const data = await bigQueryService.fetchQTDWonDealsDebug();
    res.json(data);
  } catch (error) {
    console.error('Error fetching Q-T-D debug:', error);
    res.status(500).json({
      error: 'Failed to fetch Q-T-D debug data',
      message: error.message,
    });
  }
});

/**
 * Debug endpoint: Show Stage Transition Matrix data details
 * Helps identify what data is feeding the stage transition matrix
 */
app.get('/api/debug/stage-transitions', async (req, res) => {
  try {
    const data = await bigQueryService.fetchStageTransitionsDebug();
    res.json(data);
  } catch (error) {
    console.error('Error fetching stage transitions debug:', error);
    res.status(500).json({
      error: 'Failed to fetch stage transitions debug data',
      message: error.message,
    });
  }
});

/**
 * Fetch Stage Leakage Data
 */
app.get('/api/stage-leakage', async (req, res) => {
  try {
    const data = await bigQueryService.fetchStageLeakage();
    res.json(data);
  } catch (error) {
    console.error('Error fetching stage leakage:', error);
    res.status(500).json({
      error: 'Failed to fetch stage leakage data',
      message: error.message,
    });
  }
});

/**
 * Fetch Deals by Stage Exit (for Stage Leakage drill-down)
 */
app.get('/api/deals-by-stage-exit', async (req, res) => {
  try {
    const { stage, exitType } = req.query;
    const data = await bigQueryService.fetchDealsByStageExit(stage, exitType);
    res.json(data);
  } catch (error) {
    console.error('Error fetching deals by stage exit:', error);
    res.status(500).json({
      error: 'Failed to fetch deals by stage exit',
      message: error.message,
    });
  }
});

/**
 * Fetch Close Date Slippage Data
 */
app.get('/api/close-date-slippage', async (req, res) => {
  try {
    const data = await bigQueryService.fetchCloseDateSlippage();
    res.json(data);
  } catch (error) {
    console.error('Error fetching close date slippage:', error);
    res.status(500).json({
      error: 'Failed to fetch close date slippage data',
      message: error.message,
    });
  }
});

/**
 * Fetch Sales Velocity Data (with optional owner filter)
 */
app.get('/api/sales-velocity', async (req, res) => {
  try {
    const owner = req.query.owner || null;
    const data = await bigQueryService.fetchSalesVelocity(owner);
    res.json(data);
  } catch (error) {
    console.error('Error fetching sales velocity:', error);
    res.status(500).json({
      error: 'Failed to fetch sales velocity data',
      message: error.message,
    });
  }
});

/**
 * Fetch Win Rate Analysis Data (with optional owner filter)
 */
app.get('/api/win-rate-analysis', async (req, res) => {
  try {
    const owner = req.query.owner || null;
    const data = await bigQueryService.fetchWinRateAnalysis(owner);
    res.json(data);
  } catch (error) {
    console.error('Error fetching win rate analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch win rate analysis data',
      message: error.message,
    });
  }
});

/**
 * Fetch Next Step Coverage Data
 */
app.get('/api/next-step-coverage', async (req, res) => {
  try {
    const data = await bigQueryService.fetchNextStepCoverage();
    res.json(data);
  } catch (error) {
    console.error('Error fetching next step coverage:', error);
    res.status(500).json({
      error: 'Failed to fetch next step coverage data',
      message: error.message,
    });
  }
});

/**
 * Fetch SDR Leaderboard Data with optional week filter
 * Query params: week (YYYY-MM-DD format)
 */
app.get('/api/sdr-leaderboard', async (req, res) => {
  try {
    const weekStart = req.query.week || null;
    const data = await bigQueryService.fetchSDRLeaderboard(weekStart);
    res.json(data);
  } catch (error) {
    console.error('Error fetching SDR leaderboard:', error);
    res.status(500).json({
      error: 'Failed to fetch SDR leaderboard data',
      message: error.message,
    });
  }
});

/**
 * Fetch available weeks for SDR Leaderboard dropdown
 */
app.get('/api/sdr-available-weeks', async (req, res) => {
  try {
    const data = await bigQueryService.fetchSDRAvailableWeeks();
    res.json(data);
  } catch (error) {
    console.error('Error fetching SDR available weeks:', error);
    res.status(500).json({
      error: 'Failed to fetch available weeks',
      message: error.message,
    });
  }
});

/**
 * Fetch deals for a specific SDR in a specific week (for drill-down modal)
 * Query params: sdr (SDR name), week (YYYY-MM-DD format)
 */
app.get('/api/sdr-deals', async (req, res) => {
  try {
    const { sdr, week } = req.query;
    if (!sdr || !week) {
      return res.status(400).json({
        error: 'Missing required parameters: sdr and week'
      });
    }
    const data = await bigQueryService.fetchSDRDeals(decodeURIComponent(sdr), week);
    res.json(data);
  } catch (error) {
    console.error('Error fetching SDR deals:', error);
    res.status(500).json({
      error: 'Failed to fetch SDR deals',
      message: error.message,
    });
  }
});

/**
 * Fetch Recent Closed Deals for Win Rate drill-down
 */
app.get('/api/recent-closed-deals', async (req, res) => {
  try {
    const data = await bigQueryService.fetchRecentClosedDeals();
    res.json(data);
  } catch (error) {
    console.error('Error fetching recent closed deals:', error);
    res.status(500).json({
      error: 'Failed to fetch recent closed deals',
      message: error.message,
    });
  }
});

/**
 * Fetch unique owner names for dropdown
 */
app.get('/api/owners', async (req, res) => {
  try {
    const data = await bigQueryService.fetchOwners();
    res.json(data);
  } catch (error) {
    console.error('Error fetching owners:', error);
    res.status(500).json({
      error: 'Failed to fetch owners list',
      message: error.message,
    });
  }
});

/**
 * Process AI Natural Language Query
 */
app.post('/api/ai-query', async (req, res) => {
  try {
    const { query, context } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const data = await bigQueryService.processAIQuery(query, context || {});
    res.json(data);
  } catch (error) {
    console.error('Error processing AI query:', error);
    res.status(500).json({
      error: 'Failed to process AI query',
      message: error.message,
    });
  }
});

// =============================================================================
// Vertex AI Pipeline Intelligence (Gemini 1.5 Pro)
// =============================================================================

/**
 * Ask Pipeline - Vertex AI powered natural language query
 * Uses Gemini 1.5 Pro with function calling to query BigQuery views
 * Acts as a "Senior RevOps Director" providing strategic insights
 */
app.post('/api/ask-pipeline', async (req, res) => {
  try {
    const { query, conversation_history } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('[Ask Pipeline] Received query:', query);

    const result = await aiService.askPipeline(query, conversation_history || []);

    res.json(result);
  } catch (error) {
    console.error('Error in ask-pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process pipeline query',
      message: error.message,
    });
  }
});

/**
 * Quick Pipeline Insights - Pre-computed summary
 * Returns pace, zombie, at-risk, and quality metrics snapshot
 */
app.get('/api/pipeline-insights', async (req, res) => {
  try {
    const insights = await aiService.getQuickPipelineInsights();

    if (!insights) {
      return res.status(500).json({ error: 'Unable to fetch pipeline insights' });
    }

    res.json(insights);
  } catch (error) {
    console.error('Error fetching pipeline insights:', error);
    res.status(500).json({
      error: 'Failed to fetch pipeline insights',
      message: error.message,
    });
  }
});

// =============================================================================
// RevOps Strategic Layer Routes
// =============================================================================

/**
 * Fetch Pipeline Quality Trend (8-12 week timeline)
 * Returns: gross_pipeline, weighted_pipeline, committed_pipeline, status_badge
 */
app.get('/api/pipeline-quality-trend', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await bigQueryService.fetchPipelineQualityTrend(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching pipeline quality trend:', error);
    res.status(500).json({
      error: 'Failed to fetch pipeline quality trend',
      message: error.message,
    });
  }
});

/**
 * Fetch Pace-to-Goal Metrics
 * Returns: current_pace, required_pace, delta, qtd_won_value, quarterly_target
 */
app.get('/api/pace-to-goal', async (req, res) => {
  try {
    const data = await bigQueryService.fetchPaceToGoal();
    res.json(data);
  } catch (error) {
    console.error('Error fetching pace to goal:', error);
    res.status(500).json({
      error: 'Failed to fetch pace to goal data',
      message: error.message,
    });
  }
});

/**
 * Fetch Stage Slippage Analysis
 * Returns: stage, avg_days, median_target, slipping deals
 */
app.get('/api/stage-slippage', async (req, res) => {
  try {
    const data = await bigQueryService.fetchStageSlippageAnalysis();
    res.json(data);
  } catch (error) {
    console.error('Error fetching stage slippage:', error);
    res.status(500).json({
      error: 'Failed to fetch stage slippage data',
      message: error.message,
    });
  }
});

/**
 * Fetch Contact Health Status per Deal
 * Returns: deal_id, contact_count, days_since_activity, health_status (RED/YELLOW/GREEN)
 */
app.get('/api/contact-health', async (req, res) => {
  try {
    const data = await bigQueryService.fetchContactHealth();
    res.json(data);
  } catch (error) {
    console.error('Error fetching contact health:', error);
    res.status(500).json({
      error: 'Failed to fetch contact health data',
      message: error.message,
    });
  }
});

/**
 * Fetch Zombie Deals (auto-excluded stale deals)
 * Returns: deal_id, dealname, owner, arr_value, zombie_reason
 */
app.get('/api/zombie-deals', async (req, res) => {
  try {
    const data = await bigQueryService.fetchZombieDeals();
    res.json(data);
  } catch (error) {
    console.error('Error fetching zombie deals:', error);
    res.status(500).json({
      error: 'Failed to fetch zombie deals',
      message: error.message,
    });
  }
});

/**
 * Fetch Deal Focus Scores (0-100 prioritization)
 * Returns: deal_id, focus_score, stage_age_score, engagement_score, threading_score, size_score
 */
app.get('/api/deal-focus-scores', async (req, res) => {
  try {
    const data = await bigQueryService.fetchDealFocusScores();
    res.json(data);
  } catch (error) {
    console.error('Error fetching deal focus scores:', error);
    res.status(500).json({
      error: 'Failed to fetch deal focus scores',
      message: error.message,
    });
  }
});

/**
 * Fetch Rep Focus View (Top 5 at-risk deals per rep)
 * Returns: owner_name, top_5_at_risk_deals, weekly_revenue_gap, deals_needing_attention
 */
app.get('/api/rep-focus/:owner', async (req, res) => {
  try {
    const { owner } = req.params;
    const data = await bigQueryService.fetchRepFocusView(decodeURIComponent(owner));
    res.json(data);
  } catch (error) {
    console.error('Error fetching rep focus view:', error);
    res.status(500).json({
      error: 'Failed to fetch rep focus view',
      message: error.message,
    });
  }
});

/**
 * Fetch Leaderboard with Time-Travel (7d/30d/qtd)
 * Query params: sort (net_pipeline|stage_movements|engagement_score|won_value)
 * Returns: owner_name, net_pipeline_added, stage_movements, engagement_score, won_value
 */
app.get('/api/leaderboard/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const sortBy = req.query.sort || 'net_pipeline_added';

    // Validate period
    const validPeriods = ['7d', '30d', 'qtd'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'Invalid period. Use: 7d, 30d, or qtd'
      });
    }

    // Validate sortBy
    const validSorts = ['net_pipeline_added', 'stage_movements', 'engagement_score', 'won_value'];
    if (!validSorts.includes(sortBy)) {
      return res.status(400).json({
        error: 'Invalid sort. Use: net_pipeline_added, stage_movements, engagement_score, or won_value'
      });
    }

    const data = await bigQueryService.fetchLeaderboardTimeTravel(period, sortBy);
    res.json(data);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      error: 'Failed to fetch leaderboard data',
      message: error.message,
    });
  }
});

// =============================================================================
// Authentication Routes
// =============================================================================

/**
 * Login - Authenticate user
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await userService.authenticateUser(email, password);
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    res.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message,
    });
  }
});

/**
 * Change Password
 */
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    // Password validation
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await userService.changePassword(email, newPassword);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: error.message,
    });
  }
});

// =============================================================================
// Admin Routes (Protected - Admin Only)
// =============================================================================

/**
 * Get all users (admin only)
 */
app.get('/api/admin/users', async (req, res) => {
  try {
    const adminEmail = req.headers['x-user-email'];
    if (!adminEmail || !userService.isAdmin(adminEmail)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message,
    });
  }
});

/**
 * Add new user (admin only)
 */
app.post('/api/admin/users', async (req, res) => {
  try {
    const adminEmail = req.headers['x-user-email'];
    if (!adminEmail || !userService.isAdmin(adminEmail)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await userService.addUser(email, name);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'User created with default password: Octup2026!' });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({
      error: 'Failed to add user',
      message: error.message,
    });
  }
});

/**
 * Delete user (admin only)
 */
app.delete('/api/admin/users/:email', async (req, res) => {
  try {
    const adminEmail = req.headers['x-user-email'];
    if (!adminEmail || !userService.isAdmin(adminEmail)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await userService.deleteUser(decodeURIComponent(email));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message,
    });
  }
});

// =============================================================================
// Production: Serve React App for all non-API routes
// =============================================================================

if (NODE_ENV === 'production') {
  // Catch-all handler: serve React app for any non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found', path: req.path });
    }
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// =============================================================================
// Error Handling (Development only - 404 for API routes)
// =============================================================================

// 404 handler for API routes in development
if (NODE_ENV !== 'production') {
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// =============================================================================
// Start Server
// =============================================================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Octup Dashboard API Server                         ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                    ║
║  BigQuery Project:  ${(process.env.BIGQUERY_PROJECT_ID || 'octup-testing').padEnd(30)}       ║
║  Dataset:           ${(process.env.BIGQUERY_DATASET || 'hubspot_data').padEnd(30)}       ║
╚══════════════════════════════════════════════════════════════╝

Available endpoints:
  GET  /api/health             - Health check
  GET  /api/dashboard          - All dashboard data
  GET  /api/kpis               - CEO Dashboard KPIs
  GET  /api/ai-summary         - AI Executive Summary
  GET  /api/deals-at-risk      - Risk Command Center
  GET  /api/pending-rebook     - Pending Rebook Queue
  GET  /api/rep-ramp           - Rep Ramp Chart
  GET  /api/multi-threading    - Threading Analysis
  GET  /api/forecast-analysis  - AI Forecast Analysis
  GET  /api/stage-leakage      - Stage Leakage Data
  GET  /api/close-date-slippage- Close Date Slippage
  GET  /api/sales-velocity     - Sales Velocity (?owner=X)
  GET  /api/win-rate-analysis  - Win Rate Analysis (?owner=X)
  GET  /api/next-step-coverage - Next Step Coverage
  GET  /api/owners             - Unique Owners List
  POST /api/ai-query           - Natural Language Query (legacy)

Vertex AI Pipeline Intelligence:
  POST /api/ask-pipeline       - Gemini 1.5 Pro powered Q&A (NEW)
  GET  /api/pipeline-insights  - Quick pipeline snapshot (NEW)

RevOps Strategic Layer endpoints:
  GET  /api/pipeline-quality-trend - Pipeline Quality Trend (8-12 weeks)
  GET  /api/pace-to-goal        - Pace-to-Goal Metrics
  GET  /api/stage-slippage      - Stage Slippage Analysis
  GET  /api/contact-health      - Contact Health Shield
  GET  /api/zombie-deals        - Zombie Deals (auto-excluded)
  GET  /api/deal-focus-scores   - Deal Focus Scores (0-100)
  GET  /api/rep-focus/:owner    - Rep Focus View
  GET  /api/leaderboard/:period - Leaderboard (7d|30d|qtd, ?sort=)

Auth endpoints:
  POST /api/auth/login         - Authenticate user
  POST /api/auth/change-password - Change password

Admin endpoints (alon@octup.com only):
  GET    /api/admin/users      - List all users
  POST   /api/admin/users      - Add new user
  DELETE /api/admin/users/:email - Delete user
`);
});
