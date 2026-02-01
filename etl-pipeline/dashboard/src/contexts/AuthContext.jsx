import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';
const AUTH_STORAGE_KEY = 'octup_dashboard_auth';
const ADMIN_EMAIL = 'alon@octup.com';

// Fallback users for when API is unavailable (during initial deployment)
const FALLBACK_USERS = [
  { email: 'alon@octup.com', password: 'Alon@2026', name: 'Alon' },
  { email: 'hagai@octup.com', password: 'Hagai@2026', name: 'Hagai' },
  { email: 'dror@octup.com', password: 'Dror@2026', name: 'Dror' },
];

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        // Verify the session is still valid (check expiry)
        if (authData.expiresAt && new Date(authData.expiresAt) > new Date()) {
          setUser(authData.user);
          setNeedsPasswordChange(authData.user?.needsPasswordChange || false);
        } else {
          // Session expired, clear it
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  /**
   * Authenticate via API, with fallback to local credentials
   */
  const login = async (email, password) => {
    try {
      // Try API authentication first
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const userData = {
            email: data.user.email,
            name: data.user.name,
            needsPasswordChange: data.user.needsPasswordChange,
            isAdmin: data.user.isAdmin,
            loginAt: new Date().toISOString(),
          };

          // Set expiry for 7 days
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const authData = {
            user: userData,
            expiresAt: expiresAt.toISOString(),
            version: 2,
          };

          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
          setUser(userData);
          setNeedsPasswordChange(userData.needsPasswordChange);

          return { success: true };
        }
        return { success: false, error: data.error || 'Login failed' };
      }

      // If API returns 401, credentials are wrong
      if (response.status === 401) {
        const data = await response.json();
        return { success: false, error: data.error || 'Invalid email or password' };
      }

      // For other errors, try fallback
      throw new Error('API unavailable');
    } catch (err) {
      console.warn('API login failed, trying fallback:', err.message);

      // Fallback to local authentication
      const validUser = FALLBACK_USERS.find(
        (u) =>
          u.email.toLowerCase() === email.toLowerCase() &&
          u.password === password
      );

      if (validUser) {
        const userData = {
          email: validUser.email.toLowerCase(),
          name: validUser.name,
          needsPasswordChange: false,
          isAdmin: validUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
          loginAt: new Date().toISOString(),
        };

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const authData = {
          user: userData,
          expiresAt: expiresAt.toISOString(),
          version: 2,
        };

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        setUser(userData);
        setNeedsPasswordChange(false);

        return { success: true };
      }

      return { success: false, error: 'Invalid email or password' };
    }
  };

  /**
   * Complete password change - update local state
   */
  const completePasswordChange = () => {
    setNeedsPasswordChange(false);

    // Update stored user data
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        authData.user.needsPasswordChange = false;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        setUser(authData.user);
      } catch (e) {
        // Ignore
      }
    }
  };

  /**
   * Logout - clear session
   */
  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setNeedsPasswordChange(false);
  };

  /**
   * Check if current user is admin
   */
  const isAdmin = () => {
    return user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    needsPasswordChange,
    login,
    logout,
    completePasswordChange,
    isAdmin,
    ADMIN_EMAIL,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
