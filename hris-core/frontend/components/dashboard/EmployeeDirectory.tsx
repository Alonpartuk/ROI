/**
 * Employee Directory - Octup HRIS Premium
 * Linear/Stripe-inspired SaaS data table
 * Features: search, filters, sorting, PII masking, skeleton loading
 */

import React, { useState, useMemo } from 'react';
import { useHRIS } from '../../context/HRISContext';
import { Employee, LocationCode } from '../../types';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const COLORS = {
  // SaaS Palette
  bg: '#F3F4F6',
  card: '#FFFFFF',
  primary: '#00A8A8',
  secondary: '#743CF7',
  accent: '#FF3489',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  hoverBg: 'rgba(0, 0, 0, 0.02)',

  // Semantic
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

// =============================================================================
// INLINE SVG ICONS (Lucide-style, consistent sizing)
// =============================================================================

const Icons = {
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  ),
  Filter: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  MapPin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Building: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" />
      <path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" />
      <path d="M8 10h.01" /><path d="M8 14h.01" />
    </svg>
  ),
  ChevronUp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Mail: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
};

// =============================================================================
// LOCATION CONFIG - High contrast badges
// =============================================================================

const LOCATION_CONFIG: Record<LocationCode, { label: string; abbrev: string; bg: string; color: string }> = {
  TLV: { label: 'Tel Aviv', abbrev: 'TLV', bg: '#DBEAFE', color: '#1D4ED8' },
  TOR: { label: 'Toronto', abbrev: 'TOR', bg: '#FEE2E2', color: '#B91C1C' },
  US: { label: 'United States', abbrev: 'US', bg: '#D1FAE5', color: '#047857' },
};

// =============================================================================
// AVATAR COMPONENT - Premium circular avatar
// =============================================================================

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = [
    { bg: 'linear-gradient(135deg, #00A8A8 0%, #00CBC0 100%)', text: '#FFFFFF' },
    { bg: 'linear-gradient(135deg, #743CF7 0%, #8B5CF6 100%)', text: '#FFFFFF' },
    { bg: 'linear-gradient(135deg, #FF3489 0%, #EC4899 100%)', text: '#FFFFFF' },
    { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', text: '#FFFFFF' },
    { bg: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', text: '#FFFFFF' },
    { bg: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)', text: '#FFFFFF' },
  ];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const scheme = colors[colorIndex];

  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: scheme.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: scheme.text,
      fontWeight: 600,
      fontSize: `${size * 0.38}px`,
      flexShrink: 0,
      boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
    }}>
      {initials}
    </div>
  );
}

// =============================================================================
// LOCATION BADGE - High contrast rounded pill
// =============================================================================

function LocationBadge({ location }: { location: LocationCode }) {
  const config = LOCATION_CONFIG[location];
  if (!config) return null;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 12px',
      borderRadius: '9999px',
      backgroundColor: config.bg,
      color: config.color,
      fontSize: '12px',
      fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      {config.abbrev}
    </span>
  );
}

// =============================================================================
// SKELETON LOADER - Premium shimmer
// =============================================================================

function TableSkeleton() {
  return (
    <div style={{ padding: '32px' }}>
      {/* Search skeleton */}
      <div className="shimmer" style={{ height: '48px', borderRadius: '14px', marginBottom: '24px' }} />

      {/* Filter row skeleton */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div className="shimmer" style={{ height: '40px', width: '140px', borderRadius: '10px' }} />
        <div className="shimmer" style={{ height: '40px', width: '140px', borderRadius: '10px' }} />
      </div>

      {/* Table rows skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '20px 24px',
            borderRadius: '12px',
            backgroundColor: i % 2 === 0 ? '#FAFAFA' : 'transparent',
          }}>
            <div className="shimmer" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="shimmer" style={{ height: '16px', width: '160px', borderRadius: '6px' }} />
              <div className="shimmer" style={{ height: '12px', width: '200px', borderRadius: '4px' }} />
            </div>
            <div className="shimmer" style={{ height: '14px', width: '120px', borderRadius: '6px' }} />
            <div className="shimmer" style={{ height: '14px', width: '100px', borderRadius: '6px' }} />
            <div className="shimmer" style={{ height: '28px', width: '60px', borderRadius: '9999px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN EMPLOYEE DIRECTORY COMPONENT
// =============================================================================

export function EmployeeDirectory() {
  const { employees, isLoading, user, setSelectedEmployee, setEmployeePanelOpen } = useHRIS();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'department' | 'location'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Check if user can see PII
  const canSeePII = user?.roles?.includes('hr_admin') || user?.roles?.includes('admin');

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let result = statusFilter === 'all'
      ? [...employees]
      : employees.filter(e => e.currentStatus === statusFilter);

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.displayName.toLowerCase().includes(query) ||
        e.workEmail?.toLowerCase().includes(query) ||
        e.jobTitle?.toLowerCase().includes(query)
      );
    }

    // Location filter
    if (locationFilter !== 'all') {
      result = result.filter(e => e.location === locationFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      result = result.filter(e => e.department === departmentFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';

      switch (sortField) {
        case 'name':
          aVal = a.displayName;
          bVal = b.displayName;
          break;
        case 'department':
          aVal = a.department || '';
          bVal = b.department || '';
          break;
        case 'location':
          aVal = a.location || '';
          bVal = b.location || '';
          break;
      }

      const comparison = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [employees, statusFilter, searchQuery, locationFilter, departmentFilter, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: 'name' | 'department' | 'location') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Mask email for non-admin users
  const maskEmail = (email: string) => {
    if (canSeePII) return email;
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div>
      {/* Search and Filters - Premium header */}
      <div style={{ padding: '24px 28px', borderBottom: `1px solid ${COLORS.borderLight}` }}>
        {/* Header row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: '-0.02em',
          }}>
            Team Directory
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(0, 168, 168, 0.08)',
            color: COLORS.primary,
          }}>
            <Icons.Users />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {filteredEmployees.length} members
            </span>
          </div>
        </div>

        {/* Search - Premium glassmorphism style */}
        <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '480px' }}>
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: COLORS.muted,
            zIndex: 1,
          }}>
            <Icons.Search />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              height: '48px',
              paddingLeft: '48px',
              paddingRight: '20px',
              borderRadius: '14px',
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.bg,
              fontSize: '14px',
              color: COLORS.text,
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = COLORS.primary;
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 168, 168, 0.1)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = COLORS.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Filters Row - Clean pill filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 5 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: COLORS.muted,
            fontSize: '13px',
            fontWeight: 500,
          }}>
            <Icons.Filter />
            <span>Filters:</span>
          </div>

          {/* Status Toggle Pills */}
          <div style={{
            display: 'flex',
            borderRadius: '10px',
            overflow: 'hidden',
            border: `1px solid ${COLORS.border}`,
          }}>
            {(['active', 'inactive', 'all'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0 14px',
                  height: '38px',
                  fontSize: '13px',
                  fontWeight: statusFilter === status ? 600 : 500,
                  color: statusFilter === status ? 'white' : COLORS.text,
                  backgroundColor: statusFilter === status ? COLORS.primary : COLORS.card,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textTransform: 'capitalize',
                }}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Location Filter - Premium select */}
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            style={{
              height: '38px',
              padding: '0 32px 0 12px',
              borderRadius: '10px',
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.card,
              fontSize: '13px',
              fontWeight: 500,
              color: COLORS.text,
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              transition: 'all 0.15s ease',
            }}
          >
            <option value="all">All Locations</option>
            {Object.entries(LOCATION_CONFIG).map(([code, config]) => (
              <option key={code} value={code}>{config.label}</option>
            ))}
          </select>

          {/* Department Filter - Premium select */}
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            style={{
              height: '38px',
              padding: '0 32px 0 12px',
              borderRadius: '10px',
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.card,
              fontSize: '13px',
              fontWeight: 500,
              color: COLORS.text,
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              transition: 'all 0.15s ease',
            }}
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table - Premium SaaS style with no vertical borders */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: '700px',
        }}>
          <thead>
            <tr>
              <th
                onClick={() => handleSort('name')}
                style={{
                  padding: '14px 28px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: COLORS.muted,
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.bg,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Employee
                  {sortField === 'name' && (sortDirection === 'asc' ? <Icons.ChevronUp /> : <Icons.ChevronDown />)}
                </div>
              </th>
              <th style={{
                padding: '14px 20px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: COLORS.muted,
                borderBottom: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.bg,
              }}>
                Title
              </th>
              <th
                onClick={() => handleSort('department')}
                style={{
                  padding: '14px 20px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: COLORS.muted,
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.bg,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Department
                  {sortField === 'department' && (sortDirection === 'asc' ? <Icons.ChevronUp /> : <Icons.ChevronDown />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('location')}
                style={{
                  padding: '14px 20px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: COLORS.muted,
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.bg,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Location
                  {sortField === 'location' && (sortDirection === 'asc' ? <Icons.ChevronUp /> : <Icons.ChevronDown />)}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee, index) => (
              <tr
                key={employee.id}
                onClick={() => { setSelectedEmployee(employee); setEmployeePanelOpen(true); }}
                style={{
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: index % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0, 168, 168, 0.04)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = index % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent')}
              >
                <td style={{ padding: '18px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <Avatar name={employee.displayName} size={44} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: COLORS.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '2px',
                      }}>
                        {employee.displayName}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: COLORS.muted,
                        opacity: canSeePII ? 1 : 0.7,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        <Icons.Mail />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{maskEmail(employee.workEmail || '')}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '18px 20px', maxWidth: '200px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {employee.jobTitle || '—'}
                  </div>
                  {employee.jobLevel && (
                    <div style={{
                      fontSize: '12px',
                      color: COLORS.muted,
                      marginTop: '2px',
                    }}>
                      {employee.jobLevel}
                    </div>
                  )}
                </td>
                <td style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.text }}>
                    {employee.department || '—'}
                  </div>
                  {employee.managerName && (
                    <div style={{
                      fontSize: '12px',
                      color: COLORS.muted,
                      marginTop: '2px',
                    }}>
                      → {employee.managerName.split(' ')[0]}
                    </div>
                  )}
                </td>
                <td style={{ padding: '18px 20px' }}>
                  {employee.location && <LocationBadge location={employee.location as LocationCode} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state - Premium design */}
        {filteredEmployees.length === 0 && (
          <div style={{
            padding: '64px 28px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 20px',
              borderRadius: '16px',
              backgroundColor: COLORS.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.muted,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p style={{
              fontSize: '15px',
              fontWeight: 600,
              color: COLORS.text,
              margin: 0,
              marginBottom: '6px',
            }}>
              No employees found
            </p>
            <p style={{
              fontSize: '14px',
              color: COLORS.muted,
              margin: 0,
            }}>
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

export default EmployeeDirectory;
