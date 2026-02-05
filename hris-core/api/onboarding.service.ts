/**
 * Onboarding Task Engine Service
 *
 * Manages automated task generation and tracking for new employee onboarding.
 * Tasks are created based on location-specific templates when an employee is hired.
 */

import { UUID, ISODate } from '../types/employee.types';

// ============================================================================
// TYPES
// ============================================================================

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TaskCategory {
  DOCUMENTATION = 'documentation',
  IT_SETUP = 'it_setup',
  TRAINING = 'training',
  COMPLIANCE = 'compliance',
  INTRODUCTION = 'introduction',
  ADMINISTRATIVE = 'administrative',
  BENEFITS = 'benefits',
}

export enum AssigneeType {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  HR = 'hr',
  IT = 'it',
  SPECIFIC_USER = 'specific_user',
}

export interface TaskTemplate {
  id: UUID;
  name: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  locationId: UUID | null;
  employmentType: string | null;
  departmentId: UUID | null;
  daysFromStart: number;
  daysToComplete: number;
  assigneeType: AssigneeType;
  specificAssigneeId: UUID | null;
  relatedFormId: string | null;
  instructions: string | null;
  checklist: ChecklistItem[] | null;
  externalLink: string | null;
  isActive: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface OnboardingTask {
  id: UUID;
  templateId: UUID | null;
  employeeId: UUID;
  name: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  assigneeType: AssigneeType;
  assignedTo: UUID | null;
  createdAt: string;
  dueDate: ISODate;
  startedAt: string | null;
  completedAt: string | null;
  status: TaskStatus;
  blockedReason: string | null;
  checklist: ChecklistItem[] | null;
  checklistProgress: number;
  relatedFormId: string | null;
  relatedDocumentId: UUID | null;
  dependsOnTaskId: UUID | null;
  isDependencyMet: boolean;
  notes: string | null;
}

export interface OnboardingProgress {
  employeeId: UUID;
  employeeNumber: string;
  employeeName: string;
  startDate: ISODate;
  locationCode: string;
  department: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  nextDueDate: ISODate | null;
}

export interface TaskWithContext extends OnboardingTask {
  employeeNumber: string;
  employeeName: string;
  employeeStartDate: ISODate;
  isOverdue: boolean;
}

export interface CreateTaskRequest {
  employeeId: UUID;
  name: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  assigneeType: AssigneeType;
  assignedTo?: UUID;
  dueDate: ISODate;
  checklist?: ChecklistItem[];
  relatedFormId?: string;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  notes?: string;
  blockedReason?: string;
}

// ============================================================================
// ONBOARDING SERVICE CLASS
// ============================================================================

export class OnboardingService {
  private db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  /**
   * Generate onboarding tasks for a new employee
   * This is typically called automatically by a database trigger,
   * but can also be invoked manually.
   */
  async generateTasksForEmployee(
    employeeId: UUID,
    startDate?: ISODate,
    createdBy?: UUID
  ): Promise<number> {
    const result = await this.db.query<{ generate_onboarding_tasks: number }>(
      `SELECT generate_onboarding_tasks($1, $2::DATE, $3)`,
      [employeeId, startDate, createdBy]
    );
    return result[0]?.generate_onboarding_tasks || 0;
  }

  /**
   * Get all onboarding tasks for an employee
   */
  async getEmployeeTasks(employeeId: UUID): Promise<OnboardingTask[]> {
    return this.db.query<OnboardingTask>(`
      SELECT
        id,
        template_id AS "templateId",
        employee_id AS "employeeId",
        name,
        description,
        category,
        priority,
        assignee_type AS "assigneeType",
        assigned_to AS "assignedTo",
        created_at AS "createdAt",
        due_date AS "dueDate",
        started_at AS "startedAt",
        completed_at AS "completedAt",
        status,
        blocked_reason AS "blockedReason",
        checklist,
        checklist_progress AS "checklistProgress",
        related_form_id AS "relatedFormId",
        related_document_id AS "relatedDocumentId",
        depends_on_task_id AS "dependsOnTaskId",
        is_dependency_met AS "isDependencyMet",
        notes
      FROM onboarding_tasks
      WHERE employee_id = $1
      ORDER BY
        CASE status
          WHEN 'in_progress' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'blocked' THEN 3
          WHEN 'completed' THEN 4
          ELSE 5
        END,
        due_date
    `, [employeeId]);
  }

  /**
   * Get tasks assigned to a specific user
   */
  async getMyTasks(assigneeId: UUID): Promise<TaskWithContext[]> {
    return this.db.query<TaskWithContext>(`
      SELECT
        ot.id,
        ot.template_id AS "templateId",
        ot.employee_id AS "employeeId",
        ot.name,
        ot.description,
        ot.category,
        ot.priority,
        ot.assignee_type AS "assigneeType",
        ot.assigned_to AS "assignedTo",
        ot.created_at AS "createdAt",
        ot.due_date AS "dueDate",
        ot.started_at AS "startedAt",
        ot.completed_at AS "completedAt",
        ot.status,
        ot.blocked_reason AS "blockedReason",
        ot.checklist,
        ot.checklist_progress AS "checklistProgress",
        ot.related_form_id AS "relatedFormId",
        ot.related_document_id AS "relatedDocumentId",
        ot.depends_on_task_id AS "dependsOnTaskId",
        ot.is_dependency_met AS "isDependencyMet",
        ot.notes,
        e.employee_number AS "employeeNumber",
        COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
          COALESCE(e.preferred_last_name, e.legal_last_name) AS "employeeName",
        e.original_hire_date AS "employeeStartDate",
        ot.due_date < CURRENT_DATE AS "isOverdue"
      FROM onboarding_tasks ot
      JOIN employees e ON ot.employee_id = e.id
      WHERE ot.assigned_to = $1
        AND ot.status IN ('pending', 'in_progress', 'blocked')
      ORDER BY
        CASE ot.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        ot.due_date
    `, [assigneeId]);
  }

  /**
   * Get tasks by assignee type (for HR/IT dashboards)
   */
  async getTasksByAssigneeType(assigneeType: AssigneeType): Promise<TaskWithContext[]> {
    return this.db.query<TaskWithContext>(`
      SELECT
        ot.id,
        ot.template_id AS "templateId",
        ot.employee_id AS "employeeId",
        ot.name,
        ot.description,
        ot.category,
        ot.priority,
        ot.assignee_type AS "assigneeType",
        ot.assigned_to AS "assignedTo",
        ot.created_at AS "createdAt",
        ot.due_date AS "dueDate",
        ot.started_at AS "startedAt",
        ot.completed_at AS "completedAt",
        ot.status,
        ot.checklist_progress AS "checklistProgress",
        ot.related_form_id AS "relatedFormId",
        ot.is_dependency_met AS "isDependencyMet",
        e.employee_number AS "employeeNumber",
        COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
          COALESCE(e.preferred_last_name, e.legal_last_name) AS "employeeName",
        e.original_hire_date AS "employeeStartDate",
        ot.due_date < CURRENT_DATE AS "isOverdue"
      FROM onboarding_tasks ot
      JOIN employees e ON ot.employee_id = e.id
      WHERE ot.assignee_type = $1
        AND ot.status IN ('pending', 'in_progress', 'blocked')
      ORDER BY ot.due_date
    `, [assigneeType]);
  }

  /**
   * Get onboarding progress for recent hires
   */
  async getOnboardingProgress(daysBack: number = 90): Promise<OnboardingProgress[]> {
    return this.db.query<OnboardingProgress>(`
      SELECT
        employee_id AS "employeeId",
        employee_number AS "employeeNumber",
        employee_name AS "employeeName",
        start_date AS "startDate",
        location_code AS "locationCode",
        department,
        total_tasks AS "totalTasks",
        completed_tasks AS "completedTasks",
        overdue_tasks AS "overdueTasks",
        completion_percentage AS "completionPercentage",
        next_due_date AS "nextDueDate"
      FROM v_onboarding_progress
      WHERE start_date >= (CURRENT_DATE - ($1 || ' days')::INTERVAL)
      ORDER BY start_date DESC
    `, [daysBack]);
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(): Promise<TaskWithContext[]> {
    return this.db.query<TaskWithContext>(`
      SELECT
        ot.id,
        ot.name,
        ot.category,
        ot.priority,
        ot.status,
        ot.due_date AS "dueDate",
        ot.assignee_type AS "assigneeType",
        ot.assigned_to AS "assignedTo",
        e.employee_number AS "employeeNumber",
        COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
          COALESCE(e.preferred_last_name, e.legal_last_name) AS "employeeName",
        e.original_hire_date AS "employeeStartDate",
        CURRENT_DATE - ot.due_date AS "daysOverdue",
        true AS "isOverdue"
      FROM onboarding_tasks ot
      JOIN employees e ON ot.employee_id = e.id
      WHERE ot.status IN ('pending', 'in_progress')
        AND ot.due_date < CURRENT_DATE
      ORDER BY (CURRENT_DATE - ot.due_date) DESC, ot.priority
    `);
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: UUID,
    request: UpdateTaskStatusRequest,
    updatedBy: UUID
  ): Promise<boolean> {
    const result = await this.db.query<{ update_task_status: boolean }>(
      `SELECT update_task_status($1, $2::task_status, $3, $4)`,
      [taskId, request.status, updatedBy, request.notes]
    );
    return result[0]?.update_task_status || false;
  }

  /**
   * Update checklist item
   */
  async updateChecklistItem(
    taskId: UUID,
    itemIndex: number,
    checked: boolean,
    updatedBy: UUID
  ): Promise<boolean> {
    const result = await this.db.query<{ update_task_checklist: boolean }>(
      `SELECT update_task_checklist($1, $2, $3, $4)`,
      [taskId, itemIndex, checked, updatedBy]
    );
    return result[0]?.update_task_checklist || false;
  }

  /**
   * Create a custom task (not from template)
   */
  async createTask(request: CreateTaskRequest, createdBy: UUID): Promise<OnboardingTask> {
    const [task] = await this.db.query<OnboardingTask>(`
      INSERT INTO onboarding_tasks (
        employee_id,
        name,
        description,
        category,
        priority,
        assignee_type,
        assigned_to,
        due_date,
        checklist,
        related_form_id,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id,
        template_id AS "templateId",
        employee_id AS "employeeId",
        name,
        description,
        category,
        priority,
        assignee_type AS "assigneeType",
        assigned_to AS "assignedTo",
        created_at AS "createdAt",
        due_date AS "dueDate",
        status,
        checklist
    `, [
      request.employeeId,
      request.name,
      request.description,
      request.category,
      request.priority,
      request.assigneeType,
      request.assignedTo,
      request.dueDate,
      request.checklist ? JSON.stringify(request.checklist) : null,
      request.relatedFormId,
      createdBy,
    ]);

    return task;
  }

  /**
   * Reassign a task
   */
  async reassignTask(
    taskId: UUID,
    newAssigneeId: UUID,
    updatedBy: UUID
  ): Promise<boolean> {
    const result = await this.db.query(`
      UPDATE onboarding_tasks
      SET assigned_to = $1, updated_at = NOW(), updated_by = $2
      WHERE id = $3
    `, [newAssigneeId, updatedBy, taskId]);

    return true;
  }

  /**
   * Link a document to a task
   */
  async linkDocument(
    taskId: UUID,
    documentId: UUID,
    updatedBy: UUID
  ): Promise<boolean> {
    await this.db.query(`
      UPDATE onboarding_tasks
      SET related_document_id = $1, updated_at = NOW(), updated_by = $2
      WHERE id = $3
    `, [documentId, updatedBy, taskId]);

    return true;
  }

  /**
   * Get task templates (for admin configuration)
   */
  async getTemplates(locationId?: UUID): Promise<TaskTemplate[]> {
    let query = `
      SELECT
        id,
        name,
        description,
        category,
        priority,
        location_id AS "locationId",
        employment_type AS "employmentType",
        department_id AS "departmentId",
        days_from_start AS "daysFromStart",
        days_to_complete AS "daysToComplete",
        assignee_type AS "assigneeType",
        specific_assignee_id AS "specificAssigneeId",
        related_form_id AS "relatedFormId",
        instructions,
        checklist,
        external_link AS "externalLink",
        is_active AS "isActive"
      FROM task_templates
    `;

    const params: unknown[] = [];

    if (locationId) {
      query += ` WHERE location_id IS NULL OR location_id = $1`;
      params.push(locationId);
    }

    query += ` ORDER BY days_from_start, priority`;

    return this.db.query<TaskTemplate>(query, params);
  }
}

// ============================================================================
// API ROUTES
// ============================================================================

import { Router, Request, Response } from 'express';
import { requireRole, Role } from './permissions.service';

export function createOnboardingRouter(onboardingService: OnboardingService): Router {
  const router = Router();

  /**
   * GET /api/v1/onboarding/progress
   * Get onboarding progress for all recent hires
   */
  router.get('/progress', requireRole(Role.HR_ADMIN, Role.MANAGER), async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 90;
      const data = await onboardingService.getOnboardingProgress(days);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch onboarding progress' },
      });
    }
  });

  /**
   * GET /api/v1/onboarding/my-tasks
   * Get tasks assigned to current user
   */
  router.get('/my-tasks', async (req: Request, res: Response) => {
    try {
      const data = await onboardingService.getMyTasks(req.user.employeeId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tasks' },
      });
    }
  });

  /**
   * GET /api/v1/onboarding/tasks/hr
   * Get all HR-assigned tasks
   */
  router.get('/tasks/hr', requireRole(Role.HR_ADMIN), async (req: Request, res: Response) => {
    try {
      const data = await onboardingService.getTasksByAssigneeType(AssigneeType.HR);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch HR tasks' },
      });
    }
  });

  /**
   * GET /api/v1/onboarding/tasks/overdue
   * Get all overdue tasks
   */
  router.get('/tasks/overdue', requireRole(Role.HR_ADMIN), async (req: Request, res: Response) => {
    try {
      const data = await onboardingService.getOverdueTasks();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch overdue tasks' },
      });
    }
  });

  /**
   * GET /api/v1/onboarding/employees/:employeeId/tasks
   * Get onboarding tasks for specific employee
   */
  router.get('/employees/:employeeId/tasks', async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const data = await onboardingService.getEmployeeTasks(employeeId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch employee tasks' },
      });
    }
  });

  /**
   * POST /api/v1/onboarding/employees/:employeeId/generate
   * Manually generate tasks for an employee
   */
  router.post('/employees/:employeeId/generate', requireRole(Role.HR_ADMIN), async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const { startDate } = req.body;
      const tasksCreated = await onboardingService.generateTasksForEmployee(
        employeeId,
        startDate,
        req.user.employeeId
      );
      res.json({ success: true, data: { tasksCreated } });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate tasks' },
      });
    }
  });

  /**
   * PUT /api/v1/onboarding/tasks/:taskId/status
   * Update task status
   */
  router.put('/tasks/:taskId/status', async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const success = await onboardingService.updateTaskStatus(
        taskId,
        req.body,
        req.user.employeeId
      );
      res.json({ success });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update task' },
      });
    }
  });

  /**
   * PUT /api/v1/onboarding/tasks/:taskId/checklist/:index
   * Update checklist item
   */
  router.put('/tasks/:taskId/checklist/:index', async (req: Request, res: Response) => {
    try {
      const { taskId, index } = req.params;
      const { checked } = req.body;
      const success = await onboardingService.updateChecklistItem(
        taskId,
        parseInt(index),
        checked,
        req.user.employeeId
      );
      res.json({ success });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update checklist' },
      });
    }
  });

  /**
   * POST /api/v1/onboarding/tasks
   * Create a custom task
   */
  router.post('/tasks', requireRole(Role.HR_ADMIN, Role.MANAGER), async (req: Request, res: Response) => {
    try {
      const task = await onboardingService.createTask(req.body, req.user.employeeId);
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create task' },
      });
    }
  });

  /**
   * GET /api/v1/onboarding/templates
   * Get task templates
   */
  router.get('/templates', requireRole(Role.HR_ADMIN), async (req: Request, res: Response) => {
    try {
      const { locationId } = req.query;
      const data = await onboardingService.getTemplates(locationId as UUID);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch templates' },
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
