import { useEffect, useState } from 'react';

const TICK_INTERVAL = 15000;

function minuteOfDay(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Minutes elapsed since midnight, refreshed as the clock moves.
 *
 * State holds a plain number, so a tick that lands on the same minute bails out
 * of rendering entirely - the calendar only re-renders once a minute.
 */
export function useMinuteOfDay(): number {
  const [minutes, setMinutes] = useState(minuteOfDay);

  useEffect(() => {
    const tick = () => setMinutes(minuteOfDay());

    const interval = setInterval(tick, TICK_INTERVAL);
    // A backgrounded tab throttles timers; resync as soon as it is seen again.
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  return minutes;
}
