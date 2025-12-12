import { toXC } from "../helpers/coordinates";
import { _t } from "../translation";
import { CellErrorType, EvaluationError } from "../types/errors";
import { AddFunctionDescription } from "../types/functions";
import { Arg, FunctionResultObject, Maybe } from "../types/misc";
import { arg } from "./arguments";
import { isEvaluationError, toMatrix, toString } from "./helpers";

// -----------------------------------------------------------------------------
// CELL
// -----------------------------------------------------------------------------
// NOTE: missing from Excel: "color", "filename", "parentheses", "prefix", "protect" and "width"
const CELL_INFO_TYPES = [
  {
    value: "address",
    label: _t("Returns an absolute reference as plain text of the top left cell in reference."),
  },
  { value: "col", label: _t("Returns the column number of the cell in reference.") },
  {
    value: "contents",
    label: _t("Returns the value contained in the top left cell in reference."),
  },
  { value: "format", label: _t("Returns the format of the top left cell in reference.") },
  { value: "row", label: _t("Returns the row number of the top left cell in reference.") },
  {
    value: "type",
    label: _t(
      'Returns the type of data in the cell in reference. The following values are returned: "b" for a blank cell, "l" (for label) if the cell contains plain text, and "v" (for value) if the cell contains any other type of data.'
    ),
  },
];

export const CELL = {
  description: _t("Gets information about a cell."),
  args: [
    arg("info_type (string)", _t("The type of information requested."), CELL_INFO_TYPES),
    arg("reference (any, range<any>)", _t("The reference to the cell.")),
  ],
  compute: function (info: Maybe<FunctionResultObject>, reference: Arg) {
    const _info = toString(info).toLowerCase();
    if (!CELL_INFO_TYPES.map((type) => type.value).includes(_info)) {
      return new EvaluationError(
        _t("The info_type should be one of %s.", CELL_INFO_TYPES.join(", "))
      );
    }

    const firstReference = toMatrix(reference)[0][0];
    const position = firstReference.position;
    if (position === undefined) {
      return new EvaluationError(_t("The reference is invalid."));
    }

    switch (_info) {
      case "address":
        const sheetName =
          this.__originSheetId === position.sheetId
            ? ""
            : this.getters.getSheetName(position.sheetId) + "!";
        return sheetName + toXC(position.col, position.row, { colFixed: true, rowFixed: true });
      case "col":
        return position.col + 1;
      case "contents": {
        return firstReference.value;
      }
      case "format": {
        return firstReference.format || "";
      }
      case "row":
        return position.row + 1;
      case "type": {
        if (firstReference.type === "empty") {
          return "b"; // blank
        } else if (firstReference.type === "text") {
          return "l"; // label
        } else {
          return "v"; // value
        }
      }
    }

    return "";
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISERR
// -----------------------------------------------------------------------------
export const ISERR = {
  description: _t("Whether a value is an error other than #N/A."),
  args: [arg("value (any)", _t("The value to be verified as an error type."))],
  compute: function (data: Maybe<FunctionResultObject>): boolean {
    const value = data?.value;
    return isEvaluationError(value) && value !== CellErrorType.NotAvailable;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISERROR
// -----------------------------------------------------------------------------
export const ISERROR = {
  description: _t("Whether a value is an error."),
  args: [arg("value (any)", _t("The value to be verified as an error type."))],
  compute: function (data: Maybe<FunctionResultObject>): boolean {
    const value = data?.value;
    return isEvaluationError(value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISLOGICAL
// -----------------------------------------------------------------------------
export const ISLOGICAL = {
  description: _t("Whether a value is `true` or `false`."),
  args: [arg("value (any)", _t("The value to be verified as a logical TRUE or FALSE."))],
  compute: function (value: Maybe<FunctionResultObject>): boolean {
    return typeof value?.value === "boolean";
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISNA
// -----------------------------------------------------------------------------
export const ISNA = {
  description: _t("Whether a value is the error #N/A."),
  args: [arg("value (any)", _t("The value to be verified as an error type."))],
  compute: function (data: Maybe<FunctionResultObject>): boolean {
    return data?.value === CellErrorType.NotAvailable;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISNONTEXT
// -----------------------------------------------------------------------------
export const ISNONTEXT = {
  description: _t("Whether a value is non-textual."),
  args: [arg("value (any)", _t("The value to be checked."))],
  compute: function (value: Maybe<FunctionResultObject>): boolean {
    return !ISTEXT.compute.bind(this)(value);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISNUMBER
// -----------------------------------------------------------------------------

export const ISNUMBER = {
  description: _t("Whether a value is a number."),
  args: [arg("value (any)", _t("The value to be verified as a number."))],
  compute: function (value: Maybe<FunctionResultObject>): boolean {
    return typeof value?.value === "number";
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISTEXT
// -----------------------------------------------------------------------------
export const ISTEXT = {
  description: _t("Whether a value is text."),
  args: [arg("value (any)", _t("The value to be verified as text."))],
  compute: function (value: Maybe<FunctionResultObject>): boolean {
    return typeof value?.value === "string" && isEvaluationError(value?.value) === false;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ISBLANK
// -----------------------------------------------------------------------------
export const ISBLANK = {
  description: _t("Whether the referenced cell is empty"),
  args: [arg("value (any)", _t("Reference to the cell that will be checked for emptiness."))],
  compute: function (value: Maybe<FunctionResultObject>): boolean {
    return value?.value === null;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NA
// -----------------------------------------------------------------------------
export const NA = {
  description: _t("Returns the error value #N/A."),
  args: [],
  compute: function (): FunctionResultObject {
    return { value: CellErrorType.NotAvailable };
  },
  isExported: true,
} satisfies AddFunctionDescription;
