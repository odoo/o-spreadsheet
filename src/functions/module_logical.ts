import { args, toBoolean } from "./arguments";
import { FunctionDescription } from "./index";

// -----------------------------------------------------------------------------
// WAIT
// -----------------------------------------------------------------------------
export const WAIT: FunctionDescription = {
  description: "Wait",
  args: args`ms (number) wait time in milliseconds`,
  returns: ["ANY"],
  async: true,
  compute: function(delay) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve(delay);
      }, delay);
    });
  }
};

// -----------------------------------------------------------------------------
// AND
// -----------------------------------------------------------------------------
export const AND: FunctionDescription = {
  description: "Returns true if all the arguments are true, false otherwise.",
  args: args`logicalPart (boolean,repeating) logical part`,
  returns: ["BOOLEAN"],
  compute: function(...args: boolean[]): boolean {
    return args.reduce((a, b) => a && toBoolean(b), true);
  }
};

// -----------------------------------------------------------------------------
// IF
// -----------------------------------------------------------------------------
export const IF: FunctionDescription = {
  description: "Returns the second argument if the first one is true, the third otherwise.",
  args: args`
      condition (boolean) logical part
      valueTrue (any) the value of the cell if the condition is true
      valueFalse (any) the value of the cell if the condition is false
    `,
  returns: ["ANY"],
  compute: function(condition: boolean, valueTrue: any, valueFalse: any): any {
    return toBoolean(condition) ? valueTrue : valueFalse;
  }
};

// -----------------------------------------------------------------------------
// NOT
// -----------------------------------------------------------------------------
export const NOT: FunctionDescription = {
  description: "Returns true if the argument is false, false otherwise.",
  args: args`XXX (boolean) logical part`,
  returns: ["BOOLEAN"],
  compute: function(value: boolean): boolean {
    return !toBoolean(value);
  }
};

// -----------------------------------------------------------------------------
// OR
// -----------------------------------------------------------------------------
export const OR: FunctionDescription = {
  description: "Returns true if at least one of the arguments are true, false otherwise.",
  args: args`logicalPart (boolean,repeating) logical part`,
  returns: ["BOOLEAN"],
  compute: function(...args: boolean[]): boolean {
    return args.reduce((a, b) => a || toBoolean(b), false);
  }
};

// -----------------------------------------------------------------------------
// XOR
// -----------------------------------------------------------------------------
export const XOR: FunctionDescription = {
  description: "Returns true if an odd number of the provided arguments are true, false otherwise.",
  args: args`logicalPart (boolean,repeating) logical part`,
  returns: ["BOOLEAN"],
  compute: function(...args: boolean[]): boolean {
    return args.filter(a => toBoolean(a)).length % 2 !== 0;
  }
};


