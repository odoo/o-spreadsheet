import { useEffect } from "@odoo/owl";

export function useInterval(callback, delay: number) {
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
