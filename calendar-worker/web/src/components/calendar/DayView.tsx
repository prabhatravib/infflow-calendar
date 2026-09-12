
import { useMemo, Fragment } from 'react';
import { isSameDay, isToday } from '../../lib/date';
import { MinuteIndicator } from './MinuteIndicator';
import { CurrentTimeLine } from './CurrentTimeLine';
import { isEarlyHour, isLateHour } from '../../lib/utils';
import { useSleepToggles } from './useSleepToggles';
import { HourBoundaryToggle } from './HourBoundaryToggle';
import { useWeatherEvents } from '../../lib/hooks/useWeatherEvents';
import { useMinuteOfDay } from '../../lib/hooks/useMinuteOfDay';
import type { Event } from '../../lib/api';

const HOUR_LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
};

interface DayViewProps {
  date: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onTimeSlotClick?: (date: Date, hour: number, minute?: number) => void;
}

export function DayView({ date, events, onEventClick, onTimeSlotClick }: DayViewProps) {
  // Re-renders once a minute, which also rolls the indicators over at midnight
  const minuteOfDay = useMinuteOfDay();
  const currentHour = Math.floor(minuteOfDay / 60);
  const currentMinute = minuteOfDay % 60;

  // Only show the live time indicators when the displayed day is today
  const showCurrentTime = date instanceof Date && !isNaN(date.getTime()) && isToday(date);

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
  
  // Ensure events is always an array
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

  // Generate all 24 hours for timeline (always visible)
  const timelineHours = useMemo(() => {
    const allHours = [];
    for (let hour = 0; hour < 24; hour++) {
      allHours.push(new Date(1970, 0, 1, hour));
    }
    return allHours;
  }, []);

  // Filter hours based on sleep toggle states (for event rows only)
  const hours = useMemo(() => {
    try {
      return filterHoursByToggles(timelineHours);
    } catch (error) {
      console.error('Error filtering hours array:', error);
      return timelineHours; // Fallback to showing all hours
    }
  }, [filterHoursByToggles, timelineHours]);

  const getEventsForHour = (hour: number) => {
    if (!Array.isArray(allEvents)) {
      return [];
    }
    
    const filteredEvents = allEvents.filter(event => {
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
        const isSameDayResult = isSameDay(eventDate, date);
        const hourMatch = eventHour === hour;
        
        
        return isSameDayResult && hourMatch;
      } catch (error) {
        console.error('Error processing event:', event, error);
        return false;
      }
    });
    
    return filteredEvents;
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
    <div
      className={`calendar-day-view relative${
        earlyHoursCollapsed ? ' calendar-day-view--leading-pill' : ''
      }`}
    >
      {/* All-day events section (including weather) */}
      {(() => {
        const allDayEvents = allEvents.filter(event => {
          if (!event || !event.start) return false;
          try {
            const eventDate = new Date(event.start);
            return isSameDay(eventDate, date) && event.all_day;
          } catch (error) {
            return false;
          }
        });
        
        if (allDayEvents.length === 0) return null;
        
        return (
          <div className="all-day-events-section mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">All-day Events</div>
            <div className="space-y-2">
              {allDayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`text-sm p-2 rounded cursor-pointer hover:opacity-80 transition-opacity border ${getEventTypeColor(event)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getEventTypeIcon(event)}</span>
                    <span className="truncate">{event.title || 'Untitled Event'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Time grid uses the same hour sizing and separators as Week view */}
      <div
        className="grid relative"
        style={{ gridTemplateColumns: '80px minmax(0, 1fr)', gap: '0px' }}
      >
        {/* Render each hour as a single row spanning both columns */}
        {Array.isArray(hours) && hours.map((hour, hourIndex) => {
          if (!hour || !(hour instanceof Date) || isNaN(hour.getTime())) {
            console.warn('Invalid hour in render:', hour);
            return null;
          }

          const hourValue = hour.getHours();
          const isEarly = isEarlyHour(hourValue);
          const isLate = isLateHour(hourValue);

          // Skip rendering if hours are collapsed (this should be handled by filterHoursByToggles)
          // But keep this as a safety check
          if ((earlyHoursCollapsed && isEarly) || (lateHoursCollapsed && isLate)) {
            return null;
          }

          const hourEvents = getEventsForHour(hourValue);

          // The 6 AM boundary is this row's top edge; the 10 PM boundary is the
          // bottom edge of the 9 PM row, which stays visible in both states.
          const isEarlyBoundary = hourValue === 6;
          const isLateBoundary = hourValue === 21;
          const isBoundaryTop = isEarlyBoundary || hourValue === 22;

          return (
            <Fragment key={hourValue}>
              {/* Timeline column - hour label - NO horizontal lines, just the time */}
              <div
                className={`bg-white border-r border-t-0 min-w-[80px] text-right p-1 text-sm text-gray-600 font-medium relative flex items-start h-[70px] self-center ${
                  isEarly ? 'time-slot-early-hours' : ''
                } ${
                  isLate ? 'time-slot-late-hours' : ''
                }`}
                style={{ borderRightColor: '#e5e7eb', borderTopColor: 'transparent' }}
              >
                {isEarlyBoundary ? (
                  <HourBoundaryToggle
                    range="early"
                    label={hour.toLocaleTimeString('en-US', HOUR_LABEL_FORMAT)}
                    collapsed={earlyHoursCollapsed}
                    onToggle={handleEarlyHoursToggle}
                    edge="top"
                  />
                ) : hourValue === 22 ? null : (
                  <div className="absolute top-0 right-2 transform -translate-y-1/2 bg-white px-1">
                    {hour.toLocaleTimeString('en-US', HOUR_LABEL_FORMAT)}
                  </div>
                )}
                {isLateBoundary && (
                  <HourBoundaryToggle
                    range="late"
                    label={timelineHours[22].toLocaleTimeString('en-US', HOUR_LABEL_FORMAT)}
                    collapsed={lateHoursCollapsed}
                    onToggle={handleLateHoursToggle}
                    edge="bottom"
                  />
                )}
                {showCurrentTime && hourValue === currentHour && (
                  <MinuteIndicator minute={currentMinute} />
                )}
              </div>

              {/* Events column - event content with horizontal lines */}
              <div
                className={`p-1 border-r h-[70px] bg-white cursor-pointer hover:bg-gray-50 transition-colors relative ${
                  isEarly ? 'time-slot-early-hours' : ''
                } ${
                  isLate ? 'time-slot-late-hours' : ''
                }`}
                style={{ borderRightColor: '#e5e7eb' }}
              >
                {hourIndex > 0 && !isBoundaryTop && (
                  <div className="absolute top-0 left-0 right-0 h-px bg-gray-200"></div>
                )}
                {isBoundaryTop && (
                  <div className="hour-boundary-line" style={{ top: 0 }}></div>
                )}
                {isLateBoundary && lateHoursCollapsed && (
                  <div className="hour-boundary-line" style={{ bottom: 0 }}></div>
                )}
                {showCurrentTime && hourValue === currentHour && (
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
                  onTimeSlotClick?.(date, hourValue, minute);
                }}>
                {hourEvents.map((event) => (
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
                      <span className="truncate">{event.title}</span>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
