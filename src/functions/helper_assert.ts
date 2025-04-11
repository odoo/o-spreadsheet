import { _t } from "../translation";
import { Arg, FunctionResultNumber, FunctionResultObject, Matrix, isMatrix } from "../types";
import { CellErrorType } from "../types/errors";

// -----------------------------------------------------------------------------
// MAIN ASSERTS (ASSERT BY ERROR TYPE)
// -----------------------------------------------------------------------------

export function assert(condition: boolean, message = _t("Error")): void {
  if (!condition) {
    throw { value: CellErrorType.GenericError, message };
  }
}

export function assertNotZero(
  value: number,
  message = _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
) {
  if (value === 0) {
    throw {
      value: CellErrorType.DivisionByZero,
      message,
    };
  }
}

// -----------------------------------------------------------------------------
// OTHER ASSERTS
// -----------------------------------------------------------------------------

export function assertSingleColOrRow(errorStr: string, arg: Matrix) {
  assert(arg.length === 1 || arg[0].length === 1, errorStr);
}

export function assertSameDimensions(errorStr: string, ...args: Arg[]) {
  if (args.every(isMatrix)) {
    const cols = args[0].length;
    const rows = args[0][0].length;
    for (const arg of args) {
      assert(arg.length === cols && arg[0].length === rows, errorStr);
    }
    return;
  }
  if (args.some((arg) => Array.isArray(arg) && (arg.length !== 1 || arg[0].length !== 1))) {
    throw { value: CellErrorType.GenericError, message: errorStr };
  }
}

export function assertPositive(errorStr: string, arg: number) {
  assert(arg > 0, errorStr);
}

export function assertSquareMatrix(errorStr: string, arg: Matrix) {
  assert(arg.length === arg[0].length, errorStr);
}

export function isNumberMatrix(
  arg: Matrix<FunctionResultObject>
): arg is Matrix<FunctionResultNumber> {
  return arg.every((row) => row.every((data) => typeof data.value === "number"));
}

export function assertNumberGreaterThanOrEqualToOne(value: number) {
  assert(
    value >= 1,
    _t(
      "The function [[FUNCTION_NAME]] expects a number value to be greater than or equal to 1, but receives %s.",
      value.toString()
    )
  );
}
