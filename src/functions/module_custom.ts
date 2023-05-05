import { createLargeNumberFormat } from "../helpers";
import { _lt } from "../translation";
import { AddFunctionDescription, PrimitiveArg, PrimitiveArgValue } from "../types";
import { arg } from "./arguments";
import { toNumber } from "./helpers";

// -----------------------------------------------------------------------------
// FORMAT.LARGE.NUMBER
// -----------------------------------------------------------------------------
export const FORMAT_LARGE_NUMBER: AddFunctionDescription = {
  description: _lt(`Apply a large number format`),
  args: [
    arg("value (number)", _lt("The number.")),
    arg(
      "unit (string, optional)",
      _lt("The formatting unit. Use 'k', 'm', or 'b' to force the unit")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: function (arg: PrimitiveArg, unit: PrimitiveArg | undefined) {
    const value = Math.abs(toNumber(arg.value, this.locale));
    const format = arg.format;
    if (unit !== undefined) {
      const postFix = unit?.value;
      switch (postFix) {
        case "k":
          return createLargeNumberFormat(format, 1e3, "k", this.locale);
        case "m":
          return createLargeNumberFormat(format, 1e6, "m", this.locale);
        case "b":
          return createLargeNumberFormat(format, 1e9, "b", this.locale);
        default:
          throw new Error(_lt("The formatting unit should be 'k', 'm' or 'b'."));
      }
    }
    if (value < 1e5) {
      return createLargeNumberFormat(format, 0, "", this.locale);
    } else if (value < 1e8) {
      return createLargeNumberFormat(format, 1e3, "k", this.locale);
    } else if (value < 1e11) {
      return createLargeNumberFormat(format, 1e6, "m", this.locale);
    }
    return createLargeNumberFormat(format, 1e9, "b", this.locale);
  },
  compute: function (value: PrimitiveArgValue): number {
    return toNumber(value, this.locale);
  },
};
