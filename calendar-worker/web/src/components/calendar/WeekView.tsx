
import { useMemo, Fragment } from 'react';
import { getWeekDays, isSameDay, isToday, formatDate } from '../../lib/date';
import { MinuteIndicator } from './MinuteIndicator';
import { CurrentTimeLine } from './CurrentTimeLine';
import { isLateHour } from '../../lib/utils';
import { useSleepToggles } from './useSleepToggles';
import { SleepToggleBars } from './SleepToggleBars';
import { useWeatherEvents } from '../../lib/hooks/useWeatherEvents';
import type { Event } from '../../lib/api';

interface WeekViewProps {
  date: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onTimeSlotClick?: (date: Date, hour: number, minute?: number) => void;
}

export function WeekView({ date, events, onEventClick, onTimeSlotClick }: WeekViewProps) {
  // Ensure date is valid
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  
  // Get week days with safety check - memoized to prevent unnecessary recalculations
  const weekDays = useMemo(() => {
    return getWeekDays(safeDate, 1) || [];
  }, [safeDate]);
  
  // Use shared sleep toggle logic
  const {
    earlyHoursCollapsed,
    lateHoursCollapsed,
    filterHoursByToggles,
    calculateTogglePositions,
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

  // Calculate toggle positions using shared logic
  const togglePositions = useMemo(() => {
    return calculateTogglePositions(hours);
  }, [hours, calculateTogglePositions]);

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
    <div className="calendar-week-view relative">
      {/* Minute Indicator - positioned absolutely over the calendar */}
      <MinuteIndicator />
      
      {/* Current Time Line - horizontal line across the calendar at current time */}
      <CurrentTimeLine isWeekView={true} />
      
      {/* Single grid for headers and time slots */}
      <div className="grid grid-cols-8 relative">
        {/* Empty cell for time column */}
        <div className="p-2 bg-white border-r border-gray-100 border-b border-gray-100 min-w-[80px]"></div>
        {Array.isArray(weekDays) && weekDays.map((day, index) => {
          if (!day || !(day instanceof Date) || isNaN(day.getTime())) {
            return null; // Skip invalid dates
          }
          const isCurrentDay = isToday(day);
          return (
            <div key={index} className={`
              p-2 text-center text-sm font-medium bg-white border-r border-gray-100 last:border-r-0 border-b border-gray-100
              ${isCurrentDay ? 'bg-blue-50 text-blue-800' : 'text-gray-700'}
            `}>
              <div className="font-bold">{formatDate(day, 'EEE')}</div>
              <div className="text-xs mb-2">{formatDate(day, 'MMM dd')}</div>
              
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
        
        {/* Early Hours Toggle - rendered at the very top when collapsed */}
        {(() => {
          const { renderEarlyToggleTop } = SleepToggleBars({
            earlyHoursCollapsed,
            lateHoursCollapsed,
            togglePositions,
            onEarlyHoursToggle: handleEarlyHoursToggle,
            onLateHoursToggle: handleLateHoursToggle,
            isWeekView: true
          });
          return renderEarlyToggleTop();
        })()}
        
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
          
          return (
            <Fragment key={hourIndex}>
              {/* Time label - NO horizontal lines, just the time */}
              <div className="bg-white border-r border-t-0 min-w-[80px] text-right pr-2 text-sm text-gray-600 font-medium relative flex items-start pt-0 h-[70px]" style={{ borderRightColor: '#e5e7eb', borderTopColor: 'transparent' }}>
                <div className="absolute top-0 right-2 transform -translate-y-1/2 bg-white px-1">
                  {hour.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
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
                    {hourIndex > 0 && <div className="absolute top-0 left-0 right-0 h-px bg-gray-200"></div>}
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
              
              {/* Insert toggle bars at specific time positions */}
              
              {/* Early Hours Toggle - only show when expanded (collapsed is handled at top) */}
              {(() => {
                const { renderEarlyToggle } = SleepToggleBars({
                  earlyHoursCollapsed,
                  lateHoursCollapsed,
                  togglePositions,
                  onEarlyHoursToggle: handleEarlyHoursToggle,
                  onLateHoursToggle: handleLateHoursToggle,
                  isWeekView: true
                });
                return renderEarlyToggle(hourIndex);
              })()}
              
              {/* Late Hours Toggle */}
              {(() => {
                const { renderLateToggle } = SleepToggleBars({
                  earlyHoursCollapsed,
                  lateHoursCollapsed,
                  togglePositions,
                  onEarlyHoursToggle: handleEarlyHoursToggle,
                  onLateHoursToggle: handleLateHoursToggle,
                  isWeekView: true
                });
                return renderLateToggle(hourIndex);
              })()}
            </Fragment>
          );
        })}
        
        {/* Remove the standalone toggle bars since they're now integrated into the hour loop */}
      </div>
    </div>
  );
}
