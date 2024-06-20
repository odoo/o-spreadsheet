import { toJsDate, toNumber } from "../../../functions/helpers";
import { Locale } from "../../../types";
import { PivotDimension } from "../../../types/pivot";
import { toNormalizedPivotValue } from "../pivot_helpers";
import { FieldValue } from "./data_entry_spreadsheet_pivot";

export function createDate(dimension: PivotDimension, value: FieldValue["value"], locale: Locale) {
  const granularity = dimension.granularity;
  if (!granularity || !(granularity in MAP_VALUE_DIMENSION_DATE)) {
    throw new Error(`Unknown date granularity: ${granularity}`);
  }
  if (value === null) {
    return null;
  }
  if (!MAP_VALUE_DIMENSION_DATE[granularity].set.has(value)) {
    MAP_VALUE_DIMENSION_DATE[granularity].set.add(value);
    const date = toJsDate(value, locale);
    let number: FieldValue["value"] = 0;
    switch (granularity) {
      case "year_number":
        number = date.getFullYear();
        break;
      case "quarter_number":
        number = Math.floor(date.getMonth() / 3) + 1;
        break;
      case "month_number":
        number = date.getMonth() + 1;
        break;
      case "iso_week_number":
        number = date.getIsoWeek();
        break;
      case "day_of_month":
        number = date.getDate();
        break;
      case "day":
        number = Math.floor(toNumber(value, locale));
        break;
    }
    MAP_VALUE_DIMENSION_DATE[granularity].values[`${value}`] = toNormalizedPivotValue(
      dimension,
      number
    );
  }
  return MAP_VALUE_DIMENSION_DATE[granularity].values[`${value}`];
}

/**
 * This map is used to cache the different values of a pivot date value
 * 43_831 -> 01/01/2012
 * Example: {
 *   year_number: {
 *     set: { 43_831 },
 *     values: { '43_831': 2012 }
 *   },
 *   quarter_number: {
 *     set: { 43_831 },
 *     values: { '43_831': 1 }
 *   },
 *   month_number: {
 *     set: { 43_831 },
 *     values: { '43_831': 0 }
 *   },
 *   iso_week_number: {
 *     set: { 43_831 },
 *     values: { '43_831': 1 }
 *   },
 *   day_of_month: {
 *     set: { 43_831 },
 *     values: { '43_831': 1 }
 *   },
 *   day: {
 *     set: { 43_831 },
 *     values: { '43_831': 43_831 }
 *   }
 * }
 */
const MAP_VALUE_DIMENSION_DATE: Record<
  string,
  { set: Set<FieldValue["value"]>; values: Record<string, FieldValue["value"]> }
> = {
  year_number: {
    set: new Set<FieldValue["value"]>(),
    values: {},
  },
  quarter_number: {
    set: new Set<FieldValue["value"]>(),
    values: {},
  },
  month_number: {
    set: new Set<FieldValue["value"]>(),
    values: {},
  },
  iso_week_number: {
    set: new Set<FieldValue["value"]>(),
    values: {},
  },
  day_of_month: {
    set: new Set<FieldValue["value"]>(),
    values: {},
  },
  day: {
    set: new Set<FieldValue["value"]>(),
    values: {},
  },
};
