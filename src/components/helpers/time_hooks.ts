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
  const pause = () => {
    clearInterval(intervalId);
    intervalId = undefined;
  };
  const safeCallback = () => {
    try {
      callback();
    } catch (e) {
      pause();
      throw e;
    }
  };
  useEffect(
    () => {
      intervalId = setInterval(safeCallback, delay);
      return () => clearInterval(intervalId);
    },
    () => [delay]
  );
  return {
    pause,
    resume: () => {
      if (intervalId === undefined) {
        intervalId = setInterval(safeCallback, delay);
      }
    },
  };
}
