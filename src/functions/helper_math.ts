import { Arg, FPayload, Locale } from "../types";
import { reduceAny, reduceNumbers } from "./helpers";

export function isDefined(data: FPayload | undefined): boolean {
  if (data === undefined) {
    return false;
  }
  const { value } = data;
  if (value === null || value === "") {
    return false;
  }
  return true;
}

export function sum(values: Arg[], locale: Locale): number {
  return reduceNumbers(values, (acc, a) => acc + a, 0, locale);
}

export function countUnique(args: Arg[]): number {
  return reduceAny(args, (acc, a) => (isDefined(a) ? acc.add(a?.value) : acc), new Set()).size;
}
