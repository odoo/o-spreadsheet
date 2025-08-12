import { getFullReference, splitReference } from "../helpers";
import { setXcToFixedReferenceType } from "../helpers/reference_type";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  CellValueType,
  FunctionResultObject,
  Matrix,
  Maybe,
} from "../types";
import { CellErrorType, EvaluationError } from "../types/errors";
import { arg } from "./arguments";
import { isEvaluationError, toString } from "./helpers";

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
    arg("reference (meta, range<meta>)", _t("The reference to the cell.")),
  ],
  compute: function (info: Maybe<FunctionResultObject>, reference: Matrix<{ value: string }>) {
    const _info = toString(info).toLowerCase();
    if (!CELL_INFO_TYPES.map((type) => type.value).includes(_info)) {
      return new EvaluationError(
        _t("The info_type should be one of %s.", CELL_INFO_TYPES.join(", "))
      );
    }

    const sheetId = this.__originSheetId;
    const _reference = reference[0][0].value;
    let { sheetName, xc } = splitReference(_reference);
    // only put the sheet name if the referenced range is in another sheet than the cell the formula is on
    sheetName = sheetName === this.getters.getSheetName(sheetId) ? undefined : sheetName;
    const fixedRef = getFullReference(sheetName, setXcToFixedReferenceType(xc, "colrow"));
    const range = this.getters.getRangeFromSheetXC(sheetId, fixedRef);

    switch (_info) {
      case "address":
        return this.getters.getRangeString(range, sheetId);
      case "col":
        return range.zone.left + 1;
      case "contents": {
        const position = { sheetId: range.sheetId, col: range.zone.left, row: range.zone.top };
        return this.getters.getEvaluatedCell(position).value;
      }
      case "format": {
        const position = { sheetId: range.sheetId, col: range.zone.left, row: range.zone.top };
        return this.getters.getEvaluatedCell(position).format || "";
      }
      case "row":
        return range.zone.top + 1;
      case "type": {
        const position = { sheetId: range.sheetId, col: range.zone.left, row: range.zone.top };
        const type = this.getters.getEvaluatedCell(position).type;
        if (type === CellValueType.empty) {
          return "b"; // blank
        } else if (type === CellValueType.text) {
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
