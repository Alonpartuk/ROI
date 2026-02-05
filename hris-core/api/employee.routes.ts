/**
 * HRIS Employee API Routes
 * RESTful endpoints for employee timeline and CRUD operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  Employee,
  EmployeeFull,
  EmployeeTimeline,
  TimelineEvent,
  TimelineEventType,
  GetEmployeeTimelineRequest,
  GetEmployeeTimelineResponse,
  CreateEmploymentRecordRequest,
  CreateSalaryRecordRequest,
  CreateEquityGrantRequest,
  EmploymentRecord,
  SalaryRecord,
  EquityGrant,
  Document,
  DocumentVisibility,
  UUID,
  ISODate,
} from '../types/employee.types';

// ============================================================================
// TYPE DEFINITIONS FOR API
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
  };
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// Request is augmented globally via ./types/express.d.ts

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

const router = Router();

/**
 * GET /api/v1/employees
 * List all employees with filtering and pagination
 *
 * Query params:
 *   - status: Filter by employment status
 *   - department: Filter by department ID
 *   - location: Filter by location code (TLV, TOR, US)
 *   - manager: Filter by manager ID
 *   - search: Search by name or email
 *   - page: Page number (default: 1)
 *   - pageSize: Items per page (default: 25, max: 100)
 *   - asOfDate: View state as of specific date (effective dating)
 */
router.get('/employees', async (req: Request, res: Response) => {
  const {
    status,
    department,
    location,
    manager,
    search,
    page = 1,
    pageSize = 25,
    asOfDate,
  } = req.query;

  // Implementation would query database with effective dating logic
  // SELECT * FROM v_current_employment WHERE ...
  // If asOfDate provided, use get_employment_as_of function

  const response: ApiResponse<EmployeeFull[]> = {
    success: true,
    data: [], // populated from DB
    meta: {
      pagination: {
        page: Number(page),
        pageSize: Math.min(Number(pageSize), 100),
        totalItems: 0,
        totalPages: 0,
      },
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/employees/:id
 * Get single employee with full details
 *
 * Query params:
 *   - asOfDate: View state as of specific date
 *   - include: Comma-separated list of relations to include
 *             (employment, salary, equity, documents, timeline)
 */
router.get('/employees/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { asOfDate, include } = req.query;

  const includes = include ? String(include).split(',') : ['employment', 'salary'];

  // Implementation would:
  // 1. Fetch base employee
  // 2. If asOfDate, use effective dating functions
  // 3. Include requested relations

  const response: ApiResponse<EmployeeFull> = {
    success: true,
    data: undefined, // populated from DB
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/employees/:id/timeline
 * Get complete employee timeline (history + future scheduled events)
 *
 * This is the core "effective dating" view endpoint
 *
 * Query params:
 *   - startDate: Filter events from this date
 *   - endDate: Filter events until this date
 *   - eventTypes: Comma-separated list of event types to include
 *   - includeFuture: Include scheduled future events (default: true)
 */
router.get('/employees/:id/timeline', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    startDate,
    endDate,
    eventTypes,
    includeFuture = 'true',
  } = req.query;

  const request: GetEmployeeTimelineRequest = {
    employeeId: id,
    startDate: startDate as ISODate,
    endDate: endDate as ISODate,
    eventTypes: eventTypes
      ? (String(eventTypes).split(',') as TimelineEventType[])
      : undefined,
    includeFuture: includeFuture === 'true',
  };

  // Implementation calls get_employee_timeline SQL function
  // and enriches with future vesting events, scheduled changes

  const response: ApiResponse<GetEmployeeTimelineResponse> = {
    success: true,
    data: undefined, // populated from DB
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/employees/:id/as-of/:date
 * Get employee state as of a specific date
 *
 * This enables viewing historical states and previewing future changes
 */
router.get('/employees/:id/as-of/:date', async (req: Request, res: Response) => {
  const { id, date } = req.params;

  // Implementation uses get_employment_as_of SQL function
  // Returns snapshot of employee at that point in time

  const response: ApiResponse<EmployeeFull> = {
    success: true,
    data: undefined,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

// ============================================================================
// EMPLOYMENT RECORDS (EFFECTIVE-DATED)
// ============================================================================

/**
 * GET /api/v1/employees/:id/employment
 * Get all employment records (history + current + future)
 */
router.get('/employees/:id/employment', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { includeFuture = 'true' } = req.query;

  // Returns all employment_records ordered by effective_date DESC

  const response: ApiResponse<EmploymentRecord[]> = {
    success: true,
    data: [],
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * POST /api/v1/employees/:id/employment
 * Create new employment record (supports future-dated changes)
 *
 * The system automatically:
 * - End-dates the previous current record
 * - Updates employee.current_status if effective today or past
 */
router.post('/employees/:id/employment', async (req: Request, res: Response) => {
  const { id } = req.params;
  const body: CreateEmploymentRecordRequest = req.body;

  // Validation
  if (!body.effectiveDate) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'effectiveDate is required',
      },
    });
  }

  // Implementation calls insert_employment_record SQL function
  // which handles end-dating previous record

  const response: ApiResponse<EmploymentRecord> = {
    success: true,
    data: undefined,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(201).json(response);
});

/**
 * DELETE /api/v1/employees/:id/employment/:recordId
 * Cancel a future-dated employment change (only if effective_date > today)
 */
router.delete('/employees/:id/employment/:recordId', async (req: Request, res: Response) => {
  const { id, recordId } = req.params;

  // Can only delete future-dated records
  // Past/current records are immutable (history preservation)

  const response: ApiResponse<void> = {
    success: true,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

// ============================================================================
// SALARY RECORDS
// ============================================================================

/**
 * GET /api/v1/employees/:id/salary
 * Get salary history
 */
router.get('/employees/:id/salary', async (req: Request, res: Response) => {
  const { id } = req.params;

  const response: ApiResponse<SalaryRecord[]> = {
    success: true,
    data: [],
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * POST /api/v1/employees/:id/salary
 * Create new salary record (supports future-dated changes)
 */
router.post('/employees/:id/salary', async (req: Request, res: Response) => {
  const { id } = req.params;
  const body: CreateSalaryRecordRequest = req.body;

  // Validation
  if (!body.effectiveDate || !body.amount || !body.currency) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'effectiveDate, amount, and currency are required',
      },
    });
  }

  // Implementation:
  // 1. End-dates previous salary record
  // 2. Calculates annualized amount
  // 3. Fetches exchange rate for normalization
  // 4. Creates new record

  const response: ApiResponse<SalaryRecord> = {
    success: true,
    data: undefined,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(201).json(response);
});

/**
 * GET /api/v1/employees/:id/salary/comparison
 * Compare salary against band for current level/location
 */
router.get('/employees/:id/salary/comparison', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Returns SalaryComparison with position in band

  res.json({
    success: true,
    data: {
      currentSalary: 0,
      bandMin: 0,
      bandMid: 0,
      bandMax: 0,
      percentile: 0,
      compaRatio: 0,
    },
  });
});

// ============================================================================
// EQUITY GRANTS
// ============================================================================

/**
 * GET /api/v1/employees/:id/equity
 * Get all equity grants for employee
 */
router.get('/employees/:id/equity', async (req: Request, res: Response) => {
  const { id } = req.params;

  const response: ApiResponse<EquityGrant[]> = {
    success: true,
    data: [],
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/employees/:id/equity/summary
 * Get aggregated equity summary with next vesting info
 */
router.get('/employees/:id/equity/summary', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Implementation uses v_equity_summary view
  // and calculate_next_vesting_date function

  res.json({
    success: true,
    data: {
      totalSharesGranted: 0,
      totalSharesVested: 0,
      totalSharesExercised: 0,
      totalSharesForfeited: 0,
      totalSharesUnvested: 0,
      totalSharesExercisable: 0,
      grants: [],
      nextVestingDate: null,
      nextVestingShares: null,
    },
  });
});

/**
 * POST /api/v1/employees/:id/equity
 * Create new equity grant
 */
router.post('/employees/:id/equity', async (req: Request, res: Response) => {
  const { id } = req.params;
  const body: CreateEquityGrantRequest = req.body;

  // Implementation:
  // 1. Validates against equity plan limits
  // 2. Creates grant record
  // 3. Triggers generate_vesting_schedule function

  const response: ApiResponse<EquityGrant> = {
    success: true,
    data: undefined,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(201).json(response);
});

/**
 * GET /api/v1/employees/:id/equity/:grantId/vesting-schedule
 * Get detailed vesting schedule for a specific grant
 */
router.get('/employees/:id/equity/:grantId/vesting-schedule', async (req: Request, res: Response) => {
  const { id, grantId } = req.params;

  // Returns VestingScheduleItem[] from vesting_events table

  res.json({
    success: true,
    data: [],
  });
});

// ============================================================================
// DOCUMENTS
// ============================================================================

/**
 * GET /api/v1/employees/:id/documents
 * Get documents for employee (filtered by user's access level)
 */
router.get('/employees/:id/documents', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { category, visibility } = req.query;

  // RLS policies handle access control automatically
  // HR sees all, managers see manager_visible + public, employees see their own

  const response: ApiResponse<Document[]> = {
    success: true,
    data: [],
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * POST /api/v1/employees/:id/documents
 * Upload new document
 */
router.post('/employees/:id/documents', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Implementation:
  // 1. Handle file upload to S3/storage
  // 2. Create document record with metadata
  // 3. Set visibility based on category or explicit setting

  const response: ApiResponse<Document> = {
    success: true,
    data: undefined,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(201).json(response);
});

/**
 * GET /api/v1/employees/:id/documents/:docId/download
 * Download document (logged in document_access_log)
 */
router.get('/employees/:id/documents/:docId/download', async (req: Request, res: Response) => {
  const { id, docId } = req.params;

  // Implementation:
  // 1. Verify access (RLS or manual check)
  // 2. Log access to document_access_log
  // 3. Generate presigned URL or stream file

  res.redirect('https://storage.example.com/presigned-url');
});

// ============================================================================
// LOCALIZATION
// ============================================================================

/**
 * GET /api/v1/employees/:id/local-data
 * Get location-specific data for employee
 */
router.get('/employees/:id/local-data', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Returns employee_local_data record

  res.json({
    success: true,
    data: null,
  });
});

/**
 * PUT /api/v1/employees/:id/local-data
 * Update location-specific data (creates new effective-dated record)
 */
router.put('/employees/:id/local-data', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { effectiveDate, localFields } = req.body;

  // Implementation end-dates previous record and creates new one

  res.json({
    success: true,
    data: null,
  });
});

// ============================================================================
// REPORTING ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/employees/:id/org-chart
 * Get organizational hierarchy for employee
 */
router.get('/employees/:id/org-chart', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { direction = 'both', depth = 3 } = req.query;

  // direction: 'up' (to CEO), 'down' (direct reports), 'both'

  res.json({
    success: true,
    data: {
      upChain: [], // Manager chain to top
      directReports: [],
      allReports: [], // Recursive reports
    },
  });
});

/**
 * GET /api/v1/reports/headcount
 * Headcount report by location, department, etc.
 */
router.get('/reports/headcount', async (req: Request, res: Response) => {
  const { groupBy = 'location', asOfDate } = req.query;

  // Supports effective dating for historical headcount

  res.json({
    success: true,
    data: [],
  });
});

/**
 * GET /api/v1/reports/compensation
 * Compensation report (HR only)
 */
router.get('/reports/compensation', async (req: Request, res: Response) => {
  const { groupBy = 'department', currency = 'USD' } = req.query;

  // Normalizes all salaries to requested currency

  res.json({
    success: true,
    data: [],
  });
});

export default router;

// ============================================================================
// API DOCUMENTATION (OpenAPI/Swagger Schema)
// ============================================================================

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'HRIS Core API',
    version: '1.0.0',
    description: 'Global HRIS API with effective dating support',
  },
  paths: {
    '/api/v1/employees/{id}/timeline': {
      get: {
        summary: 'Get employee timeline',
        description: `
          Returns the complete timeline of an employee's history and future scheduled events.
          This is the core endpoint for the "effective dating" feature.

          Events include:
          - Employment changes (hire, promotion, transfer, termination)
          - Salary changes (with reason codes)
          - Equity grants and vesting events
          - Document uploads

          Supports filtering by date range and event type.
        `,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'eventTypes', in: 'query', schema: { type: 'string' } },
          { name: 'includeFuture', in: 'query', schema: { type: 'boolean', default: true } },
        ],
        responses: {
          200: {
            description: 'Employee timeline',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GetEmployeeTimelineResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/employees/{id}/as-of/{date}': {
      get: {
        summary: 'Get employee state as of date',
        description: `
          Returns the employee's complete state as it was (or will be) on the specified date.

          Use cases:
          - View historical state (e.g., "What was John's title in January 2023?")
          - Preview future state (e.g., "What will the team look like after the reorg?")
          - Audit trails and compliance reporting
        `,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'date', in: 'path', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'Employee state snapshot',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmployeeFull' },
              },
            },
          },
        },
      },
    },
  },
};
