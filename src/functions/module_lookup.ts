import { _lt } from "../translation";
import { FunctionDescription } from "../types";
import { args } from "./arguments";
import {
  dichotomicPredecessorSearch,
  dichotomicSuccessorSearch,
  toBoolean,
  toNumber,
} from "./helpers";
import { isPlainObject } from "../helpers/misc";

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
    } else if (
      isPlainObject(range[i]) &&
      range[i].jsDate &&
      isPlainObject(target) &&
      target.jsDate &&
      range[i].jsDate.getDate() === target.jsDate.getDate()
    ) {
      return i;
    }
  }
  // no value is found, -1 is returned
  return -1;
}

// -----------------------------------------------------------------------------
// LOOKUP
// -----------------------------------------------------------------------------

export const LOOKUP: FunctionDescription = {
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
  compute: function (search_key: any, search_array: any, result_range: any = undefined): any {
    const verticalSearch = search_array[0].length >= search_array.length;
    const searchRange = verticalSearch ? search_array[0] : search_array.map((c) => c[0]);

    const index = dichotomicPredecessorSearch(searchRange, search_key);
    if (index === -1) {
      throw new Error(_lt("Did not find value '%s' in LOOKUP evaluation.", search_key));
    }
    if (result_range === undefined) {
      return verticalSearch ? search_array.pop()[index] : search_array[index].pop();
    }

    const nbCol = result_range.length;
    const nbRow = result_range[0].length;
    if (nbCol > 1 && nbRow > 1) {
      throw new Error(_lt(`LOOKUP range must be a single row or a single column.`));
    }

    if (nbCol > 1) {
      if (nbCol - 1 < index) {
        throw new Error(
          _lt("LOOKUP evaluates to an out of range row value %s.", (index + 1).toString())
        );
      }
      return result_range[index][0];
    }

    if (nbRow - 1 < index) {
      throw new Error(
        _lt("LOOKUP evaluates to an out of range column value %s.", (index + 1).toString())
      );
    }
    return result_range[0][index];
  },
};

// -----------------------------------------------------------------------------
// MATCH
// -----------------------------------------------------------------------------

export const MATCH: FunctionDescription = {
  description: _lt(`Position of item in range that matches value.`),
  args: args(`
      search_key (any) ${_lt("The value to search for. For example, 42, 'Cats', or I24.")}
      range (any, range) ${_lt("The one-dimensional array to be searched.")}
      search_type (number, optional, default=1) ${_lt(
        "The search method. 1 (default) finds the largest value less than or equal to search_key when range is sorted in ascending order. 0 finds the exact value when range is unsorted. -1 finds the smallest value greater than or equal to search_key when range is sorted in descending order."
      )}
  `),
  returns: ["NUMBER"],
  compute: function (search_key: any, range: any[], search_type: any = 1): number {
    let _searchType = toNumber(search_type);
    const nbCol = range.length;
    const nbRow = range[0].length;
    if (nbCol > 1 && nbRow > 1) {
      throw new Error(_lt(`MATCH range must be a single row or a single column.`));
    }
    let index = -1;
    range = range.flat();
    _searchType = Math.sign(_searchType);
    switch (_searchType) {
      case 1:
        index = dichotomicPredecessorSearch(range, search_key);
        break;
      case 0:
        index = linearSearch(range, search_key);
        break;
      case -1:
        index = dichotomicSuccessorSearch(range, search_key);
        break;
    }
    if (index > -1) {
      return index + 1;
    } else {
      throw new Error(_lt("Did not find value '%s' in MATCH evaluation.", search_key));
    }
  },
};

// -----------------------------------------------------------------------------
// VLOOKUP
// -----------------------------------------------------------------------------

export const VLOOKUP: FunctionDescription = {
  description: _lt(`Vertical lookup.`),
  args: args(`
      search_key (any) ${_lt("The value to search for. For example, 42, 'Cats', or I24.")}
      range (any, range) ${_lt(
        "The range to consider for the search. The first column in the range is searched for the key specified in search_key."
      )}
      index (number) ${_lt(
        "The column index of the value to be returned, where the first column in range is numbered 1."
      )}
      is_sorted (boolean, optional, default = TRUE) ${_lt(
        "Indicates whether the column to be searched [the first column of the specified range] is sorted, in which case the closest match for search_key will be returned."
      )}
  `),
  returns: ["ANY"],
  compute: function (search_key: any, range: any[], index: any, is_sorted: any = true): any {
    const _index = Math.trunc(toNumber(index));
    if (_index < 1 || range.length < _index) {
      throw new Error(_lt(`VLOOKUP evaluates to an out of bounds range.`));
    }

    const _isSorted = toBoolean(is_sorted);
    const firstCol = range[0];
    let lineIndex;
    if (_isSorted) {
      lineIndex = dichotomicPredecessorSearch(firstCol, search_key);
    } else {
      lineIndex = linearSearch(firstCol, search_key);
    }

    if (lineIndex > -1) {
      return range[_index - 1][lineIndex];
    } else {
      throw new Error(_lt("Did not find value '%s' in VLOOKUP evaluation.", search_key));
    }
  },
};
