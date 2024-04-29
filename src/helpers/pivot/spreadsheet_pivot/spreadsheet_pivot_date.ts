import { toJsDate, toNumber } from "../../../functions/helpers";
import { Locale } from "../../../types";
import { PivotDimension } from "../../../types/pivot";
import { FieldValue } from "./spreadsheet_pivot_data_entry";

export function createDate(dimension: PivotDimension, value: FieldValue["value"], locale: Locale) {
  const granularity = dimension.granularity || "month_number";
  if (!MAP_VALUE_DIMENSION_DATE[granularity].set.has(value)) {
    MAP_VALUE_DIMENSION_DATE[granularity].set.add(value);
    const date = toJsDate(value, locale);
    let number: FieldValue["value"] = 0;
    switch (granularity) {
      case "year_number":
        number = date.getFullYear();
        break;
      case "month_number":
        number = date.getMonth();
        break;
      case "day_of_month":
        number = date.getDate();
        break;
      case "day":
        number = Math.floor(toNumber(value, locale));
        break;
    }
    MAP_VALUE_DIMENSION_DATE[granularity].values[`${value}`] = number;
  }
  return MAP_VALUE_DIMENSION_DATE[granularity].values[`${value}`]; //TODOPRO I think that if it's a date it should be number, right ?
}

/**
 * This map is used to cache the different values of a pivot date value
 */
const MAP_VALUE_DIMENSION_DATE: Record<
  string,
  { set: Set<FieldValue["value"]>; values: Record<string, FieldValue["value"]> }
> = {
  year_number: {
    set: new Set<FieldValue["value"]>(),
    values: {},
  },
  month_number: {
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
