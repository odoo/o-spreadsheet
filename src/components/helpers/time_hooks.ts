import { useEffect } from "@odoo/owl";

interface IntervalTimer {
  pause: () => void;
  resume: () => void;
}

/**
 * Repeatedly calls a callback function with a time delay between calls.
 */
export function useInterval(callback: () => void, delay: number): IntervalTimer {
  let intervalId: number | undefined;
  const { setInterval, clearInterval } = window;
  useEffect(
    () => {
      intervalId = setInterval(callback, delay);
      return () => clearInterval(intervalId);
    },
    () => [delay]
  );
  return {
    pause: () => {
      clearInterval(intervalId);
      intervalId = undefined;
    },
    resume: () => {
      if (intervalId === undefined) {
        intervalId = setInterval(callback, delay);
      }
    },
  };
}
