import type { View } from '../../lib/date';

const VIEW_OPTIONS: { view: View; label: string }[] = [
  { view: 'week', label: 'Week' },
  { view: 'month', label: 'Month' },
  { view: 'day', label: 'Day' },
  { view: 'list', label: 'List' },
];

interface MobileCalendarToolbarProps {
  view: View;
  /** The heading short enough to sit between the arrows, e.g. "Sep 7 – 13". */
  compactTitle: string;
  /** The desktop heading, which assistive technology reads instead. */
  fullTitle: string;
  isLoading: boolean;
  /** Today-pulse classes, when Day or List flags today on the heading. */
  headingPulseClass: string;
  onStep: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  onViewChange: (view: View) => void;
}

/**
 * The calendar toolbar as a phone draws it, driven by the same handlers as the
 * desktop row:
 *
 *   ‹   Sep 7 – 13   ›   [Today]
 *   [ Week | Month | Day | List ]
 *
 * Every control is a full touch target and the heading never wraps. index.css
 * hides this at 768px and up, and hides the desktop row below it.
 */
export function MobileCalendarToolbar({
  view,
  compactTitle,
  fullTitle,
  isLoading,
  headingPulseClass,
  onStep,
  onToday,
  onViewChange,
}: MobileCalendarToolbarProps) {
  return (
    <div className="calendar-mobile-toolbar" data-loading={isLoading ? '' : undefined}>
      <div className="calendar-mobile-toolbar__period">
        <button
          type="button"
          className="calendar-mobile-toolbar__step"
          onClick={() => onStep('prev')}
          aria-label="Previous period"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className={`calendar-mobile-toolbar__title ${headingPulseClass}`}>
          <span aria-hidden="true">{compactTitle}</span>
          <span className="sr-only">{fullTitle}</span>
        </h2>

        <button
          type="button"
          className="calendar-mobile-toolbar__step"
          onClick={() => onStep('next')}
          aria-label="Next period"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button type="button" className="calendar-mobile-toolbar__today" onClick={onToday}>
          Today
        </button>
      </div>

      <div className="calendar-mobile-toolbar__views" role="group" aria-label="Calendar view">
        {VIEW_OPTIONS.map(option => (
          <button
            key={option.view}
            type="button"
            className="calendar-mobile-toolbar__view"
            aria-pressed={option.view === view}
            onClick={() => onViewChange(option.view)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <span role="status" className="sr-only">
        {isLoading ? 'Loading events...' : ''}
      </span>
    </div>
  );
}
