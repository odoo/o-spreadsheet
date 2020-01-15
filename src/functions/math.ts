import { FunctionMap } from "./index";

export const functions: FunctionMap = {
  SUM: {
    description: "Returns the sum of all values in a range.",
    compute: function(...args) {
      return args.flat().reduce((a, b) => a + b, 0);
    }
  },
  RAND: {
    description: "Returns a random number between 0 and 1",
    compute: function() {
      return Math.random();
    }
  },
  MIN: {
    description: "Returns the minimum value.",
    compute: function(...args) {
      return Math.min(...args);
    }
  },
  MAX: {
    description: "Returns the maximum value.",
    compute: function(...args) {
      return Math.max(...args);
    }
  }
};
