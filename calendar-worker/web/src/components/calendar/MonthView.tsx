
import { isSameDay, isToday, getMonthDays, getWeekdayNames, formatDate } from '../../lib/date';
import { useWeatherEvents } from '../../lib/hooks/useWeatherEvents';
import { useTodayPulse } from './useTodayPulse';
import type { Event } from '../../lib/api';

const MAX_VISIBLE_EVENTS = 3;

interface MonthViewProps {
  date: Date;
  events: Event[];
  /** Bumped by the Today button to flash today's cell. */
  todayPulse?: number;
  onEventClick?: (event: Event) => void;
  onDateClick?: (date: Date) => void;
  className?: string;
}

export function MonthView({ date, events, todayPulse = 0, onEventClick, onDateClick, className = '' }: MonthViewProps) {
  // Ensure events is always an array
  const safeEvents = Array.isArray(events) ? events : [];

  // Flashes today's cell right after the Today button lands here
  const todayPulseRun = useTodayPulse(todayPulse);

  // Bad-weather days are tinted red rather than added as event chips, so a
  // forecast never eats one of the three visible event slots.
  const { weatherEvents } = useWeatherEvents();
  const badWeatherByDate = new Map<string, string>(
    (Array.isArray(weatherEvents) ? weatherEvents : [])
      .filter(weatherEvent => weatherEvent?.start)
      .map(weatherEvent => [weatherEvent.start, weatherEvent.title as string])
  );
  
  const monthDays = getMonthDays(date);
  const weekdays = getWeekdayNames(1);
  
  const getEventsForDate = (day: Date) => {
    if (!Array.isArray(safeEvents)) {
      return [];
    }
    
    return safeEvents.filter(event => {
      if (!event || !event.start) {
        return false;
      }
      
      try {
        const eventDate = new Date(event.start);
        if (isNaN(eventDate.getTime())) {
          return false;
        }
        
        return isSameDay(eventDate, day);
      } catch (error) {
        console.error('Error processing event:', event, error);
        return false;
      }
    });
  };

  const daysWithEvents = monthDays.map(day => ({ day, dayEvents: getEventsForDate(day) }));
  const weekRows = [];
  for (let index = 0; index < daysWithEvents.length; index += 7) {
    const busiestDay = Math.max(...daysWithEvents.slice(index, index + 7).map(({ dayEvents }) => dayEvents.length));
    // Keep dates aligned by week, allowing room for visible events and the +more line.
    weekRows.push(`minmax(min-content, ${1 + Math.min(busiestDay, MAX_VISIBLE_EVENTS + 1)}fr)`);
  }

  // Get event type styling based on eventType
  const getEventTypeStyling = (event: Event) => {
    const eventType = event.eventType?.toLowerCase() || 'other';
    
    switch (eventType) {
      case 'fun':
        return 'bg-pink-100 text-pink-800 hover:bg-pink-200';
      case 'work':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'other':
      default:
        return 'bg-green-100 text-green-800 hover:bg-green-200';
    }
  };

  return (
    <div className={`calendar-month-view ${className}`}>
      {/* Weekday headers and calendar grid combined to eliminate any gap */}
      <div className="grid grid-cols-7" style={{ gridTemplateRows: `max-content ${weekRows.join(' ')}` }}>
        {/* Weekday headers */}
        {weekdays.map((day, index) => (
          <div key={index} className="p-2 text-center text-sm font-medium text-gray-700 bg-white border-r border-gray-100 last:border-r-0 border-b border-gray-100">
            {day}
          </div>
        ))}
        
        {/* Calendar days - directly connected to headers with no gap */}
        {daysWithEvents.map(({ day, dayEvents }, index) => {
          const isCurrentDay = isToday(day);
          const isCurrentMonth = day.getMonth() === date.getMonth();
          const badWeather = badWeatherByDate.get(formatDate(day, 'yyyy-MM-dd'));

          // The bad-weather tint rides on a plain class, not a Tailwind bg-*
          // utility: index.css hard-sets `background: white` on every
          // `.calendar-month-view .grid > div`, which outranks all of them.
          // It applies on top of today as well, since today stays identifiable
          // by its blue number pill and border.
          const backgroundClass = isCurrentDay ? 'bg-blue-50' : 'bg-white hover:bg-gray-50';

          return (
            <div
              key={index}
              className={`
                p-1 cursor-pointer transition-colors
                border-r border-b border-gray-100
                ${backgroundClass}
                ${badWeather ? 'day-bad-weather' : ''}
                ${!isCurrentMonth ? 'text-gray-400' : ''}
                ${isCurrentDay ? 'border-2 border-blue-300' : ''}
                ${isCurrentDay && todayPulseRun ? `today-pulse-cell ${todayPulseRun}` : ''}
              `}
              style={{ minHeight: '32px' }}
              title={badWeather || undefined}
              onClick={() => onDateClick?.(day)}
            >
              {/* Date number - positioned at top-left with minimal spacing */}
              <div className={`
                text-sm font-medium
                ${isCurrentDay ? 'bg-blue-500 text-white px-1 py-0.5 rounded' : ''}
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
              `}>
                {day.getDate()}
              </div>
              
              {/* Show up to three events, followed by the remaining count. */}
              {dayEvents.length > 0 && (
                <div className="mt-1">
                  {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs p-0.5 rounded truncate cursor-pointer ${getEventTypeStyling(event)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > MAX_VISIBLE_EVENTS && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - MAX_VISIBLE_EVENTS} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
