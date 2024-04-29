import { Locale } from "../../../types";
import { DomainArg, PivotDimension } from "../../../types/pivot";
import { DataEntries, FieldName, groupBy } from "./spreadsheet_pivot_data_entry";

/**
 * Check if the array contains a given value using
 * a binary search.
 *
 * ** The array must be sorted! **
 */
function binarySearch<T>(arr: T[], value: T): boolean {
  let start = 0;
  let end = arr.length - 1;
  while (start <= end) {
    let mid = Math.floor((start + end) / 2);
    if (arr[mid] === value) {
      return true;
    } else if (arr[mid] < value) {
      start = mid + 1;
    } else {
      end = mid - 1;
    }
  }
  return false;
}

export class SpreadsheetPivotCalculator {
  private cacheKeys: number[] = [];
  private cache: Record<FieldName, Record<string, number[]>> = {};
  constructor(private data: DataEntries, dimensions: PivotDimension[], locale: Locale) {
    this.cacheKeys = [...this.data.keys()].sort((a, b) => a - b);
    for (const dimension of dimensions) {
      this.cache[dimension.nameWithGranularity] = {};
      const groups = groupBy(this.data, dimension, locale);
      for (const key in groups) {
        this.cache[dimension.nameWithGranularity][key] = groups[key]!.map(
          (entry) => entry["__source_row_index__"]?.value as number
        );
      }
    }
    this.cacheKeys;
    this.cache;
  }

  getDataEntries(domain: DomainArg[]): number[] {
    let returnValue = this.cacheKeys;
    let i = 0;
    while (i < domain.length && returnValue.length) {
      const { field, value } = domain[i];
      if (!(field in this.cache)) {
        return [];
      }
      if (!(value in this.cache[field])) {
        return [];
      }
      const measureIds = this.cache[field][value] || [];
      returnValue = measureIds.filter((x) => binarySearch(returnValue, x));
      i += 1;
    }
    return returnValue;
  }
}
