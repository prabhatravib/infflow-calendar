import { useEffect, useState } from 'react';

/**
 * The one width that separates the phone presentation from the desktop one.
 *
 * Below it (width < 768px) the calendar is drawn as a phone app: an app bar,
 * sheets for filters/weather and voice, and phone layouts of each view. At
 * 768px and up it is the desktop layout, which agrees with Tailwind's `md:`
 * (min-width: 768px). Every mobile rule in index.css and the component
 * stylesheets is written as `max-width: 767px` so CSS and JS cannot disagree.
 */
export const MOBILE_BREAKPOINT = 768;
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function matchesMobile(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(MOBILE_MEDIA_QUERY).matches
  );
}

/**
 * True while the viewport is below the breakpoint. Only for behaviour the CSS
 * cannot express (which way a tap goes, where a scroller lands); anything
 * purely visual belongs in the stylesheet. Follows rotation and resizing
 * through matchMedia, so it never holds a stale answer.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(matchesMobile);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(MOBILE_MEDIA_QUERY);
    const update = () => setIsMobile(query.matches);
    // The viewport may have changed between the first render and this effect.
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}

/** A smaller shortfall than this is browser chrome settling, not a keyboard. */
const KEYBOARD_MIN_PX = 80;

/**
 * Keeps `--cal-keyboard-inset` on the root element equal to how much of the
 * layout viewport the software keyboard is covering.
 *
 * Mobile Safari (and Chrome, by default) leave the layout viewport alone when
 * the keyboard opens, so a sheet pinned to `bottom: 0` ends up underneath it.
 * Only visualViewport can see the keyboard, which is why this one measurement
 * lives in JS. On desktop the difference is always zero.
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;

    const apply = () => {
      // Pinch-zoom shrinks the visual viewport as well; that is not a keyboard.
      const zoomed = Math.abs(viewport.scale - 1) > 0.01;
      const covered = zoomed ? 0 : root.clientHeight - viewport.height - viewport.offsetTop;
      root.style.setProperty('--cal-keyboard-inset', `${covered > KEYBOARD_MIN_PX ? Math.round(covered) : 0}px`);
    };

    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);
    return () => {
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
      root.style.removeProperty('--cal-keyboard-inset');
    };
  }, []);
}
