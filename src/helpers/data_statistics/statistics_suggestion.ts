import { _t } from "../../translation";
import { EvaluatedCell } from "../../types/cells";
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
export function generateItemIdFromValue(value: any) {
  return toTrimmedLowerCase(String(value));
}
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
  return uniqueValues(col.nonEmpty)
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
      uniqueValuesList.push({ value, formattedValue });
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
  const range = zoneToXc(col.zone);
  return [
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
      name,
      formula: `=COUNTIF(FILTER(MONTH(${range}), ${range}), ${Number(month) + 1})`,
    })
  );
  const dayItems = Object.entries(DAYS).map(([day, name]) =>
    createStatItem(getters, sheetId, {
      id: getStatIdForDay(day),
      name,
      formula: `=COUNTIF(FILTER(WEEKDAY(${range}), ${range}), ${Number(day) + 1})`,
    })
  );
  return {
    year: { label: _t("Occurrences by year"), items: yearItems },
    month: { label: _t("Occurrences by month"), items: monthItems },
    day: { label: _t("Occurrences by day of week"), items: dayItems },
  };
}
