import { _t } from "../../translation";
import { CellValue, EvaluatedCell } from "../../types/cells";
import { Getters } from "../../types/getters";
import { numberToJsDate } from "../dates";
import { formatValue, MONTHS, QUARTERS, DAYS as WEEKDAYS } from "../format/format";
import { getFullReference } from "../references";
import { zoneToXc } from "../zones";
import { ColumnAnalysis } from "./data_analysis";
import {
  createStatItem,
  DateSections,
  getStatIdForDay,
  getStatIdForDayOfMonth,
  getStatIdForMonth,
  getStatIdForQuarter,
  getStatIdForWeek,
  getStatIdForYear,
  StatValue,
} from "./statistics_items";

function getColumnDataRange(getters: Getters, col: ColumnAnalysis, sheetId: string) {
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  return { range: getFullReference(getters.getSheetName(sheetId), zoneToXc(zone)) };
}

const ALL_TYPES = ["number", "percentage", "date", "text", "boolean", "label", "categorical"];
const NUMERIC_TYPES = ["number", "percentage"];

interface StatItemConfig {
  id: string;
  getName: (type: string) => string;
  formula: (range: string) => string;
  types: string[];
}

export function generateItemIdFromValue(value: CellValue): string {
  const category = String(value ?? "").trim();
  return typeof value === "boolean" ? category.toUpperCase() : category;
}

export const GENERIC_STAT_ITEMS: StatItemConfig[] = [
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
  const { range } = getColumnDataRange(getters, col, sheetId);
  return GENERIC_STAT_ITEMS.map((item) => {
    const name = item.getName(col.type);
    return item.types.includes(col.type)
      ? createStatItem(getters, sheetId, { id: item.id, name, formula: item.formula(range) })
      : { id: item.id, name, formula: "", value: "—" };
  });
}

/** Pattern A + B + D + E — Single number/percentage or categorical/label column: general stats + occurrences per value. */
export function buildOccurrencesItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const { range } = getColumnDataRange(getters, col, sheetId);
  const occurrences: Map<string, { cell: EvaluatedCell; count: number }> = new Map();
  for (const cell of col.nonEmpty) {
    if (cell.formattedValue === "") {
      continue;
    }
    const id = generateItemIdFromValue(cell.value);
    const occurrence = occurrences.get(id);
    if (occurrence) {
      occurrence.count++;
    } else {
      occurrences.set(id, { cell, count: 1 });
    }
  }
  const items: StatValue[] = [];
  for (const [id, { cell, count }] of occurrences) {
    items.push({
      ...createStatItem(getters, sheetId, {
        id,
        name: cell.formattedValue,
        formula: `=SUMPRODUCT(--EXACT(TRIM(${range}),"${id}"))`,
        chartTitle: _t('Occurrences of "%s"', cell.formattedValue),
        computedValue: { value: count },
      }),
      rawData: cell,
    });
  }
  return withPercentages(items, col.nonEmpty.length);
}

export function buildBooleanItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const { range } = getColumnDataRange(getters, col, sheetId);
  let trueCount = 0;
  let falseCount = 0;
  for (const cell of col.nonEmpty) {
    if (cell.value === true) {
      trueCount++;
    } else if (cell.value === false) {
      falseCount++;
    }
  }
  const items = [
    createStatItem(getters, sheetId, {
      id: "TRUE",
      name: _t("TRUE"),
      formula: `=COUNTIF(${range},TRUE)`,
      chartTitle: _t('Occurrences of "%s"', _t("TRUE")),
      computedValue: { value: trueCount },
    }),
    createStatItem(getters, sheetId, {
      id: "FALSE",
      name: _t("FALSE"),
      formula: `=COUNTIF(${range},FALSE)`,
      chartTitle: _t('Occurrences of "%s"', _t("FALSE")),
      computedValue: { value: falseCount },
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
  const { range } = getColumnDataRange(getters, col, sheetId);
  const yearCount: Map<number, number> = new Map();
  const monthCount: number[] = new Array(12).fill(0);
  const weekdayCount: number[] = new Array(7).fill(0);
  const weekCount: Map<number, number> = new Map();
  const dateCount: Map<number, number> = new Map();
  const dayCount: number[] = new Array(31).fill(0);
  for (const cell of col.nonEmpty) {
    const value = cell.value;
    if (typeof value !== "number") {
      continue;
    }
    const date = numberToJsDate(value);
    const year = date.getFullYear();
    yearCount.set(year, (yearCount.get(year) ?? 0) + 1);
    monthCount[date.getMonth()]++;
    weekdayCount[date.getDay()]++;
    const week = date.getIsoWeek();
    weekCount.set(week, (weekCount.get(week) ?? 0) + 1);
    const day = Math.floor(value);
    dateCount.set(day, (dateCount.get(day) ?? 0) + 1);
    dayCount[date.getDate() - 1]++;
  }
  const earliestYear = Math.min(...yearCount.keys());
  const latestYear = Math.max(...yearCount.keys());
  const yearRange = Array.from(
    { length: latestYear - earliestYear + 1 },
    (_, i) => earliestYear + i
  );
  const quarterCount = [
    monthCount[0] + monthCount[1] + monthCount[2],
    monthCount[3] + monthCount[4] + monthCount[5],
    monthCount[6] + monthCount[7] + monthCount[8],
    monthCount[9] + monthCount[10] + monthCount[11],
  ];
  const yearItems = yearRange.map((year) =>
    createStatItem(getters, sheetId, {
      id: String(year),
      name: getStatIdForYear(year),
      formula: `=SUM(COUNTIF(YEAR(${range}),${year}))`,
      computedValue: { value: yearCount.get(year) ?? 0 },
    })
  );
  const monthItems = Object.entries(MONTHS).map(([month, name]) =>
    createStatItem(getters, sheetId, {
      id: getStatIdForMonth(month),
      name: name.toString(),
      formula: `=COUNTIF(FILTER(MONTH(${range}), ${range}), ${Number(month) + 1})`,
      computedValue: { value: monthCount[Number(month)] },
    })
  );
  const quarterItems = [1, 2, 3, 4].map((quarter) =>
    createStatItem(getters, sheetId, {
      id: getStatIdForQuarter(quarter),
      name: QUARTERS[quarter].toString(),
      formula: `=COUNTIF(FILTER(QUARTER(${range}), ${range}), ${quarter})`,
      computedValue: {
        value: quarterCount[quarter - 1],
      },
    })
  );
  const locale = getters.getLocale();
  const firstDayOfWeek = locale.weekStart;
  const offset = firstDayOfWeek % 7;
  const weekItems = [...weekCount.keys()]
    .sort((a, b) => a - b)
    .map((week) =>
      createStatItem(getters, sheetId, {
        id: getStatIdForWeek(week),
        name: `W${week}`,
        formula: `=COUNTIF(FILTER(ISOWEEKNUM(${range}), ${range}), ${week})`,
        computedValue: { value: weekCount.get(week)! },
      })
    );
  const weekdayItems: StatValue[] = [];
  for (let i = 0; i < 7; i++) {
    const day = (i + offset) % 7;
    const name = WEEKDAYS[day].toString();
    weekdayItems.push(
      createStatItem(getters, sheetId, {
        id: getStatIdForDay(day),
        name,
        formula: `=COUNTIF(FILTER(WEEKDAY(${range}), ${range}), ${day + 1})`,
        computedValue: { value: weekdayCount[day] },
      })
    );
  }
  const dateItems = [...dateCount.keys()]
    .sort((a, b) => a - b)
    .map((date) =>
      createStatItem(getters, sheetId, {
        id: String(date),
        name: formatValue(date, { locale, format: locale.dateFormat }),
        formula: `=SUM(COUNTIF(INT(${range}),${date}))`,
        computedValue: { value: dateCount.get(date)! },
      })
    );
  const dayItems: StatValue[] = dayCount.map((count, index) =>
    createStatItem(getters, sheetId, {
      id: getStatIdForDayOfMonth(index + 1),
      name: String(index + 1),
      formula: `=COUNTIF(FILTER(DAY(${range}), ${range}), ${index + 1})`,
      computedValue: { value: count },
    })
  );

  return {
    year: withPercentages(yearItems, col.nonEmpty.length),
    quarter: withPercentages(quarterItems, col.nonEmpty.length),
    month: withPercentages(monthItems, col.nonEmpty.length),
    week: withPercentages(weekItems, col.nonEmpty.length),
    weekday: withPercentages(weekdayItems, col.nonEmpty.length),
    date: withPercentages(dateItems, col.nonEmpty.length),
    day: withPercentages(dayItems, col.nonEmpty.length),
  };
}

function withPercentages(items: StatValue[], count: number): StatValue[] {
  if (count === 0) {
    return items;
  }
  return items.map((item) => ({
    ...item,
    percentage: `(${Math.round((Number(item.value) / count) * 100)}%)`,
  }));
}
