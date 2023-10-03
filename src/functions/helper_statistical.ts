import { isNumber, parseDateTime } from "../helpers";
import { _t } from "../translation";
import { ArgValue, Locale, isMatrix } from "../types";
import { assert, reduceAny, reduceNumbers } from "./helpers";

export function assertSameNumberOfElements(...args: any[][]) {
  const dims = args[0].length;
  args.forEach((arg, i) =>
    assert(
      () => arg.length === dims,
      _t(
        "[[FUNCTION_NAME]] has mismatched dimensions for argument %s (%s vs %s).",
        i.toString(),
        dims.toString(),
        arg.length.toString()
      )
    )
  );
}

export function average(values: ArgValue[], locale: Locale) {
  let count = 0;
  const sum = reduceNumbers(
    values,
    (acc, a) => {
      count += 1;
      return acc + a;
    },
    0,
    locale
  );
  assert(
    () => count !== 0,
    _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
  );
  return sum / count;
}

export function countNumbers(values: ArgValue[], locale: Locale) {
  let count = 0;
  for (let n of values) {
    if (isMatrix(n)) {
      for (let i of n) {
        for (let j of i) {
          if (typeof j === "number") {
            count += 1;
          }
        }
      }
    } else if (
      !(n instanceof Error) &&
      (typeof n !== "string" || isNumber(n, locale) || parseDateTime(n, locale))
    ) {
      count += 1;
    }
  }
  return count;
}

export function countAny(values: ArgValue[]): number {
  return reduceAny(values, (acc, a) => (a !== undefined && a !== null ? acc + 1 : acc), 0);
}

export function max(values: ArgValue[], locale: Locale) {
  const result = reduceNumbers(values, (acc, a) => (acc < a ? a : acc), -Infinity, locale);
  return result === -Infinity ? 0 : result;
}

export function min(values: ArgValue[], locale: Locale): number {
  const result = reduceNumbers(values, (acc, a) => (a < acc ? a : acc), Infinity, locale);
  return result === Infinity ? 0 : result;
}
