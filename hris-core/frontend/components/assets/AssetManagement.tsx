/**
 * Asset Management View - Octup Design System
 *
 * Features:
 * - Premium card styling with soft shadows
 * - Octup data table design (rounded headers, hover states)
 * - Warning row highlighting (amber-50)
 * - KPI cards with gradient accents
 * - Consistent with Reports Dashboard design
 */

import React, { useState, useMemo } from 'react';
import { useHRIS } from '../../context/HRISContext';
import { Card, Badge, Input, Select, Button, Avatar, KPICard, DataTable, EmptyState, Tooltip } from '../common';
import { Asset, AssetCategory, LocationCode } from '../../types';

// =============================================================================
// ICONS (Heroicons style)
// =============================================================================

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ComputerIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

// =============================================================================
// CONFIGURATION
// =============================================================================

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'laptop', label: '💻 Laptops' },
  { value: 'monitor', label: '🖥️ Monitors' },
  { value: 'keyboard', label: '⌨️ Keyboards' },
  { value: 'mouse', label: '🖱️ Mice' },
  { value: 'headset', label: '🎧 Headsets' },
  { value: 'phone', label: '📱 Phones' },
  { value: 'other', label: '📦 Other' },
];

const LOCATION_OPTIONS = [
  { value: '', label: 'All Locations' },
  { value: 'TLV', label: '🇮🇱 Tel Aviv' },
  { value: 'TOR', label: '🇨🇦 Toronto' },
  { value: 'US', label: '🇺🇸 United States' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

const CATEGORY_ICONS: Record<AssetCategory, string> = {
  laptop: '💻',
  monitor: '🖥️',
  keyboard: '⌨️',
  mouse: '🖱️',
  headset: '🎧',
  phone: '📱',
  other: '📦',
};

const LOCATION_FLAGS: Record<LocationCode, string> = {
  TLV: '🇮🇱',
  TOR: '🇨🇦',
  US: '🇺🇸',
};

// =============================================================================
// ASSET MANAGEMENT COMPONENT
// =============================================================================

export function AssetManagement() {
  const { assets } = useHRIS();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);

  // Filter assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        asset.assetTag.toLowerCase().includes(searchLower) ||
        asset.model.toLowerCase().includes(searchLower) ||
        asset.manufacturer.toLowerCase().includes(searchLower) ||
        (asset.assignedToName?.toLowerCase().includes(searchLower) ?? false) ||
        (asset.serialNumber?.toLowerCase().includes(searchLower) ?? false);

      const matchesCategory = !categoryFilter || asset.category === categoryFilter;
      const matchesLocation = !locationFilter || asset.locationCode === locationFilter;
      const matchesStatus = !statusFilter || asset.status === statusFilter;
      const matchesWarnings = !showWarningsOnly || !asset.serialNumber;

      return matchesSearch && matchesCategory && matchesLocation && matchesStatus && matchesWarnings;
    });
  }, [assets, searchQuery, categoryFilter, locationFilter, statusFilter, showWarningsOnly]);

  // Stats
  const warningCount = assets.filter(a => !a.serialNumber).length;
  const assignedCount = assets.filter(a => a.status === 'assigned').length;
  const availableCount = assets.filter(a => a.status === 'available').length;

  return (
    <div className="min-h-screen bg-[#F4F4F7] bg-premium-pattern">
      {/* Header - Octup Style with gradient accent */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-30">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-[#809292] via-[#00CBC0] to-[#FF3489]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asset Management</h1>
              <p className="mt-1 text-sm text-slate-500">Track and manage company equipment across all locations</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" icon={<DownloadIcon />}>
                Export
              </Button>
              <Button variant="primary" icon={<PlusIcon />}>
                Add Asset
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards - Octup Style with gradient accents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Assets"
            value={assets.length}
            icon={<ComputerIcon />}
            color="primary"
            trend={{ value: 12, direction: 'up' }}
          />
          <KPICard
            title="Assigned"
            value={assignedCount}
            subtitle={`${Math.round((assignedCount / assets.length) * 100)}% of total`}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="secondary"
          />
          <KPICard
            title="Available"
            value={availableCount}
            subtitle="Ready to assign"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="primary"
          />
          <KPICard
            title="Missing Serial #"
            value={warningCount}
            subtitle={warningCount > 0 ? 'Action required' : 'All recorded'}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            color={warningCount > 0 ? 'warning' : 'secondary'}
          />
        </div>

        {/* Filters Card - Octup Premium Card Style */}
        <Card padding="none" className="mb-6 overflow-hidden">
          <div className="p-5 border-b border-slate-100 space-y-4">
            {/* Search */}
            <Input
              type="search"
              placeholder="Search by asset tag, model, serial number, or assignee..."
              value={searchQuery}
              onChange={setSearchQuery}
              icon={<SearchIcon />}
            />

            {/* Filter Row */}
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={CATEGORY_OPTIONS}
                selectSize="sm"
                className="w-44"
              />
              <Select
                value={locationFilter}
                onChange={setLocationFilter}
                options={LOCATION_OPTIONS}
                selectSize="sm"
                className="w-40"
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                selectSize="sm"
                className="w-36"
              />

              {/* Warnings Toggle - Octup Style */}
              <button
                onClick={() => setShowWarningsOnly(!showWarningsOnly)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 min-h-[40px]
                  ${
                    showWarningsOnly
                      ? 'bg-amber-100 text-amber-700 border border-amber-300 shadow-soft'
                      : 'bg-slate-50/80 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }
                `}
              >
                <ExclamationIcon />
                <span>Warnings Only</span>
                <span className={`
                  ml-1 px-2 py-0.5 rounded-lg text-xs font-semibold
                  ${showWarningsOnly ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'}
                `}>
                  {warningCount}
                </span>
              </button>

              {/* Results count */}
              <div className="flex-1 text-right">
                <span className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{filteredAssets.length}</span> asset{filteredAssets.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Asset Table - Octup Data Table Style */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide rounded-tl-xl">
                    Asset
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Serial Number
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Assigned To
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Location
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide rounded-tr-xl">
                    Warranty
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredAssets.map(asset => (
                  <AssetRow key={asset.id} asset={asset} />
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {filteredAssets.length === 0 && (
              <EmptyState
                icon={
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                }
                title="No assets found"
                description="Try adjusting your filters or search query to find what you're looking for."
                action={{
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearchQuery('');
                    setCategoryFilter('');
                    setLocationFilter('');
                    setStatusFilter('');
                    setShowWarningsOnly(false);
                  }
                }}
              />
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

// =============================================================================
// ASSET ROW COMPONENT - Octup Table Row Style
// =============================================================================

interface AssetRowProps {
  asset: Asset;
}

function AssetRow({ asset }: AssetRowProps) {
  const hasWarning = !asset.serialNumber;
  const isWarrantyExpiring = asset.warrantyExpiry &&
    new Date(asset.warrantyExpiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  // Status badge styling - Octup colors
  const statusStyles: Record<Asset['status'], { bg: string; text: string }> = {
    assigned: { bg: 'bg-[#00CBC0]/10', text: 'text-[#00a89e]' },
    available: { bg: 'bg-blue-100', text: 'text-blue-700' },
    maintenance: { bg: 'bg-amber-100', text: 'text-amber-700' },
    retired: { bg: 'bg-slate-100', text: 'text-slate-500' },
  };

  const statusStyle = statusStyles[asset.status];

  return (
    <tr className={`
      transition-all duration-150 group
      hover:bg-slate-50/50 hover:shadow-table-row
      ${hasWarning ? 'bg-amber-50/50' : ''}
    `}>
      {/* Asset Info */}
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl group-hover:bg-slate-200 transition-colors">
            {CATEGORY_ICONS[asset.category]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {asset.manufacturer} {asset.model}
              </span>
              {hasWarning && (
                <Tooltip content="Missing serial number">
                  <span className="text-amber-500 animate-pulse">⚠️</span>
                </Tooltip>
              )}
            </div>
            <div className="text-xs text-slate-500 font-mono">{asset.assetTag}</div>
          </div>
        </div>
      </td>

      {/* Serial Number */}
      <td className="px-5 py-4 whitespace-nowrap">
        {asset.serialNumber ? (
          <span className="text-sm text-slate-700 font-mono bg-slate-50 px-2 py-1 rounded">
            {asset.serialNumber}
          </span>
        ) : (
          <Badge variant="warning" size="sm" dot pulse>
            Not recorded
          </Badge>
        )}
      </td>

      {/* Assigned To */}
      <td className="px-5 py-4 whitespace-nowrap">
        {asset.assignedToName ? (
          <div className="flex items-center gap-3">
            <Avatar name={asset.assignedToName} size="sm" />
            <div>
              <div className="text-sm font-medium text-slate-900">{asset.assignedToName}</div>
              {asset.assignedDate && (
                <div className="text-xs text-slate-500">
                  Since {new Date(asset.assignedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-400 italic">Unassigned</span>
        )}
      </td>

      {/* Location */}
      <td className="px-5 py-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
          <span>{LOCATION_FLAGS[asset.locationCode]}</span>
          <span>{asset.locationCode}</span>
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-4 whitespace-nowrap">
        <span className={`
          inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium
          ${statusStyle.bg} ${statusStyle.text}
        `}>
          {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
        </span>
      </td>

      {/* Warranty */}
      <td className="px-5 py-4 whitespace-nowrap">
        {asset.warrantyExpiry ? (
          <div className={isWarrantyExpiring ? 'text-[#FF3489]' : 'text-slate-700'}>
            <div className="text-sm font-medium">
              {new Date(asset.warrantyExpiry).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            {isWarrantyExpiring && (
              <div className="text-xs text-[#FF3489] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Expiring soon
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-slate-400">N/A</span>
        )}
      </td>
    </tr>
  );
}

export default AssetManagement;
