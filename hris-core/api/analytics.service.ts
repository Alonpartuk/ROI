/**
 * HR Analytics Dashboard Service
 *
 * Provides API endpoints and business logic for:
 * - Global Burn Rate calculations
 * - Equity Cliff Monitoring
 * - Headcount Growth tracking
 * - Additional HR KPIs
 */

import { UUID, ISODate, Currency } from '../types/employee.types';

// ============================================================================
// TYPES
// ============================================================================

export interface BurnRateByLocation {
  locationCode: string;
  locationName: string;
  headcount: number;
  monthlySalaryUsd: number;
  monthlyBenefitsUsd: number;
  monthlyTotalUsd: number;
  annualTotalUsd: number;
}

export interface BurnRateTotal {
  headcount: number;
  monthlySalaryUsd: number;
  monthlyBenefitsUsd: number;
  monthlyTotalUsd: number;
  annualTotalUsd: number;
}

export interface BurnRateResponse {
  byLocation: BurnRateByLocation[];
  total: BurnRateTotal;
  generatedAt: string;
  exchangeRates: ExchangeRateInfo[];
}

export interface ExchangeRateInfo {
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  effectiveDate: ISODate;
}

export interface CliffAlert {
  employeeId: UUID;
  employeeNumber: string;
  employeeName: string;
  workEmail: string;
  grantNumber: string;
  grantType: string;
  sharesGranted: number;
  cliffMonths: number;
  vestingStartDate: ISODate;
  cliffDate: ISODate;
  cliffShares: number;
  daysUntilCliff: number;
  managerNumber: string | null;
  managerName: string | null;
  locationCode: string;
  department: string;
  alertLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface CliffMonitorResponse {
  alerts: CliffAlert[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  generatedAt: string;
}

export interface HeadcountByDepartment {
  departmentId: UUID;
  departmentCode: string;
  departmentName: string;
  headcount: number;
  fteCount: number;
  fullTimeCount: number;
  contractorCount: number;
}

export interface HeadcountGrowthPoint {
  month: ISODate;
  totalHeadcount: number;
  totalFte: number;
  tlvHeadcount: number;
  torHeadcount: number;
  usHeadcount: number;
}

export interface HeadcountResponse {
  byDepartment: HeadcountByDepartment[];
  growth: HeadcountGrowthPoint[];
  currentTotal: number;
  monthOverMonthChange: number;
  yearOverYearChange: number;
  generatedAt: string;
}

export interface TenureDistribution {
  tenureBand: string;
  employeeCount: number;
  percentage: number;
}

export interface UpcomingAnniversary {
  employeeId: UUID;
  employeeNumber: string;
  employeeName: string;
  originalHireDate: ISODate;
  upcomingAnniversaryYear: number;
  anniversaryDateThisYear: ISODate;
  department: string;
  managerNumber: string | null;
}

export interface EquityPoolUtilization {
  planId: UUID;
  planName: string;
  planType: string;
  totalPoolShares: number;
  allocatedShares: number;
  availableShares: number;
  utilizationPercent: number;
  activeGrants: number;
  employeesWithGrants: number;
  totalSharesGranted: number;
  totalSharesVested: number;
  totalSharesExercised: number;
}

export interface DashboardMetrics {
  burnRate: BurnRateResponse;
  cliffMonitor: CliffMonitorResponse;
  headcount: HeadcountResponse;
  tenureDistribution: TenureDistribution[];
  upcomingAnniversaries: UpcomingAnniversary[];
  equityUtilization: EquityPoolUtilization[];
  generatedAt: string;
}

// ============================================================================
// ANALYTICS SERVICE CLASS
// ============================================================================

export class AnalyticsService {
  private db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  /**
   * Get global burn rate by location
   */
  async getBurnRate(): Promise<BurnRateResponse> {
    // Fetch from view
    const byLocation = await this.db.query<BurnRateByLocation>(`
      SELECT
        location_code AS "locationCode",
        location_name AS "locationName",
        headcount,
        monthly_salary_usd AS "monthlySalaryUsd",
        monthly_benefits_usd AS "monthlyBenefitsUsd",
        monthly_total_usd AS "monthlyTotalUsd",
        annual_total_usd AS "annualTotalUsd"
      FROM v_global_burn_rate
    `);

    // Fetch total
    const [total] = await this.db.query<BurnRateTotal>(`
      SELECT
        headcount,
        monthly_salary_usd AS "monthlySalaryUsd",
        monthly_benefits_usd AS "monthlyBenefitsUsd",
        monthly_total_usd AS "monthlyTotalUsd",
        annual_total_usd AS "annualTotalUsd"
      FROM v_global_burn_rate_total
    `);

    // Fetch current exchange rates
    const exchangeRates = await this.db.query<ExchangeRateInfo>(`
      SELECT DISTINCT ON (from_currency, to_currency)
        from_currency AS "fromCurrency",
        to_currency AS "toCurrency",
        rate,
        effective_date AS "effectiveDate"
      FROM exchange_rates
      WHERE effective_date <= CURRENT_DATE
      ORDER BY from_currency, to_currency, effective_date DESC
    `);

    return {
      byLocation,
      total: total || {
        headcount: 0,
        monthlySalaryUsd: 0,
        monthlyBenefitsUsd: 0,
        monthlyTotalUsd: 0,
        annualTotalUsd: 0,
      },
      generatedAt: new Date().toISOString(),
      exchangeRates,
    };
  }

  /**
   * Get equity cliff monitor alerts
   */
  async getCliffMonitor(): Promise<CliffMonitorResponse> {
    const alerts = await this.db.query<CliffAlert>(`
      SELECT
        employee_id AS "employeeId",
        employee_number AS "employeeNumber",
        employee_name AS "employeeName",
        work_email AS "workEmail",
        grant_number AS "grantNumber",
        grant_type AS "grantType",
        shares_granted AS "sharesGranted",
        cliff_months AS "cliffMonths",
        vesting_start_date AS "vestingStartDate",
        cliff_date AS "cliffDate",
        cliff_shares AS "cliffShares",
        days_until_cliff AS "daysUntilCliff",
        manager_number AS "managerNumber",
        manager_name AS "managerName",
        location_code AS "locationCode",
        department,
        alert_level AS "alertLevel"
      FROM v_equity_cliff_alerts
      ORDER BY days_until_cliff
    `);

    // Calculate summary
    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.alertLevel === 'critical').length,
      high: alerts.filter(a => a.alertLevel === 'high').length,
      medium: alerts.filter(a => a.alertLevel === 'medium').length,
      low: alerts.filter(a => a.alertLevel === 'low').length,
    };

    return {
      alerts,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get headcount data
   */
  async getHeadcount(months: number = 12): Promise<HeadcountResponse> {
    // Current headcount by department
    const byDepartment = await this.db.query<HeadcountByDepartment>(`
      SELECT
        department_id AS "departmentId",
        department_code AS "departmentCode",
        department_name AS "departmentName",
        headcount,
        fte_count AS "fteCount",
        full_time_count AS "fullTimeCount",
        contractor_count AS "contractorCount"
      FROM v_current_headcount_by_department
      ORDER BY department_name
    `);

    // Historical growth data
    const growth = await this.db.query<HeadcountGrowthPoint>(`
      SELECT
        month,
        total_headcount AS "totalHeadcount",
        total_fte AS "totalFte",
        tlv_headcount AS "tlvHeadcount",
        tor_headcount AS "torHeadcount",
        us_headcount AS "usHeadcount"
      FROM v_monthly_headcount_summary
      WHERE month >= (CURRENT_DATE - ($1 || ' months')::INTERVAL)::DATE
      ORDER BY month
    `, [months]);

    // Calculate changes
    const currentTotal = byDepartment.reduce((sum, d) => sum + d.headcount, 0);

    let monthOverMonthChange = 0;
    let yearOverYearChange = 0;

    if (growth.length >= 2) {
      const lastMonth = growth[growth.length - 1];
      const prevMonth = growth[growth.length - 2];
      monthOverMonthChange = lastMonth.totalHeadcount - prevMonth.totalHeadcount;
    }

    if (growth.length >= 13) {
      const lastMonth = growth[growth.length - 1];
      const lastYear = growth[growth.length - 13];
      yearOverYearChange = lastMonth.totalHeadcount - lastYear.totalHeadcount;
    }

    return {
      byDepartment,
      growth,
      currentTotal,
      monthOverMonthChange,
      yearOverYearChange,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Capture headcount snapshot (called by cron job)
   */
  async captureHeadcountSnapshot(date?: ISODate): Promise<number> {
    const result = await this.db.query<{ capture_headcount_snapshot: number }>(
      `SELECT capture_headcount_snapshot($1::DATE)`,
      [date || new Date().toISOString().split('T')[0]]
    );
    return result[0]?.capture_headcount_snapshot || 0;
  }

  /**
   * Get tenure distribution
   */
  async getTenureDistribution(): Promise<TenureDistribution[]> {
    return this.db.query<TenureDistribution>(`
      SELECT
        tenure_band AS "tenureBand",
        employee_count AS "employeeCount",
        percentage
      FROM v_tenure_distribution
    `);
  }

  /**
   * Get upcoming anniversaries
   */
  async getUpcomingAnniversaries(days: number = 30): Promise<UpcomingAnniversary[]> {
    return this.db.query<UpcomingAnniversary>(`
      SELECT
        employee_id AS "employeeId",
        employee_number AS "employeeNumber",
        employee_name AS "employeeName",
        original_hire_date AS "originalHireDate",
        upcoming_anniversary_year AS "upcomingAnniversaryYear",
        anniversary_date_this_year AS "anniversaryDateThisYear",
        department,
        manager_number AS "managerNumber"
      FROM v_upcoming_anniversaries
      WHERE anniversary_date_this_year <= (CURRENT_DATE + ($1 || ' days')::INTERVAL)
      ORDER BY anniversary_date_this_year
    `, [days]);
  }

  /**
   * Get equity pool utilization
   */
  async getEquityUtilization(): Promise<EquityPoolUtilization[]> {
    return this.db.query<EquityPoolUtilization>(`
      SELECT
        plan_id AS "planId",
        plan_name AS "planName",
        plan_type AS "planType",
        total_pool_shares AS "totalPoolShares",
        allocated_shares AS "allocatedShares",
        available_shares AS "availableShares",
        utilization_percent AS "utilizationPercent",
        active_grants AS "activeGrants",
        employees_with_grants AS "employeesWithGrants",
        total_shares_granted AS "totalSharesGranted",
        total_shares_vested AS "totalSharesVested",
        total_shares_exercised AS "totalSharesExercised"
      FROM v_equity_pool_utilization
    `);
  }

  /**
   * Get all dashboard metrics in one call
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [
      burnRate,
      cliffMonitor,
      headcount,
      tenureDistribution,
      upcomingAnniversaries,
      equityUtilization,
    ] = await Promise.all([
      this.getBurnRate(),
      this.getCliffMonitor(),
      this.getHeadcount(),
      this.getTenureDistribution(),
      this.getUpcomingAnniversaries(),
      this.getEquityUtilization(),
    ]);

    return {
      burnRate,
      cliffMonitor,
      headcount,
      tenureDistribution,
      upcomingAnniversaries,
      equityUtilization,
      generatedAt: new Date().toISOString(),
    };
  }
}

// ============================================================================
// API ROUTES
// ============================================================================

import { Router, Request, Response } from 'express';
import { requireRole, Role } from './permissions.service';

export function createAnalyticsRouter(analyticsService: AnalyticsService): Router {
  const router = Router();

  /**
   * GET /api/v1/analytics/dashboard
   * Get all dashboard metrics (HR Admin / Executive only)
   */
  router.get('/dashboard', requireRole(Role.HR_ADMIN, Role.EXECUTIVE), async (req: Request, res: Response) => {
    try {
      const metrics = await analyticsService.getDashboardMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard metrics' },
      });
    }
  });

  /**
   * GET /api/v1/analytics/burn-rate
   * Get global burn rate (HR Admin / Finance / Executive only)
   */
  router.get('/burn-rate', requireRole(Role.HR_ADMIN, Role.FINANCE, Role.EXECUTIVE), async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getBurnRate();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch burn rate' },
      });
    }
  });

  /**
   * GET /api/v1/analytics/cliff-monitor
   * Get equity cliff alerts (HR Admin only)
   */
  router.get('/cliff-monitor', requireRole(Role.HR_ADMIN), async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getCliffMonitor();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch cliff monitor' },
      });
    }
  });

  /**
   * GET /api/v1/analytics/headcount
   * Get headcount data (HR Admin / Executive only)
   */
  router.get('/headcount', requireRole(Role.HR_ADMIN, Role.EXECUTIVE), async (req: Request, res: Response) => {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const data = await analyticsService.getHeadcount(months);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch headcount' },
      });
    }
  });

  /**
   * POST /api/v1/analytics/headcount/snapshot
   * Capture headcount snapshot (System / Cron only)
   */
  router.post('/headcount/snapshot', requireRole(Role.HR_ADMIN), async (req: Request, res: Response) => {
    try {
      const { date } = req.body;
      const rowsInserted = await analyticsService.captureHeadcountSnapshot(date);
      res.json({ success: true, data: { rowsInserted } });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to capture snapshot' },
      });
    }
  });

  /**
   * GET /api/v1/analytics/tenure
   * Get tenure distribution
   */
  router.get('/tenure', requireRole(Role.HR_ADMIN, Role.EXECUTIVE), async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getTenureDistribution();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenure data' },
      });
    }
  });

  /**
   * GET /api/v1/analytics/anniversaries
   * Get upcoming work anniversaries
   */
  router.get('/anniversaries', requireRole(Role.HR_ADMIN, Role.MANAGER), async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getUpcomingAnniversaries(days);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch anniversaries' },
      });
    }
  });

  /**
   * GET /api/v1/analytics/equity-utilization
   * Get equity pool utilization
   */
  router.get('/equity-utilization', requireRole(Role.HR_ADMIN, Role.EXECUTIVE), async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getEquityUtilization();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch equity utilization' },
      });
    }
  });

  return router;
}

// ============================================================================
// PLACEHOLDER TYPE
// ============================================================================

interface DatabaseClient {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}
