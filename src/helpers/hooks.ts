import * as owl from "@odoo/owl";

const { onWillUnmount } = owl.hooks;

/**
 * Return a throttled version of a function.
 * The function will be executed only once in the given time interval, even
 * if it was called multiple times.
 * The first and last calls are always executed.
 */
export function useThrottled<T extends (...args: unknown[]) => void>(
  func: T,
  delay
): (...args: Parameters<T>) => void {
  let timerId;
  let nextArgs: Parameters<T> | undefined;
  function throttledFunction(...args: Parameters<T>) {
    if (timerId) {
      nextArgs = args;
      return;
    }
    timerId = setTimeout(() => {
      timerId = undefined;
      if (nextArgs) {
        func(...nextArgs);
      }
    }, delay);
    func(...args);
  }
  onWillUnmount(() => clearTimeout(timerId));
  return throttledFunction;
}
