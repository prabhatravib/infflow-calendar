import { useEffect, useRef, useState } from 'react';

// Two 700ms ring cycles: long enough to catch the eye, short enough to leave.
export const TODAY_PULSE_DURATION_MS = 1400;

// The two runs are identical animations under different names. Alternating them
// is what makes a second Today click restart the pulse: re-adding the same
// animation name within a frame just lets the first run play out.
const RUN_CLASSES = ['today-pulse-run-a', 'today-pulse-run-b'];

/**
 * Returns the run class to put on today's element for one animation cycle each
 * time `token` changes, so the Today button can flag where it landed. Empty
 * while nothing is pulsing, including for a view mounted mid-run - it should
 * not replay a pulse it missed.
 */
export function useTodayPulse(token: number, duration = TODAY_PULSE_DURATION_MS) {
  const [runClass, setRunClass] = useState('');
  const lastToken = useRef(token);

  useEffect(() => {
    if (token === lastToken.current) return;
    lastToken.current = token;

    setRunClass(RUN_CLASSES[token % RUN_CLASSES.length]);
    const timeoutId = window.setTimeout(() => setRunClass(''), duration);
    return () => window.clearTimeout(timeoutId);
  }, [token, duration]);

  return runClass;
}
