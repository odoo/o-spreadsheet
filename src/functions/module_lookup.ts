import { toZone } from "../helpers/index";
import { _lt } from "../translation";
import { AddFunctionDescription, ArgRange, ArgValue, CellValue, ReturnValue } from "../types";
import { args } from "./arguments";
import {
  assert,
  dichotomicPredecessorSearch,
  dichotomicSuccessorSearch,
  toBoolean,
  toNumber,
  toString,
} from "./helpers";

const DEFAULT_IS_SORTED = true;

/**
 * Perform a linear search and return the index of the perfect match.
 * -1 is returned if no value is found.
 *
 * Example:
 * - [3, 6, 10], 3 => 0
 * - [3, 6, 10], 6 => 1
 * - [3, 6, 10], 9 => -1
 * - [3, 6, 10], 2 => -1
 */
function linearSearch(range: (CellValue | undefined)[], target: ArgValue): number {
  for (let i = 0; i < range.length; i++) {
    if (range[i] === target) {
      return i;
    }
  }
  // no value is found, -1 is returned
  return -1;
}

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
    searchKey: ArgValue,
    range: ArgRange,
    index: ArgValue,
    isSorted: ArgValue = DEFAULT_IS_SORTED
  ): ReturnValue {
    const _index = Math.trunc(toNumber(index));
    assert(
      () => 1 <= _index && _index <= range[0].length,
      _lt("[[FUNCTION_NAME]] evaluates to an out of bounds range.")
    );

    const _isSorted = toBoolean(isSorted);
    const firstRow = range.map((col) => col[0]);
    let colIndex;
    if (_isSorted) {
      colIndex = dichotomicPredecessorSearch(firstRow, searchKey);
    } else {
      colIndex = linearSearch(firstRow, searchKey);
    }

    assert(
      () => colIndex > -1,
      _lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", toString(searchKey))
    );

    return range[colIndex][_index - 1] as ReturnValue;
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
    searchKey: ArgValue,
    searchArray: ArgRange,
    resultRange: ArgRange | undefined
  ): ReturnValue {
    let nbCol = searchArray.length;
    let nbRow = searchArray[0].length;

    const verticalSearch = nbRow >= nbCol;
    const searchRange = verticalSearch ? searchArray[0] : searchArray.map((c) => c[0]);
    const index = dichotomicPredecessorSearch(searchRange, searchKey);
    assert(
      () => index >= 0,
      _lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", toString(searchKey))
    );

    if (resultRange === undefined) {
      return (
        verticalSearch ? searchArray[nbCol - 1][index] : searchArray[index][nbRow - 1]
      ) as ReturnValue;
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
      return resultRange[index][0] as ReturnValue;
    }

    assert(
      () => index <= nbRow - 1,
      _lt("[[FUNCTION_NAME]] evaluates to an out of range column value %s.", (index + 1).toString())
    );

    return resultRange[0][index] as ReturnValue;
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
    searchKey: ArgValue,
    range: ArgRange,
    searchType: ArgValue = DEFAULT_SEARCH_TYPE
  ): number {
    let _searchType = toNumber(searchType);
    const nbCol = range.length;
    const nbRow = range[0].length;

    assert(
      () => nbCol === 1 || nbRow === 1,
      _lt("The range must be a single row or a single column.")
    );

    let index = -1;
    const _range = range.flat();
    _searchType = Math.sign(_searchType);
    switch (_searchType) {
      case 1:
        index = dichotomicPredecessorSearch(_range, searchKey);
        break;
      case 0:
        index = linearSearch(_range, searchKey);
        break;
      case -1:
        index = dichotomicSuccessorSearch(_range, searchKey);
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
    searchKey: ArgValue,
    range: ArgRange,
    index: ArgValue,
    isSorted: ArgValue = DEFAULT_IS_SORTED
  ): ReturnValue {
    const _index = Math.trunc(toNumber(index));
    assert(
      () => 1 <= _index && _index <= range.length,
      _lt("[[FUNCTION_NAME]] evaluates to an out of bounds range.")
    );

    const _isSorted = toBoolean(isSorted);
    const firstCol = range[0];
    let rowIndex;
    if (_isSorted) {
      rowIndex = dichotomicPredecessorSearch(firstCol, searchKey);
    } else {
      rowIndex = linearSearch(firstCol, searchKey);
    }

    assert(
      () => rowIndex > -1,
      _lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", toString(searchKey))
    );

    return range[_index - 1][rowIndex] as ReturnValue;
  },
  isExported: true,
};
