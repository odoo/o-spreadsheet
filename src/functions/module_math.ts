import { AnyOrRange, args, getNumbers, toNumber, toString } from "./arguments";
import { FunctionDescription } from "./index";

export const CEILING: FunctionDescription = {
  description: `Rounds number up to nearest multiple of factor.`,
  args: args`
    value (number) The value to round up to the nearest integer multiple of factor.
    factor (number, optional, default=1) The number to whose multiples value will be rounded.
  `,
  returns: ["NUMBER"],
  compute: function(value: any, factor: any = 1): number {
    value = toNumber(value);
    factor = toNumber(factor);
    if (value > 0 && factor < 0) {
      throw new Error(`
        Function CEILING expects the parameter '${CEILING.args[1].name}'
        to be positive when parameter '${CEILING.args[0].name}' is positive.
        Change '${CEILING.args[1].name}' from [${factor}] to a positive
        value.`);
    }
    return factor ? Math.ceil(value / factor) * factor : 0;
  }
};

export const CEILING_MATH: FunctionDescription = {
  description: `Rounds number up to nearest multiple of factor.`,
  args: args`
    number (number) The value to round up to the nearest integer multiple of significance.
    significance (number, optional, default=1) The number to whose multiples number will be rounded. The sign of significance will be ignored.
    mode (number, optional, default=0) If number is negative, specifies the rounding direction. If 0 or blank, it is rounded towards zero. Otherwise, it is rounded away from zero.
  `,
  returns: ["NUMBER"],
  compute: function(number: any, significance: any = 1, mode: any = 0): number {
    significance = toNumber(significance);
    if (significance === 0) {
      return 0;
    }
    significance = Math.abs(significance);
    number = toNumber(number);
    mode = toNumber(mode);
    if (number >= 0) {
      return Math.ceil(number / significance) * significance;
    }
    if (mode === 0) {
      return -Math.floor(Math.abs(number) / significance) * significance;
    }
    return -Math.ceil(Math.abs(number) / significance) * significance;
  }
};

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

export const COS: FunctionDescription = {
  description: "Cosine of an angle provided in radians.",
  args: args`
    angle (number) The angle to find the cosine of, in radians.
  `,
  returns: ["NUMBER"],
  compute: function(angle: any): number {
    return Math.cos(angle);
  }
};

export const COUNTBLANK: FunctionDescription = {
  description: "Number of empty values.",
  args: args`
    value1 (any, range) The first value or range in which to count the number of blanks.
    value2 (any, range, optional, repeating) Additional values or ranges in which to count the number of blanks.
  `,
  returns: ["NUMBER"],
  compute: function(...args: AnyOrRange): number {
    let blanks = 0;
    for (let element of args) {
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

export const DECIMAL: FunctionDescription = {
  description: `Converts from another base to decimal.`,
  args: args`
    value (string) The number to convert.
    base (number) The base to convert the value from.
  `,
  returns: ["NUMBER"],
  compute: function(value: string, base: number): number {
    value = toString(value);
    base = toNumber(base);
    base = Math.floor(base);
    if (base < 2 || base > 36) {
      throw new Error(`
        Function DECIMAL expects the parameter '${DECIMAL.args[1].name}' 
        to be between 2 and 36 inclusive. Change '${DECIMAL.args[1].name}' 
        from [${base}] to a value between 2 and 36.`);
    }
    if (value === "") {
      return 0;
    }
    const errorParameter2 = `
      Function DECIMAL expects the parameter '${DECIMAL.args[0].name}' 
      to be a valid base ${base} representation. Change '${DECIMAL.args[0].name}' 
      from [${value}] to a valid base ${base} representation.
    `;
    /**
     * @compatibility: on Google sheets, expects the parameter 'value' to be positive.
     * Return error if 'value' is positive.
     * Remove '-?' in the next regex to catch this error.
     */
    if (!value.match(/^-?[a-z0-9]+$/i)) {
      throw new Error(errorParameter2);
    }
    const deci = parseInt(value, base);
    if (isNaN(deci)) {
      throw new Error(errorParameter2);
    }
    return deci;
  }
};

export const DEGREES: FunctionDescription = {
  description: `Converts an angle value in radians to degrees.`,
  args: args`
    angle (number) The angle to convert from radians to degrees.
  `,
  returns: ["NUMBER"],
  compute: function(angle: number): number {
    return (angle * 180) / Math.PI;
  }
};

export const FLOOR: FunctionDescription = {
  description: `Rounds number down to nearest multiple of factor.`,
  args: args`
    value (number) The value to round down to the nearest integer multiple of factor.
    factor (number, optional, default=1) The number to whose multiples value will be rounded.
  `,
  returns: ["NUMBER"],
  compute: function(value: number, factor: number = 1): number {
    // value = toNumber(value);
    // factor = toNumber(factor);
    if (value > 0 && factor < 0) {
      throw new Error(`
        Function FLOOR expects the parameter '${FLOOR.args[1].name}' 
        to be positive when parameter '${FLOOR.args[0].name}' is positive. 
        Change '${FLOOR.args[1].name}' from [${factor}] to a positive 
        value.`);
    }
    return factor ? Math.floor(value / factor) * factor : 0;
  }
};

export const FLOOR_MATH: FunctionDescription = {
  description: `Rounds number down to nearest multiple of factor.`,
  args: args`
    number (number) The value to round down to the nearest integer multiple of significance.
    significance (number, optional, default=1) The number to whose multiples number will be rounded. The sign of significance will be ignored.
    mode (number, optional, default=0) If number is negative, specifies the rounding direction. If 0 or blank, it is rounded away from zero. Otherwise, it is rounded towards zero.
  `,
  returns: ["NUMBER"],
  compute: function(number: number, significance: number, mode: number): number {
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
};

export const FLOOR_PRECISE: FunctionDescription = {
  description: `Rounds number down to nearest multiple of factor.`,
  args: args`
    number (number) The value to round down to the nearest integer multiple of significance.
    significance (number, optional, default=1) The number to whose multiples number will be rounded.
  `,
  returns: ["NUMBER"],
  compute: function(number: number, significance: number): number {
    return FLOOR_MATH.compute(number, significance, 0);
  }
};

export const ISEVEN: FunctionDescription = {
  description: `Whether the provided value is even.`,
  args: args`
    value (number) The value to be verified as even.
  `,
  returns: ["BOOLEAN"],
  compute: function(value: number): boolean {
    return Math.floor(Math.abs(value)) & 1 ? false : true;
  }
};

export const ISO_CEILING: FunctionDescription = {
  description: `Rounds number up to nearest multiple of factor.`,
  args: args`
      number (number) The value to round up to the nearest integer multiple of significance.
      significance (number, optional, default=1) The number to whose multiples number will be rounded.
    `,
  returns: ["NUMBER"],
  compute: function(number: number, significance: number): number {
    return CEILING_MATH.compute(number, significance, 0);
  }
};

export const ISODD: FunctionDescription = {
  description: `Whether the provided value is even.`,
  args: args`
    value (number) The value to be verified as even.
  `,
  returns: ["BOOLEAN"],
  compute: function(value: number): boolean {
    return Math.floor(Math.abs(value)) & 1 ? true : false;
  }
};

export const MOD: FunctionDescription = {
  description: `Modulo (remainder) operator.`,
  args: args`
      dividend (number) The number to be divided to find the remainder.
      divisor (number) The number to divide by.
    `,
  returns: ["NUMBER"],
  compute: function(dividend: number, divisor: number): number {
    if (divisor === 0) {
      throw new Error(`
          Function MOD expects the parameter '${MOD.args[1].name}'
          to be different from 0. Change '${MOD.args[1].name}' to 
          a value other than 0.`);
    }
    const modulus = dividend % divisor;
    // -42 % 10 = -2 but we want 8, so need the code below
    if ((modulus > 0 && divisor < 0) || (modulus < 0 && divisor > 0)) {
      return modulus + divisor;
    }
    return modulus;
  }
};

export const ODD: FunctionDescription = {
  description: `Rounds a number up to the nearest odd integer.`,
  args: args`
      value (number) The value to round to the next greatest odd number.
    `,
  returns: ["NUMBER"],
  compute: function(value: number): number {
    let temp = Math.ceil(Math.abs(value));
    temp = temp & 1 ? temp : temp + 1;
    return value < 0 ? -temp : temp;
  }
};

export const PI: FunctionDescription = {
  description: `The number pi.`,
  args: [],
  returns: ["NUMBER"],
  compute: function(): number {
    return Math.PI;
  }
};

export const POWER: FunctionDescription = {
  description: `A number raised to a power`,
  args: args`
      base (number) The number to raise to the exponent power.
      exponent (number) The exponent to raise base to.
    `,
  returns: ["NUMBER"],
  compute: function(base: number, exponent: number): number {
    if (base >= 0) {
      return Math.pow(base, exponent);
    }
    if (!Number.isInteger(exponent)) {
      throw new Error(`
          Function POWER expects the parameter '${POWER.args[1].name}' 
          to be an integer when parameter '${POWER.args[0].name}' is negative.
          Change '${POWER.args[1].name}' 
          from [${exponent}] to an integer value.`);
    }
    return Math.pow(base, exponent);
  }
};

export const RAND: FunctionDescription = {
  description: "A random number between 0 inclusive and 1 exclusive.",
  args: [],
  returns: ["NUMBER"],
  compute: function(): number {
    return Math.random();
  }
};

export const RANDBETWEEN: FunctionDescription = {
  description: "Random integer between two values, inclusive.",
  args: args`
      low (number) The low end of the random range.
      high (number) The high end of the random range.
    `,
  returns: ["NUMBER"],
  compute: function(low: number, high: number): number {
    if (!Number.isInteger(low)) {
      low = Math.ceil(low);
    }
    if (!Number.isInteger(high)) {
      high = Math.floor(high);
    }
    if (high < low) {
      throw new Error(`
          Function RANDBETWEEN parameter '${RANDBETWEEN.args[1].name}' value 
          is ${high}. It should be greater than or equal to [${low}].`);
    }
    return low + Math.ceil((high - low + 1) * Math.random()) - 1;
  }
};

export const ROUND: FunctionDescription = {
  description: "Rounds a number according to standard rules.",
  args: args`
      value (number) The value to round to places number of places.
      places (number, optional, default=0) The number of decimal places to which to round.
    `,
  returns: ["NUMBER"],
  compute: function(value: number, places: number): number {
    const absValue = Math.abs(value);
    let tempResult;
    if (places === 0) {
      tempResult = Math.round(absValue);
    } else {
      if (!Number.isInteger(places)) {
        places = Math.trunc(places);
      }
      tempResult = Math.round(absValue * Math.pow(10, places)) / Math.pow(10, places);
    }
    return value >= 0 ? tempResult : -tempResult;
  }
};

export const ROUNDDOWN: FunctionDescription = {
  description: `Rounds down a number.`,
  args: args`
      value (number) The value to round to places number of places, always rounding down.
      places (number, optional, default=0) The number of decimal places to which to round.
    `,
  returns: ["NUMBER"],
  compute: function(value: number, places: number): number {
    const absValue = Math.abs(value);
    let tempResult;
    if (places === 0) {
      tempResult = Math.floor(absValue);
    } else {
      if (!Number.isInteger(places)) {
        places = Math.trunc(places);
      }
      tempResult = Math.floor(absValue * Math.pow(10, places)) / Math.pow(10, places);
    }
    return value >= 0 ? tempResult : -tempResult;
  }
};

export const ROUNDUP: FunctionDescription = {
  description: `Rounds up a number.`,
  args: args`
      value (number) The value to round to places number of places, always rounding up.
      places (number, optional, default=0) The number of decimal places to which to round.
    `,
  returns: ["NUMBER"],
  compute: function(value: number, places: number): number {
    const absValue = Math.abs(value);
    let tempResult;
    if (places === 0) {
      tempResult = Math.ceil(absValue);
    } else {
      if (!Number.isInteger(places)) {
        places = Math.trunc(places);
      }
      tempResult = Math.ceil(absValue * Math.pow(10, places)) / Math.pow(10, places);
    }
    return value >= 0 ? tempResult : -tempResult;
  }
};

export const SIN: FunctionDescription = {
  description: "Sine of an angle provided in radians.",
  args: args`
      angle (number) The angle to find the sine of, in radians.
    `,
  returns: ["NUMBER"],
  compute: function(angle: number): number {
    return Math.sin(angle);
  }
};

export const SQRT: FunctionDescription = {
  description: "Positive square root of a positive number.",
  args: args`
      value (number) The number for which to calculate the positive square root.
    `,
  returns: ["NUMBER"],
  compute: function(value: number): number {
    if (value < 0) {
      throw new Error(`
          Function SQRT parameter '${SQRT.args[0].name}' value is negative. 
          It should be positive or zero. Change '${SQRT.args[0].name}' 
          from [${value}] to a positive value.`);
    }
    return Math.sqrt(value);
  }
};

export const TRUNC: FunctionDescription = {
  description: "Truncates a number.",
  args: args`
      value (number) The value to be truncated.
      places (number, optional, default=0) The number of significant digits to the right of the decimal point to retain.
    `,
  returns: ["NUMBER"],
  compute: function(value: any, places: any): number {
    if (places === 0) {
      return Math.trunc(value);
    }
    if (!Number.isInteger(places)) {
      places = Math.trunc(places);
    }
    return Math.trunc(value * Math.pow(10, places)) / Math.pow(10, places);
  }
};

export const SUM: FunctionDescription = {
  description: "Returns the sum of all values in a range.",
  args: args`number (number,range<number>,repeating)`,
  returns: ["NUMBER"],
  compute: function(): number {
    const numbers = getNumbers(arguments);
    return numbers.reduce((a, b) => a + b, 0);
  }
};

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
