import { _t } from "../../translation";
import { EvaluatedCell } from "../../types/cells";
import { Getters } from "../../types/getters";
import { numberToJsDate } from "../dates";
import { DAYS, MONTHS } from "../format/format";
import { toTrimmedLowerCase } from "../text_helper";
import { zoneToXc } from "../zones";
import { ColumnAnalysis } from "./data_analysis";
import { createStatItem, StatSection, StatValue } from "./statistics_items";

export function buildGeneralStatItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const range = zoneToXc(col.zone);
  return [
    createStatItem(getters, sheetId, "non_empty", _t("Non-empty cells"), `=COUNTA(${range})`),
    createStatItem(getters, sheetId, "unique", _t("Unique values"), `=COUNTUNIQUE(${range})`),
    createStatItem(getters, sheetId, "sum", _t("Sum"), `=SUM(${range})`),
    createStatItem(getters, sheetId, "median", _t("Median"), `=MEDIAN(${range})`),
    createStatItem(getters, sheetId, "average", _t("Average"), `=AVERAGE(${range})`),
    createStatItem(getters, sheetId, "min", _t("Minimum value"), `=MIN(${range})`),
    createStatItem(getters, sheetId, "max", _t("Maximum value"), `=MAX(${range})`),
  ];
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
    )
    .sort((a, b) => Number(b.value) - Number(a.value) || a.name.localeCompare(b.name));
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
    createStatItem(getters, sheetId, month, name, `=SUM(--(MONTH(${range})=${Number(month) + 1}))`)
  );
  const dayItems = Object.entries(DAYS).map(([day, name]) =>
    createStatItem(getters, sheetId, day, name, `=SUM(--(WEEKDAY(${range})=${Number(day) + 1}))`)
  );
  return [
    { label: _t("Occurrences by year"), items: yearItems },
    { label: _t("Occurrences by month"), items: monthItems },
    { label: _t("Occurrences by day of week"), items: dayItems },
  ];
}
