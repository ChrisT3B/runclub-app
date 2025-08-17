// Step 1: Extract RunFilters Component
// File: src/modules/runs/components/RunFilters.tsx

import React from 'react';

export type FilterType = 'all' | 'available' | 'my-bookings' | 'my-assignments';

interface FilterCounts {
  all: number;
  available: number;
  myBookings: number;
  myAssignments: number;
}

interface RunFiltersProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  filterCounts: FilterCounts;
  canManageRuns: boolean;
}

export const RunFilters: React.FC<RunFiltersProps> = ({
  currentFilter,
  onFilterChange,
  filterCounts,
  canManageRuns
}) => {
  return (
    <div className="filter-tabs">
      <button
        onClick={() => onFilterChange('all')}
        className={`filter-tab ${currentFilter === 'all' ? 'filter-tab--active' : ''}`}
      >
        All Runs ({filterCounts.all})
      </button>
      
      <button
        onClick={() => onFilterChange('available')}
        className={`filter-tab ${currentFilter === 'available' ? 'filter-tab--active' : ''}`}
      >
        Available ({filterCounts.available})
      </button>
      
      <button
        onClick={() => onFilterChange('my-bookings')}
        className={`filter-tab ${currentFilter === 'my-bookings' ? 'filter-tab--active' : ''}`}
      >
        My Bookings ({filterCounts.myBookings})
      </button>
      
      {canManageRuns && (
        <button
          onClick={() => onFilterChange('my-assignments')}
          className={`filter-tab ${currentFilter === 'my-assignments' ? 'filter-tab--active' : ''}`}
        >
          My LIRF Assignments ({filterCounts.myAssignments})
        </button>
      )}
    </div>
  );
};

// Also export the types for reuse
export type { FilterCounts };