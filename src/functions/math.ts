import { Arg, FunctionMap } from "./index";

let anyNumberArgs: Arg[] = [
  { name: "number", description: "", type: ["NUMBER", "CELL", "RANGE"] },
  {
    name: "numbers",
    description: "",
    type: ["NUMBER", "CELL", "RANGE"],
    optional: true,
    repeating: true
  }
];

function toNumber(n: any) {
  return typeof n === "number" ? n : 0;
}

export const functions: FunctionMap = {
  SUM: {
    description: "Returns the sum of all values in a range.",
    compute: function(...args) {
      return args.flat().reduce((a, b) => a + toNumber(b), 0);
    },
    args: anyNumberArgs,
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
    args: anyNumberArgs,
    returns: ["NUMBER"]
  },
  MAX: {
    description: "Returns the maximum value.",
    compute: function(...args) {
      return Math.max(...args);
    },
    args: anyNumberArgs,
    returns: ["NUMBER"]
  }
};
