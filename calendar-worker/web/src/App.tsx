import { useState, useEffect, useCallback } from 'react';
import { Calendar } from './components/calendar/Calendar';
import { EventModal } from './components/calendar/EventModal';
import { Sidebar, EventFilters } from './components/calendar/Sidebar';
import { HexaWorker } from './components/HexaWorker';
import { DownloadLogsButton } from './components/DownloadLogsButton';
import { MobileAppBar, type MobileSurface } from './components/MobileAppBar';
import { LocationProvider, useLocation } from './lib/contexts/LocationContext';
import { useEventFiltering } from './lib/hooks/useEventFiltering';
import { useKeyboardInset } from './lib/hooks/useViewport';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from './lib/api';
import { weatherService } from './lib/services/weatherService';
import type { Event } from './lib/api';
import { getCalendarDateRange, type View } from './lib/date';

const DEMO_CALENDAR_ID = '3c414e29-a3c3-4350-a334-5585cb22737a';

// Calendar Skeleton Component - Clean single loading animation.
// Kept at module scope on purpose: declared inside AppContent it was a fresh
// component type on every render, so each re-render during boot (weather,
// events, location) remounted this subtree and restarted the spinner from
// zero degrees, which read as the arc jumping backwards.
const CalendarSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-8">
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      {/* Single elegant loading spinner */}
      <div className="calendar-spinner w-16 h-16"></div>

      {/* Loading text */}
      <div className="mt-6 text-lg font-medium text-gray-600">
        Loading calendar...
      </div>

      {/* Subtle pulse animation for the text */}
      <div className="mt-2 text-sm text-gray-400 animate-pulse">
        Please wait while the calendar loads...
      </div>
    </div>
  </div>
);

function AppContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState<number | undefined>();
  const [selectedMinute, setSelectedMinute] = useState<number | undefined>();
  const [currentView, setCurrentView] = useState<View>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [displayedPeriod, setDisplayedPeriod] = useState<{ date: Date; view: View } | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  // The phone sheet open over the calendar, if any. Desktop draws no sheets,
  // so at 768px and up this state has nothing to show (see index.css).
  const [mobileSurface, setMobileSurface] = useState<MobileSurface | null>(null);
  const closeMobileSurface = useCallback(() => setMobileSurface(null), []);

  // Lifts the phone sheets clear of the software keyboard; inert on desktop.
  useKeyboardInset();

  // Get location from context
  const { location } = useLocation();

  // Ensure events is always an array
  const safeEvents = Array.isArray(events) ? events : [];

  // Use the event filtering hook
  const { filteredEvents, updateFilter, getFilterStats } = useEventFiltering(safeEvents);

  // Load weather data
  useEffect(() => {
    const loadWeather = async () => {
      try {
        const data = await weatherService.getWeather(location);
        setWeatherData(data);
        console.log('🌤️ Weather data loaded for voice worker:', location);
      } catch (error) {
        console.error('Error loading weather data:', error);
      }
    };
    
    loadWeather();
  }, [location]);



  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const { startDate, endDate } = getCalendarDateRange(currentDate, currentView);
        const fetchedEvents = await fetchEvents(
          DEMO_CALENDAR_ID,
          startDate.toISOString(),
          endDate.toISOString()
        );

        if (!cancelled) {
          setEvents(fetchedEvents);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading events:', error);
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          // Commit the visible period with its events, keeping the existing grid
          // mounted while navigation requests are in flight.
          setDisplayedPeriod({ date: currentDate, view: currentView });
          setIsLoading(false);
        }
      }
    };

    loadEvents();
    // A response for a previous date/view must not replace the current events.
    return () => {
      cancelled = true;
    };
  }, [currentView, currentDate]);

  // Global navigation function for Echo flowchart clicks
  const gotoDateWithTitle = useCallback((dateStr: string, eventTitle?: string) => {
    try {
      // Parse the date string
      const targetDate = new Date(dateStr);
      
      if (isNaN(targetDate.getTime())) {
        console.error('Invalid date string:', dateStr);
        return;
      }

      console.log('Navigating to date:', targetDate, 'for event:', eventTitle);
      
      // Close the modal first
      setIsModalOpen(false);
      setSelectedEvent(null);
      setSelectedDate(undefined);
      setSelectedHour(undefined);
      setSelectedMinute(undefined);
      
      // Navigate to the target date
      setCurrentDate(targetDate);
      
    } catch (error) {
      console.error('Error navigating to date:', error);
    }
  }, []);

  // Expose the navigation function globally for Echo flowchart clicks
  useEffect(() => {
    (window as any).gotoDateWithTitle = gotoDateWithTitle;
    
    // Cleanup function to remove the global function
    return () => {
      delete (window as any).gotoDateWithTitle;
    };
  }, [gotoDateWithTitle]);

  // An open phone sheet takes focus, closes on Escape, and gives focus back to
  // whatever opened it when it closes.
  useEffect(() => {
    if (!mobileSurface) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sheetId = mobileSurface === 'settings' ? 'calendar-settings' : 'calendar-voice-panel';
    document.getElementById(sheetId)
      ?.querySelector<HTMLElement>('[data-sheet-close]')
      ?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileSurface(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      opener?.focus({ preventScroll: true });
    };
  }, [mobileSurface]);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleTimeSlotClick = (date: Date, hour: number, minute?: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (eventData: any) => {
    try {
      if (selectedEvent) {
        // Update existing event
        const updatedEvent = await updateEvent(selectedEvent.id, eventData);
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      } else {
        // Create new event
        const newEvent = await createEvent({
          ...eventData,
          calendar_id: DEMO_CALENDAR_ID
        });
        setEvents(prev => [...prev, newEvent]);
      }
      
      // Don't call loadEvents() as it clears the events array
      // The events are already updated above
      
      setIsModalOpen(false);
      setSelectedEvent(null);
      setSelectedDate(undefined);
      setSelectedHour(undefined);
      setSelectedMinute(undefined);
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      // Remove the deleted event from local state
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setIsModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  const handleFilterChange = (filters: EventFilters) => {
    // Update individual filters
    Object.entries(filters).forEach(([key, value]) => {
      updateFilter(key as keyof EventFilters, value);
    });
  };

  const filterStats = getFilterStats();

  return (
    <div className="app-shell min-h-screen bg-gray-50">
      <MobileAppBar
        eventCounts={displayedPeriod ? filterStats : null}
        openSurface={mobileSurface}
        onOpenSurface={setMobileSurface}
      />
      <div className="app-layout flex">
        {/* Left Sidebar. On a phone its sections are the two sheets the app bar
            opens, placed by CSS alone: nothing here changes parent between
            layouts, so the voice iframe is never re-parented or reloaded. */}
        <Sidebar
          onFilterChange={handleFilterChange}
          isSheetOpen={mobileSurface === 'settings'}
          onSheetClose={closeMobileSurface}
          sheetFooter={<DownloadLogsButton />}
        >
          <HexaWorker
            calendarData={{
              events: safeEvents,
              weatherData: weatherData,
              location: location,
              currentView: displayedPeriod?.view ?? currentView,
              currentDate: displayedPeriod?.date ?? currentDate,
            }}
            isSheetOpen={mobileSurface === 'voice'}
            onSheetClose={closeMobileSurface}
          />
          <DownloadLogsButton className="mt-4 self-start calendar-desktop-only" />
        </Sidebar>

        {/* Main Content Area. min-w-0 so the calendar's day-column floor makes
            the grid scroll inside its card instead of widening the page. */}
        <div className="app-main flex-1 min-w-0 p-6">
          <div className="app-heading mb-6 flex flex-wrap items-baseline gap-4">
            <h1 className="text-3xl font-bold text-gray-800">Calendar</h1>
            {displayedPeriod && (
              <div className="text-sm text-gray-600">
                Showing {filterStats.visible} of {filterStats.total} events
                {filterStats.hidden > 0 && ` (${filterStats.hidden} hidden)`}
              </div>
            )}
            {/* Cropped to the wordmark's own bounds, so the height below is the
                height it actually renders and ml-auto reaches the true edge. */}
            <img
              src="/infflow-logo.png"
              alt="infflow"
              className="ml-auto h-9 w-auto self-center object-contain"
            />
          </div>
          
          {!displayedPeriod ? (
            <CalendarSkeleton />
          ) : (
            <Calendar
              events={filteredEvents}
              currentView={displayedPeriod.view}
              currentDate={displayedPeriod.date}
              navigationView={currentView}
              navigationDate={currentDate}
              isLoading={isLoading}
              onEventClick={handleEventClick}
              onDateClick={handleDateClick}
              onTimeSlotClick={handleTimeSlotClick}
              onViewChange={setCurrentView}
              onDateChange={setCurrentDate}
            />
          )}
        </div>
      </div>
      
      {/* Unmounted while no sheet is open, so it can never catch a tap. */}
      {mobileSurface && (
        <div className="mobile-scrim" onClick={closeMobileSurface} aria-hidden="true" />
      )}

      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
          setSelectedDate(undefined);
          setSelectedHour(undefined);
          setSelectedMinute(undefined);
        }}
        event={selectedEvent}
        calendarId={DEMO_CALENDAR_ID}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        selectedMinute={selectedMinute}
        onSave={handleSaveEvent}
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
      />
    </div>
  );
}

function App() {
  return (
    <LocationProvider defaultLocation="New York">
      <AppContent />
    </LocationProvider>
  );
}

export default App;
