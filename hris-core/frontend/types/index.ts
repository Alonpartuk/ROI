/**
 * Frontend Type Definitions for HRIS Dashboard
 */

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

export interface Employee {
  id: string;
  employeeNumber: string;
  displayName: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  phone: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  originalHireDate: string;
  currentStatus: 'active' | 'on_leave' | 'terminated' | 'pending_start';
  jobTitle: string;
  jobLevel: string;
  department: string;
  location: LocationCode;
  locationName: string;
  managerId: string | null;
  managerName: string | null;
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'intern';
  workModel: 'remote' | 'hybrid' | 'onsite';
  tenure: TenureInfo;
}

export interface TenureInfo {
  years: number;
  months: number;
  totalDays: number;
  isAnniversaryThisMonth: boolean;
  nextAnniversaryDate: string;
}

export type LocationCode = 'TLV' | 'TOR' | 'US';

// ============================================================================
// SALARY TYPES
// ============================================================================

export interface SalaryRecord {
  id: string;
  effectiveDate: string;
  endDate: string | null;
  amount: number;
  currency: Currency;
  frequency: 'annual' | 'monthly' | 'hourly';
  annualizedAmountUsd: number;
  reason: SalaryChangeReason;
  reasonNotes: string | null;
}

export type Currency = 'USD' | 'ILS' | 'CAD';

export type SalaryChangeReason =
  | 'hire'
  | 'promotion'
  | 'merit'
  | 'market_adjustment'
  | 'role_change'
  | 'correction';

// ============================================================================
// EQUITY TYPES
// ============================================================================

export interface EquityGrant {
  id: string;
  employeeId: string;
  grantNumber: string;
  grantDate: string;
  grantType: 'iso' | 'nso' | 'rsu';
  sharesGranted: number;
  sharesVested: number;
  sharesExercised: number;
  sharesUnvested: number;
  exercisePrice: number | null;
  vestingType: 'linear' | 'cliff_then_linear' | 'milestone';
  vestingStartDate: string;
  cliffMonths: number | null;
  totalVestingMonths: number;
  nextVestingDate: string | null;
  nextVestingShares: number | null;
  vestingProgress: number;
}

export interface CliffAlert {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  grantNumber: string;
  cliffDate: string;
  cliffShares: number;
  daysUntilCliff: number;
  alertLevel: 'critical' | 'high' | 'medium' | 'low';
  department: string;
  locationCode: LocationCode;
}

// ============================================================================
// ASSET / EQUIPMENT TYPES
// ============================================================================

export interface Asset {
  id: string;
  assetTag: string;
  category: AssetCategory;
  manufacturer: string;
  model: string;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  currency: Currency;
  status: AssetStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedDate: string | null;
  locationCode: LocationCode;
  notes: string | null;
  warrantyExpiry: string | null;
}

export type AssetCategory = 'laptop' | 'monitor' | 'keyboard' | 'mouse' | 'headset' | 'phone' | 'other';

export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired';

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export interface Document {
  id: string;
  employeeId: string;
  name: string;
  category: DocumentCategory;
  uploadedAt: string;
  fileType: string;
  fileSizeBytes: number;
  visibility: 'private_hr' | 'private_employee' | 'manager_visible' | 'public';
  requiresAcknowledgment: boolean;
  acknowledgedAt: string | null;
}

export type DocumentCategory =
  | 'contract'
  | 'performance_review'
  | 'tax_form'
  | 'certification'
  | 'policy_acknowledgment'
  | 'other';

// ============================================================================
// TIMELINE TYPES
// ============================================================================

export interface TimelineEvent {
  id: string;
  eventType: TimelineEventType;
  eventDate: string;
  title: string;
  description: string;
  details: Record<string, unknown>;
  icon: string;
  color: string;
}

export type TimelineEventType =
  | 'employment'
  | 'salary'
  | 'equity_grant'
  | 'vesting'
  | 'document'
  | 'equipment';

// ============================================================================
// ONBOARDING TYPES
// ============================================================================

export type OnboardingStage = 'pre_boarding' | 'day_1' | 'week_1' | 'month_1';

export interface OnboardingTask {
  id: string;
  name: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: string;
  isOverdue: boolean;
  assigneeType: string;
  checklistProgress: number;
  stage?: OnboardingStage;
}

export interface OnboardingProgress {
  employeeId: string;
  employeeName: string;
  startDate: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionPercentage: number;
}

// ============================================================================
// DASHBOARD / KPI TYPES
// ============================================================================

export interface DashboardKPIs {
  totalHeadcount: number;
  monthlyBurnRateUsd: number;
  activeOnboarding: number;
  upcomingCliffs: number;
}

export interface BurnRateByLocation {
  locationCode: LocationCode;
  locationName: string;
  headcount: number;
  monthlySalaryUsd: number;
  monthlyBenefitsUsd: number;
  monthlyTotalUsd: number;
}

export interface HeadcountByLocation {
  locationCode: LocationCode;
  locationName: string;
  headcount: number;
  fullTimeCount: number;
  contractorCount: number;
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  employeeId: string | null;
  employeeName: string | null;
  date: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl: string | null;
}

export type AlertType =
  | 'anniversary'
  | 'cliff'
  | 'onboarding'
  | 'document_pending'
  | 'equipment_warning'
  | 'performance'
  | 'asset';

// ============================================================================
// PERFORMANCE & OKR TYPES
// ============================================================================

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewDate: string;
  reviewPeriod: string;
  score: number;
  maxScore: number;
  reviewerName: string;
  summary: string;
  competencies: CompetencyScore[];
}

export interface CompetencyScore {
  name: string;
  score: number;
  maxScore: number;
}

export type CompetencyName = 'Technical' | 'Communication' | 'Leadership' | 'Execution' | 'Cultural Fit';

export interface OKR {
  id: string;
  employeeId: string;
  year: number;
  quarter: string;
  objective: string;
  keyResults: KeyResult[];
  status: OKRStatus;
  progress: number;
}

export interface KeyResult {
  id: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number;
}

export type OKRStatus = 'on_track' | 'at_risk' | 'behind';

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
