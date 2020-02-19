import { args, NumberOrRange } from "./arguments";
import { FunctionMap } from "./index";

export const functions: FunctionMap = {
  CEILING: {
    description: `Rounds number up to nearest multiple of factor.`,
    args: args`
      value (number) The value to round up to the nearest integer multiple of factor.
      factor (number, optional, default=1) The number to whose multiples value will be rounded.
    `,
    returns: ["NUMBER"],
    compute: function(value: number, factor: number): number {
      if (value > 0 && factor < 0) {
        throw new Error(`
          Function CEILING expects the parameter '${functions.CEILING.args[1].name}' 
          to be positive when parameter '${functions.CEILING.args[0].name}' is positive. 
          Change '${functions.CEILING.args[1].name}' from [${factor}] to a positive 
          value.`);
      }
      return factor ? Math.ceil(value / factor) * factor : 0;
    }
  },

  "CEILING.MATH": {
    description: `Rounds number up to nearest multiple of factor.`,
    args: args`
      number (number) The value to round up to the nearest integer multiple of significance.
      significance (number, optional, default=1) The number to whose multiples number will be rounded. The sign of significance will be ignored.
      mode (number, optional, default=0) If number is negative, specifies the rounding direction. If 0 or blank, it is rounded towards zero. Otherwise, it is rounded away from zero.
    `,
    returns: ["NUMBER"],
    compute: function(number: number, significance: number, mode: number): number {
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
  },

  "CEILING.PRECISE": {
    description: `Rounds number up to nearest multiple of factor.`,
    args: args`
      number (number) The value to round up to the nearest integer multiple of significance.
      significance (number, optional, default=1) The number to whose multiples number will be rounded.
    `,
    returns: ["NUMBER"],
    compute: function(number: number, significance: number): number {
      return functions["CEILING.MATH"].compute(number, significance, 0);
    }
  },

  COS: {
    description: "Cosine of an angle provided in radians.",
    args: args`
      angle (number) The angle to find the cosine of, in radians.
    `,
    returns: ["NUMBER"],
    compute: function(angle: number): number {
      return Math.cos(angle);
    }
  },

  DECIMAL: {
    description: `Converts from another base to decimal.`,
    args: args`
      value (string) The number to convert.
      base (number) The base to convert the value from.
    `,
    returns: ["NUMBER"],
    compute: function(value: string, base: number): number {
      base = Math.floor(base);
      if (base < 2 || base > 36) {
        throw new Error(`
          Function DECIMAL expects the parameter '${functions.DECIMAL.args[1].name}' 
          to be between 2 and 36 inclusive. Change '${functions.DECIMAL.args[1].name}' 
          from [${base}] to a value between 2 and 36.`);
      }
      if (value === "") {
        return 0;
      }
      const errorParameter2 = `
        Function DECIMAL expects the parameter '${functions.DECIMAL.args[0].name}' 
        to be a valid base ${base} representation. Change '${functions.DECIMAL.args[0].name}' 
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
  },

  DEGREES: {
    description: `Converts an angle value in radians to degrees.`,
    args: args`
      angle (number) The angle to convert from radians to degrees.
    `,
    returns: ["NUMBER"],
    compute: function(angle: number): number {
      return (angle * 180) / Math.PI;
    }
  },

  FLOOR: {
    description: `Rounds number down to nearest multiple of factor.`,
    args: args`
      value (number) The value to round down to the nearest integer multiple of factor.
      factor (number, optional, default=1) The number to whose multiples value will be rounded.
    `,
    returns: ["NUMBER"],
    compute: function(value: number, factor: number): number {
      if (value > 0 && factor < 0) {
        throw new Error(`
          Function FLOOR expects the parameter '${functions.FLOOR.args[1].name}' 
          to be positive when parameter '${functions.FLOOR.args[0].name}' is positive. 
          Change '${functions.FLOOR.args[1].name}' from [${factor}] to a positive 
          value.`);
      }
      return factor ? Math.floor(value / factor) * factor : 0;
    }
  },

  "FLOOR.MATH": {
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
  },

  "FLOOR.PRECISE": {
    description: `Rounds number down to nearest multiple of factor.`,
    args: args`
      number (number) The value to round down to the nearest integer multiple of significance.
      significance (number, optional, default=1) The number to whose multiples number will be rounded.
    `,
    returns: ["NUMBER"],
    compute: function(number: number, significance: number): number {
      return functions["FLOOR.MATH"].compute(number, significance, 0);
    }
  },

  ISEVEN: {
    description: `Whether the provided value is even.`,
    args: args`
      value (number) The value to be verified as even.
    `,
    returns: ["BOOLEAN"],
    compute: function(value: number): boolean {
      return Math.floor(Math.abs(value)) & 1 ? false : true;
    }
  },

  "ISO.CEILING": {
    description: `Rounds number up to nearest multiple of factor.`,
    args: args`
      number (number) The value to round up to the nearest integer multiple of significance.
      significance (number, optional, default=1) The number to whose multiples number will be rounded.
    `,
    returns: ["NUMBER"],
    compute: function(number: number, significance: number): number {
      return functions["CEILING.MATH"].compute(number, significance, 0);
    }
  },

  ISODD: {
    description: `Whether the provided value is even.`,
    args: args`
      value (number) The value to be verified as even.
    `,
    returns: ["BOOLEAN"],
    compute: function(value: number): boolean {
      return Math.floor(Math.abs(value)) & 1 ? true : false;
    }
  },

  MOD: {
    description: `Modulo (remainder) operator.`,
    args: args`
      dividend (number) The number to be divided to find the remainder.
      divisor (number) The number to divide by.
    `,
    returns: ["NUMBER"],
    compute: function(dividend: number, divisor: number): number {
      if (divisor === 0) {
        throw new Error(`
          Function MOD expects the parameter '${functions.MOD.args[1].name}'
          to be different from 0. Change '${functions.MOD.args[1].name}' to 
          a value other than 0.`);
      }
      const modulus = dividend % divisor;
      // -42 % 10 = -2 but we want 8, so need the code below
      if ((modulus > 0 && divisor < 0) || (modulus < 0 && divisor > 0)) {
        return modulus + divisor;
      }
      return modulus;
    }
  },

  ODD: {
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
  },

  PI: {
    description: `The number pi.`,
    args: [],
    returns: ["NUMBER"],
    compute: function(): number {
      return Math.PI;
    }
  },

  POWER: {
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
          Function POWER expects the parameter '${functions.POWER.args[1].name}' 
          to be an integer when parameter '${functions.POWER.args[0].name}' is negative.
          Change '${functions.POWER.args[1].name}' 
          from [${exponent}] to an integer value.`);
      }
      return Math.pow(base, exponent);
    }
  },

  RAND: {
    description: "A random number between 0 inclusive and 1 exclusive.",
    args: [],
    returns: ["NUMBER"],
    compute: function(): number {
      return Math.random();
    }
  },

  RANDBETWEEN: {
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
          Function RANDBETWEEN parameter '${functions.RANDBETWEEN.args[1].name}' value 
          is ${high}. It should be greater than or equal to [${low}].`);
      }
      return low + Math.ceil((high - low + 1) * Math.random()) - 1;
    }
  },

  ROUND: {
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
  },

  ROUNDDOWN: {
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
  },

  ROUNDUP: {
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
  },

  SIN: {
    description: "Sine of an angle provided in radians.",
    args: args`
      angle (number) The angle to find the sine of, in radians.
    `,
    returns: ["NUMBER"],
    compute: function(angle: number): number {
      return Math.sin(angle);
    }
  },

  SQRT: {
    description: "Positive square root of a positive number.",
    args: args`
      value (number) The number for which to calculate the positive square root.
    `,
    returns: ["NUMBER"],
    compute: function(value: number): number {
      if (value < 0) {
        throw new Error(`
          Function SQRT parameter '${functions.SQRT.args[0].name}' value is negative. 
          It should be positive or zero. Change '${functions.SQRT.args[0].name}' 
          from [${value}] to a positive value.`);
      }
      return Math.sqrt(value);
    }
  },

  TRUNC: {
    description: "Truncates a number.",
    args: args`
      value (number) The value to be truncated.
      places (number, optional, default=0) The number of significant digits to the right of the decimal point to retain.
    `,
    returns: ["NUMBER"],
    compute: function(value: number, places: number): number {
      if (places === 0) {
        return Math.trunc(value);
      }
      if (!Number.isInteger(places)) {
        places = Math.trunc(places);
      }
      return Math.trunc(value * Math.pow(10, places)) / Math.pow(10, places);
    }
  },

  SUM: {
    description: "Returns the sum of all values in a range.",
    args: args`
        number (number,range<number>,repeating)
    `,
    returns: ["NUMBER"],
    compute: function(...args: NumberOrRange[]): number {
      return args.flat(2).reduce((a, b) => a + (b || 0), 0);
    }
  },
  MIN: {
    description: "Returns the minimum value.",
    args: args`
        number (number,range<number>, repeating)
    `,
    returns: ["NUMBER"],
    compute: function(...args: NumberOrRange[]): number {
      const numbers = args.flat(2);
      const min = numbers.reduce((a, b) => (b === undefined ? a : Math.min(a, b)), Infinity);
      return min === Infinity ? 0 : min;
    }
  },
  MAX: {
    description: "Returns the maximum value.",
    args: args`
        number (number,range<number>,repeating)
    `,
    returns: ["NUMBER"],
    compute: function(...args: NumberOrRange[]): number {
      const numbers = args.flat(2);
      const max = numbers.reduce((a, b) => (b === undefined ? a : Math.max(a, b)), -Infinity);
      return max === -Infinity ? 0 : max;
    }
  }
};
