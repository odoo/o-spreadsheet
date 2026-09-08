import { _t } from "../../translation";
import { EvaluatedCell } from "../../types/cells";
import { Getters } from "../../types/getters";
import { DAYS, MONTHS } from "../format/format";
import { toTrimmedLowerCase } from "../text_helper";
import { zoneToXc } from "../zones";
import { ColumnAnalysis } from "./data_analysis";
import { createStatItem, StatSection } from "./statistics_items";

export function buildStatSections(
  getters: Getters,
  cols: ColumnAnalysis[],
  sheetId: string
): StatSection[] | undefined {
  if (!cols.length) {
    return undefined;
  }
  const numberOfColumns = cols.length;
  if (numberOfColumns === 1) {
    return sectionsForSingleColumn(getters, sheetId, cols[0]);
  }
  return undefined;
}

/** Single column selected: just its own stats, no cross-column pattern applies. */
function sectionsForSingleColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis
): StatSection[] {
  switch (col.type) {
    case "number":
    case "percentage":
      return statsWithOccurrences(getters, sheetId, col, _t("Value occurrences"));
    case "date":
      return statsForDateColumn(getters, sheetId, zoneToXc(col.zone));
    case "categorical":
    case "label":
      return statsWithOccurrences(getters, sheetId, col, _t("Category occurrences"));
    case "boolean":
      return statForBooleanColumn(getters, sheetId, zoneToXc(col.zone));
    default:
      return [];
  }
}

function createGeneralItems(getters: Getters, sheetId: string, range: string) {
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
function statsWithOccurrences(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis,
  occurrencesLabel: string
): StatSection[] {
  const range = zoneToXc(col.zone);
  const generalItems = createGeneralItems(getters, sheetId, range);
  const occurrenceItems = createOccurrenceItems(getters, sheetId, range, col.nonEmpty);
  return [{ items: generalItems }, { label: occurrencesLabel, items: occurrenceItems }];
}

/** Pattern C — Single date column */
function statsForDateColumn(getters: Getters, sheetId: string, range: string): StatSection[] {
  const generalItems = createGeneralItems(getters, sheetId, range);
  const earliestYear = new Date(generalItems[0].value).getFullYear();
  const latestYear = new Date(generalItems[1].value).getFullYear();
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
    { items: generalItems },
    { label: _t("Occurrences by year"), items: yearItems },
    { label: _t("Occurrences by month"), items: monthItems },
    { label: _t("Occurrences by day of week"), items: dayItems },
  ];
}

function statForBooleanColumn(getters: Getters, sheetId: string, range: string): StatSection[] {
  const generalItems = createGeneralItems(getters, sheetId, range);
  return [
    {
      items: generalItems,
    },
    {
      items: [
        createStatItem(getters, sheetId, true, _t("TRUE"), `=COUNTIF(${range},TRUE)`),
        createStatItem(getters, sheetId, false, _t("FALSE"), `=COUNTIF(${range},FALSE)`),
      ],
    },
  ];
}

function createOccurrenceItems(
  getters: Getters,
  sheetId: string,
  range: string,
  cells: EvaluatedCell[]
) {
  return uniqueValues(cells)
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
