import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isToday, isSameMonth, isSameWeek } from 'date-fns';

export type View = 'month' | 'week' | 'day' | 'list';

export function getCalendarDateRange(date: Date, view: View) {
  // Use the same days as the rendered grids, including adjacent month cells.
  const days = view === 'day'
    ? [date]
    : view === 'month'
      ? getMonthDays(date)
      : getWeekDays(date, 1);
  const startDate = new Date(days[0]);
  const endDate = new Date(days[days.length - 1]);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

export function weekdayDates(weekStart = 0, startDate: Date, length = 6) {
  try {
    // Validate input parameters
    if (typeof weekStart !== 'number' || weekStart < 0 || weekStart > 6) {
      console.warn('Invalid weekStart passed to weekdayDates, using 0 (Sunday)');
      weekStart = 0;
    }
    
    if (!startDate || !(startDate instanceof Date) || isNaN(startDate.getTime())) {
      console.warn('Invalid startDate passed to weekdayDates, using current date');
      startDate = new Date();
    }
    
    if (typeof length !== 'number' || length < 1 || length > 7) {
      console.warn('Invalid length passed to weekdayDates, using 6');
      length = 6;
    }
    
    const tmpStartDate = new Date(startDate);
    while (tmpStartDate.getDay() !== weekStart) {
      tmpStartDate.setDate(tmpStartDate.getDate() - 1);
    }
    
    const endDate = new Date(tmpStartDate.getTime() + length * 24 * 60 * 60 * 1000);
    
    return {
      startDate: tmpStartDate,
      endDate: endDate,
    };
  } catch (error) {
    console.error('Error in weekdayDates:', error);
    // Fallback: return current week
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
    const end = endOfWeek(now, { weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
    
    return {
      startDate: start,
      endDate: end,
    };
  }
}

export function getDaysBetweenDates(dateFrom: Date, dateTo: Date) {
  try {
    // Validate input dates
    if (!dateFrom || !(dateFrom instanceof Date) || isNaN(dateFrom.getTime()) ||
        !dateTo || !(dateTo instanceof Date) || isNaN(dateTo.getTime())) {
      console.warn('Invalid dates passed to getDaysBetweenDates, using current date');
      dateFrom = new Date();
      dateTo = new Date();
    }
    
    const dates = [];
    let startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);

    dates.push(startDate);
    const endDate = new Date(dateTo);
    endDate.setHours(0, 0, 0, 0);

    while (startDate < endDate) {
      startDate = addDays(startDate, 1);
      dates.push(startDate);
    }

    return dates.slice(0, 7);
  } catch (error) {
    console.error('Error in getDaysBetweenDates:', error);
    // Fallback: return array with current date
    return [new Date()];
  }
}

export function getHoursToDisplay(startHour: number, endHour: number) {
  try {
    // Validate input hours
    if (typeof startHour !== 'number' || typeof endHour !== 'number' || 
        isNaN(startHour) || isNaN(endHour) || startHour < 0 || endHour > 23) {
      console.warn('Invalid hours passed to getHoursToDisplay, using default range');
      startHour = 0;
      endHour = 23;
    }
    
    const dates = [];
    
    // Handle the case where we want to show hours from startHour to endHour
    for (let hour = startHour; hour < endHour; hour++) {
      const date = new Date(1970, 0, 1, hour);
      dates.push(date);
    }
    
    return dates;
  } catch (error) {
    console.error('Error in getHoursToDisplay:', error);
    // Fallback: return array with default hours
    return [new Date(1970, 0, 1, 0), new Date(1970, 0, 1, 12)];
  }
}

export function getWeekDays(date: Date, weekStart = 0) {
  try {
    // Validate input date
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date passed to getWeekDays, using current date');
      date = new Date();
    }
    
    const start = startOfWeek(date, { weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
    const end = endOfWeek(date, { weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
    
    const result = eachDayOfInterval({ start, end });
    
    // Ensure result is always an array
    if (!Array.isArray(result)) {
      throw new Error('eachDayOfInterval did not return an array');
    }
    
    return result;
  } catch (error) {
    console.error('Error in getWeekDays:', error);
    // Fallback: generate week days manually
    const fallback = [];
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - startDate.getDay() + weekStart);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      fallback.push(day);
    }
    
    return fallback;
  }
}

export function getMonthDays(date: Date) {
  try {
    // Validate input date
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date passed to getMonthDays, using current date');
      date = new Date();
    }
    
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const startWeek = startOfWeek(start, { weekStartsOn: 1 });
    const endWeek = endOfWeek(end, { weekStartsOn: 1 });
    
    const result = eachDayOfInterval({ start: startWeek, end: endWeek });
    
    // Ensure result is always an array
    if (!Array.isArray(result)) {
      throw new Error('eachDayOfInterval did not return an array');
    }
    
    return result;
  } catch (error) {
    console.error('Error in getMonthDays:', error);
    // Fallback: return empty array
    return [];
  }
}

export function getDayHours(date: Date) {
  try {
    // Validate input date
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date passed to getDayHours, using current date');
      date = new Date();
    }
    
    const hours = [];
    for (let hour = 0; hour < 24; hour++) {
      hours.push(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour));
    }
    return hours;
  } catch (error) {
    console.error('Error in getDayHours:', error);
    // Fallback: return empty array
    return [];
  }
}

export function formatDate(date: Date, formatStr = 'MMM dd') {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date passed to formatDate, using current date');
      date = new Date();
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Error in formatDate:', error);
    return 'Invalid Date';
  }
}

export function formatTime(date: Date, formatStr = 'HH:mm') {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date passed to formatTime, using current date');
      date = new Date();
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Error in formatTime:', error);
    return '--:--';
  }
}

export function formatDateTime(date: Date, formatStr = 'MMM dd, yyyy HH:mm') {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date passed to formatDateTime, using current date');
      date = new Date();
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Error in formatDateTime:', error);
    return 'Invalid Date';
  }
}

export function getNavigationDates(currentDate: Date, view: View) {
  try {
    // Validate input date
    if (!currentDate || !(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
      console.warn('Invalid currentDate passed to getNavigationDates, using current date');
      currentDate = new Date();
    }
    
    // Validate view
    if (!view || !['day', 'week', 'month', 'list'].includes(view)) {
      console.warn('Invalid view passed to getNavigationDates, using day view');
      view = 'day';
    }
    
    switch (view) {
      case 'day':
        return {
          prev: subDays(currentDate, 1),
          next: addDays(currentDate, 1),
          current: currentDate
        };
      case 'week':
        return {
          prev: subWeeks(currentDate, 1),
          next: addWeeks(currentDate, 1),
          current: currentDate
        };
      case 'month':
        return {
          prev: subMonths(currentDate, 1),
          next: addMonths(currentDate, 1),
          current: currentDate
        };
      default:
        return {
          prev: subDays(currentDate, 1),
          next: addDays(currentDate, 1),
          current: currentDate
        };
    }
  } catch (error) {
    console.error('Error in getNavigationDates:', error);
    // Fallback: return current date
    const now = new Date();
    return {
      prev: subDays(now, 1),
      next: addDays(now, 1),
      current: now
    };
  }
}

export function isCurrentPeriod(date: Date, view: View, currentDate: Date) {
  try {
    // Validate input dates
    if (!date || !(date instanceof Date) || isNaN(date.getTime()) ||
        !currentDate || !(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
      console.warn('Invalid dates passed to isCurrentPeriod');
      return false;
    }
    
    // Validate view
    if (!view || !['day', 'week', 'month', 'list'].includes(view)) {
      console.warn('Invalid view passed to isCurrentPeriod');
      return false;
    }
    
    switch (view) {
      case 'day':
        return isSameDay(date, currentDate);
      case 'week':
        return isSameWeek(date, currentDate, { weekStartsOn: 0 });
      case 'month':
        return isSameMonth(date, currentDate);
      default:
        return false;
    }
  } catch (error) {
    console.error('Error in isCurrentPeriod:', error);
    return false;
  }
}

export function getWeekdayNames(weekStart = 0) {
  try {
    // Validate weekStart
    if (typeof weekStart !== 'number' || weekStart < 0 || weekStart > 6) {
      console.warn('Invalid weekStart passed to getWeekdayNames, using 0');
      weekStart = 0;
    }
    
    const baseDate = new Date(2021, 0, 3 + weekStart); // Start with Sunday or Monday
    const weekdays = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(baseDate, i);
      weekdays.push(format(date, 'EEE'));
    }
    
    return weekdays;
  } catch (error) {
    console.error('Error in getWeekdayNames:', error);
    // Fallback: return default weekday names
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }
}

// Re-export commonly used date-fns functions
export { isSameDay, isToday, isSameMonth, isSameWeek };
