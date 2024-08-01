import type { ArgValue, CellValue, Matrix } from "../types";
import { isMatrix } from "../types";
import { assert } from "./helpers";

export function assertSingleColOrRow(errorStr: string, arg: Matrix) {
  assert(() => arg.length === 1 || arg[0].length === 1, errorStr);
}

export function assertSameDimensions(errorStr: string, ...args: ArgValue[]) {
  if (args.every(isMatrix)) {
    const cols = args[0].length;
    const rows = args[0][0].length;
    for (const arg of args) {
      assert(() => arg.length === cols && arg[0].length === rows, errorStr);
    }
    return;
  }
  if (args.some((arg) => Array.isArray(arg) && (arg.length !== 1 || arg[0].length !== 1))) {
    throw new Error(errorStr);
  }
}

export function assertPositive(errorStr: string, arg: number) {
  assert(() => arg > 0, errorStr);
}

export function assertSquareMatrix(errorStr: string, arg: Matrix<CellValue>) {
  assert(() => arg.length === arg[0].length, errorStr);
}

export function isNumberMatrix(arg: Matrix<CellValue>): arg is Matrix<number> {
  return arg.every((row) => row.every((val) => typeof val === "number"));
}
