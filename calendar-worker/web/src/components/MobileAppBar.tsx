export type MobileSurface = 'settings' | 'voice';

interface MobileAppBarProps {
  /** Null until the first period has loaded, like the desktop count line. */
  eventCounts: { visible: number; total: number; hidden: number } | null;
  openSurface: MobileSurface | null;
  onOpenSurface: (surface: MobileSurface) => void;
}

/**
 * The phone's stand-in for the desktop heading row and the sidebar column: the
 * wordmark, a condensed event count, and entry points to the two sheets that
 * hold what the sidebar holds on desktop. index.css hides it at 768px and up.
 */
export function MobileAppBar({ eventCounts, openSurface, onOpenSurface }: MobileAppBarProps) {
  const hidden = eventCounts?.hidden ?? 0;

  return (
    <header className="mobile-app-bar">
      <img src="/infflow-logo.png" alt="infflow" className="mobile-app-bar__wordmark" />
      <div className="mobile-app-bar__title">
        <h1 className="mobile-app-bar__heading">Calendar</h1>
        {eventCounts && (
          <p className="mobile-app-bar__count">
            {eventCounts.visible} of {eventCounts.total} events
            {hidden > 0 && ` · ${hidden} hidden`}
          </p>
        )}
      </div>

      <button
        type="button"
        className="mobile-app-bar__action"
        onClick={() => onOpenSurface('settings')}
        aria-label={hidden > 0 ? `Filters and weather (${hidden} hidden)` : 'Filters and weather'}
        aria-haspopup="dialog"
        aria-controls="calendar-settings"
        aria-expanded={openSurface === 'settings'}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
          <circle cx="15" cy="6" r="2" />
          <circle cx="9" cy="12" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
        {hidden > 0 && (
          <span className="mobile-app-bar__badge" aria-hidden="true">{hidden}</span>
        )}
      </button>

      <button
        type="button"
        className="mobile-app-bar__action"
        onClick={() => onOpenSurface('voice')}
        aria-label="Voice assistant"
        aria-haspopup="dialog"
        aria-controls="calendar-voice-panel"
        aria-expanded={openSurface === 'voice'}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
          <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
        </svg>
      </button>
    </header>
  );
}
