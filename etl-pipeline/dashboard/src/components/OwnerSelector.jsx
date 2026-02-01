import React from 'react';
import { Select, SelectItem } from '@tremor/react';
import { UserIcon } from '@heroicons/react/24/outline';

/**
 * OwnerSelector Component
 * Reusable dropdown for filtering data by sales rep
 */
const OwnerSelector = ({ owners, selectedOwner, onOwnerChange }) => {
  if (!owners || owners.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <UserIcon className="h-5 w-5 text-gray-500" />
      <Select
        value={selectedOwner}
        onValueChange={onOwnerChange}
        placeholder="Select Sales Rep"
        className="max-w-xs"
      >
        <SelectItem value="all">All Sales Reps</SelectItem>
        {owners.map((owner) => (
          <SelectItem key={owner} value={owner}>
            {owner}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};

export default OwnerSelector;
