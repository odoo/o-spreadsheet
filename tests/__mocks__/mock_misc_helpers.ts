import { DebouncedFunction } from "../../src/types";

/** Mocked debounce that doesn't actually do any debouncing, but just calls the function directly */
export function debounce<T extends (...args: any) => void>(func: T): DebouncedFunction<T> {
  const debounced = function (this: any): void {
    func.apply(this, arguments);
  };
  debounced.isDebouncePending = () => false;
  debounced.stopDebounce = () => {};
  return debounced as DebouncedFunction<T>;
}
