import { formatDate, getWeekDays, type View } from './date';
import { weatherService } from './services/weatherService';

interface WeatherForecast {
  daily?: {
    time: string[];
    temperature_2m_min?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    windspeed_10m_max?: (number | null)[];
    weathercode?: (number | null)[];
  };
  daily_units?: Record<string, string>;
}

export function getCalendarWeatherContext(
  weatherData: WeatherForecast | null | undefined,
  view: View,
  date: Date,
) {
  let dates: Date[];
  if (view === 'month') {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    dates = Array.from({ length: daysInMonth }, (_, index) =>
      new Date(date.getFullYear(), date.getMonth(), index + 1)
    );
  } else if (view === 'day' || view === 'list') {
    dates = [date];
  } else {
    // Match WeekView's Monday-Sunday columns, including when date is a Sunday.
    dates = getWeekDays(date, 1);
  }

  // Compare calendar date strings directly: parsing YYYY-MM-DD as UTC can shift
  // a forecast onto the previous day in the user's local timezone.
  const selectedDates = dates.map(day => formatDate(day, 'yyyy-MM-dd'));
  const selectedDateSet = new Set(selectedDates);
  const daily = weatherData?.daily;
  const forecast = (daily?.time ?? []).flatMap((forecastDate, index) => {
    if (!selectedDateSet.has(forecastDate)) return [];
    return [{
      date: forecastDate,
      temperatureMin: daily?.temperature_2m_min?.[index] ?? null,
      temperatureMax: daily?.temperature_2m_max?.[index] ?? null,
      precipitationProbability: daily?.precipitation_probability_max?.[index] ?? null,
      windSpeed: daily?.windspeed_10m_max?.[index] ?? null,
      weatherCode: daily?.weathercode?.[index] ?? null,
    }];
  });
  const availableDates = new Set(forecast.map(day => day.date));
  const badWeatherEvents = daily?.time?.length
    ? weatherService.generateWeatherEvents(weatherData).filter(event => selectedDateSet.has(event.start))
    : [];

  return {
    view,
    startDate: selectedDates[0],
    endDate: selectedDates[selectedDates.length - 1],
    totalDays: selectedDates.length,
    forecast,
    badWeatherEvents,
    unavailableDates: selectedDates.filter(day => !availableDates.has(day)),
    units: {
      temperatureMin: weatherData?.daily_units?.temperature_2m_min ?? '°F',
      temperatureMax: weatherData?.daily_units?.temperature_2m_max ?? '°F',
      precipitationProbability: weatherData?.daily_units?.precipitation_probability_max ?? '%',
      windSpeed: weatherData?.daily_units?.windspeed_10m_max ?? '(unit unavailable)',
    },
  };
}

export type CalendarWeatherContext = ReturnType<typeof getCalendarWeatherContext>;
