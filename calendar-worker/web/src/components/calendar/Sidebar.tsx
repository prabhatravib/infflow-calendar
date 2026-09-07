import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { WeatherWidget } from './WeatherWidget';

interface SidebarProps {
  onFilterChange: (filters: EventFilters) => void;
  className?: string;
  children?: ReactNode;
}

export interface EventFilters {
  showFun: boolean;
  showWork: boolean;
  showOther: boolean;
}

export function Sidebar({ onFilterChange, className = '', children }: SidebarProps) {
  const [filters, setFilters] = useState<EventFilters>({
    showFun: true,
    showWork: true,
    showOther: true
  });

  // Update parent component when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleFilterChange = (filterType: keyof EventFilters, value: boolean) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
  };

  return (
    <div className={`sidebar bg-white border-r border-gray-100 p-6 w-80 flex-shrink-0 ${className}`}>
      {/* User Profile Section */}
      <div className="user-profile mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">User</h3>
            <p className="text-sm text-gray-600">Calendar User</p>
          </div>
        </div>
      </div>

      {/* Event Type Filters */}
      <div className="event-filters mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Event Type:</h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showFun}
              onChange={(e) => handleFilterChange('showFun', e.target.checked)}
              className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Fun</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showWork}
              onChange={(e) => handleFilterChange('showWork', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Work</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showOther}
              onChange={(e) => handleFilterChange('showOther', e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Other</span>
          </label>
        </div>
      </div>

      {/* Weather Widget */}
      <div className="weather-section">
        <WeatherWidget />
      </div>
      {children}
    </div>
  );
}
