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
      return statsForNumberColumn(getters, sheetId, col);
    case "date":
      return statsForDateColumn(getters, sheetId, zoneToXc(col.zone));
    case "categorical":
    case "label":
      return statsForCategoricalColumn(getters, sheetId, col);
    case "boolean":
      return statForBooleanColumn(getters, sheetId, zoneToXc(col.zone));
    default:
      return [];
  }
}

/** Pattern A + B — Single number (or percentage) column: min, max, sum, average. */
function statsForNumberColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis
): StatSection[] {
  const range = zoneToXc(col.zone);
  const generalItems = [
    createStatItem(getters, sheetId, "min", _t("Min"), `=MIN(${range})`),
    createStatItem(getters, sheetId, "max", _t("Max"), `=MAX(${range})`),
    createStatItem(getters, sheetId, "sum", _t("Sum"), `=SUM(${range})`),
    createStatItem(getters, sheetId, "median", _t("Median"), `=MEDIAN(${range})`),
    createStatItem(getters, sheetId, "average", _t("Average"), `=AVERAGE(${range})`),
  ];
  const categoryItems = uniqueValues(col.nonEmpty)
    .filter(({ formattedValue }) => formattedValue !== "")
    .map(({ value, formattedValue }) => {
      return createStatItem(
        getters,
        sheetId,
        formattedValue,
        formattedValue,
        `=COUNTIF(${range},"${value}")`
      );
    })
    .sort((a, b) => Number(b.value) - Number(a.value) || a.name.localeCompare(b.name));
  return [{ items: generalItems }, { label: _t("Value occurrences"), items: categoryItems }];
}

/** Pattern C — Single date column */
function statsForDateColumn(getters: Getters, sheetId: string, range: string): StatSection[] {
  const generalItems = [
    createStatItem(getters, sheetId, "earliest", _t("Earliest"), `=MIN(${range})`),
    createStatItem(getters, sheetId, "latest", _t("Latest"), `=MAX(${range})`),
  ];
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

/** Pattern D + E — Single categorical/label column: count per category. */
function statsForCategoricalColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis
): StatSection[] {
  const range = zoneToXc(col.zone);
  const uniqueCount = createStatItem(
    getters,
    sheetId,
    "unique_categories",
    _t("Unique categories"),
    `=COUNTUNIQUE(${range})`
  );
  const categoryItems = uniqueValues(col.nonEmpty)
    .filter(({ formattedValue }) => formattedValue !== "")
    .map(({ value, formattedValue }) => {
      return createStatItem(
        getters,
        sheetId,
        formattedValue,
        formattedValue,
        `=COUNTIF(${range},"${value}")`
      );
    })
    .sort((a, b) => Number(b.value) - Number(a.value) || a.name.localeCompare(b.name));
  return [{ items: [uniqueCount] }, { label: _t("Category occurrences"), items: categoryItems }];
}

function statForBooleanColumn(getters: Getters, sheetId: string, range: string): StatSection[] {
  return [
    {
      items: [
        createStatItem(getters, sheetId, "true", _t("TRUE"), `=COUNTIF(${range},TRUE)`),
        createStatItem(getters, sheetId, "false", _t("FALSE"), `=COUNTIF(${range},FALSE)`),
      ],
    },
  ];
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
