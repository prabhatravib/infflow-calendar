import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { sessionManager } from '../utils/sessionManager';
import { captureHexaConsoleEntry } from '../utils/console-log-capture';
import { getCalendarWeatherContext } from '../lib/calendarWeatherContext';
import { createProtectedCalendarContext, type CalendarData } from '../lib/protectedCalendarContext';
import { ProtectedHexaBridge, seedHexaPresentation, type CalendarSyncState } from '../lib/protectedHexaBridge';
import { useIsMobile } from '../lib/hooks/useViewport';

interface HexaWorkerProps {
  calendarData: CalendarData;
  hexaWorkerUrl?: string;
  /** The phone sheet stays mounted while CSS hidden, including its session. */
  isSheetOpen?: boolean;
  onSheetClose?: () => void;
}

export const HexaWorker: React.FC<HexaWorkerProps> = ({
  calendarData,
  hexaWorkerUrl = 'https://hexa-worker-v2.prabhatravib.workers.dev',
  isSheetOpen = false,
  onSheetClose
}) => {
  const isMobile = useIsMobile();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<CalendarSyncState>('pending');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<ProtectedHexaBridge | null>(null);
  const loadedSessionRef = useRef<string | null>(null);
  const iframeSetupTimeoutsRef = useRef<number[]>([]);
  const presentationRef = useRef({ visualHidden: true, transcriptHidden: true });
  const workerOrigin = new URL(hexaWorkerUrl).origin;
  const weatherContext = useMemo(() => getCalendarWeatherContext(
    calendarData.weatherData, calendarData.currentView, calendarData.currentDate,
  ), [calendarData.weatherData, calendarData.currentView, calendarData.currentDate]);
  const calendarContext = useMemo(() => createProtectedCalendarContext(
    calendarData, weatherContext, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language,
  ), [calendarData, weatherContext]);
  const latestContextRef = useRef(calendarContext);
  latestContextRef.current = calendarContext;

  const configureIframe = useCallback(() => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;
    // Hexa accepts this only as an initial restore; native controls own every
    // subsequent change and refuse a delayed host seed after a visitor click.
    seedHexaPresentation(frame, workerOrigin, presentationRef.current);
  }, [workerOrigin]);

  const handleIframeLoad = () => {
    iframeSetupTimeoutsRef.current.forEach(window.clearTimeout);
    loadedSessionRef.current = sessionId;
    bridgeRef.current?.frameLoaded();
    configureIframe();
    iframeSetupTimeoutsRef.current = [400, 1200].map(delay =>
      window.setTimeout(configureIframe, delay)
    );
  };

  useEffect(() => {
    const unsubscribe = sessionManager.onSessionChange(setSessionId);
    const currentSessionId = sessionManager.getSessionId();
    setSessionId(currentSessionId || sessionManager.generateSessionId());
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const bridge = new ProtectedHexaBridge({
      workerOrigin,
      parentOrigin: window.location.origin,
      sessionId,
      getFrame: () => iframeRef.current?.contentWindow ?? null,
      fetch: window.fetch.bind(window),
      onSyncState: setSyncState,
      onFrameReady: configureIframe,
      onReplacement: () => sessionManager.generateSessionId(),
      onPresentation: snapshot => { presentationRef.current = snapshot; },
      onConsoleEntry: captureHexaConsoleEntry,
    });
    bridgeRef.current = bridge;
    bridge.setCalendar(latestContextRef.current);
    if (loadedSessionRef.current === sessionId) bridge.frameLoaded();
    const handleMessage = (event: MessageEvent) => bridge.handleMessage(event);
    window.addEventListener('message', handleMessage);
    return () => {
      bridge.dispose();
      if (bridgeRef.current === bridge) bridgeRef.current = null;
      window.removeEventListener('message', handleMessage);
      iframeSetupTimeoutsRef.current.forEach(window.clearTimeout);
      iframeSetupTimeoutsRef.current = [];
    };
  }, [sessionId, workerOrigin, configureIframe]);

  useEffect(() => {
    bridgeRef.current?.setCalendar(calendarContext);
  }, [calendarContext]);

  const handleResetConnection = () => {
    // Inert the old handler immediately, before React replaces the iframe.
    bridgeRef.current?.dispose();
    sessionManager.generateSessionId();
  };

  // The status line doubles as a hint about what the assistant can answer, so
  // it names the weather forecast whenever one actually came through.
  const eventCount = calendarData.events.length;
  const eventLabel = `${eventCount} event${eventCount === 1 ? '' : 's'}`;
  const loadedSummary = weatherContext.forecast.length > 0
    ? `Details of ${eventLabel} and weather loaded`
    : `Details of ${eventLabel} loaded`;

  return (
    <section
      id="calendar-voice-panel"
      className="calendar-voice-panel"
      aria-label="Voice Panel"
      data-sheet-open={isSheetOpen ? '' : undefined}
      role={isMobile ? 'dialog' : undefined}
      aria-modal={isMobile ? true : undefined}
    >
      <div className="calendar-voice-panel__header">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Voice Pane</h2>
          <p className="text-[11px] leading-tight text-gray-500" role="status">
            {syncState === 'applied' ? loadedSummary : syncState === 'error' ? 'Calendar sync unavailable' : 'Syncing calendar...'}
          </p>
        </div>
        <div className="calendar-voice-panel__actions">
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
          {onSheetClose && (
            <button
              type="button"
              onClick={onSheetClose}
              className="calendar-voice-panel__close sheet-close"
              title="Close voice pane"
              aria-label="Close voice pane"
              data-sheet-close
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="calendar-voice-panel__body">
        {sessionId ? (
          <iframe
            key={sessionId}
            ref={iframeRef}
            // The protected grant uses start:true to retain prewarm: Hexa
            // builds its Realtime session at load even though voice starts off,
            // so the reader sees the hexagon rather than a blurred progress bar
            // and the first Voice ON is instant instead of a several-second
            // wait. The microphone is untouched until they tap the pill.
            //
            // `curtainsStart=both` is what makes it arrive *covered*. This pane
            // wants both regions hidden to begin with, and asking for that with
            // the SET_NARRATOR_PRESENTATION below alone meant asking too late:
            // the message cannot be posted until the frame has loaded, so the
            // hexagon and the transcript painted in full and were covered a
            // beat later. On the URL it is known before Hexa's first render, so
            // the curtains are there from the start and the voice app boots
            // behind them. The message still follows, and still matters — it is
            // what restores the reader's own choices into a replaced iframe.
            src={`${hexaWorkerUrl}/enhancedMode?showChat=true&sessionId=${encodeURIComponent(sessionId)}&iframe=true&curtains=true&curtainsStart=both&voice=off&prewarm=true`}
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

