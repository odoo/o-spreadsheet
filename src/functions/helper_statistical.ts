import { isNumber, parseDateTime } from "../helpers";
import { _t } from "../translation";
import { Arg, Locale, isMatrix } from "../types";
import { assert, isEvaluationError, reduceAny, reduceNumbers } from "./helpers";

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

export function average(values: Arg[], locale: Locale) {
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

export function countNumbers(values: Arg[], locale: Locale) {
  let count = 0;
  for (let n of values) {
    if (isMatrix(n)) {
      for (let i of n) {
        for (let j of i) {
          if (typeof j.value === "number") {
            count += 1;
          }
        }
      }
    } else {
      const value = n?.value;
      if (
        !isEvaluationError(value) &&
        (typeof value !== "string" || isNumber(value, locale) || parseDateTime(value, locale))
      ) {
        count += 1;
      }
    }
  }
  return count;
}

export function countAny(values: Arg[]): number {
  return reduceAny(values, (acc, a) => (a !== undefined && a.value !== null ? acc + 1 : acc), 0);
}

export function max(values: Arg[], locale: Locale) {
  const result = reduceNumbers(values, (acc, a) => (acc < a ? a : acc), -Infinity, locale);
  return result === -Infinity ? 0 : result;
}

export function min(values: Arg[], locale: Locale): number {
  const result = reduceNumbers(values, (acc, a) => (a < acc ? a : acc), Infinity, locale);
  return result === Infinity ? 0 : result;
}
