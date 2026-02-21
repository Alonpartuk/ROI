/**
 * Login Page - Octup HRIS
 *
 * Features:
 * - Octup branded login form
 * - Demo mode with role selection
 * - OAuth integration ready
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Lock, Mail, User, Shield, ChevronRight, AlertCircle } from 'lucide-react';
import { useHRIS } from '../context/HRISContext';

// =============================================================================
// DEMO ROLES
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
  const { login: contextLogin } = useHRIS();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Change password modal state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  // Step 1 = role selection, Step 2 = credentials
  const step = selectedRole ? 2 : 1;

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setError('');
  };

  const handleBackToRoles = () => {
    setSelectedRole(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleChangePassword = () => {
    setChangePasswordError('');
    if (currentPassword !== 'octup2024') {
      setChangePasswordError('Current password is incorrect.');
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('Passwords do not match.');
      return;
    }
    // Save flag and proceed with login
    localStorage.setItem('hris_password_changed', 'true');
    setShowChangePassword(false);
    if (pendingRole) {
      contextLogin(pendingRole as any);
      router.push('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Validate password
      if (password !== 'octup2024') {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Check if first login (password not yet changed)
      const passwordChanged = typeof window !== 'undefined' && localStorage.getItem('hris_password_changed');
      if (!passwordChanged) {
        setPendingRole(selectedRole);
        setShowChangePassword(true);
        setIsLoading(false);
        return;
      }

      // Set user in context and navigate
      contextLogin(selectedRole as any);
      router.push('/');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
                {step === 1 ? 'Select your role to continue' : 'Enter your credentials to sign in'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {step === 1 ? (
              <>
                {/* Step 1: Role Selection */}
                <div className="space-y-3">
                  {DEMO_ROLES.map(role => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.id}
                        onClick={() => handleRoleSelect(role.id)}
                        className={`
                          w-full p-4 rounded-xl border-2 text-left transition-all
                          hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#00CBC0]/50
                          border-slate-200 hover:border-[#00CBC0] hover:bg-[#00CBC0]/5
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
              </>
            ) : (
              <>
                {/* Step 2: Credentials */}
                {/* Selected role badge */}
                <div className="mb-6 flex items-center justify-between p-3 rounded-xl bg-[#00CBC0]/5 border border-[#00CBC0]/20">
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-[#00CBC0]" />
                    <span className="text-sm font-semibold text-slate-800">
                      {DEMO_ROLES.find(r => r.id === selectedRole)?.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToRoles}
                    className="text-xs text-[#809292] hover:text-[#6a7a7a] font-medium"
                  >
                    Change
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50/50
                                 focus:bg-white focus:border-[#809292] focus:ring-2 focus:ring-[#809292]/20 focus:outline-none
                                 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50/50
                                 focus:bg-white focus:border-[#809292] focus:ring-2 focus:ring-[#809292]/20 focus:outline-none
                                 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`
                      w-full h-12 rounded-xl font-semibold text-white
                      bg-gradient-to-r from-[#809292] to-[#00CBC0]
                      hover:opacity-90 transition-opacity
                      focus:outline-none focus:ring-2 focus:ring-[#00CBC0]/50 focus:ring-offset-2
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                <button
                  onClick={handleBackToRoles}
                  className="w-full mt-4 py-3 text-sm text-[#809292] hover:text-[#6a7a7a] font-medium transition-colors"
                >
                  Back to role selection
                </button>
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

      {/* Change Password Modal (first login) */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 z-10">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#809292] to-[#00CBC0] flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Change Your Password</h2>
              <p className="text-sm text-slate-500 mt-2">
                For security, please set a new password on your first login.
              </p>
            </div>

            {changePasswordError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700">
                <AlertCircle size={18} />
                <span className="text-sm">{changePasswordError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50
                             focus:bg-white focus:border-[#809292] focus:ring-2 focus:ring-[#809292]/20 focus:outline-none
                             transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50
                             focus:bg-white focus:border-[#809292] focus:ring-2 focus:ring-[#809292]/20 focus:outline-none
                             transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50
                             focus:bg-white focus:border-[#809292] focus:ring-2 focus:ring-[#809292]/20 focus:outline-none
                             transition-all text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                className="w-full h-12 rounded-xl font-semibold text-white
                         bg-gradient-to-r from-[#809292] to-[#00CBC0]
                         hover:opacity-90 transition-opacity mt-2
                         focus:outline-none focus:ring-2 focus:ring-[#00CBC0]/50 focus:ring-offset-2"
              >
                Set New Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
