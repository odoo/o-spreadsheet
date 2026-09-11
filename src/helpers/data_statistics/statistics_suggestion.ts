import { _t } from "../../translation";
import { EvaluatedCell } from "../../types/cells";
import { Getters } from "../../types/getters";
import { numberToJsDate } from "../dates";
import { DAYS, MONTHS } from "../format/format";
import { toTrimmedLowerCase } from "../text_helper";
import { zoneToXc } from "../zones";
import { ColumnAnalysis } from "./data_analysis";
import { createStatItem, StatSection, StatValue } from "./statistics_items";

const ALL_TYPES = ["number", "percentage", "date", "text", "boolean", "label", "categorical"];
const NUMERIC_TYPES = ["number", "percentage"];

interface StatItemConfig {
  id: string;
  getName: (type: string) => string;
  formula: (range: string) => string;
  types: string[];
}

const STATITEMS: StatItemConfig[] = [
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
  const range = zoneToXc(col.zone);

  return STATITEMS.map((item) => {
    const name = item.getName(col.type);
    return item.types.includes(col.type)
      ? createStatItem(getters, sheetId, item.id, name, item.formula(range))
      : { id: item.id, name, value: "—" };
  });
}

/** Pattern A + B + D + E — Single number/percentage or categorical/label column: general stats + occurrences per value. */
export function buildOccurenciesItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const range = zoneToXc(col.zone);
  return uniqueValues(col.nonEmpty)
    .filter(({ formattedValue }) => formattedValue !== "")
    .map(({ value, formattedValue }) =>
      createStatItem(getters, sheetId, value, formattedValue, `=COUNTIF(${range},"${value}")`)
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
    createStatItem(getters, sheetId, true, _t("TRUE"), `=COUNTIF(${range},TRUE)`),
    createStatItem(getters, sheetId, false, _t("FALSE"), `=COUNTIF(${range},FALSE)`),
  ];
}

/** Pattern C — Single date column */
export function buildDateStatSections(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatSection[] {
  const range = zoneToXc(col.zone);
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
    createStatItem(getters, sheetId, String(year), String(year), `=SUM(--(YEAR(${range})=${year}))`)
  );
  const monthItems = Object.entries(MONTHS).map(([month, name]) =>
    createStatItem(
      getters,
      sheetId,
      "m" + month,
      name,
      `=SUM(--(MONTH(${range})=${Number(month) + 1}))`
    )
  );
  const dayItems = Object.entries(DAYS).map(([day, name]) =>
    createStatItem(
      getters,
      sheetId,
      "d" + day,
      name,
      `=SUM(--(WEEKDAY(${range})=${Number(day) + 1}))`
    )
  );
  return [
    { label: _t("Occurrences by year"), items: yearItems },
    { label: _t("Occurrences by month"), items: monthItems },
    { label: _t("Occurrences by day of week"), items: dayItems },
  ];
}
