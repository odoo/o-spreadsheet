import { FunctionMap, args } from "./functions";

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
    args: args`ms (number,cell) wait time in milliseconds`,
    returns: ["ANY"]
  },
  AND: {
    description: "Returns true if all the arguments are true, false otherwise.",
    compute: function(...args) {
      return Boolean(args.flat().reduce((a, b) => a && b, true));
    },
    args: args`logicalPart (boolean,cell,repeating) logical part`,
    returns: ["BOOLEAN"]
  },
  OR: {
    description: "Returns true if at least one of the arguments are true, false otherwise.",
    compute: function(...args) {
      return Boolean(args.flat().reduce((a, b) => a || b, false));
    },
    args: args`logicalPart (boolean,cell,repeating) logical part`,
    returns: ["BOOLEAN"]
  },
  XOR: {
    description:
      "Returns true if an odd number of the provided arguments are true, false otherwise.",
    compute: function(...args) {
      return Boolean(args.flat().filter(a => a).length % 2 !== 0);
    },
    args: args`logicalPart (boolean,cell,repeating) logical part`,
    returns: ["BOOLEAN"]
  },
  NOT: {
    description: "Returns true if the argument is false, false otherwise.",
    compute: function(...args) {
      return Boolean(!args[0]);
    },
    args: args`XXX (boolean,cell) logical part`,
    returns: ["BOOLEAN"]
  },
  IF: {
    description: "Returns the second argument if the first one is true, the third otherwise.",
    compute: function(condition, valueTrue, valueFalse) {
      return condition ? valueTrue : valueFalse;
    },
    args: args`
      condition (boolean,cell) logical part
      valueTrue (any) the value of the cell if the condition is true
      valueFalse (any) the value of the cell if the condition is false
    `,
    returns: ["ANY"]
  }
};
