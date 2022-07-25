import { createLargeNumberFormat } from "../helpers";
import { _lt } from "../translation";
import { AddFunctionDescription, PrimitiveArg, PrimitiveArgValue } from "../types";
import { args } from "./arguments";
import { toNumber } from "./helpers";

// -----------------------------------------------------------------------------
// FORMAT.LARGE.NUMBER
// -----------------------------------------------------------------------------
export const FORMAT_LARGE_NUMBER: AddFunctionDescription = {
  description: _lt(`Apply a large number format`),
  args: args(`
      value (number) ${_lt("The number.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (arg: PrimitiveArg) => {
    const value = Math.abs(toNumber(arg.value));
    const format = arg.format;
    if (value < 1e5) {
      return format || "#,##0";
    } else if (value < 1e8) {
      return createLargeNumberFormat(format, 1e3, "k");
    } else if (value < 1e11) {
      return createLargeNumberFormat(format, 1e6, "m");
    }
    return createLargeNumberFormat(format, 1e9, "b");
  },
  compute: function (value: PrimitiveArgValue): number {
    return toNumber(value);
  },
};
