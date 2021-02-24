import { _lt } from "../translation";
import { FunctionDescription } from "../types";
import { args } from "./arguments";

// -----------------------------------------------------------------------------
// ISERROR
// -----------------------------------------------------------------------------
export const ISERROR: FunctionDescription = {
  description: _lt("Whether a value is an error."),
  args: args(`value (any, lazy) ${_lt("The value to be verified as an error type.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: () => any): boolean {
    try {
      value();
      return false;
    } catch (e) {
      return true;
    }
  },
};

// -----------------------------------------------------------------------------
// ISLOGICAL
// -----------------------------------------------------------------------------
export const ISLOGICAL: FunctionDescription = {
  description: _lt("Whether a value is `true` or `false`."),
  args: args(`value (any) ${_lt("The value to be verified as a logical TRUE or FALSE.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: any): boolean {
    return typeof value === "boolean";
  },
};

// -----------------------------------------------------------------------------
// ISNONTEXT
// -----------------------------------------------------------------------------
export const ISNONTEXT: FunctionDescription = {
  description: _lt("Whether a value is non-textual."),
  args: args(`value (any) ${_lt("The value to be checked.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: any): boolean {
    return typeof value !== "string";
  },
};

// -----------------------------------------------------------------------------
// ISNUMBER
// -----------------------------------------------------------------------------

export const ISNUMBER: FunctionDescription = {
  description: _lt("Whether a value is a number."),
  args: args(`value (any) ${_lt("The value to be verified as a number.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: any): boolean {
    return typeof value === "number";
  },
};

// -----------------------------------------------------------------------------
// ISTEXT
// -----------------------------------------------------------------------------
export const ISTEXT: FunctionDescription = {
  description: _lt("Whether a value is text."),
  args: args(`value (any) ${_lt("The value to be verified as text.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: any): boolean {
    return typeof value === "string";
  },
};
