import { _t } from "../../translation";
import { CellValueType } from "../../types/cells";
import { Getters } from "../../types/getters";
import { ColumnAnalysis } from "../data_analysis";
import { zoneToXc } from "../zones";
import { item, literalForFormula, StatGroup } from "./statistics_items";

/**
 * Distinct values of a column, in first-seen order.
 * Categorical columns are capped at 20 uniques by construction.
 */
function uniqueValues(col: ColumnAnalysis): (string | number | boolean)[] {
  const uniqueValues = new Set<string | number | boolean>();
  for (const cell of col.nonEmpty) {
    if (cell.type === CellValueType.error) {
      continue;
    }
    uniqueValues.add(cell.value as string | number | boolean);
  }
  return [...uniqueValues].sort();
}

/** Pattern C — Single categorical column: count per category. */
function statsForCategoricalColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis,
  range: string
): StatGroup[] {
  const items = uniqueValues(col).map((value) =>
    item(getters, sheetId, String(value), `=COUNTIF(${range},${literalForFormula(value)})`)
  );
  const uniqueCount = item(getters, sheetId, _t("Unique categories"), `=COUNTUNIQUE(${range})`);
  return [{ items: [uniqueCount] }, { label: _t("Category occurrences"), items }];
}

/** Single column selected: just its own stats, no cross-column pattern applies. */
function sectionsForSingleColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis
): StatGroup[] {
  const range = zoneToXc(col.zone);
  switch (col.type) {
    case "categorical":
      return statsForCategoricalColumn(getters, sheetId, col, range);
    case "number":
    case "percentage":
    case "date":
    case "label":
    case "boolean":
    default:
      return [];
  }
}

export function buildStatSections(
  getters: Getters,
  cols: ColumnAnalysis[],
  sheetId: string
): StatGroup[] | undefined {
  const nonEmpty = cols.filter((c) => c.type !== "empty");
  if (!nonEmpty.length) {
    return undefined;
  }

  const colIndex = new Map<ColumnAnalysis, number>();
  nonEmpty.forEach((col, i) => colIndex.set(col, i));

  const numberOfColumns = nonEmpty.length;

  if (numberOfColumns === 1) {
    return sectionsForSingleColumn(getters, sheetId, nonEmpty[0]);
  }

  return undefined;
}
