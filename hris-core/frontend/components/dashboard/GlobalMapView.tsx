/**
 * Global Map View Component
 *
 * Simple breakdown of headcount by office location:
 * - TLV (Tel Aviv)
 * - Toronto
 * - USA
 */

import React from 'react';
import { useHRIS } from '../../context/HRISContext';
import { Card, Badge, ProgressBar } from '../common';
import { LocationCode, Currency } from '../../types';

// ============================================================================
// LOCATION CONFIG
// ============================================================================

interface LocationInfo {
  code: LocationCode;
  name: string;
  country: string;
  flag: string;
  timezone: string;
  color: string;
  bgColor: string;
}

const LOCATIONS: LocationInfo[] = [
  {
    code: 'TLV',
    name: 'Tel Aviv',
    country: 'Israel',
    flag: '🇮🇱',
    timezone: 'GMT+2',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
  },
  {
    code: 'TOR',
    name: 'Toronto',
    country: 'Canada',
    flag: '🇨🇦',
    timezone: 'GMT-5',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
  },
  {
    code: 'US',
    name: 'United States',
    country: 'USA',
    flag: '🇺🇸',
    timezone: 'GMT-5 to -8',
    color: 'text-green-600',
    bgColor: 'bg-green-500',
  },
];

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  ILS: '₪',
  CAD: 'C$',
};

function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

// ============================================================================
// GLOBAL MAP VIEW COMPONENT
// ============================================================================

export function GlobalMapView() {
  const { burnRate, displayCurrency, convertToDisplayCurrency, employees } = useHRIS();

  // Calculate total headcount
  const totalHeadcount = burnRate.reduce((sum, loc) => sum + loc.headcount, 0);

  // Calculate totals
  const totalBurnRate = burnRate.reduce((sum, loc) => sum + loc.monthlyTotalUsd, 0);

  return (
    <Card>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Global Workforce Distribution</h3>
        <p className="text-sm text-gray-500 mt-1">
          {totalHeadcount} employees across {LOCATIONS.length} locations
        </p>
      </div>

      {/* Visual Map (Simplified) */}
      <div className="relative bg-gray-100 rounded-xl p-8 mb-6">
        <div className="flex justify-between items-center">
          {LOCATIONS.map((location, index) => {
            const locationData = burnRate.find(br => br.locationCode === location.code);
            const headcount = locationData?.headcount || 0;
            const percentage = totalHeadcount > 0 ? (headcount / totalHeadcount) * 100 : 0;

            return (
              <div key={location.code} className="text-center flex-1">
                {/* Location Circle */}
                <div className="relative inline-block">
                  <div
                    className={`${location.bgColor} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}
                    style={{
                      width: `${Math.max(60, 40 + percentage)}px`,
                      height: `${Math.max(60, 40 + percentage)}px`,
                    }}
                  >
                    <span className="text-2xl">{location.flag}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full px-2 py-0.5 text-xs font-bold shadow border">
                    {headcount}
                  </div>
                </div>

                {/* Location Label */}
                <div className="mt-4">
                  <p className="font-semibold text-gray-900">{location.name}</p>
                  <p className="text-xs text-gray-500">{location.timezone}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connecting Lines (Visual) */}
        <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gray-300 -translate-y-1/2 -z-10" />
      </div>

      {/* Location Cards */}
      <div className="space-y-4">
        {LOCATIONS.map(location => {
          const locationData = burnRate.find(br => br.locationCode === location.code);
          const headcount = locationData?.headcount || 0;
          const percentage = totalHeadcount > 0 ? Math.round((headcount / totalHeadcount) * 100) : 0;
          const burnRateUsd = locationData?.monthlyTotalUsd || 0;
          const burnRateDisplay = convertToDisplayCurrency(burnRateUsd, 'USD');

          // Count by employment type
          const locationEmployees = employees.filter(e => e.location === location.code);
          const fullTimeCount = locationEmployees.filter(e => e.employmentType === 'full_time').length;
          const contractorCount = locationEmployees.filter(e => e.employmentType === 'contractor').length;

          return (
            <div
              key={location.code}
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              {/* Flag & Name */}
              <div className="flex items-center gap-3 w-40">
                <span className="text-3xl">{location.flag}</span>
                <div>
                  <p className="font-semibold text-gray-900">{location.name}</p>
                  <p className="text-xs text-gray-500">{location.country}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{headcount} employees</span>
                  <span className="text-gray-500">{percentage}%</span>
                </div>
                <ProgressBar
                  value={percentage}
                  max={100}
                  color={
                    location.code === 'TLV' ? 'blue' :
                    location.code === 'TOR' ? 'red' : 'green'
                  }
                  size="md"
                />
              </div>

              {/* Employment Breakdown */}
              <div className="text-right w-32">
                <div className="flex gap-2 justify-end">
                  <Badge variant="success" size="sm">{fullTimeCount} FT</Badge>
                  {contractorCount > 0 && (
                    <Badge variant="info" size="sm">{contractorCount} C</Badge>
                  )}
                </div>
              </div>

              {/* Monthly Cost */}
              <div className="text-right w-36">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(burnRateDisplay, displayCurrency)}
                </p>
                <p className="text-xs text-gray-500">monthly cost</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Monthly Burn Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(convertToDisplayCurrency(totalBurnRate, 'USD'), displayCurrency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Annual Projection</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(convertToDisplayCurrency(totalBurnRate * 12, 'USD'), displayCurrency)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GlobalMapView;
