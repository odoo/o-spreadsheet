import { getFullReference, toA1, toXC, toZone } from "../helpers/index";
import { _t } from "../translation";
import { AddFunctionDescription, CellPosition, CellValue, FPayload, Matrix, Maybe } from "../types";
import { InvalidReferenceError, NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import {
  LinearSearchMode,
  assert,
  assertNumberGreaterThanOrEqualToOne,
  dichotomicSearch,
  expectNumberRangeError,
  isEvaluationError,
  linearSearch,
  strictToInteger,
  toBoolean,
  toMatrix,
  toNumber,
  toString,
} from "./helpers";

const DEFAULT_IS_SORTED = true;
const DEFAULT_MATCH_MODE = 0;
const DEFAULT_SEARCH_MODE = 1;
const DEFAULT_ABSOLUTE_RELATIVE_MODE = 1;

function assertAvailable(variable, searchKey) {
  if (variable === undefined) {
    throw new NotAvailableError(
      _t("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", toString(searchKey))
    );
  }
}

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
      _t(
        "An indicator of whether the reference is row/column absolute. 1 is row and column absolute (e.g. $A$1), 2 is row absolute and column relative (e.g. A$1), 3 is row relative and column absolute (e.g. $A1), and 4 is row and column relative (e.g. A1)."
      )
    ),
    arg(
      "use_a1_notation (boolean, default=TRUE)",
      _t(
        "A boolean indicating whether to use A1 style notation (TRUE) or R1C1 style notation (FALSE)."
      )
    ),
    arg(
      "sheet (string, optional)",
      _t("A string indicating the name of the sheet into which the address points.")
    ),
  ],
  returns: ["STRING"],
  compute: function (
    row: Maybe<FPayload>,
    column: Maybe<FPayload>,
    absoluteRelativeMode: Maybe<FPayload> = { value: DEFAULT_ABSOLUTE_RELATIVE_MODE },
    useA1Notation: Maybe<FPayload> = { value: true },
    sheet: Maybe<FPayload> | undefined
  ): string {
    const rowNumber = strictToInteger(row, this.locale);
    const colNumber = strictToInteger(column, this.locale);
    assertNumberGreaterThanOrEqualToOne(rowNumber);
    assertNumberGreaterThanOrEqualToOne(colNumber);
    const _absoluteRelativeMode = strictToInteger(absoluteRelativeMode, this.locale);
    assert(
      () => [1, 2, 3, 4].includes(_absoluteRelativeMode),
      expectNumberRangeError(1, 4, _absoluteRelativeMode)
    );
    const _useA1Notation = toBoolean(useA1Notation);
    let cellReference: string;
    if (_useA1Notation) {
      const rangePart = {
        rowFixed: [1, 2].includes(_absoluteRelativeMode) ? true : false,
        colFixed: [1, 3].includes(_absoluteRelativeMode) ? true : false,
      };
      cellReference = toXC(colNumber - 1, rowNumber - 1, rangePart);
    } else {
      const rowPart = [1, 2].includes(_absoluteRelativeMode) ? `R${rowNumber}` : `R[${rowNumber}]`;
      const colPart = [1, 3].includes(_absoluteRelativeMode) ? `C${colNumber}` : `C[${colNumber}]`;
      cellReference = rowPart + colPart;
    }
    if (sheet !== undefined) {
      return getFullReference(toString(sheet), cellReference);
    }
    return cellReference;
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
      "cell_reference (meta, default='this cell')",
      _t(
        "The cell whose column number will be returned. Column A corresponds to 1. By default, the function use the cell in which the formula is entered."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (cellReference: Maybe<{ value: string }>): number {
    const _cellReference =
      cellReference === undefined ? this.__originCellXC?.() : cellReference.value;
    assert(
      () => !!_cellReference,
      "In this context, the function [[FUNCTION_NAME]] needs to have a cell or range in parameter."
    );
    const zone = toZone(_cellReference!);
    return zone.left + 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COLUMNS
// -----------------------------------------------------------------------------

export const COLUMNS = {
  description: _t("Number of columns in a specified array or range."),
  args: [arg("range (meta)", _t("The range whose column count will be returned."))],
  returns: ["NUMBER"],
  compute: function (range: { value: string }): number {
    const zone = toZone(range.value);
    return zone.right - zone.left + 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// HLOOKUP
// -----------------------------------------------------------------------------

export const HLOOKUP = {
  description: _t("Horizontal lookup"),
  args: [
    arg("search_key (any)", _t("The value to search for. For example, 42, 'Cats', or I24.")),
    arg(
      "range (range)",
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
      )
    ),
  ],
  returns: ["ANY"],
  compute: function (
    searchKey: Maybe<FPayload>,
    range: Matrix<FPayload>,
    index: Maybe<FPayload>,
    isSorted: Maybe<FPayload> = { value: DEFAULT_IS_SORTED }
  ): FPayload {
    const _index = Math.trunc(toNumber(index?.value, this.locale));

    assert(
      () => 1 <= _index && _index <= range[0].length,
      _t("[[FUNCTION_NAME]] evaluates to an out of bounds range.")
    );
    if (searchKey && isEvaluationError(searchKey.value)) {
      return searchKey;
    }

    const getValueFromRange = (range: Matrix<FPayload>, index: number) => range[index][0].value;

    const _isSorted = toBoolean(isSorted.value);
    const colIndex = _isSorted
      ? dichotomicSearch(range, searchKey, "nextSmaller", "asc", range.length, getValueFromRange)
      : linearSearch(range, searchKey, "wildcard", range.length, getValueFromRange);
    const col = range[colIndex];
    assertAvailable(col, searchKey?.value);
    return col[_index - 1];
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
  returns: ["ANY"],
  compute: function (
    reference: Matrix<FPayload>,
    row: Maybe<FPayload> = { value: 0 },
    column: Maybe<FPayload> = { value: 0 }
  ): FPayload | Matrix<FPayload> {
    const _reference = toMatrix(reference);
    const _row = toNumber(row.value, this.locale);
    const _column = toNumber(column.value, this.locale);
    assert(
      () =>
        _column >= 0 &&
        _column - 1 < _reference.length &&
        _row >= 0 &&
        _row - 1 < _reference[0].length,
      _t("Index out of range.")
    );
    if (_row === 0 && _column === 0) {
      return _reference;
    }
    if (_row === 0) {
      return [_reference[_column - 1]];
    }
    if (_column === 0) {
      return _reference.map((col) => [col[_row - 1]]);
    }
    return _reference[_column - 1][_row - 1];
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// INDEX
// -----------------------------------------------------------------------------
export const INDIRECT: AddFunctionDescription = {
  description: _t("Returns the content of a cell, specified by a string."),
  args: [
    arg("reference (string)", _t("The range of cells from which the values are returned.")),
    arg(
      "use_a1_notation (boolean, default=TRUE)",
      _t(
        "A boolean indicating whether to use A1 style notation (TRUE) or R1C1 style notation (FALSE)."
      )
    ),
  ],
  returns: ["ANY"],
  compute: function (
    reference: Maybe<FPayload>,
    useA1Notation: Maybe<FPayload> = { value: true }
  ): FPayload | Matrix<FPayload> {
    let _reference = reference?.value?.toString();
    if (!_reference) {
      throw new InvalidReferenceError(_t("Reference should be defined."));
    }
    const sheetId = this.__originSheetId;
    let originPosition: CellPosition | undefined;
    const __originCellXC = this.__originCellXC?.();
    if (__originCellXC) {
      const cellZone = toZone(__originCellXC);
      originPosition = {
        sheetId,
        col: cellZone.left,
        row: cellZone.top,
      };
      // The following line is used to reset the dependencies of the cell, to avoid
      // keeping dependencies from previous evaluation of the INDIRECT formula (i.e.
      // in case the reference has been changed).
      this.updateDependencies?.(originPosition);
    }

    const _useA1Notation = toBoolean(useA1Notation);
    if (_useA1Notation === false) {
      _reference = toA1(_reference, originPosition);
    }
    const range = this.getters.getRangeFromSheetXC(sheetId, _reference);
    if (range === undefined || range.invalidXc || range.invalidSheetName) {
      throw new InvalidReferenceError();
    }
    if (originPosition) {
      this.addDependencies?.(originPosition, [range]);
    }

    const values: FPayload[][] = [];
    for (let col = range.zone.left; col <= range.zone.right; col++) {
      const colValues: FPayload[] = [];
      for (let row = range.zone.top; row <= range.zone.bottom; row++) {
        const position = { sheetId: range.sheetId, col, row };
        // The below 'value' is typed as CellValue because the evaluateFormula will have to
        // evaluate a string containing the A1 reference of a single cell, so this will
        // return a CellValue.
        const value = this.getters.evaluateFormula(range.sheetId, toXC(col, row)) as CellValue;
        const evaluatedCell = this.getters.getEvaluatedCell(position);
        colValues.push({
          ...evaluatedCell,
          value,
        });
      }
      values.push(colValues);
    }
    return values.length === 1 && values[0].length === 1 ? values[0][0] : values;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LOOKUP
// -----------------------------------------------------------------------------

export const LOOKUP = {
  description: _t("Look up a value."),
  args: [
    arg("search_key (any)", _t("The value to search for. For example, 42, 'Cats', or I24.")),
    arg(
      "search_array (range)",
      _t(
        "One method of using this function is to provide a single sorted row or column search_array to look through for the search_key with a second argument result_range. The other way is to combine these two arguments into one search_array where the first row or column is searched and a value is returned from the last row or column in the array. If search_key is not found, a non-exact match may be returned."
      )
    ),
    arg(
      "result_range (range, optional)",
      _t(
        "The range from which to return a result. The value returned corresponds to the location where search_key is found in search_range. This range must be only a single row or column and should not be used if using the search_result_array method."
      )
    ),
  ],
  returns: ["ANY"],
  compute: function (
    searchKey: Maybe<FPayload>,
    searchArray: Matrix<FPayload>,
    resultRange: Matrix<FPayload> | undefined
  ): FPayload {
    let nbCol = searchArray.length;
    let nbRow = searchArray[0].length;

    const verticalSearch = nbRow >= nbCol;
    const getElement = verticalSearch
      ? (range: Matrix<FPayload>, index: number) => range[0][index].value
      : (range: Matrix<FPayload>, index: number) => range[index][0].value;
    const rangeLength = verticalSearch ? nbRow : nbCol;
    const index = dichotomicSearch(
      searchArray,
      searchKey,
      "nextSmaller",
      "asc",
      rangeLength,
      getElement
    );

    if (index === -1) assertAvailable(undefined, searchKey?.value);

    verticalSearch
      ? assertAvailable(searchArray[0][index], searchKey?.value)
      : assertAvailable(searchArray[index][nbRow - 1], searchKey?.value);

    if (resultRange === undefined) {
      return verticalSearch ? searchArray[nbCol - 1][index] : searchArray[index][nbRow - 1];
    }

    nbCol = resultRange.length;
    nbRow = resultRange[0].length;
    assert(
      () => nbCol === 1 || nbRow === 1,
      _t("The result_range must be a single row or a single column.")
    );

    if (nbCol > 1) {
      assert(
        () => index <= nbCol - 1,
        _t("[[FUNCTION_NAME]] evaluates to an out of range row value %s.", (index + 1).toString())
      );
      return resultRange[index][0];
    }

    assert(
      () => index <= nbRow - 1,
      _t("[[FUNCTION_NAME]] evaluates to an out of range column value %s.", (index + 1).toString())
    );

    return resultRange[0][index];
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
    arg("search_key (any)", _t("The value to search for. For example, 42, 'Cats', or I24.")),
    arg("range (any, range)", _t("The one-dimensional array to be searched.")),
    arg(
      `search_type (number, default=${DEFAULT_SEARCH_TYPE})`,
      _t(
        "The search method. 1 (default) finds the largest value less than or equal to search_key when range is sorted in ascending order. 0 finds the exact value when range is unsorted. -1 finds the smallest value greater than or equal to search_key when range is sorted in descending order."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    searchKey: Maybe<FPayload>,
    range: Matrix<FPayload>,
    searchType: Maybe<FPayload> = { value: DEFAULT_SEARCH_TYPE }
  ): number {
    let _searchType = toNumber(searchType, this.locale);
    const nbCol = range.length;
    const nbRow = range[0].length;

    assert(
      () => nbCol === 1 || nbRow === 1,
      _t("The range must be a single row or a single column.")
    );

    let index = -1;

    const getElement =
      nbCol === 1
        ? (range: Matrix<FPayload>, index: number) => range[0][index].value
        : (range: Matrix<FPayload>, index: number) => range[index][0].value;

    const rangeLen = nbCol === 1 ? range[0].length : range.length;
    _searchType = Math.sign(_searchType);
    switch (_searchType) {
      case 1:
        index = dichotomicSearch(range, searchKey, "nextSmaller", "asc", rangeLen, getElement);
        break;
      case 0:
        index = linearSearch(range, searchKey, "wildcard", rangeLen, getElement);
        break;
      case -1:
        index = dichotomicSearch(range, searchKey, "nextGreater", "desc", rangeLen, getElement);
        break;
    }

    assertAvailable(nbCol === 1 ? range[0][index] : range[index], searchKey);

    return index + 1;
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
      "cell_reference (meta, default='this cell')",
      _t(
        "The cell whose row number will be returned. By default, this function uses the cell in which the formula is entered."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (cellReference: Maybe<{ value: string }>): number {
    const _cellReference =
      cellReference === undefined ? this.__originCellXC?.() : cellReference.value;
    assert(
      () => !!_cellReference,
      "In this context, the function [[FUNCTION_NAME]] needs to have a cell or range in parameter."
    );
    const zone = toZone(_cellReference!);
    return zone.top + 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// ROWS
// -----------------------------------------------------------------------------

export const ROWS = {
  description: _t("Number of rows in a specified array or range."),
  args: [arg("range (meta)", _t("The range whose row count will be returned."))],
  returns: ["NUMBER"],
  compute: function (range: { value: string }): number {
    const zone = toZone(range.value);
    return zone.bottom - zone.top + 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VLOOKUP
// -----------------------------------------------------------------------------

export const VLOOKUP = {
  description: _t("Vertical lookup."),
  args: [
    arg("search_key (any)", _t("The value to search for. For example, 42, 'Cats', or I24.")),
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
      )
    ),
  ],
  returns: ["ANY"],
  compute: function (
    searchKey: Maybe<FPayload>,
    range: Matrix<FPayload>,
    index: Maybe<FPayload>,
    isSorted: Maybe<FPayload> = { value: DEFAULT_IS_SORTED }
  ): FPayload {
    const _index = Math.trunc(toNumber(index?.value, this.locale));
    assert(
      () => 1 <= _index && _index <= range.length,
      _t("[[FUNCTION_NAME]] evaluates to an out of bounds range.")
    );
    if (searchKey && isEvaluationError(searchKey.value)) {
      return searchKey;
    }

    const getValueFromRange = (range: Matrix<FPayload>, index: number) => range[0][index].value;

    const _isSorted = toBoolean(isSorted.value);
    const rowIndex = _isSorted
      ? dichotomicSearch(range, searchKey, "nextSmaller", "asc", range[0].length, getValueFromRange)
      : linearSearch(range, searchKey, "wildcard", range[0].length, getValueFromRange);

    const value = range[_index - 1][rowIndex];
    assertAvailable(value, searchKey);
    return value;
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
    arg("search_key (any)", _t("The value to search for.")),
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
      _t(
        "(0) Exact match. \
        (-1) Return next smaller item if no match. \
        (1) Return next greater item if no match. \
        (2) Wildcard match."
      )
    ),
    arg(
      `search_mode (any, default=${DEFAULT_SEARCH_MODE})`,
      _t(
        "(1) Search starting at first item. \
      (-1) Search starting at last item. \
      (2) Perform a binary search that relies on lookup_array being sorted in ascending order. If not sorted, invalid results will be returned. \
      (-2) Perform a binary search that relies on lookup_array being sorted in descending order. If not sorted, invalid results will be returned.\
      "
      )
    ),
  ],
  returns: ["ANY"],
  compute: function (
    searchKey: Maybe<FPayload>,
    lookupRange: Matrix<FPayload>,
    returnRange: Matrix<FPayload>,
    defaultValue: Maybe<FPayload>,
    matchMode: Maybe<FPayload> = { value: DEFAULT_MATCH_MODE },
    searchMode: Maybe<FPayload> = { value: DEFAULT_SEARCH_MODE }
  ): Matrix<FPayload> {
    const _matchMode = Math.trunc(toNumber(matchMode.value, this.locale));
    const _searchMode = Math.trunc(toNumber(searchMode.value, this.locale));

    assert(
      () => lookupRange.length === 1 || lookupRange[0].length === 1,
      _t("lookup_range should be either a single row or single column.")
    );
    assert(
      () => [-1, 1, -2, 2].includes(_searchMode),
      _t("search_mode should be a value in [-1, 1, -2, 2].")
    );
    assert(
      () => [-1, 0, 1, 2].includes(_matchMode),
      _t("match_mode should be a value in [-1, 0, 1, 2].")
    );

    const lookupDirection = lookupRange.length === 1 ? "col" : "row";

    assert(
      () => !(_matchMode === 2 && [-2, 2].includes(_searchMode)),
      _t("the search and match mode combination is not supported for XLOOKUP evaluation.")
    );

    assert(
      () =>
        lookupDirection === "col"
          ? returnRange[0].length === lookupRange[0].length
          : returnRange.length === lookupRange.length,
      _t("return_range should have the same dimensions as lookup_range.")
    );

    if (searchKey && isEvaluationError(searchKey.value)) {
      return [[searchKey]];
    }

    const getElement =
      lookupDirection === "col"
        ? (range: Matrix<FPayload>, index: number) => range[0][index].value
        : (range: Matrix<FPayload>, index: number) => range[index][0].value;

    const rangeLen = lookupDirection === "col" ? lookupRange[0].length : lookupRange.length;
    const mode = MATCH_MODE[_matchMode];
    const reverseSearch = _searchMode === -1;

    const index =
      _searchMode === 2 || _searchMode === -2
        ? dichotomicSearch(
            lookupRange,
            searchKey,
            mode as "strict" | "nextGreater" | "nextSmaller",
            _searchMode === 2 ? "asc" : "desc",
            rangeLen,
            getElement
          )
        : linearSearch(lookupRange, searchKey, mode, rangeLen, getElement, reverseSearch);

    if (index !== -1) {
      return lookupDirection === "col"
        ? returnRange.map((col) => [col[index]])
        : [returnRange[index]];
    }

    assertAvailable(defaultValue, searchKey);
    return [[defaultValue!]];
  },
  isExported: true,
} satisfies AddFunctionDescription;
