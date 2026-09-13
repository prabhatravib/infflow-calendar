
import { useMemo, Fragment, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { getWeekDays, isSameDay, isToday, formatDate } from '../../lib/date';
import { useIsMobile } from '../../lib/hooks/useViewport';
import { MinuteIndicator } from './MinuteIndicator';
import { CurrentTimeLine } from './CurrentTimeLine';
import { isLateHour } from '../../lib/utils';
import { useSleepToggles } from './useSleepToggles';
import { HourBoundaryToggle } from './HourBoundaryToggle';
import { useWeatherEvents } from '../../lib/hooks/useWeatherEvents';
import { useMinuteOfDay } from '../../lib/hooks/useMinuteOfDay';
import { useTodayPulse } from './useTodayPulse';
import type { Event } from '../../lib/api';

const HOUR_LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
};

// 10 PM stays labelled even when its hour cell is hidden
const LATE_BOUNDARY = new Date(1970, 0, 1, 22);

interface WeekViewProps {
  date: Date;
  events: Event[];
  /** Bumped by the Today button to flash today's column header. */
  todayPulse?: number;
  onEventClick?: (event: Event) => void;
  onTimeSlotClick?: (date: Date, hour: number, minute?: number) => void;
}

export function WeekView({ date, events, todayPulse = 0, onEventClick, onTimeSlotClick }: WeekViewProps) {
  // Ensure date is valid
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  
  // Get week days with safety check - memoized to prevent unnecessary recalculations
  const weekDays = useMemo(() => {
    return getWeekDays(safeDate, 1) || [];
  }, [safeDate]);
  
  // Flashes today's day header right after the Today button lands here
  const todayPulseRun = useTodayPulse(todayPulse);

  // On a phone the week is a sideways strip of day columns (index.css). It
  // opens on today's column - Monday's, for any other week - and the Today
  // button brings today's column back if it has been swiped away.
  const isMobile = useIsMobile();
  const weekRef = useRef<HTMLDivElement>(null);
  const weekKey = weekDays.length > 0 ? formatDate(weekDays[0], 'yyyy-MM-dd') : '';

  const scrollToToday = useCallback((behavior: ScrollBehavior) => {
    const week = weekRef.current;
    if (!week) return;
    const todayHeader = week.querySelector<HTMLElement>('.calendar-week-view__day-header[data-today]');
    // The pinned gutter covers the grid's first track, so land just past it.
    const gutterWidth = week.querySelector<HTMLElement>('.calendar-week-view__corner')?.offsetWidth ?? 0;
    week.scrollTo({ left: todayHeader ? todayHeader.offsetLeft - gutterWidth : 0, behavior });
  }, []);

  useLayoutEffect(() => {
    if (isMobile) scrollToToday('auto');
  }, [isMobile, weekKey, scrollToToday]);

  useEffect(() => {
    if (!isMobile || todayPulse === 0) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToToday(reduceMotion ? 'auto' : 'smooth');
  }, [isMobile, todayPulse, scrollToToday]);

  // Re-renders once a minute, which also rolls the indicators over at midnight
  const minuteOfDay = useMinuteOfDay();
  const currentHour = Math.floor(minuteOfDay / 60);
  const currentMinute = minuteOfDay % 60;

  // Only show the live time indicators when today falls inside the displayed week.
  // Cheap enough to redo each render, which keeps it honest across midnight.
  const weekHasToday = weekDays.some(
    day => day instanceof Date && !isNaN(day.getTime()) && isToday(day)
  );

  // Use shared sleep toggle logic
  const {
    earlyHoursCollapsed,
    lateHoursCollapsed,
    filterHoursByToggles,
    handleEarlyHoursToggle,
    handleLateHoursToggle
  } = useSleepToggles();

  // Get weather events
  const { weatherEvents } = useWeatherEvents();
  
  // Ensure events is always an array and never undefined
  const safeEvents = Array.isArray(events) ? events : [];

  // Combine regular events with weather events
  const allEvents = useMemo(() => {
    const combined = [...safeEvents];
    
    // Add weather events
    weatherEvents.forEach(weatherEvent => {
      const convertedEvent = {
        id: weatherEvent.id,
        title: weatherEvent.title,
        start: weatherEvent.start,
        end: weatherEvent.end,
        all_day: weatherEvent.allDay,
        backgroundColor: weatherEvent.backgroundColor,
        borderColor: weatherEvent.borderColor,
        textColor: weatherEvent.textColor,
        type: weatherEvent.type,
        eventType: 'other', // Use 'other' since weather isn't in the allowed types
        calendar_id: 'weather',
        tz: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Event;
      
      combined.push(convertedEvent);
    });
    
    return combined;
  }, [safeEvents, weatherEvents]);

  // Filter hours based on sleep toggle states
  const hours = useMemo(() => {
    try {
      // Always generate all 24 hours first
      const allHours = [];
      for (let hour = 0; hour < 24; hour++) {
        allHours.push(new Date(1970, 0, 1, hour));
      }
      
      return filterHoursByToggles(allHours);
    } catch (error) {
      console.error('Error generating hours array:', error);
      return [];
    }
  }, [filterHoursByToggles]);

  const getEventsForDateAndHour = (date: Date, hour: number) => {
    // Ensure allEvents is always an array before filtering
    if (!Array.isArray(allEvents)) {
      return [];
    }
    
    return allEvents.filter(event => {
      if (!event || !event.start) {
        return false;
      }
      
      try {
        const eventDate = new Date(event.start);
        if (isNaN(eventDate.getTime())) {
          return false;
        }
        
        // Exclude all-day events (like weather) from hourly grid
        // They will only appear in the all-day section above
        if (event.all_day) {
          return false;
        }
        
        const eventHour = eventDate.getHours();
        return isSameDay(eventDate, date) && eventHour === hour;
      } catch (error) {
        console.error('Error processing event:', event, error);
        return false;
      }
    });
  };

  const getEventTypeColor = (event: Event) => {
    if (event.type === 'weather-warning') {
      return 'weather-event';
    }
    
    const eventType = event.eventType || 'other';
    switch (eventType) {
      case 'work':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'fun':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'other':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEventTypeIcon = (event: Event) => {
    if (event.type === 'weather-warning') return '⛈️';
    
    const eventType = event.eventType || 'other';
    switch (eventType) {
      case 'work': return '💼';
      case 'fun': return '🎉';
      case 'other': return '📅';
      default: return '📅';
    }
  };



  return (
    <div ref={weekRef} className="calendar-week-view relative">
      {/* Single grid for headers and time slots */}
      <div className="grid grid-cols-8 relative">
        {/* Empty cell for time column */}
        <div className="calendar-week-view__corner p-2 bg-white border-r border-gray-100 border-b border-gray-100 min-w-[80px]"></div>
        {Array.isArray(weekDays) && weekDays.map((day, index) => {
          if (!day || !(day instanceof Date) || isNaN(day.getTime())) {
            return null; // Skip invalid dates
          }
          const isCurrentDay = isToday(day);
          return (
            <div
              key={index}
              data-today={isCurrentDay ? '' : undefined}
              className={`
              calendar-week-view__day-header p-2 text-center text-sm font-medium bg-white border-r border-gray-100 last:border-r-0 border-b border-gray-100
              ${isCurrentDay ? 'bg-blue-50 text-blue-800' : 'text-gray-700'}
            `}>
              <div
                className={`inline-block rounded-md px-3 py-1 mb-2 ${isCurrentDay ? 'bg-blue-50 ring-1 ring-inset ring-blue-100' : ''} ${isCurrentDay && todayPulseRun ? `today-pulse-pill ${todayPulseRun}` : ''}`}
                aria-current={isCurrentDay ? 'date' : undefined}
              >
                <div className="font-bold">{formatDate(day, 'EEE')}</div>
                <div className="text-xs">{formatDate(day, 'MMM dd')}</div>
              </div>
              
              {/* All-day events (including weather) */}
              {(() => {
                const allDayEvents = allEvents.filter(event => {
                  if (!event || !event.start) return false;
                  try {
                    // Forecast dates are local calendar days, not UTC instants.
                    const eventDate = new Date(event.type === 'weather-warning' && event.start.length === 10
                      ? `${event.start}T00:00:00`
                      : event.start);
                    return isSameDay(eventDate, day) && event.all_day;
                  } catch (error) {
                    return false;
                  }
                });
                
                if (allDayEvents.length === 0) return null;
                
                return (
                  <div className="all-day-events">
                    {allDayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded mb-1 cursor-pointer hover:opacity-80 transition-opacity border ${getEventTypeColor(event)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{getEventTypeIcon(event)}</span>
                          <span className="truncate">{event.title || 'Untitled Event'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          );
        })}
        
        {/* Time labels and day columns */}

        {Array.isArray(hours) && hours.map((hour, hourIndex) => {
          if (!hour || !(hour instanceof Date) || isNaN(hour.getTime())) {
            console.warn('Invalid hour in render:', hour);
            return null;
          }
          
          const hourValue = hour.getHours();
          const isLate = isLateHour(hourValue);

          // Skip rendering if late hours are collapsed
          if (lateHoursCollapsed && isLate) {
            return null;
          }

          // The 6 AM boundary is this cell's top edge; the 10 PM boundary is the
          // bottom edge of the 9 PM cell, which stays visible in both states.
          const isEarlyBoundary = hourValue === 6;
          const isLateBoundary = hourValue === 21;

          return (
            <Fragment key={hourValue}>
              {/* Time label - NO horizontal lines, just the time */}
              <div className="calendar-week-view__gutter bg-white border-r border-t-0 min-w-[80px] text-right pr-2 text-sm text-gray-600 font-medium relative flex items-start pt-0 h-[70px] self-center" style={{ borderRightColor: '#e5e7eb', borderTopColor: 'transparent' }}>
                {isEarlyBoundary ? (
                  <HourBoundaryToggle
                    range="early"
                    label={hour.toLocaleTimeString('en-US', HOUR_LABEL_FORMAT)}
                    collapsed={earlyHoursCollapsed}
                    onToggle={handleEarlyHoursToggle}
                    edge="top"
                  />
                ) : hourValue === 22 ? null : (
                  <div className="calendar-hour-label absolute top-0 right-2 transform -translate-y-1/2 bg-white px-1">
                    {hour.toLocaleTimeString('en-US', HOUR_LABEL_FORMAT)}
                  </div>
                )}
                {isLateBoundary && (
                  <HourBoundaryToggle
                    range="late"
                    label={LATE_BOUNDARY.toLocaleTimeString('en-US', HOUR_LABEL_FORMAT)}
                    collapsed={lateHoursCollapsed}
                    onToggle={handleLateHoursToggle}
                    edge="bottom"
                  />
                )}
                {weekHasToday && hourValue === currentHour && (
                  <MinuteIndicator minute={currentMinute} />
                )}
              </div>

              {/* Day columns with horizontal lines */}
              {Array.isArray(weekDays) && weekDays.map((day, dayIndex) => {
                if (!day || !(day instanceof Date) || isNaN(day.getTime())) {
                  return null; // Skip invalid dates
                }
                
                // Safely get events for this day and hour
                const dayEvents = getEventsForDateAndHour(day, hourValue);
                const isCurrentDay = isToday(day);
                
                return (
                  <div
                    key={dayIndex}
                    className={`
                      p-2 border-r h-[70px] relative
                      ${isCurrentDay ? 'bg-blue-50' : 'bg-white'}
                      hover:bg-gray-50 transition-colors cursor-pointer
                    `}
                    style={{ borderRightColor: '#e5e7eb' }}
                  >
                    {/* Horizontal line for the hour mark - only in day columns */}
                    {hourIndex > 0 && !isEarlyBoundary && hourValue !== 22 && (
                      <div className="absolute top-0 left-0 right-0 h-px bg-gray-200"></div>
                    )}
                    {(isEarlyBoundary || hourValue === 22) && (
                      <div className="hour-boundary-line" style={{ top: 0 }}></div>
                    )}
                    {isLateBoundary && lateHoursCollapsed && (
                      <div className="hour-boundary-line" style={{ bottom: 0 }}></div>
                    )}
                    {isCurrentDay && hourValue === currentHour && (
                      <CurrentTimeLine minute={currentMinute} />
                    )}
                    <div
                      className="relative h-full w-full"
                      onClick={(e) => {
                        // Calculate which half of the hour was clicked
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickY = e.clientY - rect.top;
                        const halfHeight = rect.height / 2;
                        const minute = clickY < halfHeight ? 0 : 30;
                        onTimeSlotClick?.(day, hourValue, minute);
                      }}
                    >
                    {/* Events for this time slot */}
                    {dayEvents && dayEvents.length > 0 && (
                      <div className="space-y-1">
                        {dayEvents.map((event) => {
                          if (!event || typeof event !== 'object') {
                            return null;
                          }
                          
                          return (
                            <div
                              key={event.id}
                              className={`text-xs p-1 rounded mb-1 cursor-pointer hover:opacity-80 transition-opacity border ${getEventTypeColor(event)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(event);
                              }}
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs">{getEventTypeIcon(event)}</span>
                                <span className="truncate">{event.title || 'Untitled Event'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
