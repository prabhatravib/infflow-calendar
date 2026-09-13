import { useState, useMemo } from 'react';
import { Event } from '../api';

export interface EventFilters {
  showFun: boolean;
  showWork: boolean;
  showOther: boolean;
}

export function useEventFiltering(events: Event[]) {
  const [filters, setFilters] = useState<EventFilters>({
    showFun: true,
    showWork: true,
    showOther: true
  });

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventType = event.eventType?.toLowerCase() || 'other';
      
      switch (eventType) {
        case 'fun':
          return filters.showFun;
        case 'work':
          return filters.showWork;
        case 'other':
        default:
          return filters.showOther;
      }
    });
  }, [events, filters]);

  const updateFilter = (filterType: keyof EventFilters, value: boolean) => {
    // Sidebar re-sends every filter after each App render, so an unchanged
    // value must keep the same object; a fresh copy re-rendered App and looped.
    setFilters(prev => (prev[filterType] === value ? prev : {
      ...prev,
      [filterType]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      showFun: true,
      showWork: true,
      showOther: true
    });
  };

  const getFilterStats = () => {
    const total = events.length;
    const visible = filteredEvents.length;
    const hidden = total - visible;
    
    return {
      total,
      visible,
      hidden,
      filters
    };
  };

  return {
    filters,
    filteredEvents,
    updateFilter,
    resetFilters,
    getFilterStats
  };
}
