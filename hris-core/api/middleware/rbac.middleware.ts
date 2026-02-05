/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts API endpoints based on user roles and permissions
 */

import { Request, Response, NextFunction } from 'express';

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

export type Role =
  | 'hr_admin'
  | 'hr_viewer'
  | 'finance'
  | 'manager'
  | 'employee'
  | 'admin';

// Role hierarchy: higher roles inherit lower role permissions
const ROLE_HIERARCHY: Record<Role, Role[]> = {
  admin: ['hr_admin', 'hr_viewer', 'finance', 'manager', 'employee'],
  hr_admin: ['hr_viewer', 'manager', 'employee'],
  hr_viewer: ['employee'],
  finance: ['employee'],
  manager: ['employee'],
  employee: [],
};

// =============================================================================
// PERMISSION DEFINITIONS
// =============================================================================

export type Permission =
  | 'employees:read'
  | 'employees:write'
  | 'employees:delete'
  | 'salary:read'
  | 'salary:write'
  | 'equity:read'
  | 'equity:write'
  | 'documents:read'
  | 'documents:write'
  | 'reports:read'
  | 'analytics:read'
  | 'onboarding:read'
  | 'onboarding:write'
  | 'assets:read'
  | 'assets:write'
  | 'settings:read'
  | 'settings:write';

// Default permissions per role
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'employees:read', 'employees:write', 'employees:delete',
    'salary:read', 'salary:write',
    'equity:read', 'equity:write',
    'documents:read', 'documents:write',
    'reports:read', 'analytics:read',
    'onboarding:read', 'onboarding:write',
    'assets:read', 'assets:write',
    'settings:read', 'settings:write',
  ],
  hr_admin: [
    'employees:read', 'employees:write',
    'salary:read', 'salary:write',
    'equity:read', 'equity:write',
    'documents:read', 'documents:write',
    'reports:read', 'analytics:read',
    'onboarding:read', 'onboarding:write',
    'assets:read', 'assets:write',
  ],
  hr_viewer: [
    'employees:read',
    'documents:read',
    'reports:read',
    'onboarding:read',
    'assets:read',
  ],
  finance: [
    'employees:read',
    'salary:read', 'salary:write',
    'equity:read',
    'reports:read', 'analytics:read',
  ],
  manager: [
    'employees:read',
    'documents:read',
    'onboarding:read',
    'reports:read',
  ],
  employee: [
    'employees:read', // Only own data via RLS
    'documents:read', // Only own docs via RLS
  ],
};

// =============================================================================
// RBAC MIDDLEWARE FACTORY
// =============================================================================

/**
 * Middleware factory that restricts access based on roles
 *
 * @param allowedRoles - Array of roles that can access this endpoint
 * @returns Express middleware function
 *
 * @example
 * // Only HR admins and finance can access salary endpoints
 * router.get('/salary', requireRole(['hr_admin', 'finance']), getSalary);
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];

    // Check if user has any of the allowed roles (including inherited roles)
    const hasAccess = userRoles.some(userRole => {
      // Direct role match
      if (allowedRoles.includes(userRole as Role)) {
        return true;
      }

      // Check inherited roles
      const inheritedRoles = ROLE_HIERARCHY[userRole as Role] || [];
      return allowedRoles.some(allowedRole => inheritedRoles.includes(allowedRole));
    });

    if (!hasAccess) {
      console.warn(`[RBAC] Access denied: User ${req.user?.employeeId} with roles [${userRoles.join(', ')}] attempted to access endpoint requiring [${allowedRoles.join(', ')}]`);

      return res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_ROLE',
        message: 'You do not have the required role to access this resource.',
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
}

/**
 * Middleware factory that restricts access based on permissions
 *
 * @param requiredPermissions - Array of permissions required (ALL must match)
 * @returns Express middleware function
 *
 * @example
 * router.post('/salary', requirePermission(['salary:write']), createSalary);
 */
export function requirePermission(requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];
    const explicitPermissions = req.user?.permissions || [];

    // Gather all permissions from roles
    const rolePermissions = new Set<string>();
    userRoles.forEach(role => {
      const perms = ROLE_PERMISSIONS[role as Role] || [];
      perms.forEach(p => rolePermissions.add(p));

      // Also add inherited role permissions
      const inheritedRoles = ROLE_HIERARCHY[role as Role] || [];
      inheritedRoles.forEach(inheritedRole => {
        const inheritedPerms = ROLE_PERMISSIONS[inheritedRole] || [];
        inheritedPerms.forEach(p => rolePermissions.add(p));
      });
    });

    // Combine with explicit permissions (from JWT)
    const allPermissions = new Set([...rolePermissions, ...explicitPermissions]);

    // Check if user has ALL required permissions
    const missingPermissions = requiredPermissions.filter(p => !allPermissions.has(p));

    if (missingPermissions.length > 0) {
      console.warn(`[RBAC] Permission denied: User ${req.user?.employeeId} missing permissions [${missingPermissions.join(', ')}]`);

      return res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSION',
        message: 'You do not have the required permissions to perform this action.',
        missingPermissions,
      });
    }

    next();
  };
}

/**
 * Middleware that requires user to be either:
 * 1. HR admin or higher, OR
 * 2. The owner of the requested resource
 *
 * Useful for endpoints like /employees/:id where users can view their own data
 *
 * @param getResourceOwnerId - Function to extract owner ID from request
 * @returns Express middleware function
 */
export function requireSelfOrRole(
  getResourceOwnerId: (req: Request) => string | undefined,
  allowedRoles: Role[] = ['hr_admin']
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];
    const userId = req.user?.employeeId;
    const resourceOwnerId = getResourceOwnerId(req);

    // Check if user is the resource owner
    if (userId && resourceOwnerId && userId === resourceOwnerId) {
      return next();
    }

    // Check if user has privileged role
    const hasPrivilegedRole = userRoles.some(userRole => {
      if (allowedRoles.includes(userRole as Role)) {
        return true;
      }
      const inheritedRoles = ROLE_HIERARCHY[userRole as Role] || [];
      return allowedRoles.some(allowedRole => inheritedRoles.includes(allowedRole));
    });

    if (hasPrivilegedRole) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      code: 'ACCESS_DENIED',
      message: 'You can only access your own data or need elevated privileges.',
    });
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a user has a specific role
 */
export function hasRole(req: Request, role: Role): boolean {
  const userRoles = req.user?.roles || [];
  return userRoles.some(userRole => {
    if (userRole === role) return true;
    const inheritedRoles = ROLE_HIERARCHY[userRole as Role] || [];
    return inheritedRoles.includes(role);
  });
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(req: Request, permission: Permission): boolean {
  const userRoles = req.user?.roles || [];
  const explicitPermissions = req.user?.permissions || [];

  if (explicitPermissions.includes(permission) || explicitPermissions.includes('*')) {
    return true;
  }

  return userRoles.some(role => {
    const perms = ROLE_PERMISSIONS[role as Role] || [];
    return perms.includes(permission);
  });
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(req: Request): Permission[] {
  const userRoles = req.user?.roles || [];
  const explicitPermissions = (req.user?.permissions || []) as Permission[];

  const allPermissions = new Set<Permission>(explicitPermissions);

  userRoles.forEach(role => {
    const perms = ROLE_PERMISSIONS[role as Role] || [];
    perms.forEach(p => allPermissions.add(p));

    const inheritedRoles = ROLE_HIERARCHY[role as Role] || [];
    inheritedRoles.forEach(inheritedRole => {
      const inheritedPerms = ROLE_PERMISSIONS[inheritedRole] || [];
      inheritedPerms.forEach(p => allPermissions.add(p));
    });
  });

  return Array.from(allPermissions);
}
