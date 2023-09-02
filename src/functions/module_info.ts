import { _t } from "../translation";
import { AddFunctionDescription, CellValue, Maybe } from "../types";
import { CellErrorType, EvaluationError, NotAvailableError } from "../types/errors";
import { arg } from "./arguments";

// -----------------------------------------------------------------------------
// ISERR
// -----------------------------------------------------------------------------
export const ISERR = {
  description: _t("Whether a value is an error other than #N/A."),
  args: [arg("value (any)", _t("The value to be verified as an error type."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    const isErr = value instanceof EvaluationError;
    const isna = value instanceof NotAvailableError;
    return isErr && !isna;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISERROR
// -----------------------------------------------------------------------------
export const ISERROR = {
  description: _t("Whether a value is an error."),
  args: [arg("value (any)", _t("The value to be verified as an error type."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    return value instanceof EvaluationError;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISLOGICAL
// -----------------------------------------------------------------------------
export const ISLOGICAL = {
  description: _t("Whether a value is `true` or `false`."),
  args: [arg("value (any)", _t("The value to be verified as a logical TRUE or FALSE."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    return typeof value === "boolean";
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISNA
// -----------------------------------------------------------------------------
export const ISNA = {
  description: _t("Whether a value is the error #N/A."),
  args: [arg("value (any)", _t("The value to be verified as an error type."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    return value instanceof EvaluationError && value.errorType === CellErrorType.NotAvailable;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISNONTEXT
// -----------------------------------------------------------------------------
export const ISNONTEXT = {
  description: _t("Whether a value is non-textual."),
  args: [arg("value (any)", _t("The value to be checked."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    return typeof value !== "string";
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISNUMBER
// -----------------------------------------------------------------------------

export const ISNUMBER = {
  description: _t("Whether a value is a number."),
  args: [arg("value (any)", _t("The value to be verified as a number."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    return typeof value === "number";
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISTEXT
// -----------------------------------------------------------------------------
export const ISTEXT = {
  description: _t("Whether a value is text."),
  args: [arg("value (any)", _t("The value to be verified as text."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    return typeof value === "string";
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISBLANK
// -----------------------------------------------------------------------------
export const ISBLANK = {
  description: _t("Whether the referenced cell is empty"),
  args: [arg("value (any)", _t("Reference to the cell that will be checked for emptiness."))],
  returns: ["BOOLEAN"],
  compute: function (value: Maybe<CellValue>): boolean {
    return value === null;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NA
// -----------------------------------------------------------------------------
export const NA = {
  description: _t("Returns the error value #N/A."),
  args: [],
  returns: ["BOOLEAN"],
  compute: function (): never {
    throw new NotAvailableError();
  },
  isExported: true,
} satisfies AddFunctionDescription;
