import { args } from "./arguments";
import { toString } from "./helpers";
import { FunctionDescription } from "./index";

// -----------------------------------------------------------------------------
// CONCAT
// -----------------------------------------------------------------------------
export const CONCAT: FunctionDescription = {
  description: "Concatenation of two values",
  args: args`
        value1 (string)
        value2 (string)
    `,
  returns: ["STRING"],
  compute: function(value1: string, value2: string): string {
    return toString(value1) + toString(value2);
  }
};
