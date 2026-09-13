
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { isSameDay, isToday, getMonthDays, getWeekdayNames, formatDate, formatTime } from '../../lib/date';
import { useWeatherEvents } from '../../lib/hooks/useWeatherEvents';
import { useIsMobile } from '../../lib/hooks/useViewport';
import { useTodayPulse } from './useTodayPulse';
import type { Event } from '../../lib/api';

const MAX_VISIBLE_EVENTS = 3;

/*
 * Week rows are bounded, not proportional. They used to be fr shares scaled by
 * the busiest day in that week - 1fr for an empty week up to 5fr for a full one
 * - stretched across the card's fixed height, so a week with four events came
 * out five times the height of a quiet one and a cell holding a single chip ran
 * to nearly 300px.
 *
 * Now each row asks for what its busiest day actually needs and is clamped to
 * [MIN, MAX]. MIN comfortably holds a date number and two chips; MAX clears the
 * fullest cell there is - three chips plus the "+N more" line - so nothing is
 * ever cut off. In practice that is 132px for most weeks and 160px for a very
 * busy one: no two rows differ by more than a fifth.
 */
const WEEK_ROW_MIN_PX = 132;
const WEEK_ROW_MAX_PX = 160;

/** A day cell's padding plus its date number, with no events under it. */
const CELL_CHROME_PX = 36;
/** Gap between the date number and the first chip. */
const CELL_EVENT_GAP_PX = 4;
/** One event chip and the margin below it; the "+N more" line costs the same. */
const CELL_EVENT_PX = 32;

/** Height a week row wants, given the event count of its busiest day. */
function weekRowHeight(busiestDay: number): number {
  // A day over the limit shows MAX_VISIBLE_EVENTS chips and one "+N more" line.
  const lines = Math.min(busiestDay, MAX_VISIBLE_EVENTS + 1);
  const wanted = CELL_CHROME_PX + (lines > 0 ? CELL_EVENT_GAP_PX + lines * CELL_EVENT_PX : 0);
  return Math.min(Math.max(wanted, WEEK_ROW_MIN_PX), WEEK_ROW_MAX_PX);
}

/** A phone cell shows one dot per event up to this many, then "+N". */
const MAX_VISIBLE_DOTS = 3;

const DOT_COLOR_BY_TYPE: Record<string, string> = {
  work: 'bg-blue-500',
  fun: 'bg-pink-500',
  other: 'bg-green-500',
};

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
    weekRows.push(`${weekRowHeight(busiestDay)}px`);
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

  // A phone cell is ~48px wide: too narrow for chips, so it shows dots and a
  // tap picks the day for the agenda under the grid, whose New event button
  // opens the same prefilled form a desktop tap does.
  const isMobile = useIsMobile();
  const monthKey = formatDate(date, 'yyyy-MM');
  // A pick belongs to one month and one Today press, so a new month or a Today
  // click falls back to the default day instead of keeping a stale pick.
  const [pickedDay, setPickedDay] = useState<{ month: string; pulse: number; day: string } | null>(null);
  const pickedKey = pickedDay?.month === monthKey && pickedDay.pulse === todayPulse ? pickedDay.day : null;
  const isInMonth = (day: Date) => day.getMonth() === date.getMonth();
  const selected =
    daysWithEvents.find(({ day }) => formatDate(day, 'yyyy-MM-dd') === pickedKey) ??
    daysWithEvents.find(({ day }) => isToday(day) && isInMonth(day)) ??
    daysWithEvents.find(({ day }) => isInMonth(day));
  const selectedBadWeather = selected && badWeatherByDate.get(formatDate(selected.day, 'yyyy-MM-dd'));

  const pickDay = (day: Date) => {
    setPickedDay({ month: monthKey, pulse: todayPulse, day: formatDate(day, 'yyyy-MM-dd') });
  };

  const handleCellKeyDown = (event: KeyboardEvent<HTMLDivElement>, day: Date) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    pickDay(day);
  };

  return (
    <div className={`calendar-month-view ${className}`}>
      {/* Weekday headers and calendar grid combined to eliminate any gap */}
      <div
        className="grid grid-cols-7"
        style={{ '--month-week-rows': weekRows.join(' ') } as CSSProperties}
      >
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
          const isSelected = isMobile && selected?.day === day;

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
                ${isSelected ? 'calendar-month-cell--selected' : ''}
              `}
              style={{ minHeight: '32px' }}
              title={badWeather || undefined}
              onClick={() => (isMobile ? pickDay(day) : onDateClick?.(day))}
              role={isMobile ? 'button' : undefined}
              tabIndex={isMobile ? 0 : undefined}
              aria-pressed={isMobile ? isSelected : undefined}
              aria-label={isMobile
                ? `${formatDate(day, 'EEEE, MMMM d')}: ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}${badWeather ? `, ${badWeather}` : ''}`
                : undefined}
              onKeyDown={isMobile ? event => handleCellKeyDown(event, day) : undefined}
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
                <div className="calendar-month-cell__chips mt-1">
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

              {/* The phone's stand-in for the chips: a dot per event. */}
              {dayEvents.length > 0 && (
                <div className="calendar-month-cell__dots" aria-hidden="true">
                  {dayEvents.slice(0, MAX_VISIBLE_DOTS).map(event => (
                    <span
                      key={event.id}
                      className={`calendar-month-cell__dot ${DOT_COLOR_BY_TYPE[event.eventType?.toLowerCase() || 'other'] ?? DOT_COLOR_BY_TYPE.other}`}
                    />
                  ))}
                  {dayEvents.length > MAX_VISIBLE_DOTS && (
                    <span className="calendar-month-cell__more">+{dayEvents.length - MAX_VISIBLE_DOTS}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isMobile && selected && (
        <section
          className="calendar-month-agenda"
          aria-label={`Events on ${formatDate(selected.day, 'EEEE, MMMM d')}`}
        >
          <div className="calendar-month-agenda__header">
            <h3 className="calendar-month-agenda__title">{formatDate(selected.day, 'EEEE, MMM d')}</h3>
            <button
              type="button"
              className="calendar-month-agenda__add"
              onClick={() => onDateClick?.(selected.day)}
            >
              New event
            </button>
          </div>

          {selectedBadWeather && (
            <p className="calendar-month-agenda__weather">{selectedBadWeather}</p>
          )}

          {selected.dayEvents.length === 0 ? (
            <p className="calendar-month-agenda__empty">No events</p>
          ) : (
            <ul className="calendar-month-agenda__list">
              {[...selected.dayEvents]
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .map(event => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className={`calendar-month-agenda__event ${getEventTypeStyling(event)}`}
                      onClick={() => onEventClick?.(event)}
                    >
                      <span className="calendar-month-agenda__time">
                        {event.all_day ? 'All day' : formatTime(new Date(event.start), 'h:mm a')}
                      </span>
                      <span className="calendar-month-agenda__event-title">{event.title}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
