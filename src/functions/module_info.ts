import { args } from "./arguments";
import { FunctionDescription } from "./index";

// -----------------------------------------------------------------------------
// ISLOGICAL
// -----------------------------------------------------------------------------
export const ISLOGICAL: FunctionDescription = {
  description: "Whether a value is `true` or `false`.",
  args: args`value (any) The value to be verified as a logical TRUE or FALSE.`,
  returns: ["BOOLEAN"],
  compute: function (value: any): boolean {
    return typeof value === "boolean";
  },
};

// -----------------------------------------------------------------------------
// ISNONTEXT
// -----------------------------------------------------------------------------
export const ISNONTEXT: FunctionDescription = {
  description: "Whether a value is non-textual.",
  args: args`value (any) The value to be checked.`,
  returns: ["BOOLEAN"],
  compute: function (value: any): boolean {
    return typeof value !== "string";
  },
};

// -----------------------------------------------------------------------------
// ISNUMBER
// -----------------------------------------------------------------------------
export const ISNUMBER: FunctionDescription = {
  description: "Whether a value is a number.",
  args: args`value (any) The value to be verified as a number.`,
  returns: ["BOOLEAN"],
  compute: function (value: any): boolean {
    return typeof value === "number";
  },
};

// -----------------------------------------------------------------------------
// ISTEXT
// -----------------------------------------------------------------------------
export const ISTEXT: FunctionDescription = {
  description: "Whether a value is text.",
  args: args`value (any) The value to be verified as text.`,
  returns: ["BOOLEAN"],
  compute: function (value: any): boolean {
    return typeof value === "string";
  },
};
