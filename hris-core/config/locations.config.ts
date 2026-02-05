/**
 * Global Localization Configuration
 * Location-specific settings for TLV, Toronto, and US offices
 */

import { LocationConfig, LocalFormConfig, HolidayConfig } from '../types/employee.types';

// ============================================================================
// ISRAEL (TLV)
// ============================================================================

export const ISRAEL_CONFIG: LocationConfig = {
  taxIdLabel: 'Teudat Zehut (ID Number)',
  taxIdFormat: '^[0-9]{9}$', // 9-digit Israeli ID
  requiredFields: [
    'teudatZehut',
    'bankAccountNumber',
    'bankBranchNumber',
    'bankCode',
    'form101Submitted',
  ],
  localForms: [
    {
      formId: 'form_101',
      formName: 'טופס 101 - הצהרת עובד',
      requiredForHire: true,
      metadata: {
        description: 'Employee declaration form for tax withholding',
        frequency: 'annual',
        renewalMonth: 1, // January
        sections: [
          'personal_details',
          'family_status',
          'income_sources',
          'tax_credits',
          'pension_fund',
          'bank_details',
        ],
        validityPeriod: 12, // months
        requiresSpouseSignature: true,
        electronicSubmission: true,
      },
    },
    {
      formId: 'pension_form',
      formName: 'הצטרפות לקופת גמל/פנסיה',
      requiredForHire: true,
      metadata: {
        description: 'Pension fund enrollment form',
        mandatoryContribution: {
          employee: 6.0, // percentage
          employer: 6.5,
          severance: 8.33,
        },
        approvedFunds: [
          { id: 'migdal', name: 'מגדל' },
          { id: 'harel', name: 'הראל' },
          { id: 'menora', name: 'מנורה' },
          { id: 'phoenix', name: 'הפניקס' },
          { id: 'altshuler', name: 'אלטשולר שחם' },
        ],
      },
    },
    {
      formId: 'keren_hishtalmut',
      formName: 'קרן השתלמות',
      requiredForHire: false,
      metadata: {
        description: 'Advanced education fund enrollment',
        contribution: {
          employee: 2.5,
          employer: 7.5,
          maxSalaryForTaxBenefit: 15712, // ILS monthly (2024 ceiling)
        },
      },
    },
    {
      formId: 'tax_coordination',
      formName: 'תיאום מס',
      requiredForHire: false,
      metadata: {
        description: 'Tax coordination for multiple employers',
        requiredWhen: 'multiple_income_sources',
      },
    },
  ],
  payrollCycle: 'monthly',
  workWeek: [0, 1, 2, 3, 4], // Sunday to Thursday
  holidays: [
    { date: '2024-04-22', name: 'Passover Eve', isFloating: true },
    { date: '2024-04-23', name: 'Passover Day 1', isFloating: true },
    { date: '2024-04-29', name: 'Passover Day 7', isFloating: true },
    { date: '2024-05-14', name: 'Independence Day', isFloating: true },
    { date: '2024-06-12', name: 'Shavuot', isFloating: true },
    { date: '2024-10-03', name: 'Rosh Hashanah Eve', isFloating: true },
    { date: '2024-10-04', name: 'Rosh Hashanah Day 1', isFloating: true },
    { date: '2024-10-05', name: 'Rosh Hashanah Day 2', isFloating: true },
    { date: '2024-10-12', name: 'Yom Kippur', isFloating: true },
    { date: '2024-10-17', name: 'Sukkot Day 1', isFloating: true },
    { date: '2024-10-24', name: 'Simchat Torah', isFloating: true },
  ],
};

export const ISRAEL_LOCATION = {
  id: 'loc_israel',
  code: 'TLV',
  name: 'Tel Aviv Office',
  countryCode: 'IL',
  timezone: 'Asia/Jerusalem',
  defaultCurrency: 'ILS',
  legalEntityName: 'Company Israel Ltd.',
  config: ISRAEL_CONFIG,
};

// ============================================================================
// CANADA (Toronto)
// ============================================================================

export const CANADA_CONFIG: LocationConfig = {
  taxIdLabel: 'Social Insurance Number (SIN)',
  taxIdFormat: '^[0-9]{3}-?[0-9]{3}-?[0-9]{3}$', // XXX-XXX-XXX
  requiredFields: [
    'sin',
    'provinceOfResidence',
    'td1FederalSubmitted',
    'td1ProvincialSubmitted',
    'bankTransitNumber',
    'bankInstitutionNumber',
    'bankAccountNumber',
  ],
  localForms: [
    {
      formId: 'td1_federal',
      formName: 'TD1 - Federal Personal Tax Credits Return',
      requiredForHire: true,
      metadata: {
        description: 'Federal tax credits declaration',
        frequency: 'on_hire_and_change',
        cra_form_number: 'TD1',
        sections: [
          'basic_personal_amount',
          'spouse_amount',
          'dependent_amount',
          'caregiver_amount',
          'disability_amount',
          'tuition_amount',
        ],
        calculatesTotalCreditAmount: true,
      },
    },
    {
      formId: 'td1_provincial',
      formName: 'TD1ON - Ontario Personal Tax Credits Return',
      requiredForHire: true,
      metadata: {
        description: 'Provincial tax credits declaration',
        frequency: 'on_hire_and_change',
        province: 'ON', // Can vary by province
        cra_form_number: 'TD1ON',
      },
    },
    {
      formId: 'direct_deposit',
      formName: 'Direct Deposit Authorization',
      requiredForHire: true,
      metadata: {
        description: 'Banking information for payroll',
        requiredFields: ['transitNumber', 'institutionNumber', 'accountNumber'],
        voidChequeRequired: true,
      },
    },
  ],
  payrollCycle: 'bi-weekly',
  workWeek: [1, 2, 3, 4, 5], // Monday to Friday
  holidays: [
    { date: '2024-01-01', name: "New Year's Day", isFloating: false },
    { date: '2024-02-19', name: 'Family Day (Ontario)', isFloating: false },
    { date: '2024-03-29', name: 'Good Friday', isFloating: true },
    { date: '2024-05-20', name: 'Victoria Day', isFloating: false },
    { date: '2024-07-01', name: 'Canada Day', isFloating: false },
    { date: '2024-08-05', name: 'Civic Holiday (Ontario)', isFloating: false },
    { date: '2024-09-02', name: 'Labour Day', isFloating: false },
    { date: '2024-09-30', name: 'National Day for Truth and Reconciliation', isFloating: false },
    { date: '2024-10-14', name: 'Thanksgiving', isFloating: false },
    { date: '2024-12-25', name: 'Christmas Day', isFloating: false },
    { date: '2024-12-26', name: 'Boxing Day', isFloating: false },
  ],
};

export const CANADA_LOCATION = {
  id: 'loc_canada',
  code: 'TOR',
  name: 'Toronto Office',
  countryCode: 'CA',
  timezone: 'America/Toronto',
  defaultCurrency: 'CAD',
  legalEntityName: 'Company Canada Inc.',
  config: CANADA_CONFIG,
};

// ============================================================================
// UNITED STATES
// ============================================================================

export const US_CONFIG: LocationConfig = {
  taxIdLabel: 'Social Security Number (SSN)',
  taxIdFormat: '^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$', // XXX-XX-XXXX
  requiredFields: [
    'ssn',
    'stateOfResidence',
    'w4Submitted',
    'i9Verified',
    'routingNumber',
    'accountNumber',
  ],
  localForms: [
    {
      formId: 'w4',
      formName: 'W-4 Employee Withholding Certificate',
      requiredForHire: true,
      metadata: {
        description: 'Federal income tax withholding elections',
        frequency: 'on_hire_and_change',
        irs_form_number: 'W-4',
        sections: [
          'filing_status',
          'multiple_jobs',
          'dependents',
          'other_adjustments',
          'extra_withholding',
        ],
        filingStatusOptions: [
          'single',
          'married_filing_jointly',
          'married_filing_separately',
          'head_of_household',
        ],
      },
    },
    {
      formId: 'i9',
      formName: 'I-9 Employment Eligibility Verification',
      requiredForHire: true,
      metadata: {
        description: 'Work authorization verification',
        frequency: 'on_hire',
        uscis_form_number: 'I-9',
        sections: ['section_1_employee', 'section_2_employer', 'section_3_reverification'],
        deadlines: {
          section1: 'first_day',
          section2: 'within_3_business_days',
        },
        listA_documents: [
          'us_passport',
          'permanent_resident_card',
          'employment_authorization_document',
        ],
        listB_documents: [
          'drivers_license',
          'state_id',
          'school_id',
        ],
        listC_documents: [
          'social_security_card',
          'birth_certificate',
          'certification_of_report_of_birth',
        ],
      },
    },
    {
      formId: 'state_w4',
      formName: 'State W-4 (varies by state)',
      requiredForHire: true,
      metadata: {
        description: 'State income tax withholding',
        frequency: 'on_hire_and_change',
        stateSpecific: true,
        statesWithNoIncomeTax: ['AK', 'FL', 'NV', 'SD', 'TX', 'WA', 'WY'],
      },
    },
    {
      formId: 'direct_deposit',
      formName: 'Direct Deposit Authorization',
      requiredForHire: true,
      metadata: {
        description: 'Banking information for payroll',
        requiredFields: ['routingNumber', 'accountNumber', 'accountType'],
        accountTypes: ['checking', 'savings'],
        maxSplitAccounts: 3,
      },
    },
  ],
  payrollCycle: 'bi-weekly',
  workWeek: [1, 2, 3, 4, 5], // Monday to Friday
  holidays: [
    { date: '2024-01-01', name: "New Year's Day", isFloating: false },
    { date: '2024-01-15', name: 'Martin Luther King Jr. Day', isFloating: false },
    { date: '2024-02-19', name: "Presidents' Day", isFloating: false },
    { date: '2024-05-27', name: 'Memorial Day', isFloating: false },
    { date: '2024-06-19', name: 'Juneteenth', isFloating: false },
    { date: '2024-07-04', name: 'Independence Day', isFloating: false },
    { date: '2024-09-02', name: 'Labor Day', isFloating: false },
    { date: '2024-10-14', name: 'Columbus Day', isFloating: false },
    { date: '2024-11-11', name: 'Veterans Day', isFloating: false },
    { date: '2024-11-28', name: 'Thanksgiving Day', isFloating: false },
    { date: '2024-12-25', name: 'Christmas Day', isFloating: false },
  ],
};

export const US_LOCATION = {
  id: 'loc_us',
  code: 'US',
  name: 'US Office',
  countryCode: 'US',
  timezone: 'America/New_York',
  defaultCurrency: 'USD',
  legalEntityName: 'Company US Inc.',
  config: US_CONFIG,
};

// ============================================================================
// COMBINED LOCATIONS CONFIG
// ============================================================================

export const LOCATIONS = {
  TLV: ISRAEL_LOCATION,
  TOR: CANADA_LOCATION,
  US: US_LOCATION,
} as const;

export type LocationCode = keyof typeof LOCATIONS;

// ============================================================================
// CURRENCY CONFIGURATION
// ============================================================================

export const CURRENCY_CONFIG = {
  ILS: {
    code: 'ILS',
    name: 'Israeli New Shekel',
    symbol: '₪',
    decimalPlaces: 2,
    locale: 'he-IL',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimalPlaces: 2,
    locale: 'en-CA',
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimalPlaces: 2,
    locale: 'en-US',
  },
} as const;

// Base currency for normalization/comparison
export const BASE_CURRENCY = 'USD';

// ============================================================================
// TAX ID VALIDATION HELPERS
// ============================================================================

export const TAX_ID_VALIDATORS = {
  IL: {
    validate: (value: string): boolean => {
      // Israeli ID validation with check digit (Luhn algorithm variant)
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length !== 9) return false;

      let sum = 0;
      for (let i = 0; i < 9; i++) {
        let digit = parseInt(cleaned[i]) * ((i % 2) + 1);
        if (digit > 9) digit -= 9;
        sum += digit;
      }
      return sum % 10 === 0;
    },
    format: (value: string): string => {
      const cleaned = value.replace(/\D/g, '');
      return cleaned.padStart(9, '0');
    },
  },
  CA: {
    validate: (value: string): boolean => {
      // Canadian SIN validation (Luhn algorithm)
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length !== 9) return false;

      let sum = 0;
      for (let i = 0; i < 9; i++) {
        let digit = parseInt(cleaned[i]);
        if (i % 2 === 1) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
      }
      return sum % 10 === 0;
    },
    format: (value: string): string => {
      const cleaned = value.replace(/\D/g, '');
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 9)}`;
    },
  },
  US: {
    validate: (value: string): boolean => {
      // US SSN validation (format only, no check digit)
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length !== 9) return false;

      // Area number cannot be 000, 666, or 900-999
      const area = parseInt(cleaned.slice(0, 3));
      if (area === 0 || area === 666 || area >= 900) return false;

      // Group number cannot be 00
      const group = parseInt(cleaned.slice(3, 5));
      if (group === 0) return false;

      // Serial number cannot be 0000
      const serial = parseInt(cleaned.slice(5, 9));
      if (serial === 0) return false;

      return true;
    },
    format: (value: string): string => {
      const cleaned = value.replace(/\D/g, '');
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
    },
  },
} as const;

// ============================================================================
// FORM METADATA ACCESSORS
// ============================================================================

export function getRequiredFormsForLocation(locationCode: LocationCode): LocalFormConfig[] {
  const location = LOCATIONS[locationCode];
  return location.config.localForms.filter(form => form.requiredForHire);
}

export function getFormById(locationCode: LocationCode, formId: string): LocalFormConfig | undefined {
  const location = LOCATIONS[locationCode];
  return location.config.localForms.find(form => form.formId === formId);
}

export function getHolidaysForYear(locationCode: LocationCode, year: number): HolidayConfig[] {
  const location = LOCATIONS[locationCode];
  // In production, this would fetch from a database with year-specific dates
  // For now, return the static config (floating holidays need annual recalculation)
  return location.config.holidays;
}

export function isWorkDay(locationCode: LocationCode, date: Date): boolean {
  const location = LOCATIONS[locationCode];
  const dayOfWeek = date.getDay();

  // Check if it's a work day
  if (!location.config.workWeek.includes(dayOfWeek)) {
    return false;
  }

  // Check if it's a holiday
  const dateString = date.toISOString().split('T')[0];
  const isHoliday = location.config.holidays.some(h => h.date === dateString);

  return !isHoliday;
}
