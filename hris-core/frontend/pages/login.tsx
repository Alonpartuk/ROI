/**
 * Login Page - Octup HRIS
 *
 * Features:
 * - Google OAuth sign-in (production)
 * - Demo mode with role selection (when GOOGLE_CLIENT_ID not set)
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Shield, User, ChevronRight, AlertCircle } from 'lucide-react';
import { useHRIS } from '../context/HRISContext';

// =============================================================================
// CONFIGURATION
// =============================================================================

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const isDemoMode = !GOOGLE_CLIENT_ID;

// =============================================================================
// DEMO ROLES (only used when Google OAuth is not configured)
// =============================================================================

const DEMO_ROLES = [
  {
    id: 'hr_admin',
    label: 'HR Admin',
    description: 'Full access to all employee data, compensation, and equity',
    icon: Shield,
    color: 'bg-[#00CBC0]/10 text-[#00CBC0] border-[#00CBC0]/20',
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Access to compensation and burn rate data',
    icon: User,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Limited access to team members only',
    icon: User,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    id: 'employee',
    label: 'Employee',
    description: 'View own profile and public directory',
    icon: User,
    color: 'bg-slate-100 text-slate-600 border-slate-200',
  },
];

// =============================================================================
// LOGIN PAGE
// =============================================================================

export default function LoginPage() {
  const router = useRouter();
  const { login: contextLogin, loginWithGoogle } = useHRIS();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Google OAuth handler
  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError('Google sign-in failed. No credential received.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginWithGoogle({ credential: response.credential });
      router.push('/');
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  // Demo mode handler
  const handleDemoLogin = (roleId: string) => {
    setIsLoading(true);
    contextLogin(roleId as any);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7] flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full"
               style={{
                 backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)',
                 backgroundSize: '40px 40px',
               }}
          />
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#00CBC0]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#FF3489]/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#809292] to-[#00CBC0] flex items-center justify-center">
              <span className="text-white font-bold text-2xl">O</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Octup HRIS</h1>
              <p className="text-slate-400">Human Resources Platform</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">
              Manage your workforce with confidence
            </h2>
            <p className="text-lg text-slate-300">
              Track employees, assets, compensation, and equity all in one place.
            </p>

            <div className="space-y-4 pt-4">
              {[
                'Complete employee directory',
                'Compensation & equity tracking',
                'Burn rate analytics',
                'Role-based access control',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#00CBC0]/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#00CBC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#809292] to-[#00CBC0] flex items-center justify-center">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Octup HRIS</h1>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
              <p className="text-slate-500 mt-2">
                {isDemoMode ? 'Select your role to continue' : 'Sign in with your Octup account'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Loading overlay */}
            {isLoading && (
              <div className="mb-6 flex items-center justify-center gap-3 p-4">
                <div className="w-5 h-5 border-2 border-[#00CBC0] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-500">Signing in...</span>
              </div>
            )}

            {isDemoMode ? (
              <>
                {/* Demo Mode: Role Selection */}
                <div className="space-y-3">
                  {DEMO_ROLES.map(role => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.id}
                        onClick={() => handleDemoLogin(role.id)}
                        disabled={isLoading}
                        className={`
                          w-full p-4 rounded-xl border-2 text-left transition-all
                          hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#00CBC0]/50
                          border-slate-200 hover:border-[#00CBC0] hover:bg-[#00CBC0]/5
                          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl border ${role.color}`}>
                            <Icon size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{role.label}</p>
                            <p className="text-sm text-slate-500">{role.description}</p>
                          </div>
                          <ChevronRight size={20} className="text-slate-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs text-center text-slate-400">
                    Demo mode — Google OAuth not configured
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Production Mode: Google OAuth */}
                <div className="flex flex-col items-center gap-6">
                  <div className="w-full flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      size="large"
                      width="360"
                      text="signin_with"
                      shape="rectangular"
                      theme="outline"
                    />
                  </div>

                  <div className="w-full pt-4 border-t border-slate-100">
                    <p className="text-xs text-center text-slate-400">
                      Only @octup.com accounts are allowed
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-6">
            By signing in, you agree to our{' '}
            <a href="#" className="text-[#809292] hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-[#809292] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
