/**
 * Add Employee Modal - Octup HRIS
 * Multi-step wizard for creating new employees
 */

import React, { useState } from 'react';
import { useHRIS } from '../../context/HRISContext';
import { Currency, Employee, LocationCode } from '../../types';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const COLORS = {
  primary: '#00A8A8',
  secondary: '#743CF7',
  accent: '#FF3489',
  cardBg: '#FFFFFF',
  canvasBg: '#F3F4F6',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  error: '#EF4444',
};

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  User: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Briefcase: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  DollarSign: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Loader: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
};

// =============================================================================
// TYPES
// =============================================================================

interface EmployeeFormData {
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  // Employment
  jobTitle: string;
  department: string;
  managerId: string;
  hireDate: string;
  employmentType: string;
  // Compensation (HR Admin only)
  salary: string;
  currency: Currency;
}

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'basic' | 'employment' | 'compensation' | 'review';

// =============================================================================
// FORM INPUT COMPONENT
// =============================================================================

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

function FormInput({ label, value, onChange, type = 'text', placeholder, required, error, disabled }: FormInputProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: 500,
        color: COLORS.textDark,
        marginBottom: '6px',
      }}>
        {label}
        {required && <span style={{ color: COLORS.accent, marginLeft: '4px' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: '14px',
          borderRadius: '10px',
          border: `1px solid ${error ? COLORS.error : COLORS.border}`,
          backgroundColor: disabled ? COLORS.canvasBg : COLORS.cardBg,
          outline: 'none',
          transition: 'all 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = COLORS.primary;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.primary}20`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? COLORS.error : COLORS.border;
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {error && (
        <p style={{ fontSize: '12px', color: COLORS.error, marginTop: '4px' }}>{error}</p>
      )}
    </div>
  );
}

// =============================================================================
// FORM SELECT COMPONENT
// =============================================================================

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
}

function FormSelect({ label, value, onChange, options, required, error }: FormSelectProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: 500,
        color: COLORS.textDark,
        marginBottom: '6px',
      }}>
        {label}
        {required && <span style={{ color: COLORS.accent, marginLeft: '4px' }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: '14px',
          borderRadius: '10px',
          border: `1px solid ${error ? COLORS.error : COLORS.border}`,
          backgroundColor: COLORS.cardBg,
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <p style={{ fontSize: '12px', color: COLORS.error, marginTop: '4px' }}>{error}</p>
      )}
    </div>
  );
}

// =============================================================================
// STEP INDICATOR
// =============================================================================

interface StepIndicatorProps {
  steps: { id: Step; label: string; icon: React.ReactNode }[];
  currentStep: Step;
  completedSteps: Step[];
}

function StepIndicator({ steps, currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '32px',
    }}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id);

        return (
          <React.Fragment key={step.id}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCompleted ? COLORS.success : isActive ? COLORS.primary : COLORS.canvasBg,
                color: isCompleted || isActive ? 'white' : COLORS.textMuted,
                transition: 'all 0.2s ease',
              }}>
                {isCompleted ? <Icons.Check /> : step.icon}
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? COLORS.textDark : COLORS.textMuted,
              }}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div style={{
                width: '40px',
                height: '2px',
                backgroundColor: completedSteps.includes(steps[index + 1].id) || isCompleted ? COLORS.success : COLORS.border,
                alignSelf: 'center',
                marginTop: '-24px',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN MODAL COMPONENT
// =============================================================================

export function AddEmployeeModal({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) {
  const { user, employees, addEmployee, refreshData } = useHRIS();

  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isAdmin = user?.roles.includes('hr_admin') || user?.roles.includes('admin');
  const canViewCompensation = isAdmin || user?.roles.includes('finance');

  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: 'TLV',
    jobTitle: '',
    department: '',
    managerId: '',
    hireDate: new Date().toISOString().split('T')[0],
    employmentType: 'full_time',
    salary: '',
    currency: 'USD',
  });

  const updateField = (field: keyof EmployeeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'basic', label: 'Basic Info', icon: <Icons.User /> },
    { id: 'employment', label: 'Employment', icon: <Icons.Briefcase /> },
    ...(canViewCompensation ? [{ id: 'compensation' as Step, label: 'Compensation', icon: <Icons.DollarSign /> }] : []),
    { id: 'review', label: 'Review', icon: <Icons.Check /> },
  ];

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'basic') {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.location) newErrors.location = 'Location is required';
    }

    if (step === 'employment') {
      if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
      if (!formData.department) newErrors.department = 'Department is required';
      if (!formData.hireDate) newErrors.hireDate = 'Hire date is required';
    }

    if (step === 'compensation' && canViewCompensation) {
      if (!formData.salary.trim()) newErrors.salary = 'Salary is required';
      else if (isNaN(Number(formData.salary))) newErrors.salary = 'Salary must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    setCompletedSteps(prev => [...prev, currentStep]);

    const stepOrder = steps.map(s => s.id);
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder = steps.map(s => s.id);
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Build new Employee object from form data
      const locationNames: Record<string, string> = { TLV: 'Tel Aviv', TOR: 'Toronto', US: 'United States' };
      const hireDate = new Date(formData.hireDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);

      const newEmployee: Employee = {
        id: `emp_${Date.now()}`,
        employeeNumber: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
        displayName: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        workEmail: formData.email,
        phone: formData.phone || null,
        avatarUrl: null,
        dateOfBirth: null,
        originalHireDate: formData.hireDate,
        currentStatus: 'active',
        jobTitle: formData.jobTitle,
        jobLevel: 'IC2',
        department: formData.department,
        location: formData.location as LocationCode,
        locationName: locationNames[formData.location] || formData.location,
        managerId: formData.managerId || null,
        managerName: formData.managerId ? employees.find(e => e.id === formData.managerId)?.displayName || null : null,
        employmentType: formData.employmentType as Employee['employmentType'],
        workModel: 'hybrid',
        tenure: {
          years,
          months,
          totalDays: diffDays,
          isAnniversaryThisMonth: hireDate.getMonth() === now.getMonth(),
          nextAnniversaryDate: new Date(now.getFullYear() + 1, hireDate.getMonth(), hireDate.getDate()).toISOString().split('T')[0],
        },
      };

      addEmployee(newEmployee);

      onSuccess?.();
      handleClose();

    } catch (error) {
      console.error('Failed to create employee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: 'TLV',
      jobTitle: '',
      department: '',
      managerId: '',
      hireDate: new Date().toISOString().split('T')[0],
      employmentType: 'full_time',
      salary: '',
      currency: 'USD',
    });
    setCurrentStep('basic');
    setCompletedSteps([]);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  // Options
  const locationOptions = [
    { value: 'TLV', label: 'Tel Aviv' },
    { value: 'TOR', label: 'Toronto' },
    { value: 'US', label: 'United States' },
  ];

  const departmentOptions = [
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Product', label: 'Product' },
    { value: 'Design', label: 'Design' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Finance', label: 'Finance' },
    { value: 'HR', label: 'Human Resources' },
    { value: 'Operations', label: 'Operations' },
  ];

  const employmentTypeOptions = [
    { value: 'full_time', label: 'Full-time' },
    { value: 'part_time', label: 'Part-time' },
    { value: 'contractor', label: 'Contractor' },
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'ILS', label: 'ILS (₪)' },
    { value: 'CAD', label: 'CAD (C$)' },
  ];

  const managerOptions = employees
    .filter(e => e.currentStatus === 'active')
    .map(e => ({ value: e.id, label: e.displayName }));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 251,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        backgroundColor: COLORS.cardBg,
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease',
      }}>
        {/* Animation keyframes */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: COLORS.textDark,
            }}>
              Add New Employee
            </h2>
            <p style={{
              margin: 0,
              marginTop: '4px',
              fontSize: '13px',
              color: COLORS.textMuted,
            }}>
              Fill in the details to create a new employee record
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: COLORS.textMuted,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.canvasBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.Close />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          {/* Step Indicator */}
          <StepIndicator steps={steps} currentStep={currentStep} completedSteps={completedSteps} />

          {/* Step Content */}
          {currentStep === 'basic' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormInput
                  label="First Name"
                  value={formData.firstName}
                  onChange={(v) => updateField('firstName', v)}
                  placeholder="John"
                  required
                  error={errors.firstName}
                />
                <FormInput
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(v) => updateField('lastName', v)}
                  placeholder="Doe"
                  required
                  error={errors.lastName}
                />
              </div>
              <FormInput
                label="Work Email"
                value={formData.email}
                onChange={(v) => updateField('email', v)}
                type="email"
                placeholder="john.doe@company.com"
                required
                error={errors.email}
              />
              <FormInput
                label="Phone Number"
                value={formData.phone}
                onChange={(v) => updateField('phone', v)}
                type="tel"
                placeholder="+1-555-123-4567"
              />
              <FormSelect
                label="Location"
                value={formData.location}
                onChange={(v) => updateField('location', v)}
                options={locationOptions}
                required
                error={errors.location}
              />
            </div>
          )}

          {currentStep === 'employment' && (
            <div>
              <FormInput
                label="Job Title"
                value={formData.jobTitle}
                onChange={(v) => updateField('jobTitle', v)}
                placeholder="Software Engineer"
                required
                error={errors.jobTitle}
              />
              <FormSelect
                label="Department"
                value={formData.department}
                onChange={(v) => updateField('department', v)}
                options={departmentOptions}
                required
                error={errors.department}
              />
              <FormSelect
                label="Manager"
                value={formData.managerId}
                onChange={(v) => updateField('managerId', v)}
                options={managerOptions}
              />
              <FormInput
                label="Hire Date"
                value={formData.hireDate}
                onChange={(v) => updateField('hireDate', v)}
                type="date"
                required
                error={errors.hireDate}
              />
              <FormSelect
                label="Employment Type"
                value={formData.employmentType}
                onChange={(v) => updateField('employmentType', v)}
                options={employmentTypeOptions}
                required
              />
            </div>
          )}

          {currentStep === 'compensation' && canViewCompensation && (
            <div>
              <div style={{
                padding: '12px 16px',
                marginBottom: '20px',
                backgroundColor: '#FEF3C7',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '20px' }}>🔒</span>
                <p style={{ margin: 0, fontSize: '13px', color: '#92400E' }}>
                  Compensation data is visible only to HR Admins and Finance.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <FormInput
                  label="Monthly Salary"
                  value={formData.salary}
                  onChange={(v) => updateField('salary', v)}
                  placeholder="50000"
                  required
                  error={errors.salary}
                />
                <FormSelect
                  label="Currency"
                  value={formData.currency}
                  onChange={(v) => updateField('currency', v as Currency)}
                  options={currencyOptions}
                  required
                />
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div>
              <div style={{
                backgroundColor: COLORS.canvasBg,
                borderRadius: '16px',
                padding: '20px',
              }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: '16px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: COLORS.textDark,
                }}>
                  Review Employee Details
                </h3>

                {/* Basic Info */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Basic Information
                  </p>
                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <ReviewItem label="Name" value={`${formData.firstName} ${formData.lastName}`} />
                    <ReviewItem label="Email" value={formData.email} />
                    <ReviewItem label="Phone" value={formData.phone || 'Not provided'} />
                    <ReviewItem label="Location" value={locationOptions.find(o => o.value === formData.location)?.label || formData.location} />
                  </div>
                </div>

                {/* Employment */}
                <div style={{ marginBottom: canViewCompensation ? '16px' : 0 }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Employment Details
                  </p>
                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <ReviewItem label="Job Title" value={formData.jobTitle} />
                    <ReviewItem label="Department" value={formData.department} />
                    <ReviewItem label="Start Date" value={new Date(formData.hireDate).toLocaleDateString()} />
                    <ReviewItem label="Type" value={employmentTypeOptions.find(o => o.value === formData.employmentType)?.label || ''} />
                  </div>
                </div>

                {/* Compensation (if visible) */}
                {canViewCompensation && formData.salary && (
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Compensation
                    </p>
                    <div style={{ marginTop: '8px' }}>
                      <ReviewItem
                        label="Monthly Salary"
                        value={`${formData.currency === 'USD' ? '$' : formData.currency === 'ILS' ? '₪' : 'C$'}${Number(formData.salary).toLocaleString()} / month`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderTop: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.canvasBg,
        }}>
          <button
            onClick={handleBack}
            disabled={currentStep === 'basic'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: currentStep === 'basic' ? COLORS.border : COLORS.textMuted,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: currentStep === 'basic' ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (currentStep !== 'basic') e.currentTarget.style.backgroundColor = COLORS.cardBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icons.ChevronLeft />
            Back
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'white',
                backgroundColor: isSubmitting ? COLORS.textMuted : COLORS.success,
                border: 'none',
                borderRadius: '10px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.25)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Icons.Loader />
                  Creating...
                </>
              ) : (
                <>
                  <Icons.Check />
                  Create Employee
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'white',
                backgroundColor: COLORS.primary,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 14px 0 rgba(0, 168, 168, 0.25)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#009090'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.primary}
            >
              Continue
              <Icons.ChevronRight />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// REVIEW ITEM HELPER
// =============================================================================

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: '12px', color: COLORS.textMuted }}>{label}</p>
      <p style={{ margin: 0, marginTop: '2px', fontSize: '14px', fontWeight: 500, color: COLORS.textDark }}>{value}</p>
    </div>
  );
}

export default AddEmployeeModal;
