import { useState, useMemo } from 'react';
import { formatDate, formatTime, isSameDay, isToday } from '../../lib/date';
import { useWeatherEvents } from '../../lib/hooks/useWeatherEvents';
import type { Event } from '../../lib/api';

interface ListViewProps {
  date: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  className?: string;
}

export function ListView({ date, events, onEventClick, className = '' }: ListViewProps) {
  const [showWork, setShowWork] = useState(true);
  const [showFun, setShowFun] = useState(true);
  const [showOther, setShowOther] = useState(true);

  // Bad-weather warnings only; the service emits nothing for a good day.
  const { weatherEvents } = useWeatherEvents();
  const selectedDay = useMemo(
    () => (date instanceof Date && !isNaN(date.getTime()) ? date : new Date()),
    [date]
  );

  const badWeather = useMemo(() => {
    const selectedKey = formatDate(selectedDay, 'yyyy-MM-dd');
    const warning = weatherEvents.find(weatherEvent => weatherEvent?.start === selectedKey);
    if (!warning) return null;
    // Titles read "Bad Weather (Rain 60%)" - keep just the reason.
    const reason = /\(([^)]*)\)/.exec(warning.title || '')?.[1];
    return { reason: reason || 'Poor conditions' };
  }, [weatherEvents, selectedDay]);

  // Keep the agenda on the selected day, even while the next day is loading.
  const dayEvents = useMemo(() => {
    // Ensure events is always an array
    const safeEvents = Array.isArray(events) ? events : [];
    return safeEvents.filter(event => {
      if (!event?.start) return false;
      try {
        const eventDate = new Date(event.start);
        return !isNaN(eventDate.getTime()) && isSameDay(eventDate, selectedDay);
      } catch (error) {
        console.error('Error reading event date:', event, error);
        return false;
      }
    });
  }, [events, selectedDay]);

  // Sort events chronologically
  const sortedEvents = useMemo(() => {
    return [...dayEvents].sort((a, b) => {
      try {
        const dateA = new Date(a.start);
        const dateB = new Date(b.start);

        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          return 0;
        }

        return dateA.getTime() - dateB.getTime();
      } catch (error) {
        console.error('Error sorting events:', error);
        return 0;
      }
    });
  }, [dayEvents]);

  // Filter events based on type and visibility settings
  const filteredEvents = useMemo(() => {
    return sortedEvents.filter(event => {
      const eventType = event.eventType || 'other';
      switch (eventType) {
        case 'work':
          return showWork;
        case 'fun':
          return showFun;
        case 'other':
          return showOther;
        default:
          return true;
      }
    });
  }, [sortedEvents, showWork, showFun, showOther]);

  const getEventTypeColor = (event: Event) => {
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

  const getEventTypeLabel = (event: Event) => {
    const eventType = event.eventType || 'other';
    return eventType.charAt(0).toUpperCase() + eventType.slice(1);
  };

  const dayIsToday = isToday(selectedDay);

  return (
    <div className={`calendar-list-view ${className}`}>
      {/* Filters */}
      <div className="bg-white border-b border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Event Types:</span>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showWork}
              onChange={(e) => setShowWork(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Work</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFun}
              onChange={(e) => setShowFun(e.target.checked)}
              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            <span className="text-sm text-gray-700">Fun</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOther}
              onChange={(e) => setShowOther(e.target.checked)}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Other</span>
          </label>

          {badWeather && (
            <span
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800"
              title={`Bad weather on ${formatDate(selectedDay, 'MMM dd, yyyy')}: ${badWeather.reason}`}
            >
              <span aria-hidden="true">&#9928;&#65039;</span>
              Bad weather &middot; {badWeather.reason}
            </span>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No events on {formatDate(selectedDay, 'MMM dd, yyyy')}. Try adjusting your filters or add some events.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEvents.map((event) => {
              const eventDate = new Date(event.start);

              return (
                <div
                  key={event.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    dayIsToday ? 'bg-blue-25' : ''
                  }`}
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getEventTypeColor(event)}`}>
                          {getEventTypeLabel(event)}
                        </span>
                        {dayIsToday && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Today
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {event.title}
                      </h3>

                      {event.description && (
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(eventDate, 'MMM dd, yyyy')}
                        </div>

                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatTime(eventDate, 'HH:mm')}
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      {event.all_day ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          All Day
                        </span>
                      ) : (
                        <div>
                          <div>{formatTime(new Date(event.start), 'HH:mm')}</div>
                          <div className="text-xs">to</div>
                          <div>{formatTime(new Date(event.end), 'HH:mm')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
