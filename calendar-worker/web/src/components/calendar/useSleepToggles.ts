import { useState, useCallback } from 'react';

export function useSleepToggles() {
  const [lateHoursCollapsed, setLateHoursCollapsed] = useState(true);
  const [earlyHoursCollapsed, setEarlyHoursCollapsed] = useState(true);

  // Filter hours based on sleep toggle states
  const filterHoursByToggles = useCallback((allHours: Date[]) => {
    try {
      // Always generate all 24 hours first if not provided
      const hours = allHours.length > 0 ? allHours : [];
      
      // Then filter based on sleep toggle states
      const filteredHours = hours.filter(hour => {
        if (!hour || !(hour instanceof Date) || isNaN(hour.getTime())) {
          return false;
        }
        
        const hourValue = hour.getHours();
        const minuteValue = hour.getMinutes();
        const totalMinutes = hourValue * 60 + minuteValue;
        
        // Hide late hours if collapsed (times from 10:00 PM = 1320 minutes onwards)
        if (lateHoursCollapsed && totalMinutes >= 1320) {
          return false;
        }
        
        // Hide early hours if collapsed (times from 12:00 AM to 5:59 AM = 0 to 359 minutes)
        if (earlyHoursCollapsed && totalMinutes < 360) {
          return false;
        }
        
        return true;
      });
      
      return filteredHours;
    } catch (error) {
      console.error('Error filtering hours:', error);
      return allHours;
    }
  }, [lateHoursCollapsed, earlyHoursCollapsed]);

  const handleEarlyHoursToggle = useCallback((collapsed: boolean) => {
    setEarlyHoursCollapsed(collapsed);
  }, []);

  const handleLateHoursToggle = useCallback((collapsed: boolean) => {
    setLateHoursCollapsed(collapsed);
  }, []);

  return {
    earlyHoursCollapsed,
    lateHoursCollapsed,
    filterHoursByToggles,
    handleEarlyHoursToggle,
    handleLateHoursToggle
  };
}
