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
      unit (string, optional) ${_lt("The formatting unit. Use 'k', 'm', or 'b' to force the unit")}
    `),
  returns: ["NUMBER"],
  computeFormat: (arg: PrimitiveArg, unit: PrimitiveArg | undefined) => {
    const value = Math.abs(toNumber(arg.value));
    const format = arg.format;
    if (unit !== undefined) {
      const postFix = unit?.value;
      switch (postFix) {
        case "k":
          return createLargeNumberFormat(format, 1e3, "k");
        case "m":
          return createLargeNumberFormat(format, 1e6, "m");
        case "b":
          return createLargeNumberFormat(format, 1e9, "b");
        default:
          throw new Error(_lt("The formatting unit should be 'k', 'm' or 'b'."));
      }
    }
    if (value < 1e5) {
      return createLargeNumberFormat(format, 0, "");
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
