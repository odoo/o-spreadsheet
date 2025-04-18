import { _t } from "../translation";
import { AddFunctionDescription, FunctionResultObject, Maybe } from "../types";
import { arg } from "./arguments";
import { assert } from "./helper_assert";
import { getTransformation, getTranslatedCategory } from "./helper_parser";
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
    value: Maybe<FunctionResultObject>,
    startUnit: Maybe<FunctionResultObject>,
    endUnit: Maybe<FunctionResultObject>
  ): FunctionResultObject {
    const _value = toNumber(value, this.locale);
    const _startUnit = toString(startUnit);
    const _endUnit = toString(endUnit);
    const startConversion = getTransformation(_startUnit);
    const endConversion = getTransformation(_endUnit);
    assert(startConversion !== undefined, _t("Invalid units of measure ('%s')", _startUnit));
    assert(endConversion !== undefined, _t("Invalid units of measure ('%s')", _endUnit));
    assert(
      startConversion.category === endConversion.category,
      _t(
        "Incompatible units of measure ('%s' vs '%s')",
        getTranslatedCategory(startConversion.category),
        getTranslatedCategory(endConversion.category)
      )
    );
    return {
      value:
        endConversion.inverseTransform(startConversion.factor * startConversion.transform(_value)) /
        endConversion.factor,
      format: value?.format,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;
