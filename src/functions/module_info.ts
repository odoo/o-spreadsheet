import { _t } from "../translation";
import { AddFunctionDescription, PrimitiveArgValue } from "../types";
import { CellErrorType, NotAvailableError } from "../types/errors";
import { arg } from "./arguments";

// -----------------------------------------------------------------------------
// ISERR
// -----------------------------------------------------------------------------
export const ISERR: AddFunctionDescription = {
  description: _t("Whether a value is an error other than #N/A."),
  args: [arg("value (any, lazy)", _t("The value to be verified as an error type."))],
  returns: ["BOOLEAN"],
  compute: function (value: () => PrimitiveArgValue): boolean {
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
  description: _t("Whether a value is an error."),
  args: [arg("value (any, lazy)", _t("The value to be verified as an error type."))],
  returns: ["BOOLEAN"],
  compute: function (value: () => PrimitiveArgValue): boolean {
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
  description: _t("Whether a value is `true` or `false`."),
  args: [arg("value (any, lazy)", _t("The value to be verified as a logical TRUE or FALSE."))],
  returns: ["BOOLEAN"],
  compute: function (value: () => PrimitiveArgValue): boolean {
    try {
      return typeof value() === "boolean";
    } catch (e) {
      return false;
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISNA
// -----------------------------------------------------------------------------
export const ISNA: AddFunctionDescription = {
  description: _t("Whether a value is the error #N/A."),
  args: [arg("value (any, lazy)", _t("The value to be verified as an error type."))],
  returns: ["BOOLEAN"],
  compute: function (value: () => PrimitiveArgValue): boolean {
    try {
      value();
      return false;
    } catch (e) {
      return e?.errorType === CellErrorType.NotAvailable;
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISNONTEXT
// -----------------------------------------------------------------------------
export const ISNONTEXT: AddFunctionDescription = {
  description: _t("Whether a value is non-textual."),
  args: [arg("value (any, lazy)", _t("The value to be checked."))],
  returns: ["BOOLEAN"],
  compute: function (value: () => PrimitiveArgValue): boolean {
    try {
      return typeof value() !== "string";
    } catch (e) {
      return true;
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISNUMBER
// -----------------------------------------------------------------------------

export const ISNUMBER: AddFunctionDescription = {
  description: _t("Whether a value is a number."),
  args: [arg("value (any, lazy)", _t("The value to be verified as a number."))],
  returns: ["BOOLEAN"],
  compute: function (value: () => PrimitiveArgValue): boolean {
    try {
      return typeof value() === "number";
    } catch (e) {
      return false;
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISTEXT
// -----------------------------------------------------------------------------
export const ISTEXT: AddFunctionDescription = {
  description: _t("Whether a value is text."),
  args: [arg("value (any, lazy)", _t("The value to be verified as text."))],
  returns: ["BOOLEAN"],
  compute: function (value: () => PrimitiveArgValue): boolean {
    try {
      return typeof value() === "string";
    } catch (e) {
      return false;
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ISBLANK
// -----------------------------------------------------------------------------
export const ISBLANK: AddFunctionDescription = {
  description: _t("Whether the referenced cell is empty"),
  args: [arg("value (any, lazy)", _t("Reference to the cell that will be checked for emptiness."))],
  returns: ["BOOLEAN"],
  compute: function (value: () => PrimitiveArgValue): boolean {
    try {
      const val = value();
      return val === null;
    } catch (e) {
      return false;
    }
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// NA
// -----------------------------------------------------------------------------
export const NA: AddFunctionDescription = {
  description: _t("Returns the error value #N/A."),
  args: [],
  returns: ["BOOLEAN"],
  compute: function (value: PrimitiveArgValue): boolean {
    throw new NotAvailableError();
  },
  isExported: true,
};
