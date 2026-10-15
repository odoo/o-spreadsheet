import { _t } from "../../translation";
import { EvaluatedCell } from "../../types/cells";
import { Getters } from "../../types/getters";
import { numberToJsDate } from "../dates";
import { formatValue, MONTHS, QUARTERS, DAYS as WEEKDAYS } from "../format/format";
import { toTrimmedLowerCase } from "../text_helper";
import { zoneToXc } from "../zones";
import { ColumnAnalysis } from "./data_analysis";
import {
  createStatItem,
  DateSections,
  getStatIdForDay,
  getStatIdForMonth,
  getStatIdForQuarter,
  getStatIdForWeek,
  getStatIdForYear,
  StatValue,
} from "./statistics_items";

const ALL_TYPES = ["number", "percentage", "date", "text", "boolean", "label", "categorical"];
const NUMERIC_TYPES = ["number", "percentage"];

interface StatItemConfig {
  id: string;
  getName: (type: string) => string;
  formula: (range: string) => string;
  types: string[];
}

export function generateItemIdFromValue(value: any) {
  return toTrimmedLowerCase(String(value));
}

const GENERIC_STAT_ITEMS: StatItemConfig[] = [
  {
    id: "non_empty",
    getName: () => _t("Non-empty cells"),
    formula: (range) => `=COUNTA(${range})`,
    types: ALL_TYPES,
  },
  {
    id: "unique",
    getName: () => _t("Unique values"),
    formula: (range) => `=COUNTUNIQUE(${range})`,
    types: ALL_TYPES,
  },
  {
    id: "sum",
    getName: () => _t("Sum"),
    formula: (range) => `=SUM(${range})`,
    types: NUMERIC_TYPES,
  },
  {
    id: "median",
    getName: () => _t("Median"),
    formula: (range) => `=MEDIAN(${range})`,
    types: [...NUMERIC_TYPES, "date"],
  },
  {
    id: "average",
    getName: () => _t("Average"),
    formula: (range) => `=AVERAGE(${range})`,
    types: [...NUMERIC_TYPES, "date"],
  },
  {
    id: "min",
    getName: (type) => (type === "date" ? _t("Earliest date") : _t("Minimum value")),
    formula: (range) => `=MIN(${range})`,
    types: [...NUMERIC_TYPES, "date"],
  },
  {
    id: "max",
    getName: (type) => (type === "date" ? _t("Latest date") : _t("Maximum value")),
    formula: (range) => `=MAX(${range})`,
    types: [...NUMERIC_TYPES, "date"],
  },
];

export function buildGeneralStatItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  const range = zoneToXc(zone);
  return GENERIC_STAT_ITEMS.map((item) => {
    const name = item.getName(col.type);
    return item.types.includes(col.type)
      ? createStatItem(getters, sheetId, { id: item.id, name, formula: item.formula(range) })
      : { id: item.id, name, formula: "", rawValue: "", value: "—" };
  });
}

/** Pattern A + B + D + E — Single number/percentage or categorical/label column: general stats + occurrences per value. */
export function buildOccurrencesItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  const range = zoneToXc(zone);
  const count: Map<string, number> = new Map();
  const vals = getters.getEvaluatedCellsInZone(sheetId, zone);
  for (const cell of vals) {
    const key = generateItemIdFromValue(cell.value);
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  const items = uniqueValues(col.nonEmpty)
    .filter(({ formattedValue }) => formattedValue !== "")
    .map(({ value, formattedValue }) =>
      createStatItem(getters, sheetId, {
        id: generateItemIdFromValue(value),
        name: formattedValue,
        formula: `=COUNTIF(${range},"${value}")`,
        computedValue: {
          value: count.get(generateItemIdFromValue(value)) ?? 0,
        },
      })
    );
  return withPercentages(items, col.nonEmpty.length);
}

export function buildCategorySumItems(
  getters: Getters,
  colCategories: ColumnAnalysis,
  colValues: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  if (!colCategories || !colValues) {
    return [];
  }
  // shared flag to solve bug where column of values has an header and column of categories contains only text so we need
  // to ensure first row of categories is considered as an header
  const hasHeader = colCategories.headerInZone || colValues.headerInZone;
  const categoryZone = hasHeader
    ? { ...colCategories.zone, top: colCategories.zone.top + 1 }
    : colCategories.zone;
  const valueZone = hasHeader ? { ...colValues.zone, top: colValues.zone.top + 1 } : colValues.zone;

  if (categoryZone.bottom - categoryZone.top !== valueZone.bottom - valueZone.top) {
    return [];
  }

  const categoryZoneBounds = zoneToXc(categoryZone);
  const valueZoneBounds = zoneToXc(valueZone);
  // const sumMap: Map<string, number> = new Map();
  const categoryCells = getters.getEvaluatedCellsInZone(sheetId, categoryZone);
  const valueCells = getters.getEvaluatedCellsInZone(sheetId, valueZone);
  const format = valueCells.find((cell) => cell?.format)?.format;

  // // TODO MAWAT: try with javascritp group by
  // // const allValuesByCategory=[
  //   {category: value}, {category:value}, etc.
  // ]
  // const allGroupedByCategory = Object.groupBy(allValuesByCategory, (item) => item.category);
  // // {"category1": [...], "category2": [...], ...}
  /* 
  SOLUTION 1 : groupBy + simple loop
  Complexity O(n) (groupBY) + O(n) (filter) + O(n) (loop) = O(n)
  */
  // const categoryValuePairs = categoryCells.map((cell, i) => [
  //   cell?.value?.toString()?.trim(),
  //   valueCells[i]?.value
  // ]).filter(([category, value]) => category && value !== null && value !== undefined && value !== 0) as [string, any];

  // const sumValueByCategory = Object.groupBy(categoryValuePairs, ([categoryValuePair]) => categoryValuePair)

  // for (const category in sumValueByCategory) {
  //   sumValueByCategory[category] = sumValueByCategory[category]?.reduce((acc, [, val]) => acc + val, 0)
  // }
  /* SOLUTION 2 : simple loop
    Is it better to use a simple loop as we only loop through element once then we have a complexity O(n)
    or is it better to use SOLUTION 1 which is more compact but has a worse complexity ?
  */
  const sumValueByCategory: Record<string, number> = {};
  for (let i = 0; i < categoryCells.length; i++) {
    const category = categoryCells[i]?.value?.toString()?.trim();
    const value = valueCells[i]?.value;
    if (!category || value === null || value === undefined || value === 0) {
      continue;
    }

    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      continue;
    }

    sumValueByCategory[category] = (sumValueByCategory[category] || 0) + numericValue;
  }

  return Object.entries(sumValueByCategory).map(([category, total]) => {
    return createStatItem(getters, sheetId, {
      id: generateItemIdFromValue(category),
      name: category,
      formula: `=SUMIF(${categoryZoneBounds},"${category}",${valueZoneBounds})`,
      computedValue: {
        value: total,
      },
      format: format,
    });
  });
  // const moneyFormat = valueCells.find((cell) => cell?.format)?.format;
  // for (let i = 0; i < categoryCells.length; i++) {
  //   const catCell = categoryCells[i];
  //   const moneyCell = valueCells[i];
  //   if (!catCell || !moneyCell) {
  //     continue;
  //   }
  //   const key = toTrimmedLowerCase(String(catCell.value));  // sure?
  //   const amount = Number(moneyCell.value);
  //   const validAmount = isNaN(amount) ? 0 : amount;
  //   sumMap.set(
  //     key, (sumMap.get(key) ?? 0) + validAmount
  //     //category1: {value: valueCategory1, categoryText: catCell.value},
  //   );
  // }

  // return uniqueValues(colCategories.nonEmpty)
  //   .filter(({ formattedValue }) => formattedValue !== "")
  //   .map(({ value: category, formattedValue }) =>
  //     createStatItem(getters, sheetId, {
  //       id: generateItemIdFromValue(category),
  //       name: formattedValue,
  //       formula: `=SUMIF(${categoryZoneBounds},"${category}",${valueZoneBounds})`,
  //       computedValue: {
  //         value: sumMap.get(toTrimmedLowerCase(String(category))) ?? 0,
  //       },
  //       format: moneyFormat,
  //     })
  //   )
  //   .filter(isNonZero);
}

function uniqueValues(
  cells: EvaluatedCell[]
): { value: string | number | boolean | null; formattedValue: string }[] {
  const normalizedValues = new Set<string>();
  const uniqueValuesList: { value: string | number | boolean | null; formattedValue: string }[] =
    [];
  for (const cell of cells) {
    const { value, formattedValue } = cell;
    const normalizedValue = toTrimmedLowerCase(String(value));
    if (!normalizedValues.has(normalizedValue)) {
      normalizedValues.add(normalizedValue);
      uniqueValuesList.push({ value, formattedValue });
    }
  }
  return uniqueValuesList;
}

export function buildBooleanItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  const range = zoneToXc(zone);
  const items = [
    createStatItem(getters, sheetId, {
      id: "true",
      name: _t("TRUE"),
      formula: `=COUNTIF(${range},TRUE)`,
    }),
    createStatItem(getters, sheetId, {
      id: "false",
      name: _t("FALSE"),
      formula: `=COUNTIF(${range},FALSE)`,
    }),
  ];
  return withPercentages(items, col.nonEmpty.length);
}

/** Pattern C — Single date column */
export function buildDateStatSections(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): DateSections {
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  const range = zoneToXc(zone);
  const dateValues = col.nonEmpty
    .map((cell) => cell.value)
    .filter((value): value is number => typeof value === "number");
  const earliestYear = numberToJsDate(Math.min(...dateValues)).getFullYear();
  const latestYear = numberToJsDate(Math.max(...dateValues)).getFullYear();
  const yearRange = Array.from(
    { length: latestYear - earliestYear + 1 },
    (_, i) => earliestYear + i
  );
  const yearItems = yearRange.map((year) =>
    createStatItem(getters, sheetId, {
      id: String(year),
      name: getStatIdForYear(year),
      formula: `=SUM(COUNTIF(YEAR(${range}),${year}))`,
    })
  );
  const monthItems = Object.entries(MONTHS).map(([month, name]) =>
    createStatItem(getters, sheetId, {
      id: getStatIdForMonth(month),
      name: name.toString(),
      formula: `=COUNTIF(FILTER(MONTH(${range}), ${range}), ${Number(month) + 1})`,
    })
  );
  const locale = getters.getLocale();
  const firstDayOfWeek = locale.weekStart;
  const offset = firstDayOfWeek % 7;
  const dayItems: StatValue[] = [];
  for (let i = 0; i < 7; i++) {
    const day = (i + offset) % 7;
    const name = WEEKDAYS[day].toString();
    dayItems.push(
      createStatItem(getters, sheetId, {
        id: getStatIdForDay(day),
        name,
        formula: `=COUNTIF(FILTER(WEEKDAY(${range}), ${range}), ${day + 1})`,
      })
    );
  }
  return {
    year: withPercentages(yearItems, col.nonEmpty.length),
    quarter: [],
    month: withPercentages(monthItems, col.nonEmpty.length),
    week: [],
    weekday: [],
    day: withPercentages(dayItems, col.nonEmpty.length),
    date: [],
  };
}

function withPercentages(items: StatValue[], total: number): StatValue[] {
  if (total === 0) {
    return items;
  }
  return items.map((item) => ({
    ...item,
    percentage: `(${Math.round((Number(item.value) / total) * 100)}%)`,
  }));
}

export function buildGroupedDateSections(
  getters: Getters,
  colDates: ColumnAnalysis,
  colValues: ColumnAnalysis,
  sheetId: string
): DateSections {
  if (!colDates || !colValues) {
    return { year: [], quarter: [], month: [], week: [], weekday: [], day: [], date: [] };
  }
  const zoneDates = colDates.headerInZone
    ? { ...colDates.zone, top: colDates.zone.top + 1 }
    : colDates.zone;
  const zoneValues = colValues.headerInZone
    ? { ...colValues.zone, top: colValues.zone.top + 1 }
    : colValues.zone;

  if (zoneDates.bottom - zoneDates.top !== zoneValues.bottom - zoneValues.top) {
    return { year: [], quarter: [], month: [], week: [], weekday: [], day: [], date: [] };
  }

  const valueCell = getters.getEvaluatedCellsInZone(sheetId, zoneValues);
  const valueFormat = valueCell.find((cell) => cell?.format)?.format;
  // copy of code
  const rangeDates = zoneToXc(zoneDates);
  const rangeValues = zoneToXc(zoneValues);
  const dateValues = colDates.nonEmpty
    .map((cell) => cell.value)
    .filter((value): value is number => typeof value === "number");
  const earliestYear = numberToJsDate(Math.min(...dateValues)).getFullYear();
  const latestYear = numberToJsDate(Math.max(...dateValues)).getFullYear();
  const yearRange = Array.from(
    { length: latestYear - earliestYear + 1 },
    (_, i) => earliestYear + i
  );
  const earliestWeek = numberToJsDate(Math.min(...dateValues)).getIsoWeek();
  const latestWeek = numberToJsDate(Math.max(...dateValues)).getIsoWeek();
  const weekRange = Array.from(
    { length: latestWeek - earliestWeek + 1 },
    (_, i) => earliestWeek + i
  );
  const dayRange = Array.from({ length: 31 }, (_, i) => i);
  // end of copy of code
  const yearItems = yearRange
    .map((year) =>
      createStatItem(getters, sheetId, {
        id: String(year),
        name: getStatIdForYear(year),
        // TODO: VSC is it the same as countif ?
        // MAWAT : fixed, sumproduct replaced by sumif (better perf)
        formula: `=SUMIF(YEAR(${rangeDates}), ${year}, ${rangeValues})`,
        format: valueFormat,
      })
    )
    .filter((x) => x.rawValue !== "0");
  const quarterItems = Object.entries(QUARTERS)
    .map(([quarter, name]) =>
      createStatItem(getters, sheetId, {
        id: getStatIdForQuarter(quarter),
        name: name.toString(),
        formula: `=SUMIF(QUARTER(${rangeDates}), ${Number(quarter)}, ${rangeValues})`,
        format: valueFormat,
      })
    )
    .filter((x) => x.rawValue !== "0");
  const monthItems = Object.entries(MONTHS)
    .map(([month, name]) =>
      createStatItem(getters, sheetId, {
        id: getStatIdForMonth(month),
        name: name.toString(),
        formula: `=SUMIF(MONTH(${rangeDates}), ${Number(month) + 1}, ${rangeValues})`,
        format: valueFormat,
      })
    )
    .filter((x) => x.rawValue !== "0");
  const weekItems = weekRange
    .map((week) =>
      createStatItem(getters, sheetId, {
        id: String(week),
        name: getStatIdForWeek(week),
        formula: `=SUMIF(ISOWEEKNUM(${rangeDates}), ${week}, ${rangeValues})`,
        format: valueFormat,
      })
    )
    .filter((x) => x.rawValue !== "0");
  // TODO: day of the month (actual dates or weekdays or day of the month)
  // MAWAT : quarter, date, day of week, day of month granularities
  const weekdayItems = Object.entries(WEEKDAYS)
    .map(([day, name]) =>
      createStatItem(getters, sheetId, {
        id: getStatIdForDay(day),
        name: name.toString(),
        formula: `=SUMIF(WEEKDAY(${rangeDates}), ${Number(day) + 1}, ${rangeValues})`,
        format: valueFormat,
      })
    )
    .filter((x) => x.rawValue !== "0");
  const dayItems = dayRange
    .map((day) =>
      createStatItem(getters, sheetId, {
        id: getStatIdForDay(day),
        name: String(day),
        formula: `=SUMIF(DAY(${rangeDates}), ${Number(day)}, ${rangeValues})`,
        format: valueFormat,
      })
    )
    .filter((x) => x.rawValue !== "0");
  const DATES = [...new Set(dateValues)];
  const locale = getters.getLocale();
  const dateItems = Object.entries(DATES)
    .map(([, date]) =>
      createStatItem(getters, sheetId, {
        id: String(date),
        // check
        name: formatValue(date, { locale, format: "m/d/yyyy" }),
        formula: `=SUMIF(${rangeDates}, ${date}, ${rangeValues})`,
        format: valueFormat,
      })
    )
    .filter((x) => x.rawValue !== "0");
  return {
    year: yearItems,
    quarter: quarterItems,
    month: monthItems,
    week: weekItems,
    weekday: weekdayItems,
    day: dayItems,
    date: dateItems,
  };
}
