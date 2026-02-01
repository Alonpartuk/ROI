import React, { useState } from 'react';
import { Card, Title, Text, TextInput, Callout } from '@tremor/react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import OctupLogo from './OctupLogo';

/**
 * LoginPage Component
 * Authentication page for the Octup Dashboard
 * Updated with Octup brand colors
 */
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simulate slight delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen login-bg-premium bg-premium-pattern flex items-center justify-center p-4 sm:p-8">
      {/* Premium Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-[#00CBC0]/8 rounded-full blur-[100px]" />
        <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-[#809292]/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF3489]/3 rounded-full blur-[120px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(128,146,146,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(128,146,146,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <Card className="max-w-lg w-full relative bg-white/90 backdrop-blur-2xl border border-white/60 shadow-soft-xl rounded-3xl mx-4 sm:mx-0 p-8 sm:p-12">
        {/* Logo and Title - Premium sizing */}
        <div className="text-center mb-10 sm:mb-12">
          {/* Octup Partner Logo */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <OctupLogo variant="full" size="xl" animate={true} />
          </div>

          <Title className="text-2xl sm:text-4xl font-bold text-[#809292] tracking-tight">
            Sales Dashboard
          </Title>
          <Text className="text-slate-500 mt-3 sm:mt-4 text-base sm:text-lg">
            Sign in to access your pipeline analytics
          </Text>
        </div>

        {/* Login Form - Premium spacing */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <Callout
              title="Authentication Failed"
              icon={ExclamationCircleIcon}
              color="rose"
              className="bg-[#FF3489]/10 border-[#FF3489]/30 rounded-2xl"
            >
              {error}
            </Callout>
          )}

          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Email Address
            </label>
            <TextInput
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              className="focus:ring-[#809292] focus:border-[#809292] rounded-xl h-12"
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Password
            </label>
            <TextInput
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="focus:ring-[#809292] focus:border-[#809292] rounded-xl h-12"
            />
          </div>

          {/* Submit Button - Premium Octup branded */}
          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="w-full py-4 px-6 rounded-2xl font-semibold text-white text-lg transition-all duration-300
              bg-gradient-to-r from-[#809292] to-[#00CBC0]
              hover:from-[#6a7a7a] hover:to-[#00a89e]
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-soft-lg hover:shadow-soft-xl
              active:scale-[0.98] mt-8"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer - Premium styling */}
        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
          <Text className="text-sm text-slate-400 font-medium">
            Octup Sales Intelligence Platform
          </Text>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs text-slate-300">Powered by</span>
            <span className="text-sm font-semibold bg-gradient-to-r from-[#809292] to-[#00CBC0] bg-clip-text text-transparent">
              BigQuery & Gemini AI
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
