import { getPivotTooBigErrorMessage } from "../components/translations_terms";
import { PIVOT_MAX_NUMBER_OF_CELLS } from "../constants";
import { getFullReference } from "../helpers/";
import { toXC } from "../helpers/coordinates";
import { isFormula } from "../helpers/misc";
import {
  addAlignFormatToPivotHeader,
  getPivotStyleFromFnArgs,
} from "../helpers/pivot/pivot_helpers";
import { _t } from "../translation";
import {
  CellErrorType,
  EvaluationError,
  InvalidReferenceError,
  NotAvailableError,
} from "../types/errors";
import { AddFunctionDescription } from "../types/functions";
import { Arg, FunctionResultObject, Maybe } from "../types/misc";
import { arg } from "./arguments";
import { generateMimicMatrix, MimicMatrix, toMimicMatrix } from "./helper_arg";
import { expectNumberGreaterThanOrEqualToOne } from "./helper_assert";
import {
  addPivotDependencies,
  assertDomainLength,
  assertMeasureExist,
  getPivotId,
} from "./helper_lookup";
import {
  dichotomicSearch,
  expectNumberRangeError,
  expectReferenceError,
  linearSearch,
  LinearSearchMode,
  strictToInteger,
  toBoolean,
  toNumber,
  toString,
  valueNotAvailable,
} from "./helpers";

const DEFAULT_IS_SORTED = true;
const DEFAULT_MATCH_MODE = 0;
const DEFAULT_SEARCH_MODE = 1;
const DEFAULT_ABSOLUTE_RELATIVE_MODE = 1;

const A1_NOTATION_OPTIONS = [
  { value: true, label: _t("A1 style (default)") },
  { value: false, label: _t("R1C1 style") },
];

const IS_SORTED_OPTIONS = [
  { value: true, label: _t("Approximate match (default)") },
  { value: false, label: _t("Exact match") },
];
// -----------------------------------------------------------------------------
// ADDRESS
// -----------------------------------------------------------------------------

export const ADDRESS = {
  description: _t("Returns a cell reference as a string. "),
  args: [
    arg("row (number)", _t("The row number of the cell reference. ")),
    arg(
      "column (number)",
      _t("The column number (not name) of the cell reference. A is column number 1. ")
    ),
    arg(
      `absolute_relative_mode (number, default=${DEFAULT_ABSOLUTE_RELATIVE_MODE})`,
      _t("An indicator of whether the reference is row/column absolute."),
      [
        { value: 1, label: _t("Absolute row and column (e.g. $A$1)") },
        { value: 2, label: _t("Absolute row, relative column (e.g. A$1)") },
        { value: 3, label: _t("Relative row, absolute column (e.g. $A1)") },
        { value: 4, label: _t("Relative row and column (e.g. A1)") },
      ]
    ),
    arg(
      "use_a1_notation (boolean, default=TRUE)",
      _t("A boolean indicating whether to use A1 style notation or R1C1 style notation."),
      A1_NOTATION_OPTIONS
    ),
    arg(
      "sheet (string, optional)",
      _t("A string indicating the name of the sheet into which the address points.")
    ),
  ],
  compute: function (
    row: Maybe<FunctionResultObject>,
    column: Maybe<FunctionResultObject>,
    absoluteRelativeMode: Maybe<FunctionResultObject> = { value: DEFAULT_ABSOLUTE_RELATIVE_MODE },
    useA1Notation: Maybe<FunctionResultObject> = { value: true },
    sheet: Maybe<FunctionResultObject> | undefined
  ) {
    const rowNumber = strictToInteger(row, this.locale);
    const colNumber = strictToInteger(column, this.locale);
    if (rowNumber < 1) {
      return new EvaluationError(expectNumberGreaterThanOrEqualToOne(rowNumber));
    }
    if (colNumber < 1) {
      return new EvaluationError(expectNumberGreaterThanOrEqualToOne(colNumber));
    }
    const _absoluteRelativeMode = strictToInteger(absoluteRelativeMode, this.locale);
    if (![1, 2, 3, 4].includes(_absoluteRelativeMode)) {
      return new EvaluationError(expectNumberRangeError(1, 4, _absoluteRelativeMode));
    }
    const _useA1Notation = toBoolean(useA1Notation);
    let cellReference: string;
    if (_useA1Notation) {
      const rangePart = {
        rowFixed: [1, 2].includes(_absoluteRelativeMode),
        colFixed: [1, 3].includes(_absoluteRelativeMode),
      };
      cellReference = toXC(colNumber - 1, rowNumber - 1, rangePart);
    } else {
      const rowPart = [1, 2].includes(_absoluteRelativeMode) ? `R${rowNumber}` : `R[${rowNumber}]`;
      const colPart = [1, 3].includes(_absoluteRelativeMode) ? `C${colNumber}` : `C[${colNumber}]`;
      cellReference = rowPart + colPart;
    }
    if (sheet !== undefined) {
      return { value: getFullReference(toString(sheet), cellReference) };
    }
    return { value: cellReference };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COLUMN
// -----------------------------------------------------------------------------

export const COLUMN = {
  description: _t("Column number of a specified cell."),
  args: [
    arg(
      "cell_reference (any, range<any>, default='this cell')",
      _t(
        "The cell whose column number will be returned. Column A corresponds to 1. By default, the function use the cell in which the formula is entered."
      )
    ),
  ],
  compute: function (cellReference: Arg) {
    if (cellReference === undefined) {
      if (this.__originCellPosition === undefined) {
        return new EvaluationError(
          _t(
            "In this context, the function [[FUNCTION_NAME]] needs to have a cell or range in parameter."
          )
        );
      }
      return { value: this.__originCellPosition.col + 1 };
    }
    const _cellReference = toMimicMatrix(cellReference);
    const firstCell = _cellReference.get(0, 0);
    if (firstCell.position === undefined) {
      return new InvalidReferenceError(expectReferenceError);
    }
    const left = firstCell.position.col;
    return generateMimicMatrix(_cellReference.width, 1, (col, row) => {
      return { value: left + col + 1 };
    });
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COLUMNS
// -----------------------------------------------------------------------------

export const COLUMNS = {
  description: _t("Number of columns in a specified array or range."),
  args: [arg("range (any, range<any>)", _t("The range whose column count will be returned."))],
  compute: function (range: Arg) {
    const _range = toMimicMatrix(range);
    if (_range.get(0, 0) === undefined) {
      return new EvaluationError(_t("The range is out of bounds."));
    }
    if (_range.get(0, 0).value === CellErrorType.InvalidReference) {
      return _range.get(0, 0);
    }
    return { value: _range.width };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// HLOOKUP
// -----------------------------------------------------------------------------

export const HLOOKUP = {
  description: _t("Horizontal lookup"),
  args: [
    arg(
      "search_key (string, number, boolean)",
      _t("The value to search for. For example, 42, 'Cats', or I24.")
    ),
    arg(
      "range (any, range)",
      _t(
        "The range to consider for the search. The first row in the range is searched for the key specified in search_key."
      )
    ),
    arg(
      "index (number)",
      _t("The row index of the value to be returned, where the first row in range is numbered 1.")
    ),
    arg(
      `is_sorted (boolean, default=${DEFAULT_IS_SORTED})`,
      _t(
        "Indicates whether the row to be searched (the first row of the specified range) is sorted, in which case the closest match for search_key will be returned."
      ),
      IS_SORTED_OPTIONS
    ),
  ],
  compute: function (
    searchKey: Maybe<FunctionResultObject>,
    range: Arg,
    index: Maybe<FunctionResultObject>,
    isSorted: Maybe<FunctionResultObject> = { value: DEFAULT_IS_SORTED }
  ): FunctionResultObject {
    const _index = Math.trunc(toNumber(index?.value, this.locale));
    const _range = toMimicMatrix(range);

    if (1 > _index || _index > _range.height) {
      return new EvaluationError(_t("[[FUNCTION_NAME]] evaluates to an out of bounds range."));
    }

    const getValueFromRange = (r: MimicMatrix, index: number) => r.get(index, 0).value;

    const _isSorted = toBoolean(isSorted.value);
    const colIndex = _isSorted
      ? dichotomicSearch(_range, searchKey, "nextSmaller", "asc", _range.width, getValueFromRange)
      : linearSearch(
          _range,
          searchKey,
          "wildcard",
          _range.width,
          getValueFromRange,
          this.lookupCaches
        );
    if (colIndex === -1) {
      return valueNotAvailable(searchKey);
    }
    return _range.get(colIndex, _index - 1);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// INDEX
// -----------------------------------------------------------------------------
export const INDEX: AddFunctionDescription = {
  description: _t("Returns the content of a cell, specified by row and column offset."),
  args: [
    arg("reference (any, range)", _t("The range of cells from which the values are returned.")),
    arg(
      "row (number, default=0)",
      _t("The index of the row to be returned from within the reference range of cells.")
    ),
    arg(
      "column (number, default=0)",
      _t("The index of the column to be returned from within the reference range of cells.")
    ),
  ],
  compute: function (
    reference: Arg,
    row: Maybe<FunctionResultObject> = { value: 0 },
    column: Maybe<FunctionResultObject> = { value: 0 }
  ) {
    const _reference = toMimicMatrix(reference);
    const _row = toNumber(row.value, this.locale);
    const _column = toNumber(column.value, this.locale);
    if (
      _column < 0 ||
      _column - 1 >= _reference.width ||
      _row < 0 ||
      _row - 1 >= _reference.height
    ) {
      return new EvaluationError(_t("Index out of range."));
    }
    if (_row === 0 && _column === 0) {
      return _reference;
    }
    if (_row === 0) {
      return _reference.getCol(_column - 1);
    }
    if (_column === 0) {
      return _reference.getRow(_row - 1);
    }
    return _reference.get(_column - 1, _row - 1);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// INDIRECT
// -----------------------------------------------------------------------------
export const INDIRECT: AddFunctionDescription = {
  description: _t("Returns the content of a cell, specified by a string."),
  args: [
    arg("reference (string)", _t("The range of cells from which the values are returned.")),
    arg(
      "use_a1_notation (boolean, default=TRUE)",
      _t(
        "A boolean indicating whether to use A1 style notation (TRUE) or R1C1 style notation (FALSE)."
      ),
      A1_NOTATION_OPTIONS
    ),
  ],
  compute: function (
    reference: Maybe<FunctionResultObject>,
    useA1Notation: Maybe<FunctionResultObject> = { value: true }
  ) {
    const _reference = reference?.value?.toString();
    if (!_reference) {
      return new InvalidReferenceError(_t("Reference should be defined."));
    }
    const _useA1Notation = toBoolean(useA1Notation);
    if (!_useA1Notation) {
      return new EvaluationError(_t("R1C1 notation is not supported."));
    }
    const sheetId = this.__originSheetId;

    const range = this.getters.getRangeFromSheetXC(sheetId, _reference);
    if (range === undefined || range.invalidXc || range.invalidSheetName) {
      return new InvalidReferenceError();
    }

    return this.getRange(range.zone, range.sheetId);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LOOKUP
// -----------------------------------------------------------------------------

export const LOOKUP = {
  description: _t("Look up a value."),
  args: [
    arg(
      "search_key (string, number, boolean)",
      _t("The value to search for. For example, 42, 'Cats', or I24.")
    ),
    arg(
      "search_array (any, range)",
      _t(
        "One method of using this function is to provide a single sorted row or column search_array to look through for the search_key with a second argument result_range. The other way is to combine these two arguments into one search_array where the first row or column is searched and a value is returned from the last row or column in the array. If search_key is not found, a non-exact match may be returned."
      )
    ),
    arg(
      "result_range (any, range, optional)",
      _t(
        "The range from which to return a result. The value returned corresponds to the location where search_key is found in search_range. This range must be only a single row or column and should not be used if using the search_result_array method."
      )
    ),
  ],
  compute: function (searchKey: Maybe<FunctionResultObject>, searchArray: Arg, resultRange: Arg) {
    const _searchArray = toMimicMatrix(searchArray);
    const _resultRange = toMimicMatrix(resultRange);

    let nbCol = _searchArray.width;
    let nbRow = _searchArray.height;

    const verticalSearch = nbRow >= nbCol;
    const getElement = verticalSearch
      ? (range: MimicMatrix, index: number) => range.get(0, index).value
      : (range: MimicMatrix, index: number) => range.get(index, 0).value;
    const rangeLength = verticalSearch ? nbRow : nbCol;
    const index = dichotomicSearch(
      _searchArray,
      searchKey,
      "nextSmaller",
      "asc",
      rangeLength,
      getElement
    );

    if (
      index === -1 ||
      (verticalSearch && _searchArray.get(0, index) === undefined) ||
      (!verticalSearch && _searchArray.get(index, nbRow - 1) === undefined)
    ) {
      return valueNotAvailable(searchKey);
    }

    if (_resultRange.height === 0) {
      return verticalSearch
        ? _searchArray.get(nbCol - 1, index)
        : _searchArray.get(index, nbRow - 1);
    }

    nbCol = _resultRange.width;
    nbRow = _resultRange.height;
    if (nbCol !== 1 && nbRow !== 1) {
      return new EvaluationError(_t("The result_range must be a single row or a single column."));
    }

    if (nbCol > 1) {
      if (index > nbCol - 1) {
        return new EvaluationError(
          _t("[[FUNCTION_NAME]] evaluates to an out of range row value %s.", index + 1)
        );
      }
      return _resultRange.get(index, 0);
    }

    if (index > nbRow - 1) {
      return new EvaluationError(
        _t("[[FUNCTION_NAME]] evaluates to an out of range column value %s.", index + 1)
      );
    }
    return _resultRange.get(0, index);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MATCH
// -----------------------------------------------------------------------------
const DEFAULT_SEARCH_TYPE = 1;
export const MATCH = {
  description: _t("Position of item in range that matches value."),
  args: [
    arg(
      "search_key (string, number, boolean)",
      _t("The value to search for. For example, 42, 'Cats', or I24.")
    ),
    arg("range (any, range)", _t("The one-dimensional array to be searched.")),
    arg(
      `search_type (number, default=${DEFAULT_SEARCH_TYPE})`,
      _t(
        "The search method is a number 1, 0 or -1 indicating which value to return. 1 finds the largest value less than or equal to search_key when range is sorted in ascending order. 0 finds the exact value when range is unsorted. -1 finds the smallest value greater than or equal to search_key when range is sorted in descending order."
      ),
      [
        { value: 1, label: _t("Ascending order (default)") },
        { value: 0, label: _t("Exact match") },
        { value: -1, label: _t("Descending order") },
      ]
    ),
  ],
  compute: function (
    searchKey: Maybe<FunctionResultObject>,
    range: Arg,
    searchType: Maybe<FunctionResultObject> = { value: DEFAULT_SEARCH_TYPE }
  ) {
    let _searchType = toNumber(searchType, this.locale);
    const _range = toMimicMatrix(range);
    const nbCol = _range.width;
    const nbRow = _range.height;

    if (nbCol !== 1 && nbRow !== 1) {
      return new EvaluationError(_t("The range must be a single row or a single column."));
    }

    let index = -1;

    const getElement =
      nbCol === 1
        ? (_range: MimicMatrix, index: number) => _range.get(0, index).value
        : (_range: MimicMatrix, index: number) => _range.get(index, 0).value;

    const rangeLen = nbCol === 1 ? _range.height : _range.width;
    _searchType = Math.sign(_searchType);
    switch (_searchType) {
      case 1:
        index = dichotomicSearch(_range, searchKey, "nextSmaller", "asc", rangeLen, getElement);
        break;
      case 0:
        index = linearSearch(
          _range,
          searchKey,
          "wildcard",
          rangeLen,
          getElement,
          this.lookupCaches
        );
        break;
      case -1:
        index = dichotomicSearch(_range, searchKey, "nextGreater", "desc", rangeLen, getElement);
        break;
    }
    if (
      (nbCol === 1 && (index < 0 || index >= _range.height)) ||
      (nbCol !== 1 && (index < 0 || index >= _range.width))
    ) {
      return valueNotAvailable(searchKey);
    }
    return { value: index + 1 };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ROW
// -----------------------------------------------------------------------------

export const ROW = {
  description: _t("Row number of a specified cell."),
  args: [
    arg(
      "cell_reference (any, range<any>, default='this cell')",
      _t(
        "The cell whose row number will be returned. By default, this function uses the cell in which the formula is entered."
      )
    ),
  ],
  compute: function (cellReference: Arg) {
    if (cellReference === undefined) {
      if (this.__originCellPosition?.row === undefined) {
        return new EvaluationError(
          _t(
            "In this context, the function [[FUNCTION_NAME]] needs to have a cell or range in parameter."
          )
        );
      }
      return { value: this.__originCellPosition.row + 1 };
    }
    const _cellReference = toMimicMatrix(cellReference);
    const firstCell = _cellReference.get(0, 0);
    if (firstCell.position === undefined) {
      return new InvalidReferenceError(expectReferenceError);
    }
    const top = firstCell.position.row;

    return generateMimicMatrix(1, _cellReference.height, (col, row) => {
      return { value: top + row + 1 };
    });
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ROWS
// -----------------------------------------------------------------------------

export const ROWS = {
  description: _t("Number of rows in a specified array or range."),
  args: [arg("range (any, range<any>)", _t("The range whose row count will be returned."))],
  compute: function (range: Arg) {
    const _range = toMimicMatrix(range);
    if (_range.get(0, 0).value === CellErrorType.InvalidReference) {
      return _range.get(0, 0);
    }
    return { value: _range.height };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VLOOKUP
// -----------------------------------------------------------------------------

export const VLOOKUP = {
  description: _t("Vertical lookup."),
  args: [
    arg(
      "search_key (string, number, boolean)",
      _t("The value to search for. For example, 42, 'Cats', or I24.")
    ),
    arg(
      "range (any, range)",
      _t(
        "The range to consider for the search. The first column in the range is searched for the key specified in search_key."
      )
    ),
    arg(
      "index (number)",
      _t(
        "The column index of the value to be returned, where the first column in range is numbered 1."
      )
    ),
    arg(
      `is_sorted (boolean, default=${DEFAULT_IS_SORTED})`,
      _t(
        "Indicates whether the column to be searched (the first column of the specified range) is sorted, in which case the closest match for search_key will be returned."
      ),
      IS_SORTED_OPTIONS
    ),
  ],
  compute: function (
    searchKey: Maybe<FunctionResultObject>,
    range: Arg,
    index: Maybe<FunctionResultObject>,
    isSorted: Maybe<FunctionResultObject> = { value: DEFAULT_IS_SORTED }
  ): FunctionResultObject {
    const _index = Math.trunc(toNumber(index?.value, this.locale));
    const _range = toMimicMatrix(range);
    if (1 > _index || _index > _range.width) {
      return new EvaluationError(_t("[[FUNCTION_NAME]] evaluates to an out of bounds range."));
    }

    const getValueFromRange = (range: MimicMatrix, index: number) => range.get(0, index).value;

    const _isSorted = toBoolean(isSorted.value);
    const rowIndex = _isSorted
      ? dichotomicSearch(_range, searchKey, "nextSmaller", "asc", _range.height, getValueFromRange)
      : linearSearch(
          _range,
          searchKey,
          "wildcard",
          _range.height,
          getValueFromRange,
          this.lookupCaches
        );

    if (rowIndex === -1) {
      return valueNotAvailable(searchKey);
    }
    return _range.get(_index - 1, rowIndex);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// XLOOKUP
// -----------------------------------------------------------------------------

const MATCH_MODE: { [mode: number]: LinearSearchMode } = {
  "0": "strict",
  "1": "nextGreater",
  "-1": "nextSmaller",
  "2": "wildcard",
};

export const XLOOKUP = {
  description: _t(
    "Search a range for a match and return the corresponding item from a second range."
  ),
  args: [
    arg("search_key (string,number,boolean)", _t("The value to search for.")),
    arg(
      "lookup_range (any, range)",
      _t("The range to consider for the search. Should be a single column or a single row.")
    ),
    arg(
      "return_range (any, range)",
      _t("The range containing the return value. Should have the same dimensions as lookup_range.")
    ),
    arg("if_not_found (any, optional)", _t("If a valid match is not found, return this value.")),
    arg(
      `match_mode (any, default=${DEFAULT_MATCH_MODE})`,
      _t("Specifies how to match search_key with the items in lookup_range. "),
      [
        { value: 0, label: _t("Exact match (default)") },
        { value: -1, label: _t("Exact match or next smaller item") },
        { value: 1, label: _t("Exact match or next larger item") },
        { value: 2, label: _t("Wildcard character match") },
      ]
    ),
    arg(
      `search_mode (any, default=${DEFAULT_SEARCH_MODE})`,
      _t("Specifies the search mode to use. By default, a first to last search will be used."),
      [
        { value: 1, label: _t("Search first to last (default)") },
        { value: -1, label: _t("Search last to first") },
        { value: 2, label: _t("Binary search (sorted ascending order)") },
        { value: -2, label: _t("Binary search (sorted descending order)") },
      ]
    ),
  ],
  compute: function (
    searchKey: Maybe<FunctionResultObject>,
    lookupRange: Arg,
    returnRange: Arg,
    defaultValue: Maybe<FunctionResultObject>,
    matchMode: Maybe<FunctionResultObject> = { value: DEFAULT_MATCH_MODE },
    searchMode: Maybe<FunctionResultObject> = { value: DEFAULT_SEARCH_MODE }
  ) {
    const _matchMode = Math.trunc(toNumber(matchMode.value, this.locale));
    const _searchMode = Math.trunc(toNumber(searchMode.value, this.locale));
    const _lookupRange = toMimicMatrix(lookupRange);
    const _returnRange = toMimicMatrix(returnRange);
    if (_lookupRange.width !== 1 && _lookupRange.height !== 1) {
      return new EvaluationError(
        _t("lookup_range should be either a single row or single column.")
      );
    }
    if (![1, -1, 2, -2].includes(_searchMode)) {
      return new EvaluationError(_t("search_mode should be a value in [-1, 1, -2, 2]."));
    }
    if (![-1, 0, 1, 2].includes(_matchMode)) {
      return new EvaluationError(_t("match_mode should be a value in [-1, 0, 1, 2]."));
    }

    const lookupDirection = _lookupRange.width === 1 ? "col" : "row";

    if (_matchMode === 2 && [-2, 2].includes(_searchMode)) {
      return new EvaluationError(
        _t("The search and match mode combination is not supported for XLOOKUP evaluation.")
      );
    }

    if (
      lookupDirection === "col"
        ? _returnRange.height !== _lookupRange.height
        : _returnRange.width !== _lookupRange.width
    ) {
      return new EvaluationError(
        _t("return_range should have the same dimensions as lookup_range.")
      );
    }
    const getElement =
      lookupDirection === "col"
        ? (range: MimicMatrix, index: number) => range.get(0, index).value
        : (range: MimicMatrix, index: number) => range.get(index, 0).value;

    const rangeLen = lookupDirection === "col" ? _lookupRange.height : _lookupRange.width;
    const mode = MATCH_MODE[_matchMode];
    const reverseSearch = _searchMode === -1;

    const index =
      _searchMode === 2 || _searchMode === -2
        ? dichotomicSearch(
            _lookupRange,
            searchKey,
            mode as "strict" | "nextGreater" | "nextSmaller",
            _searchMode === 2 ? "asc" : "desc",
            rangeLen,
            getElement
          )
        : linearSearch(
            _lookupRange,
            searchKey,
            mode,
            rangeLen,
            getElement,
            this.lookupCaches,
            reverseSearch
          );

    if (index !== -1) {
      return lookupDirection === "col" ? _returnRange.getRow(index) : _returnRange.getCol(index);
    }
    if (defaultValue === undefined) {
      return valueNotAvailable(searchKey);
    }
    return defaultValue;
  },
  isExported: true,
} satisfies AddFunctionDescription;

//--------------------------------------------------------------------------
// Pivot functions
//--------------------------------------------------------------------------

// PIVOT.VALUE

export const PIVOT_VALUE = {
  description: _t("Get the value from a pivot."),
  args: [
    arg("pivot_id (number,string)", _t("ID of the pivot.")),
    arg("measure_name (string)", _t("Name of the measure.")),
    arg("domain_field_name (string,repeating,optional)", _t("Field name.")),
    arg("domain_value (number,string,boolean,repeating,optional)", _t("Value.")),
  ],
  compute: function (
    formulaId: Maybe<FunctionResultObject>,
    measureName: Maybe<FunctionResultObject>,
    ...domainArgs: Maybe<FunctionResultObject>[]
  ) {
    const _pivotFormulaId = toString(formulaId);
    const _measure = toString(measureName);
    const pivotId = getPivotId(_pivotFormulaId, this.getters);
    assertMeasureExist(pivotId, _measure, this.getters);
    assertDomainLength(domainArgs);
    const pivot = this.getters.getPivot(pivotId);
    const coreDefinition = this.getters.getPivotCoreDefinition(pivotId);

    addPivotDependencies(
      this,
      pivotId,
      coreDefinition.measures.filter((m) => m.id === _measure)
    );
    pivot.init({ reload: pivot.needsReevaluation });
    const error = pivot.assertIsValid({ throwOnError: false });
    if (error) {
      return error;
    }

    if (!pivot.areDomainArgsFieldsValid(domainArgs)) {
      const suggestion = _t(
        "Consider using a dynamic pivot formula: %s. Or re-insert the static pivot from the Data menu.",
        `=PIVOT(${_pivotFormulaId})`
      );
      return {
        value: CellErrorType.GenericError,
        message: _t("Dimensions don't match the pivot definition") + ". " + suggestion,
      };
    }
    const domain = pivot.parseArgsToPivotDomain(domainArgs);
    if (this.getters.getActiveSheetId() === this.__originSheetId) {
      this.getters.getPivotPresenceTracker(pivotId)?.trackValue(_measure, domain);
    }
    return pivot.getPivotCellValueAndFormat(_measure, domain);
  },
} satisfies AddFunctionDescription;

// PIVOT.HEADER

export const PIVOT_HEADER = {
  description: _t("Get the header of a pivot."),
  args: [
    arg("pivot_id (number,string)", _t("ID of the pivot.")),
    arg("domain_field_name (string,repeating,optional)", _t("Field name.")),
    arg("domain_value (number,string,value,repeating,optional)", _t("Value.")),
  ],
  compute: function (
    pivotId: Maybe<FunctionResultObject>,
    ...domainArgs: Maybe<FunctionResultObject>[]
  ) {
    const _pivotFormulaId = toString(pivotId);
    const _pivotId = getPivotId(_pivotFormulaId, this.getters);
    assertDomainLength(domainArgs);
    const pivot = this.getters.getPivot(_pivotId);
    addPivotDependencies(this, _pivotId, []);
    pivot.init({ reload: pivot.needsReevaluation });
    const error = pivot.assertIsValid({ throwOnError: false });
    if (error) {
      return error;
    }
    if (!pivot.areDomainArgsFieldsValid(domainArgs)) {
      const suggestion = _t(
        "Consider using a dynamic pivot formula: %s. Or re-insert the static pivot from the Data menu.",
        `=PIVOT(${_pivotFormulaId})`
      );
      return {
        value: CellErrorType.GenericError,
        message: _t("Dimensions don't match the pivot definition") + ". " + suggestion,
      };
    }
    const domain = pivot.parseArgsToPivotDomain(domainArgs);
    if (this.getters.getActiveSheetId() === this.__originSheetId) {
      this.getters.getPivotPresenceTracker(_pivotId)?.trackHeader(domain);
    }
    const lastNode = domain.at(-1);
    if (lastNode?.field === "measure") {
      return pivot.getPivotMeasureValue(toString(lastNode.value), domain);
    }
    const { value, format } = pivot.getPivotHeaderValueAndFormat(domain);
    return {
      value,
      format:
        !lastNode || lastNode.field === "measure" || lastNode.value === "false"
          ? undefined
          : format,
    };
  },
} satisfies AddFunctionDescription;

// PIVOT

export const PIVOT = {
  description: _t("Get a pivot table."),
  args: [
    arg("pivot_id (string)", _t("ID of the pivot.")),
    arg("row_count (number, optional)", _t("number of rows")),
    arg("include_total (boolean, default=TRUE)", _t("Whether to include total/sub-totals or not.")),
    arg(
      "include_column_titles (boolean, default=TRUE)",
      _t("Whether to include the column titles or not.")
    ),
    arg("column_count (number, optional)", _t("number of columns")),
    arg(
      "include_measure_titles (boolean, default=TRUE)",
      _t("Whether to include the measure titles row or not.")
    ),
  ],
  compute: function (
    pivotFormulaId: Maybe<FunctionResultObject>,
    rowCount: Maybe<FunctionResultObject>,
    includeTotal: Maybe<FunctionResultObject>,
    includeColumnHeaders: Maybe<FunctionResultObject>,
    columnCount: Maybe<FunctionResultObject>,
    includeMeasureTitles: Maybe<FunctionResultObject>
  ) {
    const _pivotFormulaId = toString(pivotFormulaId);
    const pivotId = getPivotId(_pivotFormulaId, this.getters);
    const pivot = this.getters.getPivot(pivotId);
    const coreDefinition = this.getters.getPivotCoreDefinition(pivotId);

    const pivotStyle = getPivotStyleFromFnArgs(
      coreDefinition,
      rowCount,
      includeTotal,
      includeColumnHeaders,
      columnCount,
      includeMeasureTitles,
      this.locale
    );

    if (pivotStyle.numberOfRows < 0) {
      return new EvaluationError(_t("The number of rows must be positive."));
    }
    if (pivotStyle.numberOfColumns < 0) {
      return new EvaluationError(_t("The number of columns must be positive."));
    }

    addPivotDependencies(this, pivotId, coreDefinition.measures);
    pivot.init({ reload: pivot.needsReevaluation });
    const error = pivot.assertIsValid({ throwOnError: false });
    if (error) {
      return error;
    }
    const table = pivot.getCollapsedTableStructure();
    if (table.numberOfCells > PIVOT_MAX_NUMBER_OF_CELLS) {
      return new EvaluationError(getPivotTooBigErrorMessage(table.numberOfCells, this.locale));
    }
    const cells = table.getPivotCells(pivotStyle);

    let headerRows = 0;
    if (pivotStyle.displayColumnHeaders) {
      headerRows = table.columns.length - 1;
    }
    if (pivotStyle.displayMeasuresRow) {
      headerRows++;
    }
    const pivotTitle = this.getters.getPivotName(pivotId);

    const tableHeight = Math.min(headerRows + pivotStyle.numberOfRows, cells[0].length);
    if (tableHeight === 0) {
      return { value: pivotTitle };
    }
    const tableWidth = Math.min(1 + pivotStyle.numberOfColumns, cells.length);

    return generateMimicMatrix(tableWidth, tableHeight, (col, row) => {
      const pivotCell = cells[col][row];
      if (
        col === 0 &&
        row === 0 &&
        (pivotStyle.displayColumnHeaders || pivotStyle.displayMeasuresRow)
      ) {
        return { value: pivotTitle };
      }
      switch (pivotCell.type) {
        case "EMPTY":
          return { value: "" };
        case "HEADER":
          const valueAndFormat = pivot.getPivotHeaderValueAndFormat(pivotCell.domain);
          return addAlignFormatToPivotHeader(pivotCell.domain, valueAndFormat);
        case "MEASURE_HEADER":
          return pivot.getPivotMeasureValue(pivotCell.measure, pivotCell.domain);
        case "VALUE":
          return pivot.getPivotCellValueAndFormat(pivotCell.measure, pivotCell.domain);
      }
    });
  },
} satisfies AddFunctionDescription;

//--------------------------------------------------------------------------
// OFFSET
//--------------------------------------------------------------------------

export const OFFSET = {
  description: _t(
    "Returns a range reference shifted by a specified number of rows and columns from a starting cell reference."
  ),
  args: [
    arg(
      "cell_reference (any, range<any>)",
      _t("The starting point from which to count the offset rows and columns.")
    ),
    arg("offset_rows (number)", _t("The number of rows to offset by.")),
    arg("offset_columns (number)", _t("The number of columns to offset by.")),
    arg(
      "height (number, default='height of cell_reference')",
      _t("The number of rows of the range to return starting at the offset target.")
    ),
    arg(
      "width (number, default='width of cell_reference')",
      _t("The number of columns of the range to return starting at the offset target.")
    ),
  ],
  compute: function (
    cellReference: Arg,
    offsetRows: Maybe<FunctionResultObject>,
    offsetColumns: Maybe<FunctionResultObject>,
    height: Maybe<FunctionResultObject>,
    width: Maybe<FunctionResultObject>
  ) {
    if (cellReference === undefined) {
      return new InvalidReferenceError(expectReferenceError);
    }
    const _cellReference = toMimicMatrix(cellReference);
    const firstCell = _cellReference.get(0, 0);
    if (firstCell.position === undefined) {
      return new InvalidReferenceError(expectReferenceError);
    }

    let offsetHeight = _cellReference.height;
    let offsetWidth = _cellReference.width;

    if (height) {
      const _height = toNumber(height, this.locale);
      if (_height < 1) {
        return new EvaluationError(
          _t("Height value is %(_height)s. It should be greater than or equal to 1.", { _height })
        );
      }
      offsetHeight = _height;
    }

    if (width) {
      const _width = toNumber(width, this.locale);
      if (_width < 1) {
        return new EvaluationError(
          _t("Width value is %(_width)s. It should be greater than or equal to 1.", { _width })
        );
      }
      offsetWidth = _width;
    }

    const _offsetRows = toNumber(offsetRows, this.locale);
    const _offsetColumns = toNumber(offsetColumns, this.locale);

    const startingCol = firstCell.position.col + _offsetColumns;
    const startingRow = firstCell.position.row + _offsetRows;

    if (startingCol < 0 || startingRow < 0) {
      return new InvalidReferenceError(_t("OFFSET evaluates to an out of bounds range."));
    }

    return this.getRange(
      {
        left: startingCol,
        top: startingRow,
        right: startingCol + offsetWidth - 1,
        bottom: startingRow + offsetHeight - 1,
      },
      firstCell.position.sheetId
    );
  },
} satisfies AddFunctionDescription;

//--------------------------------------------------------------------------
// CHOOSE
//--------------------------------------------------------------------------
export const CHOOSE = {
  description: _t("Returns an element from a list of choices based on index."),
  args: [
    arg("index (number)", _t("Which choice to return.")),
    arg(
      "choice (any, range<any>, repeating)",
      _t("A potential value to return. May be a reference to a cell or an individual value.")
    ),
  ],
  compute: function (index: Maybe<FunctionResultObject>, ...choices: Arg[]) {
    const _index = Math.floor(toNumber(index, this.locale)) - 1;
    if (_index < 0 || _index >= choices.length) {
      return new EvaluationError(
        _t("Index for CHOOSE is invalid. Valid values are between 1 and %(choices)s inclusive.", {
          choices: choices.length,
        })
      );
    }
    const result = choices[_index];
    return result ?? new EvaluationError(_t("Choice is undefined."));
  },
  isExported: true,
} satisfies AddFunctionDescription;

//--------------------------------------------------------------------------
// DROP
//--------------------------------------------------------------------------
export const DROP = {
  description: _t(
    "Excludes a specified number of rows or columns from the start or end of an array."
  ),
  args: [
    arg("array (range)", _t("The array from which to drop rows or columns")),
    arg(
      "rows (number)",
      _t("The number of rows to drop. A negative value drops from the end of the array.")
    ),
    arg(
      "columns (number, optional)",
      _t("The number of columns to exclude. A negative value drops from the end of the array.")
    ),
  ],
  compute: function (
    array: MimicMatrix,
    rows: Maybe<FunctionResultObject>,
    columns: Maybe<FunctionResultObject>
  ) {
    const _rows = toNumber(rows, this.locale);
    const _columns = toNumber(columns, this.locale);
    if (Math.abs(_columns) >= array.width || Math.abs(_rows) >= array.height) {
      return new EvaluationError(
        _t(
          "The number of rows or column to exclude must be smaller than the number of elements in the array."
        )
      );
    }
    let colsResult = array;

    if (_columns >= 0) {
      colsResult = array.sliceCols(_columns);
    } else {
      colsResult = array.sliceCols(0, array.width + _columns);
    }

    let result = colsResult;
    if (_rows >= 0) {
      result = colsResult.sliceRows(_rows);
    } else {
      result = colsResult.sliceRows(0, colsResult.height + _rows);
    }
    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

//--------------------------------------------------------------------------
// TAKE
//--------------------------------------------------------------------------

export const TAKE = {
  description: _t(
    "Returns a specified number of contiguous rows or columns from the start or end of an array."
  ),
  args: [
    arg("array (range)", _t("The array from which to take rows or columns.")),
    arg(
      "rows (number)",
      _t("The number of rows to take. A negative value takes from the end of the array.")
    ),
    arg(
      "columns (number, optional)",
      _t("The number of columns to take. A negative value takes from the end of the array.")
    ),
  ],
  compute: function (
    array: MimicMatrix,
    rows: Maybe<FunctionResultObject>,
    columns: Maybe<FunctionResultObject>
  ) {
    let _rows = !rows ? array.height : toNumber(rows, this.locale);
    let _columns = toNumber(columns, this.locale);
    let colsResult = array;
    if (Math.abs(_columns) >= array.width || _columns === 0) {
      _columns = array.width;
    }
    if (Math.abs(_rows) >= array.height) {
      _rows = array.height;
    }
    if (_columns >= 0) {
      colsResult = array.sliceCols(0, _columns);
    } else {
      colsResult = array.sliceCols(array.width + _columns, array.width);
    }
    if (_rows === 0) {
      return new EvaluationError(_t("The number of rows can not be zero."));
    }

    let result = colsResult;

    if (_rows > 0) {
      result = colsResult.sliceRows(0, _rows);
    } else {
      result = colsResult.sliceRows(result.height + _rows, result.height);
    }

    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

//--------------------------------------------------------------------------
// FORMULATEXT
//--------------------------------------------------------------------------

export const FORMULATEXT = {
  description: _t("Returns a formula as a string."),
  args: [arg("cell_reference (any)", _t("A reference to a cell."))],
  compute: function (cellReference: Maybe<FunctionResultObject>) {
    if (cellReference?.position === undefined) {
      return new InvalidReferenceError(expectReferenceError);
    }
    const cell = this.getters.getCell(cellReference.position);
    if (cell && isFormula(cell.content)) {
      return { value: cell.content };
    } else {
      return new NotAvailableError(_t("The cell does not contain a formula."));
    }
  },
  isExported: true,
} satisfies AddFunctionDescription;
