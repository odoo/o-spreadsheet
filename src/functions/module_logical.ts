import { args } from "./arguments";
import { FunctionDescription } from "./index";

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

export const AND: FunctionDescription = {
  description: "Returns true if all the arguments are true, false otherwise.",
  args: args`logicalPart (boolean,repeating) logical part`,
  returns: ["BOOLEAN"],
  compute: function(...args: boolean[]): boolean {
    return args.reduce((a, b) => a && b, true);
  }
};

export const OR: FunctionDescription = {
  description: "Returns true if at least one of the arguments are true, false otherwise.",
  args: args`logicalPart (boolean,repeating) logical part`,
  returns: ["BOOLEAN"],
  compute: function(...args: boolean[]): boolean {
    return args.reduce((a, b) => a || b, false);
  }
};

export const XOR: FunctionDescription = {
  description: "Returns true if an odd number of the provided arguments are true, false otherwise.",
  args: args`logicalPart (boolean,repeating) logical part`,
  returns: ["BOOLEAN"],
  compute: function(...args: boolean[]): boolean {
    return args.filter(a => a).length % 2 !== 0;
  }
};

export const NOT: FunctionDescription = {
  description: "Returns true if the argument is false, false otherwise.",
  args: args`XXX (boolean) logical part`,
  returns: ["BOOLEAN"],
  compute: function(value: boolean): boolean {
    return !value;
  }
};

export const IF: FunctionDescription = {
  description: "Returns the second argument if the first one is true, the third otherwise.",
  args: args`
      condition (boolean) logical part
      valueTrue (any) the value of the cell if the condition is true
      valueFalse (any) the value of the cell if the condition is false
    `,
  returns: ["ANY"],
  compute: function(condition: boolean, valueTrue: any, valueFalse: any): any {
    return condition ? valueTrue : valueFalse;
  }
};
