import { memoize } from "../../helpers";

const memoizedGetComputedStyle = memoize((variableName: string) => {
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
});

export function getCSSVariable<T = string>(variableName: string, parser?: (value: string) => T): T {
  const value = memoizedGetComputedStyle(variableName);
  if (parser) {
    return parser(value);
  }
  return value as unknown as T;
}
