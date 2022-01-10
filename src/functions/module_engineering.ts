import { _lt } from "../translation";
import { AddFunctionDescription, ArgValue } from "../types";
import { args } from "./arguments";
import { toNumber } from "./helpers";

const DEFAULT_DELTA_ARG = 0;

// -----------------------------------------------------------------------------
// DELTA
// -----------------------------------------------------------------------------
export const DELTA: AddFunctionDescription = {
  description: _lt("Compare two numeric values, returning 1 if they're equal."),
  args: args(`
  number1  (number) ${_lt("The first number to compare.")}
  number2  (number, default=${DEFAULT_DELTA_ARG}) ${_lt("The second number to compare.")}
  `),
  returns: ["NUMBER"],
  compute: function (number1: ArgValue, number2: ArgValue = DEFAULT_DELTA_ARG): number {
    const _number1 = toNumber(number1);
    const _number2 = toNumber(number2);
    return _number1 === _number2 ? 1 : 0;
  },
  isExported: true,
};
