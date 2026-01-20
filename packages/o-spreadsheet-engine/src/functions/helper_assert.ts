import { _t } from "../translation";
import { DivisionByZeroError, EvaluationError } from "../types/errors";
import { Arg } from "../types/misc";
import { toMatrix } from "./helpers";

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new EvaluationError(message);
  }
}

export function assertNotZero(
  value: number,
  message = _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
) {
  if (value === 0) {
    throw new DivisionByZeroError(message);
  }
}

export function isSingleColOrRow(arg: any[][]) {
  return arg.length === 1 || arg[0].length === 1;
}

export function areSameDimensions(...args: Arg[]) {
  const cols = toMatrix(args[0]).length;
  const rows = toMatrix(args[0])[0].length;
  for (const arg of args) {
    if (toMatrix(arg).length !== cols || toMatrix(arg)[0].length !== rows) {
      return false;
    }
  }
  return true;
}

export function isSquareMatrix(arg: any[][]): boolean {
  return arg.length === arg[0].length;
}

export const expectNumberGreaterThanOrEqualToOne = (value: number) =>
  _t(
    "The function [[FUNCTION_NAME]] expects a number value to be greater than or equal to 1, but receives %s.",
    value
  );
