import { _lt } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  ArgValue,
  MatrixArgValue,
  PrimitiveArg,
  PrimitiveArgValue,
} from "../types";
import { args } from "./arguments";
import {
  assert,
  reduceAny,
  reduceNumbers,
  strictToNumber,
  toNumber,
  toString,
  visitMatchingRanges,
} from "./helpers";

const DEFAULT_FACTOR = 1;
const DEFAULT_MODE = 0;
const DEFAULT_PLACES = 0;
const DEFAULT_SIGNIFICANCE = 1;

// -----------------------------------------------------------------------------
// ABS
// -----------------------------------------------------------------------------
export const ABS: AddFunctionDescription = {
  description: _lt("Absolute value of a number."),
  args: args(`
    value (number) ${_lt("The number of which to return the absolute value.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    return Math.abs(toNumber(value));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ACOS
// -----------------------------------------------------------------------------
export const ACOS: AddFunctionDescription = {
  description: _lt("Inverse cosine of a value, in radians."),
  args: args(`
    value (number) ${_lt(
      "The value for which to calculate the inverse cosine. Must be between -1 and 1, inclusive."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    assert(
      () => Math.abs(_value) <= 1,
      _lt("The value (%s) must be between -1 and 1 inclusive.", _value.toString())
    );
    return Math.acos(_value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ACOSH
// -----------------------------------------------------------------------------
export const ACOSH: AddFunctionDescription = {
  description: _lt("Inverse hyperbolic cosine of a number."),
  args: args(`
    value (number) ${_lt(
      "The value for which to calculate the inverse hyperbolic cosine. Must be greater than or equal to 1."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    assert(
      () => _value >= 1,
      _lt("The value (%s) must be greater than or equal to 1.", _value.toString())
    );
    return Math.acosh(_value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ACOT
// -----------------------------------------------------------------------------
export const ACOT: AddFunctionDescription = {
  description: _lt("Inverse cotangent of a value."),
  args: args(`
    value (number) ${_lt("The value for which to calculate the inverse cotangent.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    const sign = Math.sign(_value) || 1;
    // ACOT has two possible configurations:
    // @compatibility Excel: return Math.PI / 2 - Math.atan(toNumber(_value));
    // @compatibility Google: return sign * Math.PI / 2 - Math.atan(toNumber(_value));
    return (sign * Math.PI) / 2 - Math.atan(_value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ACOTH
// -----------------------------------------------------------------------------
export const ACOTH: AddFunctionDescription = {
  description: _lt("Inverse hyperbolic cotangent of a value."),
  args: args(`
    value (number) ${_lt(
      "The value for which to calculate the inverse hyperbolic cotangent. Must not be between -1 and 1, inclusive."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    assert(
      () => Math.abs(_value) > 1,
      _lt("The value (%s) cannot be between -1 and 1 inclusive.", _value.toString())
    );
    return Math.log((_value + 1) / (_value - 1)) / 2;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ASIN
// -----------------------------------------------------------------------------
export const ASIN: AddFunctionDescription = {
  description: _lt("Inverse sine of a value, in radians."),
  args: args(`
    value (number) ${_lt(
      "The value for which to calculate the inverse sine. Must be between -1 and 1, inclusive."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    assert(
      () => Math.abs(_value) <= 1,
      _lt("The value (%s) must be between -1 and 1 inclusive.", _value.toString())
    );
    return Math.asin(_value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ASINH
// -----------------------------------------------------------------------------
export const ASINH: AddFunctionDescription = {
  description: _lt("Inverse hyperbolic sine of a number."),
  args: args(`
    value (number) ${_lt("The value for which to calculate the inverse hyperbolic sine.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    return Math.asinh(toNumber(value));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ATAN
// -----------------------------------------------------------------------------
export const ATAN: AddFunctionDescription = {
  description: _lt("Inverse tangent of a value, in radians."),
  args: args(`
    value (number) ${_lt("The value for which to calculate the inverse tangent.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    return Math.atan(toNumber(value));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ATAN2
// -----------------------------------------------------------------------------
export const ATAN2: AddFunctionDescription = {
  description: _lt("Angle from the X axis to a point (x,y), in radians."),
  args: args(`
    x (number) ${_lt(
      "The x coordinate of the endpoint of the line segment for which to calculate the angle from the x-axis."
    )}
    y (number) ${_lt(
      "The y coordinate of the endpoint of the line segment for which to calculate the angle from the x-axis."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (x: PrimitiveArgValue, y: PrimitiveArgValue): number {
    const _x = toNumber(x);
    const _y = toNumber(y);
    assert(
      () => _x !== 0 || _y !== 0,
      _lt(`Function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );
    return Math.atan2(_y, _x);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ATANH
// -----------------------------------------------------------------------------
export const ATANH: AddFunctionDescription = {
  description: _lt("Inverse hyperbolic tangent of a number."),
  args: args(`
    value (number) ${_lt(
      "The value for which to calculate the inverse hyperbolic tangent. Must be between -1 and 1, exclusive."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    assert(
      () => Math.abs(_value) < 1,
      _lt("The value (%s) must be between -1 and 1 exclusive.", _value.toString())
    );
    return Math.atanh(_value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// CEILING
// -----------------------------------------------------------------------------
export const CEILING: AddFunctionDescription = {
  description: _lt(`Rounds number up to nearest multiple of factor.`),
  args: args(`
    value (number) ${_lt("The value to round up to the nearest integer multiple of factor.")}
    factor (number, default=${DEFAULT_FACTOR}) ${_lt(
    "The number to whose multiples value will be rounded."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: (value: PrimitiveArg) => value?.format,
  compute: function (value: PrimitiveArgValue, factor: PrimitiveArgValue = DEFAULT_FACTOR): number {
    const _value = toNumber(value);
    const _factor = toNumber(factor);
    assert(
      () => _factor >= 0 || _value <= 0,
      _lt(
        "The factor (%s) must be positive when the value (%s) is positive.",
        _factor.toString(),
        _value.toString()
      )
    );
    return _factor ? Math.ceil(_value / _factor) * _factor : 0;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// CEILING.MATH
// -----------------------------------------------------------------------------
export const CEILING_MATH: AddFunctionDescription = {
  description: _lt(`Rounds number up to nearest multiple of factor.`),
  args: args(`
    number (number) ${_lt("The value to round up to the nearest integer multiple of significance.")}
    significance (number, default=${DEFAULT_SIGNIFICANCE}) ${_lt(
    "The number to whose multiples number will be rounded. The sign of significance will be ignored."
  )}
    mode (number, default=${DEFAULT_MODE}) ${_lt(
    "If number is negative, specifies the rounding direction. If 0 or blank, it is rounded towards zero. Otherwise, it is rounded away from zero."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: (number: PrimitiveArg) => number?.format,
  compute: function (
    number: PrimitiveArgValue,
    significance: PrimitiveArgValue = DEFAULT_SIGNIFICANCE,
    mode: PrimitiveArgValue = DEFAULT_MODE
  ): number {
    let _significance = toNumber(significance);
    if (_significance === 0) {
      return 0;
    }

    const _number = toNumber(number);
    _significance = Math.abs(_significance);
    if (_number >= 0) {
      return Math.ceil(_number / _significance) * _significance;
    }

    const _mode = toNumber(mode);
    if (_mode === 0) {
      return -Math.floor(Math.abs(_number) / _significance) * _significance;
    }

    return -Math.ceil(Math.abs(_number) / _significance) * _significance;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// CEILING.PRECISE
// -----------------------------------------------------------------------------
export const CEILING_PRECISE: AddFunctionDescription = {
  description: _lt(`Rounds number up to nearest multiple of factor.`),
  args: args(`
    number (number) ${_lt("The value to round up to the nearest integer multiple of significance.")}
    significance (number, default=${DEFAULT_SIGNIFICANCE}) ${_lt(
    "The number to whose multiples number will be rounded."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: (number: PrimitiveArg) => number?.format,
  compute: function (number: PrimitiveArgValue, significance: PrimitiveArgValue): number {
    return CEILING_MATH.compute(number, significance, 0) as number;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COS
// -----------------------------------------------------------------------------
export const COS: AddFunctionDescription = {
  description: _lt("Cosine of an angle provided in radians."),
  args: args(`
    angle (number) ${_lt("The angle to find the cosine of, in radians.")}
  `),
  returns: ["NUMBER"],
  compute: function (angle: PrimitiveArgValue): number {
    return Math.cos(toNumber(angle));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COSH
// -----------------------------------------------------------------------------
export const COSH: AddFunctionDescription = {
  description: _lt("Hyperbolic cosine of any real number."),
  args: args(`
    value (number) ${_lt("Any real value to calculate the hyperbolic cosine of.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    return Math.cosh(toNumber(value));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COT
// -----------------------------------------------------------------------------
export const COT: AddFunctionDescription = {
  description: _lt("Cotangent of an angle provided in radians."),
  args: args(`
    angle (number) ${_lt("The angle to find the cotangent of, in radians.")}
  `),
  returns: ["NUMBER"],
  compute: function (angle: PrimitiveArgValue): number {
    const _angle = toNumber(angle);
    assert(
      () => _angle !== 0,
      _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );
    return 1 / Math.tan(_angle);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COTH
// -----------------------------------------------------------------------------
export const COTH: AddFunctionDescription = {
  description: _lt("Hyperbolic cotangent of any real number."),
  args: args(`
    value (number) ${_lt("Any real value to calculate the hyperbolic cotangent of.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    assert(
      () => _value !== 0,
      _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );
    return 1 / Math.tanh(_value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COUNTBLANK
// -----------------------------------------------------------------------------
export const COUNTBLANK: AddFunctionDescription = {
  description: _lt("Number of empty values."),
  args: args(`
    value1 (any, range) ${_lt("The first value or range in which to count the number of blanks.")}
    value2 (any, range, repeating) ${_lt(
      "Additional values or ranges in which to count the number of blanks."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (...argsValues: ArgValue[]): number {
    return reduceAny(
      argsValues,
      (acc, a) => (a === null || a === undefined || a === "" ? acc + 1 : acc),
      0
    );
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COUNTIF
// -----------------------------------------------------------------------------
export const COUNTIF: AddFunctionDescription = {
  description: _lt("A conditional count across a range."),
  args: args(`
    range (range) ${_lt("The range that is tested against criterion.")}
    criterion (string) ${_lt("The pattern or test to apply to range.")}
  `),
  returns: ["NUMBER"],
  compute: function (...argsValues: ArgValue[]): number {
    let count = 0;
    visitMatchingRanges(argsValues, (i, j) => {
      count += 1;
    });
    return count;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COUNTIFS
// -----------------------------------------------------------------------------
export const COUNTIFS: AddFunctionDescription = {
  description: _lt("Count values depending on multiple criteria."),
  args: args(`
    criteria_range1 (range) ${_lt("The range to check against criterion1.")}
    criterion1 (string) ${_lt("The pattern or test to apply to criteria_range1.")}
    criteria_range2 (any, range, repeating) ${_lt(
      "Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair."
    )}
    criterion2 (string, repeating) ${_lt("Additional criteria to check.")}
  `),
  returns: ["NUMBER"],
  compute: function (...argsValues: ArgValue[]): number {
    let count = 0;
    visitMatchingRanges(argsValues, (i, j) => {
      count += 1;
    });
    return count;
  },
  isExported: true,
};

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

export const COUNTUNIQUE: AddFunctionDescription = {
  description: _lt("Counts number of unique values in a range."),
  args: args(`
    value1 (any, range) ${_lt("The first value or range to consider for uniqueness.")}
    value2 (any, range, repeating) ${_lt("Additional values or ranges to consider for uniqueness.")}
  `),
  returns: ["NUMBER"],
  compute: function (...argsValues: ArgValue[]): number {
    return reduceAny(argsValues, (acc, a) => (isDefined(a) ? acc.add(a) : acc), new Set()).size;
  },
};

// -----------------------------------------------------------------------------
// COUNTUNIQUEIFS
// -----------------------------------------------------------------------------

export const COUNTUNIQUEIFS: AddFunctionDescription = {
  description: _lt("Counts number of unique values in a range, filtered by a set of criteria."),
  args: args(`
    range (range) ${_lt(
      "The range of cells from which the number of unique values will be counted."
    )}
    criteria_range1 (range) ${_lt("The range of cells over which to evaluate criterion1.")}
    criterion1 (string) ${_lt(
      "The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set."
    )}
    criteria_range2 (any, range, repeating) ${_lt(
      "Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair."
    )}
    criterion2 (string, repeating) ${_lt("The pattern or test to apply to criteria_range2.")}
  `),
  returns: ["NUMBER"],
  compute: function (range: MatrixArgValue, ...argsValues: ArgValue[]): number {
    let uniqueValues = new Set();
    visitMatchingRanges(argsValues, (i, j) => {
      const value = range[i][j];
      if (isDefined(value)) {
        uniqueValues.add(value);
      }
    });
    return uniqueValues.size;
  },
};

// -----------------------------------------------------------------------------
// CSC
// -----------------------------------------------------------------------------
export const CSC: AddFunctionDescription = {
  description: _lt("Cosecant of an angle provided in radians."),
  args: args(`
    angle (number) ${_lt("The angle to find the cosecant of, in radians.")}
  `),
  returns: ["NUMBER"],
  compute: function (angle: PrimitiveArgValue): number {
    const _angle = toNumber(angle);
    assert(
      () => _angle !== 0,
      _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );
    return 1 / Math.sin(_angle);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// CSCH
// -----------------------------------------------------------------------------
export const CSCH: AddFunctionDescription = {
  description: _lt("Hyperbolic cosecant of any real number."),
  args: args(`
    value (number) ${_lt("Any real value to calculate the hyperbolic cosecant of.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    assert(
      () => _value !== 0,
      _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );
    return 1 / Math.sinh(_value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DECIMAL
// -----------------------------------------------------------------------------
export const DECIMAL: AddFunctionDescription = {
  description: _lt("Converts from another base to decimal."),
  args: args(`
    value (string) ${_lt("The number to convert.")},
    base (number) ${_lt("The base to convert the value from.")},
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue, base: PrimitiveArgValue): number {
    let _base = toNumber(base);
    _base = Math.floor(_base);

    assert(
      () => 2 <= _base && _base <= 36,
      _lt("The base (%s) must be between 2 and 36 inclusive.", _base.toString())
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
      () => !!_value.match(/^-?[a-z0-9]+$/i),
      _lt("The value (%s) must be a valid base %s representation.", _value, _base.toString())
    );

    const deci = parseInt(_value, _base);
    assert(
      () => !isNaN(deci),
      _lt("The value (%s) must be a valid base %s representation.", _value, _base.toString())
    );
    return deci;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DEGREES
// -----------------------------------------------------------------------------
export const DEGREES: AddFunctionDescription = {
  description: _lt(`Converts an angle value in radians to degrees.`),
  args: args(`
    angle (number)  ${_lt("The angle to convert from radians to degrees.")}
  `),
  returns: ["NUMBER"],
  compute: function (angle: PrimitiveArgValue): number {
    return (toNumber(angle) * 180) / Math.PI;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// EXP
// -----------------------------------------------------------------------------
export const EXP: AddFunctionDescription = {
  description: _lt(`Euler's number, e (~2.718) raised to a power.`),
  args: args(`
    value (number) ${_lt("The exponent to raise e.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    return Math.exp(toNumber(value));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// FLOOR
// -----------------------------------------------------------------------------
export const FLOOR: AddFunctionDescription = {
  description: _lt(`Rounds number down to nearest multiple of factor.`),
  args: args(`
    value (number) ${_lt("The value to round down to the nearest integer multiple of factor.")}
    factor (number, default=${DEFAULT_FACTOR}) ${_lt(
    "The number to whose multiples value will be rounded."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: (value: PrimitiveArg) => value?.format,
  compute: function (value: PrimitiveArgValue, factor: PrimitiveArgValue = DEFAULT_FACTOR): number {
    const _value = toNumber(value);
    const _factor = toNumber(factor);
    assert(
      () => _factor >= 0 || _value <= 0,
      _lt(
        "The factor (%s) must be positive when the value (%s) is positive.",
        _factor.toString(),
        _value.toString()
      )
    );
    return _factor ? Math.floor(_value / _factor) * _factor : 0;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// FLOOR.MATH
// -----------------------------------------------------------------------------
export const FLOOR_MATH: AddFunctionDescription = {
  description: _lt(`Rounds number down to nearest multiple of factor.`),
  args: args(`
    number (number) ${_lt(
      "The value to round down to the nearest integer multiple of significance."
    )}
    significance (number, default=${DEFAULT_SIGNIFICANCE}) ${_lt(
    "The number to whose multiples number will be rounded. The sign of significance will be ignored."
  )}
    mode (number, default=${DEFAULT_MODE}) ${_lt(
    "If number is negative, specifies the rounding direction. If 0 or blank, it is rounded away from zero. Otherwise, it is rounded towards zero."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: (number: PrimitiveArg) => number?.format,
  compute: function (
    number: PrimitiveArgValue,
    significance: PrimitiveArgValue = DEFAULT_SIGNIFICANCE,
    mode: PrimitiveArgValue = DEFAULT_MODE
  ): number {
    let _significance = toNumber(significance);
    if (_significance === 0) {
      return 0;
    }

    const _number = toNumber(number);
    _significance = Math.abs(_significance);
    if (_number >= 0) {
      return Math.floor(_number / _significance) * _significance;
    }

    const _mode = toNumber(mode);
    if (_mode === 0) {
      return -Math.ceil(Math.abs(_number) / _significance) * _significance;
    }
    return -Math.floor(Math.abs(_number) / _significance) * _significance;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// FLOOR.PRECISE
// -----------------------------------------------------------------------------
export const FLOOR_PRECISE: AddFunctionDescription = {
  description: _lt(`Rounds number down to nearest multiple of factor.`),
  args: args(`
    number (number) ${_lt(
      "The value to round down to the nearest integer multiple of significance."
    )}
    significance (number, default=${DEFAULT_SIGNIFICANCE}) ${_lt(
    "The number to whose multiples number will be rounded."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: (number: PrimitiveArg) => number?.format,
  compute: function (
    number: PrimitiveArgValue,
    significance: PrimitiveArgValue = DEFAULT_SIGNIFICANCE
  ): number {
    return FLOOR_MATH.compute(number, significance, 0) as number;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISEVEN
// -----------------------------------------------------------------------------
export const ISEVEN: AddFunctionDescription = {
  description: _lt(`Whether the provided value is even.`),
  args: args(`
    value (number) ${_lt("The value to be verified as even.")}
  `),
  returns: ["BOOLEAN"],
  compute: function (value: PrimitiveArgValue): boolean {
    const _value = strictToNumber(value);

    return Math.floor(Math.abs(_value)) & 1 ? false : true;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISO.CEILING
// -----------------------------------------------------------------------------
export const ISO_CEILING: AddFunctionDescription = {
  description: _lt(`Rounds number up to nearest multiple of factor.`),
  args: args(`
      number (number) ${_lt(
        "The value to round up to the nearest integer multiple of significance."
      )}
      significance (number, default=${DEFAULT_SIGNIFICANCE}) ${_lt(
    "The number to whose multiples number will be rounded."
  )}
    `),
  returns: ["NUMBER"],
  computeFormat: (number: PrimitiveArg) => number?.format,
  compute: function (
    number: PrimitiveArgValue,
    significance: PrimitiveArgValue = DEFAULT_SIGNIFICANCE
  ): number {
    return CEILING_MATH.compute(number, significance, 0) as number;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISODD
// -----------------------------------------------------------------------------
export const ISODD: AddFunctionDescription = {
  description: _lt(`Whether the provided value is even.`),
  args: args(`
    value (number) ${_lt("The value to be verified as even.")}
  `),
  returns: ["BOOLEAN"],
  compute: function (value: PrimitiveArgValue): boolean {
    const _value = strictToNumber(value);

    return Math.floor(Math.abs(_value)) & 1 ? true : false;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LN
// -----------------------------------------------------------------------------
export const LN: AddFunctionDescription = {
  description: _lt(`The logarithm of a number, base e (euler's number).`),
  args: args(`
    value (number) ${_lt("The value for which to calculate the logarithm, base e.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    assert(() => _value > 0, _lt("The value (%s) must be strictly positive.", _value.toString()));
    return Math.log(_value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LOG
// -----------------------------------------------------------------------------
export const LOG: AddFunctionDescription = {
  description: _lt("The logarithm of a number, for a given base."),
  args: args(`
    value (number) ${_lt("The value for which to calculate the logarithm, base e.")}
    base (number, default=10) ${_lt("The base of the logarithm.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue, base: PrimitiveArgValue = 10): number {
    const _value = toNumber(value);
    const _base = toNumber(base);
    assert(() => _value > 0, _lt("The value (%s) must be strictly positive.", _value.toString()));
    assert(() => _base > 0, _lt("The base (%s) must be strictly positive.", _base.toString()));
    assert(() => _base !== 1, _lt("The base must be different from 1."));
    return Math.log10(_value) / Math.log10(_base);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MOD
// -----------------------------------------------------------------------------
export const MOD: AddFunctionDescription = {
  description: _lt(`Modulo (remainder) operator.`),
  args: args(`
      dividend (number) ${_lt("The number to be divided to find the remainder.")}
      divisor (number) ${_lt("The number to divide by.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (dividend: PrimitiveArg) => dividend?.format,
  compute: function (dividend: PrimitiveArgValue, divisor: PrimitiveArgValue): number {
    const _divisor = toNumber(divisor);

    assert(() => _divisor !== 0, _lt("The divisor must be different from 0."));

    const _dividend = toNumber(dividend);
    const modulus = _dividend % _divisor;
    // -42 % 10 = -2 but we want 8, so need the code below
    if ((modulus > 0 && _divisor < 0) || (modulus < 0 && _divisor > 0)) {
      return modulus + _divisor;
    }
    return modulus;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ODD
// -----------------------------------------------------------------------------
export const ODD: AddFunctionDescription = {
  description: _lt(`Rounds a number up to the nearest odd integer.`),
  args: args(`
      value (number) ${_lt("The value to round to the next greatest odd number.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (number: PrimitiveArg) => number?.format,
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);

    let temp = Math.ceil(Math.abs(_value));
    temp = temp & 1 ? temp : temp + 1;
    return _value < 0 ? -temp : temp;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// PI
// -----------------------------------------------------------------------------
export const PI: AddFunctionDescription = {
  description: _lt(`The number pi.`),
  args: [],
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.PI;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// POWER
// -----------------------------------------------------------------------------
export const POWER: AddFunctionDescription = {
  description: _lt(`A number raised to a power.`),
  args: args(`
      base (number) ${_lt("The number to raise to the exponent power.")}
      exponent (number) ${_lt("The exponent to raise base to.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (base: PrimitiveArg) => base?.format,
  compute: function (base: PrimitiveArgValue, exponent: PrimitiveArgValue): number {
    const _base = toNumber(base);
    const _exponent = toNumber(exponent);
    assert(
      () => _base >= 0 || Number.isInteger(_exponent),
      _lt("The exponent (%s) must be an integer when the base is negative.", _exponent.toString())
    );
    return Math.pow(_base, _exponent);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// PRODUCT
// -----------------------------------------------------------------------------
export const PRODUCT: AddFunctionDescription = {
  description: _lt("Result of multiplying a series of numbers together."),
  args: args(`
      factor1 (number, range<number>) ${_lt(
        "The first number or range to calculate for the product."
      )}
      factor2 (number, range<number>, repeating) ${_lt(
        "More numbers or ranges to calculate for the product."
      )}
    `),
  returns: ["NUMBER"],
  computeFormat: (factor1: Arg) => {
    return Array.isArray(factor1) ? factor1[0][0]?.format : factor1?.format;
  },
  compute: function (...factors: ArgValue[]): number {
    let count = 0;
    let acc = 1;
    for (let n of factors) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (typeof j === "number") {
              acc *= j;
              count += 1;
            }
          }
        }
      } else if (n !== null && n !== undefined) {
        acc *= strictToNumber(n);
        count += 1;
      }
    }
    if (count === 0) {
      return 0;
    }
    return acc;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// RAND
// -----------------------------------------------------------------------------
export const RAND: AddFunctionDescription = {
  description: _lt("A random number between 0 inclusive and 1 exclusive."),
  args: [],
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.random();
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// RANDBETWEEN
// -----------------------------------------------------------------------------
export const RANDBETWEEN: AddFunctionDescription = {
  description: _lt("Random integer between two values, inclusive."),
  args: args(`
      low (number) ${_lt("The low end of the random range.")}
      high (number) ${_lt("The high end of the random range.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (low: PrimitiveArg) => low?.format,
  compute: function (low: PrimitiveArgValue, high: PrimitiveArgValue): number {
    let _low = toNumber(low);
    if (!Number.isInteger(_low)) {
      _low = Math.ceil(_low);
    }

    let _high = toNumber(high);
    if (!Number.isInteger(_high)) {
      _high = Math.floor(_high);
    }

    assert(
      () => _low <= _high,
      _lt(
        "The high (%s) must be greater than or equal to the low (%s).",
        _high.toString(),
        _low.toString()
      )
    );
    return _low + Math.ceil((_high - _low + 1) * Math.random()) - 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ROUND
// -----------------------------------------------------------------------------
export const ROUND: AddFunctionDescription = {
  description: _lt("Rounds a number according to standard rules."),
  args: args(`
      value (number) ${_lt("The value to round to places number of places.")}
      places (number, default=${DEFAULT_PLACES}) ${_lt(
    "The number of decimal places to which to round."
  )}
    `),
  returns: ["NUMBER"],
  computeFormat: (value: PrimitiveArg) => value?.format,
  compute: function (value: PrimitiveArgValue, places: PrimitiveArgValue = DEFAULT_PLACES): number {
    const _value = toNumber(value);
    let _places = toNumber(places);

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
};

// -----------------------------------------------------------------------------
// ROUNDDOWN
// -----------------------------------------------------------------------------
export const ROUNDDOWN: AddFunctionDescription = {
  description: _lt(`Rounds down a number.`),
  args: args(`
      value (number) ${_lt("The value to round to places number of places, always rounding down.")}
      places (number, default=${DEFAULT_PLACES}) ${_lt(
    "The number of decimal places to which to round."
  )}
    `),
  returns: ["NUMBER"],
  computeFormat: (value: PrimitiveArg) => value?.format,
  compute: function (value: PrimitiveArgValue, places: PrimitiveArgValue = DEFAULT_PLACES): number {
    const _value = toNumber(value);
    let _places = toNumber(places);

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
};

// -----------------------------------------------------------------------------
// ROUNDUP
// -----------------------------------------------------------------------------
export const ROUNDUP: AddFunctionDescription = {
  description: _lt(`Rounds up a number.`),
  args: args(`
      value (number) ${_lt("The value to round to places number of places, always rounding up.")}
      places (number, default=${DEFAULT_PLACES}) ${_lt(
    "The number of decimal places to which to round."
  )}
    `),
  returns: ["NUMBER"],
  computeFormat: (value: PrimitiveArg) => value?.format,
  compute: function (value: PrimitiveArgValue, places: PrimitiveArgValue = DEFAULT_PLACES): number {
    const _value = toNumber(value);
    let _places = toNumber(places);

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
};

// -----------------------------------------------------------------------------
// SEC
// -----------------------------------------------------------------------------
export const SEC: AddFunctionDescription = {
  description: _lt("Secant of an angle provided in radians."),
  args: args(`
    angle (number) ${_lt("The angle to find the secant of, in radians.")}
  `),
  returns: ["NUMBER"],
  compute: function (angle: PrimitiveArgValue): number {
    return 1 / Math.cos(toNumber(angle));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SECH
// -----------------------------------------------------------------------------
export const SECH: AddFunctionDescription = {
  description: _lt("Hyperbolic secant of any real number."),
  args: args(`
    value (number) ${_lt("Any real value to calculate the hyperbolic secant of.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    return 1 / Math.cosh(toNumber(value));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SIN
// -----------------------------------------------------------------------------
export const SIN: AddFunctionDescription = {
  description: _lt("Sine of an angle provided in radians."),
  args: args(`
      angle (number) ${_lt("The angle to find the sine of, in radians.")}
    `),
  returns: ["NUMBER"],
  compute: function (angle: PrimitiveArgValue): number {
    return Math.sin(toNumber(angle));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SINH
// -----------------------------------------------------------------------------
export const SINH: AddFunctionDescription = {
  description: _lt("Hyperbolic sine of any real number."),
  args: args(`
    value (number) ${_lt("Any real value to calculate the hyperbolic sine of.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    return Math.sinh(toNumber(value));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SQRT
// -----------------------------------------------------------------------------
export const SQRT: AddFunctionDescription = {
  description: _lt("Positive square root of a positive number."),
  args: args(`
      value (number) ${_lt("The number for which to calculate the positive square root.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (value: PrimitiveArg) => value?.format,
  compute: function (value: PrimitiveArgValue): number {
    const _value = toNumber(value);
    assert(() => _value >= 0, _lt("The value (%s) must be positive or null.", _value.toString()));
    return Math.sqrt(_value);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SUM
// -----------------------------------------------------------------------------
export const SUM: AddFunctionDescription = {
  description: _lt("Sum of a series of numbers and/or cells."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first number or range to add together.")}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional numbers or ranges to add to value1."
      )}
    `),
  returns: ["NUMBER"],
  computeFormat: (value1: Arg) => {
    return Array.isArray(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    return reduceNumbers(values, (acc, a) => acc + a, 0);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SUMIF
// -----------------------------------------------------------------------------
export const SUMIF: AddFunctionDescription = {
  description: _lt("A conditional sum across a range."),
  args: args(`
      criteria_range (range) ${_lt("The range which is tested against criterion.")}
      criterion (string) ${_lt("The pattern or test to apply to range.")}
      sum_range (range, default=criteria_range) ${_lt(
        "The range to be summed, if different from range."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (
    criteriaRange: ArgValue,
    criterion: PrimitiveArgValue,
    sumRange: ArgValue | undefined = undefined
  ): number {
    if (sumRange === undefined) {
      sumRange = criteriaRange;
    }

    let sum = 0;
    visitMatchingRanges([criteriaRange, criterion], (i, j) => {
      const value = sumRange![i][j];
      if (typeof value === "number") {
        sum += value;
      }
    });
    return sum;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SUMIFS
// -----------------------------------------------------------------------------
export const SUMIFS: AddFunctionDescription = {
  description: _lt("Sums a range depending on multiple criteria."),
  args: args(`
      sum_range (range) ${_lt("The range to sum.")}
      criteria_range1 (range) ${_lt("The range to check against criterion1.")}
      criterion1 (string) ${_lt("The pattern or test to apply to criteria_range1.")}
      criteria_range2 (any, range, repeating) ${_lt("Additional ranges to check.")}
      criterion2 (string, repeating) ${_lt("Additional criteria to check.")}
    `),
  returns: ["NUMBER"],
  compute: function (sumRange: MatrixArgValue, ...criters: ArgValue[]): number {
    let sum = 0;
    visitMatchingRanges(criters, (i, j) => {
      const value = sumRange[i][j];
      if (typeof value === "number") {
        sum += value;
      }
    });
    return sum;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TAN
// -----------------------------------------------------------------------------
export const TAN: AddFunctionDescription = {
  description: _lt("Tangent of an angle provided in radians."),
  args: args(`
    angle (number) ${_lt("The angle to find the tangent of, in radians.")}
  `),
  returns: ["NUMBER"],
  compute: function (angle: PrimitiveArgValue): number {
    return Math.tan(toNumber(angle));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TANH
// -----------------------------------------------------------------------------
export const TANH: AddFunctionDescription = {
  description: _lt("Hyperbolic tangent of any real number."),
  args: args(`
    value (number) ${_lt("Any real value to calculate the hyperbolic tangent of.")}
  `),
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    return Math.tanh(toNumber(value));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TRUNC
// -----------------------------------------------------------------------------
export const TRUNC: AddFunctionDescription = {
  description: _lt("Truncates a number."),
  args: args(`
      value (number) ${_lt("The value to be truncated.")}
      places (number, default=${DEFAULT_PLACES}) ${_lt(
    "The number of significant digits to the right of the decimal point to retain."
  )}
    `),
  returns: ["NUMBER"],
  computeFormat: (value: PrimitiveArg) => value?.format,
  compute: function (value: PrimitiveArgValue, places: PrimitiveArgValue = DEFAULT_PLACES): number {
    const _value = toNumber(value);
    let _places = toNumber(places);

    if (_places === 0) {
      return Math.trunc(_value);
    }
    if (!Number.isInteger(_places)) {
      _places = Math.trunc(_places);
    }
    return Math.trunc(_value * Math.pow(10, _places)) / Math.pow(10, _places);
  },
  isExported: true,
};
