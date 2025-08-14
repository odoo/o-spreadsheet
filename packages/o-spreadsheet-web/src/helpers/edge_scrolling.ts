export const MAX_DELAY = 140;
export const MIN_DELAY = 20;
const ACCELERATION = 0.035;

/**
 * Decreasing exponential function used to determine the "speed" of edge-scrolling
 * as the timeout delay.
 *
 * Returns a timeout delay in milliseconds.
 */
export function scrollDelay(value: number): number {
  // decreasing exponential from MAX_DELAY to MIN_DELAY
  return MIN_DELAY + (MAX_DELAY - MIN_DELAY) * Math.exp(-ACCELERATION * (value - 1));
}
