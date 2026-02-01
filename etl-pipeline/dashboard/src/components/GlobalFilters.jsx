import React from 'react';
import { Flex, Text, Badge } from '@tremor/react';
import { Filter, User, DollarSign, X } from 'lucide-react';

/**
 * Global Filters Component
 * Provides filtering by Owner and Deal Size (Enterprise vs Standard)
 */
const GlobalFilters = ({
  owners = [],
  selectedOwner,
  onOwnerChange,
  dealSizeFilter,
  onDealSizeChange,
  totalDeals = 0,
  filteredDeals = 0,
}) => {
  const hasFilters = selectedOwner !== 'all' || dealSizeFilter !== 'all';

  const clearFilters = () => {
    onOwnerChange('all');
    onDealSizeChange('all');
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-lg shadow-gray-200/50 px-4 py-3">
      <Flex justifyContent="between" alignItems="center" className="flex-wrap gap-3">
        {/* Filter Icon & Label */}
        <Flex justifyContent="start" className="space-x-2">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Filter className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <Text className="font-semibold text-gray-900 text-sm">Smart Filters</Text>
            {hasFilters && (
              <Text className="text-xs text-gray-500">
                Showing {filteredDeals} of {totalDeals} deals
              </Text>
            )}
          </div>
        </Flex>

        {/* Filter Controls */}
        <Flex justifyContent="end" className="space-x-3 flex-wrap gap-y-2">
          {/* Owner Filter */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <select
                value={selectedOwner}
                onChange={(e) => onOwnerChange(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="all">All Owners</option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Deal Size Filter */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => onDealSizeChange('all')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                dealSizeFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <DollarSign className="h-3 w-3" />
              All
            </button>
            <button
              onClick={() => onDealSizeChange('enterprise')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                dealSizeFilter === 'enterprise'
                  ? 'bg-purple-100 text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Enterprise
            </button>
            <button
              onClick={() => onDealSizeChange('standard')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                dealSizeFilter === 'standard'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Standard
            </button>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </Flex>
      </Flex>

      {/* Active Filters Badges */}
      {hasFilters && (
        <Flex justifyContent="start" className="mt-3 pt-3 border-t border-gray-100 space-x-2">
          <Text className="text-xs text-gray-400">Active:</Text>
          {selectedOwner !== 'all' && (
            <Badge color="blue" size="sm" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {selectedOwner}
              <button
                onClick={() => onOwnerChange('all')}
                className="ml-1 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {dealSizeFilter !== 'all' && (
            <Badge
              color={dealSizeFilter === 'enterprise' ? 'purple' : 'blue'}
              size="sm"
              className="flex items-center gap-1"
            >
              <DollarSign className="h-3 w-3" />
              {dealSizeFilter === 'enterprise' ? 'Enterprise ($100K+)' : 'Standard (<$100K)'}
              <button
                onClick={() => onDealSizeChange('all')}
                className="ml-1 hover:opacity-80"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </Flex>
      )}
    </div>
  );
};

export default GlobalFilters;
