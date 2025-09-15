import { toJsDate, toNumber } from "../../../functions/helpers";
import { CellValue, Locale } from "../../../types";
import { PivotDimension } from "../../../types/pivot";
import { toNormalizedPivotValue } from "../pivot_helpers";

const NULL_SYMBOL = Symbol("NULL");

export function createDate(
  dimension: Pick<PivotDimension, "type" | "displayName" | "granularity">,
  value: CellValue,
  locale: Locale
): CellValue {
  const granularity = dimension.granularity || "month";
  if (!(granularity in MAP_VALUE_DIMENSION_DATE)) {
    throw new Error(`Unknown date granularity: ${granularity}`);
  }
  const keyInMap = typeof value === "number" || typeof value === "string" ? value : NULL_SYMBOL;
  if (!MAP_VALUE_DIMENSION_DATE[granularity].set.has(value)) {
    MAP_VALUE_DIMENSION_DATE[granularity].set.add(value);
    let number: CellValue = null;
    if (typeof value === "number" || typeof value === "string") {
      const date = toJsDate(value, locale);
      switch (granularity) {
        case "year":
          number = date.getFullYear();
          break;
        case "quarter_number":
          number = Math.floor(date.getMonth() / 3) + 1;
          break;
        case "month_number":
          number = date.getMonth() + 1;
          break;
        case "month":
          number = Math.floor(toNumber(value, locale));
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
        case "day_of_week":
          /**
           * getDay() returns the day of the week in the range 0-6, with 0
           * being Sunday. We need to normalize this to the range 1-7, with 1
           * being the first day of the week depending on the locale.
           * Normalized value: fr_FR: 1: Monday, 7: Sunday   (weekStart = 1)
           *                   en_US: 1: Sunday, 7: Saturday (weekStart = 7)
           */
          number = ((date.getDay() + 7 - locale.weekStart) % 7) + 1;
          break;
        case "hour_number":
          number = date.getHours();
          break;
        case "minute_number":
          number = date.getMinutes();
          break;
        case "second_number":
          number = date.getSeconds();
          break;
      }
    }
    MAP_VALUE_DIMENSION_DATE[granularity].values[keyInMap] = toNormalizedPivotValue(
      dimension,
      number
    );
  }
  return MAP_VALUE_DIMENSION_DATE[granularity].values[keyInMap];
}

/**
 * This map is used to cache the different values of a pivot date value
 * 43_831 -> 01/01/2012
 * Example: {
 *   year: {
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
 *   day_of_week: {
 *     set: { 45_387 },
 *     values: { '45_387': 6 } (in locale with startWeek = 7)
 *   }
 *   hour_number: {
 *     set: { 45_387.13 },
 *     values: { '45_387.13': 3 }
 *   }
 *   minute_number: {
 *     set: { 45_387.13 },
 *     values: { '45_387.13': 7 }
 *   }
 *   second_number: {
 *     set: { 45_387.13 },
 *     values: { '45_387.13': 12 }
 *   }
 * }
 */
const MAP_VALUE_DIMENSION_DATE: Record<
  string,
  { set: Set<CellValue>; values: Record<string | number | symbol, CellValue> }
> = {
  year: {
    set: new Set<CellValue>(),
    values: {},
  },
  quarter_number: {
    set: new Set<CellValue>(),
    values: {},
  },
  month_number: {
    set: new Set<CellValue>(),
    values: {},
  },
  month: {
    set: new Set<CellValue>(),
    values: {},
  },
  iso_week_number: {
    set: new Set<CellValue>(),
    values: {},
  },
  day_of_month: {
    set: new Set<CellValue>(),
    values: {},
  },
  day: {
    set: new Set<CellValue>(),
    values: {},
  },
  day_of_week: {
    set: new Set<CellValue>(),
    values: {},
  },
  hour_number: {
    set: new Set<CellValue>(),
    values: {},
  },
  minute_number: {
    set: new Set<CellValue>(),
    values: {},
  },
  second_number: {
    set: new Set<CellValue>(),
    values: {},
  },
};

/**
 * Reset the cache of the pivot date values.
 */
export function resetMapValueDimensionDate() {
  for (const key in MAP_VALUE_DIMENSION_DATE) {
    MAP_VALUE_DIMENSION_DATE[key].set.clear();
    MAP_VALUE_DIMENSION_DATE[key].values = {};
  }
}
