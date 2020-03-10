import { args, getNumbers, toNumber, toString } from "./arguments";
import { FunctionDescription } from "./index";

// -----------------------------------------------------------------------------
// CEILING
// -----------------------------------------------------------------------------
export const CEILING: FunctionDescription = {
  description: `Rounds number up to nearest multiple of factor.`,
  args: args`
    value (number) The value to round up to the nearest integer multiple of factor.
    factor (number, optional, default=1) The number to whose multiples value will be rounded.
  `,
  returns: ["NUMBER"],
  compute: function(value: any, factor: any = 1): number {
    const _value = toNumber(value);
    const _factor = toNumber(factor);

    if (_value > 0 && _factor < 0) {
      throw new Error(`
        Function CEILING expects the parameter '${CEILING.args[1].name}'
        to be positive when parameter '${CEILING.args[0].name}' is positive.
        Change '${CEILING.args[1].name}' from [${_factor}] to a positive
        value.`);
    }
    return _factor ? Math.ceil(_value / _factor) * _factor : 0;
  }
};

// -----------------------------------------------------------------------------
// CEILING.MATH
// -----------------------------------------------------------------------------
export const CEILING_MATH: FunctionDescription = {
  description: `Rounds number up to nearest multiple of factor.`,
  args: args`
    number (number) The value to round up to the nearest integer multiple of significance.
    significance (number, optional, default=1) The number to whose multiples number will be rounded. The sign of significance will be ignored.
    mode (number, optional, default=0) If number is negative, specifies the rounding direction. If 0 or blank, it is rounded towards zero. Otherwise, it is rounded away from zero.
  `,
  returns: ["NUMBER"],
  compute: function(number: any, significance: any = 1, mode: any = 0): number {
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
  }
};

// -----------------------------------------------------------------------------
// CEILING.PRECISE
// -----------------------------------------------------------------------------
export const CEILING_PRECISE: FunctionDescription = {
  description: `Rounds number up to nearest multiple of factor.`,
  args: args`
    number (number) The value to round up to the nearest integer multiple of significance.
    significance (number, optional, default=1) The number to whose multiples number will be rounded.
  `,
  returns: ["NUMBER"],
  compute: function(number: any, significance: any): number {
    return CEILING_MATH.compute(number, significance, 0);
  }
};

// -----------------------------------------------------------------------------
// COS
// -----------------------------------------------------------------------------
export const COS: FunctionDescription = {
  description: "Cosine of an angle provided in radians.",
  args: args`
    angle (number) The angle to find the cosine of, in radians.
  `,
  returns: ["NUMBER"],
  compute: function(angle: any): number {
    return Math.cos(toNumber(angle));
  }
};

// -----------------------------------------------------------------------------
// COUNTBLANK
// -----------------------------------------------------------------------------
export const COUNTBLANK: FunctionDescription = {
  description: "Number of empty values.",
  args: args`
    value1 (any, range) The first value or range in which to count the number of blanks.
    value2 (any, range, optional, repeating) Additional values or ranges in which to count the number of blanks.
  `,
  returns: ["NUMBER"],
  compute: function(): number {
    let blanks = 0;
    for (let element of arguments) {
      if (Array.isArray(element)) {
        for (let col of element) {
          for (let cell of col) {
            if (cell === undefined || cell === "") {
              blanks++;
            }
          }
        }
      } else if (element === null || element === "") {
        blanks++;
      }
    }
    return blanks;
  }
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

export const COUNTUNIQUE: FunctionDescription = {
  description: "Counts number of unique values in a range.",
  args: args`
    value1 (any, range) The first value or range to consider for uniqueness.
    value2 (any, range, optional, repeating) Additional values or ranges to consider for uniqueness.
  `,
  returns: ["NUMBER"],
  compute: function(): number {
    let values = new Set();
    for (let n of arguments) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (isDefined(j)) {
              values.add(j);
            }
          }
        }
      } else if (isDefined(n)) {
        values.add(n);
      }
    }
    return values.size;
  }
};

// -----------------------------------------------------------------------------
// DECIMAL
// -----------------------------------------------------------------------------
const decimalErrorParameter2 = (parameterName, base, value) => `
  Function DECIMAL expects the parameter '${parameterName}' 
  to be a valid base ${base} representation. Change '${parameterName}' 
  from [${value}] to a valid base ${base} representation.
`;

export const DECIMAL: FunctionDescription = {
  description: `Converts from another base to decimal.`,
  args: args`
    value (string) The number to convert.
    base (number) The base to convert the value from.
  `,
  returns: ["NUMBER"],
  compute: function(value: any, base: any): number {
    let _base = toNumber(base);
    _base = Math.floor(_base);
    if (_base < 2 || _base > 36) {
      throw new Error(`
        Function DECIMAL expects the parameter '${DECIMAL.args[1].name}' 
        to be between 2 and 36 inclusive. Change '${DECIMAL.args[1].name}' 
        from [${_base}] to a value between 2 and 36.`);
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
    if (!_value.match(/^-?[a-z0-9]+$/i)) {
      throw new Error(decimalErrorParameter2(DECIMAL.args[0].name, _base, _value));
    }

    const deci = parseInt(_value, _base);
    if (isNaN(deci)) {
      throw new Error(decimalErrorParameter2(DECIMAL.args[0].name, _base, _value));
    }
    return deci;
  }
};

// -----------------------------------------------------------------------------
// DEGREES
// -----------------------------------------------------------------------------
export const DEGREES: FunctionDescription = {
  description: `Converts an angle value in radians to degrees.`,
  args: args`
    angle (number) The angle to convert from radians to degrees.
  `,
  returns: ["NUMBER"],
  compute: function(angle: any): number {
    return (toNumber(angle) * 180) / Math.PI;
  }
};

// -----------------------------------------------------------------------------
// FLOOR
// -----------------------------------------------------------------------------
export const FLOOR: FunctionDescription = {
  description: `Rounds number down to nearest multiple of factor.`,
  args: args`
    value (number) The value to round down to the nearest integer multiple of factor.
    factor (number, optional, default=1) The number to whose multiples value will be rounded.
  `,
  returns: ["NUMBER"],
  compute: function(value: any, factor: any = 1): number {
    const _value = toNumber(value);
    const _factor = toNumber(factor);

    if (_value > 0 && _factor < 0) {
      throw new Error(`
        Function FLOOR expects the parameter '${FLOOR.args[1].name}'
        to be positive when parameter '${FLOOR.args[0].name}' is positive.
        Change '${FLOOR.args[1].name}' from [${_factor}] to a positive
        value.`);
    }
    return _factor ? Math.floor(_value / _factor) * _factor : 0;
  }
};

// -----------------------------------------------------------------------------
// FLOOR.MATH
// -----------------------------------------------------------------------------
export const FLOOR_MATH: FunctionDescription = {
  description: `Rounds number down to nearest multiple of factor.`,
  args: args`
    number (number) The value to round down to the nearest integer multiple of significance.
    significance (number, optional, default=1) The number to whose multiples number will be rounded. The sign of significance will be ignored.
    mode (number, optional, default=0) If number is negative, specifies the rounding direction. If 0 or blank, it is rounded away from zero. Otherwise, it is rounded towards zero.
  `,
  returns: ["NUMBER"],
  compute: function(number: any, significance: any = 1, mode: any = 0): number {
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
  }
};

// -----------------------------------------------------------------------------
// FLOOR.PRECISE
// -----------------------------------------------------------------------------
export const FLOOR_PRECISE: FunctionDescription = {
  description: `Rounds number down to nearest multiple of factor.`,
  args: args`
    number (number) The value to round down to the nearest integer multiple of significance.
    significance (number, optional, default=1) The number to whose multiples number will be rounded.
  `,
  returns: ["NUMBER"],
  compute: function(number: number, significance: number = 1): number {
    return FLOOR_MATH.compute(number, significance, 0);
  }
};

// -----------------------------------------------------------------------------
// ISEVEN
// -----------------------------------------------------------------------------
export const ISEVEN: FunctionDescription = {
  description: `Whether the provided value is even.`,
  args: args`
    value (number) The value to be verified as even.
  `,
  returns: ["BOOLEAN"],
  compute: function(value: any): boolean {
    const _value = toNumber(value);

    return Math.floor(Math.abs(_value)) & 1 ? false : true;
  }
};

// -----------------------------------------------------------------------------
// ISO.CEILING
// -----------------------------------------------------------------------------
export const ISO_CEILING: FunctionDescription = {
  description: `Rounds number up to nearest multiple of factor.`,
  args: args`
      number (number) The value to round up to the nearest integer multiple of significance.
      significance (number, optional, default=1) The number to whose multiples number will be rounded.
    `,
  returns: ["NUMBER"],
  compute: function(number: any, significance: any): number {
    return CEILING_MATH.compute(number, significance, 0);
  }
};

// -----------------------------------------------------------------------------
// ISODD
// -----------------------------------------------------------------------------
export const ISODD: FunctionDescription = {
  description: `Whether the provided value is even.`,
  args: args`
    value (number) The value to be verified as even.
  `,
  returns: ["BOOLEAN"],
  compute: function(value: any): boolean {
    const _value = toNumber(value);

    return Math.floor(Math.abs(_value)) & 1 ? true : false;
  }
};

// -----------------------------------------------------------------------------
// MOD
// -----------------------------------------------------------------------------
export const MOD: FunctionDescription = {
  description: `Modulo (remainder) operator.`,
  args: args`
      dividend (number) The number to be divided to find the remainder.
      divisor (number) The number to divide by.
    `,
  returns: ["NUMBER"],
  compute: function(dividend: any, divisor: any): number {
    const _divisor = toNumber(divisor);

    if (_divisor === 0) {
      throw new Error(`
          Function MOD expects the parameter '${MOD.args[1].name}'
          to be different from 0. Change '${MOD.args[1].name}' to 
          a value other than 0.`);
    }
    const _dividend = toNumber(dividend);
    const modulus = _dividend % _divisor;
    // -42 % 10 = -2 but we want 8, so need the code below
    if ((modulus > 0 && _divisor < 0) || (modulus < 0 && _divisor > 0)) {
      return modulus + _divisor;
    }
    return modulus;
  }
};

// -----------------------------------------------------------------------------
// ODD
// -----------------------------------------------------------------------------
export const ODD: FunctionDescription = {
  description: `Rounds a number up to the nearest odd integer.`,
  args: args`
      value (number) The value to round to the next greatest odd number.
    `,
  returns: ["NUMBER"],
  compute: function(value: any): number {
    const _value = toNumber(value);

    let temp = Math.ceil(Math.abs(_value));
    temp = temp & 1 ? temp : temp + 1;
    return _value < 0 ? -temp : temp;
  }
};

// -----------------------------------------------------------------------------
// PI
// -----------------------------------------------------------------------------
export const PI: FunctionDescription = {
  description: `The number pi.`,
  args: [],
  returns: ["NUMBER"],
  compute: function(): number {
    return Math.PI;
  }
};

// -----------------------------------------------------------------------------
// POWER
// -----------------------------------------------------------------------------
export const POWER: FunctionDescription = {
  description: `A number raised to a power`,
  args: args`
      base (number) The number to raise to the exponent power.
      exponent (number) The exponent to raise base to.
    `,
  returns: ["NUMBER"],
  compute: function(base: any, exponent: any): number {
    const _base = toNumber(base);
    if (_base >= 0) {
      return Math.pow(_base, exponent);
    }

    const _exponent = toNumber(exponent);
    if (!Number.isInteger(_exponent)) {
      throw new Error(`
          Function POWER expects the parameter '${POWER.args[1].name}' 
          to be an integer when parameter '${POWER.args[0].name}' is negative.
          Change '${POWER.args[1].name}' 
          from [${_exponent}] to an integer value.`);
    }
    return Math.pow(_base, _exponent);
  }
};

// -----------------------------------------------------------------------------
// RAND
// -----------------------------------------------------------------------------
export const RAND: FunctionDescription = {
  description: "A random number between 0 inclusive and 1 exclusive.",
  args: [],
  returns: ["NUMBER"],
  compute: function(): number {
    return Math.random();
  }
};

// -----------------------------------------------------------------------------
// RANDBETWEEN
// -----------------------------------------------------------------------------
export const RANDBETWEEN: FunctionDescription = {
  description: "Random integer between two values, inclusive.",
  args: args`
      low (number) The low end of the random range.
      high (number) The high end of the random range.
    `,
  returns: ["NUMBER"],
  compute: function(low: any, high: any): number {
    let _low = toNumber(low);
    if (!Number.isInteger(_low)) {
      _low = Math.ceil(_low);
    }

    let _high = toNumber(high);
    if (!Number.isInteger(_high)) {
      _high = Math.floor(_high);
    }

    if (_high < _low) {
      throw new Error(`
          Function RANDBETWEEN parameter '${RANDBETWEEN.args[1].name}' value 
          is ${_high}. It should be greater than or equal to [${_low}].`);
    }
    return _low + Math.ceil((_high - _low + 1) * Math.random()) - 1;
  }
};

// -----------------------------------------------------------------------------
// ROUND
// -----------------------------------------------------------------------------
export const ROUND: FunctionDescription = {
  description: "Rounds a number according to standard rules.",
  args: args`
      value (number) The value to round to places number of places.
      places (number, optional, default=0) The number of decimal places to which to round.
    `,
  returns: ["NUMBER"],
  compute: function(value: any, places: any = 0): number {
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
  }
};

// -----------------------------------------------------------------------------
// ROUNDDOWN
// -----------------------------------------------------------------------------
export const ROUNDDOWN: FunctionDescription = {
  description: `Rounds down a number.`,
  args: args`
      value (number) The value to round to places number of places, always rounding down.
      places (number, optional, default=0) The number of decimal places to which to round.
    `,
  returns: ["NUMBER"],
  compute: function(value: any, places: any = 0): number {
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
  }
};

// -----------------------------------------------------------------------------
// ROUNDUP
// -----------------------------------------------------------------------------
export const ROUNDUP: FunctionDescription = {
  description: `Rounds up a number.`,
  args: args`
      value (number) The value to round to places number of places, always rounding up.
      places (number, optional, default=0) The number of decimal places to which to round.
    `,
  returns: ["NUMBER"],
  compute: function(value: any, places: any): number {
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
  }
};

// -----------------------------------------------------------------------------
// SIN
// -----------------------------------------------------------------------------
export const SIN: FunctionDescription = {
  description: "Sine of an angle provided in radians.",
  args: args`
      angle (number) The angle to find the sine of, in radians.
    `,
  returns: ["NUMBER"],
  compute: function(angle: number): number {
    return Math.sin(toNumber(angle));
  }
};

// -----------------------------------------------------------------------------
// SQRT
// -----------------------------------------------------------------------------
export const SQRT: FunctionDescription = {
  description: "Positive square root of a positive number.",
  args: args`
      value (number) The number for which to calculate the positive square root.
    `,
  returns: ["NUMBER"],
  compute: function(value: any): number {
    const _value = toNumber(value);

    if (_value < 0) {
      throw new Error(`
          Function SQRT parameter '${SQRT.args[0].name}' value is negative. 
          It should be positive or zero. Change '${SQRT.args[0].name}' 
          from [${_value}] to a positive value.`);
    }
    return Math.sqrt(_value);
  }
};

// -----------------------------------------------------------------------------
// SUM
// -----------------------------------------------------------------------------
export const SUM: FunctionDescription = {
  description: "Sum of a series of numbers and/or cells.",
  args: args`
      value1 (number, range<number>) The first number or range to add together.
      value2 (number, range<number>, optional, repeating) Additional numbers or ranges to add to value1.
    `,
  returns: ["NUMBER"],
  compute: function(): number {
    let sum = 0;
    for (let n of arguments) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (typeof j === "number") {
              sum += j;
            }
          }
        }
      } else {
        sum += toNumber(n);
      }
    }
    return sum;
  }
};

// -----------------------------------------------------------------------------
// TRUNC
// -----------------------------------------------------------------------------
export const TRUNC: FunctionDescription = {
  description: "Truncates a number.",
  args: args`
      value (number) The value to be truncated.
      places (number, optional, default=0) The number of significant digits to the right of the decimal point to retain.
    `,
  returns: ["NUMBER"],
  compute: function(value: any, places: any = 0): number {
    const _value = toNumber(value);
    let _places = toNumber(places);

    if (_places === 0) {
      return Math.trunc(_value);
    }
    if (!Number.isInteger(_places)) {
      _places = Math.trunc(_places);
    }
    return Math.trunc(_value * Math.pow(10, _places)) / Math.pow(10, _places);
  }
};

// -----------------------------------------------------------------------------
// MIN
// -----------------------------------------------------------------------------
export const MIN: FunctionDescription = {
  description: "Returns the minimum value.",
  args: args`number (number,range<number>, repeating)`,
  returns: ["NUMBER"],
  compute: function(): number {
    const numbers = getNumbers(arguments);
    const min = numbers.reduce((a, b) => Math.min(a, b), Infinity);
    return min === Infinity ? 0 : min;
  }
};

// -----------------------------------------------------------------------------
// MAX
// -----------------------------------------------------------------------------
export const MAX: FunctionDescription = {
  description: "Returns the maximum value.",
  args: args`number (number,range<number>,repeating)`,
  returns: ["NUMBER"],
  compute: function(): number {
    const numbers = getNumbers(arguments);
    const max = numbers.reduce((a, b) => Math.max(a, b), -Infinity);
    return max === -Infinity ? 0 : max;
  }
};
