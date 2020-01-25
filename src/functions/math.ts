import { FunctionMap } from "./index";
import { add, N, fromNumber, lt, zero } from "../decimal";

export const functions: FunctionMap = {
  SUM: {
    description: "Returns the sum of all values in a range.",
    compute: function(...args) {
      return args.flat().reduce(function(a, b) {
        return b instanceof N ? add(a, b) : a;
      }, zero);
    }
  },
  RAND: {
    description: "Returns a random number between 0 and 1",
    compute: function() {
      return fromNumber(Math.random());
    }
  },
  MIN: {
    description: "Returns the minimum value.",
    compute: function(...args) {
      const vals = args.flat();
      let min;
      for (let val of vals) {
        if (val instanceof N) {
          min = min ? (lt(min, val) ? min : val) : val;
        }
      }
      return min;
    }
  },
  MAX: {
    description: "Returns the maximum value.",
    compute: function(...args) {
      const vals = args.flat();
      let max;
      for (let val of vals) {
        if (val instanceof N) {
          max = max ? (lt(max, val) ? val : max) : val;
        }
      }
      return max;
    }
  }
};
