import type { Event } from './api';
import type { View } from './date';
import type { CalendarWeatherContext, getCalendarWeatherContext } from './calendarWeatherContext';

export interface CalendarData {
  events: Event[];
  weatherData?: NonNullable<Parameters<typeof getCalendarWeatherContext>[0]> & {
    current_weather?: { temperature?: number | null };
    current_weather_units?: { temperature?: string };
  } | null;
  location?: string;
  currentView: View;
  currentDate: Date;
}

/** Visible calendar facts only. The host Worker owns their private framing. */
export function createProtectedCalendarContext(
  calendar: CalendarData,
  weather: CalendarWeatherContext,
  timeZone: string,
  locale: string,
) {
  const date = calendar.currentDate;
  const currentTemperature = calendar.weatherData?.current_weather?.temperature;
  return {
    view: calendar.currentView,
    currentDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    timeZone,
    locale,
    location: calendar.location ?? '',
    events: calendar.events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      tz: event.tz,
      ...(typeof event.description === 'string' ? { description: event.description } : {}),
      ...(typeof event.eventType === 'string' ? { eventType: event.eventType } : {}),
      ...(typeof event.location === 'string' ? { location: event.location } : {}),
    })),
    weather: {
      ...weather,
      badWeatherEvents: weather.badWeatherEvents.map(({ start, title }) => ({ start, title })),
    },
    currentWeather: calendar.weatherData?.current_weather ? {
      temperature: typeof currentTemperature === 'number' && Number.isFinite(currentTemperature) ? currentTemperature : null,
      unit: calendar.weatherData.current_weather_units?.temperature ?? '°F',
    } : null,
  };
}

export type ProtectedCalendarContext = ReturnType<typeof createProtectedCalendarContext>;
