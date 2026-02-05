/**
 * Middleware Exports
 */

export {
  authenticateJWT,
  createRLSMiddleware,
  generateToken,
  type JWTPayload,
} from './auth.middleware';

export {
  requireRole,
  requirePermission,
  requireSelfOrRole,
  hasRole,
  hasPermission,
  getUserPermissions,
  type Role,
  type Permission,
} from './rbac.middleware';
