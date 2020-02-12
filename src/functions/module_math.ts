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
    compute: function(value: number, factor: number = 1): number {
      if (value > 0 && factor < 0) {
        throw new Error(`
          Function CEILING expects the parameter '${functions.CEILING.args[1].name}' 
          to be positive when parameter '${functions.CEILING.args[0].name}' is positive. 
          Change '${functions.CEILING.args[1].name}' from [${factor}] to positive 
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
    compute: function(number: number, significance: number = 1, mode: number = 0): number {
      if (significance === 0) {
        return 0;
      }
      significance = Math.abs(significance);
      if (number >= 0) {
        return Math.ceil(number / significance) * significance;
      } else {
        if (mode === 0) {
          return -Math.floor(Math.abs(number) / significance) * significance;
        } else {
          return -Math.ceil(Math.abs(number) / significance) * significance;
        }
      }
    }
  },

  "CEILING.PRECISE": {
    description: `Rounds number up to nearest multiple of factor.`,
    args: args`
      number (number) The value to round up to the nearest integer multiple of significance.
      significance (number, optional, default=1) The number to whose multiples number will be rounded.
    `,
    returns: ["NUMBER"],
    compute: function(number: number, significance: number = 1): number {
      return functions["CEILING.MATH"].compute(number, significance);
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
          from [${base}] to value between 2 and 36.`);
      }
      const error_parameter_2 = `
        Function DECIMAL expects the parameter '${functions.DECIMAL.args[0].name}' 
        to be a valid base ${base} representation. Change '${functions.DECIMAL.args[0].name}' 
        from [${value}] to valid base ${base} representation.
      `;
      /**
       * @compatibility: on Google sheets, expects the parameter 'value' to be positive.
       * Return error if 'value' is positive.
       * Remove '-?' in the next regex to catch this error.
       */
      if (!value.match(/^-?[a-z0-9]+$/i)) {
        throw new Error(error_parameter_2);
      }
      const deci = parseInt(value, base);
      if (isNaN(deci)) {
        throw new Error(error_parameter_2);
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
    compute: function(number: number, significance: number = 1): number {
      return functions["CEILING.PRECISE"].compute(number, significance);
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
          Function MOD expects the parameter '${functions.DECIMAL.args[1].name}'
          to be different from 0. Change '${functions.DECIMAL.args[1].name}' to 
          a value other than 0.`);
      }
      const modulus = dividend % divisor;
      // -42 % 10 = -2 but we want 8, so need the code below
      if ((modulus > 0 && divisor < 0) || (modulus < 0 && divisor > 0)) {
        return modulus + divisor;
      } else {
        return modulus;
      }
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
  RAND: {
    description: "Returns a random number between 0 and 1",
    args: [],
    returns: ["NUMBER"],
    compute: function(): number {
      return Math.random();
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
