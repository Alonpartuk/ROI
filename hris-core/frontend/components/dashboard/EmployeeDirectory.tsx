/**
 * Employee Directory Component
 *
 * Features:
 * - Searchable employee table
 * - Filter by location, department, status
 * - Click to open slide-over panel with full profile
 */

import React, { useState, useMemo } from 'react';
import { useHRIS } from '../../context/HRISContext';
import { Card, Avatar, Badge, Input, Select, SlideOver } from '../common';
import { EmployeeProfilePanel } from '../employee/EmployeeProfilePanel';
import { Employee, LocationCode } from '../../types';

// ============================================================================
// ICONS
// ============================================================================

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// ============================================================================
// STATUS BADGE MAPPING
// ============================================================================

const STATUS_VARIANTS: Record<Employee['currentStatus'], 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  on_leave: 'warning',
  terminated: 'error',
  pending_start: 'info',
};

const STATUS_LABELS: Record<Employee['currentStatus'], string> = {
  active: 'Active',
  on_leave: 'On Leave',
  terminated: 'Terminated',
  pending_start: 'Pending Start',
};

// ============================================================================
// LOCATION OPTIONS
// ============================================================================

const LOCATION_OPTIONS = [
  { value: '', label: 'All Locations' },
  { value: 'TLV', label: 'Tel Aviv' },
  { value: 'TOR', label: 'Toronto' },
  { value: 'US', label: 'United States' },
];

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'All Departments' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Finance', label: 'Finance' },
  { value: 'People & Culture', label: 'People & Culture' },
];

// ============================================================================
// EMPLOYEE DIRECTORY COMPONENT
// ============================================================================

export function EmployeeDirectory() {
  const { employees, selectedEmployee, setSelectedEmployee, isEmployeePanelOpen, setEmployeePanelOpen } = useHRIS();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        emp.displayName.toLowerCase().includes(searchLower) ||
        emp.workEmail.toLowerCase().includes(searchLower) ||
        emp.jobTitle.toLowerCase().includes(searchLower) ||
        emp.employeeNumber.toLowerCase().includes(searchLower);

      // Location filter
      const matchesLocation = !locationFilter || emp.location === locationFilter;

      // Department filter
      const matchesDepartment = !departmentFilter || emp.department === departmentFilter;

      return matchesSearch && matchesLocation && matchesDepartment;
    });
  }, [employees, searchQuery, locationFilter, departmentFilter]);

  // Handle employee click
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  // Close panel
  const handleClosePanel = () => {
    setEmployeePanelOpen(false);
    setTimeout(() => setSelectedEmployee(null), 300);
  };

  return (
    <>
      <Card padding="none">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          {/* Search */}
          <Input
            type="search"
            placeholder="Search by name, email, or title..."
            value={searchQuery}
            onChange={setSearchQuery}
            icon={<SearchIcon />}
          />

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3">
            <Select
              value={locationFilter}
              onChange={setLocationFilter}
              options={LOCATION_OPTIONS}
              className="w-40"
            />
            <Select
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={DEPARTMENT_OPTIONS}
              className="w-48"
            />
            <div className="flex-1 text-right text-sm text-gray-500 self-center">
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map(employee => (
                <tr
                  key={employee.id}
                  onClick={() => handleEmployeeClick(employee)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar
                        name={employee.displayName}
                        src={employee.avatarUrl}
                        size="md"
                        status={employee.currentStatus === 'active' ? 'active' : 'offline'}
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.displayName}
                        </div>
                        <div className="text-sm text-gray-500">{employee.workEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.jobTitle}</div>
                    <div className="text-sm text-gray-500">{employee.jobLevel}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.department}</div>
                    {employee.managerName && (
                      <div className="text-sm text-gray-500">Reports to {employee.managerName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <LocationBadge location={employee.location} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={STATUS_VARIANTS[employee.currentStatus]} size="sm">
                      {STATUS_LABELS[employee.currentStatus]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Employee Profile Slide-over */}
      <SlideOver
        isOpen={isEmployeePanelOpen}
        onClose={handleClosePanel}
        title={selectedEmployee?.displayName || ''}
        subtitle={selectedEmployee?.jobTitle}
        width="xl"
      >
        {selectedEmployee && <EmployeeProfilePanel employee={selectedEmployee} />}
      </SlideOver>
    </>
  );
}

// ============================================================================
// LOCATION BADGE COMPONENT
// ============================================================================

interface LocationBadgeProps {
  location: LocationCode;
}

const LOCATION_COLORS: Record<LocationCode, string> = {
  TLV: 'bg-blue-100 text-blue-800',
  TOR: 'bg-red-100 text-red-800',
  US: 'bg-green-100 text-green-800',
};

const LOCATION_FLAGS: Record<LocationCode, string> = {
  TLV: '🇮🇱',
  TOR: '🇨🇦',
  US: '🇺🇸',
};

function LocationBadge({ location }: LocationBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full ${LOCATION_COLORS[location]}`}>
      <span>{LOCATION_FLAGS[location]}</span>
      {location}
    </span>
  );
}

export default EmployeeDirectory;
