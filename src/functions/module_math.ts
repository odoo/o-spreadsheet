import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  ArgValue,
  CellValue,
  isMatrix,
  Matrix,
  Maybe,
  ValueAndFormat,
} from "../types";
import { arg } from "./arguments";
import { assertPositive } from "./helper_assert";
import { getUnitMatrix } from "./helper_matrices";
import {
  assert,
  reduceAny,
  reduceNumbers,
  strictToNumber,
  toBoolean,
  toInteger,
  toNumber,
  toString,
  visitMatchingRanges,
} from "./helpers";

const DEFAULT_FACTOR = 1;
const DEFAULT_MODE = 0;
const DEFAULT_PLACES = 0;
const DEFAULT_SIGNIFICANCE = 1;

const DECIMAL_REPRESENTATION = /^-?[a-z0-9]+$/i;

// -----------------------------------------------------------------------------
// ABS
// -----------------------------------------------------------------------------
export const ABS = {
  description: _t("Absolute value of a number."),
  args: [arg("value (number)", _t("The number of which to return the absolute value."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return Math.abs(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ACOS
// -----------------------------------------------------------------------------
export const ACOS = {
  description: _t("Inverse cosine of a value, in radians."),
  args: [
    arg(
      "value (number)",
      _t(
        "The value for which to calculate the inverse cosine. Must be between -1 and 1, inclusive."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    assert(
      () => Math.abs(_value) <= 1,
      _t("The value (%s) must be between -1 and 1 inclusive.", _value.toString())
    );
    return Math.acos(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ACOSH
// -----------------------------------------------------------------------------
export const ACOSH = {
  description: _t("Inverse hyperbolic cosine of a number."),
  args: [
    arg(
      "value (number)",
      _t(
        "The value for which to calculate the inverse hyperbolic cosine. Must be greater than or equal to 1."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    assert(
      () => _value >= 1,
      _t("The value (%s) must be greater than or equal to 1.", _value.toString())
    );
    return Math.acosh(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ACOT
// -----------------------------------------------------------------------------
export const ACOT = {
  description: _t("Inverse cotangent of a value."),
  args: [arg("value (number)", _t("The value for which to calculate the inverse cotangent."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    const sign = Math.sign(_value) || 1;
    // ACOT has two possible configurations:
    // @compatibility Excel: return Math.PI / 2 - Math.atan(toNumber(_value, this.locale));
    // @compatibility Google: return sign * Math.PI / 2 - Math.atan(toNumber(_value, this.locale));
    return (sign * Math.PI) / 2 - Math.atan(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ACOTH
// -----------------------------------------------------------------------------
export const ACOTH = {
  description: _t("Inverse hyperbolic cotangent of a value."),
  args: [
    arg(
      "value (number)",
      _t(
        "The value for which to calculate the inverse hyperbolic cotangent. Must not be between -1 and 1, inclusive."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    assert(
      () => Math.abs(_value) > 1,
      _t("The value (%s) cannot be between -1 and 1 inclusive.", _value.toString())
    );
    return Math.log((_value + 1) / (_value - 1)) / 2;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ASIN
// -----------------------------------------------------------------------------
export const ASIN = {
  description: _t("Inverse sine of a value, in radians."),
  args: [
    arg(
      "value (number)",
      _t("The value for which to calculate the inverse sine. Must be between -1 and 1, inclusive.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    assert(
      () => Math.abs(_value) <= 1,
      _t("The value (%s) must be between -1 and 1 inclusive.", _value.toString())
    );
    return Math.asin(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ASINH
// -----------------------------------------------------------------------------
export const ASINH = {
  description: _t("Inverse hyperbolic sine of a number."),
  args: [
    arg("value (number)", _t("The value for which to calculate the inverse hyperbolic sine.")),
  ],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return Math.asinh(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ATAN
// -----------------------------------------------------------------------------
export const ATAN = {
  description: _t("Inverse tangent of a value, in radians."),
  args: [arg("value (number)", _t("The value for which to calculate the inverse tangent."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return Math.atan(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ATAN2
// -----------------------------------------------------------------------------
export const ATAN2 = {
  description: _t("Angle from the X axis to a point (x,y), in radians."),
  args: [
    arg(
      "x (number)",
      _t(
        "The x coordinate of the endpoint of the line segment for which to calculate the angle from the x-axis."
      )
    ),
    arg(
      "y (number)",
      _t(
        "The y coordinate of the endpoint of the line segment for which to calculate the angle from the x-axis."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (x: Maybe<CellValue>, y: Maybe<CellValue>): number {
    const _x = toNumber(x, this.locale);
    const _y = toNumber(y, this.locale);
    assert(
      () => _x !== 0 || _y !== 0,
      _t("Function [[FUNCTION_NAME]] caused a divide by zero error.")
    );
    return Math.atan2(_y, _x);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ATANH
// -----------------------------------------------------------------------------
export const ATANH = {
  description: _t("Inverse hyperbolic tangent of a number."),
  args: [
    arg(
      "value (number)",
      _t(
        "The value for which to calculate the inverse hyperbolic tangent. Must be between -1 and 1, exclusive."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    assert(
      () => Math.abs(_value) < 1,
      _t("The value (%s) must be between -1 and 1 exclusive.", _value.toString())
    );
    return Math.atanh(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CEILING
// -----------------------------------------------------------------------------
export const CEILING = {
  description: _t("Rounds number up to nearest multiple of factor."),
  args: [
    arg("value (number)", _t("The value to round up to the nearest integer multiple of factor.")),
    arg(
      `factor (number, default=${DEFAULT_FACTOR})`,
      _t("The number to whose multiples value will be rounded.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value: Maybe<ValueAndFormat>) => value?.format,
  compute: function (value: Maybe<CellValue>, factor: Maybe<CellValue> = DEFAULT_FACTOR): number {
    const _value = toNumber(value, this.locale);
    const _factor = toNumber(factor, this.locale);
    assert(
      () => _factor >= 0 || _value <= 0,
      _t(
        "The factor (%s) must be positive when the value (%s) is positive.",
        _factor.toString(),
        _value.toString()
      )
    );
    return _factor ? Math.ceil(_value / _factor) * _factor : 0;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CEILING.MATH
// -----------------------------------------------------------------------------
export const CEILING_MATH = {
  description: _t("Rounds number up to nearest multiple of factor."),
  args: [
    arg(
      "number (number)",
      _t("The value to round up to the nearest integer multiple of significance.")
    ),
    arg(
      `significance (number, default=${DEFAULT_SIGNIFICANCE})`,
      _t(
        "The number to whose multiples number will be rounded. The sign of significance will be ignored."
      )
    ),
    arg(
      `mode (number, default=${DEFAULT_MODE})`,
      _t(
        "If number is negative, specifies the rounding direction. If 0 or blank, it is rounded towards zero. Otherwise, it is rounded away from zero."
      )
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (number: Maybe<ValueAndFormat>) => number?.format,
  compute: function (
    number: Maybe<CellValue>,
    significance: Maybe<CellValue> = DEFAULT_SIGNIFICANCE,
    mode: Maybe<CellValue> = DEFAULT_MODE
  ): number {
    let _significance = toNumber(significance, this.locale);
    if (_significance === 0) {
      return 0;
    }

    const _number = toNumber(number, this.locale);
    _significance = Math.abs(_significance);
    if (_number >= 0) {
      return Math.ceil(_number / _significance) * _significance;
    }

    const _mode = toNumber(mode, this.locale);
    if (_mode === 0) {
      return -Math.floor(Math.abs(_number) / _significance) * _significance;
    }

    return -Math.ceil(Math.abs(_number) / _significance) * _significance;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CEILING.PRECISE
// -----------------------------------------------------------------------------
export const CEILING_PRECISE = {
  description: _t("Rounds number up to nearest multiple of factor."),
  args: [
    arg(
      "number (number)",
      _t("The value to round up to the nearest integer multiple of significance.")
    ),
    arg(
      `significance (number, default=${DEFAULT_SIGNIFICANCE})`,
      _t("The number to whose multiples number will be rounded.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (number: Maybe<ValueAndFormat>) => number?.format,
  compute: function (number: Maybe<CellValue>, significance: Maybe<CellValue>): number {
    return CEILING_MATH.compute.bind(this)(number, significance, 0);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COS
// -----------------------------------------------------------------------------
export const COS = {
  description: _t("Cosine of an angle provided in radians."),
  args: [arg("angle (number)", _t("The angle to find the cosine of, in radians."))],
  returns: ["NUMBER"],
  compute: function (angle: Maybe<CellValue>): number {
    return Math.cos(toNumber(angle, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COSH
// -----------------------------------------------------------------------------
export const COSH = {
  description: _t("Hyperbolic cosine of any real number."),
  args: [arg("value (number)", _t("Any real value to calculate the hyperbolic cosine of."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return Math.cosh(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COT
// -----------------------------------------------------------------------------
export const COT = {
  description: _t("Cotangent of an angle provided in radians."),
  args: [arg("angle (number)", _t("The angle to find the cotangent of, in radians."))],
  returns: ["NUMBER"],
  compute: function (angle: Maybe<CellValue>): number {
    const _angle = toNumber(angle, this.locale);
    assert(
      () => _angle !== 0,
      _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
    );
    return 1 / Math.tan(_angle);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COTH
// -----------------------------------------------------------------------------
export const COTH = {
  description: _t("Hyperbolic cotangent of any real number."),
  args: [arg("value (number)", _t("Any real value to calculate the hyperbolic cotangent of."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    assert(
      () => _value !== 0,
      _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
    );
    return 1 / Math.tanh(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUNTBLANK
// -----------------------------------------------------------------------------
export const COUNTBLANK = {
  description: _t("Number of empty values."),
  args: [
    arg(
      "value1 (any, range)",
      _t("The first value or range in which to count the number of blanks.")
    ),
    arg(
      "value2 (any, range, repeating)",
      _t("Additional values or ranges in which to count the number of blanks.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...argsValues: ArgValue[]): number {
    return reduceAny(
      argsValues,
      (acc, a) => (a === null || a === undefined || a === "" ? acc + 1 : acc),
      0
    );
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUNTIF
// -----------------------------------------------------------------------------
export const COUNTIF = {
  description: _t("A conditional count across a range."),
  args: [
    arg("range (range)", _t("The range that is tested against criterion.")),
    arg("criterion (string)", _t("The pattern or test to apply to range.")),
  ],
  returns: ["NUMBER"],
  compute: function (...argsValues: ArgValue[]): number {
    let count = 0;
    visitMatchingRanges(
      argsValues,
      (i, j) => {
        count += 1;
      },
      this.locale
    );
    return count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUNTIFS
// -----------------------------------------------------------------------------
export const COUNTIFS = {
  description: _t("Count values depending on multiple criteria."),
  args: [
    arg("criteria_range1 (range)", _t("The range to check against criterion1.")),
    arg("criterion1 (string)", _t("The pattern or test to apply to criteria_range1.")),
    arg(
      "criteria_range2 (any, range, repeating)",
      _t(
        "Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair."
      )
    ),
    arg("criterion2 (string, repeating)", _t("Additional criteria to check.")),
  ],
  returns: ["NUMBER"],
  compute: function (...argsValues: ArgValue[]): number {
    let count = 0;
    visitMatchingRanges(
      argsValues,
      (i, j) => {
        count += 1;
      },
      this.locale
    );
    return count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUNTUNIQUE
// -----------------------------------------------------------------------------

function isDefined(value: any): boolean {
  switch (value) {
    case undefined:
      return false;
    case "":
      return false;
    case null:
      return false;
    default:
      return true;
  }
}

export const COUNTUNIQUE = {
  description: _t("Counts number of unique values in a range."),
  args: [
    arg("value1 (any, range)", _t("The first value or range to consider for uniqueness.")),
    arg(
      "value2 (any, range, repeating)",
      _t("Additional values or ranges to consider for uniqueness.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...argsValues: ArgValue[]): number {
    return reduceAny(argsValues, (acc, a) => (isDefined(a) ? acc.add(a) : acc), new Set()).size;
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUNTUNIQUEIFS
// -----------------------------------------------------------------------------

export const COUNTUNIQUEIFS = {
  description: _t("Counts number of unique values in a range, filtered by a set of criteria."),
  args: [
    arg(
      "range (range)",
      _t("The range of cells from which the number of unique values will be counted.")
    ),
    arg("criteria_range1 (range)", _t("The range of cells over which to evaluate criterion1.")),
    arg(
      "criterion1 (string)",
      _t(
        "The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set."
      )
    ),
    arg(
      "criteria_range2 (any, range, repeating)",
      _t(
        "Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair."
      )
    ),
    arg("criterion2 (string, repeating)", _t("The pattern or test to apply to criteria_range2.")),
  ],
  returns: ["NUMBER"],
  compute: function (range: Matrix<CellValue>, ...argsValues: ArgValue[]): number {
    let uniqueValues = new Set();
    visitMatchingRanges(
      argsValues,
      (i, j) => {
        const value = range[i][j];
        if (isDefined(value)) {
          uniqueValues.add(value);
        }
      },
      this.locale
    );
    return uniqueValues.size;
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CSC
// -----------------------------------------------------------------------------
export const CSC = {
  description: _t("Cosecant of an angle provided in radians."),
  args: [arg("angle (number)", _t("The angle to find the cosecant of, in radians."))],
  returns: ["NUMBER"],
  compute: function (angle: Maybe<CellValue>): number {
    const _angle = toNumber(angle, this.locale);
    assert(
      () => _angle !== 0,
      _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
    );
    return 1 / Math.sin(_angle);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CSCH
// -----------------------------------------------------------------------------
export const CSCH = {
  description: _t("Hyperbolic cosecant of any real number."),
  args: [arg("value (number)", _t("Any real value to calculate the hyperbolic cosecant of."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    assert(
      () => _value !== 0,
      _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
    );
    return 1 / Math.sinh(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DECIMAL
// -----------------------------------------------------------------------------
export const DECIMAL = {
  description: _t("Converts from another base to decimal."),
  args: [
    arg("value (string)", _t("The number to convert.")),
    arg(",base (number)", _t("The base to convert the value from.")),
  ],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>, base: Maybe<CellValue>): number {
    let _base = toNumber(base, this.locale);
    _base = Math.floor(_base);

    assert(
      () => 2 <= _base && _base <= 36,
      _t("The base (%s) must be between 2 and 36 inclusive.", _base.toString())
    );

    const _value = toString(value);
    if (_value === "") {
      return 0;
    }

    /**
     * @compatibility: on Google sheets, expects the parameter 'value' to be positive.
     * Return error if 'value' is positive.
     * Remove '-?' in the next regex to catch this error.
     */
    assert(
      () => !!DECIMAL_REPRESENTATION.test(_value),
      _t("The value (%s) must be a valid base %s representation.", _value, _base.toString())
    );

    const deci = parseInt(_value, _base);
    assert(
      () => !isNaN(deci),
      _t("The value (%s) must be a valid base %s representation.", _value, _base.toString())
    );
    return deci;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DEGREES
// -----------------------------------------------------------------------------
export const DEGREES = {
  description: _t("Converts an angle value in radians to degrees."),
  args: [arg("angle (number)", _t("The angle to convert from radians to degrees."))],
  returns: ["NUMBER"],
  compute: function (angle: Maybe<CellValue>): number {
    return (toNumber(angle, this.locale) * 180) / Math.PI;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EXP
// -----------------------------------------------------------------------------
export const EXP = {
  description: _t("Euler's number, e (~2.718) raised to a power."),
  args: [arg("value (number)", _t("The exponent to raise e."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return Math.exp(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FLOOR
// -----------------------------------------------------------------------------
export const FLOOR = {
  description: _t("Rounds number down to nearest multiple of factor."),
  args: [
    arg("value (number)", _t("The value to round down to the nearest integer multiple of factor.")),
    arg(
      `factor (number, default=${DEFAULT_FACTOR})`,
      _t("The number to whose multiples value will be rounded.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value: Maybe<ValueAndFormat>) => value?.format,
  compute: function (value: Maybe<CellValue>, factor: Maybe<CellValue> = DEFAULT_FACTOR): number {
    const _value = toNumber(value, this.locale);
    const _factor = toNumber(factor, this.locale);
    assert(
      () => _factor >= 0 || _value <= 0,
      _t(
        "The factor (%s) must be positive when the value (%s) is positive.",
        _factor.toString(),
        _value.toString()
      )
    );
    return _factor ? Math.floor(_value / _factor) * _factor : 0;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FLOOR.MATH
// -----------------------------------------------------------------------------
export const FLOOR_MATH = {
  description: _t("Rounds number down to nearest multiple of factor."),
  args: [
    arg(
      "number (number)",
      _t("The value to round down to the nearest integer multiple of significance.")
    ),
    arg(
      `significance (number, default=${DEFAULT_SIGNIFICANCE})`,
      _t(
        "The number to whose multiples number will be rounded. The sign of significance will be ignored."
      )
    ),
    arg(
      `mode (number, default=${DEFAULT_MODE})`,
      _t(
        "If number is negative, specifies the rounding direction. If 0 or blank, it is rounded away from zero. Otherwise, it is rounded towards zero."
      )
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (number: Maybe<ValueAndFormat>) => number?.format,
  compute: function (
    number: Maybe<CellValue>,
    significance: Maybe<CellValue> = DEFAULT_SIGNIFICANCE,
    mode: Maybe<CellValue> = DEFAULT_MODE
  ): number {
    let _significance = toNumber(significance, this.locale);
    if (_significance === 0) {
      return 0;
    }

    const _number = toNumber(number, this.locale);
    _significance = Math.abs(_significance);
    if (_number >= 0) {
      return Math.floor(_number / _significance) * _significance;
    }

    const _mode = toNumber(mode, this.locale);
    if (_mode === 0) {
      return -Math.ceil(Math.abs(_number) / _significance) * _significance;
    }
    return -Math.floor(Math.abs(_number) / _significance) * _significance;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FLOOR.PRECISE
// -----------------------------------------------------------------------------
export const FLOOR_PRECISE = {
  description: _t("Rounds number down to nearest multiple of factor."),
  args: [
    arg(
      "number (number)",
      _t("The value to round down to the nearest integer multiple of significance.")
    ),
    arg(
      `significance (number, default=${DEFAULT_SIGNIFICANCE})`,
      _t("The number to whose multiples number will be rounded.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (number: Maybe<ValueAndFormat>) => number?.format,
  compute: function (
    number: Maybe<CellValue>,
    significance: Maybe<CellValue> = DEFAULT_SIGNIFICANCE
  ): number {
    return FLOOR_MATH.compute.bind(this)(number, significance, 0);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISEVEN
// -----------------------------------------------------------------------------
export const ISEVEN = {
  description: _t("Whether the provided value is even."),
  args: [arg("value (number)", _t("The value to be verified as even."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    const _value = strictToNumber(value, this.locale);

    return Math.floor(Math.abs(_value)) & 1 ? false : true;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISO.CEILING
// -----------------------------------------------------------------------------
export const ISO_CEILING = {
  description: _t("Rounds number up to nearest multiple of factor."),
  args: [
    arg(
      "number (number)",
      _t("The value to round up to the nearest integer multiple of significance.")
    ),
    arg(
      `significance (number, default=${DEFAULT_SIGNIFICANCE})`,
      _t("The number to whose multiples number will be rounded.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (number: Maybe<ValueAndFormat>) => number?.format,
  compute: function (
    number: Maybe<CellValue>,
    significance: Maybe<CellValue> = DEFAULT_SIGNIFICANCE
  ): number {
    return CEILING_MATH.compute.bind(this)(number, significance, 0);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISODD
// -----------------------------------------------------------------------------
export const ISODD = {
  description: _t("Whether the provided value is even."),
  args: [arg("value (number)", _t("The value to be verified as even."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    const _value = strictToNumber(value, this.locale);

    return Math.floor(Math.abs(_value)) & 1 ? true : false;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// LN
// -----------------------------------------------------------------------------
export const LN = {
  description: _t("The logarithm of a number, base e (euler's number)."),
  args: [arg("value (number)", _t("The value for which to calculate the logarithm, base e."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    assert(() => _value > 0, _t("The value (%s) must be strictly positive.", _value.toString()));
    return Math.log(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MOD
// -----------------------------------------------------------------------------
export const MOD = {
  description: _t("Modulo (remainder) operator."),
  args: [
    arg("dividend (number)", _t("The number to be divided to find the remainder.")),
    arg("divisor (number)", _t("The number to divide by.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (dividend: Maybe<ValueAndFormat>) => dividend?.format,
  compute: function (dividend: Maybe<CellValue>, divisor: Maybe<CellValue>): number {
    const _divisor = toNumber(divisor, this.locale);

    assert(() => _divisor !== 0, _t("The divisor must be different from 0."));

    const _dividend = toNumber(dividend, this.locale);
    const modulus = _dividend % _divisor;
    // -42 % 10 = -2 but we want 8, so need the code below
    if ((modulus > 0 && _divisor < 0) || (modulus < 0 && _divisor > 0)) {
      return modulus + _divisor;
    }
    return modulus;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MUNIT
// -----------------------------------------------------------------------------
export const MUNIT = {
  description: _t("Returns a n x n unit matrix, where n is the input dimension."),
  args: [
    arg(
      "dimension (number)",
      _t("An integer specifying the dimension size of the unit matrix. It must be positive.")
    ),
  ],
  returns: ["RANGE<NUMBER>"],
  compute: function (n: Maybe<CellValue>): Matrix<number> {
    const _n = toInteger(n, this.locale);
    assertPositive(_t("The argument dimension must be positive"), _n);
    return getUnitMatrix(_n);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ODD
// -----------------------------------------------------------------------------
export const ODD = {
  description: _t("Rounds a number up to the nearest odd integer."),
  args: [arg("value (number)", _t("The value to round to the next greatest odd number."))],
  returns: ["NUMBER"],
  computeFormat: (number: Maybe<ValueAndFormat>) => number?.format,
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);

    let temp = Math.ceil(Math.abs(_value));
    temp = temp & 1 ? temp : temp + 1;
    return _value < 0 ? -temp : temp;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PI
// -----------------------------------------------------------------------------
export const PI = {
  description: _t("The number pi."),
  args: [],
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.PI;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// POWER
// -----------------------------------------------------------------------------
export const POWER = {
  description: _t("A number raised to a power."),
  args: [
    arg("base (number)", _t("The number to raise to the exponent power.")),
    arg("exponent (number)", _t("The exponent to raise base to.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (base: Maybe<ValueAndFormat>) => base?.format,
  compute: function (base: Maybe<CellValue>, exponent: Maybe<CellValue>): number {
    const _base = toNumber(base, this.locale);
    const _exponent = toNumber(exponent, this.locale);
    assert(
      () => _base >= 0 || Number.isInteger(_exponent),
      _t("The exponent (%s) must be an integer when the base is negative.", _exponent.toString())
    );
    return Math.pow(_base, _exponent);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PRODUCT
// -----------------------------------------------------------------------------
export const PRODUCT = {
  description: _t("Result of multiplying a series of numbers together."),
  args: [
    arg(
      "factor1 (number, range<number>)",
      _t("The first number or range to calculate for the product.")
    ),
    arg(
      "factor2 (number, range<number>, repeating)",
      _t("More numbers or ranges to calculate for the product.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (factor1: Arg) => {
    return isMatrix(factor1) ? factor1[0][0]?.format : factor1?.format;
  },
  compute: function (...factors: ArgValue[]): number {
    let count = 0;
    let acc = 1;
    for (let n of factors) {
      if (isMatrix(n)) {
        for (let i of n) {
          for (let j of i) {
            if (typeof j === "number") {
              acc *= j;
              count += 1;
            }
          }
        }
      } else if (n !== null && n !== undefined) {
        acc *= strictToNumber(n, this.locale);
        count += 1;
      }
    }
    if (count === 0) {
      return 0;
    }
    return acc;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// RAND
// -----------------------------------------------------------------------------
export const RAND = {
  description: _t("A random number between 0 inclusive and 1 exclusive."),
  args: [],
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.random();
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// RANDARRAY
// -----------------------------------------------------------------------------
export const RANDARRAY = {
  description: _t("Returns a grid of random numbers between 0 inclusive and 1 exclusive."),
  args: [
    arg("rows (number, default=1)", _t("The number of rows to be returned.")),
    arg("columns (number, default=1)", _t("The number of columns to be returned.")),
    arg("min (number, default=0)", _t("The minimum number you would like returned.")),
    arg("max (number, default=1)", _t("The maximum number you would like returned.")),
    arg("whole_number (number, default=FALSE)", _t("Return a whole number or a decimal value.")),
  ],
  returns: ["RANGE<NUMBER>"],
  compute: function (
    rows: Maybe<CellValue> = 1,
    columns: Maybe<CellValue> = 1,
    min: Maybe<CellValue> = 0,
    max: Maybe<CellValue> = 1,
    whole_number: Maybe<CellValue> = false
  ): Matrix<number> {
    const _cols = toInteger(columns, this.locale);
    const _rows = toInteger(rows, this.locale);
    const _min = toNumber(min, this.locale);
    const _max = toNumber(max, this.locale);
    const _whole_number = toBoolean(whole_number);

    assertPositive(_t("The number columns (%s) must be positive.", _cols.toString()), _cols);
    assertPositive(_t("The number rows (%s) must be positive.", _rows.toString()), _rows);
    assert(
      () => _min <= _max,
      _t(
        "The maximum (%s) must be greater than or equal to the minimum (%s).",
        _max.toString(),
        _min.toString()
      )
    );
    if (_whole_number) {
      assert(
        () => Number.isInteger(_min) && Number.isInteger(_max),
        _t(
          "The maximum (%s) and minimum (%s) must be integers when whole_number is TRUE.",
          _max.toString(),
          _min.toString()
        )
      );
    }

    const result: number[][] = Array(_cols);
    for (let col = 0; col < _cols; col++) {
      result[col] = Array(_rows);
      for (let row = 0; row < _rows; row++) {
        if (!_whole_number) {
          result[col][row] = _min + Math.random() * (_max - _min);
        } else {
          result[col][row] = Math.floor(Math.random() * (_max - _min + 1) + _min);
        }
      }
    }
    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// RANDBETWEEN
// -----------------------------------------------------------------------------
export const RANDBETWEEN = {
  description: _t("Random integer between two values, inclusive."),
  args: [
    arg("low (number)", _t("The low end of the random range.")),
    arg("high (number)", _t("The high end of the random range.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (low: Maybe<ValueAndFormat>) => low?.format,
  compute: function (low: Maybe<CellValue>, high: Maybe<CellValue>): number {
    let _low = toNumber(low, this.locale);
    if (!Number.isInteger(_low)) {
      _low = Math.ceil(_low);
    }

    let _high = toNumber(high, this.locale);
    if (!Number.isInteger(_high)) {
      _high = Math.floor(_high);
    }

    assert(
      () => _low <= _high,
      _t(
        "The high (%s) must be greater than or equal to the low (%s).",
        _high.toString(),
        _low.toString()
      )
    );
    return _low + Math.ceil((_high - _low + 1) * Math.random()) - 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ROUND
// -----------------------------------------------------------------------------
export const ROUND = {
  description: _t("Rounds a number according to standard rules."),
  args: [
    arg("value (number)", _t("The value to round to places number of places.")),
    arg(
      `places (number, default=${DEFAULT_PLACES})`,
      _t("The number of decimal places to which to round.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value: Maybe<ValueAndFormat>) => value?.format,
  compute: function (value: Maybe<CellValue>, places: Maybe<CellValue> = DEFAULT_PLACES): number {
    const _value = toNumber(value, this.locale);
    let _places = toNumber(places, this.locale);

    const absValue = Math.abs(_value);
    let tempResult;
    if (_places === 0) {
      tempResult = Math.round(absValue);
    } else {
      if (!Number.isInteger(_places)) {
        _places = Math.trunc(_places);
      }
      tempResult = Math.round(absValue * Math.pow(10, _places)) / Math.pow(10, _places);
    }
    return _value >= 0 ? tempResult : -tempResult;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ROUNDDOWN
// -----------------------------------------------------------------------------
export const ROUNDDOWN = {
  description: _t("Rounds down a number."),
  args: [
    arg(
      "value (number)",
      _t("The value to round to places number of places, always rounding down.")
    ),
    arg(
      `places (number, default=${DEFAULT_PLACES})`,
      _t("The number of decimal places to which to round.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value: Maybe<ValueAndFormat>) => value?.format,
  compute: function (value: Maybe<CellValue>, places: Maybe<CellValue> = DEFAULT_PLACES): number {
    const _value = toNumber(value, this.locale);
    let _places = toNumber(places, this.locale);

    const absValue = Math.abs(_value);
    let tempResult;
    if (_places === 0) {
      tempResult = Math.floor(absValue);
    } else {
      if (!Number.isInteger(_places)) {
        _places = Math.trunc(_places);
      }
      tempResult = Math.floor(absValue * Math.pow(10, _places)) / Math.pow(10, _places);
    }
    return _value >= 0 ? tempResult : -tempResult;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ROUNDUP
// -----------------------------------------------------------------------------
export const ROUNDUP = {
  description: _t("Rounds up a number."),
  args: [
    arg("value (number)", _t("The value to round to places number of places, always rounding up.")),
    arg(
      `places (number, default=${DEFAULT_PLACES})`,
      _t("The number of decimal places to which to round.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value: Maybe<ValueAndFormat>) => value?.format,
  compute: function (value: Maybe<CellValue>, places: Maybe<CellValue> = DEFAULT_PLACES): number {
    const _value = toNumber(value, this.locale);
    let _places = toNumber(places, this.locale);

    const absValue = Math.abs(_value);
    let tempResult;
    if (_places === 0) {
      tempResult = Math.ceil(absValue);
    } else {
      if (!Number.isInteger(_places)) {
        _places = Math.trunc(_places);
      }
      tempResult = Math.ceil(absValue * Math.pow(10, _places)) / Math.pow(10, _places);
    }
    return _value >= 0 ? tempResult : -tempResult;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SEC
// -----------------------------------------------------------------------------
export const SEC = {
  description: _t("Secant of an angle provided in radians."),
  args: [arg("angle (number)", _t("The angle to find the secant of, in radians."))],
  returns: ["NUMBER"],
  compute: function (angle: Maybe<CellValue>): number {
    return 1 / Math.cos(toNumber(angle, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SECH
// -----------------------------------------------------------------------------
export const SECH = {
  description: _t("Hyperbolic secant of any real number."),
  args: [arg("value (number)", _t("Any real value to calculate the hyperbolic secant of."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return 1 / Math.cosh(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SIN
// -----------------------------------------------------------------------------
export const SIN = {
  description: _t("Sine of an angle provided in radians."),
  args: [arg("angle (number)", _t("The angle to find the sine of, in radians."))],
  returns: ["NUMBER"],
  compute: function (angle: Maybe<CellValue>): number {
    return Math.sin(toNumber(angle, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SINH
// -----------------------------------------------------------------------------
export const SINH = {
  description: _t("Hyperbolic sine of any real number."),
  args: [arg("value (number)", _t("Any real value to calculate the hyperbolic sine of."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return Math.sinh(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SQRT
// -----------------------------------------------------------------------------
export const SQRT = {
  description: _t("Positive square root of a positive number."),
  args: [arg("value (number)", _t("The number for which to calculate the positive square root."))],
  returns: ["NUMBER"],
  computeFormat: (value: Maybe<ValueAndFormat>) => value?.format,
  compute: function (value: Maybe<CellValue>): number {
    const _value = toNumber(value, this.locale);
    assert(() => _value >= 0, _t("The value (%s) must be positive or null.", _value.toString()));
    return Math.sqrt(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUM
// -----------------------------------------------------------------------------
export const SUM = {
  description: _t("Sum of a series of numbers and/or cells."),
  args: [
    arg("value1 (number, range<number>)", _t("The first number or range to add together.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional numbers or ranges to add to value1.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Arg) => {
    return isMatrix(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    return reduceNumbers(values, (acc, a) => acc + a, 0, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUMIF
// -----------------------------------------------------------------------------
export const SUMIF = {
  description: _t("A conditional sum across a range."),
  args: [
    arg("criteria_range (range)", _t("The range which is tested against criterion.")),
    arg("criterion (string)", _t("The pattern or test to apply to range.")),
    arg(
      "sum_range (range, default=criteria_range)",
      _t("The range to be summed, if different from range.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    criteriaRange: ArgValue,
    criterion: Maybe<CellValue>,
    sumRange: ArgValue
  ): number {
    if (sumRange === undefined) {
      sumRange = criteriaRange;
    }

    let sum = 0;
    visitMatchingRanges(
      [criteriaRange, criterion],
      (i, j) => {
        const value = sumRange![i][j];
        if (typeof value === "number") {
          sum += value;
        }
      },
      this.locale
    );
    return sum;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUMIFS
// -----------------------------------------------------------------------------
export const SUMIFS = {
  description: _t("Sums a range depending on multiple criteria."),
  args: [
    arg("sum_range (range)", _t("The range to sum.")),
    arg("criteria_range1 (range)", _t("The range to check against criterion1.")),
    arg("criterion1 (string)", _t("The pattern or test to apply to criteria_range1.")),
    arg("criteria_range2 (any, range, repeating)", _t("Additional ranges to check.")),
    arg("criterion2 (string, repeating)", _t("Additional criteria to check.")),
  ],
  returns: ["NUMBER"],
  compute: function (sumRange: Matrix<CellValue>, ...criters: ArgValue[]): number {
    let sum = 0;
    visitMatchingRanges(
      criters,
      (i, j) => {
        const value = sumRange[i][j];
        if (typeof value === "number") {
          sum += value;
        }
      },
      this.locale
    );
    return sum;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TAN
// -----------------------------------------------------------------------------
export const TAN = {
  description: _t("Tangent of an angle provided in radians."),
  args: [arg("angle (number)", _t("The angle to find the tangent of, in radians."))],
  returns: ["NUMBER"],
  compute: function (angle: Maybe<CellValue>): number {
    return Math.tan(toNumber(angle, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TANH
// -----------------------------------------------------------------------------
export const TANH = {
  description: _t("Hyperbolic tangent of any real number."),
  args: [arg("value (number)", _t("Any real value to calculate the hyperbolic tangent of."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return Math.tanh(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TRUNC
// -----------------------------------------------------------------------------
export const TRUNC = {
  description: _t("Truncates a number."),
  args: [
    arg("value (number)", _t("The value to be truncated.")),
    arg(
      `places (number, default=${DEFAULT_PLACES})`,
      _t("The number of significant digits to the right of the decimal point to retain.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value: Maybe<ValueAndFormat>) => value?.format,
  compute: function (value: Maybe<CellValue>, places: Maybe<CellValue> = DEFAULT_PLACES): number {
    const _value = toNumber(value, this.locale);
    let _places = toNumber(places, this.locale);

    if (_places === 0) {
      return Math.trunc(_value);
    }
    if (!Number.isInteger(_places)) {
      _places = Math.trunc(_places);
    }
    return Math.trunc(_value * Math.pow(10, _places)) / Math.pow(10, _places);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// INT
// -----------------------------------------------------------------------------
export const INT = {
  description: _t("Rounds a number down to the nearest integer that is less than or equal to it."),
  args: [arg("value (number)", _t("The number to round down to the nearest integer."))],
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return Math.floor(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;
