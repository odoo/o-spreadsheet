import { FunctionMap, args } from "./functions";

function toNumber(n: any) {
  return typeof n === "number" ? n : 0;
}

export const functions: FunctionMap = {
  SUM: {
    description: "Returns the sum of all values in a range.",
    compute: function(...args) {
      return args.flat().reduce((a, b) => a + toNumber(b), 0);
    },
    args: args`
        number (number,cell,range)
        numbers (number,cell,range,optional,repeating)
    `,
    returns: ["NUMBER"]
  },
  RAND: {
    description: "Returns a random number between 0 and 1",
    compute: function() {
      return Math.random();
    },
    args: [],
    returns: ["NUMBER"]
  },
  MIN: {
    description: "Returns the minimum value.",
    compute: function(...args) {
      return Math.min(...args);
    },
    args: args`
        number (number,cell,range)
        numbers (number,cell,range,optional,repeating)
    `,
    returns: ["NUMBER"]
  },
  MAX: {
    description: "Returns the maximum value.",
    compute: function(...args) {
      return Math.max(...args);
    },
    args: args`
        number (number,cell,range)
        numbers (number,cell,range,optional,repeating)
    `,
    returns: ["NUMBER"]
  }
};
