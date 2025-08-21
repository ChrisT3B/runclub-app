// src/modules/runs/components/RunFilters.tsx
// Redesigned as single container with dropdown filter selector

import React, { useState, useRef, useEffect } from 'react';

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

const filterLabels: Record<FilterType, string> = {
  'all': 'All Runs',
  'available': 'Available',
  'my-bookings': 'My Bookings',
  'my-assignments': 'My LIRF Assignments'
};

export const RunFilters: React.FC<RunFiltersProps> = ({
  currentFilter,
  onFilterChange,
  filterCounts,
  canManageRuns
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterSelect = (filter: FilterType) => {
    onFilterChange(filter);
    setIsDropdownOpen(false);
  };

  const getCurrentFilterCount = () => {
    switch (currentFilter) {
      case 'all': return filterCounts.all;
      case 'available': return filterCounts.available;
      case 'my-bookings': return filterCounts.myBookings;
      case 'my-assignments': return filterCounts.myAssignments;
      default: return 0;
    }
  };

  const availableFilters: FilterType[] = canManageRuns 
    ? ['all', 'available', 'my-bookings', 'my-assignments']
    : ['all', 'available', 'my-bookings'];

  return (
    <div className="filter-container" ref={containerRef}>
      <div 
        className="filter-selector"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className="filter-icon">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" />
          </svg>
        </div>
        
        <div className="filter-content">
          <span className="filter-label">
            {filterLabels[currentFilter]}
          </span>
          <span className="filter-count">
            ({getCurrentFilterCount()})
          </span>
        </div>
        
        <div className={`filter-arrow ${isDropdownOpen ? 'filter-arrow--open' : ''}`}>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </div>
      </div>

      {isDropdownOpen && (
        <div className="filter-dropdown">
          {availableFilters.map((filter) => (
            <div
              key={filter}
              className={`filter-option ${currentFilter === filter ? 'filter-option--active' : ''}`}
              onClick={() => handleFilterSelect(filter)}
            >
              <span className="filter-option-label">
                {filterLabels[filter]}
              </span>
              <span className="filter-option-count">
                ({filter === 'all' ? filterCounts.all :
                  filter === 'available' ? filterCounts.available :
                  filter === 'my-bookings' ? filterCounts.myBookings :
                  filterCounts.myAssignments})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Also export the types for reuse
export type { FilterCounts };