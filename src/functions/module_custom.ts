import { arg } from "@odoo/o-spreadsheet-engine/functions/arguments";
import { toNumber } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { formatLargeNumber } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import {
  AddFunctionDescription,
  FunctionResultNumber,
  FunctionResultObject,
  Maybe,
} from "../types";

// -----------------------------------------------------------------------------
// FORMAT.LARGE.NUMBER
// -----------------------------------------------------------------------------

export const FORMAT_LARGE_NUMBER = {
  description: _t("Apply a large number format"),
  args: [
    arg("value (number)", _t("The number.")),
    arg(
      "unit (string, optional)",
      _t("The formatting unit. Use 'k', 'm', or 'b' to force the unit"),
      [
        { value: "k", label: _t("Thousand") },
        { value: "m", label: _t("Million") },
        { value: "b", label: _t("Billion") },
      ]
    ),
  ],
  compute: function (
    value: Maybe<FunctionResultObject>,
    unite: Maybe<FunctionResultObject>
  ): FunctionResultNumber {
    return {
      value: toNumber(value, this.locale),
      format: formatLargeNumber(value, unite, this.locale),
    };
  },
} satisfies AddFunctionDescription;
