/**
 * PII Masking Utility
 *
 * Masks personally identifiable information based on user role.
 * HR Admins see full data; others see masked versions.
 */

// =============================================================================
// TYPES
// =============================================================================

export type UserRole = 'hr_admin' | 'hr_viewer' | 'finance' | 'manager' | 'employee' | 'admin';

export interface MaskingOptions {
  roles: UserRole[];
  strictMode?: boolean; // If true, mask even partial info
}

// =============================================================================
// MASKING FUNCTIONS
// =============================================================================

/**
 * Mask an email address
 * Example: "john.doe@company.com" → "j***@***.com"
 */
export function maskEmail(email: string | null | undefined, options: MaskingOptions): string {
  if (!email) return '—';

  // HR Admins see full data
  if (canViewSensitiveData(options.roles)) {
    return email;
  }

  const [localPart, domain] = email.split('@');
  if (!domain) return '***@***.***';

  const domainParts = domain.split('.');
  const tld = domainParts.pop() || '';

  const maskedLocal = localPart[0] + '***';
  const maskedDomain = '***';

  return `${maskedLocal}@${maskedDomain}.${tld}`;
}

/**
 * Mask a phone number
 * Example: "+1-416-555-0101" → "+1-***-***-0101"
 */
export function maskPhone(phone: string | null | undefined, options: MaskingOptions): string {
  if (!phone) return '—';

  // HR Admins see full data
  if (canViewSensitiveData(options.roles)) {
    return phone;
  }

  // Keep first 3 and last 4 characters, mask the rest
  const cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.length <= 7) {
    return '***-***-' + cleaned.slice(-4);
  }

  const prefix = cleaned.slice(0, 3);
  const suffix = cleaned.slice(-4);

  return `${prefix}-***-***-${suffix}`;
}

/**
 * Mask a personal email (more strict than work email)
 * Example: "personal@gmail.com" → "p***@***.com"
 */
export function maskPersonalEmail(email: string | null | undefined, options: MaskingOptions): string {
  if (!email) return '—';

  // Only HR Admins see personal emails
  if (options.roles.includes('hr_admin') || options.roles.includes('admin')) {
    return email;
  }

  return maskEmail(email, { ...options, strictMode: true });
}

/**
 * Mask a date of birth
 * Example: "1985-03-15" → "****-**-**" or partial based on role
 */
export function maskDateOfBirth(
  dob: string | Date | null | undefined,
  options: MaskingOptions
): string {
  if (!dob) return '—';

  const dateStr = dob instanceof Date ? dob.toISOString().split('T')[0] : dob;

  // HR Admins see full date
  if (canViewSensitiveData(options.roles)) {
    return dateStr;
  }

  // Managers can see birth month/day (for birthday wishes) but not year
  if (options.roles.includes('manager')) {
    const [, month, day] = dateStr.split('-');
    return `****-${month}-${day}`;
  }

  // Others see nothing
  return '****-**-**';
}

/**
 * Mask salary amount
 * Example: 150000 → "***,***"
 */
export function maskSalary(
  amount: number | null | undefined,
  currency: string = 'USD',
  options: MaskingOptions
): string {
  if (amount === null || amount === undefined) return '—';

  // Only HR Admin and Finance see salary data
  if (options.roles.includes('hr_admin') || options.roles.includes('finance') || options.roles.includes('admin')) {
    return formatCurrency(amount, currency);
  }

  return '***,***';
}

/**
 * Mask a tax ID (SSN, SIN, etc.)
 * Example: "123-45-6789" → "***-**-6789"
 */
export function maskTaxId(taxId: string | null | undefined, options: MaskingOptions): string {
  if (!taxId) return '—';

  // Only HR Admins see tax IDs
  if (options.roles.includes('hr_admin') || options.roles.includes('admin')) {
    return taxId;
  }

  // Show only last 4 digits
  const cleaned = taxId.replace(/[^\dA-Za-z]/g, '');
  if (cleaned.length <= 4) {
    return '***';
  }

  return '***-**-' + cleaned.slice(-4);
}

/**
 * Mask an address
 */
export function maskAddress(address: string | null | undefined, options: MaskingOptions): string {
  if (!address) return '—';

  // Only HR Admins see full address
  if (options.roles.includes('hr_admin') || options.roles.includes('admin')) {
    return address;
  }

  // Show only city/country portion if possible
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return `***, ${parts.slice(-2).join(', ')}`;
  }

  return '*** (Address Hidden)';
}

// =============================================================================
// BULK MASKING FOR EMPLOYEE DATA
// =============================================================================

export interface EmployeeData {
  id: string;
  work_email?: string;
  personal_email?: string;
  phone?: string;
  date_of_birth?: string;
  salary?: number;
  currency?: string;
  tax_id?: string;
  address?: string;
  [key: string]: any;
}

/**
 * Mask PII fields in an employee record based on user role
 */
export function maskEmployeePII<T extends EmployeeData>(
  employee: T,
  options: MaskingOptions
): T {
  return {
    ...employee,
    work_email: employee.work_email,  // Work email typically not masked
    personal_email: maskPersonalEmail(employee.personal_email, options),
    phone: maskPhone(employee.phone, options),
    date_of_birth: maskDateOfBirth(employee.date_of_birth, options),
    salary: employee.salary,  // Use maskSalary separately for display
    tax_id: maskTaxId(employee.tax_id, options),
    address: maskAddress(employee.address, options),
  };
}

/**
 * Mask PII fields in an array of employees
 */
export function maskEmployeesPII<T extends EmployeeData>(
  employees: T[],
  options: MaskingOptions
): T[] {
  return employees.map(emp => maskEmployeePII(emp, options));
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user role allows viewing sensitive data
 */
export function canViewSensitiveData(roles: UserRole[]): boolean {
  return roles.some(role =>
    role === 'hr_admin' ||
    role === 'admin'
  );
}

/**
 * Check if user role allows viewing salary data
 */
export function canViewSalaryData(roles: UserRole[]): boolean {
  return roles.some(role =>
    role === 'hr_admin' ||
    role === 'finance' ||
    role === 'admin'
  );
}

/**
 * Check if user role allows viewing equity data
 */
export function canViewEquityData(roles: UserRole[]): boolean {
  return roles.some(role =>
    role === 'hr_admin' ||
    role === 'finance' ||
    role === 'admin'
  );
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    ILS: '₪',
    CAD: 'C$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = symbols[currency] || currency;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return `${symbol}${formatted}`;
}

// =============================================================================
// REACT HOOK FOR MASKING
// =============================================================================

/**
 * Custom hook for PII masking based on current user context
 *
 * Usage:
 * const { maskPII } = usePIIMasking();
 * const maskedEmail = maskPII.email(employee.personal_email);
 */
export function createMaskingContext(userRoles: UserRole[]) {
  const options: MaskingOptions = { roles: userRoles };

  return {
    email: (email: string | null | undefined) => maskEmail(email, options),
    personalEmail: (email: string | null | undefined) => maskPersonalEmail(email, options),
    phone: (phone: string | null | undefined) => maskPhone(phone, options),
    dateOfBirth: (dob: string | Date | null | undefined) => maskDateOfBirth(dob, options),
    salary: (amount: number | null | undefined, currency?: string) => maskSalary(amount, currency, options),
    taxId: (taxId: string | null | undefined) => maskTaxId(taxId, options),
    address: (address: string | null | undefined) => maskAddress(address, options),
    employee: <T extends EmployeeData>(emp: T) => maskEmployeePII(emp, options),
    employees: <T extends EmployeeData>(emps: T[]) => maskEmployeesPII(emps, options),
    canViewSensitive: () => canViewSensitiveData(userRoles),
    canViewSalary: () => canViewSalaryData(userRoles),
    canViewEquity: () => canViewEquityData(userRoles),
  };
}
