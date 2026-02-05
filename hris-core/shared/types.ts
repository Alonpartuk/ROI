/**
 * Octup HRIS - Shared TypeScript Types
 *
 * Types shared between API and Frontend
 */

// =============================================================================
// Enums & Literals
// =============================================================================

export type LocationCode = 'TLV' | 'TOR' | 'US';
export type Currency = 'USD' | 'ILS' | 'CAD';
export type EmploymentType = 'full_time' | 'part_time' | 'contractor';
export type WorkModel = 'remote' | 'hybrid' | 'onsite';
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';
export type VestingScheduleType = 'cliff_then_linear' | 'linear' | 'milestone';
export type DocumentVisibility = 'self' | 'manager' | 'hr' | 'public';
export type AlertLevel = 'critical' | 'high' | 'medium' | 'low';
export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

// =============================================================================
// Core Entities
// =============================================================================

export interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  preferredName?: string;
  email: string;
  personalEmail?: string;
  phone?: string;
  dateOfBirth?: string;
  location: LocationCode;
  hireDate: string;
  status: EmployeeStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmploymentRecord {
  id: string;
  employeeId: string;
  effectiveDate: string;
  endDate?: string;
  department: string;
  jobTitle: string;
  managerId?: string;
  employmentType: EmploymentType;
  workModel: WorkModel;
  createdAt: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  effectiveDate: string;
  endDate?: string;
  baseSalary: number;
  currency: Currency;
  payFrequency: 'monthly' | 'biweekly' | 'weekly';
  bonusTarget?: number;
  createdAt: string;
}

export interface EquityGrant {
  id: string;
  employeeId: string;
  grantDate: string;
  grantType: 'iso' | 'nso' | 'rsu';
  totalShares: number;
  vestedShares: number;
  exercisePrice?: number;
  vestingSchedule: VestingScheduleType;
  cliffMonths: number;
  vestingMonths: number;
  cliffDate?: string;
  expirationDate?: string;
  status: 'active' | 'fully_vested' | 'cancelled' | 'exercised';
}

export interface Document {
  id: string;
  employeeId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  visibility: DocumentVisibility;
  uploadedBy: string;
  uploadedAt: string;
  expiresAt?: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  category: 'laptop' | 'monitor' | 'keyboard' | 'mouse' | 'headset' | 'phone' | 'other';
  manufacturer: string;
  model: string;
  serialNumber?: string;
  status: 'assigned' | 'available' | 'maintenance' | 'retired';
  assignedTo?: string;
  assignedToName?: string;
  assignedDate?: string;
  locationCode: LocationCode;
  purchaseDate?: string;
  warrantyExpiry?: string;
  notes?: string;
}

// =============================================================================
// Analytics & Dashboard
// =============================================================================

export interface BurnRateByLocation {
  locationCode: LocationCode;
  headcount: number;
  monthlyTotalUsd: number;
  monthlyTotalLocal: number;
  localCurrency: Currency;
  avgSalaryUsd: number;
}

export interface CliffAlert {
  id: string;
  employeeId: string;
  employeeName: string;
  grantId: string;
  cliffDate: string;
  daysUntilCliff: number;
  sharesAtCliff: number;
  valueAtCliff?: number;
  alertLevel: AlertLevel;
}

export interface HeadcountMetric {
  date: string;
  totalHeadcount: number;
  byLocation: Record<LocationCode, number>;
  byDepartment: Record<string, number>;
  byEmploymentType: Record<EmploymentType, number>;
}

export interface DashboardKPIs {
  totalHeadcount: number;
  monthlyBurnRate: number;
  activeOnboarding: number;
  upcomingCliffs: number;
  headcountChange: number;
  burnRateChange: number;
}

// =============================================================================
// Onboarding
// =============================================================================

export interface OnboardingTask {
  id: string;
  employeeId: string;
  templateId: string;
  taskName: string;
  taskDescription?: string;
  category: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  status: OnboardingTaskStatus;
  completedAt?: string;
  completedBy?: string;
  sortOrder: number;
}

export interface OnboardingProgress {
  employeeId: string;
  employeeName: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  percentComplete: number;
}

// =============================================================================
// Timeline & Events
// =============================================================================

export interface TimelineEvent {
  id: string;
  employeeId: string;
  eventType: 'hire' | 'promotion' | 'salary_change' | 'equity_grant' | 'equity_vest' | 'department_change' | 'manager_change' | 'status_change' | 'document' | 'note';
  eventDate: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
}

// =============================================================================
// Alerts & Notifications
// =============================================================================

export interface Alert {
  id: string;
  type: 'anniversary' | 'cliff' | 'onboarding' | 'document_expiry' | 'birthday';
  level: AlertLevel;
  title: string;
  description: string;
  employeeId?: string;
  employeeName?: string;
  dueDate?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

// =============================================================================
// API Responses
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// =============================================================================
// RBAC
// =============================================================================

export type Role = 'hr_admin' | 'manager' | 'employee';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  scope: 'all' | 'department' | 'direct_reports' | 'self';
}

export interface UserSession {
  userId: string;
  employeeId: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  location: LocationCode;
}
