/**
 * Auth Guard Component
 *
 * Protects routes by checking authentication status.
 * Redirects to login page if not authenticated.
 */

import React, { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useHRIS } from '../../context/HRISContext';

// =============================================================================
// LOADING SPINNER
// =============================================================================

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#809292] to-[#00CBC0] flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">O</span>
        </div>

        {/* Loading spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-200 rounded-full mx-auto" />
          <div className="w-12 h-12 border-4 border-[#00CBC0] border-t-transparent rounded-full mx-auto absolute top-0 left-1/2 -translate-x-1/2 animate-spin" />
        </div>

        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

// =============================================================================
// AUTH GUARD COMPONENT
// =============================================================================

interface AuthGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useHRIS();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip auth check on login page
    if (router.pathname === '/login') {
      setIsChecking(false);
      return;
    }

    // Wait for initial auth state
    if (isLoading) {
      return;
    }

    // Check authentication
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Check required roles if specified
    if (requiredRoles && requiredRoles.length > 0 && user) {
      const hasRequiredRole = requiredRoles.some(role =>
        user.roles.includes(role as any)
      );

      if (!hasRequiredRole) {
        router.replace('/unauthorized');
        return;
      }
    }

    setIsChecking(false);
  }, [isAuthenticated, isLoading, router, requiredRoles, user]);

  // Show loading while checking auth
  if (isChecking || isLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated - don't render children (redirect will happen)
  if (!isAuthenticated && router.pathname !== '/login') {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export default AuthGuard;
