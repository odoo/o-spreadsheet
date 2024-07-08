import { _t } from "../translation";
import { AddFunctionDescription, FunctionResultObject, Maybe } from "../types";
import { arg } from "./arguments";
import { toNumber } from "./helpers";

const DEFAULT_DELTA_ARG = 0;

// -----------------------------------------------------------------------------
// DELTA
// -----------------------------------------------------------------------------
export const DELTA = {
  description: _t("Compare two numeric values, returning 1 if they're equal."),
  args: [
    arg("number1 (number)", _t("The first number to compare.")),
    arg(`number2 (number, default=${DEFAULT_DELTA_ARG})`, _t("The second number to compare.")),
  ],
  compute: function (
    number1: Maybe<FunctionResultObject>,
    number2: Maybe<FunctionResultObject> = { value: DEFAULT_DELTA_ARG }
  ): number {
    const _number1 = toNumber(number1, this.locale);
    const _number2 = toNumber(number2, this.locale);
    return _number1 === _number2 ? 1 : 0;
  },
  isExported: true,
} satisfies AddFunctionDescription;
