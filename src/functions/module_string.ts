import { args } from "./arguments";
import { FunctionMap } from "./index";

export const functions: FunctionMap = {
  CONCAT: {
    description: "Concatenation of two values",
    args: args`
        value1 (string)
        value2 (string)
    `,
    returns: ["STRING"],
    compute: function(value1: string, value2: string): string {
      return value1 + value2;
    }
  }
};
