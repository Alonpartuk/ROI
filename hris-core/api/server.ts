/**
 * Octup HRIS API Server
 *
 * Production-ready Express server with:
 * - JWT Authentication
 * - Row Level Security (RLS) Context
 * - Role-Based Access Control (RBAC)
 * - Cloud SQL connection via Unix socket
 * - Health check endpoint
 * - Graceful shutdown
 * - Request logging
 * - Security headers
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Pool, PoolClient } from 'pg';
import {
  authenticateJWT,
  createRLSMiddleware,
  requireRole,
  requirePermission,
  requireSelfOrRole,
  hasRole,
} from './middleware';

// =============================================================================
// Configuration
// =============================================================================

const PORT = parseInt(process.env.PORT || '8080', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_HOST = process.env.DATABASE_HOST; // Cloud SQL Unix socket path

// =============================================================================
// Database Connection - SECURITY: No hardcoded credentials in production
// =============================================================================

function createDatabasePool(): Pool {
  // Cloud SQL connection via Unix socket
  if (DATABASE_HOST && DATABASE_HOST.startsWith('/cloudsql/')) {
    console.log('[DB] Connecting via Cloud SQL Unix socket');

    // SECURITY: Require DB_PASSWORD in production
    if (!process.env.DB_PASSWORD) {
      console.error('[DB] CRITICAL: DB_PASSWORD environment variable is required');
      process.exit(1);
    }

    return new Pool({
      user: process.env.DB_USER || 'hris_app',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'hris',
      host: DATABASE_HOST,
    });
  }

  // Standard connection string
  if (DATABASE_URL) {
    console.log('[DB] Connecting via DATABASE_URL');
    return new Pool({ connectionString: DATABASE_URL });
  }

  // Local development only - warn about insecure config
  if (NODE_ENV === 'production') {
    console.error('[DB] CRITICAL: No database configuration provided in production');
    process.exit(1);
  }

  console.warn('[DB] WARNING: Using local development database configuration');
  return new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hris',
    host: 'localhost',
    port: 5432,
  });
}

const pool = createDatabasePool();

// =============================================================================
// RLS-Aware Query Helper
// =============================================================================

async function queryWithRLS(
  req: Request,
  text: string,
  params?: any[]
): Promise<any> {
  const client = await pool.connect();
  try {
    const employeeId = req.user?.employeeId;

    if (employeeId) {
      // Set RLS context - CRITICAL for security
      await client.query(`SET LOCAL app.current_employee_id = $1`, [employeeId]);

      // Set role based on user roles
      const roles = req.user?.roles || [];
      let dbRole = 'employee_role';
      if (roles.includes('hr_admin') || roles.includes('admin')) {
        dbRole = 'hr_role';
      } else if (roles.includes('finance')) {
        dbRole = 'finance_role';
      } else if (roles.includes('manager')) {
        dbRole = 'manager_role';
      }

      await client.query(`SET LOCAL ROLE ${dbRole}`);
    }

    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// =============================================================================
// Express App
// =============================================================================

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Managed by Cloud Run / Load Balancer
}));

// CORS configuration
app.use(cors({
  origin: NODE_ENV === 'production'
    ? [
        /\.run\.app$/,  // Cloud Run URLs
        /octup\.io$/,   // Custom domain
      ]
    : '*',
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(
      `[${logLevel}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

// =============================================================================
// Health Check Endpoints (No auth required)
// =============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time, current_database() as database');
    client.release();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        name: result.rows[0].database,
        serverTime: result.rows[0].time,
      },
      environment: NODE_ENV,
    });
  } catch (error) {
    console.error('[HEALTH] Database check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      database: { connected: false },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// =============================================================================
// Apply Authentication Middleware (after health checks)
// =============================================================================

app.use(authenticateJWT);
app.use(createRLSMiddleware(pool));

// =============================================================================
// API Routes
// =============================================================================

// API version info
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'Octup HRIS API',
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
  });
});

// =============================================================================
// EMPLOYEES ENDPOINTS
// =============================================================================

/**
 * GET /api/employees
 * List all employees with pagination - uses v_current_employment view for correct schema mapping
 *
 * Query params:
 * - page: Page number (1-indexed, default: 1)
 * - pageSize: Items per page (default: 50, max: 100)
 * - search: Search by name, email, or employee number
 * - location: Filter by location code (e.g., 'TLV', 'TOR', 'US')
 * - department: Filter by department name
 */
app.get('/api/employees', async (req: Request, res: Response) => {
  try {
    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const offset = (page - 1) * pageSize;

    // Parse filter parameters
    const search = (req.query.search as string) || '';
    const locationFilter = (req.query.location as string) || '';
    const departmentFilter = (req.query.department as string) || '';

    // Build WHERE clauses
    const whereClauses = ['NOT e.is_deleted', "e.current_status = 'active'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(`(
        COALESCE(e.preferred_first_name, e.legal_first_name) ILIKE $${paramIndex}
        OR COALESCE(e.preferred_last_name, e.legal_last_name) ILIKE $${paramIndex}
        OR e.work_email ILIKE $${paramIndex}
        OR e.employee_number ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (locationFilter) {
      whereClauses.push(`l.code = $${paramIndex}`);
      params.push(locationFilter);
      paramIndex++;
    }

    if (departmentFilter) {
      whereClauses.push(`d.name ILIKE $${paramIndex}`);
      params.push(`%${departmentFilter}%`);
      paramIndex++;
    }

    const whereSQL = whereClauses.join(' AND ');

    // Get total count for pagination
    const countResult = await queryWithRLS(req, `
      SELECT COUNT(DISTINCT e.id) AS total
      FROM employees e
      LEFT JOIN employment_records er ON e.id = er.employee_id
        AND er.effective_date <= CURRENT_DATE
        AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
      LEFT JOIN departments d ON er.department_id = d.id
      LEFT JOIN locations l ON er.location_id = l.id
      WHERE ${whereSQL}
    `, params);

    const totalCount = parseInt(countResult.rows[0]?.total || 0);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Add pagination params
    params.push(pageSize);
    params.push(offset);

    // Main query with pagination
    const result = await queryWithRLS(req, `
      SELECT
        e.id,
        e.employee_number,
        COALESCE(e.preferred_first_name, e.legal_first_name) AS first_name,
        COALESCE(e.preferred_last_name, e.legal_last_name) AS last_name,
        COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
          COALESCE(e.preferred_last_name, e.legal_last_name) AS display_name,
        e.work_email,
        e.phone,
        e.original_hire_date,
        e.current_status,
        e.date_of_birth,
        er.employment_type,
        er.work_model,
        er.status,
        er.fte_percentage,
        jt.name AS job_title,
        jl.name AS job_level,
        jl.code AS level_code,
        d.name AS department,
        d.code AS department_code,
        l.name AS location_name,
        l.code AS location_code,
        l.country_code,
        er.manager_id,
        COALESCE(mgr.preferred_first_name, mgr.legal_first_name) || ' ' ||
          COALESCE(mgr.preferred_last_name, mgr.legal_last_name) AS manager_name,
        mgr.employee_number AS manager_number,
        er.effective_date AS position_since
      FROM employees e
      LEFT JOIN employment_records er ON e.id = er.employee_id
        AND er.effective_date <= CURRENT_DATE
        AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
      LEFT JOIN job_titles jt ON er.job_title_id = jt.id
      LEFT JOIN job_levels jl ON er.job_level_id = jl.id
      LEFT JOIN departments d ON er.department_id = d.id
      LEFT JOIN locations l ON er.location_id = l.id
      LEFT JOIN employees mgr ON er.manager_id = mgr.id
      WHERE ${whereSQL}
      ORDER BY
        COALESCE(e.preferred_last_name, e.legal_last_name),
        COALESCE(e.preferred_first_name, e.legal_first_name)
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      meta: {
        count: result.rows.length,
        totalCount,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching employees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      code: 'QUERY_ERROR',
    });
  }
});

/**
 * GET /api/employees/:id
 * Get single employee with full details
 */
app.get('/api/employees/:id',
  requireSelfOrRole((req) => req.params.id, ['hr_admin', 'manager']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await queryWithRLS(req, `
        SELECT
          e.id,
          e.employee_number,
          e.legal_first_name,
          e.legal_last_name,
          e.preferred_first_name,
          e.preferred_last_name,
          COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
            COALESCE(e.preferred_last_name, e.legal_last_name) AS display_name,
          e.work_email,
          e.personal_email,
          e.phone,
          e.date_of_birth,
          e.original_hire_date,
          e.current_status,
          er.employment_type,
          er.work_model,
          er.status,
          er.fte_percentage,
          er.weekly_hours,
          jt.id AS job_title_id,
          jt.name AS job_title,
          jl.id AS job_level_id,
          jl.name AS job_level,
          jl.code AS level_code,
          jl.track AS level_track,
          d.id AS department_id,
          d.name AS department,
          d.code AS department_code,
          l.id AS location_id,
          l.name AS location_name,
          l.code AS location_code,
          l.country_code,
          l.timezone,
          l.default_currency,
          er.manager_id,
          COALESCE(mgr.preferred_first_name, mgr.legal_first_name) || ' ' ||
            COALESCE(mgr.preferred_last_name, mgr.legal_last_name) AS manager_name,
          mgr.employee_number AS manager_number,
          er.effective_date AS position_since,
          er.change_reason AS last_change_reason
        FROM employees e
        LEFT JOIN employment_records er ON e.id = er.employee_id
          AND er.effective_date <= CURRENT_DATE
          AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
        LEFT JOIN job_titles jt ON er.job_title_id = jt.id
        LEFT JOIN job_levels jl ON er.job_level_id = jl.id
        LEFT JOIN departments d ON er.department_id = d.id
        LEFT JOIN locations l ON er.location_id = l.id
        LEFT JOIN employees mgr ON er.manager_id = mgr.id
        WHERE e.id = $1 AND NOT e.is_deleted
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found',
          code: 'NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('[API] Error fetching employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch employee',
        code: 'QUERY_ERROR',
      });
    }
  }
);

// =============================================================================
// SALARY ENDPOINTS - Protected by RBAC
// =============================================================================

/**
 * GET /api/employees/:id/salary
 * Get salary history for an employee
 */
app.get('/api/employees/:id/salary',
  requireRole(['hr_admin', 'finance']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await queryWithRLS(req, `
        SELECT
          sr.id,
          sr.employee_id,
          sr.effective_date,
          sr.end_date,
          sr.amount,
          sr.currency,
          sr.frequency,
          sr.annualized_amount,
          sr.annualized_currency,
          sr.exchange_rate_used,
          sr.reason,
          sr.reason_notes,
          sr.created_at,
          CASE WHEN sr.end_date IS NULL AND sr.effective_date <= CURRENT_DATE THEN true ELSE false END AS is_current
        FROM salary_records sr
        WHERE sr.employee_id = $1
        ORDER BY sr.effective_date DESC
      `, [id]);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('[API] Error fetching salary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch salary records',
        code: 'QUERY_ERROR',
      });
    }
  }
);

// =============================================================================
// EQUITY ENDPOINTS - Protected by RBAC
// =============================================================================

/**
 * GET /api/employees/:id/equity
 * Get equity grants for an employee
 */
app.get('/api/employees/:id/equity',
  requireRole(['hr_admin', 'finance']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await queryWithRLS(req, `
        SELECT
          eg.id,
          eg.employee_id,
          eg.grant_number,
          eg.grant_date,
          eg.grant_type,
          eg.shares_granted,
          eg.shares_vested,
          eg.shares_exercised,
          eg.shares_forfeited,
          eg.shares_granted - eg.shares_vested - eg.shares_forfeited AS shares_unvested,
          eg.shares_vested - eg.shares_exercised AS shares_exercisable,
          eg.exercise_price,
          eg.fair_market_value,
          eg.vesting_type,
          eg.vesting_start_date,
          eg.cliff_months,
          eg.total_vesting_months,
          eg.expiration_date,
          ep.name AS plan_name,
          -- Next vesting info
          (SELECT MIN(ve.vesting_date)
           FROM vesting_events ve
           WHERE ve.grant_id = eg.id AND ve.vesting_date > CURRENT_DATE AND ve.is_scheduled
          ) AS next_vesting_date,
          (SELECT ve.shares_vested
           FROM vesting_events ve
           WHERE ve.grant_id = eg.id AND ve.vesting_date > CURRENT_DATE AND ve.is_scheduled
           ORDER BY ve.vesting_date LIMIT 1
          ) AS next_vesting_shares
        FROM equity_grants eg
        JOIN equity_plans ep ON eg.equity_plan_id = ep.id
        WHERE eg.employee_id = $1
        ORDER BY eg.grant_date DESC
      `, [id]);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('[API] Error fetching equity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch equity grants',
        code: 'QUERY_ERROR',
      });
    }
  }
);

// =============================================================================
// ANALYTICS ENDPOINTS - Protected by RBAC
// =============================================================================

/**
 * GET /api/analytics/burn-rate
 * Get global burn rate by location
 */
app.get('/api/analytics/burn-rate',
  requireRole(['hr_admin', 'finance']),
  async (req: Request, res: Response) => {
    try {
      // Query burn rate data directly to avoid potential view issues
      const result = await queryWithRLS(req, `
        WITH current_salaries AS (
          SELECT
            e.id AS employee_id,
            er.location_id,
            l.code AS location_code,
            l.name AS location_name,
            sr.amount,
            sr.currency,
            sr.frequency,
            CASE sr.frequency
              WHEN 'annual' THEN sr.amount / 12
              WHEN 'monthly' THEN sr.amount
              WHEN 'hourly' THEN sr.amount * COALESCE(er.weekly_hours, 40) * 4.33
              WHEN 'daily' THEN sr.amount * 21.67
            END AS monthly_amount,
            l.default_currency
          FROM employees e
          JOIN employment_records er ON e.id = er.employee_id
            AND er.effective_date <= CURRENT_DATE
            AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
            AND er.status = 'active'
          JOIN salary_records sr ON e.id = sr.employee_id
            AND sr.effective_date <= CURRENT_DATE
            AND (sr.end_date IS NULL OR sr.end_date > CURRENT_DATE)
          JOIN locations l ON er.location_id = l.id
          WHERE NOT e.is_deleted
        )
        SELECT
          location_code,
          location_name,
          COUNT(DISTINCT employee_id) AS headcount,
          ROUND(SUM(monthly_amount)::numeric, 2) AS monthly_salary,
          ROUND(SUM(monthly_amount)::numeric * 0.25, 2) AS monthly_benefits,
          ROUND(SUM(monthly_amount)::numeric * 1.25, 2) AS monthly_total,
          ROUND(SUM(monthly_amount)::numeric * 1.25 * 12, 2) AS annual_total
        FROM current_salaries
        GROUP BY location_code, location_name
        ORDER BY location_code
      `);

      // Calculate totals
      const totals = result.rows.reduce(
        (acc, row) => ({
          headcount: acc.headcount + parseInt(row.headcount),
          monthly_salary: acc.monthly_salary + parseFloat(row.monthly_salary || 0),
          monthly_benefits: acc.monthly_benefits + parseFloat(row.monthly_benefits || 0),
          monthly_total: acc.monthly_total + parseFloat(row.monthly_total || 0),
          annual_total: acc.annual_total + parseFloat(row.annual_total || 0),
        }),
        { headcount: 0, monthly_salary: 0, monthly_benefits: 0, monthly_total: 0, annual_total: 0 }
      );

      res.json({
        success: true,
        data: {
          byLocation: result.rows.map(row => ({
            locationCode: row.location_code,
            locationName: row.location_name,
            headcount: parseInt(row.headcount),
            monthlySalaryUsd: parseFloat(row.monthly_salary || 0),
            monthlyBenefitsUsd: parseFloat(row.monthly_benefits || 0),
            monthlyTotalUsd: parseFloat(row.monthly_total || 0),
            annualTotalUsd: parseFloat(row.annual_total || 0),
          })),
          totals: {
            headcount: totals.headcount,
            monthlySalaryUsd: Math.round(totals.monthly_salary * 100) / 100,
            monthlyBenefitsUsd: Math.round(totals.monthly_benefits * 100) / 100,
            monthlyTotalUsd: Math.round(totals.monthly_total * 100) / 100,
            annualTotalUsd: Math.round(totals.annual_total * 100) / 100,
          },
        },
      });
    } catch (error) {
      console.error('[API] Error fetching burn rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch burn rate',
        code: 'QUERY_ERROR',
      });
    }
  }
);

/**
 * GET /api/analytics/cliff-alerts
 * Get employees with upcoming equity cliffs
 */
app.get('/api/analytics/cliff-alerts',
  requireRole(['hr_admin', 'finance']),
  async (req: Request, res: Response) => {
    try {
      const result = await queryWithRLS(req, `
        SELECT
          e.id AS employee_id,
          e.employee_number,
          COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
            COALESCE(e.preferred_last_name, e.legal_last_name) AS employee_name,
          e.work_email,
          eg.grant_number,
          eg.grant_type,
          eg.shares_granted,
          eg.cliff_months,
          eg.vesting_start_date,
          (eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL)::DATE AS cliff_date,
          ROUND(eg.shares_granted::DECIMAL * eg.cliff_months / eg.total_vesting_months) AS cliff_shares,
          (eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL)::DATE - CURRENT_DATE AS days_until_cliff,
          CASE
            WHEN (eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL)::DATE - CURRENT_DATE <= 7 THEN 'critical'
            WHEN (eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL)::DATE - CURRENT_DATE <= 30 THEN 'high'
            WHEN (eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL)::DATE - CURRENT_DATE <= 60 THEN 'medium'
            ELSE 'low'
          END AS alert_level,
          d.name AS department,
          l.code AS location_code
        FROM employees e
        JOIN equity_grants eg ON e.id = eg.employee_id
        JOIN employment_records er ON e.id = er.employee_id
          AND er.effective_date <= CURRENT_DATE
          AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
        LEFT JOIN departments d ON er.department_id = d.id
        LEFT JOIN locations l ON er.location_id = l.id
        WHERE NOT e.is_deleted
          AND er.status = 'active'
          AND eg.cliff_months IS NOT NULL
          AND eg.cliff_months > 0
          AND eg.shares_vested = 0
          AND (eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL)::DATE
              BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days')
        ORDER BY cliff_date
      `);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          employeeNumber: row.employee_number,
          grantNumber: row.grant_number,
          cliffDate: row.cliff_date,
          cliffShares: parseInt(row.cliff_shares),
          daysUntilCliff: parseInt(row.days_until_cliff),
          alertLevel: row.alert_level,
          department: row.department,
          locationCode: row.location_code,
        })),
      });
    } catch (error) {
      console.error('[API] Error fetching cliff alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cliff alerts',
        code: 'QUERY_ERROR',
      });
    }
  }
);

/**
 * GET /api/analytics/headcount
 * Get headcount by department
 */
app.get('/api/analytics/headcount',
  requireRole(['hr_admin', 'finance', 'manager']),
  async (req: Request, res: Response) => {
    try {
      const result = await queryWithRLS(req, `
        SELECT
          d.id AS department_id,
          d.code AS department_code,
          d.name AS department_name,
          COUNT(DISTINCT e.id) AS headcount,
          SUM(er.fte_percentage / 100) AS fte_count,
          COUNT(DISTINCT CASE WHEN er.employment_type = 'full_time' THEN e.id END) AS full_time_count,
          COUNT(DISTINCT CASE WHEN er.employment_type = 'contractor' THEN e.id END) AS contractor_count,
          COUNT(DISTINCT CASE WHEN er.employment_type = 'part_time' THEN e.id END) AS part_time_count
        FROM departments d
        LEFT JOIN employment_records er ON d.id = er.department_id
          AND er.effective_date <= CURRENT_DATE
          AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
          AND er.status = 'active'
        LEFT JOIN employees e ON er.employee_id = e.id AND NOT e.is_deleted
        GROUP BY d.id, d.code, d.name
        ORDER BY d.name
      `);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          departmentId: row.department_id,
          departmentCode: row.department_code,
          departmentName: row.department_name,
          headcount: parseInt(row.headcount || 0),
          fteCount: parseFloat(row.fte_count || 0),
          fullTimeCount: parseInt(row.full_time_count || 0),
          contractorCount: parseInt(row.contractor_count || 0),
          partTimeCount: parseInt(row.part_time_count || 0),
        })),
      });
    } catch (error) {
      console.error('[API] Error fetching headcount:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch headcount',
        code: 'QUERY_ERROR',
      });
    }
  }
);

/**
 * GET /api/analytics/dashboard
 * Get all dashboard KPIs in one call
 */
app.get('/api/analytics/dashboard', async (req: Request, res: Response) => {
  try {
    // Get total headcount
    const headcountResult = await queryWithRLS(req, `
      SELECT COUNT(DISTINCT e.id) AS total
      FROM employees e
      JOIN employment_records er ON e.id = er.employee_id
        AND er.effective_date <= CURRENT_DATE
        AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
        AND er.status = 'active'
      WHERE NOT e.is_deleted
    `);

    // Get active onboarding count (employees hired in last 90 days)
    const onboardingResult = await queryWithRLS(req, `
      SELECT COUNT(DISTINCT e.id) AS total
      FROM employees e
      WHERE NOT e.is_deleted
        AND e.current_status = 'active'
        AND e.original_hire_date >= CURRENT_DATE - INTERVAL '90 days'
    `);

    // Get upcoming cliffs count
    const cliffsResult = await queryWithRLS(req, `
      SELECT COUNT(*) AS total
      FROM equity_grants eg
      JOIN employees e ON eg.employee_id = e.id
      WHERE NOT e.is_deleted
        AND e.current_status = 'active'
        AND eg.cliff_months IS NOT NULL
        AND eg.cliff_months > 0
        AND eg.shares_vested = 0
        AND (eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL)::DATE
            BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days')
    `);

    // Get burn rate total
    const burnRateResult = await queryWithRLS(req, `
      SELECT
        ROUND(SUM(
          CASE sr.frequency
            WHEN 'annual' THEN sr.amount / 12
            WHEN 'monthly' THEN sr.amount
            WHEN 'hourly' THEN sr.amount * COALESCE(er.weekly_hours, 40) * 4.33
            WHEN 'daily' THEN sr.amount * 21.67
          END
        )::numeric * 1.25, 2) AS monthly_total
      FROM employees e
      JOIN employment_records er ON e.id = er.employee_id
        AND er.effective_date <= CURRENT_DATE
        AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
        AND er.status = 'active'
      JOIN salary_records sr ON e.id = sr.employee_id
        AND sr.effective_date <= CURRENT_DATE
        AND (sr.end_date IS NULL OR sr.end_date > CURRENT_DATE)
      WHERE NOT e.is_deleted
    `);

    res.json({
      success: true,
      data: {
        totalHeadcount: parseInt(headcountResult.rows[0]?.total || 0),
        activeOnboarding: parseInt(onboardingResult.rows[0]?.total || 0),
        upcomingCliffs: parseInt(cliffsResult.rows[0]?.total || 0),
        monthlyBurnRateUsd: parseFloat(burnRateResult.rows[0]?.monthly_total || 0),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching dashboard KPIs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      code: 'QUERY_ERROR',
    });
  }
});

// =============================================================================
// DEPARTMENTS ENDPOINT
// =============================================================================

app.get('/api/departments', async (req: Request, res: Response) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT
        id,
        code,
        name,
        parent_id,
        cost_center,
        is_active
      FROM departments
      WHERE is_active = true
      ORDER BY name
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('[API] Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments',
      code: 'QUERY_ERROR',
    });
  }
});

// =============================================================================
// LOCATIONS ENDPOINT
// =============================================================================

app.get('/api/locations', async (req: Request, res: Response) => {
  try {
    const result = await queryWithRLS(req, `
      SELECT
        id,
        code,
        name,
        country_code,
        timezone,
        default_currency,
        legal_entity_name
      FROM locations
      ORDER BY name
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('[API] Error fetching locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch locations',
      code: 'QUERY_ERROR',
    });
  }
});

// =============================================================================
// USER INFO ENDPOINT (For frontend auth state)
// =============================================================================

app.get('/api/me', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      employeeId: req.user?.employeeId,
      email: req.user?.email,
      name: req.user?.name,
      roles: req.user?.roles,
      permissions: req.user?.permissions,
    },
  });
});

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);

  const status = (err as any).status || 500;
  const message = NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;

  res.status(status).json({
    error: message,
    ...(NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// =============================================================================
// Server Startup & Graceful Shutdown
// =============================================================================

const server = app.listen(PORT, () => {
  console.log('============================================');
  console.log('  Octup HRIS API Server');
  console.log('============================================');
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Auth: JWT ${process.env.JWT_SECRET ? 'CONFIGURED' : 'DISABLED (dev mode)'}`);
  console.log('============================================');
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed');

    try {
      await pool.end();
      console.log('[SHUTDOWN] Database pool closed');
    } catch (err) {
      console.error('[SHUTDOWN] Error closing database pool:', err);
    }

    console.log('[SHUTDOWN] Cleanup complete, exiting');
    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced exit after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
