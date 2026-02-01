import React, { useState } from 'react';
import { Card, Title, Text, TextInput, Callout } from '@tremor/react';
import {
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import OctupLogo from './OctupLogo';

const API_BASE = process.env.REACT_APP_API_URL || '';

/**
 * ChangePassword Component
 * First-login password change screen
 * Users with needs_password_change=true are forced here
 */
const ChangePassword = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, completePasswordChange } = useAuth();

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      // Update auth context to reflect password changed
      if (completePasswordChange) {
        completePasswordChange();
      }

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen login-bg-premium bg-premium-pattern flex items-center justify-center p-4 sm:p-8">
      {/* Premium Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-[#00CBC0]/8 rounded-full blur-[100px]" />
        <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-[#809292]/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF3489]/3 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(128,146,146,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(128,146,146,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <Card className="max-w-lg w-full relative bg-white/90 backdrop-blur-2xl border border-white/60 shadow-soft-xl rounded-3xl mx-4 sm:mx-0 p-8 sm:p-12">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <OctupLogo variant="full" size="lg" />
          </div>
          <Title className="text-2xl sm:text-3xl font-bold text-[#809292]">
            Change Your Password
          </Title>
          <Text className="text-slate-500 mt-3">
            Please set a new private password to continue
          </Text>
        </div>

        {/* Info Callout */}
        <Callout
          title="First Login"
          icon={CheckCircleIcon}
          color="blue"
          className="mb-6 bg-[#00CBC0]/10 border-[#00CBC0]/30"
        >
          You're using a temporary password. Please create your own secure password to access the dashboard.
        </Callout>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <Callout
              title="Error"
              icon={ExclamationCircleIcon}
              color="rose"
              className="bg-[#FF3489]/10 border-[#FF3489]/30"
            >
              {error}
            </Callout>
          )}

          {/* New Password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              New Password
            </label>
            <TextInput
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="focus:ring-[#00CBC0] focus:border-[#00CBC0] rounded-xl h-12"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Confirm Password
            </label>
            <TextInput
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="focus:ring-[#00CBC0] focus:border-[#00CBC0] rounded-xl h-12"
            />
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 rounded-xl p-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Password must contain:
            </Text>
            <ul className="space-y-1 text-sm text-gray-500">
              <li className={newPassword.length >= 8 ? 'text-emerald-600' : ''}>
                • At least 8 characters
              </li>
              <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-600' : ''}>
                • One uppercase letter
              </li>
              <li className={/[a-z]/.test(newPassword) ? 'text-emerald-600' : ''}>
                • One lowercase letter
              </li>
              <li className={/[0-9]/.test(newPassword) ? 'text-emerald-600' : ''}>
                • One number
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !newPassword || !confirmPassword}
            className="w-full py-4 px-6 rounded-2xl font-semibold text-white text-lg transition-all duration-300
              bg-gradient-to-r from-[#809292] to-[#00CBC0]
              hover:from-[#6a7a7a] hover:to-[#00a89e]
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-soft-lg hover:shadow-soft-xl
              active:scale-[0.98] mt-4"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating Password...
              </span>
            ) : (
              'Set New Password'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <Text className="text-sm text-slate-400">
            Logged in as <span className="font-medium text-slate-600">{user?.email}</span>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default ChangePassword;
