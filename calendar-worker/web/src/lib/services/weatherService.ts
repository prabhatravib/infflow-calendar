interface WeatherCache {
  data: any;
  timestamp: number;
  location: string;
}

interface WeatherEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  type: string;
  editable: boolean;
  className: string[];
}

class WeatherService {
  private cache: WeatherCache | null = null;
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  private fetchPromise: Promise<any> | null = null;
  private readonly STORAGE_KEY = 'weather_events_cache';

  constructor() {
    // Load cached weather events from localStorage on initialization
    this.loadCachedWeatherEvents();
  }

  private loadCachedWeatherEvents(): void {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < this.CACHE_DURATION) {
          this.cache = parsed;
          console.log('Loaded cached weather events from localStorage');
        }
      }
    } catch (error) {
      console.error('Error loading cached weather events:', error);
    }
  }

  private saveWeatherEventsToStorage(weatherData: any, location: string): void {
    try {
      const dataToStore = {
        data: weatherData,
        timestamp: Date.now(),
        location: location
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToStore));
      console.log('Weather events saved to localStorage');
    } catch (error) {
      console.error('Error saving weather events to localStorage:', error);
    }
  }

  async getWeather(location: string): Promise<any> {
    // Check if we have valid cached data for this location
    if (this.isCacheValid(location)) {
      console.log('Using cached weather data for:', location);
      return this.cache!.data;
    }

    // If there's already a fetch in progress, wait for it
    if (this.fetchPromise) {
      console.log('Weather fetch already in progress, waiting...');
      return await this.fetchPromise;
    }

    // Fetch new weather data directly from Open-Meteo API (like reference repo)
    console.log('Fetching fresh weather data for:', location);
    this.fetchPromise = this.fetchAndCache(location);
    
    try {
      const result = await this.fetchPromise;
      return result;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async fetchAndCache(location: string): Promise<any> {
    try {
      // Fetch directly from Open-Meteo API like the reference repository
      const weatherData = await this.fetchFromOpenMeteo(location);
      
      // Cache the new data
      this.cache = {
        data: weatherData,
        timestamp: Date.now(),
        location: location
      };

      // Save to localStorage for persistence
      this.saveWeatherEventsToStorage(weatherData, location);

      console.log('Weather data cached successfully for:', location);
      return weatherData;
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      
      // If we have stale cache data, return it as fallback
      if (this.cache && this.cache.location === location) {
        console.log('Using stale cached weather data as fallback');
        return this.cache.data;
      }
      
      throw error;
    }
  }

  private async fetchFromOpenMeteo(location: string): Promise<any> {
    // First geocode the location to get coordinates
    const coords = await this.geocodeLocation(location);
    
    // Fetch weather data from Open-Meteo API
    const params = new URLSearchParams({
      latitude: coords.latitude.toString(),
      longitude: coords.longitude.toString(),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode',
      current_weather: 'true',
      timezone: 'auto',
      forecast_days: '16',
      temperature_unit: 'fahrenheit'
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private async geocodeLocation(location: string): Promise<{latitude: number, longitude: number}> {
    // Use Open-Meteo's geocoding API like the reference repository
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      // Fallback to New York coordinates like reference repo
      return { latitude: 40.7128, longitude: -74.0060 };
    }

    return {
      latitude: data.results[0].latitude,
      longitude: data.results[0].longitude
    };
  }

  private isCacheValid(location: string): boolean {
    if (!this.cache || this.cache.location !== location) {
      return false;
    }

    const now = Date.now();
    const cacheAge = now - this.cache.timestamp;
    
    return cacheAge < this.CACHE_DURATION;
  }

  // Force refresh weather data (useful for location changes)
  async refreshWeather(location: string): Promise<any> {
    console.log('Forcing weather refresh for:', location);
    this.cache = null; // Clear cache
    return await this.getWeather(location);
  }

  // Generate weather events from weather data (like reference repository)
  generateWeatherEvents(weatherData: any): WeatherEvent[] {
    if (!weatherData || !weatherData.daily) {
      console.log('No weather data or daily forecast available:', weatherData);
      return [];
    }

    const weatherEvents: WeatherEvent[] = [];
    const dates = weatherData.daily.time;
    
    console.log('Processing weather data for dates:', dates);

    for (let i = 0; i < dates.length; i++) {
      const dayForecast = {
        temperature_2m_max: weatherData.daily.temperature_2m_max?.[i],
        temperature_2m_min: weatherData.daily.temperature_2m_min?.[i],
        precipitation_probability_max: weatherData.daily.precipitation_probability_max?.[i],
        windspeed_10m_max: weatherData.daily.windspeed_10m_max?.[i],
        weathercode: weatherData.daily.weathercode?.[i]
      };

      const classification = this.classifyWeather(dayForecast);

      if (classification === "bad") {
        const reason = this.getWeatherReason(dayForecast);
        
        const event: WeatherEvent = {
          id: `weather-${dates[i]}`,
          title: `⛈️ Bad Weather (${reason})`,
          start: dates[i],
          end: dates[i],
          allDay: true,
          backgroundColor: '#ffb3b3',
          borderColor: '#ff8080',
          textColor: '#d00000',
          type: 'weather-warning',
          editable: false,
          className: ['weather-event']
        };
        
        console.log(`Created weather event for ${dates[i]}:`, event);
        weatherEvents.push(event);
      }
    }

    console.log('Total weather events generated:', weatherEvents.length);
    return weatherEvents;
  }

  private classifyWeather(dayForecast: any): 'good' | 'bad' {
    const tempMax = dayForecast.temperature_2m_max;
    const tempMin = dayForecast.temperature_2m_min;
    const precipProb = dayForecast.precipitation_probability_max;
    const windSpeed = dayForecast.windspeed_10m_max;
    const weatherCode = dayForecast.weathercode;

    // Bad weather conditions (same as reference repository)
    const badConditions = (
      (tempMin < 32 || tempMax > 95) || // Temperature extremes
      (precipProb > 40) || // High precipitation
      (weatherCode >= 95 && weatherCode <= 99) || // Thunderstorms
      (weatherCode >= 71 && weatherCode <= 86) || // Snow
      (weatherCode >= 65 && weatherCode <= 67) || // Heavy rain
      (weatherCode >= 82) || // Violent rain showers
      (windSpeed > 25) // High wind
    );

    return badConditions ? 'bad' : 'good';
  }

  private getWeatherReason(dayForecast: any): string {
    const reasons: string[] = [];
    const tempMax = dayForecast.temperature_2m_max;
    const tempMin = dayForecast.temperature_2m_min;
    const precipProb = dayForecast.precipitation_probability_max;
    const windSpeed = dayForecast.windspeed_10m_max;
    const weatherCode = dayForecast.weathercode;

    // Check for specific weather conditions (same as reference repository)
    if (weatherCode >= 95 && weatherCode <= 99) {
      reasons.push("Thunderstorm");
    } else if (weatherCode >= 71 && weatherCode <= 86) {
      reasons.push("Snow");
    } else if (weatherCode >= 65 && weatherCode <= 67) {
      reasons.push("Heavy Rain");
    } else if (weatherCode >= 61 && weatherCode <= 63) {
      if (precipProb > 40) {
        reasons.push(`Rain ${Math.round(precipProb)}%`);
      }
    }

    // Check temperature extremes
    if (tempMax > 95) {
      reasons.push(`Hot ${Math.round(tempMax)}°F`);
    } else if (tempMin < 32) {
      reasons.push(`Freezing ${Math.round(tempMin)}°F`);
    }

    // Check precipitation if not already added
    if (!reasons.some(r => r.includes("Rain") || r.includes("Snow") || r.includes("Thunderstorm"))) {
      if (precipProb > 70) {
        reasons.push(`Heavy Rain ${Math.round(precipProb)}%`);
      } else if (precipProb > 40) {
        reasons.push(`Rain ${Math.round(precipProb)}%`);
      }
    }

    // Check wind
    if (windSpeed > 35) {
      reasons.push(`Strong Wind ${Math.round(windSpeed)}mph`);
    } else if (windSpeed > 25) {
      reasons.push(`Windy ${Math.round(windSpeed)}mph`);
    }

    // Return the most important reason or combine top 2
    if (reasons.length >= 2) {
      return `${reasons[0]}, ${reasons[1]}`;
    } else if (reasons.length > 0) {
      return reasons[0];
    } else {
      return "Poor Conditions";
    }
  }

  // Get cache status for debugging
  getCacheStatus(): { hasCache: boolean; age: number; location: string } | null {
    if (!this.cache) {
      return null;
    }

    return {
      hasCache: true,
      age: Date.now() - this.cache.timestamp,
      location: this.cache.location
    };
  }

  // Get cached weather events immediately (for persistence)
  getCachedWeatherEvents(): any[] {
    if (!this.cache || !this.cache.data) {
      return [];
    }
    
    try {
      return this.generateWeatherEvents(this.cache.data);
    } catch (error) {
      console.error('Error generating cached weather events:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const weatherService = new WeatherService();
