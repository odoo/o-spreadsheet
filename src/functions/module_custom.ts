import { createLargeNumberFormat } from "../helpers";
import { _t } from "../translation";
import { AddFunctionDescription, FPayload, FPayloadNumber, Locale, Maybe } from "../types";
import { EvaluationError } from "../types/errors";
import { arg } from "./arguments";
import { toNumber } from "./helpers";

// -----------------------------------------------------------------------------
// FORMAT.LARGE.NUMBER
// -----------------------------------------------------------------------------

function formatLargeNumber(arg: Maybe<FPayload>, unit: Maybe<FPayload>, locale: Locale): string {
  const value = Math.abs(toNumber(arg?.value, locale));
  const format = arg?.format;
  if (unit !== undefined) {
    const postFix = unit?.value;
    switch (postFix) {
      case "k":
        return createLargeNumberFormat(format, 1e3, "k", locale);
      case "m":
        return createLargeNumberFormat(format, 1e6, "m", locale);
      case "b":
        return createLargeNumberFormat(format, 1e9, "b", locale);
      default:
        throw new EvaluationError(_t("The formatting unit should be 'k', 'm' or 'b'."));
    }
  }
  if (value < 1e5) {
    return createLargeNumberFormat(format, 0, "", locale);
  } else if (value < 1e8) {
    return createLargeNumberFormat(format, 1e3, "k", locale);
  } else if (value < 1e11) {
    return createLargeNumberFormat(format, 1e6, "m", locale);
  }
  return createLargeNumberFormat(format, 1e9, "b", locale);
}

export const FORMAT_LARGE_NUMBER = {
  description: _t("Apply a large number format"),
  args: [
    arg("value (number)", _t("The number.")),
    arg(
      "unit (string, optional)",
      _t("The formatting unit. Use 'k', 'm', or 'b' to force the unit")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (value: Maybe<FPayload>, unite: Maybe<FPayload>): FPayloadNumber {
    return {
      value: toNumber(value, this.locale),
      format: formatLargeNumber(value, unite, this.locale),
    };
  },
} satisfies AddFunctionDescription;
