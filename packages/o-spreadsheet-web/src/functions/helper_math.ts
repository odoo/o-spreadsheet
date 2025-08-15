import { Arg, Locale } from "../types";
import { isDataNonEmpty, reduceAny, reduceNumbers } from "./helpers";

export function sum(values: Arg[], locale: Locale): number {
  return reduceNumbers(values, (acc, a) => acc + a, 0, locale);
}

export function countUnique(args: Arg[]): number {
  return reduceAny(args, (acc, a) => (isDataNonEmpty(a) ? acc.add(a?.value) : acc), new Set()).size;
}
