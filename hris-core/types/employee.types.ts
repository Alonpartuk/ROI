/**
 * HRIS Core TypeScript Types
 * Global HRIS for multi-location startup (TLV, Toronto, US)
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACTOR = 'contractor',
  INTERN = 'intern',
  CONSULTANT = 'consultant',
}

export enum WorkModel {
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  ONSITE = 'onsite',
}

export enum EmploymentStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated',
  PENDING_START = 'pending_start',
}

export enum SalaryFrequency {
  ANNUAL = 'annual',
  MONTHLY = 'monthly',
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export enum SalaryChangeReason {
  HIRE = 'hire',
  PROMOTION = 'promotion',
  MERIT = 'merit',
  MARKET_ADJUSTMENT = 'market_adjustment',
  ROLE_CHANGE = 'role_change',
  CORRECTION = 'correction',
  COST_OF_LIVING = 'cost_of_living',
}

export enum VestingType {
  LINEAR = 'linear',
  MILESTONE = 'milestone',
  CLIFF_THEN_LINEAR = 'cliff_then_linear',
  CUSTOM = 'custom',
}

export enum EquityGrantType {
  ISO = 'iso',
  NSO = 'nso',
  RSU = 'rsu',
  PHANTOM = 'phantom',
}

export enum DocumentVisibility {
  PRIVATE_HR = 'private_hr',
  PRIVATE_EMPLOYEE = 'private_employee',
  MANAGER_VISIBLE = 'manager_visible',
  PUBLIC = 'public',
}

export enum DocumentCategory {
  CONTRACT = 'contract',
  PERFORMANCE_REVIEW = 'performance_review',
  TAX_FORM = 'tax_form',
  CERTIFICATION = 'certification',
  POLICY_ACKNOWLEDGMENT = 'policy_acknowledgment',
  OTHER = 'other',
}

// ============================================================================
// BASE TYPES
// ============================================================================

export type UUID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // ISO 8601 timestamp
export type Currency = 'USD' | 'ILS' | 'CAD' | string;
export type CountryCode = 'US' | 'IL' | 'CA' | string;

// ============================================================================
// EFFECTIVE DATING INTERFACE
// ============================================================================

/**
 * Base interface for all effective-dated records
 * Implements bi-temporal pattern used by Workday/HiBob
 */
export interface EffectiveDated {
  effectiveDate: ISODate;
  endDate: ISODate | null; // null = current/future active
}

export interface Auditable {
  createdAt: ISODateTime;
  createdBy: UUID | null;
  updatedAt?: ISODateTime;
}

export interface SoftDeletable {
  isDeleted: boolean;
  deletedAt: ISODateTime | null;
  deletedBy?: UUID | null;
}

// ============================================================================
// LOCATION / ORGANIZATION
// ============================================================================

export interface Location {
  id: UUID;
  code: string; // 'TLV', 'TOR', 'US'
  name: string;
  countryCode: CountryCode;
  timezone: string;
  defaultCurrency: Currency;
  legalEntityName: string | null;
  config: LocationConfig;
}

export interface LocationConfig {
  taxIdLabel: string;
  taxIdFormat: string;
  requiredFields: string[];
  localForms: LocalFormConfig[];
  payrollCycle: 'weekly' | 'bi-weekly' | 'monthly';
  workWeek: number[]; // [0-6] where 0 = Sunday
  holidays: HolidayConfig[];
}

export interface LocalFormConfig {
  formId: string;
  formName: string;
  requiredForHire: boolean;
  metadata: Record<string, unknown>;
}

export interface HolidayConfig {
  date: ISODate;
  name: string;
  isFloating: boolean;
}

export interface Department {
  id: UUID;
  code: string;
  name: string;
  parentId: UUID | null;
  locationId: UUID | null;
  costCenter: string | null;
  isActive: boolean;
}

export interface JobLevel {
  id: UUID;
  code: string; // 'IC1', 'IC2', 'M1', etc.
  name: string;
  track: 'individual_contributor' | 'management';
  rank: number;
}

export interface JobTitle {
  id: UUID;
  code: string;
  name: string;
  departmentId: UUID | null;
  defaultLevelId: UUID | null;
  isActive: boolean;
}

// ============================================================================
// EMPLOYEE CORE
// ============================================================================

/**
 * Core employee record (non-temporal base)
 */
export interface Employee extends Auditable, SoftDeletable {
  id: UUID;
  employeeNumber: string;

  // Legal name (immutable)
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: ISODate | null;

  // Preferred name
  preferredFirstName: string | null;
  preferredLastName: string | null;

  // Contact
  personalEmail: string | null;
  workEmail: string;
  phone: string | null;

  // Employment
  originalHireDate: ISODate;
  currentStatus: EmploymentStatus;
}

/**
 * Full employee object with current state (denormalized view)
 */
export interface EmployeeFull extends Employee {
  // Current employment details
  currentEmployment: EmploymentRecord | null;

  // Current compensation
  currentSalary: SalaryRecord | null;

  // Current location data
  localData: EmployeeLocalData | null;

  // Equity summary
  equitySummary: EquitySummary | null;

  // Computed fields
  displayName: string;
  tenure: TenureInfo;
  manager: EmployeeBasic | null;
}

export interface EmployeeBasic {
  id: UUID;
  employeeNumber: string;
  displayName: string;
  workEmail: string;
  jobTitle: string | null;
  department: string | null;
  avatarUrl: string | null;
}

export interface TenureInfo {
  years: number;
  months: number;
  totalDays: number;
  isAnniversaryThisMonth: boolean;
}

// ============================================================================
// EMPLOYMENT RECORDS (Effective-Dated)
// ============================================================================

export interface EmploymentRecord extends EffectiveDated, Auditable {
  id: UUID;
  employeeId: UUID;

  // Employment details
  employmentType: EmploymentType;
  workModel: WorkModel;
  status: EmploymentStatus;

  // Position
  jobTitleId: UUID | null;
  jobLevelId: UUID | null;
  departmentId: UUID | null;
  locationId: UUID | null;

  // Reporting
  managerId: UUID | null;

  // Schedule
  ftePercentage: number;
  weeklyHours: number | null;

  // Change context
  changeReason: string | null;

  // Approval
  approvedBy: UUID | null;
  approvedAt: ISODateTime | null;

  // Resolved references (optional, populated on fetch)
  jobTitle?: JobTitle;
  jobLevel?: JobLevel;
  department?: Department;
  location?: Location;
  manager?: EmployeeBasic;
}

// ============================================================================
// SALARY ENGINE
// ============================================================================

export interface SalaryRecord extends EffectiveDated, Auditable {
  id: UUID;
  employeeId: UUID;

  // Compensation
  amount: number;
  currency: Currency;
  frequency: SalaryFrequency;

  // Normalized values
  annualizedAmount: number;
  annualizedCurrency: Currency;
  exchangeRateUsed: number | null;

  // Change context
  reason: SalaryChangeReason;
  reasonNotes: string | null;

  // Related record
  employmentRecordId: UUID | null;

  // Approval
  proposedBy: UUID | null;
  approvedBy: UUID | null;
  approvedAt: ISODateTime | null;
}

export interface SalaryBand {
  id: UUID;
  jobLevelId: UUID;
  locationId: UUID;
  currency: Currency;
  minAmount: number;
  midAmount: number;
  maxAmount: number;
  effectiveDate: ISODate;
  endDate: ISODate | null;
}

export interface SalaryComparison {
  currentSalary: number;
  bandMin: number;
  bandMid: number;
  bandMax: number;
  percentile: number; // Position within band (0-100)
  compaRatio: number; // Salary / Band Mid
}

// ============================================================================
// EQUITY / OPTIONS VAULT
// ============================================================================

export interface EquityPlan {
  id: UUID;
  name: string;
  planType: EquityGrantType;
  totalPoolShares: number;
  allocatedShares: number;
  defaultVestingType: VestingType;
  defaultCliffMonths: number;
  defaultVestingMonths: number;
  effectiveDate: ISODate;
  expirationDate: ISODate | null;
  isActive: boolean;
}

export interface EquityGrant extends Auditable {
  id: UUID;
  employeeId: UUID;
  equityPlanId: UUID;

  // Grant details
  grantNumber: string;
  grantDate: ISODate;
  grantType: EquityGrantType;

  // Shares
  sharesGranted: number;
  exercisePrice: number | null; // For options; null for RSUs
  fairMarketValue: number | null;

  // Vesting schedule
  vestingType: VestingType;
  vestingStartDate: ISODate;
  cliffMonths: number | null;
  totalVestingMonths: number;

  // Milestone config (for milestone vesting)
  milestoneConfig: MilestoneConfig | null;

  // Status
  sharesVested: number;
  sharesExercised: number;
  sharesForfeited: number;

  // Termination handling
  postTerminationExerciseMonths: number;

  // Dates
  expirationDate: ISODate | null;
  earlyExerciseAllowed: boolean;

  // Approval
  approvedBy: UUID | null;
  approvedAt: ISODateTime | null;
  boardApprovalDate: ISODate | null;
}

export interface MilestoneConfig {
  milestones: VestingMilestone[];
}

export interface VestingMilestone {
  id: string;
  description: string;
  sharesPercent: number;
  targetDate: ISODate | null;
  completedDate: ISODate | null;
  isCompleted: boolean;
}

export interface VestingEvent {
  id: UUID;
  grantId: UUID;
  vestingDate: ISODate;
  sharesVested: number;
  milestoneId: string | null;
  milestoneDescription: string | null;
  isScheduled: boolean; // true = future, false = occurred
  processedAt: ISODateTime | null;
}

export interface ExerciseEvent extends Auditable {
  id: UUID;
  grantId: UUID;
  exerciseDate: ISODate;
  sharesExercised: number;
  exercisePrice: number;
  fairMarketValue: number;
  taxWithholdingAmount: number | null;
  taxWithholdingCurrency: Currency | null;
  paymentMethod: string | null;
  totalCost: number;
}

export interface EquitySummary {
  totalSharesGranted: number;
  totalSharesVested: number;
  totalSharesExercised: number;
  totalSharesForfeited: number;
  totalSharesUnvested: number;
  totalSharesExercisable: number;
  grants: EquityGrantSummary[];
  nextVestingDate: ISODate | null;
  nextVestingShares: number | null;
}

export interface EquityGrantSummary {
  grantId: UUID;
  grantNumber: string;
  grantType: EquityGrantType;
  sharesGranted: number;
  sharesVested: number;
  sharesUnvested: number;
  sharesExercisable: number;
  exercisePrice: number | null;
  vestingProgress: number; // 0-100
  nextVestingDate: ISODate | null;
  nextVestingShares: number | null;
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

export interface Document extends Auditable, SoftDeletable {
  id: UUID;
  employeeId: UUID;

  // Document info
  name: string;
  description: string | null;
  category: DocumentCategory;

  // Storage
  storagePath: string;
  fileType: string;
  fileSizeBytes: number | null;
  checksum: string | null;

  // Access control
  visibility: DocumentVisibility;

  // Effective dating (for versioned documents)
  effectiveDate: ISODate | null;
  expirationDate: ISODate | null;

  // Metadata
  metadata: Record<string, unknown>;
  tags: string[];

  // Workflow
  requiresAcknowledgment: boolean;
  acknowledgedAt: ISODateTime | null;

  // Upload info
  uploadedBy: UUID;
  uploadedAt: ISODateTime;
}

export interface DocumentAccessLog {
  id: UUID;
  documentId: UUID;
  accessedBy: UUID;
  accessType: 'view' | 'download' | 'share';
  accessedAt: ISODateTime;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface DocumentAccessOverride {
  id: UUID;
  documentId: UUID;
  userId: UUID;
  canView: boolean;
  canDownload: boolean;
  grantedBy: UUID;
  grantedAt: ISODateTime;
  expiresAt: ISODateTime | null;
  reason: string | null;
}

// ============================================================================
// LOCALIZATION
// ============================================================================

export interface EmployeeLocalData extends EffectiveDated, Auditable {
  id: UUID;
  employeeId: UUID;
  locationId: UUID;
  localFields: LocalFieldsUnion;
  taxId: string | null;
  taxIdType: string | null;
}

// Location-specific field types
export type LocalFieldsUnion =
  | IsraelLocalFields
  | CanadaLocalFields
  | USLocalFields;

export interface IsraelLocalFields {
  _type: 'IL';
  teudatZehut: string; // Israeli ID number
  bankAccountNumber: string | null;
  bankBranchNumber: string | null;
  bankCode: string | null;
  pensionFundId: string | null;
  kupat_gemel: string | null;
  form101Submitted: boolean;
  form101SubmittedDate: ISODate | null;
  taxCoordinationNumber: string | null;
  militaryServiceStatus: 'completed' | 'exempt' | 'reserve' | null;
}

export interface CanadaLocalFields {
  _type: 'CA';
  sin: string; // Social Insurance Number
  provinceOfResidence: string;
  td1FederalSubmitted: boolean;
  td1ProvincialSubmitted: boolean;
  bankTransitNumber: string | null;
  bankInstitutionNumber: string | null;
  bankAccountNumber: string | null;
}

export interface USLocalFields {
  _type: 'US';
  ssn: string; // Social Security Number
  stateOfResidence: string;
  w4Submitted: boolean;
  i9Verified: boolean;
  i9VerificationDate: ISODate | null;
  routingNumber: string | null;
  accountNumber: string | null;
  workAuthorizationType: 'citizen' | 'permanent_resident' | 'visa' | null;
  visaType: string | null;
  visaExpirationDate: ISODate | null;
}

// ============================================================================
// TIMELINE / HISTORY
// ============================================================================

export type TimelineEventType =
  | 'employment'
  | 'salary'
  | 'equity_grant'
  | 'vesting'
  | 'document'
  | 'milestone';

export interface TimelineEvent {
  id: string;
  eventType: TimelineEventType;
  eventDate: ISODate;
  title: string;
  description: string;
  details: Record<string, unknown>;
  icon: string;
  color: string;
}

export interface EmployeeTimeline {
  employeeId: UUID;
  events: TimelineEvent[];
  startDate: ISODate; // First event date
  currentDate: ISODate;
  futureEvents: TimelineEvent[]; // Scheduled future events
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GetEmployeeTimelineRequest {
  employeeId: UUID;
  startDate?: ISODate;
  endDate?: ISODate;
  eventTypes?: TimelineEventType[];
  includeFuture?: boolean;
}

export interface GetEmployeeTimelineResponse {
  employee: EmployeeBasic;
  timeline: EmployeeTimeline;
  summary: TimelineSummary;
}

export interface TimelineSummary {
  totalEvents: number;
  promotions: number;
  salaryChanges: number;
  equityGrants: number;
  yearsOfService: number;
}

export interface GetEmployeeAsOfRequest {
  employeeId: UUID;
  asOfDate: ISODate;
}

export interface CreateEmploymentRecordRequest {
  employeeId: UUID;
  effectiveDate: ISODate;
  employmentType: EmploymentType;
  workModel: WorkModel;
  status: EmploymentStatus;
  jobTitleId?: UUID;
  jobLevelId?: UUID;
  departmentId?: UUID;
  locationId?: UUID;
  managerId?: UUID;
  ftePercentage?: number;
  weeklyHours?: number;
  changeReason?: string;
}

export interface CreateSalaryRecordRequest {
  employeeId: UUID;
  effectiveDate: ISODate;
  amount: number;
  currency: Currency;
  frequency: SalaryFrequency;
  reason: SalaryChangeReason;
  reasonNotes?: string;
}

export interface CreateEquityGrantRequest {
  employeeId: UUID;
  equityPlanId: UUID;
  grantDate: ISODate;
  grantType: EquityGrantType;
  sharesGranted: number;
  exercisePrice?: number;
  fairMarketValue?: number;
  vestingType: VestingType;
  vestingStartDate: ISODate;
  cliffMonths?: number;
  totalVestingMonths: number;
  milestoneConfig?: MilestoneConfig;
}

// ============================================================================
// VESTING CALCULATION HELPERS
// ============================================================================

export interface VestingCalculationResult {
  nextVestingDate: ISODate | null;
  nextVestingShares: number;
  totalVestedToDate: number;
  totalUnvested: number;
  vestingSchedule: VestingScheduleItem[];
  percentComplete: number;
}

export interface VestingScheduleItem {
  date: ISODate;
  shares: number;
  cumulativeShares: number;
  percentOfGrant: number;
  status: 'vested' | 'scheduled' | 'forfeited';
  isMilestone: boolean;
  milestoneDescription?: string;
}
