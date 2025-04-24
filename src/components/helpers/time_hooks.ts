import { onWillUnmount, useEffect } from "@odoo/owl";

interface IntervalTimer {
  pause: () => void;
  resume: () => void;
}

interface Timeout {
  clear: () => void;
  schedule: (callback: () => void, delay: number) => void;
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

/**
 * Calls a callback function with a time delay
 */
export function useTimeOut(): Timeout {
  let timeOutId: NodeJS.Timeout | undefined;
  function clear() {
    if (timeOutId !== undefined) {
      clearTimeout(timeOutId);
      timeOutId = undefined;
    }
  }
  function schedule(callback: () => void, delay: number) {
    clear();
    timeOutId = setTimeout(callback, delay);
  }
  onWillUnmount(clear);
  return {
    clear,
    schedule,
  };
}
