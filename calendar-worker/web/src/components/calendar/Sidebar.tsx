import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { WeatherWidget } from './WeatherWidget';
import { useIsMobile } from '../../lib/hooks/useViewport';

interface SidebarProps {
  onFilterChange: (filters: EventFilters) => void;
  className?: string;
  children?: ReactNode;
  /** Phone only: whether the filters & weather sheet is open. */
  isSheetOpen?: boolean;
  onSheetClose?: () => void;
  /** Phone only: controls at the foot of the filters & weather sheet. */
  sheetFooter?: ReactNode;
}

export interface EventFilters {
  showFun: boolean;
  showWork: boolean;
  showOther: boolean;
}

export function Sidebar({
  onFilterChange,
  className = '',
  children,
  isSheetOpen = false,
  onSheetClose,
  sheetFooter
}: SidebarProps) {
  // Only the phone draws the drawer as a dialog; on desktop it has no box.
  const isMobile = useIsMobile();
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
    <div className={`sidebar bg-white border-r border-gray-100 p-6 w-80 flex-shrink-0 flex flex-col ${className}`}>
      {/* The same filter state on both layouts: on a phone this wrapper is the
          filters & weather sheet, on desktop it generates no box (index.css). */}
      <div
        id="calendar-settings"
        className="sidebar__drawer"
        data-open={isSheetOpen ? '' : undefined}
        role={isMobile ? 'dialog' : undefined}
        aria-modal={isMobile ? true : undefined}
        aria-labelledby={isMobile ? 'calendar-settings-title' : undefined}
      >
        <div className="sidebar__drawer-header">
          <h2 id="calendar-settings-title" className="sidebar__drawer-title">Filters &amp; weather</h2>
          <button
            type="button"
            className="sheet-close"
            onClick={onSheetClose}
            aria-label="Close filters and weather"
            data-sheet-close
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="sidebar__drawer-body">
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

          {sheetFooter && <div className="sidebar__drawer-footer">{sheetFooter}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}
