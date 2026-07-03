import { _t } from "../../translation";
import { CellValue, CellValueType, EvaluatedCell } from "../../types/cells";
import { Getters } from "../../types/getters";
import { numberToJsDate } from "../dates";
import { DAYS, MONTHS } from "../format/format";
import { toTrimmedLowerCase } from "../text_helper";
import { zoneToXc } from "../zones";
import { ColumnAnalysis } from "./data_analysis";
import {
  createStatItem,
  DateSections,
  getStatIdForDay,
  getStatIdForMonth,
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
      : { id: item.id, name, formula: "", value: "—" };
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
    .map(({ type, value, formattedValue }) => {
      const id = generateItemIdFromValue(value);
      let formula: string;
      if (id === "true" || id === "false") {
        formula = `=COUNTIF(${range},${formattedValue})+SUMPRODUCT(ISTEXT(${range})*(${range}="${formattedValue}"))`;
      } else if (typeof value === "string") {
        formula = `=COUNTIF(${range},${`"${value}"`})`;
      } else {
        formula = `=COUNTIF(${range},${value})`;
      }
      return {
        ...createStatItem(getters, sheetId, {
          id,
          name: formattedValue,
          formula,
          chartTitle: _t('Occurrences of "%s"', formattedValue),
          computedValue: {
            value: count.get(id) ?? 0,
          },
        }),
        rawData: { type, value },
      };
    });
  return withPercentages(items, col.nonEmpty.length);
}

function uniqueValues(
  cells: EvaluatedCell[]
): { type: CellValueType; value: CellValue; formattedValue: string }[] {
  const normalizedValues = new Set<string>();
  const uniqueValuesList: { type: CellValueType; value: CellValue; formattedValue: string }[] = [];
  for (const cell of cells) {
    const normalizedValue = toTrimmedLowerCase(String(cell.value));
    if (!normalizedValues.has(normalizedValue)) {
      uniqueValuesList.push(cell);
      normalizedValues.add(normalizedValue);
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
      id: "true",
      name: _t("TRUE"),
      formula: `=COUNTIF(${range},TRUE)`,
      chartTitle: _t('Occurrences of "%s"', _t("TRUE")),
      computedValue: { value: trueCount },
    }),
    createStatItem(getters, sheetId, {
      id: "false",
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
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  const range = zoneToXc(zone);
  const dateValues = col.nonEmpty
    .map((cell) => cell.value)
    .filter((value): value is number => typeof value === "number");
  const yearCount: Map<number, number> = new Map();
  const monthCount: number[] = new Array(12).fill(0);
  const dayCount: number[] = new Array(7).fill(0);
  for (const value of dateValues) {
    const date = numberToJsDate(value);
    const year = date.getFullYear();
    yearCount.set(year, (yearCount.get(year) ?? 0) + 1);
    monthCount[date.getMonth()]++;
    dayCount[date.getDay()]++;
  }
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
  const locale = getters.getLocale();
  const firstDayOfWeek = locale.weekStart;
  const offset = firstDayOfWeek % 7;
  const dayItems: StatValue[] = [];
  for (let i = 0; i < 7; i++) {
    const day = (i + offset) % 7;
    const name = DAYS[day].toString();
    dayItems.push(
      createStatItem(getters, sheetId, {
        id: getStatIdForDay(day),
        name,
        formula: `=COUNTIF(FILTER(WEEKDAY(${range}), ${range}), ${day + 1})`,
        computedValue: { value: dayCount[day] },
      })
    );
  }
  return {
    year: withPercentages(yearItems, col.nonEmpty.length),
    month: withPercentages(monthItems, col.nonEmpty.length),
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
