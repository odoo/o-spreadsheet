import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  FPayload,
  FPayloadNumber,
  Matrix,
  Maybe,
  isMatrix,
} from "../types";
import { CellErrorType } from "../types/errors";
import { arg } from "./arguments";
import { assertPositive } from "./helper_assert";
import { countUnique, sum } from "./helper_math";
import { getUnitMatrix } from "./helper_matrices";
import {
  assert,
  assertNotZero,
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
  returns: ["NUMBER"],
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (x: Maybe<FPayload>, y: Maybe<FPayload>): number {
    const _x = toNumber(x, this.locale);
    const _y = toNumber(y, this.locale);
    assert(
      () => _x !== 0 || _y !== 0,
      _t("Function [[FUNCTION_NAME]] caused a divide by zero error."),
      CellErrorType.DivisionByZero
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (
    value: Maybe<FPayload>,
    factor: Maybe<FPayload> = { value: DEFAULT_FACTOR }
  ): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (
    number: Maybe<FPayload>,
    significance: Maybe<FPayload> = { value: DEFAULT_SIGNIFICANCE },
    mode: Maybe<FPayload> = { value: DEFAULT_MODE }
  ): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (
    number: Maybe<FPayload>,
    significance: Maybe<FPayload> = { value: DEFAULT_SIGNIFICANCE }
  ): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (angle: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (angle: Maybe<FPayload>): number {
    const _angle = toNumber(angle, this.locale);
    assertNotZero(_angle);
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
  compute: function (value: Maybe<FPayload>): number {
    const _value = toNumber(value, this.locale);
    assertNotZero(_value);
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
  returns: ["NUMBER"],
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
  args: [
    arg("value1 (any, range)", _t("The first value or range to consider for uniqueness.")),
    arg(
      "value2 (any, range, repeating)",
      _t("Additional values or ranges to consider for uniqueness.")
    ),
  ],
  returns: ["NUMBER"],
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
  compute: function (range: Matrix<FPayload>, ...args: Arg[]): number {
    let uniqueValues = new Set();
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
  returns: ["NUMBER"],
  compute: function (angle: Maybe<FPayload>): number {
    const _angle = toNumber(angle, this.locale);
    assertNotZero(_angle);
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
  compute: function (value: Maybe<FPayload>): number {
    const _value = toNumber(value, this.locale);
    assertNotZero(_value);
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
  returns: ["NUMBER"],
  compute: function (value: Maybe<FPayload>, base: Maybe<FPayload>): number {
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
  compute: function (angle: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (
    value: Maybe<FPayload>,
    factor: Maybe<FPayload> = { value: DEFAULT_FACTOR }
  ): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (
    number: Maybe<FPayload>,
    significance: Maybe<FPayload> = { value: DEFAULT_SIGNIFICANCE },
    mode: Maybe<FPayload> = { value: DEFAULT_MODE }
  ): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (
    number: Maybe<FPayload>,
    significance: Maybe<FPayload> = { value: DEFAULT_SIGNIFICANCE }
  ): FPayloadNumber {
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
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<FPayload>): boolean {
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
  compute: function (
    number: Maybe<FPayload>,
    significance: Maybe<FPayload> = { value: DEFAULT_SIGNIFICANCE }
  ): FPayloadNumber {
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
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<FPayload>): boolean {
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
  compute: function (value: Maybe<FPayload>): number {
    const _value = toNumber(value, this.locale);
    assert(() => _value > 0, _t("The value (%s) must be strictly positive.", _value.toString()));
    return Math.log(_value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MOD
// -----------------------------------------------------------------------------
function mod(dividend: number, divisor: number): number {
  assert(
    () => divisor !== 0,
    _t("The divisor must be different from 0."),
    CellErrorType.DivisionByZero
  );
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
  returns: ["NUMBER"],
  compute: function (dividend: Maybe<FPayload>, divisor: Maybe<FPayload>): FPayloadNumber {
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
  returns: ["RANGE<NUMBER>"],
  compute: function (n: Maybe<FPayload>): Matrix<number> {
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
  compute: function (value: Maybe<FPayload>): FPayloadNumber {
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
  compute: function (base: Maybe<FPayload>, exponent: Maybe<FPayload>): FPayloadNumber {
    const _base = toNumber(base, this.locale);
    const _exponent = toNumber(exponent, this.locale);
    assert(
      () => _base >= 0 || Number.isInteger(_exponent),
      _t("The exponent (%s) must be an integer when the base is negative.", _exponent.toString())
    );
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
      "factor1 (number, range<number>)",
      _t("The first number or range to calculate for the product.")
    ),
    arg(
      "factor2 (number, range<number>, repeating)",
      _t("More numbers or ranges to calculate for the product.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...factors: Arg[]): FPayloadNumber {
    let count = 0;
    let acc = 1;
    for (let n of factors) {
      if (isMatrix(n)) {
        for (let i of n) {
          for (let j of i) {
            const f = j.value;
            if (typeof f === "number") {
              acc *= f;
              count += 1;
            }
            if (isEvaluationError(f)) {
              throw j;
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
    rows: Maybe<FPayload> = { value: 1 },
    columns: Maybe<FPayload> = { value: 1 },
    min: Maybe<FPayload> = { value: 0 },
    max: Maybe<FPayload> = { value: 1 },
    wholeNumber: Maybe<FPayload> = { value: false }
  ): Matrix<number> {
    const _cols = toInteger(columns, this.locale);
    const _rows = toInteger(rows, this.locale);
    const _min = toNumber(min, this.locale);
    const _max = toNumber(max, this.locale);
    const _whole_number = toBoolean(wholeNumber);

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
  compute: function (low: Maybe<FPayload>, high: Maybe<FPayload>): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (
    value: Maybe<FPayload>,
    places: Maybe<FPayload> = { value: DEFAULT_PLACES }
  ): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (
    value: Maybe<FPayload>,
    places: Maybe<FPayload> = { value: DEFAULT_PLACES }
  ): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (
    value: Maybe<FPayload>,
    places: Maybe<FPayload> = { value: DEFAULT_PLACES }
  ): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (angle: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (angle: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): FPayloadNumber {
    const _value = toNumber(value, this.locale);
    assert(() => _value >= 0, _t("The value (%s) must be positive or null.", _value.toString()));
    return { value: Math.sqrt(_value), format: value?.format };
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
  compute: function (...values: Arg[]): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (
    criteriaRange: Matrix<FPayload>,
    criterion: Maybe<FPayload>,
    sumRange: Matrix<FPayload>
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
    arg("criteria_range1 (range)", _t("The range to check against criterion1.")),
    arg("criterion1 (string)", _t("The pattern or test to apply to criteria_range1.")),
    arg("criteria_range2 (any, range, repeating)", _t("Additional ranges to check.")),
    arg("criterion2 (string, repeating)", _t("Additional criteria to check.")),
  ],
  returns: ["NUMBER"],
  compute: function (sumRange: Matrix<FPayload>, ...criters: Arg[]): number {
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
  returns: ["NUMBER"],
  compute: function (angle: Maybe<FPayload>): number {
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
  compute: function (value: Maybe<FPayload>): number {
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
  returns: ["NUMBER"],
  compute: function (
    value: Maybe<FPayload>,
    places: Maybe<FPayload> = { value: DEFAULT_PLACES }
  ): FPayloadNumber {
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
  returns: ["NUMBER"],
  compute: function (value: Maybe<FPayload>): number {
    return Math.floor(toNumber(value, this.locale));
  },
  isExported: true,
} satisfies AddFunctionDescription;
