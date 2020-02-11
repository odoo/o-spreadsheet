import { args, NumberOrRange } from "./arguments";
import { FunctionMap } from "./index";


export const functions: FunctionMap = {
  SUM: {
    description: "Returns the sum of all values in a range.",
    args: args`
        number (number,range<number>, repeating)
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
