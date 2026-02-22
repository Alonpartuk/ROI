/**
 * HRIS Global Context
 * Provides global state management for the HR Dashboard
 * Fetches data from the HRIS API with PII masking
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  Employee,
  Asset,
  DashboardKPIs,
  BurnRateByLocation,
  CliffAlert,
  Alert,
  OnboardingProgress,
  Currency,
  EquityGrant,
  Document,
  PerformanceReview,
  OKR,
  SalaryRecord,
  OnboardingTask,
  OnboardingStage,
} from '../types';
import { createMaskingContext, UserRole } from '../utils/privacy';

// ============================================================================
// ONBOARDING TEMPLATE TYPE
// ============================================================================

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  tasks: Array<{ name: string; stage: OnboardingStage; category: string; priority: OnboardingTask['priority'] }>;
}

// ============================================================================
// ROLE PERMISSION TYPE
// ============================================================================

export interface RolePermissions {
  canViewSalary: boolean;
  canEditEquity: boolean;
  canViewReports: boolean;
  canManageEmployees: boolean;
  canManageAssets: boolean;
  canManageOnboarding: boolean;
}

export type RoleDefinition = {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissions;
};

// ============================================================================
// API CONFIGURATION
// ============================================================================

// Offline mode: skip external API calls, use mock data only
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// ============================================================================
// EXCHANGE RATES (used for currency conversion display)
// ============================================================================

const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,
  ILS: 0.27,
  CAD: 0.74,
};

// ============================================================================
// EQUITY CONSTANTS & VESTING CALCULATION
// ============================================================================

const CURRENT_STOCK_PRICE = 0.50; // USD per share

export interface VestingResult {
  sharesVested: number;
  sharesUnvested: number;
  vestingProgress: number;
  nextVestingDate: string | null;
  nextVestingShares: number | null;
  vestedValue: number;
  unvestedValue: number;
}

function monthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function calculateVesting(
  grant: EquityGrant,
  currentDate: Date = new Date(),
  stockPrice: number = CURRENT_STOCK_PRICE
): VestingResult {
  const vestStart = new Date(grant.vestingStartDate);
  const elapsed = Math.max(0, monthsBetween(vestStart, currentDate));
  const clamped = Math.min(elapsed, grant.totalVestingMonths);

  let sharesVested = 0;
  let nextVestingDate: string | null = null;
  let nextVestingShares: number | null = null;

  if (grant.vestingType === 'cliff_then_linear') {
    // Standard 4-year vesting: 1-year cliff (25%), then annual 25% steps
    const cliffMonths = grant.cliffMonths ?? 12;
    const totalYears = Math.max(1, Math.round(grant.totalVestingMonths / 12));
    const annualShares = Math.floor(grant.sharesGranted / totalYears);

    if (clamped < cliffMonths) {
      // Pre-cliff: nothing vested
      sharesVested = 0;
      nextVestingDate = addMonths(vestStart, cliffMonths).toISOString().split('T')[0];
      nextVestingShares = annualShares;
    } else if (clamped >= grant.totalVestingMonths) {
      sharesVested = grant.sharesGranted;
    } else {
      // Post-cliff: annual step vesting (25% per year for 4-year schedule)
      const completedYears = Math.floor(clamped / 12);
      sharesVested = Math.min(completedYears * annualShares, grant.sharesGranted);
      const nextYearMonth = (completedYears + 1) * 12;
      if (nextYearMonth <= grant.totalVestingMonths) {
        nextVestingDate = addMonths(vestStart, nextYearMonth).toISOString().split('T')[0];
        const remaining = grant.sharesGranted - sharesVested - grant.sharesExercised;
        nextVestingShares = nextYearMonth >= grant.totalVestingMonths ? remaining : annualShares;
      }
    }
  } else if (grant.vestingType === 'linear') {
    const monthlyShares = Math.floor(grant.sharesGranted / grant.totalVestingMonths);
    if (clamped >= grant.totalVestingMonths) {
      sharesVested = grant.sharesGranted;
    } else {
      sharesVested = clamped * monthlyShares;
      const nextMonth = clamped + 1;
      if (nextMonth <= grant.totalVestingMonths) {
        nextVestingDate = addMonths(vestStart, nextMonth).toISOString().split('T')[0];
        nextVestingShares = nextMonth >= grant.totalVestingMonths
          ? grant.sharesGranted - sharesVested - grant.sharesExercised
          : monthlyShares;
      }
    }
  } else {
    // milestone: treat as linear for mock purposes
    const monthlyShares = Math.floor(grant.sharesGranted / grant.totalVestingMonths);
    sharesVested = clamped >= grant.totalVestingMonths ? grant.sharesGranted : clamped * monthlyShares;
  }

  sharesVested = Math.min(sharesVested, grant.sharesGranted);
  const sharesUnvested = grant.sharesGranted - sharesVested - grant.sharesExercised;
  const vestingProgress = grant.sharesGranted > 0 ? Math.floor((sharesVested / grant.sharesGranted) * 100) : 0;
  const priceGain = Math.max(0, stockPrice - (grant.exercisePrice ?? 0));
  const vestedValue = sharesVested * priceGain;
  const unvestedValue = Math.max(0, sharesUnvested) * priceGain;

  return { sharesVested, sharesUnvested, vestingProgress, nextVestingDate, nextVestingShares, vestedValue, unvestedValue };
}

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface UserInfo {
  employeeId: string;
  email: string;
  name: string;
  roles: UserRole[];
  token?: string;
}

// Search result types
interface SearchResult {
  type: 'employee' | 'asset';
  id: string;
  title: string;
  subtitle: string;
  data: Employee | Asset;
}

interface HRISContextType {
  // User Info
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (role: UserRole) => void;
  loginWithGoogle: (googleResponse: { credential: string }) => Promise<void>;
  setUserRole: (role: UserRole) => void;
  logout: () => void;

  // Data
  employees: Employee[];
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  assets: Asset[];
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  kpis: DashboardKPIs;
  burnRate: BurnRateByLocation[];
  cliffAlerts: CliffAlert[];
  alerts: Alert[];
  onboardingProgress: OnboardingProgress[];
  onboardingTasks: Record<string, OnboardingTask[]>;
  onboardingTemplates: OnboardingTemplate[];
  addOnboardingTemplate: (template: OnboardingTemplate) => void;
  updateOnboardingTemplate: (id: string, updates: Partial<OnboardingTemplate>) => void;
  deleteOnboardingTemplate: (id: string) => void;
  getEmployeeOnboardingTasks: (employeeId: string) => OnboardingTask[];
  initializeOnboarding: (employeeId: string, templateId?: string) => void;
  toggleOnboardingTask: (employeeId: string, taskId: string) => void;

  // Equity
  equityGrants: EquityGrant[];
  getEmployeeGrants: (employeeId: string) => EquityGrant[];
  getVestingInfo: (grant: EquityGrant) => VestingResult;
  currentStockPrice: number;
  addEquityGrant: (grant: EquityGrant) => void;
  updateEquityGrant: (grantId: string, updates: Partial<EquityGrant>) => void;

  // Documents
  documents: Document[];
  getEmployeeDocuments: (employeeId: string) => Document[];
  addDocument: (doc: Document) => void;
  deleteDocument: (docId: string) => void;

  // Performance & OKRs
  performanceReviews: PerformanceReview[];
  getEmployeeReviews: (employeeId: string) => PerformanceReview[];
  addPerformanceReview: (review: PerformanceReview) => void;
  okrs: OKR[];
  getEmployeeOKRs: (employeeId: string) => OKR[];
  addOKR: (okr: OKR) => void;
  updateOKRProgress: (okrId: string, keyResultId: string, currentValue: number) => void;

  // Salary History
  getSalaryHistory: (employeeId: string) => SalaryRecord[];
  addSalaryRecord: (employeeId: string, record: SalaryRecord) => void;

  // UI State
  selectedEmployee: Employee | null;
  setSelectedEmployee: (employee: Employee | null) => void;
  isEmployeePanelOpen: boolean;
  setEmployeePanelOpen: (open: boolean) => void;

  // Global Search
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  searchResults: SearchResult[];

  // Currency
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => void;
  convertToDisplayCurrency: (amount: number, fromCurrency: Currency) => number;
  formatCurrency: (amount: number, fromCurrency?: Currency) => string;

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
  // Offline mode: no API URL configured, skip network calls entirely
  if (!API_BASE_URL) {
    return { success: false, error: 'Offline mode - using mock data' };
  }

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
  // CEO
  {
    id: 'emp_001',
    employeeNumber: '200335818',
    displayName: 'Alon Partuk',
    firstName: 'Alon',
    lastName: 'Partuk',
    workEmail: 'Alon@octup.com',
    phone: '054-6370481',
    avatarUrl: null,
    dateOfBirth: '1988-06-28',
    originalHireDate: '2022-03-01',
    currentStatus: 'active',
    jobTitle: 'CEO',
    jobLevel: 'Executive',
    department: 'Executive',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: null,
    managerName: null,
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 2, months: 11, totalDays: 1066, isAnniversaryThisMonth: false, nextAnniversaryDate: '2025-03-01' },
  },
  // HR & Operations
  {
    id: 'emp_002',
    employeeNumber: '302774161',
    displayName: 'Yarden Mantzur',
    firstName: 'Yarden',
    lastName: 'Mantzur',
    workEmail: 'yarden@octup.com',
    phone: '054-5412303',
    avatarUrl: null,
    dateOfBirth: '1989-02-09',
    originalHireDate: '2022-03-01',
    currentStatus: 'active',
    jobTitle: 'HR & Operations Manager',
    jobLevel: 'Manager',
    department: 'HR & Operation',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 2, months: 11, totalDays: 1066, isAnniversaryThisMonth: false, nextAnniversaryDate: '2025-03-01' },
  },
  // Finance
  {
    id: 'emp_003',
    employeeNumber: '37678489',
    displayName: 'Hagai Gold',
    firstName: 'Hagai',
    lastName: 'Gold',
    workEmail: 'hagai@octup.com',
    phone: '054-5609212',
    avatarUrl: null,
    dateOfBirth: '1975-09-23',
    originalHireDate: '2025-09-10',
    currentStatus: 'active',
    jobTitle: 'Finance Manager',
    jobLevel: 'Manager',
    department: 'Finance',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 5, totalDays: 148, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-09-10' },
  },
  // R&D Team
  {
    id: 'emp_004',
    employeeNumber: '345941686',
    displayName: 'Sabina Basina',
    firstName: 'Sabina',
    lastName: 'Basina',
    workEmail: 'sabina@octup.com',
    phone: '058-4051998',
    avatarUrl: null,
    dateOfBirth: '1998-03-05',
    originalHireDate: '2023-10-08',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 1, months: 4, totalDays: 485, isAnniversaryThisMonth: false, nextAnniversaryDate: '2024-10-08' },
  },
  {
    id: 'emp_005',
    employeeNumber: '316495035',
    displayName: 'Shachar Shmueli',
    firstName: 'Shachar',
    lastName: 'Shmueli',
    workEmail: 'shachar.shmueli@octup.com',
    phone: '054-6305627',
    avatarUrl: null,
    dateOfBirth: '1995-08-17',
    originalHireDate: '2024-07-01',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 7, totalDays: 219, isAnniversaryThisMonth: false, nextAnniversaryDate: '2025-07-01' },
  },
  {
    id: 'emp_006',
    employeeNumber: '300077153',
    displayName: 'Hod Caspi',
    firstName: 'Hod',
    lastName: 'Caspi',
    workEmail: 'Hod@octup.com',
    phone: '050-9098888',
    avatarUrl: null,
    dateOfBirth: '1986-09-19',
    originalHireDate: '2024-05-01',
    currentStatus: 'active',
    jobTitle: 'Senior Software Engineer',
    jobLevel: 'Senior',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 9, totalDays: 280, isAnniversaryThisMonth: false, nextAnniversaryDate: '2025-05-01' },
  },
  {
    id: 'emp_007',
    employeeNumber: '209040310',
    displayName: 'Amos Avni',
    firstName: 'Amos',
    lastName: 'Avni',
    workEmail: 'amos@octup.com',
    phone: '053-9195212',
    avatarUrl: null,
    dateOfBirth: '1997-01-07',
    originalHireDate: '2024-08-04',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 6, totalDays: 185, isAnniversaryThisMonth: false, nextAnniversaryDate: '2025-08-04' },
  },
  {
    id: 'emp_008',
    employeeNumber: '408682763',
    displayName: 'Chen Baygel',
    firstName: 'Chen',
    lastName: 'Baygel',
    workEmail: 'chenb@octup.com',
    phone: '054-9075837',
    avatarUrl: null,
    dateOfBirth: '1990-07-10',
    originalHireDate: '2024-08-18',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 5, totalDays: 171, isAnniversaryThisMonth: false, nextAnniversaryDate: '2025-08-18' },
  },
  {
    id: 'emp_009',
    employeeNumber: '346885700',
    displayName: 'Alexander Pletsis',
    firstName: 'Alexander',
    lastName: 'Pletsis',
    workEmail: 'alexander@octup.com',
    phone: '053-4763138',
    avatarUrl: null,
    dateOfBirth: '1989-05-06',
    originalHireDate: '2025-03-02',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 3, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-03-02' },
  },
  {
    id: 'emp_010',
    employeeNumber: '334013968',
    displayName: 'Maxim Marmer',
    firstName: 'Maxim',
    lastName: 'Marmer',
    workEmail: 'maxim@octup.com',
    phone: '052-9511178',
    avatarUrl: null,
    dateOfBirth: '1992-08-04',
    originalHireDate: '2025-03-09',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-03-09' },
  },
  {
    id: 'emp_011',
    employeeNumber: '203766076',
    displayName: 'Alon Bahir',
    firstName: 'Alon',
    lastName: 'Bahir',
    workEmail: 'alonb@octup.com',
    phone: '052-6223240',
    avatarUrl: null,
    dateOfBirth: '1992-09-07',
    originalHireDate: '2025-05-18',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-05-18' },
  },
  {
    id: 'emp_012',
    employeeNumber: '305539066',
    displayName: 'Yehuda Neumann',
    firstName: 'Yehuda',
    lastName: 'Neumann',
    workEmail: 'Yehuda@octup.com',
    phone: '054-6500907',
    avatarUrl: null,
    dateOfBirth: '1991-02-25',
    originalHireDate: '2025-05-18',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-05-18' },
  },
  {
    id: 'emp_013',
    employeeNumber: '312614605',
    displayName: 'Or Abitbol',
    firstName: 'Or',
    lastName: 'Abitbol',
    workEmail: 'or@octup.com',
    phone: '050-4222664',
    avatarUrl: null,
    dateOfBirth: '1993-12-06',
    originalHireDate: '2025-06-24',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-06-24' },
  },
  {
    id: 'emp_014',
    employeeNumber: '212170252',
    displayName: 'Shalev Shoam',
    firstName: 'Shalev',
    lastName: 'Shoam',
    workEmail: 'shalev@octup.com',
    phone: '054-2333028',
    avatarUrl: null,
    dateOfBirth: '2001-05-23',
    originalHireDate: '2025-08-03',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Junior',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-08-03' },
  },
  {
    id: 'emp_015',
    employeeNumber: '336290762',
    displayName: 'Roye Hecht',
    firstName: 'Roye',
    lastName: 'Hecht',
    workEmail: 'roye@octup.com',
    phone: '050-2614189',
    avatarUrl: null,
    dateOfBirth: '2001-01-13',
    originalHireDate: '2026-08-03',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Junior',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2027-08-03' },
  },
  {
    id: 'emp_016',
    employeeNumber: '204299622',
    displayName: 'Matan Bar',
    firstName: 'Matan',
    lastName: 'Bar',
    workEmail: 'matanb@octup.com',
    phone: '052-6665653',
    avatarUrl: null,
    dateOfBirth: '1992-06-04',
    originalHireDate: '2025-10-08',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-10-08' },
  },
  {
    id: 'emp_017',
    employeeNumber: '324472109',
    displayName: 'Schlomo Cohen',
    firstName: 'Schlomo',
    lastName: 'Cohen',
    workEmail: 'shlomo@octup.com',
    phone: '054-6216166',
    avatarUrl: null,
    dateOfBirth: '1991-04-04',
    originalHireDate: '2025-11-02',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-11-02' },
  },
  {
    id: 'emp_018',
    employeeNumber: '208532929',
    displayName: 'Moshe Nimrod Gold',
    firstName: 'Moshe',
    lastName: 'Nimrod Gold',
    workEmail: 'moshe@octup.com',
    phone: '050-838-9155',
    avatarUrl: null,
    dateOfBirth: '1996-11-06',
    originalHireDate: '2026-01-06',
    currentStatus: 'active',
    jobTitle: 'Software Engineer',
    jobLevel: 'Mid-Level',
    department: 'R&D',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 1, totalDays: 30, isAnniversaryThisMonth: false, nextAnniversaryDate: '2027-01-06' },
  },
  // Product
  {
    id: 'emp_019',
    employeeNumber: '40768301',
    displayName: 'Nissan Hazzan',
    firstName: 'Nissan',
    lastName: 'Hazzan',
    workEmail: 'nissan@octup.com',
    phone: '054-3343359',
    avatarUrl: null,
    dateOfBirth: '1981-04-08',
    originalHireDate: '2025-04-01',
    currentStatus: 'active',
    jobTitle: 'Product Manager',
    jobLevel: 'Manager',
    department: 'Product',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-04-01' },
  },
  // CS - Operation
  {
    id: 'emp_020',
    employeeNumber: '345634281',
    displayName: 'Jordan Maoz',
    firstName: 'Jordan',
    lastName: 'Maoz',
    workEmail: 'jordan@octup.com',
    phone: '053-9195212',
    avatarUrl: null,
    dateOfBirth: '2000-08-22',
    originalHireDate: '2024-08-05',
    currentStatus: 'active',
    jobTitle: 'Customer Success Manager',
    jobLevel: 'Mid-Level',
    department: 'CS - Operation',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_002',
    managerName: 'Yarden Mantzur',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 6, totalDays: 184, isAnniversaryThisMonth: false, nextAnniversaryDate: '2025-08-05' },
  },
  // Sales Team (Israel)
  {
    id: 'emp_021',
    employeeNumber: '310169480',
    displayName: 'Yotam Sina',
    firstName: 'Yotam',
    lastName: 'Sina',
    workEmail: 'yotam@octup.com',
    phone: '052-2675291',
    avatarUrl: null,
    dateOfBirth: '1990-01-01',
    originalHireDate: '2026-02-22',
    currentStatus: 'active',
    jobTitle: 'Sales Operations Manager',
    jobLevel: 'Manager',
    department: 'Sales',
    location: 'TLV',
    locationName: 'Tel Aviv Office',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2027-02-22' },
  },
  // Sales Team (US)
  {
    id: 'emp_022',
    employeeNumber: '41462392',
    displayName: 'Jay Mazur',
    firstName: 'Jay',
    lastName: 'Mazur',
    workEmail: 'jay@octup.com',
    phone: '+1 (512) 944-7218',
    avatarUrl: null,
    dateOfBirth: '1983-05-30',
    originalHireDate: '2025-06-16',
    currentStatus: 'active',
    jobTitle: 'Sales Representative',
    jobLevel: 'Mid-Level',
    department: 'Sales',
    location: 'US',
    locationName: 'United States (Remote)',
    managerId: 'emp_021',
    managerName: 'Yotam Sina',
    employmentType: 'full_time',
    workModel: 'remote',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-06-16' },
  },
  {
    id: 'emp_023',
    employeeNumber: 'R227-551-38-000-0',
    displayName: 'Blake Read',
    firstName: 'Blake',
    lastName: 'Read',
    workEmail: 'Blake@octup.com',
    phone: '+1 (904) 982-7423',
    avatarUrl: null,
    dateOfBirth: '1995-03-21',
    originalHireDate: '2025-08-11',
    currentStatus: 'active',
    jobTitle: 'Sales Representative',
    jobLevel: 'Mid-Level',
    department: 'Sales',
    location: 'US',
    locationName: 'United States (Remote)',
    managerId: 'emp_021',
    managerName: 'Yotam Sina',
    employmentType: 'full_time',
    workModel: 'remote',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-08-11' },
  },
  {
    id: 'emp_024',
    employeeNumber: '866422078',
    displayName: 'Chanan Burstein',
    firstName: 'Chanan',
    lastName: 'Burstein',
    workEmail: 'Chanan@octup.com',
    phone: '053-9655352',
    avatarUrl: null,
    dateOfBirth: '1999-10-16',
    originalHireDate: '2025-09-25',
    currentStatus: 'active',
    jobTitle: 'Sales Representative',
    jobLevel: 'Junior',
    department: 'Sales',
    location: 'US',
    locationName: 'United States (Remote)',
    managerId: 'emp_021',
    managerName: 'Yotam Sina',
    employmentType: 'full_time',
    workModel: 'remote',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-09-25' },
  },
  {
    id: 'emp_025',
    employeeNumber: 'C26060328',
    displayName: 'Ishmael Williams',
    firstName: 'Ishmael',
    lastName: 'Williams',
    workEmail: 'ishmael@octup.com',
    phone: '+1 (478) 394-3790',
    avatarUrl: null,
    dateOfBirth: '2001-01-21',
    originalHireDate: '2026-01-02',
    currentStatus: 'active',
    jobTitle: 'Sales Representative',
    jobLevel: 'Junior',
    department: 'Sales',
    location: 'US',
    locationName: 'United States (Remote)',
    managerId: 'emp_021',
    managerName: 'Yotam Sina',
    employmentType: 'full_time',
    workModel: 'remote',
    tenure: { years: 0, months: 1, totalDays: 34, isAnniversaryThisMonth: false, nextAnniversaryDate: '2027-01-02' },
  },
  {
    id: 'emp_026',
    employeeNumber: 'B260-5438-7207',
    displayName: 'Matthew Bocker',
    firstName: 'Matthew',
    lastName: 'Bocker',
    workEmail: 'matthew@octup.com',
    phone: '+1 (630) 207-7623',
    avatarUrl: null,
    dateOfBirth: '1987-07-21',
    originalHireDate: '2026-01-22',
    currentStatus: 'active',
    jobTitle: 'Sales Representative',
    jobLevel: 'Mid-Level',
    department: 'Sales',
    location: 'US',
    locationName: 'United States (Remote)',
    managerId: 'emp_021',
    managerName: 'Yotam Sina',
    employmentType: 'full_time',
    workModel: 'remote',
    tenure: { years: 0, months: 0, totalDays: 14, isAnniversaryThisMonth: false, nextAnniversaryDate: '2027-01-22' },
  },
  // Marketing
  {
    id: 'emp_027',
    employeeNumber: '50509978',
    displayName: 'Ava Barnes',
    firstName: 'Ava',
    lastName: 'Barnes',
    workEmail: 'Ava@octup.com',
    phone: '+1 (770) 714-9490',
    avatarUrl: null,
    dateOfBirth: '1984-12-17',
    originalHireDate: '2025-08-18',
    currentStatus: 'active',
    jobTitle: 'Marketing Manager',
    jobLevel: 'Manager',
    department: 'Marketing',
    location: 'US',
    locationName: 'United States (Remote)',
    managerId: 'emp_001',
    managerName: 'Alon Partuk',
    employmentType: 'full_time',
    workModel: 'remote',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-08-18' },
  },
  // Operation Team (Canada)
  {
    id: 'emp_028',
    employeeNumber: 'W6491-54489-80624',
    displayName: 'Michael Woolfson',
    firstName: 'Michael',
    lastName: 'Woolfson',
    workEmail: 'Michael@octup.com',
    phone: '+1 (905) 520-6504',
    avatarUrl: null,
    dateOfBirth: '1998-06-24',
    originalHireDate: '2023-09-18',
    currentStatus: 'active',
    jobTitle: 'Operations Specialist',
    jobLevel: 'Mid-Level',
    department: 'Operation',
    location: 'TOR',
    locationName: 'Toronto Office',
    managerId: 'emp_002',
    managerName: 'Yarden Mantzur',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 1, months: 4, totalDays: 505, isAnniversaryThisMonth: false, nextAnniversaryDate: '2024-09-18' },
  },
  {
    id: 'emp_029',
    employeeNumber: 'V0255-68509-76030',
    displayName: 'Salome Valderrama',
    firstName: 'Salome',
    lastName: 'Valderrama',
    workEmail: 'Ceena@octup.com',
    phone: '+1 (647) 529-9036',
    avatarUrl: null,
    dateOfBirth: '1997-10-30',
    originalHireDate: '2025-03-24',
    currentStatus: 'active',
    jobTitle: 'Operations Specialist',
    jobLevel: 'Junior',
    department: 'Operation',
    location: 'TOR',
    locationName: 'Toronto Office',
    managerId: 'emp_028',
    managerName: 'Michael Woolfson',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-03-24' },
  },
  {
    id: 'emp_030',
    employeeNumber: 'S3501-56079-31201',
    displayName: 'Ceena Shirafghan',
    firstName: 'Ceena',
    lastName: 'Shirafghan',
    workEmail: 'Ceena@octup.com',
    phone: '+1 (306) 251-1809',
    avatarUrl: null,
    dateOfBirth: '1993-12-01',
    originalHireDate: '2025-08-11',
    currentStatus: 'active',
    jobTitle: 'Operations Specialist',
    jobLevel: 'Mid-Level',
    department: 'Operation',
    location: 'TOR',
    locationName: 'Toronto Office',
    managerId: 'emp_028',
    managerName: 'Michael Woolfson',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-08-11' },
  },
  {
    id: 'emp_031',
    employeeNumber: 'D4029-61629-46203',
    displayName: 'Paola Diaz',
    firstName: 'Paola',
    lastName: 'Diaz',
    workEmail: 'paola@octup.com',
    phone: '+1 (647) 236-7840',
    avatarUrl: null,
    dateOfBirth: '1994-12-03',
    originalHireDate: '2025-11-10',
    currentStatus: 'active',
    jobTitle: 'Operations Specialist',
    jobLevel: 'Junior',
    department: 'Operation',
    location: 'TOR',
    locationName: 'Toronto Office',
    managerId: 'emp_028',
    managerName: 'Michael Woolfson',
    employmentType: 'full_time',
    workModel: 'hybrid',
    tenure: { years: 0, months: 0, totalDays: 0, isAnniversaryThisMonth: false, nextAnniversaryDate: '2026-11-10' },
  },
];

const MOCK_ASSETS: Asset[] = [
  // Yarden Mantzur - G&A Israel
  {
    id: 'asset_001',
    assetTag: 'LAP-TLV-001',
    category: 'laptop',
    manufacturer: 'Lenovo',
    model: 'ThinkPad P14s Gen 2',
    serialNumber: 'PF-3YECVP',
    purchaseDate: '2022-03-01',
    purchasePrice: 1599,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_002',
    assignedToName: 'Yarden Mantzur',
    assignedDate: '2022-03-01',
    locationCode: 'TLV',
    notes: 'Includes: Headphones, Docking station, One screen, Keyboard, Mouse',
    warrantyExpiry: '2025-03-01',
  },
  // Sabina Basina - R&D Israel
  {
    id: 'asset_002',
    assetTag: 'LAP-TLV-002',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'M9512VJHFW',
    purchaseDate: '2023-10-08',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_004',
    assignedToName: 'Sabina Basina',
    assignedDate: '2023-10-08',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard, 3 Screens (One at home)',
    warrantyExpiry: '2026-10-08',
  },
  // Shachar Shmueli - R&D Israel
  {
    id: 'asset_003',
    assetTag: 'LAP-TLV-003',
    category: 'laptop',
    manufacturer: 'Lenovo',
    model: 'ThinkPad P14s Gen 2',
    serialNumber: 'PF-3EQGAK',
    purchaseDate: '2024-07-01',
    purchasePrice: 1599,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_005',
    assignedToName: 'Shachar Shmueli',
    assignedDate: '2024-07-01',
    locationCode: 'TLV',
    notes: 'Includes: 4 screens (One at home), Docking station, Keyboard, Mouse',
    warrantyExpiry: '2027-07-01',
  },
  // Hod Caspi - R&D Israel
  {
    id: 'asset_004',
    assetTag: 'LAP-TLV-004',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'KR6HNJLQQ4',
    purchaseDate: '2024-05-01',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_006',
    assignedToName: 'Hod Caspi',
    assignedDate: '2024-05-01',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard, 2 screens',
    warrantyExpiry: '2027-05-01',
  },
  // Amos Avni - R&D Israel
  {
    id: 'asset_005',
    assetTag: 'LAP-TLV-005',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'JWTK9N19T4',
    purchaseDate: '2024-08-04',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_007',
    assignedToName: 'Amos Avni',
    assignedDate: '2024-08-04',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard, 2 screens',
    warrantyExpiry: '2027-08-04',
  },
  // Jordan Maoz - Operations Israel
  {
    id: 'asset_006',
    assetTag: 'LAP-TLV-006',
    category: 'laptop',
    manufacturer: 'Lenovo',
    model: 'ThinkPad P14s Gen 2',
    serialNumber: 'PF-3GB3CY',
    purchaseDate: '2024-08-05',
    purchasePrice: 1599,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_020',
    assignedToName: 'Jordan Maoz',
    assignedDate: '2024-08-05',
    locationCode: 'TLV',
    notes: 'Includes: Headphones, Three screens (One at home), Keyboard, Mouse',
    warrantyExpiry: '2027-08-05',
  },
  // Chen Baygel - R&D Israel
  {
    id: 'asset_007',
    assetTag: 'LAP-TLV-007',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'J6623H4TF5',
    purchaseDate: '2024-08-18',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_008',
    assignedToName: 'Chen Baygel',
    assignedDate: '2024-08-18',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard, 2 screens',
    warrantyExpiry: '2027-08-18',
  },
  // Alexander Pletsis - R&D Israel
  {
    id: 'asset_008',
    assetTag: 'LAP-TLV-008',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M4 Pro',
    serialNumber: 'G7HKGM04HV',
    purchaseDate: '2025-03-02',
    purchasePrice: 3499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_009',
    assignedToName: 'Alexander Pletsis',
    assignedDate: '2025-03-02',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard, 2 screens',
    warrantyExpiry: '2028-03-02',
  },
  // Maxim Marmer - R&D Israel
  {
    id: 'asset_009',
    assetTag: 'LAP-TLV-009',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M4 Pro',
    serialNumber: 'HCXN2TKW99',
    purchaseDate: '2025-03-09',
    purchasePrice: 3499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_010',
    assignedToName: 'Maxim Marmer',
    assignedDate: '2025-03-09',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard, 2 screens',
    warrantyExpiry: '2028-03-09',
  },
  // Nissan Hazzan - Product Israel
  {
    id: 'asset_010',
    assetTag: 'LAP-TLV-010',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro M4 Pro',
    serialNumber: 'H999LGPP94',
    purchaseDate: '2025-04-01',
    purchasePrice: 3499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_019',
    assignedToName: 'Nissan Hazzan',
    assignedDate: '2025-04-01',
    locationCode: 'TLV',
    notes: 'Includes: Docking station, One screen, Keyboard, Mouse',
    warrantyExpiry: '2028-04-01',
  },
  // Alon Bahir - R&D Israel
  {
    id: 'asset_011',
    assetTag: 'LAP-TLV-011',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'FR2093HXR2',
    purchaseDate: '2025-05-18',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_011',
    assignedToName: 'Alon Bahir',
    assignedDate: '2025-05-18',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard, 2 screens',
    warrantyExpiry: '2028-05-18',
  },
  // Yehuda Neumann - R&D Israel
  {
    id: 'asset_012',
    assetTag: 'LAP-TLV-012',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'D437R6GGV7',
    purchaseDate: '2025-05-18',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_012',
    assignedToName: 'Yehuda Neumann',
    assignedDate: '2025-05-18',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard, 2 screens',
    warrantyExpiry: '2028-05-18',
  },
  // Michael Woolfson - Operations Canada
  {
    id: 'asset_013',
    assetTag: 'LAP-TOR-001',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Air 2022',
    serialNumber: 'C9YKX7KXG9',
    purchaseDate: '2023-09-18',
    purchasePrice: 1299,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_028',
    assignedToName: 'Michael Woolfson',
    assignedDate: '2023-09-18',
    locationCode: 'TOR',
    notes: 'Includes: LG Screen. Also has 2 additional PCs: #F-3YAHQS, #PF-3YEA9N',
    warrantyExpiry: '2026-09-18',
  },
  // Salome Valderrama - Operations Canada
  {
    id: 'asset_014',
    assetTag: 'LAP-TOR-002',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Air 2022',
    serialNumber: 'HWLGQQ3CK4',
    purchaseDate: '2025-03-24',
    purchasePrice: 1299,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_029',
    assignedToName: 'Salome Valderrama',
    assignedDate: '2025-03-24',
    locationCode: 'TOR',
    notes: 'Includes: LG Screen, Adaptor, Charger',
    warrantyExpiry: '2028-03-24',
  },
  // Jay Mazur - S&M USA
  {
    id: 'asset_015',
    assetTag: 'LAP-US-001',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Air',
    serialNumber: 'J990VV97FH',
    purchaseDate: '2025-06-16',
    purchasePrice: 1299,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_022',
    assignedToName: 'Jay Mazur',
    assignedDate: '2025-06-16',
    locationCode: 'US',
    notes: null,
    warrantyExpiry: '2028-06-16',
  },
  // Or Abitbol - R&D Israel
  {
    id: 'asset_016',
    assetTag: 'LAP-TLV-013',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'KH6Q1GW4GQ',
    purchaseDate: '2025-06-24',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_013',
    assignedToName: 'Or Abitbol',
    assignedDate: '2025-06-24',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard',
    warrantyExpiry: '2028-06-24',
  },
  // Shalev Shoam - R&D Israel
  {
    id: 'asset_017',
    assetTag: 'LAP-TLV-014',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 14" M3 Pro',
    serialNumber: 'KXM2MKFQDX',
    purchaseDate: '2025-08-03',
    purchasePrice: 2499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_014',
    assignedToName: 'Shalev Shoam',
    assignedDate: '2025-08-03',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard',
    warrantyExpiry: '2028-08-03',
  },
  // Roye Hecht - R&D Israel
  {
    id: 'asset_018',
    assetTag: 'LAP-TLV-015',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 14" M3 Pro',
    serialNumber: 'KW6W0RRXQM',
    purchaseDate: '2026-08-03',
    purchasePrice: 2499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_015',
    assignedToName: 'Roye Hecht',
    assignedDate: '2026-08-03',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard',
    warrantyExpiry: '2029-08-03',
  },
  // Blake Read - S&M USA
  {
    id: 'asset_019',
    assetTag: 'LAP-US-002',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Air M4',
    serialNumber: 'L41YY0KHX5',
    purchaseDate: '2025-08-11',
    purchasePrice: 1499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_023',
    assignedToName: 'Blake Read',
    assignedDate: '2025-08-11',
    locationCode: 'US',
    notes: 'Includes: Monitor, Keyboard, Mouse',
    warrantyExpiry: '2028-08-11',
  },
  // Ava Barnes - S&M USA
  {
    id: 'asset_020',
    assetTag: 'LAP-US-003',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Air M4',
    serialNumber: 'CQFMV220XR',
    purchaseDate: '2025-08-18',
    purchasePrice: 1499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_027',
    assignedToName: 'Ava Barnes',
    assignedDate: '2025-08-18',
    locationCode: 'US',
    notes: 'Includes: Monitor, Mouse, Keyboard',
    warrantyExpiry: '2028-08-18',
  },
  // Hagai Gold - G&A Israel
  {
    id: 'asset_021',
    assetTag: 'LAP-TLV-016',
    category: 'laptop',
    manufacturer: 'Lenovo',
    model: 'ThinkPad',
    serialNumber: 'PF-3GBGWH',
    purchaseDate: '2025-09-10',
    purchasePrice: 1599,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_003',
    assignedToName: 'Hagai Gold',
    assignedDate: '2025-09-10',
    locationCode: 'TLV',
    notes: 'Includes: Docking station, One screen, Keyboard, Mouse',
    warrantyExpiry: '2028-09-10',
  },
  // Chanan Burstein - S&M USA
  {
    id: 'asset_022',
    assetTag: 'LAP-US-004',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Air 2025',
    serialNumber: 'KVM29GVWLY',
    purchaseDate: '2025-09-25',
    purchasePrice: 1499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_024',
    assignedToName: 'Chanan Burstein',
    assignedDate: '2025-09-25',
    locationCode: 'US',
    notes: 'Includes: Screen, Adaptor, Charger',
    warrantyExpiry: '2028-09-25',
  },
  // Ceena Shirafghan - Operations Canada
  {
    id: 'asset_023',
    assetTag: 'LAP-TOR-003',
    category: 'laptop',
    manufacturer: 'Lenovo',
    model: 'ThinkPad',
    serialNumber: 'PF-3YAHQS',
    purchaseDate: '2025-08-11',
    purchasePrice: 1599,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_030',
    assignedToName: 'Ceena Shirafghan',
    assignedDate: '2025-08-11',
    locationCode: 'TOR',
    notes: 'Includes: LG Monitor, Logitech Mouse',
    warrantyExpiry: '2028-08-11',
  },
  // Matan Bar - R&D Israel
  {
    id: 'asset_024',
    assetTag: 'LAP-TLV-017',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'GYJ4TL00NY',
    purchaseDate: '2025-10-08',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_016',
    assignedToName: 'Matan Bar',
    assignedDate: '2025-10-08',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard',
    warrantyExpiry: '2028-10-08',
  },
  // Schlomo Cohen - R&D Israel
  {
    id: 'asset_025',
    assetTag: 'LAP-TLV-018',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'C1KPXV02VC',
    purchaseDate: '2025-11-02',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_017',
    assignedToName: 'Schlomo Cohen',
    assignedDate: '2025-11-02',
    locationCode: 'TLV',
    notes: 'Includes: Belkin dock, Mouse, Keyboard',
    warrantyExpiry: '2028-11-02',
  },
  // Paola Diaz - Operations Canada
  {
    id: 'asset_026',
    assetTag: 'LAP-TOR-004',
    category: 'laptop',
    manufacturer: 'Lenovo',
    model: 'ThinkPad P14s Gen 2',
    serialNumber: 'PF-3YEA9N',
    purchaseDate: '2025-11-10',
    purchasePrice: 1599,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_031',
    assignedToName: 'Paola Diaz',
    assignedDate: '2025-11-10',
    locationCode: 'TOR',
    notes: null,
    warrantyExpiry: '2028-11-10',
  },
  // Ishmael Williams - S&M USA
  {
    id: 'asset_027',
    assetTag: 'LAP-US-005',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Air 2025',
    serialNumber: 'D4FCQDQC7',
    purchaseDate: '2026-01-02',
    purchasePrice: 1499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_025',
    assignedToName: 'Ishmael Williams',
    assignedDate: '2026-01-02',
    locationCode: 'US',
    notes: 'Includes: Monitor, Mouse, Keyboard',
    warrantyExpiry: '2029-01-02',
  },
  // Moshe Nimrod Gold - R&D Israel
  {
    id: 'asset_028',
    assetTag: 'LAP-TLV-019',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16" M3 Pro',
    serialNumber: 'JFV7HYYJP9',
    purchaseDate: '2026-01-06',
    purchasePrice: 2999,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_018',
    assignedToName: 'Moshe Nimrod Gold',
    assignedDate: '2026-01-06',
    locationCode: 'TLV',
    notes: null,
    warrantyExpiry: '2029-01-06',
  },
  // Matthew Bocker - S&M USA
  {
    id: 'asset_029',
    assetTag: 'LAP-US-006',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Air M4',
    serialNumber: 'CKP9V543NQ',
    purchaseDate: '2026-01-22',
    purchasePrice: 1499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_026',
    assignedToName: 'Matthew Bocker',
    assignedDate: '2026-01-22',
    locationCode: 'US',
    notes: 'Includes: Mouse, Keyboard',
    warrantyExpiry: '2029-01-22',
  },
  // Yotam Sina - S&M Israel
  {
    id: 'asset_030',
    assetTag: 'LAP-TLV-020',
    category: 'laptop',
    manufacturer: 'Apple',
    model: 'MacBook Air M4',
    serialNumber: null,
    purchaseDate: '2026-02-22',
    purchasePrice: 1499,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_021',
    assignedToName: 'Yotam Sina',
    assignedDate: '2026-02-22',
    locationCode: 'TLV',
    notes: 'Serial number pending',
    warrantyExpiry: '2029-02-22',
  },
];

const MOCK_BURN_RATE: BurnRateByLocation[] = [
  { locationCode: 'TLV', locationName: 'Tel Aviv', headcount: 14, monthlySalaryUsd: 125000, monthlyBenefitsUsd: 31250, monthlyTotalUsd: 156250 },
  { locationCode: 'TOR', locationName: 'Toronto', headcount: 9, monthlySalaryUsd: 98000, monthlyBenefitsUsd: 19600, monthlyTotalUsd: 117600 },
  { locationCode: 'US', locationName: 'United States', headcount: 7, monthlySalaryUsd: 85000, monthlyBenefitsUsd: 21250, monthlyTotalUsd: 106250 },
];

// ============================================================================
// MOCK EQUITY GRANTS (15 grants across 14 employees)
// Dynamic fields (sharesVested, sharesUnvested, vestingProgress, nextVestingDate,
// nextVestingShares) are computed at runtime by calculateVesting()
// ============================================================================

const MOCK_EQUITY_GRANTS: EquityGrant[] = [
  // Founders & early employees - nearly fully vested
  { id: 'grant_001', employeeId: 'emp_001', grantNumber: 'GRANT-001', grantDate: '2022-03-01', grantType: 'iso', sharesGranted: 5000000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.001, vestingType: 'cliff_then_linear', vestingStartDate: '2022-03-01', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_015', employeeId: 'emp_001', grantNumber: 'GRANT-015', grantDate: '2024-01-01', grantType: 'rsu', sharesGranted: 1000000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: null, vestingType: 'linear', vestingStartDate: '2024-01-01', cliffMonths: null, totalVestingMonths: 36, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_002', employeeId: 'emp_002', grantNumber: 'GRANT-002', grantDate: '2022-03-01', grantType: 'iso', sharesGranted: 500000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.001, vestingType: 'cliff_then_linear', vestingStartDate: '2022-03-01', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  // Mid-tenure - past cliff, actively vesting
  { id: 'grant_003', employeeId: 'emp_004', grantNumber: 'GRANT-003', grantDate: '2023-10-08', grantType: 'iso', sharesGranted: 300000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.01, vestingType: 'cliff_then_linear', vestingStartDate: '2023-10-08', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_004', employeeId: 'emp_006', grantNumber: 'GRANT-004', grantDate: '2024-05-01', grantType: 'iso', sharesGranted: 250000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.01, vestingType: 'cliff_then_linear', vestingStartDate: '2024-05-01', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_005', employeeId: 'emp_005', grantNumber: 'GRANT-005', grantDate: '2024-07-01', grantType: 'iso', sharesGranted: 200000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.02, vestingType: 'cliff_then_linear', vestingStartDate: '2024-07-01', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_006', employeeId: 'emp_007', grantNumber: 'GRANT-006', grantDate: '2024-08-04', grantType: 'iso', sharesGranted: 200000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.02, vestingType: 'cliff_then_linear', vestingStartDate: '2024-08-04', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_007', employeeId: 'emp_008', grantNumber: 'GRANT-007', grantDate: '2024-08-18', grantType: 'iso', sharesGranted: 200000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.02, vestingType: 'cliff_then_linear', vestingStartDate: '2024-08-18', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_008', employeeId: 'emp_020', grantNumber: 'GRANT-008', grantDate: '2024-08-05', grantType: 'iso', sharesGranted: 150000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.02, vestingType: 'cliff_then_linear', vestingStartDate: '2024-08-05', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_009', employeeId: 'emp_028', grantNumber: 'GRANT-009', grantDate: '2023-09-18', grantType: 'iso', sharesGranted: 250000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.01, vestingType: 'cliff_then_linear', vestingStartDate: '2023-09-18', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  // Pre-cliff - within 90 days (will auto-generate cliff alerts)
  { id: 'grant_010', employeeId: 'emp_019', grantNumber: 'GRANT-010', grantDate: '2025-04-01', grantType: 'iso', sharesGranted: 200000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.05, vestingType: 'cliff_then_linear', vestingStartDate: '2025-04-01', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_011', employeeId: 'emp_009', grantNumber: 'GRANT-011', grantDate: '2025-03-02', grantType: 'iso', sharesGranted: 150000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.05, vestingType: 'cliff_then_linear', vestingStartDate: '2025-03-02', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_012', employeeId: 'emp_010', grantNumber: 'GRANT-012', grantDate: '2025-03-09', grantType: 'iso', sharesGranted: 150000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.05, vestingType: 'cliff_then_linear', vestingStartDate: '2025-03-09', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  // Pre-cliff - beyond 90 days (won't trigger cliff alerts)
  { id: 'grant_013', employeeId: 'emp_027', grantNumber: 'GRANT-013', grantDate: '2025-08-18', grantType: 'nso', sharesGranted: 150000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.05, vestingType: 'cliff_then_linear', vestingStartDate: '2025-08-18', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
  { id: 'grant_014', employeeId: 'emp_022', grantNumber: 'GRANT-014', grantDate: '2025-06-16', grantType: 'nso', sharesGranted: 100000, sharesVested: 0, sharesExercised: 0, sharesUnvested: 0, exercisePrice: 0.05, vestingType: 'cliff_then_linear', vestingStartDate: '2025-06-16', cliffMonths: 12, totalVestingMonths: 48, nextVestingDate: null, nextVestingShares: null, vestingProgress: 0 },
];

const MOCK_CLIFF_ALERTS: CliffAlert[] = [];

// Alerts are now computed dynamically from system state — no more mock alerts

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

const MOCK_DOCUMENTS: Document[] = [
  // emp_001 — Alon Partuk
  { id: 'doc_001', employeeId: 'emp_001', name: 'Employment Contract', category: 'contract', uploadedAt: '2022-01-10T00:00:00Z', fileType: 'pdf', fileSizeBytes: 245000, visibility: 'private_employee', requiresAcknowledgment: true, acknowledgedAt: '2022-01-12T10:30:00Z' },
  { id: 'doc_002', employeeId: 'emp_001', name: 'Form 101 - 2024', category: 'tax_form', uploadedAt: '2024-01-15T00:00:00Z', fileType: 'pdf', fileSizeBytes: 156000, visibility: 'private_hr', requiresAcknowledgment: true, acknowledgedAt: '2024-01-16T10:30:00Z' },
  { id: 'doc_003', employeeId: 'emp_001', name: 'ISO Grant Agreement', category: 'contract', uploadedAt: '2022-03-01T00:00:00Z', fileType: 'pdf', fileSizeBytes: 312000, visibility: 'private_employee', requiresAcknowledgment: true, acknowledgedAt: '2022-03-02T09:00:00Z' },
  { id: 'doc_004', employeeId: 'emp_001', name: 'Performance Review H2 2024', category: 'performance_review', uploadedAt: '2025-01-20T00:00:00Z', fileType: 'pdf', fileSizeBytes: 89000, visibility: 'manager_visible', requiresAcknowledgment: false, acknowledgedAt: null },
  // emp_002 — Yarden
  { id: 'doc_005', employeeId: 'emp_002', name: 'Employment Contract', category: 'contract', uploadedAt: '2022-02-01T00:00:00Z', fileType: 'pdf', fileSizeBytes: 234000, visibility: 'private_employee', requiresAcknowledgment: true, acknowledgedAt: '2022-02-03T11:00:00Z' },
  { id: 'doc_006', employeeId: 'emp_002', name: 'IP Assignment Agreement', category: 'contract', uploadedAt: '2022-02-01T00:00:00Z', fileType: 'pdf', fileSizeBytes: 178000, visibility: 'private_hr', requiresAcknowledgment: true, acknowledgedAt: '2022-02-03T11:00:00Z' },
  // emp_004 — Sabina
  { id: 'doc_007', employeeId: 'emp_004', name: 'Employment Contract', category: 'contract', uploadedAt: '2023-10-08T00:00:00Z', fileType: 'pdf', fileSizeBytes: 251000, visibility: 'private_employee', requiresAcknowledgment: true, acknowledgedAt: '2023-10-09T10:00:00Z' },
  { id: 'doc_008', employeeId: 'emp_004', name: 'Form 101 - 2024', category: 'tax_form', uploadedAt: '2024-01-10T00:00:00Z', fileType: 'pdf', fileSizeBytes: 142000, visibility: 'private_hr', requiresAcknowledgment: false, acknowledgedAt: null },
  // emp_005 — Shachar
  { id: 'doc_009', employeeId: 'emp_005', name: 'Employment Contract', category: 'contract', uploadedAt: '2024-07-01T00:00:00Z', fileType: 'pdf', fileSizeBytes: 267000, visibility: 'private_employee', requiresAcknowledgment: true, acknowledgedAt: '2024-07-02T09:00:00Z' },
  { id: 'doc_010', employeeId: 'emp_005', name: 'Security Certification', category: 'certification', uploadedAt: '2024-09-15T00:00:00Z', fileType: 'pdf', fileSizeBytes: 98000, visibility: 'public', requiresAcknowledgment: false, acknowledgedAt: null },
  // emp_006 — Hod
  { id: 'doc_011', employeeId: 'emp_006', name: 'Employment Contract', category: 'contract', uploadedAt: '2024-05-01T00:00:00Z', fileType: 'pdf', fileSizeBytes: 245000, visibility: 'private_employee', requiresAcknowledgment: true, acknowledgedAt: '2024-05-02T10:00:00Z' },
  // emp_007 — Amos
  { id: 'doc_012', employeeId: 'emp_007', name: 'Employment Contract', category: 'contract', uploadedAt: '2024-08-04T00:00:00Z', fileType: 'pdf', fileSizeBytes: 238000, visibility: 'private_employee', requiresAcknowledgment: true, acknowledgedAt: '2024-08-05T08:30:00Z' },
  { id: 'doc_013', employeeId: 'emp_007', name: 'NDA Agreement', category: 'policy_acknowledgment', uploadedAt: '2024-08-04T00:00:00Z', fileType: 'pdf', fileSizeBytes: 67000, visibility: 'private_hr', requiresAcknowledgment: true, acknowledgedAt: '2024-08-05T08:30:00Z' },
  // emp_008 — Chen
  { id: 'doc_014', employeeId: 'emp_008', name: 'Employment Contract', category: 'contract', uploadedAt: '2024-08-18T00:00:00Z', fileType: 'pdf', fileSizeBytes: 241000, visibility: 'private_employee', requiresAcknowledgment: true, acknowledgedAt: '2024-08-19T10:00:00Z' },
  // emp_009 — Alexander
  { id: 'doc_015', employeeId: 'emp_009', name: 'Employment Contract', category: 'contract', uploadedAt: '2025-03-02T00:00:00Z', fileType: 'pdf', fileSizeBytes: 252000, visibility: 'private_employee', requiresAcknowledgment: true, acknowledgedAt: '2025-03-03T09:00:00Z' },
  { id: 'doc_016', employeeId: 'emp_009', name: 'Remote Work Policy', category: 'policy_acknowledgment', uploadedAt: '2025-03-02T00:00:00Z', fileType: 'pdf', fileSizeBytes: 54000, visibility: 'public', requiresAcknowledgment: true, acknowledgedAt: null },
];

const MOCK_PERFORMANCE_REVIEWS: PerformanceReview[] = [
  // emp_001 — Alon
  {
    id: 'rev_001', employeeId: 'emp_001', reviewDate: '2025-01-15', reviewPeriod: 'H2 2024',
    score: 4.8, maxScore: 5.0, reviewerName: 'Board of Directors',
    summary: 'Exceptional technical leadership. Drove architecture overhaul that improved system reliability by 40%. Strong cross-functional collaboration with product and sales teams.',
    competencies: [
      { name: 'Technical', score: 5.0, maxScore: 5.0 },
      { name: 'Communication', score: 4.5, maxScore: 5.0 },
      { name: 'Leadership', score: 4.8, maxScore: 5.0 },
      { name: 'Execution', score: 5.0, maxScore: 5.0 },
      { name: 'Cultural Fit', score: 4.7, maxScore: 5.0 },
    ],
  },
  {
    id: 'rev_002', employeeId: 'emp_001', reviewDate: '2024-07-10', reviewPeriod: 'H1 2024',
    score: 4.6, maxScore: 5.0, reviewerName: 'Board of Directors',
    summary: 'Strong delivery on Q1-Q2 roadmap. Successfully scaled the engineering team from 5 to 8 members. Areas for growth: delegate more operational tasks.',
    competencies: [
      { name: 'Technical', score: 4.8, maxScore: 5.0 },
      { name: 'Communication', score: 4.3, maxScore: 5.0 },
      { name: 'Leadership', score: 4.5, maxScore: 5.0 },
      { name: 'Execution', score: 4.9, maxScore: 5.0 },
      { name: 'Cultural Fit', score: 4.5, maxScore: 5.0 },
    ],
  },
  {
    id: 'rev_003', employeeId: 'emp_001', reviewDate: '2024-01-12', reviewPeriod: 'H2 2023',
    score: 4.5, maxScore: 5.0, reviewerName: 'Board of Directors',
    summary: 'Solid performance across all dimensions. Led the data pipeline migration with zero downtime. Continue developing mentorship skills for junior engineers.',
    competencies: [
      { name: 'Technical', score: 4.9, maxScore: 5.0 },
      { name: 'Communication', score: 4.0, maxScore: 5.0 },
      { name: 'Leadership', score: 4.3, maxScore: 5.0 },
      { name: 'Execution', score: 4.8, maxScore: 5.0 },
      { name: 'Cultural Fit', score: 4.5, maxScore: 5.0 },
    ],
  },
  // emp_002 — Yarden
  {
    id: 'rev_004', employeeId: 'emp_002', reviewDate: '2025-01-20', reviewPeriod: 'H2 2024',
    score: 4.3, maxScore: 5.0, reviewerName: 'Alon Partuk',
    summary: 'Excellent growth in backend architecture. Took ownership of the API gateway refactor. Communication with stakeholders has improved significantly.',
    competencies: [
      { name: 'Technical', score: 4.6, maxScore: 5.0 },
      { name: 'Communication', score: 4.0, maxScore: 5.0 },
      { name: 'Leadership', score: 3.8, maxScore: 5.0 },
      { name: 'Execution', score: 4.5, maxScore: 5.0 },
      { name: 'Cultural Fit', score: 4.6, maxScore: 5.0 },
    ],
  },
  // emp_004 — Sabina
  {
    id: 'rev_005', employeeId: 'emp_004', reviewDate: '2025-01-18', reviewPeriod: 'H2 2024',
    score: 4.5, maxScore: 5.0, reviewerName: 'Alon Partuk',
    summary: 'Outstanding work on the analytics dashboards. Proactively identified and fixed performance bottlenecks. A go-to resource for the team on data visualization.',
    competencies: [
      { name: 'Technical', score: 4.7, maxScore: 5.0 },
      { name: 'Communication', score: 4.4, maxScore: 5.0 },
      { name: 'Leadership', score: 4.2, maxScore: 5.0 },
      { name: 'Execution', score: 4.6, maxScore: 5.0 },
      { name: 'Cultural Fit', score: 4.6, maxScore: 5.0 },
    ],
  },
  // emp_005 — Daniel
  {
    id: 'rev_006', employeeId: 'emp_005', reviewDate: '2025-01-22', reviewPeriod: 'H2 2024',
    score: 3.9, maxScore: 5.0, reviewerName: 'Alon Partuk',
    summary: 'Good progress on DevOps initiatives. CI/CD pipeline improvements reduced deploy time by 30%. Needs to improve documentation practices and knowledge sharing.',
    competencies: [
      { name: 'Technical', score: 4.2, maxScore: 5.0 },
      { name: 'Communication', score: 3.5, maxScore: 5.0 },
      { name: 'Leadership', score: 3.6, maxScore: 5.0 },
      { name: 'Execution', score: 4.1, maxScore: 5.0 },
      { name: 'Cultural Fit', score: 4.1, maxScore: 5.0 },
    ],
  },
];

const MOCK_OKRS: OKR[] = [
  // emp_001 — Alon
  {
    id: 'okr_001', employeeId: 'emp_001', year: 2025, quarter: 'Q1',
    objective: 'Scale platform reliability to 99.95% uptime',
    status: 'on_track', progress: 78,
    keyResults: [
      { id: 'kr_001a', description: 'Reduce P1 incidents to fewer than 2 per month', targetValue: 2, currentValue: 1, unit: 'incidents', progress: 100 },
      { id: 'kr_001b', description: 'Implement automated failover for all critical services', targetValue: 5, currentValue: 4, unit: 'services', progress: 80 },
      { id: 'kr_001c', description: 'Achieve 99.95% uptime across all regions', targetValue: 99.95, currentValue: 99.91, unit: '%', progress: 55 },
    ],
  },
  {
    id: 'okr_002', employeeId: 'emp_001', year: 2025, quarter: 'Q1',
    objective: 'Grow engineering team and establish mentorship program',
    status: 'at_risk', progress: 45,
    keyResults: [
      { id: 'kr_002a', description: 'Hire 3 senior engineers by end of Q1', targetValue: 3, currentValue: 1, unit: 'hires', progress: 33 },
      { id: 'kr_002b', description: 'Launch mentorship pairing program', targetValue: 1, currentValue: 0, unit: 'program', progress: 0 },
      { id: 'kr_002c', description: 'Complete architecture documentation for all core services', targetValue: 8, currentValue: 8, unit: 'docs', progress: 100 },
    ],
  },
  // emp_002 — Yarden
  {
    id: 'okr_003', employeeId: 'emp_002', year: 2025, quarter: 'Q1',
    objective: 'Deliver API v2 with GraphQL support',
    status: 'on_track', progress: 70,
    keyResults: [
      { id: 'kr_003a', description: 'Migrate top 10 endpoints to GraphQL', targetValue: 10, currentValue: 7, unit: 'endpoints', progress: 70 },
      { id: 'kr_003b', description: 'Reduce average API response time by 40%', targetValue: 40, currentValue: 35, unit: '%', progress: 88 },
      { id: 'kr_003c', description: 'Achieve 95% test coverage on new endpoints', targetValue: 95, currentValue: 88, unit: '%', progress: 53 },
    ],
  },
  // emp_004 — Sabina
  {
    id: 'okr_004', employeeId: 'emp_004', year: 2025, quarter: 'Q1',
    objective: 'Build real-time analytics dashboard for enterprise clients',
    status: 'on_track', progress: 82,
    keyResults: [
      { id: 'kr_004a', description: 'Ship dashboard MVP to 3 pilot customers', targetValue: 3, currentValue: 3, unit: 'customers', progress: 100 },
      { id: 'kr_004b', description: 'Achieve sub-2s load time for all dashboard pages', targetValue: 2, currentValue: 2.3, unit: 'seconds', progress: 65 },
      { id: 'kr_004c', description: 'Implement 10 custom chart types', targetValue: 10, currentValue: 8, unit: 'charts', progress: 80 },
    ],
  },
  // emp_005 — Daniel
  {
    id: 'okr_005', employeeId: 'emp_005', year: 2025, quarter: 'Q1',
    objective: 'Migrate infrastructure to Kubernetes',
    status: 'behind', progress: 30,
    keyResults: [
      { id: 'kr_005a', description: 'Containerize all 12 production services', targetValue: 12, currentValue: 5, unit: 'services', progress: 42 },
      { id: 'kr_005b', description: 'Set up monitoring and alerting for K8s cluster', targetValue: 1, currentValue: 0, unit: 'system', progress: 0 },
      { id: 'kr_005c', description: 'Achieve zero-downtime deployments', targetValue: 100, currentValue: 50, unit: '%', progress: 50 },
    ],
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
  const roleNames: Record<UserRole, string> = {
    hr_admin: 'HR Admin',
    hr_viewer: 'HR Viewer',
    finance: 'Finance',
    manager: 'Manager',
    employee: 'Employee',
    admin: 'Admin',
  };

  // Initialize user from localStorage if available (persists across refreshes)
  const getInitialUser = (): UserInfo | null => {
    if (typeof window === 'undefined') return null;

    // Check for JWT-based session first (Google OAuth)
    const savedToken = localStorage.getItem('hris_jwt_token');
    const savedUser = localStorage.getItem('hris_user_info');
    if (savedToken && savedUser) {
      try {
        const userInfo = JSON.parse(savedUser);
        return { ...userInfo, token: savedToken };
      } catch { /* fall through */ }
    }

    // Fall back to demo role (offline mode)
    const savedRole = localStorage.getItem('hris_demo_role') as UserRole | null;
    if (savedRole && roleNames[savedRole]) {
      return {
        employeeId: 'dev-user',
        email: 'admin@octup.io',
        name: roleNames[savedRole],
        roles: [savedRole],
      };
    }
    return null;
  };

  const [user, setUser] = useState<UserInfo | null>(getInitialUser);

  // Role switching (for dev mode)
  const setUserRole = useCallback((role: UserRole) => {
    setUser(prev => prev ? {
      ...prev,
      name: roleNames[role],
      roles: [role],
    } : null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hris_demo_role', role);
    }
  }, []);

  // Login function — sets user state and persists role
  const login = useCallback((role: UserRole) => {
    setUser({
      employeeId: 'dev-user',
      email: 'admin@octup.io',
      name: roleNames[role],
      roles: [role],
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('hris_demo_role', role);
    }
  }, []);

  // Google OAuth login
  const loginWithGoogle = useCallback(async (googleResponse: { credential: string }) => {
    if (!API_BASE_URL) {
      // Offline mode fallback
      setUser({
        employeeId: 'google-user',
        email: 'user@octup.com',
        name: 'Google User',
        roles: ['hr_admin'],
      });
      localStorage.setItem('hris_demo_role', 'hr_admin');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: googleResponse.credential }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Authentication failed');
    }

    const { token, user: userData } = result.data;

    setUser({
      employeeId: userData.employeeId,
      email: userData.email,
      name: userData.name,
      roles: userData.roles as UserRole[],
      token,
    });

    localStorage.setItem('hris_jwt_token', token);
    localStorage.setItem('hris_user_info', JSON.stringify({
      employeeId: userData.employeeId,
      email: userData.email,
      name: userData.name,
      roles: userData.roles,
    }));
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hris_demo_role');
      localStorage.removeItem('hris_password_changed');
      localStorage.removeItem('hris_jwt_token');
      localStorage.removeItem('hris_user_info');
    }
  }, []);

  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hris_assets');
      if (saved) { try { return JSON.parse(saved); } catch {} }
    }
    return MOCK_ASSETS;
  });

  const addAsset = useCallback((asset: Asset) => {
    setAssets(prev => [...prev, asset]);
  }, []);

  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const [burnRate, setBurnRate] = useState<BurnRateByLocation[]>([]);
  const [cliffAlerts, setCliffAlerts] = useState<CliffAlert[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress[]>(MOCK_ONBOARDING);

  // Onboarding tasks state (keyed by employeeId)
  const [onboardingTasks, setOnboardingTasks] = useState<Record<string, OnboardingTask[]>>({});

  // Onboarding Templates
  const ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
    {
      id: 'general',
      name: 'General',
      description: 'Standard onboarding for all roles',
      tasks: [
        { name: 'Sign employment contract', stage: 'pre_boarding', category: 'Legal', priority: 'critical' },
        { name: 'Setup payroll & benefits enrollment', stage: 'pre_boarding', category: 'HR', priority: 'critical' },
        { name: 'Prepare workstation & equipment', stage: 'pre_boarding', category: 'IT', priority: 'high' },
        { name: 'Create email & Slack accounts', stage: 'day_1', category: 'IT', priority: 'critical' },
        { name: 'Team introduction meeting', stage: 'day_1', category: 'Culture', priority: 'high' },
        { name: 'Office tour & safety briefing', stage: 'day_1', category: 'Facilities', priority: 'medium' },
        { name: 'Security awareness training', stage: 'week_1', category: 'Security', priority: 'high' },
        { name: '1:1 with direct manager', stage: 'week_1', category: 'Management', priority: 'high' },
        { name: 'Complete role-specific training modules', stage: 'week_1', category: 'Training', priority: 'medium' },
        { name: 'Set initial OKRs with manager', stage: 'month_1', category: 'Management', priority: 'high' },
        { name: '30-day check-in with HR', stage: 'month_1', category: 'HR', priority: 'medium' },
        { name: 'Peer buddy feedback session', stage: 'month_1', category: 'Culture', priority: 'low' },
      ],
    },
    {
      id: 'engineering',
      name: 'R&D / Engineering',
      description: 'Extended onboarding for engineering roles',
      tasks: [
        { name: 'Sign employment contract', stage: 'pre_boarding', category: 'Legal', priority: 'critical' },
        { name: 'Setup payroll & benefits', stage: 'pre_boarding', category: 'HR', priority: 'critical' },
        { name: 'Provision laptop & dev tools', stage: 'pre_boarding', category: 'IT', priority: 'critical' },
        { name: 'Create email, Slack & GitHub accounts', stage: 'day_1', category: 'IT', priority: 'critical' },
        { name: 'Team introduction meeting', stage: 'day_1', category: 'Culture', priority: 'high' },
        { name: 'Dev environment setup & CLI tools', stage: 'day_1', category: 'Engineering', priority: 'critical' },
        { name: 'Codebase walkthrough with tech lead', stage: 'week_1', category: 'Engineering', priority: 'high' },
        { name: 'Security awareness training', stage: 'week_1', category: 'Security', priority: 'high' },
        { name: 'CI/CD pipeline & deployment training', stage: 'week_1', category: 'Engineering', priority: 'high' },
        { name: 'First code review (paired programming)', stage: 'week_1', category: 'Engineering', priority: 'medium' },
        { name: 'Architecture deep-dive session', stage: 'month_1', category: 'Engineering', priority: 'high' },
        { name: 'Set initial OKRs with manager', stage: 'month_1', category: 'Management', priority: 'high' },
        { name: '30-day check-in with HR', stage: 'month_1', category: 'HR', priority: 'medium' },
        { name: 'First sprint retrospective', stage: 'month_1', category: 'Engineering', priority: 'medium' },
      ],
    },
    {
      id: 'sales',
      name: 'Sales',
      description: 'Sales-focused onboarding with CRM training',
      tasks: [
        { name: 'Sign employment contract', stage: 'pre_boarding', category: 'Legal', priority: 'critical' },
        { name: 'Setup payroll & benefits', stage: 'pre_boarding', category: 'HR', priority: 'critical' },
        { name: 'Provision laptop & phone', stage: 'pre_boarding', category: 'IT', priority: 'high' },
        { name: 'Create email & Slack accounts', stage: 'day_1', category: 'IT', priority: 'critical' },
        { name: 'Team introduction & territory overview', stage: 'day_1', category: 'Sales', priority: 'high' },
        { name: 'CRM platform training (HubSpot)', stage: 'day_1', category: 'Sales', priority: 'critical' },
        { name: 'Product knowledge deep-dive', stage: 'week_1', category: 'Sales', priority: 'critical' },
        { name: 'Sales playbook & objection handling', stage: 'week_1', category: 'Sales', priority: 'high' },
        { name: 'Shadow top performer calls', stage: 'week_1', category: 'Sales', priority: 'high' },
        { name: 'Security awareness training', stage: 'week_1', category: 'Security', priority: 'medium' },
        { name: 'First solo demo/call with manager', stage: 'month_1', category: 'Sales', priority: 'high' },
        { name: 'Pipeline & quota setup', stage: 'month_1', category: 'Sales', priority: 'critical' },
        { name: '30-day check-in with HR', stage: 'month_1', category: 'HR', priority: 'medium' },
      ],
    },
  ];

  const [onboardingTemplates, setOnboardingTemplates] = useState<OnboardingTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hris_onboarding_templates');
      if (saved) { try { return JSON.parse(saved); } catch {} }
    }
    return ONBOARDING_TEMPLATES;
  });

  const addOnboardingTemplate = useCallback((template: OnboardingTemplate) => {
    setOnboardingTemplates(prev => [...prev, template]);
  }, []);

  const updateOnboardingTemplate = useCallback((id: string, updates: Partial<OnboardingTemplate>) => {
    setOnboardingTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteOnboardingTemplate = useCallback((id: string) => {
    setOnboardingTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  const initializeOnboarding = useCallback((employeeId: string, templateId?: string) => {
    const template = onboardingTemplates.find(t => t.id === templateId) || onboardingTemplates[0];
    const taskDefs = template.tasks;
    const tasks: OnboardingTask[] = taskDefs.map((t, i) => ({
      id: `onb_${employeeId}_${i}`,
      name: t.name,
      category: t.category,
      priority: t.priority,
      status: 'pending' as const,
      dueDate: new Date(Date.now() + (i + 1) * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isOverdue: false,
      assigneeType: t.category,
      checklistProgress: 0,
      stage: t.stage,
    }));
    setOnboardingTasks(prev => ({ ...prev, [employeeId]: tasks }));

    // Also add to onboardingProgress
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      setOnboardingProgress(prev => {
        if (prev.some(p => p.employeeId === employeeId)) return prev;
        return [...prev, {
          employeeId,
          employeeName: emp.displayName,
          startDate: new Date().toISOString().split('T')[0],
          totalTasks: tasks.length,
          completedTasks: 0,
          overdueTasks: 0,
          completionPercentage: 0,
        }];
      });
    }
  }, [employees, onboardingTemplates]);

  const getEmployeeOnboardingTasks = useCallback((employeeId: string): OnboardingTask[] => {
    return onboardingTasks[employeeId] || [];
  }, [onboardingTasks]);

  const toggleOnboardingTask = useCallback((employeeId: string, taskId: string) => {
    setOnboardingTasks(prev => {
      const tasks = prev[employeeId] || [];
      const updated = tasks.map(t =>
        t.id === taskId
          ? { ...t, status: (t.status === 'completed' ? 'pending' : 'completed') as OnboardingTask['status'], checklistProgress: t.status === 'completed' ? 0 : 100 }
          : t
      );
      // Update onboarding progress too
      const completed = updated.filter(t => t.status === 'completed').length;
      setOnboardingProgress(prevProgress =>
        prevProgress.map(p =>
          p.employeeId === employeeId
            ? { ...p, completedTasks: completed, completionPercentage: Math.round((completed / updated.length) * 100) }
            : p
        )
      );
      return { ...prev, [employeeId]: updated };
    });
  }, []);

  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalHeadcount: 0,
    monthlyBurnRateUsd: 0,
    activeOnboarding: 0,
    upcomingCliffs: 0,
  });

  // Add employee to local state + sync headcount KPI
  const addEmployee = useCallback((employee: Employee) => {
    setEmployees(prev => {
      const updated = [...prev, employee];
      setKpis(k => ({ ...k, totalHeadcount: updated.length }));
      return updated;
    });
  }, []);

  // Update employee in local state — auto-unassign assets on termination
  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updates } : emp));
    // If employee is being terminated, unassign their assets
    if (updates.currentStatus === 'terminated') {
      setAssets(prev => prev.map(asset =>
        asset.assignedToId === id
          ? { ...asset, status: 'available' as const, assignedToId: null, assignedToName: null, assignedDate: null }
          : asset
      ));
    }
  }, []);

  // Equity state
  const [equityGrants, setEquityGrants] = useState<EquityGrant[]>(MOCK_EQUITY_GRANTS);
  const currentStockPrice = CURRENT_STOCK_PRICE;

  const getEmployeeGrants = useCallback((employeeId: string): EquityGrant[] => {
    return equityGrants.filter(g => g.employeeId === employeeId);
  }, [equityGrants]);

  const getVestingInfo = useCallback((grant: EquityGrant): VestingResult => {
    return calculateVesting(grant, new Date(), currentStockPrice);
  }, [currentStockPrice]);

  const addEquityGrant = useCallback((grant: EquityGrant) => {
    setEquityGrants(prev => [...prev, grant]);
  }, []);

  const updateEquityGrant = useCallback((grantId: string, updates: Partial<EquityGrant>) => {
    setEquityGrants(prev => prev.map(g => g.id === grantId ? { ...g, ...updates } : g));
  }, []);

  // Documents state
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);

  const getEmployeeDocuments = useCallback((employeeId: string): Document[] => {
    return documents.filter(d => d.employeeId === employeeId);
  }, [documents]);

  const addDocument = useCallback((doc: Document) => {
    setDocuments(prev => [...prev, doc]);
  }, []);

  const deleteDocument = useCallback((docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  }, []);

  // Performance & OKR state
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>(MOCK_PERFORMANCE_REVIEWS);
  const [okrs, setOKRs] = useState<OKR[]>(MOCK_OKRS);

  const getEmployeeReviews = useCallback((employeeId: string): PerformanceReview[] => {
    return performanceReviews.filter(r => r.employeeId === employeeId)
      .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
  }, [performanceReviews]);

  const addPerformanceReview = useCallback((review: PerformanceReview) => {
    setPerformanceReviews(prev => [...prev, review]);
  }, []);

  // Salary history state (keyed by employeeId) — loaded from localStorage if available
  const MOCK_SALARY_HISTORY: Record<string, SalaryRecord[]> = {
    emp_001: [
      { id: 'sal_a1', effectiveDate: '2023-06-01', endDate: null, amount: 72000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 864000, reason: 'merit', reasonNotes: 'Annual performance review' },
      { id: 'sal_a2', effectiveDate: '2022-03-01', endDate: '2023-05-31', amount: 60000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 720000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_002: [
      { id: 'sal_b1', effectiveDate: '2023-01-01', endDate: null, amount: 65000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 780000, reason: 'merit', reasonNotes: 'Exceeds expectations' },
      { id: 'sal_b2', effectiveDate: '2022-01-01', endDate: '2022-12-31', amount: 55000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 660000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_003: [
      { id: 'sal_c1', effectiveDate: '2023-09-01', endDate: null, amount: 85000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 1020000, reason: 'promotion', reasonNotes: 'Promoted to Senior' },
      { id: 'sal_c2', effectiveDate: '2022-06-01', endDate: '2023-08-31', amount: 70000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 840000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_004: [
      { id: 'sal_d1', effectiveDate: '2024-10-01', endDate: null, amount: 50000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 600000, reason: 'merit', reasonNotes: 'Annual raise' },
      { id: 'sal_d2', effectiveDate: '2023-10-08', endDate: '2024-09-30', amount: 42000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 504000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_005: [
      { id: 'sal_e1', effectiveDate: '2025-07-01', endDate: null, amount: 48000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 576000, reason: 'merit', reasonNotes: 'Exceeds expectations' },
      { id: 'sal_e2', effectiveDate: '2024-07-01', endDate: '2025-06-30', amount: 42000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 504000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_006: [
      { id: 'sal_f1', effectiveDate: '2025-05-01', endDate: null, amount: 55000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 660000, reason: 'promotion', reasonNotes: 'Promoted to Senior Engineer' },
      { id: 'sal_f2', effectiveDate: '2024-05-01', endDate: '2025-04-30', amount: 47000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 564000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_007: [
      { id: 'sal_g1', effectiveDate: '2025-08-04', endDate: null, amount: 52000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 624000, reason: 'merit', reasonNotes: 'Annual raise' },
      { id: 'sal_g2', effectiveDate: '2024-08-04', endDate: '2025-08-03', amount: 46000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 552000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_008: [
      { id: 'sal_h1', effectiveDate: '2025-08-18', endDate: null, amount: 50000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 600000, reason: 'merit', reasonNotes: 'Annual raise' },
      { id: 'sal_h2', effectiveDate: '2024-08-18', endDate: '2025-08-17', amount: 44000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 528000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_009: [
      { id: 'sal_i1', effectiveDate: '2025-03-02', endDate: null, amount: 45000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 540000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_010: [
      { id: 'sal_j1', effectiveDate: '2025-03-09', endDate: null, amount: 45000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 540000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_019: [
      { id: 'sal_k1', effectiveDate: '2025-04-01', endDate: null, amount: 48000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 576000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_020: [
      { id: 'sal_l1', effectiveDate: '2025-08-05', endDate: null, amount: 38000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 456000, reason: 'merit', reasonNotes: 'Annual raise' },
      { id: 'sal_l2', effectiveDate: '2024-08-05', endDate: '2025-08-04', amount: 33000, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 396000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_022: [
      { id: 'sal_m1', effectiveDate: '2025-06-16', endDate: null, amount: 8500, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 102000, reason: 'hire', reasonNotes: 'Initial offer - base + commission' },
    ],
    emp_023: [
      { id: 'sal_n1', effectiveDate: '2025-08-11', endDate: null, amount: 7500, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 90000, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
    emp_028: [
      { id: 'sal_o1', effectiveDate: '2024-09-18', endDate: null, amount: 9500, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 114000, reason: 'merit', reasonNotes: 'Annual raise' },
      { id: 'sal_o2', effectiveDate: '2023-09-18', endDate: '2024-09-17', amount: 8200, currency: 'USD', frequency: 'monthly', annualizedAmountUsd: 98400, reason: 'hire', reasonNotes: 'Initial offer' },
    ],
  };
  const [salaryHistoryMap, setSalaryHistoryMap] = useState<Record<string, SalaryRecord[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hris_salary_history');
      if (saved) { try { return JSON.parse(saved); } catch {} }
    }
    return MOCK_SALARY_HISTORY;
  });

  const getSalaryHistory = useCallback((employeeId: string): SalaryRecord[] => {
    return salaryHistoryMap[employeeId] || [];
  }, [salaryHistoryMap]);

  const addSalaryRecord = useCallback((employeeId: string, record: SalaryRecord) => {
    setSalaryHistoryMap(prev => ({
      ...prev,
      [employeeId]: [...(prev[employeeId] || []), record],
    }));
  }, []);

  const getEmployeeOKRs = useCallback((employeeId: string): OKR[] => {
    return okrs.filter(o => o.employeeId === employeeId);
  }, [okrs]);

  const addOKR = useCallback((okr: OKR) => {
    setOKRs(prev => [...prev, okr]);
  }, []);

  const updateOKRProgress = useCallback((okrId: string, keyResultId: string, currentValue: number) => {
    setOKRs(prev => prev.map(okr => {
      if (okr.id !== okrId) return okr;
      const keyResults = okr.keyResults.map(kr => {
        if (kr.id !== keyResultId) return kr;
        const progress = Math.min(100, Math.round((currentValue / kr.targetValue) * 100));
        return { ...kr, currentValue, progress };
      });
      const avgProgress = Math.round(keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length);
      const status: OKR['status'] = avgProgress >= 70 ? 'on_track' : avgProgress >= 40 ? 'at_risk' : 'behind';
      return { ...okr, keyResults, progress: avgProgress, status };
    }));
  }, []);

  // Dynamic cliff alert derivation from equity grants
  const computedCliffAlerts = useMemo((): CliffAlert[] => {
    if (employees.length === 0) return [];
    const now = new Date();
    const result: CliffAlert[] = [];

    for (const grant of equityGrants) {
      if (grant.vestingType !== 'cliff_then_linear') continue;
      const cliffMonths = grant.cliffMonths ?? 12;
      const vestStart = new Date(grant.vestingStartDate);
      const cliffDate = addMonths(vestStart, cliffMonths);

      // Check if pre-cliff
      const vesting = calculateVesting(grant, now, CURRENT_STOCK_PRICE);
      if (vesting.sharesVested > 0) continue;

      const daysUntilCliff = Math.ceil((cliffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilCliff < 0 || daysUntilCliff > 90) continue;

      const employee = employees.find(e => e.id === grant.employeeId);
      if (!employee) continue;

      const cliffShares = Math.floor(grant.sharesGranted * cliffMonths / grant.totalVestingMonths);

      let alertLevel: CliffAlert['alertLevel'];
      if (daysUntilCliff <= 14) alertLevel = 'critical';
      else if (daysUntilCliff <= 30) alertLevel = 'high';
      else if (daysUntilCliff <= 60) alertLevel = 'medium';
      else alertLevel = 'low';

      result.push({
        employeeId: employee.id,
        employeeName: employee.displayName,
        employeeNumber: employee.employeeNumber,
        grantNumber: grant.grantNumber,
        cliffDate: cliffDate.toISOString().split('T')[0],
        cliffShares,
        daysUntilCliff,
        alertLevel,
        department: employee.department,
        locationCode: employee.location,
      });
    }

    return result.sort((a, b) => a.daysUntilCliff - b.daysUntilCliff);
  }, [equityGrants, employees]);

  // UI State
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEmployeePanelOpen, setEmployeePanelOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Create PII masking context based on user roles
  const maskPII = createMaskingContext(user?.roles || ['employee']);

  // Global search results
  const searchResults = React.useMemo((): SearchResult[] => {
    if (!globalSearchQuery.trim() || globalSearchQuery.length < 2) return [];

    const query = globalSearchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search employees
    employees.forEach(emp => {
      if (
        emp.displayName.toLowerCase().includes(query) ||
        emp.workEmail.toLowerCase().includes(query) ||
        emp.jobTitle.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'employee',
          id: emp.id,
          title: emp.displayName,
          subtitle: emp.jobTitle,
          data: emp,
        });
      }
    });

    // Search assets
    assets.forEach(asset => {
      if (
        asset.assetTag.toLowerCase().includes(query) ||
        asset.model.toLowerCase().includes(query) ||
        asset.manufacturer.toLowerCase().includes(query) ||
        (asset.assignedToName?.toLowerCase().includes(query))
      ) {
        results.push({
          type: 'asset',
          id: asset.id,
          title: asset.assetTag,
          subtitle: `${asset.manufacturer} ${asset.model}`,
          data: asset,
        });
      }
    });

    return results.slice(0, 8); // Limit to 8 results
  }, [globalSearchQuery, employees, assets]);

  // Currency conversion
  const convertToDisplayCurrency = useCallback((amount: number, fromCurrency: Currency): number => {
    const amountInUsd = amount * EXCHANGE_RATES[fromCurrency];
    return amountInUsd / EXCHANGE_RATES[displayCurrency];
  }, [displayCurrency]);

  // Format currency with symbol
  const formatCurrency = useCallback((amount: number, fromCurrency: Currency = 'USD'): string => {
    const converted = convertToDisplayCurrency(amount, fromCurrency);
    const symbols: Record<Currency, string> = { USD: '$', ILS: '₪', CAD: 'C$' };
    const symbol = symbols[displayCurrency];

    if (converted >= 1000000) {
      return `${symbol}${(converted / 1000000).toFixed(1)}M`;
    }
    if (converted >= 1000) {
      return `${symbol}${(converted / 1000).toFixed(0)}K`;
    }
    return `${symbol}${Math.round(converted).toLocaleString()}`;
  }, [convertToDisplayCurrency, displayCurrency]);

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
          upcomingCliffs: computedCliffAlerts.length,
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
          setCliffAlerts(computedCliffAlerts);
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
      setCliffAlerts(computedCliffAlerts);
      setKpis({
        totalHeadcount: 30,
        monthlyBurnRateUsd: 380100,
        activeOnboarding: 2,
        upcomingCliffs: computedCliffAlerts.length,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, transformEmployee, computedCliffAlerts]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Sync cliff alerts from computed equity data
  useEffect(() => {
    if (employees.length > 0 && computedCliffAlerts.length > 0) {
      setCliffAlerts(computedCliffAlerts);
      setKpis(prev => ({ ...prev, upcomingCliffs: computedCliffAlerts.length }));
    }
  }, [computedCliffAlerts, employees]);

  // Generate dynamic system alerts from real state
  useEffect(() => {
    if (employees.length === 0) return;
    const liveAlerts: Alert[] = [];
    const now = new Date();

    // Cliff alerts
    for (const ca of computedCliffAlerts) {
      liveAlerts.push({
        id: `cliff_${ca.employeeId}_${ca.grantNumber}`,
        type: 'cliff',
        title: 'Upcoming Cliff',
        description: `${ca.employeeName}'s cliff date is in ${ca.daysUntilCliff} days`,
        employeeId: ca.employeeId,
        employeeName: ca.employeeName,
        date: ca.cliffDate,
        priority: (ca.alertLevel === 'critical' || ca.alertLevel === 'high') ? 'high' : 'medium',
        actionUrl: `/employees/${ca.employeeId}`,
      });
    }

    // OKRs behind schedule
    for (const okr of okrs) {
      if (okr.status === 'behind') {
        const emp = employees.find(e => e.id === okr.employeeId);
        if (emp) {
          liveAlerts.push({
            id: `okr_behind_${okr.id}`,
            type: 'performance',
            title: 'OKR Behind Schedule',
            description: `${emp.displayName}: "${okr.objective}" at ${okr.progress}%`,
            employeeId: okr.employeeId,
            employeeName: emp.displayName,
            date: now.toISOString(),
            priority: 'high',
            actionUrl: `/employees/${okr.employeeId}`,
          });
        }
      }
    }

    // Overdue onboarding tasks
    for (const prog of onboardingProgress) {
      if (prog.overdueTasks > 0) {
        liveAlerts.push({
          id: `onb_overdue_${prog.employeeId}`,
          type: 'onboarding',
          title: 'Overdue Onboarding Tasks',
          description: `${prog.employeeName} has ${prog.overdueTasks} overdue tasks`,
          employeeId: prog.employeeId,
          employeeName: prog.employeeName,
          date: now.toISOString(),
          priority: 'medium',
          actionUrl: `/onboarding`,
        });
      }
    }

    // Asset warranty expiring within 90 days
    for (const asset of assets) {
      if (asset.warrantyExpiry && asset.status === 'assigned') {
        const expiry = new Date(asset.warrantyExpiry);
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 90) {
          liveAlerts.push({
            id: `warranty_${asset.id}`,
            type: 'asset',
            title: 'Warranty Expiring',
            description: `${asset.manufacturer} ${asset.model} (${asset.assetTag}) warranty expires in ${daysLeft} days`,
            employeeId: asset.assignedToId || '',
            employeeName: asset.assignedToName || 'Unassigned',
            date: asset.warrantyExpiry,
            priority: daysLeft <= 30 ? 'high' : 'medium',
            actionUrl: `/assets`,
          });
        }
      }
    }

    setAlerts(liveAlerts);
  }, [employees, computedCliffAlerts, okrs, onboardingProgress, assets]);

  // Persist assets to localStorage
  useEffect(() => {
    if (assets.length > 0) {
      localStorage.setItem('hris_assets', JSON.stringify(assets));
    }
  }, [assets]);

  // Persist onboarding templates to localStorage
  useEffect(() => {
    localStorage.setItem('hris_onboarding_templates', JSON.stringify(onboardingTemplates));
  }, [onboardingTemplates]);

  // Persist salary history to localStorage
  useEffect(() => {
    localStorage.setItem('hris_salary_history', JSON.stringify(salaryHistoryMap));
  }, [salaryHistoryMap]);

  // Open panel when employee selected
  useEffect(() => {
    if (selectedEmployee) {
      setEmployeePanelOpen(true);
    }
  }, [selectedEmployee]);

  const value: HRISContextType = {
    user,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    setUserRole,
    logout,
    employees,
    addEmployee,
    updateEmployee,
    assets,
    addAsset,
    updateAsset,
    kpis,
    burnRate,
    cliffAlerts,
    alerts,
    onboardingProgress,
    onboardingTasks,
    onboardingTemplates,
    addOnboardingTemplate,
    updateOnboardingTemplate,
    deleteOnboardingTemplate,
    getEmployeeOnboardingTasks,
    initializeOnboarding,
    toggleOnboardingTask,
    equityGrants,
    getEmployeeGrants,
    getVestingInfo,
    currentStockPrice,
    addEquityGrant,
    updateEquityGrant,
    documents,
    getEmployeeDocuments,
    addDocument,
    deleteDocument,
    performanceReviews,
    getEmployeeReviews,
    addPerformanceReview,
    getSalaryHistory,
    addSalaryRecord,
    okrs,
    getEmployeeOKRs,
    addOKR,
    updateOKRProgress,
    selectedEmployee,
    setSelectedEmployee,
    isEmployeePanelOpen,
    setEmployeePanelOpen,
    globalSearchQuery,
    setGlobalSearchQuery,
    searchResults,
    displayCurrency,
    setDisplayCurrency,
    convertToDisplayCurrency,
    formatCurrency,
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
