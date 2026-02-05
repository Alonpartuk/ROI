/**
 * Express Request type augmentation
 * Extends Express Request with authentication properties
 */

declare global {
  namespace Express {
    interface Request {
      user: {
        id?: string;
        employeeId: string;
        roles: string[];
        permissions?: string[];
        email?: string;
        name?: string;
      };
      permissions: unknown;
    }
  }
}

export {};
