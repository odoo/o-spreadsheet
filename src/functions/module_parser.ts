import { _t } from "../translation";
import { AddFunctionDescription, FPayload, Maybe } from "../types";
import { CellErrorType } from "../types/errors";
import { arg } from "./arguments";
import { getTransformation } from "./helper_parser";
import { toNumber, toString } from "./helpers";

// -----------------------------------------------------------------------------
// CONVERT
// -----------------------------------------------------------------------------
export const CONVERT = {
  description: _t("Converts a numeric value to a different unit of measure."),
  args: [
    arg("value (number)", _t("the numeric value in start_unit to convert to end_unit")),
    arg("start_unit (string)", _t("The starting unit, the unit currently assigned to value")),
    arg("end_unit (string)", _t("The unit of measure into which to convert value")),
  ],
  compute: function (
    value: Maybe<FPayload>,
    start_unit: Maybe<FPayload>,
    end_unit: Maybe<FPayload>
  ): FPayload {
    const _value = toNumber(value, this.locale);
    const _start_unit = toString(start_unit);
    const _end_unit = toString(end_unit);
    const start_conversion = getTransformation(_start_unit);
    const end_conversion = getTransformation(_end_unit);
    if (!start_conversion) {
      return {
        value: CellErrorType.GenericError,
        message: _t("Invalid units of measure ('%s')", _start_unit),
      };
    }
    if (!end_conversion) {
      return {
        value: CellErrorType.GenericError,
        message: _t("Invalid units of measure ('%s')", _end_unit),
      };
    }
    if (start_conversion.category !== end_conversion.category) {
      return {
        value: CellErrorType.GenericError,
        message: _t(
          "Incompatible units of measure ('%s' vs '%s')",
          start_conversion.category,
          end_conversion.category
        ),
      };
    }
    return {
      value:
        end_conversion.inverseTransform(
          start_conversion.factor * start_conversion.transform(_value)
        ) / end_conversion.factor,
      format: value?.format || end_unit?.format || start_unit?.format,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;
