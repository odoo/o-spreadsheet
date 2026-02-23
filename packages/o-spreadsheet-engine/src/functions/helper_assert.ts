import { _t } from "../translation";
import { DivisionByZeroError, EvaluationError } from "../types/errors";
import { Arg, Matrix } from "../types/misc";
import { isMimicMatrix } from "./helper_arg";

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

export function areSameDimensions(...args: Arg[]) {
  if (args.every(isMimicMatrix)) {
    const cols = args[0].width;
    const rows = args[0].height;
    for (const arg of args) {
      if (arg.width !== cols || arg.height !== rows) {
        return false;
      }
    }
    return true;
  }
  return !args.some((arg) => isMimicMatrix(arg) && !arg.isSingleElement());
}

export function isSquareMatrix(arg: Matrix<any>): boolean {
  return arg.length === arg[0].length;
}

export const expectNumberGreaterThanOrEqualToOne = (value: number) =>
  _t(
    "The function [[FUNCTION_NAME]] expects a number value to be greater than or equal to 1, but receives %s.",
    value
  );
