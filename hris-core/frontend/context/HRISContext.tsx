/**
 * HRIS Global Context
 * Provides global state management for the HR Dashboard
 * Fetches data from the HRIS API with PII masking
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Employee,
  Asset,
  DashboardKPIs,
  BurnRateByLocation,
  CliffAlert,
  Alert,
  OnboardingProgress,
  Currency,
} from '../types';
import { createMaskingContext, UserRole } from '../utils/privacy';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hris-api-666004421830.me-west1.run.app';

// ============================================================================
// EXCHANGE RATES (used for currency conversion display)
// ============================================================================

const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,
  ILS: 0.27,
  CAD: 0.74,
};

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface UserInfo {
  employeeId: string;
  email: string;
  name: string;
  roles: UserRole[];
}

interface HRISContextType {
  // User Info
  user: UserInfo | null;
  isAuthenticated: boolean;

  // Data
  employees: Employee[];
  assets: Asset[];
  kpis: DashboardKPIs;
  burnRate: BurnRateByLocation[];
  cliffAlerts: CliffAlert[];
  alerts: Alert[];
  onboardingProgress: OnboardingProgress[];

  // UI State
  selectedEmployee: Employee | null;
  setSelectedEmployee: (employee: Employee | null) => void;
  isEmployeePanelOpen: boolean;
  setEmployeePanelOpen: (open: boolean) => void;

  // Currency
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => void;
  convertToDisplayCurrency: (amount: number, fromCurrency: Currency) => number;

  // Loading State
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshData: () => Promise<void>;

  // PII Masking
  maskPII: ReturnType<typeof createMaskingContext>;
}

const HRISContext = createContext<HRISContextType | undefined>(undefined);

// ============================================================================
// API FETCH HELPER
// ============================================================================

async function fetchAPI<T>(endpoint: string, token?: string): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Authentication required' };
      }
      if (response.status === 403) {
        return { success: false, error: 'Access denied' };
      }
      return { success: false, error: `API Error: ${response.status}` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[API] Fetch error:', error);
    return { success: false, error: 'Network error - please try again' };
  }
}

// ============================================================================
// MOCK DATA (Fallback when API is unavailable)
// ============================================================================

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp_001',
    employeeNumber: 'EMP001',
    displayName: 'Dave Chen',
    firstName: 'David',
    lastName: 'Chen',
    workEmail: 'david.chen@techstartup.com',
    phone: '+1-416-555-0101',
    avatarUrl: null,
    dateOfBirth: '1985-03-15',
    originalHireDate: '2022-01-01',
    currentStatus: 'active',
    jobTitle: 'Chief Executive Officer',
    jobLevel: 'Executive',
    department: 'Operations',
    location: 'TOR',
    locationName: 'Toronto Office',
    managerId: null,
    managerName: null,
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 2, months: 1, totalDays: 766, isAnniversaryThisMonth: true, nextAnniversaryDate: '2025-01-01' },
  },
  {
    id: 'emp_002',
    employeeNumber: 'EMP002',
    displayName: 'Yael Levi',
    firstName: 'Yael',
    lastName: 'Levi',
    workEmail: 'yael.levi@techstartup.com',
    phone: '+972-54-555-0102',
    avatarUrl: null,
    dateOfBirth: '1987-07-22',
    originalHireDate: '2022-01-01',
    currentStatus: 'active',
    jobTitle: 'Chief Technology Officer',
    jobLevel: 'Executive',
    department: 'Engineering',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Dave Chen',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 2, months: 1, totalDays: 766, isAnniversaryThisMonth: true, nextAnniversaryDate: '2025-01-01' },
  },
  {
    id: 'emp_003',
    employeeNumber: 'EMP003',
    displayName: 'Omer Katz',
    firstName: 'Omer',
    lastName: 'Katz',
    workEmail: 'omer.katz@techstartup.com',
    phone: '+972-52-555-0103',
    avatarUrl: null,
    dateOfBirth: '1989-11-08',
    originalHireDate: '2022-06-01',
    currentStatus: 'active',
    jobTitle: 'VP of Engineering',
    jobLevel: 'VP',
    department: 'Engineering',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_002',
    managerName: 'Yael Levi',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 1, months: 8, totalDays: 615, isAnniversaryThisMonth: false, nextAnniversaryDate: '2025-06-01' },
  },
  {
    id: 'emp_004',
    employeeNumber: 'EMP004',
    displayName: 'Noa Cohen',
    firstName: 'Noa',
    lastName: 'Cohen',
    workEmail: 'noa.cohen@techstartup.com',
    phone: '+972-54-555-0104',
    avatarUrl: null,
    dateOfBirth: '1991-04-20',
    originalHireDate: '2022-09-01',
    currentStatus: 'active',
    jobTitle: 'Engineering Manager',
    jobLevel: 'Manager',
    department: 'Engineering',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_003',
    managerName: 'Omer Katz',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 1, months: 5, totalDays: 523, isAnniversaryThisMonth: false, nextAnniversaryDate: '2025-09-01' },
  },
  {
    id: 'emp_023',
    employeeNumber: 'EMP023',
    displayName: 'Liora Fischer',
    firstName: 'Liora',
    lastName: 'Fischer',
    workEmail: 'liora.fischer@techstartup.com',
    phone: '+972-54-555-0123',
    avatarUrl: null,
    dateOfBirth: '1996-07-19',
    originalHireDate: '2023-10-15',
    currentStatus: 'active',
    jobTitle: 'Backend Engineer',
    jobLevel: 'Mid-Level',
    department: 'Engineering',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_004',
    managerName: 'Noa Cohen',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 4, totalDays: 108, isAnniversaryThisMonth: false, nextAnniversaryDate: '2024-10-15' },
  },
];

const MOCK_ASSETS: Asset[] = [
  {
    id: 'asset_001',
    assetTag: 'LAP-TLV-001',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 14" M3',
    serialNumber: 'C02XG123HASH',
    purchaseDate: '2023-06-15',
    purchasePrice: 2499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_002',
    assignedToName: 'Yael Levi',
    assignedDate: '2023-06-20',
    locationCode: 'TLV',
    notes: null,
    warrantyExpiry: '2026-06-15',
  },
];

const MOCK_BURN_RATE: BurnRateByLocation[] = [
  { locationCode: 'TLV', locationName: 'Tel Aviv', headcount: 14, monthlySalaryUsd: 125000, monthlyBenefitsUsd: 31250, monthlyTotalUsd: 156250 },
  { locationCode: 'TOR', locationName: 'Toronto', headcount: 9, monthlySalaryUsd: 98000, monthlyBenefitsUsd: 19600, monthlyTotalUsd: 117600 },
  { locationCode: 'US', locationName: 'United States', headcount: 7, monthlySalaryUsd: 85000, monthlyBenefitsUsd: 21250, monthlyTotalUsd: 106250 },
];

const MOCK_CLIFF_ALERTS: CliffAlert[] = [
  {
    employeeId: 'emp_023',
    employeeName: 'Liora Fischer',
    employeeNumber: 'EMP023',
    grantNumber: 'GRANT-023',
    cliffDate: '2024-10-15',
    cliffShares: 7500,
    daysUntilCliff: 60,
    alertLevel: 'medium',
    department: 'Engineering',
    locationCode: 'TLV',
  },
];

const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert_1',
    type: 'anniversary',
    title: 'Work Anniversary',
    description: 'Dave Chen is celebrating 2 years today!',
    employeeId: 'emp_001',
    employeeName: 'Dave Chen',
    date: new Date().toISOString(),
    priority: 'medium',
    actionUrl: '/employees/emp_001',
  },
  {
    id: 'alert_2',
    type: 'cliff',
    title: 'Upcoming Cliff',
    description: 'Kevin O\'Brien\'s 1-year cliff is on November 1st',
    employeeId: 'emp_024',
    employeeName: 'Kevin O\'Brien',
    date: '2024-11-01',
    priority: 'high',
    actionUrl: '/employees/emp_024',
  },
];

const MOCK_ONBOARDING: OnboardingProgress[] = [
  {
    employeeId: 'emp_023',
    employeeName: 'Liora Fischer',
    startDate: '2023-10-15',
    totalTasks: 12,
    completedTasks: 7,
    overdueTasks: 2,
    completionPercentage: 58,
  },
];

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface HRISProviderProps {
  children: ReactNode;
}

export function HRISProvider({ children }: HRISProviderProps) {
  // User state (would come from auth system in production)
  const [user] = useState<UserInfo | null>({
    employeeId: 'dev-user',
    email: 'admin@octup.io',
    name: 'HR Admin',
    roles: ['hr_admin'], // Default to HR admin for demo
  });

  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [burnRate, setBurnRate] = useState<BurnRateByLocation[]>([]);
  const [cliffAlerts, setCliffAlerts] = useState<CliffAlert[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress[]>(MOCK_ONBOARDING);
  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalHeadcount: 0,
    monthlyBurnRateUsd: 0,
    activeOnboarding: 0,
    upcomingCliffs: 0,
  });

  // UI State
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEmployeePanelOpen, setEmployeePanelOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create PII masking context based on user roles
  const maskPII = createMaskingContext(user?.roles || ['employee']);

  // Currency conversion
  const convertToDisplayCurrency = useCallback((amount: number, fromCurrency: Currency): number => {
    const amountInUsd = amount * EXCHANGE_RATES[fromCurrency];
    return amountInUsd / EXCHANGE_RATES[displayCurrency];
  }, [displayCurrency]);

  // Transform API employee data to frontend format
  const transformEmployee = useCallback((apiEmployee: any): Employee => {
    const hireDate = new Date(apiEmployee.original_hire_date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - hireDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);

    return {
      id: apiEmployee.id,
      employeeNumber: apiEmployee.employee_number,
      displayName: apiEmployee.display_name,
      firstName: apiEmployee.first_name,
      lastName: apiEmployee.last_name,
      workEmail: apiEmployee.work_email,
      phone: apiEmployee.phone,
      avatarUrl: null,
      dateOfBirth: apiEmployee.date_of_birth,
      originalHireDate: apiEmployee.original_hire_date,
      currentStatus: apiEmployee.current_status,
      jobTitle: apiEmployee.job_title || 'Not Set',
      jobLevel: apiEmployee.job_level || 'Not Set',
      department: apiEmployee.department || 'Not Set',
      location: apiEmployee.location_code,
      locationName: apiEmployee.location_name || apiEmployee.location_code,
      managerId: apiEmployee.manager_id,
      managerName: apiEmployee.manager_name,
      employmentType: apiEmployee.employment_type,
      workModel: apiEmployee.work_model,
      tenure: {
        years,
        months,
        totalDays: diffDays,
        isAnniversaryThisMonth: hireDate.getMonth() === now.getMonth(),
        nextAnniversaryDate: new Date(now.getFullYear() + 1, hireDate.getMonth(), hireDate.getDate()).toISOString().split('T')[0],
      },
    };
  }, []);

  // Fetch all data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch employees
      const employeesResult = await fetchAPI<any[]>('/api/employees');
      if (employeesResult.success && employeesResult.data) {
        const transformedEmployees = employeesResult.data.map(transformEmployee);
        setEmployees(transformedEmployees);
      } else {
        console.warn('[HRIS] Using mock employee data');
        setEmployees(MOCK_EMPLOYEES);
      }

      // Fetch dashboard KPIs
      const kpisResult = await fetchAPI<any>('/api/analytics/dashboard');
      if (kpisResult.success && kpisResult.data) {
        setKpis({
          totalHeadcount: kpisResult.data.totalHeadcount || 0,
          monthlyBurnRateUsd: kpisResult.data.monthlyBurnRateUsd || 0,
          activeOnboarding: kpisResult.data.activeOnboarding || 0,
          upcomingCliffs: kpisResult.data.upcomingCliffs || 0,
        });
      } else {
        // Calculate from burn rate if KPIs endpoint fails
        setKpis({
          totalHeadcount: MOCK_BURN_RATE.reduce((sum, loc) => sum + loc.headcount, 0),
          monthlyBurnRateUsd: MOCK_BURN_RATE.reduce((sum, loc) => sum + loc.monthlyTotalUsd, 0),
          activeOnboarding: MOCK_ONBOARDING.filter(p => p.completionPercentage < 100).length,
          upcomingCliffs: MOCK_CLIFF_ALERTS.length,
        });
      }

      // Fetch burn rate (requires hr_admin or finance role)
      if (user?.roles.includes('hr_admin') || user?.roles.includes('finance')) {
        const burnRateResult = await fetchAPI<any>('/api/analytics/burn-rate');
        if (burnRateResult.success && burnRateResult.data?.byLocation) {
          setBurnRate(burnRateResult.data.byLocation.map((loc: any) => ({
            locationCode: loc.locationCode,
            locationName: loc.locationName,
            headcount: loc.headcount,
            monthlySalaryUsd: loc.monthlySalaryUsd,
            monthlyBenefitsUsd: loc.monthlyBenefitsUsd,
            monthlyTotalUsd: loc.monthlyTotalUsd,
          })));
        } else {
          setBurnRate(MOCK_BURN_RATE);
        }

        // Fetch cliff alerts
        const cliffsResult = await fetchAPI<any>('/api/analytics/cliff-alerts');
        if (cliffsResult.success && cliffsResult.data) {
          setCliffAlerts(cliffsResult.data);
        } else {
          setCliffAlerts(MOCK_CLIFF_ALERTS);
        }
      } else {
        // Non-privileged users get limited burn rate info
        setBurnRate(MOCK_BURN_RATE);
        setCliffAlerts([]);
      }
    } catch (err) {
      console.error('[HRIS] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');

      // Fall back to mock data
      setEmployees(MOCK_EMPLOYEES);
      setBurnRate(MOCK_BURN_RATE);
      setCliffAlerts(MOCK_CLIFF_ALERTS);
      setKpis({
        totalHeadcount: 30,
        monthlyBurnRateUsd: 380100,
        activeOnboarding: 2,
        upcomingCliffs: 2,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, transformEmployee]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Open panel when employee selected
  useEffect(() => {
    if (selectedEmployee) {
      setEmployeePanelOpen(true);
    }
  }, [selectedEmployee]);

  const value: HRISContextType = {
    user,
    isAuthenticated: !!user,
    employees,
    assets,
    kpis,
    burnRate,
    cliffAlerts,
    alerts,
    onboardingProgress,
    selectedEmployee,
    setSelectedEmployee,
    isEmployeePanelOpen,
    setEmployeePanelOpen,
    displayCurrency,
    setDisplayCurrency,
    convertToDisplayCurrency,
    isLoading,
    error,
    refreshData,
    maskPII,
  };

  return <HRISContext.Provider value={value}>{children}</HRISContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useHRIS() {
  const context = useContext(HRISContext);
  if (context === undefined) {
    throw new Error('useHRIS must be used within a HRISProvider');
  }
  return context;
}
