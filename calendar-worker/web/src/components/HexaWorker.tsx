import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { sessionManager } from '../utils/sessionManager';
import { captureHexaConsoleEntry } from '../utils/console-log-capture';
import type { Event } from '../lib/api';
import type { View } from '../lib/date';
import { getCalendarWeatherContext, type CalendarWeatherContext } from '../lib/calendarWeatherContext';

interface CalendarData {
  events: Event[];
  weatherData?: any;
  location?: string;
  currentView: View;
  currentDate: Date;
}

interface HexaWorkerProps {
  calendarData: CalendarData;
  hexaWorkerUrl?: string;
}

/**
 * Format calendar data as a human-readable summary for the voice worker
 */
function formatCalendarSummary(calendarData: CalendarData, weatherContext: CalendarWeatherContext): string {
  const { events, weatherData, location } = calendarData;
  
  let summary = `# Calendar Summary for ${location || 'Unknown Location'}\n\n`;
  summary += `Selected view: ${weatherContext.view}\nSelected dates: ${weatherContext.startDate} through ${weatherContext.endDate}\n\n`;
  summary += `Total Events: ${events.length}\n\n`;
  
  // Group events by date
  const eventsByDate: Record<string, Event[]> = {};
  events.forEach(event => {
    const date = new Date(event.start).toLocaleDateString();
    if (!eventsByDate[date]) {
      eventsByDate[date] = [];
    }
    eventsByDate[date].push(event);
  });
  
  // Add events section
  summary += `## Events\n\n`;
  Object.keys(eventsByDate).sort().forEach(date => {
    summary += `### ${date}\n`;
    eventsByDate[date].forEach(event => {
      const startTime = new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      summary += `- **${event.title}** (${startTime} - ${endTime})`;
      if (event.description) {
        summary += `: ${event.description}`;
      }
      if (event.eventType) {
        summary += ` [${event.eventType}]`;
      }
      summary += `\n`;
    });
    summary += `\n`;
  });
  
  // Keep current conditions distinct from the selected period's forecast.
  if (weatherData && weatherData.current_weather) {
    summary += `## Current Weather (now)\n\n`;
    summary += `Current Temperature: ${weatherData.current_weather.temperature}°F\n`;
  }

  summary += `\n## Weather for the selected ${weatherContext.view}\n\n`;
  summary += `Forecast available for ${weatherContext.forecast.length} of ${weatherContext.totalDays} days.\n`;
  if (weatherContext.unavailableDates.length > 0) {
    summary += `Forecast unavailable for: ${weatherContext.unavailableDates.join(', ')}. Do not infer clear weather or invent conditions for these dates.\n`;
  }
  summary += `\n### Bad-weather warnings (${weatherContext.badWeatherEvents.length})\n`;
  for (const event of weatherContext.badWeatherEvents) {
    summary += `- ${event.start}: ${event.title}\n`;
  }
  if (weatherContext.badWeatherEvents.length === 0) {
    summary += weatherContext.forecast.length > 0
      ? `No bad-weather warnings in the available forecast for this period.\n`
      : `No forecast available for this period; bad-weather conditions are unknown.\n`;
  }
  if (weatherContext.forecast.length > 0) {
    const measurement = (value: number | null, unit: string) => value === null ? 'unavailable' : `${value} ${unit}`;
    const { units } = weatherContext;
    summary += `\n### Daily forecast for the selected period\n`;
    for (const day of weatherContext.forecast) {
      summary += `- ${day.date}: Low ${measurement(day.temperatureMin, units.temperatureMin)}, high ${measurement(day.temperatureMax, units.temperatureMax)}; precipitation probability ${measurement(day.precipitationProbability, units.precipitationProbability)}; maximum wind ${measurement(day.windSpeed, units.windSpeed)}; weather code ${day.weatherCode ?? 'unavailable'}.\n`;
    }
  }
  
  return summary;
}

export const HexaWorker: React.FC<HexaWorkerProps> = ({ 
  calendarData,
  hexaWorkerUrl = 'https://hexa-worker-v2.prabhatravib.workers.dev'
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSentDataRef = useRef<string | null>(null);
  const iframeSetupTimeoutsRef = useRef<number[]>([]);
  const presentationRef = useRef({ visualHidden: true, transcriptHidden: true });
  const workerOrigin = new URL(hexaWorkerUrl).origin;
  const weatherContext = useMemo(() => getCalendarWeatherContext(
    calendarData.weatherData, calendarData.currentView, calendarData.currentDate,
  ), [calendarData.weatherData, calendarData.currentView, calendarData.currentDate]);

  const configureIframe = useCallback(() => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;

    frame.postMessage({
      type: 'SET_LAYOUT_SPLIT',
      hexagonHeight: 40,
      chatHeight: 60,
      hideHexagon: false,
      compactHexagon: true,
    }, workerOrigin);
    frame.postMessage({ type: 'SET_ASPECT_COUNT', aspectCount: 0 }, workerOrigin);
    // Seed a fresh iframe, then let Hexa's native controls own visibility.
    // The snapshot also preserves the user's choices after a connection reset.
    frame.postMessage({
      type: 'SET_NARRATOR_PRESENTATION',
      ...presentationRef.current,
    }, workerOrigin);
  }, [workerOrigin]);

  const handleIframeLoad = () => {
    iframeSetupTimeoutsRef.current.forEach(window.clearTimeout);
    configureIframe();
    // Reapply after the embedded React app has registered its message listener.
    iframeSetupTimeoutsRef.current = [400, 1200].map(delay =>
      window.setTimeout(configureIframe, delay)
    );
  };

  useEffect(() => () => {
    iframeSetupTimeoutsRef.current.forEach(window.clearTimeout);
    iframeSetupTimeoutsRef.current = [];
  }, [sessionId]);

  // Subscribe to session changes
  useEffect(() => {
    const unsubscribe = sessionManager.onSessionChange((newSessionId) => {
      setSessionId(newSessionId);
      console.log('🆔 HexaWorker received session ID:', newSessionId);
    });
    const currentSessionId = sessionManager.getSessionId();
    setSessionId(currentSessionId || sessionManager.generateSessionId());
    return unsubscribe;
  }, []);

  // Send calendar data to voice worker when it changes
  useEffect(() => {
    if (!sessionId) return;

    const dataHash = JSON.stringify({
      events: calendarData.events,
      weatherData: calendarData.weatherData,
      weatherContext,
      location: calendarData.location,
      sessionId,
      hexaWorkerUrl,
    });

    // Deduplicate: skip if data hasn't changed
    if (dataHash === lastSentDataRef.current) {
      console.log('⏭️ Skipping duplicate calendar data send');
      return;
    }

    lastSentDataRef.current = dataHash;
    setIsLoading(true);

    // Format calendar data as a text summary for the voice worker
    const calendarSummary = formatCalendarSummary({
      events: calendarData.events,
      weatherData: calendarData.weatherData,
      location: calendarData.location,
      currentView: calendarData.currentView,
      currentDate: calendarData.currentDate,
    }, weatherContext);

    // Send calendar events and weather data to voice worker
    // Format matches the diagram data format from the reference implementation
    const payload = {
      mermaidCode: calendarSummary, // Use mermaidCode field like diagram data
      diagramImage: '', // Not applicable for calendar data
      prompt: `Calendar data for ${calendarData.location} with ${calendarData.events.length} events. Selected ${weatherContext.view}: ${weatherContext.startDate} through ${weatherContext.endDate}. Use the selected period's weather context for weather questions.`,
      type: 'calendar',
      sessionId,
      // Additional calendar-specific data
      calendarData: {
        events: calendarData.events,
        weatherData: calendarData.weatherData,
        location: calendarData.location,
        weatherContext,
      }
    };

    console.log('📤 Sending calendar data to voice worker:', {
      url: `${hexaWorkerUrl}/api/external-data`,
      eventsCount: calendarData.events.length,
      location: calendarData.location,
      sessionId
    });

    fetch(`${hexaWorkerUrl}/api/external-data`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload)
    })
      .then(async response => {
        setIsLoading(false);
        const responseText = await response.text();
        
        if (!response.ok) {
          console.error('❌ Failed to send calendar data:', {
            status: response.status,
            statusText: response.statusText,
            response: responseText
          });
          lastSentDataRef.current = null;
        } else {
          console.log('✅ Calendar data sent successfully:', responseText);
        }
      })
      .catch(error => {
        setIsLoading(false);
        console.error('❌ Error sending calendar data:', {
          message: error.message,
          error: error
        });
        lastSentDataRef.current = null;
      });
  }, [calendarData.events, calendarData.weatherData, calendarData.location, calendarData.currentView, calendarData.currentDate, weatherContext, sessionId, hexaWorkerUrl]);

  const handleResetConnection = () => {
    sessionManager.generateSessionId();
  };

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== workerOrigin || event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (!event.data || typeof event.data !== 'object') return;

      // Capture trusted relay entries once, without echoing them as host logs.
      if (event.data.type === 'HEXA_CONSOLE_LOG') {
        captureHexaConsoleEntry(event.data.payload);
        return;
      }

      console.log('📨 Received message from voice worker:', event.data);

      // Handle different message types
      switch (event.data.type) {
        case 'IFRAME_READY':
          if (event.data.sessionId === sessionId) configureIframe();
          break;
        case 'HEXA_PRESENTATION_STATE':
          if (
            event.data.source === 'hexa-presentation-state' &&
            event.data.sessionId === sessionId &&
            typeof event.data.visualHidden === 'boolean' &&
            typeof event.data.transcriptHidden === 'boolean'
          ) {
            presentationRef.current = {
              visualHidden: event.data.visualHidden,
              transcriptHidden: event.data.transcriptHidden,
            };
          }
          break;
        case 'transcription':
          console.log('🎤 Transcription:', event.data.text);
          break;
        case 'response_text_delta':
          console.log('💬 Response:', event.data.text);
          break;
        case 'error':
          console.error('❌ Voice worker error:', event.data.error);
          break;
        default:
          console.log('📨 Unknown message type:', event.data.type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [workerOrigin, configureIframe, sessionId]);

  return (
    <section className="calendar-voice-panel" aria-label="Voice Panel">
      <div className="calendar-voice-panel__header">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Voice Pane</h2>
          <p className="text-xs text-gray-500" role="status">
            {isLoading ? 'Syncing calendar...' : `${calendarData.events.length} events loaded`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetConnection}
          className="calendar-voice-panel__reset"
          title="Reset voice connection"
          aria-label="Reset voice connection"
          disabled={!sessionId}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
      <div className="calendar-voice-panel__body">
        {sessionId ? (
          <iframe
            key={sessionId}
            ref={iframeRef}
            // `prewarm=true` is what makes the pane arrive *loaded*: Hexa
            // builds its Realtime session at load even though voice starts off,
            // so the reader sees the hexagon rather than a blurred progress bar
            // and the first Voice ON is instant instead of a several-second
            // wait. The microphone is untouched until they tap the pill.
            src={`${hexaWorkerUrl}/enhancedMode?showChat=true&sessionId=${encodeURIComponent(sessionId)}&iframe=true&curtains=true&voice=off&prewarm=true`}
            className="calendar-voice-panel__frame"
            allow="microphone; autoplay"
            title="Voice Assistant - Hexagon and Chat"
            onLoad={handleIframeLoad}
          />
        ) : (
          <p className="p-4 text-center text-sm text-gray-500" role="status">
            Initializing voice assistant...
          </p>
        )}
      </div>
    </section>
  );
};

