import { toZone } from "../helpers/index";
import { _lt } from "../translation";
import {
  AddFunctionDescription,
  FunctionReturnValue,
  MatrixArgValue,
  PrimitiveArgValue,
} from "../types";
import { args } from "./arguments";
import {
  assert,
  dichotomicSearch,
  getNormalizedValueFromColumnRange,
  getNormalizedValueFromRowRange,
  linearSearch,
  normalizeValue,
  toBoolean,
  toNumber,
  toString,
} from "./helpers";

const DEFAULT_IS_SORTED = true;
const DEFAULT_MATCH_MODE = 0;
const DEFAULT_SEARCH_MODE = 1;

// -----------------------------------------------------------------------------
// COLUMN
// -----------------------------------------------------------------------------

export const COLUMN: AddFunctionDescription = {
  description: _lt("Column number of a specified cell."),
  args: args(
    `cell_reference (meta, default=${_lt("The cell in which the formula is entered")}) ${_lt(
      "The cell whose column number will be returned. Column A corresponds to 1."
    )}
    `
  ),
  returns: ["NUMBER"],
  compute: function (cellReference: string): number {
    const _cellReference = cellReference || this.__originCellXC?.();
    assert(
      () => !!_cellReference,
      "In this context, the function [[FUNCTION_NAME]] needs to have a cell or range in parameter."
    );
    const zone = toZone(_cellReference!);
    return zone.left + 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// COLUMNS
// -----------------------------------------------------------------------------

export const COLUMNS: AddFunctionDescription = {
  description: _lt("Number of columns in a specified array or range."),
  args: args(`range (meta) ${_lt("The range whose column count will be returned.")}`),
  returns: ["NUMBER"],
  compute: function (range: string): number {
    const zone = toZone(range);
    return zone.right - zone.left + 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// HLOOKUP
// -----------------------------------------------------------------------------

export const HLOOKUP: AddFunctionDescription = {
  description: _lt(`Horizontal lookup`),
  args: args(`
      search_key (any) ${_lt("The value to search for. For example, 42, 'Cats', or I24.")}
      range (range) ${_lt(
        "The range to consider for the search. The first row in the range is searched for the key specified in search_key."
      )}
      index (number) ${_lt(
        "The row index of the value to be returned, where the first row in range is numbered 1."
      )}
      is_sorted (boolean, default=${DEFAULT_IS_SORTED}) ${_lt(
    "Indicates whether the row to be searched (the first row of the specified range) is sorted, in which case the closest match for search_key will be returned."
  )}
  `),
  returns: ["ANY"],
  compute: function (
    searchKey: PrimitiveArgValue,
    range: MatrixArgValue,
    index: PrimitiveArgValue,
    isSorted: PrimitiveArgValue = DEFAULT_IS_SORTED
  ): FunctionReturnValue {
    const _index = Math.trunc(toNumber(index));
    const _searchKey = normalizeValue(searchKey);

    assert(
      () => 1 <= _index && _index <= range[0].length,
      _lt("[[FUNCTION_NAME]] evaluates to an out of bounds range.")
    );

    const _isSorted = toBoolean(isSorted);
    let colIndex;
    if (_isSorted) {
      colIndex = dichotomicSearch(
        range,
        _searchKey,
        "nextSmaller",
        "asc",
        range.length,
        getNormalizedValueFromRowRange
      );
    } else {
      colIndex = linearSearch(
        range,
        _searchKey,
        "strict",
        range.length,
        getNormalizedValueFromRowRange
      );
    }

    assert(
      () => colIndex > -1,
      _lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", toString(searchKey))
    );

    return range[colIndex][_index - 1] as FunctionReturnValue;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LOOKUP
// -----------------------------------------------------------------------------

export const LOOKUP: AddFunctionDescription = {
  description: _lt(`Look up a value.`),
  args: args(`
      search_key (any) ${_lt("The value to search for. For example, 42, 'Cats', or I24.")}
      search_array (range) ${_lt(
        "One method of using this function is to provide a single sorted row or column search_array to look through for the search_key with a second argument result_range. The other way is to combine these two arguments into one search_array where the first row or column is searched and a value is returned from the last row or column in the array. If search_key is not found, a non-exact match may be returned."
      )}
      result_range (range, optional) ${_lt(
        "The range from which to return a result. The value returned corresponds to the location where search_key is found in search_range. This range must be only a single row or column and should not be used if using the search_result_array method."
      )}
  `),
  returns: ["ANY"],
  compute: function (
    searchKey: PrimitiveArgValue,
    searchArray: MatrixArgValue,
    resultRange: MatrixArgValue | undefined
  ): FunctionReturnValue {
    let nbCol = searchArray.length;
    let nbRow = searchArray[0].length;
    const _searchKey = normalizeValue(searchKey);

    const verticalSearch = nbRow >= nbCol;
    const getElement = verticalSearch
      ? getNormalizedValueFromColumnRange
      : getNormalizedValueFromRowRange;
    const rangeLength = verticalSearch ? nbRow : nbCol;
    const index = dichotomicSearch(
      searchArray,
      _searchKey,
      "nextSmaller",
      "asc",
      rangeLength,
      getElement
    );
    assert(
      () => index >= 0,
      _lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", toString(searchKey))
    );

    if (resultRange === undefined) {
      return (
        verticalSearch ? searchArray[nbCol - 1][index] : searchArray[index][nbRow - 1]
      ) as FunctionReturnValue;
    }

    nbCol = resultRange.length;
    nbRow = resultRange[0].length;
    assert(
      () => nbCol === 1 || nbRow === 1,
      _lt("The result_range must be a single row or a single column.")
    );

    if (nbCol > 1) {
      assert(
        () => index <= nbCol - 1,
        _lt("[[FUNCTION_NAME]] evaluates to an out of range row value %s.", (index + 1).toString())
      );
      return resultRange[index][0] as FunctionReturnValue;
    }

    assert(
      () => index <= nbRow - 1,
      _lt("[[FUNCTION_NAME]] evaluates to an out of range column value %s.", (index + 1).toString())
    );

    return resultRange[0][index] as FunctionReturnValue;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MATCH
// -----------------------------------------------------------------------------
const DEFAULT_SEARCH_TYPE = 1;
export const MATCH: AddFunctionDescription = {
  description: _lt(`Position of item in range that matches value.`),
  args: args(`
      search_key (any) ${_lt("The value to search for. For example, 42, 'Cats', or I24.")}
      range (any, range) ${_lt("The one-dimensional array to be searched.")}
      search_type (number, default=${DEFAULT_SEARCH_TYPE}) ${_lt(
    "The search method. 1 (default) finds the largest value less than or equal to search_key when range is sorted in ascending order. 0 finds the exact value when range is unsorted. -1 finds the smallest value greater than or equal to search_key when range is sorted in descending order."
  )}
  `),
  returns: ["NUMBER"],
  compute: function (
    searchKey: PrimitiveArgValue,
    range: MatrixArgValue,
    searchType: PrimitiveArgValue = DEFAULT_SEARCH_TYPE
  ): number {
    let _searchType = toNumber(searchType);
    const _searchKey = normalizeValue(searchKey);
    const nbCol = range.length;
    const nbRow = range[0].length;

    assert(
      () => nbCol === 1 || nbRow === 1,
      _lt("The range must be a single row or a single column.")
    );

    let index = -1;
    const getElement =
      nbCol === 1 ? getNormalizedValueFromColumnRange : getNormalizedValueFromRowRange;
    const rangeLen = nbCol === 1 ? range[0].length : range.length;
    _searchType = Math.sign(_searchType);
    switch (_searchType) {
      case 1:
        index = dichotomicSearch(range, _searchKey, "nextSmaller", "asc", rangeLen, getElement);
        break;
      case 0:
        index = linearSearch(range, _searchKey, "strict", rangeLen, getElement);
        break;
      case -1:
        index = dichotomicSearch(range, _searchKey, "nextGreater", "desc", rangeLen, getElement);
        break;
    }

    assert(
      () => index >= 0,
      _lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", toString(searchKey))
    );

    return index + 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ROW
// -----------------------------------------------------------------------------

export const ROW: AddFunctionDescription = {
  description: _lt("Row number of a specified cell."),
  args: args(
    `cell_reference (meta, default=${_lt(
      "The cell in which the formula is entered by default"
    )}) ${_lt("The cell whose row number will be returned.")}`
  ),
  returns: ["NUMBER"],
  compute: function (cellReference?: string): number {
    cellReference = cellReference || this.__originCellXC?.();
    assert(
      () => !!cellReference,
      "In this context, the function [[FUNCTION_NAME]] needs to have a cell or range in parameter."
    );
    const zone = toZone(cellReference!);
    return zone.top + 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// ROWS
// -----------------------------------------------------------------------------

export const ROWS: AddFunctionDescription = {
  description: _lt("Number of rows in a specified array or range."),
  args: args(`range (meta) ${_lt("The range whose row count will be returned.")}`),
  returns: ["NUMBER"],
  compute: function (range: string): number {
    const zone = toZone(range);
    return zone.bottom - zone.top + 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// VLOOKUP
// -----------------------------------------------------------------------------

export const VLOOKUP: AddFunctionDescription = {
  description: _lt(`Vertical lookup.`),
  args: args(`
      search_key (any) ${_lt("The value to search for. For example, 42, 'Cats', or I24.")}
      range (any, range) ${_lt(
        "The range to consider for the search. The first column in the range is searched for the key specified in search_key."
      )}
      index (number) ${_lt(
        "The column index of the value to be returned, where the first column in range is numbered 1."
      )}
      is_sorted (boolean, default=${DEFAULT_IS_SORTED}) ${_lt(
    "Indicates whether the column to be searched (the first column of the specified range) is sorted, in which case the closest match for search_key will be returned."
  )}
  `),
  returns: ["ANY"],
  compute: function (
    searchKey: PrimitiveArgValue,
    range: MatrixArgValue,
    index: PrimitiveArgValue,
    isSorted: PrimitiveArgValue = DEFAULT_IS_SORTED
  ): FunctionReturnValue {
    const _index = Math.trunc(toNumber(index));
    const _searchKey = normalizeValue(searchKey);
    assert(
      () => 1 <= _index && _index <= range.length,
      _lt("[[FUNCTION_NAME]] evaluates to an out of bounds range.")
    );

    const _isSorted = toBoolean(isSorted);
    let rowIndex;
    if (_isSorted) {
      rowIndex = dichotomicSearch(
        range,
        _searchKey,
        "nextSmaller",
        "asc",
        range[0].length,
        getNormalizedValueFromColumnRange
      );
    } else {
      rowIndex = linearSearch(
        range,
        _searchKey,
        "strict",
        range[0].length,
        getNormalizedValueFromColumnRange
      );
    }

    assert(
      () => rowIndex > -1,
      _lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", toString(searchKey))
    );

    return range[_index - 1][rowIndex] as FunctionReturnValue;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// XLOOKUP
// -----------------------------------------------------------------------------
export const XLOOKUP: AddFunctionDescription = {
  description: _lt(
    `Search a range for a match and return the corresponding item from a second range.`
  ),
  args: args(`
      search_key (any) ${_lt("The value to search for.")}
      lookup_range (any, range) ${_lt(
        "The range to consider for the search. Should be a single column or a single row."
      )}
      return_range (any, range) ${_lt(
        "The range containing the return value. Should have the same dimensions as lookup_range."
      )}
      if_not_found (any, lazy, optional) ${_lt("If a valid match is not found, return this value.")}
      match_mode (any, default=${DEFAULT_MATCH_MODE}) ${_lt(
    "(0) Exact match. (-1) Return next smaller item if no match. (1) Return next greater item if no match."
  )}
      search_mode (any, default=${DEFAULT_SEARCH_MODE}) ${_lt(
    "(1) Search starting at first item. \
    (-1) Search starting at last item. \
    (2) Perform a binary search that relies on lookup_array being sorted in ascending order. If not sorted, invalid results will be returned. \
    (-2) Perform a binary search that relies on lookup_array being sorted in descending order. If not sorted, invalid results will be returned.\
    "
  )}

  `),
  returns: ["ANY"],
  compute: function (
    searchKey: PrimitiveArgValue,
    lookupRange: MatrixArgValue,
    returnRange: MatrixArgValue,
    defaultValue?: () => PrimitiveArgValue,
    matchMode: PrimitiveArgValue = DEFAULT_MATCH_MODE,
    searchMode: PrimitiveArgValue = DEFAULT_SEARCH_MODE
  ): FunctionReturnValue {
    const _matchMode = Math.trunc(toNumber(matchMode));
    const _searchMode = Math.trunc(toNumber(searchMode));
    const _searchKey = normalizeValue(searchKey);

    assert(
      () => lookupRange.length === 1 || lookupRange[0].length === 1,
      _lt("lookup_range should be either a single row or single column.")
    );
    assert(
      () => returnRange.length === 1 || returnRange[0].length === 1,
      _lt("return_range should be either a single row or single column.")
    );
    assert(
      () =>
        returnRange.length === lookupRange.length &&
        returnRange[0].length === lookupRange[0].length,
      _lt("return_range should have the same dimensions as lookup_range.")
    );
    assert(
      () => [-1, 1, -2, 2].includes(_searchMode),
      _lt("searchMode should be a value in [-1, 1, -2, 2].")
    );
    assert(
      () => [-1, 0, 1].includes(_matchMode),
      _lt("matchMode should be a value in [-1, 0, 1].")
    );

    const getElement =
      lookupRange.length === 1 ? getNormalizedValueFromColumnRange : getNormalizedValueFromRowRange;

    const rangeLen = lookupRange.length === 1 ? lookupRange[0].length : lookupRange.length;

    const mode = _matchMode === 0 ? "strict" : _matchMode === 1 ? "nextGreater" : "nextSmaller";
    const reverseSearch = _searchMode === -1;

    let index: number;
    if (_searchMode === 2 || _searchMode === -2) {
      const sortOrder = _searchMode === 2 ? "asc" : "desc";
      index = dichotomicSearch(lookupRange, _searchKey, mode, sortOrder, rangeLen, getElement);
    } else {
      index = linearSearch(lookupRange, _searchKey, mode, rangeLen, getElement, reverseSearch);
    }

    if (index !== -1) {
      return (
        lookupRange.length === 1 ? returnRange[0][index] : returnRange[index][0]
      ) as FunctionReturnValue;
    }

    const _defaultValue = defaultValue?.();
    assert(
      () => !!_defaultValue,
      _lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", toString(searchKey))
    );
    return _defaultValue!;
  },
  isExported: true,
};
