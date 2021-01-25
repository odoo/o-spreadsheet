import { toZone } from "../helpers/index";
import { _lt } from "../translation";
import { AddFunctionDescription } from "../types";
import { args } from "./arguments";
import {
  dichotomicPredecessorSearch,
  dichotomicSuccessorSearch,
  toBoolean,
  toNumber,
} from "./helpers";

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
function linearSearch(range: any[], target: any): number {
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
  compute: function (cellReference?: string): number {
    let zone;
    if (cellReference) {
      zone = toZone(cellReference);
    } else {
      if (this.__originCellXC) {
        zone = toZone(this.__originCellXC);
      } else {
        throw new Error(
          _lt(
            `In this context, the function [[FUNCTION_NAME]] needs to have a cell or range in parameter.`
          )
        );
      }
    }
    return zone.left + 1;
  },
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
};

// -----------------------------------------------------------------------------
// HLOOKUP
// -----------------------------------------------------------------------------

export const HLOOKUP: AddFunctionDescription = {
  description: _lt(`Horizontal lookup`),
  args: args(`
      search_key (any) ${_lt("The value to search for. For example, 42, 'Cats', or I24.")}
      range (any, range) ${_lt(
        "The range to consider for the search. The first row in the range is searched for the key specified in search_key."
      )}
      index (number) ${_lt(
        "The row index of the value to be returned, where the first row in range is numbered 1."
      )}
      is_sorted (boolean, default=TRUE) ${_lt(
        "Indicates whether the row to be searched (the first row of the specified range) is sorted, in which case the closest match for search_key will be returned."
      )}
  `),
  returns: ["ANY"],
  compute: function (searchKey: any, range: any[], index: any, isSorted: any = true): any {
    const _index = Math.trunc(toNumber(index));
    if (_index < 1 || range[0].length < _index) {
      throw new Error(_lt(`[[FUNCTION_NAME]] evaluates to an out of bounds range.`));
    }

    const _isSorted = toBoolean(isSorted);
    const firstRow = range.map((col) => col[0]);
    let colIndex;
    if (_isSorted) {
      colIndex = dichotomicPredecessorSearch(firstRow, searchKey);
    } else {
      colIndex = linearSearch(firstRow, searchKey);
    }

    if (colIndex > -1) {
      return range[colIndex][_index - 1];
    } else {
      throw new Error(_lt(`Did not find value '${searchKey}' in [[FUNCTION_NAME]] evaluation.`));
    }
  },
};

// -----------------------------------------------------------------------------
// LOOKUP
// -----------------------------------------------------------------------------

export const LOOKUP: AddFunctionDescription = {
  description: _lt(`Look up a value.`),
  args: args(`
      search_key (any) ${_lt("The value to search for. For example, 42, 'Cats', or I24.")}
      search_array (any, range) ${_lt(
        "One method of using this function is to provide a single sorted row or column search_array to look through for the search_key with a second argument result_range. The other way is to combine these two arguments into one search_array where the first row or column is searched and a value is returned from the last row or column in the array. If search_key is not found, a non-exact match may be returned."
      )}
      result_range (any, range, optional) ${_lt(
        "The range from which to return a result. The value returned corresponds to the location where search_key is found in search_range. This range must be only a single row or column and should not be used if using the search_result_array method."
      )}
  `),
  returns: ["ANY"],
  compute: function (searchKey: any, searchArray: any, resultRange: any = undefined): any {
    const verticalSearch = searchArray[0].length >= searchArray.length;
    const searchRange = verticalSearch ? searchArray[0] : searchArray.map((c) => c[0]);

    const index = dichotomicPredecessorSearch(searchRange, searchKey);
    if (index === -1) {
      throw new Error(_lt(`Did not find value '${searchKey}' in [[FUNCTION_NAME]] evaluation.`));
    }
    if (resultRange === undefined) {
      return verticalSearch ? searchArray.pop()[index] : searchArray[index].pop();
    }

    const nbCol = resultRange.length;
    const nbRow = resultRange[0].length;
    if (nbCol > 1 && nbRow > 1) {
      throw new Error(_lt(`[[FUNCTION_NAME]] range must be a single row or a single column.`));
    }

    if (nbCol > 1) {
      if (nbCol - 1 < index) {
        throw new Error(
          _lt(
            "[[FUNCTION_NAME]] evaluates to an out of range row value %s.",
            (index + 1).toString()
          )
        );
      }
      return resultRange[index][0];
    }

    if (nbRow - 1 < index) {
      throw new Error(
        _lt(
          "[[FUNCTION_NAME]] evaluates to an out of range column value %s.",
          (index + 1).toString()
        )
      );
    }
    return resultRange[0][index];
  },
};

// -----------------------------------------------------------------------------
// MATCH
// -----------------------------------------------------------------------------

export const MATCH: AddFunctionDescription = {
  description: _lt(`Position of item in range that matches value.`),
  args: args(`
      search_key (any) ${_lt("The value to search for. For example, 42, 'Cats', or I24.")}
      range (any, range) ${_lt("The one-dimensional array to be searched.")}
      search_type (number, default=1) ${_lt(
        "The search method. 1 (default) finds the largest value less than or equal to search_key when range is sorted in ascending order. 0 finds the exact value when range is unsorted. -1 finds the smallest value greater than or equal to search_key when range is sorted in descending order."
      )}
  `),
  returns: ["NUMBER"],
  compute: function (searchKey: any, range: any[], searchType: any = 1): number {
    let _searchType = toNumber(searchType);
    const nbCol = range.length;
    const nbRow = range[0].length;
    if (nbCol > 1 && nbRow > 1) {
      throw new Error(_lt(`[[FUNCTION_NAME]] range must be a single row or a single column.`));
    }
    let index = -1;
    range = range.flat();
    _searchType = Math.sign(_searchType);
    switch (_searchType) {
      case 1:
        index = dichotomicPredecessorSearch(range, searchKey);
        break;
      case 0:
        index = linearSearch(range, searchKey);
        break;
      case -1:
        index = dichotomicSuccessorSearch(range, searchKey);
        break;
    }
    if (index > -1) {
      return index + 1;
    } else {
      throw new Error(_lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", searchKey));
    }
  },
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
    let zone;
    if (cellReference) {
      zone = toZone(cellReference);
    } else {
      if (this.__originCellXC) {
        zone = toZone(this.__originCellXC);
      } else {
        throw Error(
          `In this context, the function [[FUNCTION_NAME]] needs to have a cell or range in parameter.`
        );
      }
    }
    return zone.top + 1;
  },
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
      is_sorted (boolean, default=TRUE) ${_lt(
        "Indicates whether the column to be searched (the first column of the specified range) is sorted, in which case the closest match for search_key will be returned."
      )}
  `),
  returns: ["ANY"],
  compute: function (searchKey: any, range: any[], index: any, isSorted: any = true): any {
    const _index = Math.trunc(toNumber(index));
    if (_index < 1 || range.length < _index) {
      throw new Error(_lt(`[[FUNCTION_NAME]] evaluates to an out of bounds range.`));
    }

    const _isSorted = toBoolean(isSorted);
    const firstCol = range[0];
    let rowIndex;
    if (_isSorted) {
      rowIndex = dichotomicPredecessorSearch(firstCol, searchKey);
    } else {
      rowIndex = linearSearch(firstCol, searchKey);
    }

    if (rowIndex > -1) {
      return range[_index - 1][rowIndex];
    } else {
      throw new Error(_lt("Did not find value '%s' in [[FUNCTION_NAME]] evaluation.", searchKey));
    }
  },
};
