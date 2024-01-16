import { Arg, Locale } from "../types";
import { reduceNumbers } from "./helpers";

export function sum(values: Arg[], locale: Locale): number {
  return reduceNumbers(values, (acc, a) => acc + a, 0, locale);
}
