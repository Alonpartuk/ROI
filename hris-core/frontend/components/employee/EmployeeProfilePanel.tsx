/**
 * Employee Profile Panel - Octup Design System
 *
 * Premium slide-over panel with:
 * - Octup brand colors and gradients
 * - Rounded 3xl cards with soft shadows
 * - Tabbed interface (pills style)
 * - Consistent with Reports Dashboard design
 */

import React, { useState } from 'react';
import { Avatar, Badge, Tabs, Card, ProgressBar, Button } from '../common';
import { Employee, SalaryRecord, EquityGrant, Asset, Document, TimelineEvent, Currency } from '../../types';
import { Timeline } from './Timeline';
import { useHRIS } from '../../context/HRISContext';

// =============================================================================
// MOCK DATA (Would come from API in production)
// =============================================================================

const MOCK_SALARY_HISTORY: SalaryRecord[] = [
  {
    id: 'sal_1',
    effectiveDate: '2023-01-01',
    endDate: null,
    amount: 65000,
    currency: 'ILS',
    frequency: 'monthly',
    annualizedAmountUsd: 210600,
    reason: 'merit',
    reasonNotes: 'Annual performance review - Exceeds expectations',
  },
  {
    id: 'sal_2',
    effectiveDate: '2022-01-01',
    endDate: '2022-12-31',
    amount: 55000,
    currency: 'ILS',
    frequency: 'monthly',
    annualizedAmountUsd: 178200,
    reason: 'hire',
    reasonNotes: 'Initial offer',
  },
];

const MOCK_EQUITY: EquityGrant[] = [
  {
    id: 'grant_1',
    grantNumber: 'GRANT-002',
    grantDate: '2022-01-01',
    grantType: 'iso',
    sharesGranted: 1500000,
    sharesVested: 750000,
    sharesExercised: 0,
    sharesUnvested: 750000,
    exercisePrice: 0.01,
    vestingType: 'linear',
    vestingStartDate: '2022-01-01',
    cliffMonths: null,
    totalVestingMonths: 48,
    nextVestingDate: '2024-03-01',
    nextVestingShares: 31250,
    vestingProgress: 50,
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
  {
    id: 'asset_003',
    assetTag: 'MON-TLV-001',
    category: 'monitor',
    manufacturer: 'LG',
    model: 'UltraFine 27" 5K',
    serialNumber: 'LG27UK650-W123',
    purchaseDate: '2023-06-15',
    purchasePrice: 699,
    currency: 'USD',
    status: 'assigned',
    assignedToId: 'emp_002',
    assignedToName: 'Yael Levi',
    assignedDate: '2023-06-20',
    locationCode: 'TLV',
    notes: null,
    warrantyExpiry: '2025-06-15',
  },
];

const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc_1',
    name: 'Employment Contract',
    category: 'contract',
    uploadedAt: '2022-01-01T00:00:00Z',
    fileType: 'pdf',
    fileSizeBytes: 245000,
    visibility: 'private_employee',
    requiresAcknowledgment: false,
    acknowledgedAt: null,
  },
  {
    id: 'doc_2',
    name: 'Form 101 - 2024',
    category: 'tax_form',
    uploadedAt: '2024-01-15T00:00:00Z',
    fileType: 'pdf',
    fileSizeBytes: 156000,
    visibility: 'private_hr',
    requiresAcknowledgment: true,
    acknowledgedAt: '2024-01-16T10:30:00Z',
  },
];

const MOCK_TIMELINE: TimelineEvent[] = [
  {
    id: 'evt_1',
    eventType: 'employment',
    eventDate: '2022-01-01',
    title: 'Joined as CTO',
    description: 'Started at TechStartup as Chief Technology Officer',
    details: { jobTitle: 'CTO', department: 'Engineering' },
    icon: 'briefcase',
    color: 'blue',
  },
  {
    id: 'evt_2',
    eventType: 'equity_grant',
    eventDate: '2022-01-01',
    title: 'Equity Grant',
    description: 'Received 1,500,000 ISO options at $0.01 strike',
    details: { shares: 1500000, exercisePrice: 0.01 },
    icon: 'chart',
    color: 'purple',
  },
  {
    id: 'evt_3',
    eventType: 'salary',
    eventDate: '2023-01-01',
    title: 'Salary Increase',
    description: 'Annual merit increase: ₪55,000 → ₪65,000/month',
    details: { oldAmount: 55000, newAmount: 65000, reason: 'merit' },
    icon: 'dollar',
    color: 'green',
  },
  {
    id: 'evt_4',
    eventType: 'equipment',
    eventDate: '2023-06-20',
    title: 'Equipment Assigned',
    description: 'MacBook Pro 14" M3 and LG UltraFine Monitor',
    details: { items: ['MacBook Pro 14" M3', 'LG UltraFine 27" 5K'] },
    icon: 'laptop',
    color: 'gray',
  },
  {
    id: 'evt_5',
    eventType: 'vesting',
    eventDate: '2024-03-01',
    title: 'Next Vesting',
    description: '31,250 shares vesting',
    details: { shares: 31250 },
    icon: 'calendar',
    color: 'indigo',
  },
];

// =============================================================================
// HELPERS
// =============================================================================

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  ILS: '₪',
  CAD: 'C$',
};

function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${new Intl.NumberFormat('en-US').format(amount)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// EMPLOYEE PROFILE PANEL - OCTUP STYLE
// =============================================================================

interface EmployeeProfilePanelProps {
  employee: Employee;
}

type TabId = 'personal' | 'compensation' | 'equity' | 'equipment' | 'documents' | 'timeline';

export function EmployeeProfilePanel({ employee }: EmployeeProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('personal');

  const tabs = [
    { id: 'personal', label: 'Personal' },
    { id: 'compensation', label: 'Compensation' },
    { id: 'equity', label: 'Equity' },
    { id: 'equipment', label: 'Equipment', count: MOCK_ASSETS.length },
    { id: 'documents', label: 'Documents', count: MOCK_DOCUMENTS.length },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="space-y-6">
      {/* Header - Octup Premium Style */}
      <div className="flex items-start gap-5">
        <Avatar name={employee.displayName} size="xl" status="online" />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{employee.displayName}</h2>
          <p className="text-slate-600 mt-0.5">{employee.jobTitle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="primary" size="md" pill>{employee.department}</Badge>
            <Badge variant="default" size="md" pill>{employee.jobLevel}</Badge>
            <Badge
              variant={employee.currentStatus === 'active' ? 'secondary' : 'warning'}
              size="md"
              pill
              dot
            >
              {employee.currentStatus}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </Button>
      </div>

      {/* Tabs - Octup Pills Style */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as TabId)} variant="pills" />

      {/* Tab Content */}
      <div className="mt-6 animate-fade-in">
        {activeTab === 'personal' && <PersonalInfoTab employee={employee} />}
        {activeTab === 'compensation' && <CompensationTab salaryHistory={MOCK_SALARY_HISTORY} />}
        {activeTab === 'equity' && <EquityTab grants={MOCK_EQUITY} />}
        {activeTab === 'equipment' && <EquipmentTab assets={MOCK_ASSETS} />}
        {activeTab === 'documents' && <DocumentsTab documents={MOCK_DOCUMENTS} />}
        {activeTab === 'timeline' && <Timeline events={MOCK_TIMELINE} />}
      </div>
    </div>
  );
}

// =============================================================================
// PERSONAL INFO TAB - OCTUP STYLE WITH PII MASKING
// =============================================================================

function PersonalInfoTab({ employee }: { employee: Employee }) {
  const { maskPII, user } = useHRIS();

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Section title="Contact Information" icon="📧">
        <InfoGrid>
          <InfoItem label="Work Email" value={employee.workEmail} copyable />
          <InfoItem label="Phone" value={maskPII.phone(employee.phone) || 'Not provided'} />
          <InfoItem label="Location" value={employee.locationName} />
        </InfoGrid>
      </Section>

      {/* Employment Details */}
      <Section title="Employment Details" icon="💼">
        <InfoGrid>
          <InfoItem label="Employee ID" value={employee.employeeNumber} />
          <InfoItem label="Start Date" value={formatDate(employee.originalHireDate)} />
          <InfoItem
            label="Tenure"
            value={`${employee.tenure.years}y ${employee.tenure.months}m`}
            highlight
          />
          <InfoItem label="Employment Type" value={employee.employmentType.replace('_', ' ')} />
          <InfoItem label="Work Model" value={employee.workModel} />
          <InfoItem label="Manager" value={employee.managerName || 'No manager'} />
        </InfoGrid>
      </Section>

      {/* Role Information */}
      <Section title="Role Information" icon="🎯">
        <InfoGrid>
          <InfoItem label="Department" value={employee.department} />
          <InfoItem label="Job Title" value={employee.jobTitle} />
          <InfoItem label="Job Level" value={employee.jobLevel} />
        </InfoGrid>
      </Section>
    </div>
  );
}

// =============================================================================
// COMPENSATION TAB - OCTUP STYLE WITH ACCESS CONTROL
// =============================================================================

function CompensationTab({ salaryHistory }: { salaryHistory: SalaryRecord[] }) {
  const { maskPII } = useHRIS();
  const canViewSalary = maskPII.canViewSalary();
  const currentSalary = salaryHistory.find(s => !s.endDate);

  // If user doesn't have permission, show access denied message
  if (!canViewSalary) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mb-4">
          🔒
        </div>
        <p className="text-slate-700 font-semibold">Access Restricted</p>
        <p className="text-slate-500 text-sm mt-2">
          You don't have permission to view compensation data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Compensation - Premium Card */}
      {currentSalary && (
        <div className="bg-gradient-to-br from-[#00CBC0]/5 via-[#00CBC0]/10 to-[#809292]/5 rounded-3xl p-6 border border-[#00CBC0]/20 relative overflow-hidden">
          {/* Accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00CBC0] to-[#809292]" />

          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-[#00a89e] font-semibold">Current Salary</p>
              <p className="text-4xl font-bold text-slate-900 mt-2 tracking-tight">
                {formatCurrency(currentSalary.amount, currentSalary.currency)}
                <span className="text-lg font-normal text-slate-500 ml-1">
                  /{currentSalary.frequency === 'annual' ? 'year' : 'month'}
                </span>
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Annualized: <span className="font-semibold text-slate-700">{formatCurrency(currentSalary.annualizedAmountUsd, 'USD')}</span> USD
              </p>
            </div>
            <Badge variant="secondary" size="lg" pill>Active</Badge>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Effective since {formatDate(currentSalary.effectiveDate)}
          </p>
        </div>
      )}

      {/* Salary History */}
      <Section title="Salary History" icon="📈">
        <div className="space-y-3">
          {salaryHistory.map((record) => (
            <div
              key={record.id}
              className={`p-4 rounded-2xl border transition-all duration-150 hover:shadow-soft ${
                !record.endDate
                  ? 'border-[#00CBC0]/30 bg-[#00CBC0]/5'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900 text-lg">
                    {formatCurrency(record.amount, record.currency)}
                    <span className="text-slate-500 font-normal text-sm ml-1">
                      /{record.frequency === 'annual' ? 'year' : 'month'}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatDate(record.effectiveDate)}
                    {record.endDate ? ` → ${formatDate(record.endDate)}` : ' → Present'}
                  </p>
                </div>
                <Badge
                  variant={
                    record.reason === 'promotion' ? 'secondary' :
                    record.reason === 'hire' ? 'primary' : 'default'
                  }
                  size="md"
                  pill
                >
                  {record.reason.replace('_', ' ')}
                </Badge>
              </div>
              {record.reasonNotes && (
                <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5">{record.reasonNotes}</p>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// =============================================================================
// EQUITY TAB - OCTUP STYLE WITH ACCESS CONTROL
// =============================================================================

function EquityTab({ grants }: { grants: EquityGrant[] }) {
  const { maskPII } = useHRIS();
  const canViewEquity = maskPII.canViewEquity();

  // If user doesn't have permission, show access denied message
  if (!canViewEquity) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mb-4">
          🔒
        </div>
        <p className="text-slate-700 font-semibold">Access Restricted</p>
        <p className="text-slate-500 text-sm mt-2">
          You don't have permission to view equity data.
        </p>
      </div>
    );
  }

  const totals = grants.reduce(
    (acc, grant) => ({
      granted: acc.granted + grant.sharesGranted,
      vested: acc.vested + grant.sharesVested,
      exercised: acc.exercised + grant.sharesExercised,
      unvested: acc.unvested + grant.sharesUnvested,
    }),
    { granted: 0, vested: 0, exercised: 0, unvested: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards - Octup Style */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Total Granted" value={totals.granted.toLocaleString()} color="primary" />
        <MetricCard label="Vested" value={totals.vested.toLocaleString()} color="secondary" />
        <MetricCard label="Unvested" value={totals.unvested.toLocaleString()} color="warning" />
        <MetricCard label="Exercised" value={totals.exercised.toLocaleString()} color="accent" />
      </div>

      {/* Grants */}
      <Section title="Equity Grants" icon="📊">
        {grants.map(grant => (
          <div key={grant.id} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 hover:shadow-soft transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-900 text-lg">{grant.grantNumber}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {grant.grantType.toUpperCase()} • Granted {formatDate(grant.grantDate)}
                </p>
              </div>
              <Badge variant="primary" size="lg" pill>
                {grant.vestingProgress}% Vested
              </Badge>
            </div>

            {/* Vesting Progress - Octup Style */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600 font-medium">Vesting Progress</span>
                <span className="text-slate-700 font-semibold tabular-nums">
                  {grant.sharesVested.toLocaleString()} / {grant.sharesGranted.toLocaleString()}
                </span>
              </div>
              <ProgressBar value={grant.vestingProgress} color="secondary" size="md" />
            </div>

            {/* Grant Details */}
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Exercise Price" value={formatCurrency(grant.exercisePrice || 0, 'USD')} />
              <InfoItem label="Vesting Type" value={grant.vestingType.replace('_', ' ')} />
              {grant.nextVestingDate && (
                <>
                  <InfoItem label="Next Vesting" value={formatDate(grant.nextVestingDate)} highlight />
                  <InfoItem label="Shares Vesting" value={grant.nextVestingShares?.toLocaleString() || '0'} />
                </>
              )}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

// =============================================================================
// EQUIPMENT TAB - OCTUP STYLE
// =============================================================================

function EquipmentTab({ assets }: { assets: Asset[] }) {
  const getCategoryIcon = (category: Asset['category']) => {
    const icons: Record<Asset['category'], string> = {
      laptop: '💻',
      monitor: '🖥️',
      keyboard: '⌨️',
      mouse: '🖱️',
      headset: '🎧',
      phone: '📱',
      other: '📦',
    };
    return icons[category] || '📦';
  };

  return (
    <div className="space-y-4">
      {assets.map(asset => (
        <div
          key={asset.id}
          className={`p-5 rounded-2xl border transition-all duration-150 hover:shadow-soft ${
            !asset.serialNumber
              ? 'border-amber-200 bg-amber-50/50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
              {getCategoryIcon(asset.category)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900">
                    {asset.manufacturer} {asset.model}
                  </p>
                  <p className="text-sm text-slate-500 font-mono">{asset.assetTag}</p>
                </div>
                {!asset.serialNumber && (
                  <Badge variant="warning" size="md" pill dot pulse>Missing S/N</Badge>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoItem label="Serial Number" value={asset.serialNumber || 'Not recorded'} />
                <InfoItem label="Assigned" value={asset.assignedDate ? formatDate(asset.assignedDate) : '-'} />
                {asset.warrantyExpiry && (
                  <InfoItem label="Warranty Until" value={formatDate(asset.warrantyExpiry)} />
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {assets.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mb-4">
            📦
          </div>
          <p className="text-slate-500 font-medium">No equipment assigned</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DOCUMENTS TAB - OCTUP STYLE
// =============================================================================

function DocumentsTab({ documents }: { documents: Document[] }) {
  const getDocIcon = (fileType: string) => {
    if (fileType === 'pdf') return '📄';
    if (['doc', 'docx'].includes(fileType)) return '📝';
    if (['xls', 'xlsx'].includes(fileType)) return '📊';
    return '📎';
  };

  const getCategoryColor = (category: Document['category']) => {
    const colors: Record<string, string> = {
      contract: 'bg-blue-100 text-blue-700',
      tax_form: 'bg-[#00CBC0]/10 text-[#00a89e]',
      performance_review: 'bg-purple-100 text-purple-700',
    };
    return colors[category] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-3">
      {documents.map(doc => (
        <div
          key={doc.id}
          className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#809292] hover:shadow-soft cursor-pointer transition-all duration-150 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl group-hover:bg-slate-200 transition-colors">
              {getDocIcon(doc.fileType)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{doc.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-lg ${getCategoryColor(doc.category)}`}>
                  {doc.category.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-500">{formatFileSize(doc.fileSizeBytes)}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{formatDate(doc.uploadedAt)}</span>
              </div>
            </div>
            {doc.requiresAcknowledgment && (
              <Badge
                variant={doc.acknowledgedAt ? 'secondary' : 'warning'}
                size="md"
                pill
                dot
              >
                {doc.acknowledgedAt ? 'Signed' : 'Pending'}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS - OCTUP STYLE
// =============================================================================

function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>;
}

function InfoItem({ label, value, copyable, highlight }: { label: string; value: string; copyable?: boolean; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</dt>
      <dd className={`text-sm mt-1 ${highlight ? 'text-[#00CBC0] font-semibold' : 'text-slate-900'}`}>
        {value}
        {copyable && (
          <button className="ml-2 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </dd>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: 'primary' | 'secondary' | 'warning' | 'accent' }) {
  const colorClasses = {
    primary: 'from-[#809292]/5 to-[#809292]/10 border-[#809292]/20',
    secondary: 'from-[#00CBC0]/5 to-[#00CBC0]/10 border-[#00CBC0]/20',
    warning: 'from-[#F9BD63]/5 to-[#F9BD63]/10 border-[#F9BD63]/20',
    accent: 'from-[#FF3489]/5 to-[#FF3489]/10 border-[#FF3489]/20',
  };

  const accentColors = {
    primary: 'bg-[#809292]',
    secondary: 'bg-[#00CBC0]',
    warning: 'bg-[#F9BD63]',
    accent: 'bg-[#FF3489]',
  };

  return (
    <div className={`p-4 rounded-2xl border bg-gradient-to-br ${colorClasses[color]} relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentColors[color]}`} />
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
    </div>
  );
}

export default EmployeeProfilePanel;
