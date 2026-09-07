import { useWeatherAwareMinuteIndicator } from '../../lib/hooks/useWeatherAwareMinuteIndicator';
import { useLocation } from '../../lib/contexts/LocationContext';

interface CurrentTimeLineProps {
  /** Minutes past the hour this row represents */
  minute: number;
}

/**
 * The "now" line. Rendered *inside* the current hour's day cell so it is part of
 * the same layout as the row it belongs to - collapsing or expanding the sleep
 * toggles moves the line and its hour together in a single paint, with no
 * measure-then-correct step for the eye to catch.
 */
export function CurrentTimeLine({ minute }: CurrentTimeLineProps) {
  const { location } = useLocation();
  const { indicatorColor } = useWeatherAwareMinuteIndicator(location);

  return (
    <div
      className="current-time-line"
      style={{
        position: 'absolute',
        top: `${(minute / 60) * 100}%`,
        left: 0,
        right: 0,
        height: '2px',
        backgroundColor: indicatorColor.color,
        borderRadius: '1px',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        zIndex: 8,
        opacity: indicatorColor.opacity,
        transition: 'background-color 0.3s ease, opacity 0.3s ease'
      }}
    />
  );
}
