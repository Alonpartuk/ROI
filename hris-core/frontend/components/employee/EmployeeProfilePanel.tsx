/**
 * Employee Profile Panel - Octup Design System
 *
 * Premium slide-over panel with:
 * - Octup brand colors and gradients
 * - Rounded 3xl cards with soft shadows
 * - Tabbed interface (pills style)
 * - Inline styles (no Tailwind)
 */

import React, { useState } from 'react';
import { Employee, SalaryRecord, EquityGrant, Asset, Document, TimelineEvent, Currency, PerformanceReview, OKR } from '../../types';
import { Timeline } from './Timeline';
import { useHRIS } from '../../context/HRISContext';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const COLORS = {
  bg: '#F3F4F6',
  card: '#FFFFFF',
  primary: '#00A8A8',
  secondary: '#00CBC0',
  accent: '#FF3489',
  warning: '#F9BD63',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  success: '#10B981',
  error: '#EF4444',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate900: '#0F172A',
};

// =============================================================================
// MOCK DATA (Would come from API in production)
// =============================================================================

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
    description: 'Annual merit increase: $55,000 -> $65,000/month',
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
// INLINE SVG ICONS
// =============================================================================

const EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// =============================================================================
// AVATAR COMPONENT (Inline)
// =============================================================================

function Avatar({ name, size = 'md', avatarUrl }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; avatarUrl?: string | null }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const sizes = {
    sm: { width: 32, height: 32, fontSize: 12 },
    md: { width: 40, height: 40, fontSize: 14 },
    lg: { width: 48, height: 48, fontSize: 16 },
    xl: { width: 64, height: 64, fontSize: 20 },
  };
  const s = sizes[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: s.width,
          height: s.height,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div style={{
      width: s.width,
      height: s.height,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: s.fontSize,
      fontWeight: 600,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// =============================================================================
// BADGE COMPONENT (Inline)
// =============================================================================

function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false
}: {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'warning' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}) {
  const variants = {
    default: { bg: COLORS.slate100, color: COLORS.slate700 },
    primary: { bg: 'rgba(0, 168, 168, 0.1)', color: COLORS.primary },
    secondary: { bg: 'rgba(0, 203, 192, 0.1)', color: COLORS.secondary },
    warning: { bg: 'rgba(249, 189, 99, 0.15)', color: '#D97706' },
    accent: { bg: 'rgba(255, 52, 137, 0.1)', color: COLORS.accent },
  };
  const sizes = {
    sm: { padding: '2px 8px', fontSize: 11 },
    md: { padding: '4px 10px', fontSize: 12 },
    lg: { padding: '6px 12px', fontSize: 13 },
  };
  const v = variants[variant];
  const sz = sizes[size];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: sz.padding,
      fontSize: sz.fontSize,
      fontWeight: 600,
      borderRadius: 9999,
      backgroundColor: v.bg,
      color: v.color,
    }}>
      {dot && (
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: v.color,
        }} />
      )}
      {children}
    </span>
  );
}

// =============================================================================
// TABS COMPONENT (Inline - Pills Style)
// =============================================================================

interface Tab {
  id: string;
  label: string;
  count?: number;
}

function Tabs({ tabs, activeTab, onChange }: { tabs: Tab[]; activeTab: string; onChange: (id: string) => void }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: 4,
      backgroundColor: COLORS.slate100,
      borderRadius: 12,
      overflowX: 'auto',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: activeTab === tab.id ? 600 : 500,
            color: activeTab === tab.id ? COLORS.text : COLORS.muted,
            backgroundColor: activeTab === tab.id ? COLORS.card : 'transparent',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              padding: '2px 6px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 9999,
              backgroundColor: activeTab === tab.id ? COLORS.primary : COLORS.slate200,
              color: activeTab === tab.id ? 'white' : COLORS.muted,
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// PROGRESS BAR COMPONENT (Inline)
// =============================================================================

function ProgressBar({ value, color = 'primary' }: { value: number; color?: 'primary' | 'secondary' | 'warning' }) {
  const colors = {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    warning: COLORS.warning,
  };

  return (
    <div style={{
      width: '100%',
      height: 8,
      backgroundColor: COLORS.slate200,
      borderRadius: 9999,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${value}%`,
        height: '100%',
        backgroundColor: colors[color],
        borderRadius: 9999,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}

// =============================================================================
// BUTTON COMPONENT (Inline)
// =============================================================================

function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md'
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md';
}) {
  const [isHovered, setIsHovered] = useState(false);

  const variants = {
    primary: {
      bg: COLORS.primary,
      hoverBg: '#009999',
      color: 'white',
    },
    ghost: {
      bg: 'transparent',
      hoverBg: COLORS.slate100,
      color: COLORS.muted,
    },
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '10px 16px', fontSize: 14 },
  };

  const v = variants[variant];
  const s = sizes[size];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 500,
        color: v.color,
        backgroundColor: isHovered ? v.hoverBg : v.bg,
        border: 'none',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}

// =============================================================================
// EMPLOYEE PROFILE PANEL - OCTUP STYLE
// =============================================================================

interface EmployeeProfilePanelProps {
  employee: Employee;
  defaultTab?: string;
}

type TabId = 'personal' | 'compensation' | 'equity' | 'performance' | 'equipment' | 'documents' | 'timeline';

export function EmployeeProfilePanel({ employee, defaultTab }: EmployeeProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>((defaultTab as TabId) || 'personal');
  const [isEditMode, setIsEditMode] = useState(false);
  const { user, getEmployeeGrants, getEmployeeDocuments, updateEmployee, getSalaryHistory, assets } = useHRIS();
  const employeeGrants = getEmployeeGrants(employee.id);
  const employeeDocs = getEmployeeDocuments(employee.id);
  const employeeAssets = assets.filter(a => a.assignedToId === employee.id);

  // Permission checks
  const isAdmin = user?.roles.includes('hr_admin') || user?.roles.includes('admin');
  const isFinance = user?.roles.includes('finance');
  const isOwnProfile = user?.employeeId === employee.id;
  const canEdit = isAdmin || isOwnProfile;
  const canViewCompensation = isAdmin || isFinance;
  const canViewEquity = isAdmin || isFinance || isOwnProfile;

  // Build tabs based on permissions
  const tabs: Tab[] = [
    { id: 'personal', label: 'Personal' },
    ...(canViewCompensation ? [{ id: 'compensation', label: 'Compensation' }] : []),
    ...(canViewEquity ? [{ id: 'equity', label: 'Equity' }] : []),
    { id: 'performance', label: 'Performance' },
    { id: 'equipment', label: 'Equipment', count: employeeAssets.length },
    { id: 'documents', label: 'Documents', count: employeeDocs.length },
    { id: 'timeline', label: 'Timeline' },
  ];

  const handleEditClick = () => {
    if (canEdit) {
      setIsEditMode(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header - Octup Premium Style */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        {/* Avatar with upload overlay */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar name={employee.displayName} size="xl" avatarUrl={employee.avatarUrl} />
          {canEdit && (
            <>
              <input
                id={`avatar-upload-${employee.id}`}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const dataUrl = ev.target?.result as string;
                    updateEmployee(employee.id, { avatarUrl: dataUrl });
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
              <label
                htmlFor={`avatar-upload-${employee.id}`}
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: COLORS.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </label>
            </>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            color: COLORS.slate900,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            {employee.displayName}
          </h2>
          <p style={{
            fontSize: 14,
            color: COLORS.slate600,
            margin: 0,
            marginTop: 2,
          }}>
            {employee.jobTitle}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <Badge variant="primary">{employee.department}</Badge>
            <Badge variant="default">{employee.jobLevel}</Badge>
            <Badge
              variant={employee.currentStatus === 'active' ? 'secondary' : 'warning'}
              dot
            >
              {employee.currentStatus}
            </Badge>
          </div>
        </div>
        {/* Edit button - only shown to admins or the employee themselves */}
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={handleEditClick}>
            <EditIcon />
          </Button>
        )}
      </div>

      {/* Permission notice for non-admins viewing limited data */}
      {!canViewCompensation && !isOwnProfile && (
        <div style={{
          backgroundColor: 'rgba(249, 189, 99, 0.1)',
          border: '1px solid rgba(249, 189, 99, 0.3)',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <p style={{ fontSize: 14, color: '#92400E', margin: 0 }}>
            Compensation and detailed financial information is restricted. Contact HR for access.
          </p>
        </div>
      )}

      {/* Tabs - Octup Pills Style */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      {/* Tab Content */}
      <div>
        {activeTab === 'personal' && (
          <PersonalInfoTab
            employee={employee}
            isEditMode={isEditMode}
            onSave={(updates) => { updateEmployee(employee.id, updates); setIsEditMode(false); }}
            onCancel={() => setIsEditMode(false)}
          />
        )}
        {activeTab === 'compensation' && canViewCompensation && <CompensationTab employeeId={employee.id} />}
        {activeTab === 'equity' && canViewEquity && <EquityTab grants={employeeGrants} employeeId={employee.id} />}
        {activeTab === 'performance' && <PerformanceTab employeeId={employee.id} />}
        {activeTab === 'equipment' && <EquipmentTab assets={employeeAssets} />}
        {activeTab === 'documents' && <DocumentsTab employeeId={employee.id} />}
        {activeTab === 'timeline' && <Timeline events={MOCK_TIMELINE} />}
      </div>
    </div>
  );
}

// =============================================================================
// PERSONAL INFO TAB - OCTUP STYLE WITH PII MASKING
// =============================================================================

function PersonalInfoTab({ employee, isEditMode, onSave, onCancel }: {
  employee: Employee;
  isEditMode?: boolean;
  onSave?: (updates: Partial<Employee>) => void;
  onCancel?: () => void;
}) {
  const { maskPII } = useHRIS();

  // Editable fields
  const [editName, setEditName] = useState(employee.displayName);
  const [editEmail, setEditEmail] = useState(employee.workEmail);
  const [editPhone, setEditPhone] = useState(employee.phone || '');
  const [editJobTitle, setEditJobTitle] = useState(employee.jobTitle);
  const [editDepartment, setEditDepartment] = useState(employee.department);
  const [editLocation, setEditLocation] = useState(employee.locationName);
  const [editEmploymentType, setEditEmploymentType] = useState(employee.employmentType);

  // Reset fields when employee changes
  React.useEffect(() => {
    setEditName(employee.displayName);
    setEditEmail(employee.workEmail);
    setEditPhone(employee.phone || '');
    setEditJobTitle(employee.jobTitle);
    setEditDepartment(employee.department);
    setEditLocation(employee.locationName);
    setEditEmploymentType(employee.employmentType);
  }, [employee]);

  const handleSave = () => {
    onSave?.({
      displayName: editName,
      workEmail: editEmail,
      phone: editPhone,
      jobTitle: editJobTitle,
      department: editDepartment,
      locationName: editLocation,
      employmentType: editEmploymentType,
    });
  };

  const handleCancel = () => {
    setEditName(employee.displayName);
    setEditEmail(employee.workEmail);
    setEditPhone(employee.phone || '');
    setEditJobTitle(employee.jobTitle);
    setEditDepartment(employee.department);
    setEditLocation(employee.locationName);
    setEditEmploymentType(employee.employmentType);
    onCancel?.();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    fontSize: 14,
    border: `1px solid ${COLORS.slate200}`,
    borderRadius: 10,
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    color: COLORS.text,
    backgroundColor: 'white',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 36,
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = COLORS.primary;
    e.target.style.boxShadow = `0 0 0 3px rgba(0, 168, 168, 0.1)`;
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = COLORS.slate200;
    e.target.style.boxShadow = 'none';
  };

  if (isEditMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Section title="Contact Information" icon="">
          <InfoGrid>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 6 }}>Full Name</label>
              <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 6 }}>Work Email</label>
              <input style={inputStyle} value={editEmail} onChange={e => setEditEmail(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 6 }}>Phone</label>
              <input style={inputStyle} value={editPhone} onChange={e => setEditPhone(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 6 }}>Location</label>
              <select style={selectStyle} value={editLocation} onChange={e => setEditLocation(e.target.value)}>
                <option value="Tel Aviv, IL">Tel Aviv, IL</option>
                <option value="New York, US">New York, US</option>
                <option value="Toronto, CA">Toronto, CA</option>
                <option value="London, UK">London, UK</option>
              </select>
            </div>
          </InfoGrid>
        </Section>

        <Section title="Role Information" icon="">
          <InfoGrid>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 6 }}>Job Title</label>
              <input style={inputStyle} value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 6 }}>Department</label>
              <select style={selectStyle} value={editDepartment} onChange={e => setEditDepartment(e.target.value)}>
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 6 }}>Employment Type</label>
              <select style={selectStyle} value={editEmploymentType} onChange={e => setEditEmploymentType(e.target.value as Employee['employmentType'])}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contractor">Contractor</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </InfoGrid>
        </Section>

        {/* Save / Cancel buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              color: COLORS.muted,
              backgroundColor: COLORS.slate100,
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              backgroundColor: COLORS.primary,
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Contact Information */}
      <Section title="Contact Information" icon="">
        <InfoGrid>
          <InfoItem label="Work Email" value={employee.workEmail} copyable />
          <InfoItem label="Phone" value={maskPII.phone(employee.phone) || 'Not provided'} />
          <InfoItem label="Location" value={employee.locationName} />
        </InfoGrid>
      </Section>

      {/* Employment Details */}
      <Section title="Employment Details" icon="">
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
      <Section title="Role Information" icon="">
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

function CompensationTab({ employeeId }: { employeeId: string }) {
  const { maskPII, formatCurrency: ctxFormatCurrency, displayCurrency, convertToDisplayCurrency, getSalaryHistory, addSalaryRecord } = useHRIS();
  const salaryHistory = getSalaryHistory(employeeId);
  const canViewSalary = maskPII.canViewSalary();
  const currentSalary = salaryHistory.find(s => !s.endDate);

  // Add salary form state
  const [showAddSalary, setShowAddSalary] = useState(false);
  const [newSalaryAmount, setNewSalaryAmount] = useState('');
  const [newSalaryCurrency, setNewSalaryCurrency] = useState('USD');
  const [newSalaryFrequency, setNewSalaryFrequency] = useState<'annual' | 'monthly'>('monthly');
  const [newSalaryEffectiveDate, setNewSalaryEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSalaryReason, setNewSalaryReason] = useState<import('../../types').SalaryChangeReason>('merit');
  const [newSalaryNotes, setNewSalaryNotes] = useState('');

  const handleAddSalary = () => {
    const amount = parseFloat(newSalaryAmount);
    if (!amount || amount <= 0) return;
    const annualized = newSalaryFrequency === 'monthly' ? amount * 12 : amount;
    const record: import('../../types').SalaryRecord = {
      id: `sal_${Date.now()}`,
      effectiveDate: newSalaryEffectiveDate,
      endDate: null,
      amount,
      currency: newSalaryCurrency as any,
      frequency: newSalaryFrequency,
      annualizedAmountUsd: annualized,
      reason: newSalaryReason,
      reasonNotes: newSalaryNotes || null,
    };
    addSalaryRecord(employeeId, record);
    setShowAddSalary(false);
    setNewSalaryAmount('');
    setNewSalaryNotes('');
  };

  // Sort salary history ascending by effective date for the chart
  const sortedHistory = [...salaryHistory].sort((a, b) =>
    new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );
  const firstSalary = sortedHistory[0];
  const latestSalary = sortedHistory[sortedHistory.length - 1];
  const totalIncreasePct = firstSalary && latestSalary && firstSalary.annualizedAmountUsd > 0
    ? ((latestSalary.annualizedAmountUsd - firstSalary.annualizedAmountUsd) / firstSalary.annualizedAmountUsd * 100)
    : 0;

  // If user doesn't have permission, show access denied message
  if (!canViewSalary) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{
          width: 64,
          height: 64,
          margin: '0 auto',
          borderRadius: 16,
          backgroundColor: COLORS.slate100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          marginBottom: 16,
        }}>
          🔒
        </div>
        <p style={{ color: COLORS.slate700, fontWeight: 600, margin: 0 }}>Access Restricted</p>
        <p style={{ color: COLORS.slate500, fontSize: 14, marginTop: 8 }}>
          You don't have permission to view compensation data.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Salary Evolution Chart */}
      {sortedHistory.length >= 2 && (
        <div style={{
          backgroundColor: COLORS.card,
          borderRadius: 16,
          padding: 20,
          border: `1px solid ${COLORS.slate200}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.slate900, margin: 0 }}>Salary Evolution</p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              backgroundColor: totalIncreasePct >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: totalIncreasePct >= 0 ? COLORS.success : COLORS.error,
            }}>
              {totalIncreasePct >= 0 ? '+' : ''}{totalIncreasePct.toFixed(1)}% total
            </span>
          </div>
          <div style={{ height: 160 }}>
            {(() => {
              const chartData = sortedHistory.map(r => ({
                date: r.effectiveDate,
                value: convertToDisplayCurrency(r.annualizedAmountUsd, 'USD'),
                label: new Date(r.effectiveDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              }));
              const values = chartData.map(d => d.value);
              const minVal = Math.min(...values) * 0.9;
              const maxVal = Math.max(...values) * 1.05;
              const range = maxVal - minVal || 1;

              const chartLeft = 55;
              const chartRight = 420;
              const chartTop = 10;
              const chartBottom = 130;
              const chartWidth = chartRight - chartLeft;
              const chartHeight = chartBottom - chartTop;

              const getX = (i: number) => chartLeft + (chartData.length === 1 ? chartWidth / 2 : (i / (chartData.length - 1)) * chartWidth);
              const getY = (val: number) => chartBottom - ((val - minVal) / range) * chartHeight;

              const symbols: Record<string, string> = { USD: '$', ILS: '\u20AA', CAD: 'C$' };
              const sym = symbols[displayCurrency] || '$';
              const fmtAxis = (v: number) => v >= 1000000 ? `${sym}${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${sym}${(v / 1000).toFixed(0)}K` : `${sym}${Math.round(v)}`;

              return (
                <svg width="100%" height="100%" viewBox="0 0 440 160" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF3489" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#FF3489" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines + Y-axis labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const val = maxVal - pct * range;
                    const y = chartTop + pct * chartHeight;
                    return (
                      <g key={i}>
                        <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={COLORS.slate200} strokeWidth="1" />
                        <text x={chartLeft - 6} y={y + 4} textAnchor="end" fontSize="10" fill={COLORS.slate500}>
                          {fmtAxis(val)}
                        </text>
                      </g>
                    );
                  })}
                  {/* Area fill */}
                  <path
                    d={`M${getX(0)},${getY(chartData[0].value)} ${chartData.map((d, i) => `L${getX(i)},${getY(d.value)}`).join(' ')} L${getX(chartData.length - 1)},${chartBottom} L${getX(0)},${chartBottom} Z`}
                    fill="url(#salaryGradient)"
                  />
                  {/* Line */}
                  <path
                    d={`M${getX(0)},${getY(chartData[0].value)} ${chartData.map((d, i) => `L${getX(i)},${getY(d.value)}`).join(' ')}`}
                    fill="none"
                    stroke="#FF3489"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Data points */}
                  {chartData.map((d, i) => (
                    <circle key={i} cx={getX(i)} cy={getY(d.value)} r={i === chartData.length - 1 ? 5 : 3.5}
                      fill={i === chartData.length - 1 ? '#FF3489' : 'white'} stroke="#FF3489" strokeWidth="2" />
                  ))}
                  {/* X-axis labels */}
                  {chartData.map((d, i) => (
                    <text key={i} x={getX(i)} y={chartBottom + 18} textAnchor="middle" fontSize="10"
                      fill={i === chartData.length - 1 ? '#FF3489' : COLORS.slate500}
                      fontWeight={i === chartData.length - 1 ? 600 : 400}>
                      {d.label}
                    </text>
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>
      )}

      {/* Current Compensation - Premium Card */}
      {currentSalary && (
        <div style={{
          background: `linear-gradient(135deg, rgba(0, 203, 192, 0.05) 0%, rgba(0, 203, 192, 0.1) 50%, rgba(128, 146, 146, 0.05) 100%)`,
          borderRadius: 24,
          padding: 24,
          border: '1px solid rgba(0, 203, 192, 0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${COLORS.secondary} 0%, #809292 100%)`,
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 14, color: COLORS.primary, fontWeight: 600, margin: 0 }}>Current Salary</p>
              <p style={{ fontSize: 36, fontWeight: 700, color: COLORS.slate900, marginTop: 8, letterSpacing: '-0.02em' }}>
                {ctxFormatCurrency(currentSalary.amount, currentSalary.currency)}
                <span style={{ fontSize: 18, fontWeight: 400, color: COLORS.slate500, marginLeft: 4 }}>
                  /{currentSalary.frequency === 'annual' ? 'year' : 'month'}
                </span>
              </p>
              <p style={{ fontSize: 14, color: COLORS.slate500, marginTop: 8 }}>
                Annualized: <span style={{ fontWeight: 600, color: COLORS.slate700 }}>{ctxFormatCurrency(currentSalary.annualizedAmountUsd, 'USD')}</span> {displayCurrency}
              </p>
            </div>
            <Badge variant="secondary" size="lg">Active</Badge>
          </div>
          <p style={{ marginTop: 16, fontSize: 14, color: COLORS.slate600 }}>
            Effective since {formatDate(currentSalary.effectiveDate)}
          </p>
        </div>
      )}

      {/* Salary History */}
      <Section title="Salary History">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={() => setShowAddSalary(!showAddSalary)}
            style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
              backgroundColor: showAddSalary ? COLORS.slate200 : COLORS.primary,
              color: showAddSalary ? COLORS.slate700 : 'white',
            }}
          >
            {showAddSalary ? 'Cancel' : '+ Add Salary Record'}
          </button>
        </div>
        {showAddSalary && (
          <div style={{
            padding: 16, borderRadius: 16, border: `1px solid ${COLORS.slate200}`,
            backgroundColor: COLORS.slate50, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: COLORS.slate600, marginBottom: 4 }}>Amount</label>
                <input type="number" value={newSalaryAmount} onChange={e => setNewSalaryAmount(e.target.value)} placeholder="e.g. 50000"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: 14, border: `1px solid ${COLORS.slate200}`, borderRadius: 10, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: COLORS.slate600, marginBottom: 4 }}>Frequency</label>
                <select value={newSalaryFrequency} onChange={e => setNewSalaryFrequency(e.target.value as any)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: 14, border: `1px solid ${COLORS.slate200}`, borderRadius: 10, outline: 'none', backgroundColor: 'white' }}>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: COLORS.slate600, marginBottom: 4 }}>Effective Date</label>
                <input type="date" value={newSalaryEffectiveDate} onChange={e => setNewSalaryEffectiveDate(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: 14, border: `1px solid ${COLORS.slate200}`, borderRadius: 10, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: COLORS.slate600, marginBottom: 4 }}>Reason</label>
                <select value={newSalaryReason} onChange={e => setNewSalaryReason(e.target.value as any)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: 14, border: `1px solid ${COLORS.slate200}`, borderRadius: 10, outline: 'none', backgroundColor: 'white' }}>
                  <option value="hire">Hire</option>
                  <option value="merit">Merit</option>
                  <option value="promotion">Promotion</option>
                  <option value="market_adjustment">Market Adjustment</option>
                  <option value="role_change">Role Change</option>
                  <option value="correction">Correction</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: COLORS.slate600, marginBottom: 4 }}>Notes (optional)</label>
              <input value={newSalaryNotes} onChange={e => setNewSalaryNotes(e.target.value)} placeholder="e.g. Annual performance review"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: 14, border: `1px solid ${COLORS.slate200}`, borderRadius: 10, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleAddSalary}
                style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', backgroundColor: COLORS.primary, color: 'white', cursor: 'pointer' }}>
                Save Record
              </button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {salaryHistory.map((record) => (
            <SalaryHistoryCard key={record.id} record={record} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function SalaryHistoryCard({ record }: { record: SalaryRecord }) {
  const { formatCurrency: ctxFormatCurrency } = useHRIS();
  const [isHovered, setIsHovered] = useState(false);
  const isCurrent = !record.endDate;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${isCurrent ? 'rgba(0, 203, 192, 0.3)' : COLORS.slate200}`,
        backgroundColor: isCurrent ? 'rgba(0, 203, 192, 0.05)' : COLORS.card,
        transition: 'all 0.15s ease',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 700, color: COLORS.slate900, fontSize: 18, margin: 0 }}>
            {ctxFormatCurrency(record.amount, record.currency)}
            <span style={{ color: COLORS.slate500, fontWeight: 400, fontSize: 14, marginLeft: 4 }}>
              /{record.frequency === 'annual' ? 'year' : 'month'}
            </span>
          </p>
          <p style={{ fontSize: 14, color: COLORS.slate500, marginTop: 4 }}>
            {formatDate(record.effectiveDate)}
            {record.endDate ? ` → ${formatDate(record.endDate)}` : ' → Present'}
          </p>
        </div>
        <Badge
          variant={
            record.reason === 'promotion' ? 'secondary' :
            record.reason === 'hire' ? 'primary' : 'default'
          }
        >
          {record.reason.replace('_', ' ')}
        </Badge>
      </div>
      {record.reasonNotes && (
        <p style={{
          marginTop: 12,
          fontSize: 14,
          color: COLORS.slate600,
          backgroundColor: COLORS.slate50,
          borderRadius: 8,
          padding: 10,
        }}>
          {record.reasonNotes}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// EQUITY TAB - OCTUP STYLE WITH ACCESS CONTROL
// =============================================================================

function EquityTab({ grants, employeeId }: { grants: EquityGrant[]; employeeId: string }) {
  const { maskPII, getVestingInfo, formatCurrency: ctxFormatCurrency, currentStockPrice, addEquityGrant, updateEquityGrant, equityGrants } = useHRIS();
  const canViewEquity = maskPII.canViewEquity();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<EquityGrant | null>(null);
  const [formData, setFormData] = useState({
    grantType: 'iso' as EquityGrant['grantType'],
    sharesGranted: '',
    grantDate: new Date().toISOString().split('T')[0],
    exercisePrice: '',
    totalVestingMonths: '48',
    cliffMonths: '12',
  });

  const resetForm = () => {
    setFormData({
      grantType: 'iso',
      sharesGranted: '',
      grantDate: new Date().toISOString().split('T')[0],
      exercisePrice: '',
      totalVestingMonths: '48',
      cliffMonths: '12',
    });
    setEditingGrant(null);
    setIsFormOpen(false);
  };

  const handleEditGrant = (grant: EquityGrant) => {
    setEditingGrant(grant);
    setFormData({
      grantType: grant.grantType,
      sharesGranted: String(grant.sharesGranted),
      grantDate: grant.grantDate,
      exercisePrice: grant.exercisePrice != null ? String(grant.exercisePrice) : '',
      totalVestingMonths: String(grant.totalVestingMonths),
      cliffMonths: grant.cliffMonths != null ? String(grant.cliffMonths) : '12',
    });
    setIsFormOpen(true);
  };

  const handleSaveGrant = () => {
    const sharesGranted = parseInt(formData.sharesGranted);
    if (!sharesGranted || sharesGranted <= 0) return;
    if (!formData.grantDate) return;

    const exercisePrice = formData.grantType === 'rsu'
      ? null
      : (formData.exercisePrice ? parseFloat(formData.exercisePrice) : 0);
    const cliffMonths = parseInt(formData.cliffMonths) || 12;
    const totalVestingMonths = parseInt(formData.totalVestingMonths) || 48;

    if (editingGrant) {
      updateEquityGrant(editingGrant.id, {
        grantType: formData.grantType,
        sharesGranted,
        grantDate: formData.grantDate,
        exercisePrice,
        vestingStartDate: formData.grantDate,
        vestingType: 'cliff_then_linear',
        totalVestingMonths,
        cliffMonths,
      });
    } else {
      const grantNumber = `GRANT-${String(equityGrants.length + 1).padStart(3, '0')}`;
      const newGrant: EquityGrant = {
        id: `eq_${Date.now()}`,
        employeeId,
        grantNumber,
        grantDate: formData.grantDate,
        grantType: formData.grantType,
        sharesGranted,
        sharesVested: 0,
        sharesExercised: 0,
        sharesUnvested: 0,
        exercisePrice,
        vestingType: 'cliff_then_linear',
        vestingStartDate: formData.grantDate,
        cliffMonths,
        totalVestingMonths,
        nextVestingDate: null,
        nextVestingShares: null,
        vestingProgress: 0,
      };
      addEquityGrant(newGrant);
    }
    resetForm();
  };

  const formInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    borderRadius: 10,
    border: `1px solid ${COLORS.slate200}`,
    backgroundColor: COLORS.card,
    color: COLORS.slate900,
    outline: 'none',
    transition: 'border-color 0.15s ease',
    boxSizing: 'border-box',
  };

  const formLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: COLORS.slate700,
    marginBottom: 6,
  };

  // If user doesn't have permission, show access denied message
  if (!canViewEquity) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{
          width: 64,
          height: 64,
          margin: '0 auto',
          borderRadius: 16,
          backgroundColor: COLORS.slate100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          marginBottom: 16,
        }}>
          🔒
        </div>
        <p style={{ color: COLORS.slate700, fontWeight: 600, margin: 0 }}>Access Restricted</p>
        <p style={{ color: COLORS.slate500, fontSize: 14, marginTop: 8 }}>
          You don't have permission to view equity data.
        </p>
      </div>
    );
  }

  // Empty state for employees without grants
  if (grants.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{
          width: 64,
          height: 64,
          margin: '0 auto',
          borderRadius: 16,
          backgroundColor: COLORS.slate100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          marginBottom: 16,
        }}>
          📈
        </div>
        <p style={{ color: COLORS.slate700, fontWeight: 600, margin: 0 }}>No Equity Grants</p>
        <p style={{ color: COLORS.slate500, fontSize: 14, marginTop: 8 }}>
          This employee does not have any equity grants yet.
        </p>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          style={{
            marginTop: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            backgroundColor: COLORS.primary,
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
        >
          + Add Grant
        </button>
        {isFormOpen && (
          <GrantForm
            formData={formData}
            setFormData={setFormData}
            editingGrant={editingGrant}
            onSave={handleSaveGrant}
            onCancel={resetForm}
            inputStyle={formInputStyle}
            labelStyle={formLabelStyle}
          />
        )}
      </div>
    );
  }

  // Compute totals using dynamic vesting
  const totals = grants.reduce(
    (acc, grant) => {
      const v = getVestingInfo(grant);
      return {
        granted: acc.granted + grant.sharesGranted,
        vested: acc.vested + v.sharesVested,
        exercised: acc.exercised + grant.sharesExercised,
        unvested: acc.unvested + v.sharesUnvested,
        totalValue: acc.totalValue + v.vestedValue,
      };
    },
    { granted: 0, vested: 0, exercised: 0, unvested: 0, totalValue: 0 }
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary Cards - Octup Style */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <MetricCard label="Total Granted" value={totals.granted.toLocaleString()} color="primary" />
        <MetricCard label="Vested" value={totals.vested.toLocaleString()} color="secondary" />
        <MetricCard label="Unvested" value={totals.unvested.toLocaleString()} color="warning" />
        <MetricCard label="Vested Value" value={ctxFormatCurrency(totals.totalValue, 'USD')} color="accent" />
      </div>

      {/* Add Grant Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            backgroundColor: COLORS.primary,
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
        >
          + Add Grant
        </button>
      </div>

      {/* Inline Grant Form */}
      {isFormOpen && (
        <GrantForm
          formData={formData}
          setFormData={setFormData}
          editingGrant={editingGrant}
          onSave={handleSaveGrant}
          onCancel={resetForm}
          inputStyle={formInputStyle}
          labelStyle={formLabelStyle}
        />
      )}

      {/* Grants */}
      <Section title="Equity Grants">
        {grants.map(grant => (
          <EquityGrantCard key={grant.id} grant={grant} onEdit={handleEditGrant} />
        ))}
      </Section>
    </div>
  );
}

function EquityGrantCard({ grant, onEdit }: { grant: EquityGrant; onEdit?: (grant: EquityGrant) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const { getVestingInfo, formatCurrency: ctxFormatCurrency } = useHRIS();
  const vesting = getVestingInfo(grant);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: 20,
        borderRadius: 16,
        border: `1px solid ${COLORS.slate200}`,
        backgroundColor: COLORS.card,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'box-shadow 0.15s ease',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 700, color: COLORS.slate900, fontSize: 18, margin: 0 }}>{grant.grantNumber}</p>
          <p style={{ fontSize: 14, color: COLORS.slate500, marginTop: 2 }}>
            {grant.grantType.toUpperCase()} · Granted {formatDate(grant.grantDate)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(grant); }}
              style={{
                padding: 6,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: COLORS.slate500,
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = COLORS.slate100; e.currentTarget.style.color = COLORS.primary; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = COLORS.slate500; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <Badge variant="primary" size="lg">
            {vesting.vestingProgress}% Vested
          </Badge>
        </div>
      </div>

      {/* Vesting Progress - Octup Style */}
      <div style={{
        backgroundColor: COLORS.slate50,
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
          <span style={{ color: COLORS.slate600, fontWeight: 500 }}>Vesting Progress</span>
          <span style={{ color: COLORS.slate700, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {vesting.sharesVested.toLocaleString()} / {grant.sharesGranted.toLocaleString()}
          </span>
        </div>
        <ProgressBar value={vesting.vestingProgress} color="secondary" />
      </div>

      {/* Grant Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <InfoItem label="Exercise Price" value={grant.exercisePrice != null ? ctxFormatCurrency(grant.exercisePrice, 'USD') : 'N/A (RSU)'} />
        <InfoItem label="Vesting Type" value={grant.vestingType.replace('_', ' ')} />
        <InfoItem label="Vested Value" value={ctxFormatCurrency(vesting.vestedValue, 'USD')} highlight />
        {vesting.nextVestingDate ? (
          <InfoItem label="Next Vesting" value={`${formatDate(vesting.nextVestingDate)} (${vesting.nextVestingShares?.toLocaleString() || '0'} shares)`} />
        ) : (
          <InfoItem label="Vesting Status" value={vesting.vestingProgress >= 100 ? 'Fully Vested' : 'Pre-cliff'} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// GRANT FORM COMPONENT
// =============================================================================

interface GrantFormProps {
  formData: {
    grantType: EquityGrant['grantType'];
    sharesGranted: string;
    grantDate: string;
    exercisePrice: string;
    totalVestingMonths: string;
    cliffMonths: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<GrantFormProps['formData']>>;
  editingGrant: EquityGrant | null;
  onSave: () => void;
  onCancel: () => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}

function GrantForm({ formData, setFormData, editingGrant, onSave, onCancel, inputStyle, labelStyle }: GrantFormProps) {
  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      border: `1px solid ${COLORS.slate200}`,
      backgroundColor: COLORS.slate50,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      marginTop: 8,
    }}>
      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.slate900 }}>
        {editingGrant ? `Edit ${editingGrant.grantNumber}` : 'New Equity Grant'}
      </h4>

      {/* Grant Type Selector */}
      <div>
        <label style={labelStyle}>Grant Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['iso', 'nso', 'rsu'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFormData(prev => ({ ...prev, grantType: type }))}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: `1px solid ${formData.grantType === type ? COLORS.primary : COLORS.slate200}`,
                backgroundColor: formData.grantType === type ? 'rgba(0, 168, 168, 0.1)' : COLORS.card,
                color: formData.grantType === type ? COLORS.primary : COLORS.slate600,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Shares *</label>
          <input
            type="number"
            value={formData.sharesGranted}
            onChange={e => setFormData(prev => ({ ...prev, sharesGranted: e.target.value }))}
            placeholder="100,000"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Grant Date *</label>
          <input
            type="date"
            value={formData.grantDate}
            onChange={e => setFormData(prev => ({ ...prev, grantDate: e.target.value }))}
            style={inputStyle}
          />
        </div>
        {formData.grantType !== 'rsu' && (
          <div>
            <label style={labelStyle}>Exercise Price ($)</label>
            <input
              type="number"
              step="0.001"
              value={formData.exercisePrice}
              onChange={e => setFormData(prev => ({ ...prev, exercisePrice: e.target.value }))}
              placeholder="0.05"
              style={inputStyle}
            />
          </div>
        )}
        <div>
          <label style={labelStyle}>Vesting (months)</label>
          <input
            type="number"
            value={formData.totalVestingMonths}
            onChange={e => setFormData(prev => ({ ...prev, totalVestingMonths: e.target.value }))}
            placeholder="48"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Cliff (months)</label>
          <input
            type="number"
            value={formData.cliffMonths}
            onChange={e => setFormData(prev => ({ ...prev, cliffMonths: e.target.value }))}
            placeholder="12"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            border: `1px solid ${COLORS.slate200}`,
            backgroundColor: 'transparent',
            color: COLORS.slate700,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.slate100}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            border: 'none',
            backgroundColor: COLORS.primary,
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
        >
          {editingGrant ? 'Save Changes' : 'Add Grant'}
        </button>
      </div>
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
      monitor: '🖥',
      keyboard: '⌨',
      mouse: '🖱',
      headset: '🎧',
      phone: '📱',
      other: '📦',
    };
    return icons[category] || '📦';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {assets.map(asset => (
        <AssetCard key={asset.id} asset={asset} icon={getCategoryIcon(asset.category)} />
      ))}

      {assets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto',
            borderRadius: 16,
            backgroundColor: COLORS.slate100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            marginBottom: 16,
          }}>
            📦
          </div>
          <p style={{ color: COLORS.slate500, fontWeight: 500, margin: 0 }}>No equipment assigned</p>
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset, icon }: { asset: Asset; icon: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const hasMissingSerial = !asset.serialNumber;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: 20,
        borderRadius: 16,
        border: `1px solid ${hasMissingSerial ? 'rgba(249, 189, 99, 0.4)' : COLORS.slate200}`,
        backgroundColor: hasMissingSerial ? 'rgba(249, 189, 99, 0.05)' : COLORS.card,
        transition: 'all 0.15s ease',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: COLORS.slate100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontWeight: 700, color: COLORS.slate900, margin: 0 }}>
                {asset.manufacturer} {asset.model}
              </p>
              <p style={{ fontSize: 13, color: COLORS.slate500, fontFamily: 'monospace', marginTop: 2 }}>
                {asset.assetTag}
              </p>
            </div>
            {hasMissingSerial && (
              <Badge variant="warning" dot>Missing S/N</Badge>
            )}
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <InfoItem label="Serial Number" value={asset.serialNumber || 'Not recorded'} />
            <InfoItem label="Assigned" value={asset.assignedDate ? formatDate(asset.assignedDate) : '-'} />
            {asset.warrantyExpiry && (
              <InfoItem label="Warranty Until" value={formatDate(asset.warrantyExpiry)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DOCUMENTS TAB - OCTUP STYLE
// =============================================================================

function DocumentsTab({ employeeId }: { employeeId: string }) {
  const { getEmployeeDocuments, addDocument, deleteDocument } = useHRIS();
  const documents = getEmployeeDocuments(employeeId);

  const [isUploadHovered, setIsUploadHovered] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Document['category']>('other');
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const DOC_TABLE_STYLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' as const, tableLayout: 'fixed' as const };

  const getDocIcon = (fileType: string) => {
    if (fileType === 'pdf') return '📄';
    if (['doc', 'docx'].includes(fileType)) return '📝';
    if (['xls', 'xlsx'].includes(fileType)) return '📊';
    return '📃';
  };

  const getCategoryStyle = (category: Document['category']) => {
    const styles: Record<string, { bg: string; color: string }> = {
      contract: { bg: 'rgba(59, 130, 246, 0.1)', color: '#2563EB' },
      tax_form: { bg: 'rgba(0, 203, 192, 0.1)', color: COLORS.primary },
      performance_review: { bg: 'rgba(147, 51, 234, 0.1)', color: '#7C3AED' },
      certification: { bg: 'rgba(245, 158, 11, 0.1)', color: '#D97706' },
      policy_acknowledgment: { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
    };
    return styles[category] || { bg: COLORS.slate100, color: COLORS.slate600 };
  };

  const categoryOptions: { value: Document['category']; label: string }[] = [
    { value: 'contract', label: 'Contract' },
    { value: 'tax_form', label: 'Tax Form' },
    { value: 'performance_review', label: 'Review' },
    { value: 'certification', label: 'Certification' },
    { value: 'policy_acknowledgment', label: 'Policy' },
    { value: 'other', label: 'Other' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'other';
    const newDoc: Document = {
      id: `doc_${Date.now()}`,
      employeeId,
      name: file.name,
      category: selectedCategory,
      uploadedAt: new Date().toISOString().split('T')[0],
      fileType: ext,
      fileSizeBytes: file.size,
      visibility: 'private_hr',
      requiresAcknowledgment: false,
      acknowledgedAt: null,
    };
    addDocument(newDoc);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (docId: string, docName: string) => {
    deleteDocument(docId);
    setDeletingDocId(null);
  };

  // Empty state
  if (documents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{
          width: 64, height: 64, margin: '0 auto', borderRadius: 16,
          backgroundColor: COLORS.slate100, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 28, marginBottom: 16,
        }}>📁</div>
        <p style={{ color: COLORS.slate700, fontWeight: 600, margin: 0 }}>No documents yet</p>
        <p style={{ color: COLORS.slate500, fontSize: 14, marginTop: 8 }}>
          Upload contracts, tax forms, and other employee documents.
        </p>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg" />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            marginTop: 20, padding: '10px 24px', borderRadius: 12,
            backgroundColor: COLORS.primary, color: '#fff', border: 'none',
            fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >Upload Document</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Upload Zone */}
      <div
        onMouseEnter={() => setIsUploadHovered(true)}
        onMouseLeave={() => setIsUploadHovered(false)}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isUploadHovered ? COLORS.primary : COLORS.slate200}`,
          borderRadius: 16,
          padding: '28px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isUploadHovered ? 'rgba(0, 168, 168, 0.04)' : 'transparent',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg" />
        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
        <p style={{ margin: 0, fontWeight: 600, color: isUploadHovered ? COLORS.primary : COLORS.slate700, fontSize: 15, transition: 'color 0.15s ease' }}>
          Drop files here or click to upload
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: COLORS.slate500 }}>
          PDF, DOC, XLS up to 10MB
        </p>
        {/* Category selector */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}
          onClick={e => e.stopPropagation()}
        >
          {categoryOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedCategory(opt.value)}
              style={{
                padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: selectedCategory === opt.value ? `1.5px solid ${COLORS.primary}` : `1px solid ${COLORS.slate200}`,
                backgroundColor: selectedCategory === opt.value ? 'rgba(0, 168, 168, 0.08)' : COLORS.card,
                color: selectedCategory === opt.value ? COLORS.primary : COLORS.slate600,
                transition: 'all 0.15s ease',
              }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Document Table */}
      <div style={{
        backgroundColor: COLORS.card,
        borderRadius: 16,
        border: `1px solid ${COLORS.slate200}`,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <table style={DOC_TABLE_STYLE}>
          <colgroup>
            <col style={{ width: '35%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '17%' }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: COLORS.slate50 }}>
              {['Name', 'Category', 'Date Uploaded', 'Size', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: COLORS.slate500, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                  borderBottom: `1px solid ${COLORS.slate200}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, idx) => {
              const catStyle = getCategoryStyle(doc.category);
              const isDeleting = deletingDocId === doc.id;
              const isHovered = hoveredRow === doc.id;
              return (
                <tr
                  key={doc.id}
                  onMouseEnter={() => setHoveredRow(doc.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    backgroundColor: isHovered ? '#F0FDFA' : idx % 2 === 1 ? COLORS.slate50 : COLORS.card,
                    transition: 'background-color 0.12s ease',
                  }}
                >
                  {/* Name */}
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{getDocIcon(doc.fileType)}</span>
                      <span style={{
                        fontWeight: 500, color: COLORS.slate900, fontSize: 14,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{doc.name}</span>
                    </div>
                  </td>
                  {/* Category badge */}
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                      fontSize: 12, fontWeight: 500, backgroundColor: catStyle.bg, color: catStyle.color,
                    }}>
                      {doc.category.replace(/_/g, ' ')}
                    </span>
                  </td>
                  {/* Date */}
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: 13, color: COLORS.slate600 }}>
                    {formatDate(doc.uploadedAt)}
                  </td>
                  {/* Size */}
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${COLORS.borderLight}`, fontSize: 13, color: COLORS.slate500 }}>
                    {formatFileSize(doc.fileSizeBytes)}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    {isDeleting ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: COLORS.error, fontWeight: 500 }}>Delete?</span>
                        <button
                          onClick={() => setDeletingDocId(null)}
                          style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: `1px solid ${COLORS.slate200}`, backgroundColor: COLORS.card,
                            color: COLORS.slate600, cursor: 'pointer',
                          }}
                        >Cancel</button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
                          style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: 'none', backgroundColor: COLORS.error, color: '#fff', cursor: 'pointer',
                          }}
                        >Confirm</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {/* Download / View */}
                        <button
                          title="View / Download"
                          onClick={() => {
                            const content = `Octup HRIS Document\n\nFile: ${doc.name}\nCategory: ${doc.category.replace(/_/g, ' ')}\nUploaded: ${doc.uploadedAt}\nSize: ${formatFileSize(doc.fileSizeBytes)}\n\nThis is a demo placeholder for "${doc.name}".`;
                            const blob = new Blob([content], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = doc.name;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          style={{
                            width: 28, height: 28, borderRadius: 8, border: 'none',
                            backgroundColor: 'transparent', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: COLORS.slate500, transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = COLORS.slate100; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                        {/* Delete */}
                        <button
                          title="Delete"
                          onClick={() => setDeletingDocId(doc.id)}
                          style={{
                            width: 28, height: 28, borderRadius: 8, border: 'none',
                            backgroundColor: 'transparent', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: COLORS.slate500, transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = COLORS.error; }}
                          onMouseLeave={e => { e.currentTarget.style.color = COLORS.slate500; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// =============================================================================
// PERFORMANCE TAB - OCTUP STYLE
// =============================================================================
function PerformanceTab({ employeeId }: { employeeId: string }) {
  const { getEmployeeReviews, getEmployeeOKRs, updateOKRProgress, addPerformanceReview } = useHRIS();
  const reviews = getEmployeeReviews(employeeId);
  const okrs = getEmployeeOKRs(employeeId);
  const latestReview = reviews[0];

  // Add Review form state
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReviewPeriod, setNewReviewPeriod] = useState('');
  const [newReviewScore, setNewReviewScore] = useState('4.0');
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewSummary, setNewReviewSummary] = useState('');
  const [newCompScores, setNewCompScores] = useState({ leadership: 4, technical: 4, communication: 4, teamwork: 4, innovation: 4 });

  const handleSubmitReview = () => {
    const review: PerformanceReview = {
      id: `rev_${Date.now()}`,
      employeeId,
      reviewPeriod: newReviewPeriod || `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
      reviewDate: new Date().toISOString().split('T')[0],
      reviewerName: newReviewerName || 'HR Admin',
      score: parseFloat(newReviewScore),
      maxScore: 5,
      summary: newReviewSummary || 'Performance review completed.',
      competencies: [
        { name: 'Leadership', score: newCompScores.leadership, maxScore: 5 },
        { name: 'Technical', score: newCompScores.technical, maxScore: 5 },
        { name: 'Communication', score: newCompScores.communication, maxScore: 5 },
        { name: 'Teamwork', score: newCompScores.teamwork, maxScore: 5 },
        { name: 'Innovation', score: newCompScores.innovation, maxScore: 5 },
      ],
    };
    addPerformanceReview(review);
    setShowAddReview(false);
    setNewReviewPeriod('');
    setNewReviewScore('4.0');
    setNewReviewerName('');
    setNewReviewSummary('');
    setNewCompScores({ leadership: 4, technical: 4, communication: 4, teamwork: 4, innovation: 4 });
  };
  const getStatusStyle = (status: OKR['status']) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      on_track: { bg: 'rgba(0, 168, 168, 0.1)', color: COLORS.primary, label: 'On Track' },
      at_risk: { bg: 'rgba(245, 158, 11, 0.1)', color: '#D97706', label: 'At Risk' },
      behind: { bg: 'rgba(255, 52, 137, 0.1)', color: COLORS.accent, label: 'Behind' },
      completed: { bg: 'rgba(16, 185, 129, 0.1)', color: COLORS.success, label: 'Completed' },
    };
    return map[status] || map.on_track;
  };
  const handleUpdateProgress = (okrId: string, keyResultId: string, newValue: number, okrObjective: string) => {
    updateOKRProgress(okrId, keyResultId, newValue);
  };
  // Empty state
  if (reviews.length === 0 && okrs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{
          width: 64, height: 64, margin: '0 auto', borderRadius: 16,
          backgroundColor: COLORS.slate100, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 28, marginBottom: 16,
        }}>📋</div>
        <p style={{ color: COLORS.slate700, fontWeight: 600, margin: 0 }}>No Performance Data</p>
        <p style={{ color: COLORS.slate500, fontSize: 14, marginTop: 8 }}>
          Performance reviews and OKRs will appear here once available.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Competency Spider Chart */}
      {latestReview && latestReview.competencies.length > 0 && (
        <div style={{
          backgroundColor: COLORS.card,
          borderRadius: 16,
          padding: 20,
          border: `1px solid ${COLORS.slate200}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.slate900, margin: 0 }}>Competency Overview</p>
            <span style={{
              padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              backgroundColor: 'rgba(0, 168, 168, 0.1)', color: COLORS.primary,
            }}>{latestReview.reviewPeriod}</span>
          </div>
          <CompetencySpiderChart competencies={latestReview.competencies} />
          {/* Competency legend below chart */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, justifyContent: 'center' }}>
            {latestReview.competencies.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ color: COLORS.slate600, fontWeight: 500 }}>{c.name}:</span>
                <span style={{ color: COLORS.slate900, fontWeight: 700 }}>{c.score.toFixed(1)}</span>
                <span style={{ color: COLORS.slate500 }}>/ {c.maxScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OKR Tracking */}
      {okrs.length > 0 && (
        <Section title="Annual Objectives">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {okrs.map(okr => {
              const statusStyle = getStatusStyle(okr.status);
              return (
                <div key={okr.id} style={{
                  padding: 16,
                  borderRadius: 16,
                  border: `1px solid ${COLORS.slate200}`,
                  backgroundColor: COLORS.card,
                }}>
                  {/* Objective header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: COLORS.slate900, fontSize: 14, margin: 0 }}>{okr.objective}</p>
                      <p style={{ fontSize: 12, color: COLORS.slate500, margin: '4px 0 0' }}>{okr.quarter} {okr.year}</p>
                    </div>
                    <span style={{
                      flexShrink: 0, marginLeft: 12,
                      padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      backgroundColor: statusStyle.bg, color: statusStyle.color,
                    }}>{statusStyle.label}</span>
                  </div>

                  {/* Overall progress bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: COLORS.slate600, fontWeight: 500 }}>Overall Progress</span>
                      <span style={{ color: COLORS.slate700, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{okr.progress}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, backgroundColor: COLORS.slate100 }}>
                      <div style={{
                        height: '100%', borderRadius: 3, transition: 'width 0.3s ease',
                        width: `${okr.progress}%`,
                        backgroundColor: okr.status === 'on_track' ? COLORS.primary :
                          okr.status === 'at_risk' ? '#D97706' : COLORS.accent,
                      }} />
                    </div>
                  </div>

                  {/* Key Results */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {okr.keyResults.map(kr => (
                      <div key={kr.id} style={{
                        padding: '10px 12px', borderRadius: 10,
                        backgroundColor: COLORS.slate50,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <p style={{ fontSize: 13, color: COLORS.slate700, fontWeight: 500, margin: 0, flex: 1, minWidth: 0 }}>{kr.description}</p>
                          <span style={{
                            flexShrink: 0, marginLeft: 8,
                            fontSize: 12, fontWeight: 700, color: COLORS.slate900, fontVariantNumeric: 'tabular-nums',
                          }}>{kr.currentValue}/{kr.targetValue} {kr.unit}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.slate200 }}>
                            <div style={{
                              height: '100%', borderRadius: 2, transition: 'width 0.3s ease',
                              width: `${kr.progress}%`,
                              backgroundColor: kr.progress >= 70 ? COLORS.primary :
                                kr.progress >= 40 ? '#D97706' : COLORS.accent,
                            }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.slate500, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>
                            {kr.progress}%
                          </span>
                          {/* Quick increment button */}
                          <button
                            onClick={() => handleUpdateProgress(okr.id, kr.id, Math.min(kr.currentValue + 1, kr.targetValue), okr.objective)}
                            disabled={kr.progress >= 100}
                            style={{
                              width: 22, height: 22, borderRadius: 6, border: 'none',
                              backgroundColor: kr.progress >= 100 ? COLORS.slate100 : 'rgba(0, 168, 168, 0.1)',
                              color: kr.progress >= 100 ? COLORS.slate500 : COLORS.primary,
                              cursor: kr.progress >= 100 ? 'default' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 700, transition: 'all 0.15s ease',
                            }}
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Add Review Button + Form */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowAddReview(!showAddReview)}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            color: 'white',
            backgroundColor: COLORS.primary,
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {showAddReview ? 'Cancel' : '+ Add Review'}
        </button>
      </div>
      {showAddReview && (
        <div style={{
          padding: 20, borderRadius: 16,
          border: `1px solid ${COLORS.slate200}`,
          backgroundColor: COLORS.card,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.slate900, margin: 0 }}>New Performance Review</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 4 }}>Review Period</label>
              <input value={newReviewPeriod} onChange={e => setNewReviewPeriod(e.target.value)} placeholder="e.g. H2 2024" style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${COLORS.slate200}`, borderRadius: 10, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 4 }}>Reviewer Name</label>
              <input value={newReviewerName} onChange={e => setNewReviewerName(e.target.value)} placeholder="Manager name" style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${COLORS.slate200}`, borderRadius: 10, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 4 }}>Overall Score (1-5)</label>
              <input type="number" min="1" max="5" step="0.1" value={newReviewScore} onChange={e => setNewReviewScore(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${COLORS.slate200}`, borderRadius: 10, outline: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 4 }}>Summary</label>
            <textarea value={newReviewSummary} onChange={e => setNewReviewSummary(e.target.value)} placeholder="Review summary..." rows={3} style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${COLORS.slate200}`, borderRadius: 10, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.muted, marginBottom: 8 }}>Competency Scores (1-5)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {(Object.keys(newCompScores) as Array<keyof typeof newCompScores>).map(key => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: COLORS.slate500, marginBottom: 4, textTransform: 'capitalize' }}>{key}</label>
                  <input type="number" min="1" max="5" step="0.5" value={newCompScores[key]} onChange={e => setNewCompScores(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 1 }))} style={{ width: '100%', padding: '8px', fontSize: 13, border: `1px solid ${COLORS.slate200}`, borderRadius: 8, outline: 'none', textAlign: 'center' }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSubmitReview} style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, color: 'white', backgroundColor: COLORS.primary, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
              Submit Review
            </button>
          </div>
        </div>
      )}

      {/* Performance Reviews Timeline */}
      {reviews.length > 0 && (
        <Section title="Performance Reviews">
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            {/* Vertical timeline line */}
            <div style={{
              position: 'absolute', left: 7, top: 8, bottom: 8, width: 2,
              backgroundColor: COLORS.slate200, borderRadius: 1,
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {reviews.map((review, idx) => (
                <div key={review.id} style={{ position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: -17, top: 6,
                    width: 12, height: 12, borderRadius: '50%',
                    backgroundColor: idx === 0 ? COLORS.accent : COLORS.card,
                    border: `2px solid ${idx === 0 ? COLORS.accent : COLORS.slate200}`,
                  }} />
                  <div style={{
                    padding: 16, borderRadius: 16,
                    border: `1px solid ${idx === 0 ? 'rgba(255, 52, 137, 0.2)' : COLORS.slate200}`,
                    backgroundColor: idx === 0 ? 'rgba(255, 52, 137, 0.02)' : COLORS.card,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontWeight: 600, color: COLORS.slate900, fontSize: 14, margin: 0 }}>{review.reviewPeriod}</p>
                        <p style={{ fontSize: 12, color: COLORS.slate500, margin: '2px 0 0' }}>
                          {formatDate(review.reviewDate)} &middot; by {review.reviewerName}
                        </p>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'baseline', gap: 3,
                        padding: '4px 12px', borderRadius: 10,
                        backgroundColor: review.score >= 4.5 ? 'rgba(0, 168, 168, 0.1)' :
                          review.score >= 3.5 ? 'rgba(249, 189, 99, 0.15)' : 'rgba(255, 52, 137, 0.1)',
                      }}>
                        <span style={{
                          fontSize: 20, fontWeight: 700,
                          color: review.score >= 4.5 ? COLORS.primary :
                            review.score >= 3.5 ? '#D97706' : COLORS.accent,
                        }}>{review.score.toFixed(1)}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.slate500 }}>/ {review.maxScore.toFixed(1)}</span>
                      </div>
                    </div>
                    <p style={{
                      fontSize: 13, color: COLORS.slate600, lineHeight: 1.5, margin: 0,
                      backgroundColor: COLORS.slate50, borderRadius: 10, padding: 12,
                    }}>{review.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

// =============================================================================
// COMPETENCY SPIDER (RADAR) CHART - INLINE SVG
// =============================================================================

function CompetencySpiderChart({ competencies }: { competencies: PerformanceReview['competencies'] }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const levels = 5;
  const maxRadius = 90;

  const n = competencies.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // Start from top

  const getPoint = (index: number, radius: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Build grid polygons for each level
  const gridPolygons = Array.from({ length: levels }, (_, lvl) => {
    const r = (maxRadius / levels) * (lvl + 1);
    return competencies.map((_, i) => getPoint(i, r)).map(p => `${p.x},${p.y}`).join(' ');
  });

  // Build axis lines
  const axisLines = competencies.map((_, i) => getPoint(i, maxRadius));

  // Build data polygon
  const dataPoints = competencies.map((c, i) => {
    const ratio = c.score / c.maxScore;
    return getPoint(i, maxRadius * ratio);
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Build labels
  const labelPoints = competencies.map((c, i) => {
    const p = getPoint(i, maxRadius + 22);
    return { ...p, name: c.name };
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: size }}>
        <defs>
          <linearGradient id="spiderGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF3489" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF3489" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {/* Grid polygons */}
        {gridPolygons.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke={COLORS.slate200} strokeWidth={i === levels - 1 ? 1.5 : 0.8} />
        ))}
        {/* Axis lines from center to each vertex */}
        {axisLines.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={COLORS.slate200} strokeWidth="0.8" />
        ))}
        {/* Data area fill */}
        <polygon points={dataPolygon} fill="url(#spiderGradient)" stroke="#FF3489" strokeWidth="2" strokeLinejoin="round" />
        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="white" stroke="#FF3489" strokeWidth="2" />
        ))}
        {/* Labels */}
        {labelPoints.map((p, i) => (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
            fontSize="11" fontWeight="600" fill={COLORS.slate600}>
            {p.name}
          </text>
        ))}
      </svg>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS - OCTUP STYLE
// =============================================================================

function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: COLORS.card,
      borderRadius: 16,
      border: `1px solid ${COLORS.slate200}`,
      padding: 20,
    }}>
      <h4 style={{
        fontSize: 14,
        fontWeight: 700,
        color: COLORS.slate900,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {icon && <span>{icon}</span>}
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px 24px' }}>
      {children}
    </div>
  );
}

function InfoItem({ label, value, copyable, highlight }: { label: string; value: string; copyable?: boolean; highlight?: boolean }) {

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div style={{ minWidth: 0 }}>
      <dt style={{
        fontSize: 11,
        color: COLORS.slate500,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}
      </dt>
      <dd style={{
        fontSize: 14,
        marginTop: 4,
        color: highlight ? COLORS.secondary : COLORS.slate900,
        fontWeight: highlight ? 600 : 400,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            style={{
              color: COLORS.muted,
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              opacity: 0.6,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            <CopyIcon />
          </button>
        )}
      </dd>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: 'primary' | 'secondary' | 'warning' | 'accent' }) {
  const colorConfigs = {
    primary: {
      gradient: 'linear-gradient(135deg, rgba(128, 146, 146, 0.05) 0%, rgba(128, 146, 146, 0.1) 100%)',
      border: 'rgba(128, 146, 146, 0.2)',
      accent: '#809292',
    },
    secondary: {
      gradient: 'linear-gradient(135deg, rgba(0, 203, 192, 0.05) 0%, rgba(0, 203, 192, 0.1) 100%)',
      border: 'rgba(0, 203, 192, 0.2)',
      accent: COLORS.secondary,
    },
    warning: {
      gradient: 'linear-gradient(135deg, rgba(249, 189, 99, 0.05) 0%, rgba(249, 189, 99, 0.1) 100%)',
      border: 'rgba(249, 189, 99, 0.2)',
      accent: COLORS.warning,
    },
    accent: {
      gradient: 'linear-gradient(135deg, rgba(255, 52, 137, 0.05) 0%, rgba(255, 52, 137, 0.1) 100%)',
      border: 'rgba(255, 52, 137, 0.2)',
      accent: COLORS.accent,
    },
  };

  const config = colorConfigs[color];

  return (
    <div style={{
      padding: 16,
      borderRadius: 16,
      border: `1px solid ${config.border}`,
      background: config.gradient,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: config.accent,
      }} />
      <p style={{
        fontSize: 11,
        color: COLORS.slate500,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: 0,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 24,
        fontWeight: 700,
        color: COLORS.slate900,
        marginTop: 4,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </p>
    </div>
  );
}

export default EmployeeProfilePanel;
