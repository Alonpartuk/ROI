/**
 * JWT Authentication Middleware
 * Validates JWT tokens and sets user context for RLS
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// =============================================================================
// TYPES
// =============================================================================

export interface JWTPayload {
  sub: string; // Employee ID
  email: string;
  name: string;
  roles: string[];
  permissions?: string[];
  iat: number;
  exp: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'octup-hris';

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Validates JWT token and populates req.user
 * CRITICAL: No API call should proceed without a valid token
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health checks
  if (req.path === '/health' || req.path === '/health/ready') {
    return next();
  }

  // In development without JWT_SECRET, allow bypass with warning
  if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[AUTH] CRITICAL: JWT_SECRET not configured in production');
      return res.status(500).json({
        error: 'Server configuration error',
        code: 'AUTH_CONFIG_ERROR',
      });
    }

    console.warn('[AUTH] WARNING: JWT_SECRET not set - using development bypass');
    // Set default dev user
    req.user = {
      employeeId: 'dev-user',
      roles: ['hr_admin', 'finance'],
      permissions: ['*'],
      email: 'dev@octup.io',
      name: 'Development User',
    };
    return next();
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_TOKEN',
      message: 'Please provide a valid JWT token in the Authorization header',
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    }) as JWTPayload;

    // Populate req.user with decoded token data
    req.user = {
      id: decoded.sub,
      employeeId: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again.',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        message: 'The provided token is invalid.',
      });
    }

    console.error('[AUTH] Token verification error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

// =============================================================================
// RLS CONTEXT MIDDLEWARE
// =============================================================================

/**
 * Sets PostgreSQL session context for Row Level Security
 * CRITICAL: Every query must have proper RLS context
 */
export function createRLSMiddleware(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip for health checks
    if (req.path === '/health' || req.path === '/health/ready') {
      return next();
    }

    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      console.warn('[RLS] No employee ID in request - RLS will use default restrictions');
      return next();
    }

    // Store the pool reference on the request for later use
    (req as any).dbPool = pool;

    // Create a helper function to execute queries with RLS context
    (req as any).queryWithRLS = async (text: string, params?: any[]) => {
      const client = await pool.connect();
      try {
        // Set RLS context for this connection
        await client.query(`SET LOCAL app.current_employee_id = $1`, [employeeId]);

        // Determine the appropriate role based on user roles
        const roles = req.user?.roles || [];
        let dbRole = 'employee_role'; // Default

        if (roles.includes('hr_admin')) {
          dbRole = 'hr_role';
        } else if (roles.includes('finance')) {
          dbRole = 'finance_role';
        } else if (roles.includes('manager')) {
          dbRole = 'manager_role';
        }

        await client.query(`SET LOCAL ROLE ${dbRole}`);

        // Execute the actual query
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    };

    next();
  };
}

// =============================================================================
// HELPER: Generate JWT Token (for testing/development)
// =============================================================================

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, JWT_SECRET, {
    issuer: JWT_ISSUER,
    expiresIn: '8h',
  });
}
