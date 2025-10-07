import { _t } from "../translation";
import { DivisionByZeroError, EvaluationError } from "../types/errors";
import { Arg, FunctionResultNumber, FunctionResultObject, Matrix, isMatrix } from "../types/misc";

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

export function isSingleColOrRow(arg: Matrix) {
  return arg.length === 1 || arg[0].length === 1;
}

export function areSameDimensions(...args: Arg[]) {
  if (args.every(isMatrix)) {
    const cols = args[0].length;
    const rows = args[0][0].length;
    for (const arg of args) {
      if (arg.length !== cols || arg[0].length !== rows) {
        return false;
      }
    }
    return true;
  }
  return !args.some((arg) => Array.isArray(arg) && (arg.length !== 1 || arg[0].length !== 1));
}

export function isSquareMatrix(arg: Matrix) {
  return arg.length === arg[0].length;
}

export function isNumberMatrix(
  arg: Matrix<FunctionResultObject>
): arg is Matrix<FunctionResultNumber> {
  return arg.every((row) => row.every((data) => typeof data.value === "number"));
}

export const expectNumberGreaterThanOrEqualToOne = (value: number) =>
  _t(
    "The function [[FUNCTION_NAME]] expects a number value to be greater than or equal to 1, but receives %s.",
    value
  );
