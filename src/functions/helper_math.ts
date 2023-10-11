import { ArgValue, Locale } from "../types";
import { reduceNumbers } from "./helpers";

export function sum(values: ArgValue[], locale: Locale): number {
  return reduceNumbers(values, (acc, a) => acc + a, 0, locale);
}
