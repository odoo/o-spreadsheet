import { _lt } from "../translation";
import { AddFunctionDescription, PrimitiveArgValue } from "../types";
import { arg } from "./arguments";
import { toNumber } from "./helpers";

const DEFAULT_DELTA_ARG = 0;

// -----------------------------------------------------------------------------
// DELTA
// -----------------------------------------------------------------------------
export const DELTA: AddFunctionDescription = {
  description: _lt("Compare two numeric values, returning 1 if they're equal."),
  args: [
    arg(" (number)", _lt("The first number to compare.")),
    arg(` (number, default=${DEFAULT_DELTA_ARG})`, _lt("The second number to compare.")),
  ],
  returns: ["NUMBER"],
  compute: function (
    number1: PrimitiveArgValue,
    number2: PrimitiveArgValue = DEFAULT_DELTA_ARG
  ): number {
    const _number1 = toNumber(number1, this.locale);
    const _number2 = toNumber(number2, this.locale);
    return _number1 === _number2 ? 1 : 0;
  },
  isExported: true,
};
