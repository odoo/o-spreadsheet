import { FunctionMap } from "./functions";

export const functions: FunctionMap = {
  WAIT: {
    description: "Wait",
    compute: function(...args) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(args[0]);
        }, 2000);
      });
    },
    async: true,
    args: [{ name: "ms", description: "wait time in milliseconds", type: ["NUMBER", "CELL"] }],
    returns: ["ANY"]
  },
  AND: {
    description: "Returns true if all the arguments are true, false otherwise.",
    compute: function(...args) {
      return Boolean(args.flat().reduce((a, b) => a && b, true));
    },
    args: [
      {
        repeating: true,
        name: "logicalPart",
        description: "logical part",
        type: ["BOOLEAN", "CELL"]
      }
    ],
    returns: ["BOOLEAN"]
  },
  OR: {
    description: "Returns true if at least one of the arguments are true, false otherwise.",
    compute: function(...args) {
      return Boolean(args.flat().reduce((a, b) => a || b, false));
    },
    args: [
      {
        repeating: true,
        name: "logicalPart",
        description: "logical part",
        type: ["BOOLEAN", "CELL"]
      }
    ],
    returns: ["BOOLEAN"]
  },
  XOR: {
    description:
      "Returns true if an odd number of the provided arguments are true, false otherwise.",
    compute: function(...args) {
      return Boolean(args.flat().filter(a => a).length % 2 !== 0);
    },
    args: [
      {
        repeating: true,
        name: "logicalPart",
        description: "logical part",
        type: ["BOOLEAN", "CELL"]
      }
    ],
    returns: ["BOOLEAN"]
  },
  NOT: {
    description: "Returns true if the argument is false, false otherwise.",
    compute: function(...args) {
      return Boolean(!args[0]);
    },
    args: [{ name: "XXX", description: "logical part", type: ["BOOLEAN", "CELL"] }],
    returns: ["BOOLEAN"]
  },
  IF: {
    description: "Returns the second argument if the first one is true, the third otherwise.",
    compute: function(condition, valueTrue, valueFalse) {
      return condition ? valueTrue : valueFalse;
    },
    args: [
      { name: "condition", description: "logical part", type: ["BOOLEAN", "CELL"] },
      {
        name: "valueTrue",
        description: "the value of the cell if the condition is true",
        type: ["ANY"]
      },
      {
        name: "valueFalse",
        description: "the value of the cell if the condition is true",
        type: ["ANY"]
      }
    ],
    returns: ["ANY"]
  }
};
