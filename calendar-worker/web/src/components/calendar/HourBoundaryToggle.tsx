interface HourBoundaryToggleProps {
  /** Which sleep range this control expands or collapses */
  range: 'early' | 'late';
  /** Boundary time shown in the gutter, e.g. "6:00 AM" */
  label: string;
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
  /**
   * Which edge of the hour cell the boundary sits on. Early hours meet 6 AM at
   * the top of that cell; late hours start at the bottom of the 9 PM cell.
   */
  edge: 'top' | 'bottom';
}

const RANGE = {
  early: { noun: 'earlier hours', span: '12 AM - 6 AM' },
  late: { noun: 'later hours', span: '10 PM - 12 AM' }
} as const;

/**
 * The boundary time label plus a labelled pill. The time straddles the hour line
 * in the gutter where every other hour label is; the pill sits just clear of the
 * line on the side the hidden hours are on, so it points at what it reveals.
 * Both are absolutely positioned, so the boundary costs no grid track - the
 * calendar card carries a little padding to host the pill at the outermost lines.
 */
export function HourBoundaryToggle({
  range,
  label,
  collapsed,
  onToggle,
  edge
}: HourBoundaryToggleProps) {
  // Early hours are revealed upwards, late hours downwards
  const pointsUp = range === 'early' ? collapsed : !collapsed;
  const { noun, span } = RANGE[range];
  const text = `${collapsed ? 'Show' : 'Hide'} ${noun}`;

  // Expanded late hours put the next line after two adjacent 2px cell margins.
  const labelPosition =
    edge === 'top'
      ? { top: 0, transform: 'translateY(-50%)' }
      : { bottom: collapsed ? 0 : -4, transform: 'translateY(50%)' };

  const pillPosition =
    edge === 'top'
      ? { top: 0, transform: 'translateY(calc(-100% - 3px))' }
      : { bottom: 0, transform: 'translateY(calc(100% + 3px))' };

  return (
    <>
      <div className="hour-boundary-time" style={labelPosition}>
        {label}
      </div>
      <button
        type="button"
        className="hour-boundary-pill"
        style={pillPosition}
        aria-expanded={!collapsed}
        aria-label={`${text} (${span})`}
        title={`${text} (${span})`}
        onClick={() => onToggle(!collapsed)}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path
            d={pointsUp ? 'M2.5 7.5 6 4l3.5 3.5' : 'M2.5 4.5 6 8l3.5-3.5'}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {text}
      </button>
    </>
  );
}
