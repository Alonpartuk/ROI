/**
 * Octup HRIS - Main Application
 * Premium SaaS dashboard with functional pages
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Dashboard } from '../components/dashboard/Dashboard';
import { useHRIS, calculateVesting } from '../context/HRISContext';
import { Employee } from '../types';
import { AddEmployeeModal } from '../components/employee/AddEmployeeModal';
import { EmployeeProfilePanel } from '../components/employee/EmployeeProfilePanel';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const COLORS = {
  primary: '#00A8A8',
  secondary: '#743CF7',
  accent: '#FF3489',
  warning: '#FFCF72',
  cardBg: '#FFFFFF',
  canvasBg: '#F3F4F6',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#F1F5F9',
  borderMedium: '#E2E8F0',
  lightBg: '#F8F7FB',
};

// Consistent 2-step shadow tokens
const SHADOW = {
  card: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
  cardHover: '0 4px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
};

// Shared table style (table-layout: fixed, truncate cells)
const TABLE_STYLE: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

// Active:scale-95 + hover helpers for buttons
const BTN_HANDLERS = {
  onMouseDown: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.transform = 'scale(0.95)'; },
  onMouseUp: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.transform = 'scale(1)'; },
};

// Truncate style for table cells
const TRUNCATE: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// Location badge colors
const LOCATION_COLORS: Record<string, { bg: string; text: string }> = {
  TLV: { bg: '#DBEAFE', text: '#1D4ED8' },
  TOR: { bg: '#FEE2E2', text: '#DC2626' },
  US: { bg: '#D1FAE5', text: '#059669' },
};

// =============================================================================
// INLINE SVG ICONS
// =============================================================================

const Icons = {
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Plus: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  Users: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Laptop: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
    </svg>
  ),
  Clipboard: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  ),
  TrendingUp: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Chart: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Settings: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

// =============================================================================
// AVATAR COMPONENT
// =============================================================================

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const gradients = [
    'linear-gradient(135deg, #00A8A8 0%, #00CBC0 100%)',
    'linear-gradient(135deg, #743CF7 0%, #9333EA 100%)',
    'linear-gradient(135deg, #FF3489 0%, #F472B6 100%)',
    'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
  ];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: gradients[colorIndex],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 600,
      fontSize: size * 0.4,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// =============================================================================
// SHIMMER LOADER
// =============================================================================

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ padding: '20px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: '16px',
          padding: '16px 0',
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#E5E7EB', animation: 'pulse 2s infinite' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: '60%', backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 8, animation: 'pulse 2s infinite' }} />
            <div style={{ height: 12, width: '40%', backgroundColor: '#E5E7EB', borderRadius: 4, animation: 'pulse 2s infinite' }} />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// EMPLOYEES PAGE
// =============================================================================

function EmployeesPage({ onSelectEmployee }: { onSelectEmployee: (employee: Employee) => void }) {
  const { employees, isLoading, user, maskPII } = useHRIS();
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'department' | 'location'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const isAdmin = user?.roles.includes('hr_admin') || user?.roles.includes('admin');

  // Get unique departments and locations
  const departments = useMemo(() => Array.from(new Set(employees.map(e => e.department))).sort(), [employees]);
  const locations = useMemo(() => Array.from(new Set(employees.map(e => e.location))).sort(), [employees]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      const matchesSearch = search === '' ||
        emp.displayName.toLowerCase().includes(search.toLowerCase()) ||
        emp.workEmail.toLowerCase().includes(search.toLowerCase()) ||
        emp.jobTitle.toLowerCase().includes(search.toLowerCase());
      const matchesLocation = locationFilter === 'all' || emp.location === locationFilter;
      const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
      return matchesSearch && matchesLocation && matchesDepartment;
    });

    result.sort((a, b) => {
      let aVal = sortField === 'name' ? a.displayName : sortField === 'department' ? a.department : a.location;
      let bVal = sortField === 'name' ? b.displayName : sortField === 'department' ? b.department : b.location;
      const comparison = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [employees, search, locationFilter, departmentFilter, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'department' | 'location') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <Icons.ChevronUp /> : <Icons.ChevronDown />;
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #00A8A8 0%, #00CBC0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <Icons.Users />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>Employees</h1>
            <p style={{ margin: 0, fontSize: '14px', color: COLORS.textMuted }}>{employees.length} team members</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            {...BTN_HANDLERS}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 168, 168, 0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Icons.Plus />
            Add Employee
          </button>
        )}
      </div>

      {/* Filters Card */}
      <div style={{
        backgroundColor: COLORS.cardBg,
        borderRadius: '24px',
        boxShadow: SHADOW.card,
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
      }}>
        {/* Search and Filters Row */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {/* Search */}
          <div style={{
            position: 'relative',
            flex: '1 1 300px',
            minWidth: '200px',
          }}>
            <div style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: COLORS.textMuted,
            }}>
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '12px',
                fontSize: '14px',
                backgroundColor: COLORS.lightBg,
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onFocus={e => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px rgba(0, 168, 168, 0.1)`;
              }}
              onBlur={e => {
                e.target.style.borderColor = COLORS.border;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            style={{
              padding: '12px 36px 12px 16px',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '12px',
              fontSize: '14px',
              backgroundColor: COLORS.cardBg,
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px',
            }}
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            style={{
              padding: '12px 36px 12px 16px',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '12px',
              fontSize: '14px',
              backgroundColor: COLORS.cardBg,
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px',
            }}
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <span style={{
            padding: '6px 12px',
            backgroundColor: COLORS.lightBg,
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            color: COLORS.textMuted,
          }}>
            {filteredEmployees.length} members
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...TABLE_STYLE, minWidth: '700px' }}>
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: COLORS.lightBg }}>
                  <th
                    onClick={() => handleSort('name')}
                    style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Employee <SortIcon field="name" />
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('department')}
                    style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Department <SortIcon field="department" />
                    </span>
                  </th>
                  <th style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Job Title
                  </th>
                  <th
                    onClick={() => handleSort('location')}
                    style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Location <SortIcon field="location" />
                    </span>
                  </th>
                  <th style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee, index) => {
                  const locationColor = LOCATION_COLORS[employee.location] || { bg: '#F3F4F6', text: '#6B7280' };
                  return (
                    <tr
                      key={employee.id}
                      onClick={() => onSelectEmployee(employee)}
                      style={{
                        backgroundColor: index % 2 === 0 ? COLORS.cardBg : COLORS.lightBg,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#F0FDFA';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? COLORS.cardBg : COLORS.lightBg;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <Avatar name={employee.displayName} size={40} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: COLORS.textDark, ...TRUNCATE }}>
                              {employee.displayName}
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted, ...TRUNCATE }}>
                              {maskPII.email(employee.workEmail)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: COLORS.textDark, ...TRUNCATE }}>
                        {employee.department}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: COLORS.textDark, ...TRUNCATE }}>
                        {employee.jobTitle}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: locationColor.bg,
                          color: locationColor.text,
                        }}>
                          {employee.location}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: employee.currentStatus === 'active' ? '#D1FAE5' : '#FEE2E2',
                          color: employee.currentStatus === 'active' ? '#059669' : '#DC2626',
                        }}>
                          {employee.currentStatus === 'active' ? 'Active' : employee.currentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Empty State */}
            {filteredEmployees.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  margin: '0 auto 16px',
                  borderRadius: '16px',
                  backgroundColor: COLORS.lightBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.textMuted,
                }}>
                  <Icons.Users />
                </div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>No employees found</p>
                <p style={{ margin: '8px 0 0', fontSize: '14px', color: COLORS.textMuted }}>
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}

// =============================================================================
// ASSETS PAGE
// =============================================================================

function AssetsPage() {
  const { assets, isLoading, user, addAsset, updateAsset, employees } = useHRIS();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<typeof assets[0] | null>(null);
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editAssetData, setEditAssetData] = useState<Record<string, string>>({});
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);

  // Add asset form state
  const [newAssetTag, setNewAssetTag] = useState('');
  const [newCategory, setNewCategory] = useState<string>('laptop');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newStatus, setNewStatus] = useState<string>('available');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newLocationCode, setNewLocationCode] = useState('TLV');
  const [newWarrantyExpiry, setNewWarrantyExpiry] = useState('');

  const isAdmin = user?.roles.includes('hr_admin') || user?.roles.includes('admin');

  const handleAddAsset = () => {
    setIsAddAssetModalOpen(true);
  };

  const handleSubmitAsset = () => {
    const assignedEmployee = employees.find(e => e.id === newAssignedTo);
    const newAsset = {
      id: `asset_${Date.now()}`,
      assetTag: newAssetTag || `AST-${Date.now().toString().slice(-4)}`,
      category: newCategory as any,
      manufacturer: newManufacturer,
      model: newModel,
      serialNumber: newSerialNumber,
      purchaseDate: newPurchaseDate || new Date().toISOString().split('T')[0],
      purchasePrice: parseFloat(newPurchasePrice) || 0,
      currency: 'USD' as const,
      status: newStatus as any,
      assignedToId: newAssignedTo || null,
      assignedToName: assignedEmployee?.displayName || null,
      assignedDate: newAssignedTo ? new Date().toISOString().split('T')[0] : null,
      locationCode: newLocationCode as any,
      notes: null,
      warrantyExpiry: newWarrantyExpiry || null,
    };
    addAsset(newAsset);
    setIsAddAssetModalOpen(false);
    // Reset form
    setNewAssetTag(''); setNewCategory('laptop'); setNewManufacturer(''); setNewModel('');
    setNewSerialNumber(''); setNewPurchaseDate(''); setNewPurchasePrice('');
    setNewStatus('available'); setNewAssignedTo(''); setNewLocationCode('TLV'); setNewWarrantyExpiry('');
  };

  const handleStartEditAsset = () => {
    if (!selectedAsset) return;
    setEditAssetData({
      category: selectedAsset.category || 'laptop',
      manufacturer: selectedAsset.manufacturer || '',
      model: selectedAsset.model || '',
      serialNumber: selectedAsset.serialNumber || '',
      purchaseDate: selectedAsset.purchaseDate || '',
      purchasePrice: selectedAsset.purchasePrice?.toString() || '',
      warrantyExpiry: selectedAsset.warrantyExpiry || '',
      status: selectedAsset.status,
      assignedToId: selectedAsset.assignedToId || '',
      locationCode: selectedAsset.locationCode,
      notes: selectedAsset.notes || '',
    });
    setIsEditingAsset(true);
  };

  const handleSaveAssetEdit = () => {
    if (!selectedAsset) return;
    const assignedEmployee = employees.find(e => e.id === editAssetData.assignedToId);
    updateAsset(selectedAsset.id, {
      category: editAssetData.category as any,
      manufacturer: editAssetData.manufacturer || '',
      model: editAssetData.model || '',
      serialNumber: editAssetData.serialNumber || null,
      purchaseDate: editAssetData.purchaseDate || null,
      purchasePrice: editAssetData.purchasePrice ? parseFloat(editAssetData.purchasePrice) : null,
      warrantyExpiry: editAssetData.warrantyExpiry || null,
      status: editAssetData.status as any,
      assignedToId: editAssetData.assignedToId || null,
      assignedToName: assignedEmployee?.displayName || null,
      assignedDate: editAssetData.assignedToId ? new Date().toISOString().split('T')[0] : null,
      locationCode: editAssetData.locationCode as any,
      notes: editAssetData.notes || null,
    });
    setIsEditingAsset(false);
    setSelectedAsset(prev => prev ? { ...prev, ...{
      category: editAssetData.category as any,
      manufacturer: editAssetData.manufacturer || '',
      model: editAssetData.model || '',
      serialNumber: editAssetData.serialNumber || null,
      purchaseDate: editAssetData.purchaseDate || null,
      purchasePrice: editAssetData.purchasePrice ? parseFloat(editAssetData.purchasePrice) : null,
      warrantyExpiry: editAssetData.warrantyExpiry || null,
      status: editAssetData.status as any,
      assignedToId: editAssetData.assignedToId || null,
      assignedToName: assignedEmployee?.displayName || null,
      locationCode: editAssetData.locationCode as any,
      notes: editAssetData.notes || null,
    } } : null);
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = search === '' ||
        asset.assetTag.toLowerCase().includes(search.toLowerCase()) ||
        asset.model.toLowerCase().includes(search.toLowerCase()) ||
        asset.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
        (asset.assignedToName?.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
      const matchesLocation = locationFilter === 'all' || asset.locationCode === locationFilter;
      const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesLocation && matchesCategory;
    });
  }, [assets, search, statusFilter, locationFilter, categoryFilter]);

  const statusColors: Record<string, { bg: string; text: string }> = {
    assigned: { bg: '#D1FAE5', text: '#059669' },
    available: { bg: '#DBEAFE', text: '#2563EB' },
    maintenance: { bg: '#FEF3C7', text: '#D97706' },
    retired: { bg: '#F3F4F6', text: '#6B7280' },
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #743CF7 0%, #9333EA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <Icons.Laptop />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>Assets</h1>
            <p style={{ margin: 0, fontSize: '14px', color: COLORS.textMuted }}>{assets.length} items tracked</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={handleAddAsset}
            {...BTN_HANDLERS}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: COLORS.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(116, 60, 247, 0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Icons.Plus />
            Add Asset
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {['assigned', 'available', 'maintenance', 'retired'].map(status => {
          const count = assets.filter(a => a.status === status).length;
          const colors = statusColors[status];
          return (
            <div key={status} style={{
              backgroundColor: COLORS.cardBg,
              borderRadius: '16px',
              padding: '16px 20px',
              boxShadow: SHADOW.card,
              border: `1px solid ${COLORS.border}`,
            }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: COLORS.textMuted, textTransform: 'capitalize' }}>
                {status}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700, color: colors.text }}>
                {count}
              </p>
            </div>
          );
        })}
      </div>

      {/* Table Card */}
      <div style={{
        backgroundColor: COLORS.cardBg,
        borderRadius: '24px',
        boxShadow: SHADOW.card,
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
      }}>
        {/* Filters */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${COLORS.borderMedium}`,
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '400px', minWidth: 0 }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }}>
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 12px 12px 44px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '12px',
                fontSize: '14px',
                backgroundColor: COLORS.lightBg,
                outline: 'none',
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '12px 36px 12px 16px',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '12px',
              fontSize: '14px',
              backgroundColor: COLORS.cardBg,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px',
            }}
          >
            <option value="all">All Status</option>
            <option value="assigned">Assigned</option>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            style={{
              padding: '12px 36px 12px 16px',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '12px',
              fontSize: '14px',
              backgroundColor: COLORS.cardBg,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px',
            }}
          >
            <option value="all">All Locations</option>
            <option value="TLV">Tel Aviv</option>
            <option value="TOR">Toronto</option>
            <option value="US">United States</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              padding: '12px 36px 12px 16px',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '12px',
              fontSize: '14px',
              backgroundColor: COLORS.cardBg,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px',
            }}
          >
            <option value="all">All Categories</option>
            <option value="laptop">Laptop</option>
            <option value="monitor">Monitor</option>
            <option value="phone">Phone</option>
            <option value="keyboard">Keyboard</option>
            <option value="mouse">Mouse</option>
            <option value="headset">Headset</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...TABLE_STYLE, minWidth: '800px' }}>
              <colgroup>
                <col style={{ width: '14%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: COLORS.lightBg }}>
                  {['Asset Tag', 'Device', 'Assigned To', 'Location', 'Status', 'Warranty'].map(header => (
                    <th key={header} style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset, index) => {
                  const statusColor = statusColors[asset.status] || statusColors.retired;
                  const assignedEmployee = asset.assignedToId ? employees.find(e => e.id === asset.assignedToId) : null;
                  const isAssignedToInactive = assignedEmployee?.currentStatus === 'terminated';
                  const locationColor = LOCATION_COLORS[asset.locationCode] || { bg: '#F3F4F6', text: '#6B7280' };
                  const warrantyDate = asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : null;
                  const isWarrantyExpiring = warrantyDate && warrantyDate < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

                  return (
                    <tr key={asset.id} style={{
                      backgroundColor: index % 2 === 0 ? COLORS.cardBg : COLORS.lightBg,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setSelectedAsset(asset)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F3FF'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? COLORS.cardBg : COLORS.lightBg}
                    >
                      <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: COLORS.secondary }}>
                        {asset.assetTag}
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: '220px' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: COLORS.textDark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {asset.manufacturer} {asset.model}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: COLORS.textMuted }}>
                          {asset.category}
                        </p>
                      </td>
                      <td style={{ padding: '16px 20px', maxWidth: '180px' }}>
                        {asset.assignedToName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <Avatar name={asset.assignedToName} size={32} />
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontSize: '14px', color: isAssignedToInactive ? '#DC2626' : COLORS.textDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{asset.assignedToName}</span>
                              {isAssignedToInactive && (
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>Terminated Employee</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '14px', color: COLORS.textMuted }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: locationColor.bg,
                          color: locationColor.text,
                        }}>
                          {asset.locationCode}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: statusColor.bg,
                          color: statusColor.text,
                          textTransform: 'capitalize',
                        }}>
                          {asset.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {warrantyDate ? (
                          <span style={{
                            fontSize: '13px',
                            color: isWarrantyExpiring ? '#DC2626' : COLORS.textMuted,
                            fontWeight: isWarrantyExpiring ? 500 : 400,
                          }}>
                            {warrantyDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {isWarrantyExpiring && ' ⚠️'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: COLORS.textMuted }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredAssets.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  margin: '0 auto 16px',
                  borderRadius: '16px',
                  backgroundColor: COLORS.lightBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.textMuted,
                }}>
                  <Icons.Laptop />
                </div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>No assets found</p>
                <p style={{ margin: '8px 0 0', fontSize: '14px', color: COLORS.textMuted }}>
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Asset Detail Slide-Over */}
      {selectedAsset && (
        <>
          <div
            onClick={() => { setSelectedAsset(null); setIsEditingAsset(false); }}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)', zIndex: 250,
            }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', maxWidth: '90vw',
            backgroundColor: 'white', zIndex: 251, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
            overflowY: 'auto', padding: '32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: COLORS.textDark }}>Asset Details</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {isAdmin && !isEditingAsset && (
                  <button onClick={handleStartEditAsset} style={{
                    padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white',
                    backgroundColor: COLORS.primary, border: 'none', borderRadius: '10px', cursor: 'pointer',
                  }}>Edit</button>
                )}
                <button onClick={() => { setSelectedAsset(null); setIsEditingAsset(false); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: COLORS.textMuted, padding: '4px' }}>x</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.border}` }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asset Tag</p>
                <p style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700, color: COLORS.secondary }}>{selectedAsset.assetTag}</p>
              </div>

              {isEditingAsset ? (
                <>
                  {/* Editable fields */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Category</label>
                    <select value={editAssetData.category || 'laptop'} onChange={e => setEditAssetData(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                      <option value="laptop">Laptop</option>
                      <option value="monitor">Monitor</option>
                      <option value="phone">Phone</option>
                      <option value="tablet">Tablet</option>
                      <option value="keyboard">Keyboard</option>
                      <option value="mouse">Mouse</option>
                      <option value="headset">Headset</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Manufacturer</label>
                    <input value={editAssetData.manufacturer || ''} onChange={e => setEditAssetData(p => ({ ...p, manufacturer: e.target.value }))} placeholder="e.g. Apple, Dell, Lenovo" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Model</label>
                    <input value={editAssetData.model || ''} onChange={e => setEditAssetData(p => ({ ...p, model: e.target.value }))} placeholder="e.g. MacBook Pro M3" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Serial Number</label>
                    <input value={editAssetData.serialNumber || ''} onChange={e => setEditAssetData(p => ({ ...p, serialNumber: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Purchase Date</label>
                    <input type="date" value={editAssetData.purchaseDate || ''} onChange={e => setEditAssetData(p => ({ ...p, purchaseDate: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Purchase Price (USD)</label>
                    <input type="number" value={editAssetData.purchasePrice || ''} onChange={e => setEditAssetData(p => ({ ...p, purchasePrice: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Warranty Expiry</label>
                    <input type="date" value={editAssetData.warrantyExpiry || ''} onChange={e => setEditAssetData(p => ({ ...p, warrantyExpiry: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Status</label>
                    <select value={editAssetData.status || ''} onChange={e => setEditAssetData(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                      <option value="available">Available</option>
                      <option value="assigned">Assigned</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Assigned To</label>
                    <select value={editAssetData.assignedToId || ''} onChange={e => setEditAssetData(p => ({ ...p, assignedToId: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                      <option value="">Unassigned</option>
                      {employees.filter(e => e.currentStatus === 'active').map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Location</label>
                    <select value={editAssetData.locationCode || ''} onChange={e => setEditAssetData(p => ({ ...p, locationCode: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                      <option value="TLV">Tel Aviv</option>
                      <option value="TOR">Toronto</option>
                      <option value="US">United States</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Notes</label>
                    <textarea value={editAssetData.notes || ''} onChange={e => setEditAssetData(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>

                  {/* Save / Cancel buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button onClick={() => setIsEditingAsset(false)} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 500, color: COLORS.textMuted, backgroundColor: COLORS.lightBg, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSaveAssetEdit} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: 'white', backgroundColor: COLORS.primary, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Save Changes</button>
                  </div>
                </>
              ) : (
                <>
                  {[
                    { label: 'Category', value: selectedAsset.category },
                    { label: 'Manufacturer', value: selectedAsset.manufacturer },
                    { label: 'Model', value: selectedAsset.model },
                    { label: 'Serial Number', value: selectedAsset.serialNumber || 'N/A' },
                    { label: 'Purchase Date', value: selectedAsset.purchaseDate || 'N/A' },
                    { label: 'Purchase Price', value: selectedAsset.purchasePrice ? `$${selectedAsset.purchasePrice.toLocaleString()}` : 'N/A' },
                    { label: 'Status', value: selectedAsset.status },
                    { label: 'Assigned To', value: selectedAsset.assignedToName || 'Unassigned' },
                    { label: 'Location', value: selectedAsset.locationCode },
                    { label: 'Warranty Expiry', value: selectedAsset.warrantyExpiry || 'N/A' },
                    { label: 'Notes', value: selectedAsset.notes || 'None' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                      <span style={{ fontSize: '14px', color: COLORS.textMuted, fontWeight: 500 }}>{item.label}</span>
                      <span style={{ fontSize: '14px', color: COLORS.textDark, fontWeight: 500, textTransform: 'capitalize' }}>{item.value}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Asset Modal */}
      {isAddAssetModalOpen && (
        <>
          <div onClick={() => setIsAddAssetModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 250 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '560px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
            backgroundColor: 'white', borderRadius: '24px', padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 251,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: COLORS.textDark }}>Add New Asset</h2>
              <button onClick={() => setIsAddAssetModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: COLORS.textMuted }}>x</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Asset Tag</label>
                <input value={newAssetTag} onChange={e => setNewAssetTag(e.target.value)} placeholder="e.g. LAP-TLV-010" style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                  <option value="laptop">Laptop</option>
                  <option value="monitor">Monitor</option>
                  <option value="phone">Phone</option>
                  <option value="keyboard">Keyboard</option>
                  <option value="mouse">Mouse</option>
                  <option value="headset">Headset</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Manufacturer</label>
                <input value={newManufacturer} onChange={e => setNewManufacturer(e.target.value)} placeholder="e.g. Apple" style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Model</label>
                <input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="e.g. MacBook Pro 16&quot;" style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Serial Number</label>
                <input value={newSerialNumber} onChange={e => setNewSerialNumber(e.target.value)} placeholder="S/N" style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Purchase Date</label>
                <input type="date" value={newPurchaseDate} onChange={e => setNewPurchaseDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Purchase Price (USD)</label>
                <input type="number" value={newPurchasePrice} onChange={e => setNewPurchasePrice(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Assign To</label>
                <select value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                  <option value="">Unassigned</option>
                  {employees.filter(e => e.currentStatus === 'active').map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Location</label>
                <select value={newLocationCode} onChange={e => setNewLocationCode(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                  <option value="TLV">Tel Aviv</option>
                  <option value="NYC">New York</option>
                  <option value="TOR">Toronto</option>
                  <option value="LON">London</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Warranty Expiry</label>
                <input type="date" value={newWarrantyExpiry} onChange={e => setNewWarrantyExpiry(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setIsAddAssetModalOpen(false)} style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 500, color: COLORS.textMuted, backgroundColor: COLORS.lightBg, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmitAsset} style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600, color: 'white', backgroundColor: COLORS.secondary, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Add Asset</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// ONBOARDING PAGE
// =============================================================================

function OnboardingPage() {
  const { onboardingProgress, isLoading, employees, initializeOnboarding, getEmployeeOnboardingTasks, toggleOnboardingTask, onboardingTasks, onboardingTemplates, addOnboardingTemplate, updateOnboardingTemplate, deleteOnboardingTemplate } = useHRIS();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('general');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  // Template creation state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateTasks, setNewTemplateTasks] = useState<Array<{ name: string; stage: string; category: string; priority: string }>>([]);
  const [taskName, setTaskName] = useState('');
  const [taskStage, setTaskStage] = useState('pre_boarding');
  const [taskCategory, setTaskCategory] = useState('HR');
  const [taskPriority, setTaskPriority] = useState('medium');

  // Template editing state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateDesc, setEditTemplateDesc] = useState('');

  const handleStartEditTemplate = (tpl: typeof onboardingTemplates[0]) => {
    setEditingTemplateId(tpl.id);
    setEditTemplateName(tpl.name);
    setEditTemplateDesc(tpl.description);
  };

  const handleSaveEditTemplate = () => {
    if (editingTemplateId && editTemplateName.trim()) {
      updateOnboardingTemplate(editingTemplateId, { name: editTemplateName.trim(), description: editTemplateDesc.trim() });
      setEditingTemplateId(null);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    deleteOnboardingTemplate(id);
  };

  const handleAddTask = () => {
    if (!taskName.trim()) return;
    setNewTemplateTasks(prev => [...prev, { name: taskName.trim(), stage: taskStage, category: taskCategory, priority: taskPriority }]);
    setTaskName('');
  };

  const handleRemoveTask = (idx: number) => {
    setNewTemplateTasks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim() || newTemplateTasks.length === 0) return;
    addOnboardingTemplate({
      id: `tpl_${Date.now()}`,
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || `Custom template with ${newTemplateTasks.length} tasks`,
      tasks: newTemplateTasks as any,
    });
    setShowTemplateModal(false);
    setNewTemplateName(''); setNewTemplateDesc(''); setNewTemplateTasks([]);
  };

  const STAGE_LABELS: Record<string, { label: string; color: string }> = {
    pre_boarding: { label: 'Pre-Boarding', color: '#7C3AED' },
    day_1: { label: 'Day 1', color: '#059669' },
    week_1: { label: 'Week 1', color: '#D97706' },
    month_1: { label: 'Month 1', color: '#2563EB' },
  };

  const handleInitialize = () => {
    if (selectedEmployeeId) {
      initializeOnboarding(selectedEmployeeId, selectedTemplateId);
      setShowAddModal(false);
      setSelectedEmployeeId('');
      setSelectedTemplateId('general');
    }
  };

  // Employees not yet onboarded
  const availableEmployees = employees.filter(e =>
    e.currentStatus === 'active' && !onboardingProgress.some(p => p.employeeId === e.id)
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '16px',
            background: 'linear-gradient(135deg, #00A8A8 0%, #00CBC0 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          }}>
            <Icons.Clipboard />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>Onboarding</h1>
            <p style={{ margin: 0, fontSize: '14px', color: COLORS.textMuted }}>
              {onboardingProgress.filter(p => p.completionPercentage < 100).length} active onboardings
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowTemplateModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
              backgroundColor: COLORS.cardBg, color: COLORS.textDark, border: `1px solid ${COLORS.border}`, borderRadius: '12px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            <Icons.Settings /> Manage Templates
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
              backgroundColor: COLORS.primary, color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 168, 168, 0.25)', transition: 'all 0.15s ease',
            }}
          >
            <Icons.Plus /> Add Employee to Onboarding
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'In Progress', value: onboardingProgress.filter(p => p.completionPercentage < 100).length, color: COLORS.primary },
          { label: 'Overdue Tasks', value: onboardingProgress.reduce((sum, p) => sum + p.overdueTasks, 0), color: COLORS.accent },
          { label: 'Avg. Completion', value: `${onboardingProgress.length > 0 ? Math.round(onboardingProgress.reduce((sum, p) => sum + p.completionPercentage, 0) / onboardingProgress.length) : 0}%`, color: '#059669' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: COLORS.cardBg, borderRadius: '16px', padding: '20px', boxShadow: SHADOW.card, border: `1px solid ${COLORS.border}` }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: COLORS.textMuted }}>{stat.label}</p>
            <p style={{ margin: '4px 0 0', fontSize: '32px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Onboarding Cards with Expandable Task Lists */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {onboardingProgress.length === 0 ? (
          <div style={{
            backgroundColor: COLORS.cardBg, borderRadius: '24px', padding: '60px 20px',
            boxShadow: SHADOW.card, border: `1px solid ${COLORS.border}`, textAlign: 'center',
          }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: '16px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Icons.Check />
            </div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>No active onboardings</p>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: COLORS.textMuted }}>Click "Add Employee to Onboarding" to get started</p>
          </div>
        ) : (
          onboardingProgress.map(progress => {
            const tasks = getEmployeeOnboardingTasks(progress.employeeId);
            const isExpanded = expandedEmployee === progress.employeeId;
            const progressPercent = progress.completionPercentage;
            const progressColor = progressPercent >= 80 ? '#059669' : progressPercent >= 50 ? '#D97706' : '#DC2626';

            // Group tasks by stage
            const stages = ['pre_boarding', 'day_1', 'week_1', 'month_1'];
            const tasksByStage = stages.reduce((acc, stage) => {
              acc[stage] = tasks.filter(t => t.stage === stage);
              return acc;
            }, {} as Record<string, typeof tasks>);

            return (
              <div key={progress.employeeId} style={{
                backgroundColor: COLORS.cardBg, borderRadius: '24px',
                boxShadow: SHADOW.card, border: `1px solid ${COLORS.border}`, overflow: 'hidden',
              }}>
                {/* Employee Header */}
                <div
                  onClick={() => setExpandedEmployee(isExpanded ? null : progress.employeeId)}
                  style={{
                    padding: '20px', cursor: 'pointer', transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: '16px',
                  }}
                >
                  <Avatar name={progress.employeeName} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: COLORS.textDark, ...TRUNCATE }}>{progress.employeeName}</p>
                        <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted }}>
                          Started {new Date(progress.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: progressColor }}>{progressPercent}%</p>
                          <p style={{ margin: 0, fontSize: '12px', color: COLORS.textMuted }}>{progress.completedTasks}/{progress.totalTasks} tasks</p>
                        </div>
                        <span style={{ fontSize: '18px', color: COLORS.textMuted, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>v</span>
                      </div>
                    </div>
                    <div style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: progressColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                </div>

                {/* Expanded Task List */}
                {isExpanded && tasks.length > 0 && (
                  <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: '16px 20px' }}>
                    {stages.map(stage => {
                      const stageTasks = tasksByStage[stage];
                      if (!stageTasks || stageTasks.length === 0) return null;
                      const stageInfo = STAGE_LABELS[stage];
                      const stageCompleted = stageTasks.filter(t => t.status === 'completed').length;
                      return (
                        <div key={stage} style={{ marginBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                              backgroundColor: `${stageInfo.color}15`, color: stageInfo.color,
                            }}>
                              {stageInfo.label}
                            </span>
                            <span style={{ fontSize: '12px', color: COLORS.textMuted }}>{stageCompleted}/{stageTasks.length} done</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {stageTasks.map(task => (
                              <div
                                key={task.id}
                                onClick={() => toggleOnboardingTask(progress.employeeId, task.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '12px',
                                  padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                  backgroundColor: task.status === 'completed' ? 'rgba(16, 185, 129, 0.05)' : COLORS.lightBg,
                                  border: `1px solid ${task.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : COLORS.border}`,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{
                                  width: 22, height: 22, borderRadius: '6px',
                                  border: `2px solid ${task.status === 'completed' ? '#059669' : COLORS.border}`,
                                  backgroundColor: task.status === 'completed' ? '#059669' : 'white',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0, transition: 'all 0.15s ease',
                                }}>
                                  {task.status === 'completed' && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                                <span style={{
                                  fontSize: '14px', fontWeight: 500, flex: 1,
                                  color: task.status === 'completed' ? COLORS.textMuted : COLORS.textDark,
                                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                }}>
                                  {task.name}
                                </span>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                                  backgroundColor: COLORS.lightBg, color: COLORS.textMuted,
                                }}>
                                  {task.category}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Show message if expanded but no tasks */}
                {isExpanded && tasks.length === 0 && (
                  <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: '24px 20px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: COLORS.textMuted }}>No task breakdown available for this employee (pre-existing onboarding)</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Employee to Onboarding Modal */}
      {showAddModal && (
        <>
          <div onClick={() => setShowAddModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 250 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '440px', maxWidth: '90vw', backgroundColor: 'white', borderRadius: '24px',
            padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 251,
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700, color: COLORS.textDark }}>Add Employee to Onboarding</h2>
            {availableEmployees.length === 0 ? (
              <p style={{ fontSize: '14px', color: COLORS.textMuted }}>All active employees are already in onboarding.</p>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '8px' }}>Select Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '12px', outline: 'none', backgroundColor: 'white', marginBottom: '16px' }}
                >
                  <option value="">Choose an employee...</option>
                  {availableEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.displayName} - {emp.department}</option>
                  ))}
                </select>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '8px' }}>Onboarding Template</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {onboardingTemplates.map(tpl => (
                    <label key={tpl.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                      borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s ease',
                      border: `2px solid ${selectedTemplateId === tpl.id ? COLORS.primary : COLORS.border}`,
                      backgroundColor: selectedTemplateId === tpl.id ? 'rgba(0, 168, 168, 0.04)' : 'white',
                    }}>
                      <input
                        type="radio" name="template" value={tpl.id}
                        checked={selectedTemplateId === tpl.id}
                        onChange={() => setSelectedTemplateId(tpl.id)}
                        style={{ accentColor: COLORS.primary }}
                      />
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: COLORS.textDark }}>{tpl.name}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: COLORS.textMuted }}>{tpl.description} ({tpl.tasks.length} tasks)</p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 500, color: COLORS.textMuted, backgroundColor: COLORS.lightBg, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleInitialize}
                disabled={!selectedEmployeeId}
                style={{
                  padding: '12px 24px', fontSize: '14px', fontWeight: 600, color: 'white',
                  backgroundColor: selectedEmployeeId ? COLORS.primary : '#9CA3AF',
                  border: 'none', borderRadius: '12px', cursor: selectedEmployeeId ? 'pointer' : 'not-allowed',
                }}
              >
                Start Onboarding
              </button>
            </div>
          </div>
        </>
      )}

      {/* Manage Templates Modal */}
      {showTemplateModal && (
        <>
          <div onClick={() => setShowTemplateModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 250 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '600px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
            backgroundColor: 'white', borderRadius: '24px', padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 251,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: COLORS.textDark }}>Manage Templates</h2>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: COLORS.textMuted }}>x</button>
            </div>

            {/* Existing templates */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Existing Templates ({onboardingTemplates.length})</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {onboardingTemplates.map(tpl => (
                  <div key={tpl.id} style={{
                    padding: '14px 16px', borderRadius: '12px',
                    border: `1px solid ${editingTemplateId === tpl.id ? COLORS.primary : COLORS.border}`,
                    backgroundColor: editingTemplateId === tpl.id ? 'rgba(0, 168, 168, 0.04)' : COLORS.lightBg,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  }}>
                    {editingTemplateId === tpl.id ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input value={editTemplateName} onChange={e => setEditTemplateName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '14px', fontWeight: 600, border: `1px solid ${COLORS.border}`, borderRadius: '8px', outline: 'none' }} />
                        <input value={editTemplateDesc} onChange={e => setEditTemplateDesc(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '13px', border: `1px solid ${COLORS.border}`, borderRadius: '8px', outline: 'none' }} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingTemplateId(null)} style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.border}`, borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                          <button onClick={handleSaveEditTemplate} style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: 'white', backgroundColor: COLORS.primary, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: COLORS.textDark }}>{tpl.name}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: COLORS.textMuted }}>{tpl.description} - {tpl.tasks.length} tasks</p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                            backgroundColor: `${COLORS.primary}15`, color: COLORS.primary,
                          }}>{tpl.tasks.length} tasks</span>
                          <button onClick={() => handleStartEditTemplate(tpl)} title="Edit" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', backgroundColor: 'rgba(0, 168, 168, 0.1)', color: COLORS.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteTemplate(tpl.id)} title="Delete" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Create new template */}
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '24px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Create New Template</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Template Name</label>
                  <input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="e.g. Marketing" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '6px' }}>Description</label>
                  <input value={newTemplateDesc} onChange={e => setNewTemplateDesc(e.target.value)} placeholder="Short description" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
                </div>
              </div>

              {/* Add task row */}
              <p style={{ fontSize: '13px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '8px' }}>Add Tasks</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Task name" onKeyDown={e => e.key === 'Enter' && handleAddTask()} style={{ flex: '1 1 200px', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
                <select value={taskStage} onChange={e => setTaskStage(e.target.value)} style={{ padding: '10px 12px', fontSize: '13px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                  <option value="pre_boarding">Pre-Boarding</option>
                  <option value="day_1">Day 1</option>
                  <option value="week_1">Week 1</option>
                  <option value="month_1">Month 1</option>
                </select>
                <select value={taskCategory} onChange={e => setTaskCategory(e.target.value)} style={{ padding: '10px 12px', fontSize: '13px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                  <option value="HR">HR</option>
                  <option value="IT">IT</option>
                  <option value="Legal">Legal</option>
                  <option value="Security">Security</option>
                  <option value="Training">Training</option>
                  <option value="Management">Management</option>
                  <option value="Culture">Culture</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="Facilities">Facilities</option>
                </select>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} style={{ padding: '10px 12px', fontSize: '13px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button onClick={handleAddTask} style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: 'white', backgroundColor: COLORS.primary, border: 'none', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
              </div>

              {/* Task list */}
              {newTemplateTasks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                  {newTemplateTasks.map((t, i) => {
                    const stageInfo = STAGE_LABELS[t.stage] || { label: t.stage, color: '#666' };
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                        borderRadius: '8px', backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.border}`,
                      }}>
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: COLORS.textDark }}>{t.name}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: `${stageInfo.color}15`, color: stageInfo.color }}>{stageInfo.label}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', backgroundColor: COLORS.lightBg, color: COLORS.textMuted }}>{t.category}</span>
                        <button onClick={() => handleRemoveTask(i)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#DC2626', padding: '2px 6px' }}>x</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setShowTemplateModal(false)} style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 500, color: COLORS.textMuted, backgroundColor: COLORS.lightBg, border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={!newTemplateName.trim() || newTemplateTasks.length === 0}
                  style={{
                    padding: '12px 24px', fontSize: '14px', fontWeight: 600, color: 'white',
                    backgroundColor: (newTemplateName.trim() && newTemplateTasks.length > 0) ? COLORS.primary : '#9CA3AF',
                    border: 'none', borderRadius: '12px',
                    cursor: (newTemplateName.trim() && newTemplateTasks.length > 0) ? 'pointer' : 'not-allowed',
                  }}
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// EQUITY PAGE
// =============================================================================

function EquityPage({ onSelectEmployee }: { onSelectEmployee?: (employee: Employee, tab?: string) => void }) {
  const { cliffAlerts, isLoading, user, equityGrants, getVestingInfo, formatCurrency, displayCurrency, currentStockPrice, employees } = useHRIS();

  const canViewEquity = user?.roles.includes('hr_admin') || user?.roles.includes('finance') || user?.roles.includes('admin');

  const getAlertColor = (level: string): { bg: string; text: string; border: string } => {
    switch (level) {
      case 'critical': return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'high': return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      case 'medium': return { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' };
      default: return { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' };
    }
  };

  const equitySummary = useMemo(() => {
    let totalGranted = 0;
    let totalVested = 0;
    let totalUnvested = 0;
    let totalVestedValue = 0;
    equityGrants.forEach(grant => {
      const vesting = getVestingInfo(grant);
      totalGranted += grant.sharesGranted;
      totalVested += vesting.sharesVested;
      totalUnvested += vesting.sharesUnvested;
      totalVestedValue += vesting.vestedValue;
    });
    return { totalGranted, totalVested, totalUnvested, totalVestedValue };
  }, [equityGrants, getVestingInfo]);

  const vestingCurveData = useMemo(() => {
    const today = new Date();
    const points: { label: string; month: number; totalVested: number }[] = [];
    for (let offset = -6; offset <= 6; offset++) {
      const targetDate = new Date(today);
      targetDate.setMonth(targetDate.getMonth() + offset);
      const label = targetDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      let totalVested = 0;
      equityGrants.forEach(grant => {
        const v = calculateVesting(grant, targetDate, currentStockPrice);
        totalVested += v.sharesVested;
      });
      points.push({ label, month: offset, totalVested });
    }
    return points;
  }, [equityGrants, currentStockPrice]);

  if (!canViewEquity) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '60px 40px',
          textAlign: 'center',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto 20px',
            borderRadius: '16px',
            backgroundColor: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#DC2626',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: COLORS.textDark }}>Access Restricted</h2>
          <p style={{ margin: '12px 0 0', fontSize: '14px', color: COLORS.textMuted, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            You don't have permission to view equity information. Contact your HR administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #FF3489 0%, #F472B6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}>
          <Icons.TrendingUp />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>Equity & Vesting</h1>
          <p style={{ margin: 0, fontSize: '14px', color: COLORS.textMuted }}>
            {formatCurrency(equitySummary.totalVestedValue, 'USD')} total vested value · {cliffAlerts.length} upcoming cliff{cliffAlerts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Equity Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '20px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>Total Granted</p>
          <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>
            {equitySummary.totalGranted.toLocaleString()}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.textMuted }}>shares across {equityGrants.length} grants</p>
        </div>
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '20px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>Total Vested</p>
          <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: COLORS.primary, letterSpacing: '-0.025em' }}>
            {equitySummary.totalVested.toLocaleString()}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.primary }}>
            {equitySummary.totalGranted > 0 ? Math.round((equitySummary.totalVested / equitySummary.totalGranted) * 100) : 0}% of total
          </p>
        </div>
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '20px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>Total Unvested</p>
          <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: COLORS.accent, letterSpacing: '-0.025em' }}>
            {equitySummary.totalUnvested.toLocaleString()}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.accent }}>
            {equitySummary.totalGranted > 0 ? Math.round((equitySummary.totalUnvested / equitySummary.totalGranted) * 100) : 0}% remaining
          </p>
        </div>
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '20px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>Total Equity Value ({displayCurrency})</p>
          <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: COLORS.secondary, letterSpacing: '-0.025em' }}>
            {formatCurrency(equitySummary.totalVestedValue, 'USD')}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.textMuted }}>at ${currentStockPrice.toFixed(2)}/share</p>
        </div>
      </div>

      {/* Company Vesting Curve */}
      <div style={{
        backgroundColor: COLORS.cardBg,
        borderRadius: '24px',
        padding: '24px',
        boxShadow: SHADOW.card,
        border: `1px solid ${COLORS.border}`,
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>
            Company Vesting Schedule (Annual Steps)
          </h3>
          <span style={{ fontSize: '12px', color: COLORS.textMuted }}>
            6 months ago → 6 months ahead
          </span>
        </div>
        <div style={{ height: '240px', position: 'relative' }}>
          {(() => {
            const maxVested = Math.max(...vestingCurveData.map(d => d.totalVested), 1);
            const chartLeft = 60;
            const chartRight = 480;
            const chartTop = 20;
            const chartBottom = 200;
            const chartHeight = chartBottom - chartTop;
            const chartWidth = chartRight - chartLeft;
            const stepX = chartWidth / 12;
            const getX = (i: number) => chartLeft + i * stepX;
            const getY = (val: number) => chartBottom - (val / maxVested) * chartHeight;
            const todayIndex = 6;

            return (
              <svg width="100%" height="100%" viewBox="0 0 500 240" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="vestingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF3489" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#FF3489" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Y-axis labels + grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const val = maxVested * (1 - pct);
                  const y = chartTop + pct * chartHeight;
                  return (
                    <g key={i}>
                      <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={COLORS.border} strokeWidth="1" />
                      <text x={chartLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill={COLORS.textMuted}>
                        {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
                {/* Step-function area fill */}
                <path
                  d={(() => {
                    let d = `M${getX(0)},${getY(vestingCurveData[0].totalVested)}`;
                    for (let i = 1; i < vestingCurveData.length; i++) {
                      d += ` L${getX(i)},${getY(vestingCurveData[i - 1].totalVested)}`;
                      d += ` L${getX(i)},${getY(vestingCurveData[i].totalVested)}`;
                    }
                    d += ` L${getX(12)},${chartBottom} L${getX(0)},${chartBottom} Z`;
                    return d;
                  })()}
                  fill="url(#vestingGradient)"
                />
                {/* Step-function line */}
                <path
                  d={(() => {
                    let d = `M${getX(0)},${getY(vestingCurveData[0].totalVested)}`;
                    for (let i = 1; i < vestingCurveData.length; i++) {
                      d += ` L${getX(i)},${getY(vestingCurveData[i - 1].totalVested)}`;
                      d += ` L${getX(i)},${getY(vestingCurveData[i].totalVested)}`;
                    }
                    return d;
                  })()}
                  fill="none"
                  stroke="#FF3489"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Data points */}
                {vestingCurveData.map((d, i) => (
                  <circle key={i} cx={getX(i)} cy={getY(d.totalVested)} r={i === todayIndex ? 5 : 3.5} fill={i === todayIndex ? '#FF3489' : 'white'} stroke="#FF3489" strokeWidth="2" />
                ))}
                {/* Today marker */}
                <line x1={getX(todayIndex)} y1={chartTop} x2={getX(todayIndex)} y2={chartBottom} stroke="#FF3489" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4" />
                <text x={getX(todayIndex)} y={chartTop - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#FF3489">Today</text>
                {/* X-axis labels */}
                {vestingCurveData.map((d, i) => (
                  <text key={i} x={getX(i)} y={chartBottom + 18} textAnchor="middle" fontSize="10" fill={i === todayIndex ? '#FF3489' : COLORS.textMuted} fontWeight={i === todayIndex ? 600 : 400}>
                    {d.label}
                  </text>
                ))}
              </svg>
            );
          })()}
        </div>
      </div>

      {/* Alert Level Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {['critical', 'high', 'medium', 'low'].map(level => {
          const count = cliffAlerts.filter(a => a.alertLevel === level).length;
          const colors = getAlertColor(level);
          return (
            <div key={level} style={{
              backgroundColor: COLORS.cardBg,
              borderRadius: '16px',
              padding: '16px 20px',
              boxShadow: SHADOW.card,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `4px solid ${colors.border}`,
            }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: COLORS.textMuted, textTransform: 'capitalize' }}>
                {level}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700, color: colors.text }}>
                {count}
              </p>
            </div>
          );
        })}
      </div>

      {/* Cliff Alerts Card */}
      <div style={{
        backgroundColor: COLORS.cardBg,
        borderRadius: '24px',
        boxShadow: SHADOW.card,
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${COLORS.borderMedium}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>Upcoming Cliffs</h2>
          <span style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: COLORS.accent,
            color: 'white',
          }}>
            Next 90 Days
          </span>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : cliffAlerts.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              margin: '0 auto 16px',
              borderRadius: '16px',
              backgroundColor: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}>
              <Icons.Check />
            </div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>No upcoming cliffs</p>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: COLORS.textMuted }}>
              All equity vesting is on track
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...TABLE_STYLE, minWidth: '700px' }}>
              <colgroup>
                <col style={{ width: '26%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: COLORS.lightBg }}>
                  {['Employee', 'Grant', 'Cliff Date', 'Shares', 'Days Until', 'Alert Level'].map(header => (
                    <th key={header} style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cliffAlerts.map((alert, index) => {
                  const colors = getAlertColor(alert.alertLevel);

                  return (
                    <tr key={`${alert.employeeId}-${alert.grantNumber}`} style={{
                      backgroundColor: index % 2 === 0 ? COLORS.cardBg : COLORS.lightBg,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => {
                      const emp = employees.find(e => e.id === alert.employeeId);
                      if (emp && onSelectEmployee) onSelectEmployee(emp, 'equity');
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDF2F8'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? COLORS.cardBg : COLORS.lightBg}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <Avatar name={alert.employeeName} size={40} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: COLORS.textDark, ...TRUNCATE }}>
                              {alert.employeeName}
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: COLORS.textMuted, ...TRUNCATE }}>
                              {alert.department}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: COLORS.secondary, fontWeight: 500 }}>
                        {alert.grantNumber}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: COLORS.textDark }}>
                        {new Date(alert.cliffDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: COLORS.textDark }}>
                        {alert.cliffShares.toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: alert.daysUntilCliff <= 30 ? '#DC2626' : alert.daysUntilCliff <= 60 ? '#D97706' : COLORS.textDark,
                        }}>
                          {alert.daysUntilCliff} days
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: colors.bg,
                          color: colors.text,
                          textTransform: 'capitalize',
                        }}>
                          {alert.alertLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// REPORTS PAGE - Analytics & Charts
// =============================================================================

function ReportsPage() {
  const { employees, user, displayCurrency, convertToDisplayCurrency, formatCurrency, getSalaryHistory, maskPII } = useHRIS();

  const canExport = user?.roles.includes('hr_admin') || user?.roles.includes('finance') || user?.roles.includes('admin');
  const canViewSalary = maskPII.canViewSalary();

  // Mock headcount data for last 6 months
  const headcountData = [
    { month: 'Sep', count: 22 },
    { month: 'Oct', count: 24 },
    { month: 'Nov', count: 26 },
    { month: 'Dec', count: 27 },
    { month: 'Jan', count: 29 },
    { month: 'Feb', count: 31 },
  ];

  // Mock burn rate data (raw USD), converted to display currency
  const burnRateData = useMemo(() => {
    // Compute burn rate dynamically from salary history for the last 6 months
    const now = new Date();
    const months: { month: string; date: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toLocaleDateString('en-US', { month: 'short' }), date: d });
    }
    return months.map(({ month, date }) => {
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      let totalMonthly = 0;
      const activeEmps = employees.filter(e => e.currentStatus === 'active');
      for (const emp of activeEmps) {
        const history = getSalaryHistory(emp.id);
        // Find the salary record effective for this month
        const applicable = history
          .filter(s => new Date(s.effectiveDate) <= monthEnd)
          .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
        if (applicable.length > 0) {
          totalMonthly += applicable[0].amount;
        }
      }
      return { month, amount: convertToDisplayCurrency(totalMonthly || 0, 'USD') };
    });
  }, [employees, getSalaryHistory, convertToDisplayCurrency]);

  // Calculate department distribution
  const departmentData = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(emp => {
      counts[emp.department] = (counts[emp.department] || 0) + 1;
    });
    const colors = ['#00A8A8', '#743CF7', '#FF3489', '#F9BD63', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'];
    return Object.entries(counts).map(([dept, count], i) => ({
      department: dept,
      count,
      percentage: Math.round((count / employees.length) * 100),
      color: colors[i % colors.length],
    })).sort((a, b) => b.count - a.count);
  }, [employees]);

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportCSV = () => {
    // Generate CSV data
    const headers = ['Name', 'Email', 'Department', 'Job Title', 'Location', 'Hire Date'];
    const rows = employees.map(emp => [
      emp.displayName,
      emp.workEmail,
      emp.department,
      emp.jobTitle,
      emp.locationName,
      emp.originalHireDate,
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'octup-employees-report.csv';
    a.click();
  };

  // SVG Chart helpers
  const maxHeadcount = Math.max(...headcountData.map(d => d.count));
  const maxBurnRate = Math.max(...burnRateData.map(d => d.amount));

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '16px',
            backgroundColor: 'rgba(116, 60, 247, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.secondary,
          }}>
            <Icons.Chart />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>Reports & Analytics</h1>
            <p style={{ margin: 0, fontSize: '14px', color: COLORS.textMuted }}>
              Track company metrics and trends
            </p>
          </div>
        </div>
        {canExport && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleExportCSV}
              {...BTN_HANDLERS}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: 'white',
                color: COLORS.textDark,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.filter = 'brightness(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              {...BTN_HANDLERS}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: COLORS.secondary,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(116, 60, 247, 0.25)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Download PDF Report
            </button>
          </div>
        )}
      </div>

      {/* KPI Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '20px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>Total Employees</p>
          <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>{employees.length}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.primary }}>{employees.filter(e => e.currentStatus === 'active').length} active</p>
        </div>
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '20px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>Monthly Burn Rate</p>
          <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>{canViewSalary ? formatCurrency(burnRateData.length > 0 ? burnRateData[burnRateData.length - 1].amount : 0) : '$***,***'}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#D97706' }}>{canViewSalary && burnRateData.length >= 2 ? `${((burnRateData[burnRateData.length - 1].amount / burnRateData[burnRateData.length - 2].amount - 1) * 100).toFixed(1)}% from last month` : canViewSalary ? 'Current month' : 'Restricted'}</p>
        </div>
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '20px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>Departments</p>
          <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>{departmentData.length}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.textMuted }}>Active departments</p>
        </div>
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '20px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>Avg Tenure</p>
          <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>{(() => {
            const activeEmps = employees.filter(e => e.currentStatus === 'active' && e.originalHireDate);
            if (activeEmps.length === 0) return '—';
            const now = new Date();
            const totalMonths = activeEmps.reduce((sum, e) => {
              const hire = new Date(e.originalHireDate);
              return sum + (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
            }, 0);
            const avg = totalMonths / activeEmps.length;
            return avg >= 12 ? `${(avg / 12).toFixed(1)} yr` : `${avg.toFixed(1)} mo`;
          })()}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: COLORS.primary }}>Growing team</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Headcount Growth Chart */}
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '24px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>
            Headcount Growth
          </h3>
          <div style={{ height: '200px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line key={i} x1="50" y1={40 + i * 35} x2="380" y2={40 + i * 35} stroke={COLORS.border} strokeWidth="1" />
              ))}
              {/* Area fill */}
              <path
                d={`M50,${180 - ((headcountData[0].count / maxHeadcount) * 140)} ${headcountData.map((d, i) => `L${50 + i * 66},${180 - ((d.count / maxHeadcount) * 140)}`).join(' ')} L380,180 L50,180 Z`}
                fill="url(#areaGradient)"
                opacity="0.3"
              />
              {/* Line */}
              <path
                d={`M50,${180 - ((headcountData[0].count / maxHeadcount) * 140)} ${headcountData.map((d, i) => `L${50 + i * 66},${180 - ((d.count / maxHeadcount) * 140)}`).join(' ')}`}
                fill="none"
                stroke={COLORS.primary}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {headcountData.map((d, i) => (
                <circle key={i} cx={50 + i * 66} cy={180 - ((d.count / maxHeadcount) * 140)} r="5" fill={COLORS.primary} />
              ))}
              {/* X-axis labels */}
              {headcountData.map((d, i) => (
                <text key={i} x={50 + i * 66} y="198" textAnchor="middle" fontSize="11" fill={COLORS.textMuted}>
                  {d.month}
                </text>
              ))}
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={COLORS.primary} stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Burn Rate Trend Chart */}
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '24px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>
            Monthly Burn Rate ({displayCurrency})
          </h3>
          <div style={{ height: '200px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
              {/* Grid lines + Y-axis labels */}
              {[0, 1, 2, 3, 4].map(i => {
                const yVal = maxBurnRate - (i * maxBurnRate / 4);
                return (
                  <g key={i}>
                    <line x1="50" y1={40 + i * 35} x2="380" y2={40 + i * 35} stroke={COLORS.border} strokeWidth="1" />
                    <text x="46" y={44 + i * 35} textAnchor="end" fontSize="9" fill={COLORS.textMuted}>
                      {formatCurrency(Math.round(yVal))}
                    </text>
                  </g>
                );
              })}
              {/* Bars */}
              {burnRateData.map((d, i) => {
                const barHeight = (d.amount / maxBurnRate) * 140;
                return (
                  <rect
                    key={i}
                    x={50 + i * 58}
                    y={180 - barHeight}
                    width="40"
                    height={barHeight}
                    fill={COLORS.secondary}
                    rx="4"
                    opacity="0.85"
                  />
                );
              })}
              {/* X-axis labels */}
              {burnRateData.map((d, i) => (
                <text key={i} x={70 + i * 58} y="198" textAnchor="middle" fontSize="11" fill={COLORS.textMuted}>
                  {d.month}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Department Distribution Donut */}
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '24px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>
            Department Distribution
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {/* Donut Chart */}
            <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                {(() => {
                  let cumulativePercent = 0;
                  return departmentData.map((d, i) => {
                    const startAngle = cumulativePercent * 3.6 * (Math.PI / 180);
                    cumulativePercent += d.percentage;
                    const endAngle = cumulativePercent * 3.6 * (Math.PI / 180);
                    const largeArcFlag = d.percentage > 50 ? 1 : 0;
                    const x1 = 80 + 60 * Math.sin(startAngle);
                    const y1 = 80 - 60 * Math.cos(startAngle);
                    const x2 = 80 + 60 * Math.sin(endAngle);
                    const y2 = 80 - 60 * Math.cos(endAngle);
                    return (
                      <path
                        key={i}
                        d={`M 80 80 L ${x1} ${y1} A 60 60 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                        fill={d.color}
                      />
                    );
                  });
                })()}
                {/* Center circle for donut effect */}
                <circle cx="80" cy="80" r="35" fill={COLORS.cardBg} />
                <text x="80" y="76" textAnchor="middle" fontSize="18" fontWeight="700" fill={COLORS.textDark}>
                  {employees.length}
                </text>
                <text x="80" y="92" textAnchor="middle" fontSize="10" fill={COLORS.textMuted}>
                  Total
                </text>
              </svg>
            </div>
            {/* Legend */}
            <div style={{ flex: 1 }}>
              {departmentData.slice(0, 6).map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: COLORS.textDark, flex: 1 }}>{d.department}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textDark }}>{d.count}</span>
                  <span style={{ fontSize: '12px', color: COLORS.textMuted }}>({d.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Location Breakdown */}
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '24px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: COLORS.textDark }}>
            Employees by Location
          </h3>
          {[
            { name: 'Tel Aviv Office', count: employees.filter(e => e.location === 'TLV').length, color: COLORS.primary },
            { name: 'Toronto Office', count: employees.filter(e => e.location === 'TOR').length, color: COLORS.secondary },
            { name: 'United States (Remote)', count: employees.filter(e => e.location === 'US').length, color: '#FF3489' },
          ].map((loc, i) => (
            <div key={i} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', color: COLORS.textDark }}>{loc.name}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textDark }}>{loc.count}</span>
              </div>
              <div style={{ height: 8, backgroundColor: COLORS.lightBg, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${(loc.count / employees.length) * 100}%`,
                  height: '100%',
                  backgroundColor: loc.color,
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SETTINGS PAGE - Organization & Preferences
// =============================================================================

function SettingsPage() {
  const { user, setUserRole, employees } = useHRIS();

  const isAdmin = user?.roles.includes('hr_admin') || user?.roles.includes('admin');

  // Organization settings state
  const [companyName, setCompanyName] = useState('Octup');
  const [companyDomain, setCompanyDomain] = useState('octup.com');

  // User roles for role management — persisted in localStorage
  const DEFAULT_USER_ROLES = [
    { id: 'user_1', name: 'Alon Partuk', email: 'alon@octup.com', role: 'admin' as const },
    { id: 'user_2', name: 'Yarden Mantzur', email: 'yarden@octup.com', role: 'hr_admin' as const },
    { id: 'user_3', name: 'Hagai Gold', email: 'hagai@octup.com', role: 'finance' as const },
    { id: 'user_4', name: 'Nissan Hazzan', email: 'nissan@octup.com', role: 'manager' as const },
    { id: 'user_5', name: 'Sabina Basina', email: 'sabina@octup.com', role: 'employee' as const },
  ];
  const [userRoles, setUserRoles] = useState<typeof DEFAULT_USER_ROLES>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hris_user_roles');
      if (saved) { try { return JSON.parse(saved); } catch {} }
    }
    return DEFAULT_USER_ROLES;
  });

  // Persist userRoles to localStorage on every change
  useEffect(() => {
    localStorage.setItem('hris_user_roles', JSON.stringify(userRoles));
  }, [userRoles]);

  // Role permission definitions
  const PERMISSION_LABELS: { key: string; label: string }[] = [
    { key: 'canViewSalary', label: 'View Salary' },
    { key: 'canEditEquity', label: 'Edit Equity' },
    { key: 'canViewReports', label: 'View Reports' },
    { key: 'canManageEmployees', label: 'Manage Employees' },
    { key: 'canManageAssets', label: 'Manage Assets' },
    { key: 'canManageOnboarding', label: 'Manage Onboarding' },
  ];

  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    admin: { canViewSalary: true, canEditEquity: true, canViewReports: true, canManageEmployees: true, canManageAssets: true, canManageOnboarding: true },
    hr_admin: { canViewSalary: true, canEditEquity: true, canViewReports: true, canManageEmployees: true, canManageAssets: true, canManageOnboarding: true },
    finance: { canViewSalary: true, canEditEquity: false, canViewReports: true, canManageEmployees: false, canManageAssets: false, canManageOnboarding: false },
    manager: { canViewSalary: false, canEditEquity: false, canViewReports: true, canManageEmployees: false, canManageAssets: false, canManageOnboarding: true },
    employee: { canViewSalary: false, canEditEquity: false, canViewReports: false, canManageEmployees: false, canManageAssets: false, canManageOnboarding: false },
  });

  const togglePermission = (role: string, permission: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: { ...prev[role], [permission]: !prev[role]?.[permission] },
    }));
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('employee');

  const handleSaveOrganization = () => {
    // Settings saved locally
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setUserRoles(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    setEditingUserId(null);
  };

  const handleAddUser = () => {
    if (newUserName && newUserEmail) {
      setUserRoles(prev => [...prev, {
        id: `user_${Date.now()}`,
        name: newUserName,
        email: newUserEmail,
        role: newUserRole as any,
      }]);
      setShowAddUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('employee');
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUserRoles(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '16px',
          backgroundColor: 'rgba(0, 168, 168, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.primary,
        }}>
          <Icons.Settings />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>Settings</h1>
          <p style={{ margin: 0, fontSize: '14px', color: COLORS.textMuted }}>
            Manage organization settings and roles
          </p>
        </div>
      </div>

      {/* Organization Profile (Admin Only) */}
      {isAdmin && (
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600, color: COLORS.textDark }}>
            Organization Profile
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: COLORS.textDark }}>
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => { e.target.style.borderColor = COLORS.primary; e.target.style.boxShadow = '0 0 0 3px rgba(0, 168, 168, 0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: COLORS.textDark }}>
                Domain
              </label>
              <input
                type="text"
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => { e.target.style.borderColor = COLORS.primary; e.target.style.boxShadow = '0 0 0 3px rgba(0, 168, 168, 0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveOrganization}
              {...BTN_HANDLERS}
              style={{
                padding: '12px 24px',
                backgroundColor: COLORS.primary,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Save Organization Settings
            </button>
          </div>
        </div>
      )}


      {/* Role Management (Admin Only) */}
      {isAdmin && (
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '24px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: COLORS.textDark }}>
              Role Management
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'rgba(116, 60, 247, 0.1)',
                color: COLORS.secondary,
              }}>
                Admin Only
              </span>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                style={{
                  padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white',
                  backgroundColor: COLORS.primary, border: 'none', borderRadius: '10px', cursor: 'pointer',
                }}
              >
                {showAddUser ? 'Cancel' : '+ Add User'}
              </button>
            </div>
          </div>
          {/* Add User Form */}
          {showAddUser && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '4px' }}>Name</label>
                <input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Full name" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '4px' }}>Email</label>
                <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="email@octup.com" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: COLORS.textMuted, marginBottom: '4px' }}>Role</label>
                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={{ padding: '10px 14px', fontSize: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', outline: 'none', backgroundColor: 'white' }}>
                  <option value="admin">Admin</option>
                  <option value="hr_admin">HR Admin</option>
                  <option value="finance">Finance</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <button onClick={handleAddUser} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: 'white', backgroundColor: COLORS.primary, border: 'none', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={TABLE_STYLE}>
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Role</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userRoles.map((u, i) => {
                  const roleColors: Record<string, { bg: string; text: string }> = {
                    admin: { bg: 'rgba(255, 52, 137, 0.1)', text: '#FF3489' },
                    hr_admin: { bg: 'rgba(0, 168, 168, 0.1)', text: COLORS.primary },
                    finance: { bg: 'rgba(116, 60, 247, 0.1)', text: COLORS.secondary },
                    manager: { bg: 'rgba(249, 189, 99, 0.15)', text: '#D97706' },
                    employee: { bg: COLORS.lightBg, text: COLORS.textMuted },
                  };
                  const colors = roleColors[u.role] || roleColors.employee;

                  return (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Avatar name={u.name} size={36} />
                          <span style={{ fontSize: '14px', fontWeight: 500, color: COLORS.textDark }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: COLORS.textMuted }}>{u.email}</td>
                      <td style={{ padding: '16px' }}>
                        {editingUserId === u.id ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            autoFocus
                            style={{
                              padding: '6px 12px',
                              fontSize: '13px',
                              border: `1px solid ${COLORS.primary}`,
                              borderRadius: '8px',
                              outline: 'none',
                              backgroundColor: 'white',
                            }}
                          >
                            <option value="admin">Admin</option>
                            <option value="hr_admin">HR Admin</option>
                            <option value="finance">Finance</option>
                            <option value="manager">Manager</option>
                            <option value="employee">Employee</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: colors.bg,
                            color: colors.text,
                            textTransform: 'capitalize',
                          }}>
                            {u.role.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {editingUserId === u.id ? (
                          <button
                            onClick={() => setEditingUserId(null)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '13px',
                              color: COLORS.textMuted,
                              backgroundColor: 'transparent',
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setEditingUserId(u.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                color: COLORS.primary,
                                backgroundColor: 'rgba(0, 168, 168, 0.1)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 500,
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 168, 168, 0.2)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0, 168, 168, 0.1)'}
                            >
                              Edit Role
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                color: '#DC2626',
                                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 500,
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.2)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'}
                            >
                              Delete
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
      )}

      {/* Role Permissions Matrix (Admin Only) */}
      {isAdmin && (
        <div style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: '24px',
          padding: '24px',
          marginTop: '24px',
          boxShadow: SHADOW.card,
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: COLORS.textDark }}>
              Role Permissions
            </h2>
            <span style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'rgba(116, 60, 247, 0.1)',
              color: COLORS.secondary,
            }}>
              Super Admin
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={TABLE_STYLE}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '120px' }}>
                    Role
                  </th>
                  {PERMISSION_LABELS.map(perm => (
                    <th key={perm.key} style={{ padding: '12px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {perm.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['admin', 'hr_admin', 'finance', 'manager', 'employee'].map((role, i) => {
                  const roleLabels: Record<string, string> = { admin: 'Admin', hr_admin: 'HR Admin', finance: 'Finance', manager: 'Manager', employee: 'Employee' };
                  const roleColor: Record<string, { bg: string; text: string }> = {
                    admin: { bg: 'rgba(255, 52, 137, 0.1)', text: '#FF3489' },
                    hr_admin: { bg: 'rgba(0, 168, 168, 0.1)', text: COLORS.primary },
                    finance: { bg: 'rgba(116, 60, 247, 0.1)', text: COLORS.secondary },
                    manager: { bg: 'rgba(249, 189, 99, 0.15)', text: '#D97706' },
                    employee: { bg: COLORS.lightBg, text: COLORS.textMuted },
                  };
                  const c = roleColor[role] || roleColor.employee;
                  return (
                    <tr key={role} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                          fontWeight: 600, backgroundColor: c.bg, color: c.text, textTransform: 'capitalize',
                        }}>
                          {roleLabels[role]}
                        </span>
                      </td>
                      {PERMISSION_LABELS.map(perm => {
                        const isEnabled = rolePermissions[role]?.[perm.key] ?? false;
                        return (
                          <td key={perm.key} style={{ padding: '14px 10px', textAlign: 'center' }}>
                            <button
                              onClick={() => togglePermission(role, perm.key)}
                              style={{
                                width: '40px',
                                height: '22px',
                                borderRadius: '11px',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                backgroundColor: isEnabled ? COLORS.primary : '#D1D5DB',
                                transition: 'background-color 0.2s ease',
                                padding: 0,
                              }}
                            >
                              <span style={{
                                position: 'absolute',
                                top: '2px',
                                left: isEnabled ? '20px' : '2px',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                transition: 'left 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PAGE ROUTER
// =============================================================================

function AccessDenied({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '24px',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', marginBottom: '24px',
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.025em' }}>403 — Access Denied</h1>
      <p style={{ margin: '12px 0 0', fontSize: '15px', color: COLORS.textMuted, maxWidth: '400px', lineHeight: 1.6 }}>
        You don't have the required permissions to view this page. Contact your administrator if you believe this is an error.
      </p>
      <button
        onClick={() => onNavigate('dashboard')}
        style={{
          marginTop: '24px', padding: '12px 28px', fontSize: '14px', fontWeight: 600,
          color: 'white', backgroundColor: COLORS.primary, border: 'none',
          borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s ease',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function PageContent({ page, onSelectEmployee, onNavigate }: { page: string; onSelectEmployee: (employee: Employee, tab?: string) => void; onNavigate: (page: string) => void }) {
  const { user } = useHRIS();
  const userRoles: string[] = user?.roles || [];

  // Auth guard: check role-gated pages
  if (page === 'settings' && !userRoles.some(r => ['hr_admin', 'admin'].includes(r))) {
    return <AccessDenied onNavigate={onNavigate} />;
  }
  if (page === 'reports' && !userRoles.some(r => ['hr_admin', 'admin', 'finance', 'manager'].includes(r))) {
    return <AccessDenied onNavigate={onNavigate} />;
  }
  if (page === 'equity' && !userRoles.some(r => ['hr_admin', 'admin', 'finance'].includes(r))) {
    return <AccessDenied onNavigate={onNavigate} />;
  }

  switch (page) {
    case 'dashboard':
      return <Dashboard onNavigate={onNavigate} />;
    case 'employees':
      return <EmployeesPage onSelectEmployee={onSelectEmployee} />;
    case 'assets':
      return <AssetsPage />;
    case 'onboarding':
      return <OnboardingPage />;
    case 'equity':
      return <EquityPage onSelectEmployee={onSelectEmployee} />;
    case 'reports':
      return <ReportsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <Dashboard onNavigate={onNavigate} />;
  }
}

// =============================================================================
// MAIN APP
// =============================================================================

export default function Home() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [defaultProfileTab, setDefaultProfileTab] = useState<string | undefined>(undefined);
  const { selectedEmployee, isEmployeePanelOpen, setSelectedEmployee, setEmployeePanelOpen } = useHRIS();

  const handleSelectEmployee = (employee: Employee, tab?: string) => {
    setDefaultProfileTab(tab);
    setSelectedEmployee(employee);
    setEmployeePanelOpen(true);
  };

  const handleClosePanel = () => {
    setEmployeePanelOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      <PageContent page={currentPage} onSelectEmployee={handleSelectEmployee} onNavigate={setCurrentPage} />

      {/* Global Employee Profile SlideOver */}
      {isEmployeePanelOpen && selectedEmployee && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250 }}>
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            onClick={handleClosePanel}
          />
          {/* Panel */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            maxWidth: '560px',
            backgroundColor: 'white',
            boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.25s ease-out',
          }}>
            {/* Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: `1px solid ${COLORS.borderMedium}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: COLORS.textDark,
                  letterSpacing: '-0.02em',
                }}>
                  Employee Profile
                </h2>
                <p style={{ margin: 0, marginTop: '4px', fontSize: '13px', color: COLORS.textMuted }}>
                  View and manage employee details
                </p>
              </div>
              <button
                onClick={handleClosePanel}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: COLORS.lightBg,
                  cursor: 'pointer',
                  color: COLORS.textMuted,
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = COLORS.borderMedium;
                  e.currentTarget.style.color = COLORS.textDark;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = COLORS.lightBg;
                  e.currentTarget.style.color = COLORS.textMuted;
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '28px',
              boxShadow: SHADOW.card,
            }}>
              <EmployeeProfilePanel employee={selectedEmployee} defaultTab={defaultProfileTab} />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
