import { formatLargeNumber } from "../helpers";
import { _t } from "../translation";
import { AddFunctionDescription, FPayload, FPayloadNumber, Maybe } from "../types";
import { arg } from "./arguments";
import { toNumber } from "./helpers";

// -----------------------------------------------------------------------------
// FORMAT.LARGE.NUMBER
// -----------------------------------------------------------------------------

export const FORMAT_LARGE_NUMBER = {
  description: _t("Apply a large number format"),
  args: [
    arg("value (number)", _t("The number.")),
    arg(
      "unit (string, optional)",
      _t("The formatting unit. Use 'k', 'm', or 'b' to force the unit")
    ),
  ],
  compute: function (value: Maybe<FPayload>, unite: Maybe<FPayload>): FPayloadNumber {
    return {
      value: toNumber(value, this.locale),
      format: formatLargeNumber(value, unite, this.locale),
    };
  },
} satisfies AddFunctionDescription;
