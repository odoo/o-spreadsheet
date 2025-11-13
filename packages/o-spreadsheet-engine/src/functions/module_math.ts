import { doesCellContainFunction, splitReference } from "../helpers";
import { toZone } from "../helpers/zones";
import { _t } from "../translation";
import { EvaluatedCell } from "../types/cells";
import { DivisionByZeroError, EvaluationError } from "../types/errors";
import { AddFunctionDescription } from "../types/functions";
import {
  Arg,
  FunctionResultNumber,
  FunctionResultObject,
  Matrix,
  Maybe,
  isMatrix,
} from "../types/misc";
import { arg } from "./arguments";
import { assertNotZero } from "./helper_assert";
import { countUnique, sum } from "./helper_math";
import { getUnitMatrix } from "./helper_matrices";
import {
  generateMatrix,
  inferFormat,
  isDataNonEmpty,
  isEvaluationError,
  reduceAny,
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
  compute: function (value: Maybe<FunctionResultObject>): number {
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
  compute: function (value: Maybe<FunctionResultObject>) {
    const _value = toNumber(value, this.locale);
    if (Math.abs(_value) > 1) {
      return new EvaluationError(_t("The value (%s) must be between -1 and 1 inclusive.", _value));
    }
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
  compute: function (value: Maybe<FunctionResultObject>) {
    const _value = toNumber(value, this.locale);
    if (_value < 1) {
      return new EvaluationError(_t("The value (%s) must be greater than or equal to 1.", _value));
    }
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
  compute: function (value: Maybe<FunctionResultObject>): number {
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
  compute: function (value: Maybe<FunctionResultObject>) {
    const _value = toNumber(value, this.locale);
    if (Math.abs(_value) <= 1) {
      return new EvaluationError(
        _t("The value (%s) cannot be between -1 and 1 inclusive.", _value)
      );
    }
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
  compute: function (value: Maybe<FunctionResultObject>) {
    const _value = toNumber(value, this.locale);
    if (Math.abs(_value) > 1) {
      return new EvaluationError(_t("The value (%s) must be between -1 and 1 inclusive.", _value));
    }
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
  compute: function (value: Maybe<FunctionResultObject>): number {
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
  compute: function (value: Maybe<FunctionResultObject>): number {
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
  compute: function (x: Maybe<FunctionResultObject>, y: Maybe<FunctionResultObject>) {
    const _x = toNumber(x, this.locale);
    const _y = toNumber(y, this.locale);
    if (_x === 0 && _y === 0) {
      return new DivisionByZeroError(
        _t("Function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
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
  compute: function (value: Maybe<FunctionResultObject>) {
    const _value = toNumber(value, this.locale);
    if (Math.abs(_value) >= 1) {
      return new EvaluationError(_t("The value (%s) must be between -1 and 1 exclusive.", _value));
    }
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
  compute: function (
    value: Maybe<FunctionResultObject>,
    factor: Maybe<FunctionResultObject> = { value: DEFAULT_FACTOR }
  ) {
    const _value = toNumber(value, this.locale);
    const _factor = toNumber(factor, this.locale);

    if (_factor < 0 && _value > 0) {
      return new EvaluationError(
        _t("The factor (%s) must be positive when the value (%s) is positive.", _factor, _value)
      );
    }
    return {
      value: _factor ? Math.ceil(_value / _factor) * _factor : 0,
      format: value?.format,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CEILING.MATH
// -----------------------------------------------------------------------------
function ceilingMath(number: number, significance: number, mode: number = 0): number {
  if (significance === 0) {
    return 0;
  }
  significance = Math.abs(significance);
  if (number >= 0) {
    return Math.ceil(number / significance) * significance;
  }
  if (mode === 0) {
    return -Math.floor(Math.abs(number) / significance) * significance;
  }
  return -Math.ceil(Math.abs(number) / significance) * significance;
}

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
  compute: function (
    number: Maybe<FunctionResultObject>,
    significance: Maybe<FunctionResultObject> = { value: DEFAULT_SIGNIFICANCE },
    mode: Maybe<FunctionResultObject> = { value: DEFAULT_MODE }
  ): FunctionResultNumber {
    const _significance = toNumber(significance, this.locale);
    const _number = toNumber(number, this.locale);
    const _mode = toNumber(mode, this.locale);
    return {
      value: ceilingMath(_number, _significance, _mode),
      format: number?.format,
    };
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
  compute: function (
    number: Maybe<FunctionResultObject>,
    significance: Maybe<FunctionResultObject> = { value: DEFAULT_SIGNIFICANCE }
  ): FunctionResultNumber {
    const _significance = toNumber(significance, this.locale);
    const _number = toNumber(number, this.locale);
    return {
      value: ceilingMath(_number, _significance),
      format: number?.format,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COS
// -----------------------------------------------------------------------------
export const COS = {
  description: _t("Cosine of an angle provided in radians."),
  args: [arg("angle (number)", _t("The angle to find the cosine of, in radians."))],
  compute: function (angle: Maybe<FunctionResultObject>): number {
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
  compute: function (value: Maybe<FunctionResultObject>): number {
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
  compute: function (angle: Maybe<FunctionResultObject>) {
    const _angle = toNumber(angle, this.locale);
    if (_angle === 0) {
      return new DivisionByZeroError(
        _t("Function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
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
  compute: function (value: Maybe<FunctionResultObject>) {
    const _value = toNumber(value, this.locale);
    if (_value === 0) {
      return new DivisionByZeroError(
        _t("Function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
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
      "value (any, range, repeating)",
      _t("Value or range in which to count the number of blanks.")
    ),
  ],
  compute: function (...args: Arg[]): number {
    return reduceAny(
      args,
      (acc, a) => {
        if (a === undefined) {
          return acc + 1;
        }
        if (a.value === null) {
          return acc + 1;
        }
        if (a.value === "") {
          return acc + 1;
        }
        return acc;
      },
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
  compute: function (...args: Arg[]): number {
    let count = 0;
    visitMatchingRanges(
      args,
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
    arg("criteria_range (any, range, repeating)", _t("Range over which to evaluate criteria.")),
    arg("criterion (string, repeating)", _t("Criteria to check.")),
  ],
  compute: function (...args: Arg[]): number {
    let count = 0;
    visitMatchingRanges(
      args,
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

export const COUNTUNIQUE = {
  description: _t("Counts number of unique values in a range."),
  args: [arg("value (any, range, repeating)", _t("Value or range to consider for uniqueness."))],
  compute: function (...args: Arg[]): number {
    return countUnique(args);
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
    arg("criteria_range (any, range, repeating)", _t("Range over which to evaluate criteria.")),
    arg("criterion (string, repeating)", _t("Criteria to check.")),
  ],
  compute: function (range: Matrix<FunctionResultObject>, ...args: Arg[]): number {
    const uniqueValues = new Set();
    visitMatchingRanges(
      args,
      (i, j) => {
        const data = range[i]?.[j];
        if (isDataNonEmpty(data)) {
          uniqueValues.add(data.value);
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
  compute: function (angle: Maybe<FunctionResultObject>) {
    const _angle = toNumber(angle, this.locale);
    if (_angle === 0) {
      return new DivisionByZeroError(
        _t("Function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
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
  compute: function (value: Maybe<FunctionResultObject>) {
    const _value = toNumber(value, this.locale);
    if (_value === 0) {
      return new DivisionByZeroError(
        _t("Function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
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
    arg("base (number)", _t("The base to convert the value from.")),
  ],
  compute: function (value: Maybe<FunctionResultObject>, base: Maybe<FunctionResultObject>) {
    let _base = toNumber(base, this.locale);
    _base = Math.floor(_base);

    if (2 > _base || _base > 36) {
      return new EvaluationError(_t("The base (%s) must be between 2 and 36 inclusive.", _base));
    }

    const _value = toString(value);
    if (_value === "") {
      return 0;
    }

    /**
     * @compatibility: on Google sheets, expects the parameter 'value' to be positive.
     * Return error if 'value' is positive.
     * Remove '-?' in the next regex to catch this error.
     */
    if (!DECIMAL_REPRESENTATION.test(_value)) {
      return new EvaluationError(
        _t("The value (%s) must be a valid base %s representation.", _value, _base)
      );
    }

    const deci = parseInt(_value, _base);
    if (isNaN(deci)) {
      return new EvaluationError(
        _t("The value (%s) must be a valid base %s representation.", _value, _base)
      );
    }
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
  compute: function (angle: Maybe<FunctionResultObject>): number {
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
  compute: function (value: Maybe<FunctionResultObject>): number {
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
  compute: function (
    value: Maybe<FunctionResultObject>,
    factor: Maybe<FunctionResultObject> = { value: DEFAULT_FACTOR }
  ) {
    const _value = toNumber(value, this.locale);
    const _factor = toNumber(factor, this.locale);
    if (_factor < 0 && _value > 0) {
      return new EvaluationError(
        _t("The factor (%s) must be positive when the value (%s) is positive.", _factor, _value)
      );
    }
    return {
      value: _factor ? Math.floor(_value / _factor) * _factor : 0,
      format: value?.format,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FLOOR.MATH
// -----------------------------------------------------------------------------

function floorMath(number: number, significance: number, mode: number = 0): number {
  if (significance === 0) {
    return 0;
  }
  significance = Math.abs(significance);
  if (number >= 0) {
    return Math.floor(number / significance) * significance;
  }
  if (mode === 0) {
    return -Math.ceil(Math.abs(number) / significance) * significance;
  }
  return -Math.floor(Math.abs(number) / significance) * significance;
}

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
  compute: function (
    number: Maybe<FunctionResultObject>,
    significance: Maybe<FunctionResultObject> = { value: DEFAULT_SIGNIFICANCE },
    mode: Maybe<FunctionResultObject> = { value: DEFAULT_MODE }
  ): FunctionResultNumber {
    const _significance = toNumber(significance, this.locale);
    const _number = toNumber(number, this.locale);
    const _mode = toNumber(mode, this.locale);
    return {
      value: floorMath(_number, _significance, _mode),
      format: number?.format,
    };
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
  compute: function (
    number: Maybe<FunctionResultObject>,
    significance: Maybe<FunctionResultObject> = { value: DEFAULT_SIGNIFICANCE }
  ): FunctionResultNumber {
    const _significance = toNumber(significance, this.locale);
    const _number = toNumber(number, this.locale);
    return {
      value: floorMath(_number, _significance),
      format: number?.format,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISEVEN
// -----------------------------------------------------------------------------
export const ISEVEN = {
  description: _t("Whether the provided value is even."),
  args: [arg("value (number)", _t("The value to be verified as even."))],
  compute: function (value: Maybe<FunctionResultObject>): boolean {
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
  compute: function (
    number: Maybe<FunctionResultObject>,
    significance: Maybe<FunctionResultObject> = { value: DEFAULT_SIGNIFICANCE }
  ): FunctionResultNumber {
    const _number = toNumber(number, this.locale);
    const _significance = toNumber(significance, this.locale);
    return {
      value: ceilingMath(_number, _significance),
      format: number?.format,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISODD
// -----------------------------------------------------------------------------
export const ISODD = {
  description: _t("Whether the provided value is even."),
  args: [arg("value (number)", _t("The value to be verified as even."))],
  compute: function (value: Maybe<FunctionResultObject>): boolean {
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
  compute: function (value: Maybe<FunctionResultObject>) {
    const _value = toNumber(value, this.locale);
    if (_value <= 0) {
      return new EvaluationError(_t("The value (%s) must be strictly positive.", _value));
    }
    return Math.log(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// LOG
// -----------------------------------------------------------------------------
export const LOG = {
  description: _t("The logarithm of a number, for a given base."),
  args: [
    arg("value (number)", _t("The value for which to calculate the logarithm.")),
    arg("base (number, default=10)", _t("The base of the logarithm.")),
  ],
  compute: function (
    value: Maybe<FunctionResultObject>,
    base: Maybe<FunctionResultObject> = { value: 10 }
  ) {
    const _value = toNumber(value, this.locale);
    const _base = toNumber(base, this.locale);
    if (_value <= 0) {
      return new EvaluationError(_t("The value (%s) must be strictly positive.", _value));
    }
    if (_base <= 0) {
      return new EvaluationError(_t("The base (%s) must be strictly positive.", _base));
    }
    if (_base === 1) {
      return new EvaluationError(_t("The base must be different from 1."));
    }
    return Math.log10(_value) / Math.log10(_base);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MOD
// -----------------------------------------------------------------------------
function mod(dividend: number, divisor: number): number {
  assertNotZero(divisor, _t("The divisor must be different from 0."));
  const modulus = dividend % divisor;
  // -42 % 10 = -2 but we want 8, so need the code below
  if ((modulus > 0 && divisor < 0) || (modulus < 0 && divisor > 0)) {
    return modulus + divisor;
  }
  return modulus;
}

export const MOD = {
  description: _t("Modulo (remainder) operator."),
  args: [
    arg("dividend (number)", _t("The number to be divided to find the remainder.")),
    arg("divisor (number)", _t("The number to divide by.")),
  ],
  compute: function (
    dividend: Maybe<FunctionResultObject>,
    divisor: Maybe<FunctionResultObject>
  ): FunctionResultNumber {
    const _divisor = toNumber(divisor, this.locale);
    const _dividend = toNumber(dividend, this.locale);
    return {
      value: mod(_dividend, _divisor),
      format: dividend?.format,
    };
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
  compute: function (n: Maybe<FunctionResultObject>) {
    const _n = toInteger(n, this.locale);
    if (_n < 1) {
      return new EvaluationError(_t("The argument dimension must be positive"));
    }
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
  compute: function (value: Maybe<FunctionResultObject>): FunctionResultNumber {
    const _value = toNumber(value, this.locale);

    let temp = Math.ceil(Math.abs(_value));
    temp = temp & 1 ? temp : temp + 1;
    return {
      value: _value < 0 ? -temp : temp,
      format: value?.format,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PI
// -----------------------------------------------------------------------------
export const PI = {
  description: _t("The number pi."),
  args: [],
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
  compute: function (base: Maybe<FunctionResultObject>, exponent: Maybe<FunctionResultObject>) {
    const _base = toNumber(base, this.locale);
    const _exponent = toNumber(exponent, this.locale);
    if (_base < 0 && !Number.isInteger(_exponent)) {
      return new EvaluationError(
        _t("The exponent (%s) must be an integer when the base is negative.", _exponent)
      );
    }
    return { value: Math.pow(_base, _exponent), format: base?.format };
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
      "factor (number, range<number>, repeating)",
      _t("Number or range to calculate for the product.")
    ),
  ],
  compute: function (...factors: Arg[]) {
    let count = 0;
    let acc = 1;
    for (const n of factors) {
      if (isMatrix(n)) {
        for (const i of n) {
          for (const j of i) {
            const f = j.value;
            if (typeof f === "number") {
              acc *= f;
              count += 1;
            }
            if (isEvaluationError(f)) {
              return j;
            }
          }
        }
      } else if (n !== undefined && n.value !== null) {
        acc *= strictToNumber(n, this.locale);
        count += 1;
      }
    }
    return {
      value: count === 0 ? 0 : acc,
      format: inferFormat(factors[0]),
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// RAND
// -----------------------------------------------------------------------------
export const RAND = {
  description: _t("A random number between 0 inclusive and 1 exclusive."),
  args: [],
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
    arg("whole_number (boolean, default=FALSE)", _t("Return a whole number or a decimal value."), [
      { value: false, label: _t("Decimal (default)") },
      { value: true, label: _t("Integer") },
    ]),
  ],
  compute: function (
    rows: Maybe<FunctionResultObject> = { value: 1 },
    columns: Maybe<FunctionResultObject> = { value: 1 },
    min: Maybe<FunctionResultObject> = { value: 0 },
    max: Maybe<FunctionResultObject> = { value: 1 },
    wholeNumber: Maybe<FunctionResultObject> = { value: false }
  ) {
    const _cols = toInteger(columns, this.locale);
    const _rows = toInteger(rows, this.locale);
    const _min = toNumber(min, this.locale);
    const _max = toNumber(max, this.locale);
    const _whole_number = toBoolean(wholeNumber);

    if (_cols < 1) {
      return new EvaluationError(_t("The number of columns (%s) must be positive.", _cols));
    }
    if (_rows < 1) {
      return new EvaluationError(_t("The number of rows (%s) must be positive.", _rows));
    }
    if (_min > _max) {
      return new EvaluationError(
        _t("The maximum (%s) must be greater than or equal to the minimum (%s).", _max, _min)
      );
    }
    if (_whole_number) {
      if (!Number.isInteger(_min) || !Number.isInteger(_max)) {
        return new EvaluationError(
          _t(
            "The maximum (%s) and minimum (%s) must be integers when whole_number is TRUE.",
            _max.toString(),
            _min.toString()
          )
        );
      }
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
  compute: function (low: Maybe<FunctionResultObject>, high: Maybe<FunctionResultObject>) {
    let _low = toNumber(low, this.locale);
    if (!Number.isInteger(_low)) {
      _low = Math.ceil(_low);
    }

    let _high = toNumber(high, this.locale);
    if (!Number.isInteger(_high)) {
      _high = Math.floor(_high);
    }

    if (_low > _high) {
      return new EvaluationError(
        _t("The high (%s) must be greater than or equal to the low (%s).", _high, _low)
      );
    }
    return {
      value: _low + Math.ceil((_high - _low + 1) * Math.random()) - 1,
      format: low?.format,
    };
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
  compute: function (
    value: Maybe<FunctionResultObject>,
    places: Maybe<FunctionResultObject> = { value: DEFAULT_PLACES }
  ): FunctionResultNumber {
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
    return {
      value: _value >= 0 ? tempResult : -tempResult,
      format: value?.format,
    };
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
  compute: function (
    value: Maybe<FunctionResultObject>,
    places: Maybe<FunctionResultObject> = { value: DEFAULT_PLACES }
  ): FunctionResultNumber {
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
    return {
      value: _value >= 0 ? tempResult : -tempResult,
      format: value?.format,
    };
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
  compute: function (
    value: Maybe<FunctionResultObject>,
    places: Maybe<FunctionResultObject> = { value: DEFAULT_PLACES }
  ): FunctionResultNumber {
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
    return {
      value: _value >= 0 ? tempResult : -tempResult,
      format: value?.format,
    };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SEC
// -----------------------------------------------------------------------------
export const SEC = {
  description: _t("Secant of an angle provided in radians."),
  args: [arg("angle (number)", _t("The angle to find the secant of, in radians."))],
  compute: function (angle: Maybe<FunctionResultObject>): number {
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
  compute: function (value: Maybe<FunctionResultObject>): number {
    return 1 / Math.cosh(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SEQUENCE
// -----------------------------------------------------------------------------
export const SEQUENCE = {
  description: _t("Returns a sequence of numbers."),
  args: [
    arg("rows (number)", _t("The number of rows to return")),
    arg("columns (number, optional, default=1)", _t("The number of columns to return")),
    arg("start (number, optional, default=1)", _t("The first number in the sequence")),
    arg(
      "step (number, optional, default=1)",
      _t("The amount to increment each value in the sequence")
    ),
  ],
  compute: function (
    rows: Maybe<FunctionResultObject>,
    columns: FunctionResultObject = { value: 1 },
    start: FunctionResultObject = { value: 1 },
    step: FunctionResultObject = { value: 1 }
  ) {
    const _start = toNumber(start, this.locale);
    const _step = toNumber(step, this.locale);
    const _rows = toInteger(rows, this.locale);
    const _columns = toInteger(columns, this.locale);
    if (_columns < 1) {
      return new EvaluationError(_t("The number of columns (%s) must be positive.", _columns));
    }
    if (_rows < 1) {
      return new EvaluationError(_t("The number of rows (%s) must be positive.", _rows));
    }
    return generateMatrix(_columns, _rows, (col, row) => {
      return {
        value: _start + row * _columns * _step + col * _step,
      };
    });
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SIN
// -----------------------------------------------------------------------------
export const SIN = {
  description: _t("Sine of an angle provided in radians."),
  args: [arg("angle (number)", _t("The angle to find the sine of, in radians."))],
  compute: function (angle: Maybe<FunctionResultObject>): number {
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
  compute: function (value: Maybe<FunctionResultObject>): number {
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
  compute: function (value: Maybe<FunctionResultObject>) {
    const _value = toNumber(value, this.locale);
    if (_value < 0) {
      return new EvaluationError(_t("The value (%s) must be positive or null.", _value));
    }
    return { value: Math.sqrt(_value), format: value?.format };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUBTOTAL
// -----------------------------------------------------------------------------

const subtotalFunctionAggregateByCode = {
  1: "AVERAGE",
  2: "COUNT",
  3: "COUNTA",
  4: "MAX",
  5: "MIN",
  6: "PRODUCT",
  7: "STDEV",
  8: "STDEVP",
  9: "SUM",
  10: "VAR",
  11: "VARP",
};
const subtotalFunctionOptionsIncludeHiddenRows = Object.entries(
  subtotalFunctionAggregateByCode
).map(([number, functionName]) => ({
  value: parseInt(number),
  label: _t("%s (include manually-hidden rows)", functionName),
}));

const subtotalFunctionOptionsExcludeHiddenRows = Object.entries(
  subtotalFunctionAggregateByCode
).map(([number, functionName]) => ({
  value: parseInt(number) + 100,
  label: _t("%s (exclude manually-hidden rows)", functionName),
}));

export const SUBTOTAL = {
  description: _t(
    "Returns a subtotal for a vertical range of cells using a specified aggregation function."
  ),
  args: [
    arg("function_code (number)", _t("The function to use in subtotal aggregation."), [
      ...subtotalFunctionOptionsIncludeHiddenRows,
      ...subtotalFunctionOptionsExcludeHiddenRows,
    ]),
    arg(
      "ref (meta, range<meta>, repeating)",
      _t("Range or reference for which you want the subtotal.")
    ),
  ],
  compute: function (
    functionCode: Maybe<FunctionResultObject>,
    ...refs: Matrix<{ value: string }>[]
  ) {
    let code = toInteger(functionCode, this.locale);
    let acceptHiddenCells = true;
    if (code > 100) {
      code -= 100;
      acceptHiddenCells = false;
    }
    if (code < 1 || code > 11) {
      return new EvaluationError(
        _t("The function code (%s) must be between 1 to 11 or 101 to 111.", code)
      );
    }

    const evaluatedCellToKeep: EvaluatedCell[] = [];

    for (const ref of refs) {
      const ref0 = ref[0][0];
      const sheetName = splitReference(ref0.value).sheetName;
      const sheetId = sheetName ? this.getters.getSheetIdByName(sheetName) : this.__originSheetId;

      if (!sheetId) {
        continue;
      }
      const { top, left } = toZone(ref0.value);
      const right = left + ref.length - 1;
      const bottom = top + ref[0].length - 1;

      for (let row = top; row <= bottom; row++) {
        if (this.getters.isRowFiltered(sheetId, row)) {
          continue;
        }
        if (!acceptHiddenCells && this.getters.isRowHiddenByUser(sheetId, row)) {
          continue;
        }

        for (let col = left; col <= right; col++) {
          const cell = this.getters.getCorrespondingFormulaCell({ sheetId, col, row });
          if (!cell || !doesCellContainFunction(cell, "SUBTOTAL")) {
            evaluatedCellToKeep.push(this.getters.getEvaluatedCell({ sheetId, col, row }));
          }
        }
      }
    }

    return this[subtotalFunctionAggregateByCode[code]].apply(this, [[evaluatedCellToKeep]]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUM
// -----------------------------------------------------------------------------
export const SUM = {
  description: _t("Sum of a series of numbers and/or cells."),
  args: [arg("value (number, range<number>, repeating)", _t("Number or range to add together."))],
  compute: function (...values: Arg[]): FunctionResultNumber {
    const v1 = values[0];
    return {
      value: sum(values, this.locale),
      format: inferFormat(v1),
    };
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
  compute: function (
    criteriaRange: Matrix<FunctionResultObject>,
    criterion: Maybe<FunctionResultObject>,
    sumRange: Matrix<FunctionResultObject>
  ): number {
    if (sumRange === undefined) {
      sumRange = criteriaRange;
    }

    let sum = 0;
    visitMatchingRanges(
      [criteriaRange, criterion],
      (i, j) => {
        const value = sumRange[i]?.[j]?.value;
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
    arg("criteria_range (any, range, repeating)", _t("Range to check.")),
    arg("criterion (string, repeating)", _t("Criteria to check.")),
  ],
  compute: function (sumRange: Matrix<FunctionResultObject>, ...criters: Arg[]): number {
    let sum = 0;
    visitMatchingRanges(
      criters,
      (i, j) => {
        const value = sumRange[i]?.[j]?.value;
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
  compute: function (angle: Maybe<FunctionResultObject>): number {
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
  compute: function (value: Maybe<FunctionResultObject>): number {
    return Math.tanh(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TRUNC
// -----------------------------------------------------------------------------
function trunc(value: number, places: number): number {
  if (places === 0) {
    return Math.trunc(value);
  }
  if (!Number.isInteger(places)) {
    places = Math.trunc(places);
  }
  return Math.trunc(value * Math.pow(10, places)) / Math.pow(10, places);
}

export const TRUNC = {
  description: _t("Truncates a number."),
  args: [
    arg("value (number)", _t("The value to be truncated.")),
    arg(
      `places (number, default=${DEFAULT_PLACES})`,
      _t("The number of significant digits to the right of the decimal point to retain.")
    ),
  ],
  compute: function (
    value: Maybe<FunctionResultObject>,
    places: Maybe<FunctionResultObject> = { value: DEFAULT_PLACES }
  ): FunctionResultNumber {
    const _value = toNumber(value, this.locale);
    const _places = toNumber(places, this.locale);
    return { value: trunc(_value, _places), format: value?.format };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// INT
// -----------------------------------------------------------------------------
export const INT = {
  description: _t("Rounds a number down to the nearest integer that is less than or equal to it."),
  args: [arg("value (number)", _t("The number to round down to the nearest integer."))],
  compute: function (value: Maybe<FunctionResultObject>): number {
    return Math.floor(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;
