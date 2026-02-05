/**
 * RBAC Permission Service
 *
 * Application-layer permission checking and enforcement.
 * Works in conjunction with database RLS policies.
 */

import { UUID } from '../types/employee.types';

// ============================================================================
// TYPES
// ============================================================================

export enum Role {
  HR_ADMIN = 'hr_admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  FINANCE = 'finance',
  EXECUTIVE = 'executive',
}

export enum Resource {
  EMPLOYEES = 'employees',
  SALARY = 'salary',
  EQUITY = 'equity',
  DOCUMENTS = 'documents',
  REPORTS = 'reports',
  ONBOARDING = 'onboarding',
}

export enum Action {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

export enum Scope {
  OWN = 'own',
  REPORTS = 'reports',
  DEPARTMENT = 'department',
  ALL = 'all',
}

export interface UserContext {
  employeeId: UUID;
  roles: Role[];
  departmentId?: UUID;
  locationId?: UUID;
}

export interface Permission {
  resource: Resource;
  action: Action;
  scope: Scope;
}

export interface SpecialAuthorization {
  id: UUID;
  grantorId: UUID;
  granteeId: UUID;
  targetEmployeeId: UUID | null;
  resource: Resource;
  action: Action;
  reason: string;
  expiresAt: Date | null;
}

// ============================================================================
// ROLE PERMISSION MATRIX
// ============================================================================

/**
 * Static permission matrix defining what each role can do.
 * This mirrors the database role_permissions table.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.HR_ADMIN]: [
    // Full access to everything
    { resource: Resource.EMPLOYEES, action: Action.READ, scope: Scope.ALL },
    { resource: Resource.EMPLOYEES, action: Action.WRITE, scope: Scope.ALL },
    { resource: Resource.EMPLOYEES, action: Action.DELETE, scope: Scope.ALL },
    { resource: Resource.EMPLOYEES, action: Action.ADMIN, scope: Scope.ALL },
    { resource: Resource.SALARY, action: Action.READ, scope: Scope.ALL },
    { resource: Resource.SALARY, action: Action.WRITE, scope: Scope.ALL },
    { resource: Resource.EQUITY, action: Action.READ, scope: Scope.ALL },
    { resource: Resource.EQUITY, action: Action.WRITE, scope: Scope.ALL },
    { resource: Resource.DOCUMENTS, action: Action.READ, scope: Scope.ALL },
    { resource: Resource.DOCUMENTS, action: Action.WRITE, scope: Scope.ALL },
    { resource: Resource.REPORTS, action: Action.READ, scope: Scope.ALL },
    { resource: Resource.ONBOARDING, action: Action.READ, scope: Scope.ALL },
    { resource: Resource.ONBOARDING, action: Action.WRITE, scope: Scope.ALL },
  ],

  [Role.MANAGER]: [
    // Own access
    { resource: Resource.EMPLOYEES, action: Action.READ, scope: Scope.OWN },
    { resource: Resource.EMPLOYEES, action: Action.WRITE, scope: Scope.OWN },
    { resource: Resource.SALARY, action: Action.READ, scope: Scope.OWN },
    { resource: Resource.EQUITY, action: Action.READ, scope: Scope.OWN },
    { resource: Resource.DOCUMENTS, action: Action.READ, scope: Scope.OWN },
    { resource: Resource.DOCUMENTS, action: Action.WRITE, scope: Scope.OWN },
    // Reports access
    { resource: Resource.EMPLOYEES, action: Action.READ, scope: Scope.REPORTS },
    { resource: Resource.EMPLOYEES, action: Action.WRITE, scope: Scope.REPORTS },
    { resource: Resource.DOCUMENTS, action: Action.READ, scope: Scope.REPORTS },
    { resource: Resource.ONBOARDING, action: Action.READ, scope: Scope.REPORTS },
    { resource: Resource.REPORTS, action: Action.READ, scope: Scope.DEPARTMENT },
    // Salary/Equity for reports requires special authorization (not in base matrix)
  ],

  [Role.EMPLOYEE]: [
    // Own access only
    { resource: Resource.EMPLOYEES, action: Action.READ, scope: Scope.OWN },
    { resource: Resource.EMPLOYEES, action: Action.WRITE, scope: Scope.OWN },
    { resource: Resource.SALARY, action: Action.READ, scope: Scope.OWN },
    { resource: Resource.EQUITY, action: Action.READ, scope: Scope.OWN },
    { resource: Resource.DOCUMENTS, action: Action.READ, scope: Scope.OWN },
    { resource: Resource.DOCUMENTS, action: Action.WRITE, scope: Scope.OWN },
  ],

  [Role.FINANCE]: [
    // Read salary data for payroll
    { resource: Resource.EMPLOYEES, action: Action.READ, scope: Scope.ALL },
    { resource: Resource.SALARY, action: Action.READ, scope: Scope.ALL },
    { resource: Resource.REPORTS, action: Action.READ, scope: Scope.ALL },
  ],

  [Role.EXECUTIVE]: [
    // High-level read access
    { resource: Resource.EMPLOYEES, action: Action.READ, scope: Scope.ALL },
    { resource: Resource.REPORTS, action: Action.READ, scope: Scope.ALL },
  ],
};

// ============================================================================
// PERMISSION SERVICE CLASS
// ============================================================================

export class PermissionService {
  private context: UserContext;
  private specialAuthorizations: SpecialAuthorization[] = [];
  private reportingChain: Set<UUID> = new Set();

  constructor(context: UserContext) {
    this.context = context;
  }

  /**
   * Load special authorizations from database
   */
  async loadSpecialAuthorizations(
    fetchAuthorizations: (employeeId: UUID) => Promise<SpecialAuthorization[]>
  ): Promise<void> {
    this.specialAuthorizations = await fetchAuthorizations(this.context.employeeId);
  }

  /**
   * Load reporting chain (direct and indirect reports)
   */
  async loadReportingChain(
    fetchReports: (managerId: UUID) => Promise<UUID[]>
  ): Promise<void> {
    const reports = await fetchReports(this.context.employeeId);
    this.reportingChain = new Set(reports);
  }

  /**
   * Check if user can perform action on resource
   */
  can(
    action: Action,
    resource: Resource,
    targetEmployeeId?: UUID
  ): boolean {
    // Get all permissions for user's roles
    const permissions = this.context.roles.flatMap(
      role => ROLE_PERMISSIONS[role] || []
    );

    // Find matching permissions
    const matchingPerms = permissions.filter(
      p => p.resource === resource && p.action === action
    );

    if (matchingPerms.length === 0) {
      // Check special authorizations for sensitive resources
      if (resource === Resource.SALARY || resource === Resource.EQUITY) {
        return this.hasSpecialAuthorization(resource, targetEmployeeId);
      }
      return false;
    }

    // Check if any permission scope allows access
    for (const perm of matchingPerms) {
      if (this.scopeAllowsAccess(perm.scope, targetEmployeeId)) {
        return true;
      }
    }

    // Check special authorizations as fallback
    if (resource === Resource.SALARY || resource === Resource.EQUITY) {
      return this.hasSpecialAuthorization(resource, targetEmployeeId);
    }

    return false;
  }

  /**
   * Check if scope allows access to target
   */
  private scopeAllowsAccess(scope: Scope, targetEmployeeId?: UUID): boolean {
    if (!targetEmployeeId) {
      // No target specified - only 'all' scope allows
      return scope === Scope.ALL;
    }

    switch (scope) {
      case Scope.ALL:
        return true;

      case Scope.OWN:
        return targetEmployeeId === this.context.employeeId;

      case Scope.REPORTS:
        return this.reportingChain.has(targetEmployeeId);

      case Scope.DEPARTMENT:
        // Would need to check department membership
        return this.isInSameDepartment(targetEmployeeId);

      default:
        return false;
    }
  }

  /**
   * Check for special authorization
   */
  private hasSpecialAuthorization(
    resource: Resource,
    targetEmployeeId?: UUID
  ): boolean {
    const now = new Date();

    return this.specialAuthorizations.some(auth => {
      // Check resource matches
      if (auth.resource !== resource) return false;

      // Check if expired
      if (auth.expiresAt && auth.expiresAt < now) return false;

      // Check target (null means all authorized reports)
      if (auth.targetEmployeeId !== null) {
        return auth.targetEmployeeId === targetEmployeeId;
      }

      // Auth for all reports - check if target is a report
      return targetEmployeeId ? this.reportingChain.has(targetEmployeeId) : false;
    });
  }

  /**
   * Check if target is in same department
   */
  private isInSameDepartment(_targetEmployeeId: UUID): boolean {
    // This would be implemented with a database call or cached data
    // For now, return false - actual implementation depends on infrastructure
    return false;
  }

  /**
   * Get highest scope for a resource/action combination
   */
  getScope(resource: Resource, action: Action): Scope | null {
    const permissions = this.context.roles.flatMap(
      role => ROLE_PERMISSIONS[role] || []
    );

    const matchingPerms = permissions.filter(
      p => p.resource === resource && p.action === action
    );

    if (matchingPerms.length === 0) return null;

    // Return highest scope
    const scopePriority = [Scope.ALL, Scope.DEPARTMENT, Scope.REPORTS, Scope.OWN];
    for (const scope of scopePriority) {
      if (matchingPerms.some(p => p.scope === scope)) {
        return scope;
      }
    }

    return null;
  }

  /**
   * Filter a list of employee IDs to only those the user can access
   */
  filterAccessible(
    employeeIds: UUID[],
    resource: Resource,
    action: Action
  ): UUID[] {
    return employeeIds.filter(id => this.can(action, resource, id));
  }

  /**
   * Get all accessible employee IDs based on scope
   */
  getAccessibleEmployeeIds(resource: Resource, action: Action): UUID[] | 'all' {
    const scope = this.getScope(resource, action);

    switch (scope) {
      case Scope.ALL:
        return 'all'; // Indicates no filtering needed

      case Scope.REPORTS:
        return Array.from(this.reportingChain);

      case Scope.OWN:
        return [this.context.employeeId];

      default:
        return [];
    }
  }
}

// ============================================================================
// PERMISSION DECORATORS (For Express routes)
// ============================================================================

import { Request, Response, NextFunction, RequestHandler } from 'express';

export interface AuthenticatedRequest extends Request {
  user: UserContext;
  permissions: PermissionService;
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(resource: Resource, action: Action): RequestHandler {
  return ((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const targetEmployeeId = req.params.employeeId || req.params.id;

    if (!req.permissions.can(action, resource, targetEmployeeId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `You do not have permission to ${action} ${resource}`,
        },
      });
    }

    next();
  }) as RequestHandler;
}

/**
 * Middleware to require one of multiple roles
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return ((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const hasRole = req.user.roles.some(r => roles.includes(r));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${roles.join(', ')}`,
        },
      });
    }

    next();
  }) as RequestHandler;
}

/**
 * Middleware to initialize permission service
 */
export function initializePermissions(
  fetchAuthorizations: (employeeId: UUID) => Promise<SpecialAuthorization[]>,
  fetchReports: (managerId: UUID) => Promise<UUID[]>
): RequestHandler {
  return (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const permissionService = new PermissionService(req.user);
    await permissionService.loadSpecialAuthorizations(fetchAuthorizations);
    await permissionService.loadReportingChain(fetchReports);

    req.permissions = permissionService;
    next();
  }) as unknown as RequestHandler;
}

// ============================================================================
// FIELD-LEVEL ACCESS CONTROL
// ============================================================================

/**
 * Define which fields employees can update on their own profile
 */
export const SELF_EDITABLE_FIELDS = new Set([
  'preferredFirstName',
  'preferredLastName',
  'personalEmail',
  'phone',
  'pronouns',
  'emergencyContact',
]);

/**
 * Fields that only HR can modify
 */
export const HR_ONLY_FIELDS = new Set([
  'legalFirstName',
  'legalLastName',
  'dateOfBirth',
  'employeeNumber',
  'originalHireDate',
  'currentStatus',
]);

/**
 * Filter object to only include allowed fields
 */
export function filterEditableFields<T extends Record<string, unknown>>(
  data: T,
  allowedFields: Set<string>
): Partial<T> {
  const filtered: Partial<T> = {};

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.has(key)) {
      (filtered as Record<string, unknown>)[key] = value;
    }
  }

  return filtered;
}

/**
 * Validate update request based on user role
 */
export function validateUpdateFields(
  data: Record<string, unknown>,
  userRoles: Role[],
  isSelfUpdate: boolean
): { valid: boolean; invalidFields: string[] } {
  const invalidFields: string[] = [];

  for (const field of Object.keys(data)) {
    // HR can edit anything
    if (userRoles.includes(Role.HR_ADMIN)) {
      continue;
    }

    // Self-update check
    if (isSelfUpdate) {
      if (!SELF_EDITABLE_FIELDS.has(field)) {
        invalidFields.push(field);
      }
    } else {
      // Non-self, non-HR update
      if (HR_ONLY_FIELDS.has(field)) {
        invalidFields.push(field);
      }
    }
  }

  return {
    valid: invalidFields.length === 0,
    invalidFields,
  };
}
