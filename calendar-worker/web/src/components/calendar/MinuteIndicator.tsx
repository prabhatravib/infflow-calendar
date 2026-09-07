import { useWeatherAwareMinuteIndicator } from '../../lib/hooks/useWeatherAwareMinuteIndicator';
import { useLocation } from '../../lib/contexts/LocationContext';

interface MinuteIndicatorProps {
  /** Minutes past the hour this row represents */
  minute: number;
}

/**
 * Tick and minute label on the time axis. Rendered inside the current hour's
 * label cell, so it tracks the row exactly like CurrentTimeLine does and stays
 * pinned to the gutter's right edge whatever width that column has.
 */
export function MinuteIndicator({ minute }: MinuteIndicatorProps) {
  const { location } = useLocation();
  const { indicatorColor } = useWeatherAwareMinuteIndicator(location);

  const top = `${(minute / 60) * 100}%`;

  return (
    <>
      {/* Vertical tick on the edge of the time axis */}
      <div
        className="minute-indicator-line"
        style={{
          position: 'absolute',
          top,
          right: '2px',
          left: 'auto',
          width: '2px',
          height: '14px',
          backgroundColor: indicatorColor.color,
          borderRadius: '2px',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          zIndex: 9,
          opacity: indicatorColor.opacity,
          transition: 'background-color 0.3s ease, opacity 0.3s ease'
        }}
      />

      {/* Minute label */}
      <div
        className="minute-indicator-minute"
        style={{
          position: 'absolute',
          top,
          right: '12px',
          left: 'auto',
          fontSize: '12px',
          fontWeight: 600,
          lineHeight: 1,
          color: indicatorColor.color,
          transform: 'translateY(-50%)',
          whiteSpace: 'nowrap',
          zIndex: 10,
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: indicatorColor.opacity,
          transition: 'color 0.3s ease, opacity 0.3s ease'
        }}
      >
        {minute.toString().padStart(2, '0')}
      </div>
    </>
  );
}
