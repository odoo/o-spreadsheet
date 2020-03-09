import { args, toNumber, toBoolean } from "./arguments";
import { FunctionDescription } from "./index";

// -----------------------------------------------------------------------------
// VLOOKUP
// -----------------------------------------------------------------------------

/**
 * Perform a dicotomic search and return the index of the nearest match less than
 * or equal to the target. If all values in the range are greater than the target,
 * -1 is returned.
 * If the range is not in sorted order, an incorrect value might be returned.
 *
 * Example:
 * - [3, 6, 10], 3 => 0
 * - [3, 6, 10], 6 => 1
 * - [3, 6, 10], 9 => 1
 * - [3, 6, 10], 42 => 2
 * - [3, 6, 10], 2 => -1
 */
function dichotomicPredecessorSearch(range: any[], target: any): number {
  const typeofTarget = typeof target;
  let min = 0;
  let max = range.length - 1;
  let avg = Math.ceil((min + max) / 2);
  let current = range[avg];
  while (max - min > 0) {
    if (typeofTarget === typeof current && target < current) {
      max = avg - 1;
    } else {
      min = avg;
    }
    avg = Math.ceil((min + max) / 2);
    current = range[avg];
  }
  if (target < current) {
    // all values in the range are greater than the target, -1 is returned.
    return -1;
  }
  return avg;
}

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

const valueNotFound = value => `Did not find value '${value}' in VLOOKUP evaluation.`;

export const VLOOKUP: FunctionDescription = {
  description: `Vertical lookup.`,
  args: args`
      search_key (any) The value to search for. For example, 42, "Cats", or I24.
      range (any, range) The range to consider for the search. The first column in the range is searched for the key specified in search_key.
      index (number) The column index of the value to be returned, where the first column in range is numbered 1.
      is_sorted (boolean, optional, default = TRUE) Indicates whether the column to be searched [the first column of the specified range] is sorted, in which case the closest match for search_key will be returned.
  `,
  returns: ["ANY"],
  compute: function(search_key: any, range: any[], index: any, is_sorted: any = true): any {
    const _index = Math.trunc(toNumber(index));
    const _isSorted = toBoolean(is_sorted);
    const firstCol = range[0];
    let lineIndex;
    if (_index < 1 || range.length < _index) {
      throw new Error(`VLOOKUP evaluates to an out of bounds range.`);
    }
    if (_isSorted) {
      lineIndex = dichotomicPredecessorSearch(firstCol, search_key);
    } else {
      lineIndex = linearSearch(firstCol, search_key);
    }
    if (lineIndex > -1) {
      return range[_index - 1][lineIndex];
    } else {
      throw new Error(valueNotFound(search_key));
    }
  }
};
