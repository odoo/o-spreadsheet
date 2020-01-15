import { FunctionMap } from "./index";

export const functions: FunctionMap = {
  AND: {
    description: "Returns true if all the arguments are true, false otherwise.",
    compute: function(...args) {
      return Boolean(args.flat().reduce((a, b) => a && b, true));
    }
  },
  OR: {
    description: "Returns true if at least one of the arguments are true, false otherwise.",
    compute: function(...args) {
      return Boolean(args.flat().reduce((a, b) => a || b, false));
    }
  },
  XOR: {
    description:
      "Returns true if an odd number of the provided arguments are true, false otherwise.",
    compute: function(...args) {
      return Boolean(args.flat().filter(a => a).length % 2 !== 0);
    }
  },
  NOT: {
    description: "Returns true if the argument is false, false otherwise.",
    compute: function(...args) {
      return Boolean(!args[0]);
    }
  },
  IF: {
    description: "Returns the second argument if the first one is true, the third otherwise.",
    compute: function(...args) {
      return args[0] ? args[1] : args[2];
    }
  }
};
