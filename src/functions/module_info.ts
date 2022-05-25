import { _lt } from "../translation";
import { AddFunctionDescription, ArgValue } from "../types";
import { CellErrorType, NotAvailableError } from "../types/errors";
import { args } from "./arguments";

// -----------------------------------------------------------------------------
// ISERR
// -----------------------------------------------------------------------------
export const ISERR: AddFunctionDescription = {
  description: _lt("Whether a value is an error other than #N/A."),
  args: args(`value (any, lazy) ${_lt("The value to be verified as an error type.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: () => ArgValue): boolean {
    try {
      value();
      return false;
    } catch (e) {
      return e?.errorType != CellErrorType.NotAvailable;
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISERROR
// -----------------------------------------------------------------------------
export const ISERROR: AddFunctionDescription = {
  description: _lt("Whether a value is an error."),
  args: args(`value (any, lazy) ${_lt("The value to be verified as an error type.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: () => ArgValue): boolean {
    try {
      value();
      return false;
    } catch (e) {
      return true;
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISLOGICAL
// -----------------------------------------------------------------------------
export const ISLOGICAL: AddFunctionDescription = {
  description: _lt("Whether a value is `true` or `false`."),
  args: args(`value (any) ${_lt("The value to be verified as a logical TRUE or FALSE.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: ArgValue): boolean {
    return typeof value === "boolean";
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISNA
// -----------------------------------------------------------------------------
export const ISNA: AddFunctionDescription = {
  description: _lt("Whether a value is the error #N/A."),
  args: args(`value (any, lazy) ${_lt("The value to be verified as an error type.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: () => ArgValue): boolean {
    try {
      value();
      return false;
    } catch (e) {
      return e?.errorType == CellErrorType.NotAvailable;
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISNONTEXT
// -----------------------------------------------------------------------------
export const ISNONTEXT: AddFunctionDescription = {
  description: _lt("Whether a value is non-textual."),
  args: args(`value (any) ${_lt("The value to be checked.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: ArgValue): boolean {
    return typeof value !== "string";
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISNUMBER
// -----------------------------------------------------------------------------

export const ISNUMBER: AddFunctionDescription = {
  description: _lt("Whether a value is a number."),
  args: args(`value (any) ${_lt("The value to be verified as a number.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: ArgValue): boolean {
    return typeof value === "number";
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISTEXT
// -----------------------------------------------------------------------------
export const ISTEXT: AddFunctionDescription = {
  description: _lt("Whether a value is text."),
  args: args(`value (any) ${_lt("The value to be verified as text.")}`),
  returns: ["BOOLEAN"],
  compute: function (value: ArgValue): boolean {
    return typeof value === "string";
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// NA
// -----------------------------------------------------------------------------
export const NA: AddFunctionDescription = {
  description: _lt("Returns the error value #N/A."),
  args: args(``),
  returns: ["BOOLEAN"],
  compute: function (value: ArgValue): boolean {
    throw new NotAvailableError();
  },
  isExported: true,
};
