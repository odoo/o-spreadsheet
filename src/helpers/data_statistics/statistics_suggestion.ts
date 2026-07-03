import { _t } from "../../translation";
import { CellValueType } from "../../types/cells";
import { Getters } from "../../types/getters";
import { ColumnAnalysis } from "../data_analysis";
import { zoneToXc } from "../zones";
import { item, literalForFormula, StatGroup, StatSection } from "./statistics_items";

/**
 * Distinct values of a column, in first-seen order.
 * Categorical columns are capped at 20 uniques by construction.
 */
function uniqueValues(col: ColumnAnalysis): (string | number | boolean)[] {
  const seen = new Set<string>();
  const values: (string | number | boolean)[] = [];
  for (const cell of col.nonEmpty) {
    if (cell.type === CellValueType.error) {
      continue;
    }
    const key = String(cell.value);
    if (!seen.has(key)) {
      seen.add(key);
      values.push(cell.value as string | number | boolean);
    }
  }
  return values;
}

function columnTitle(col: ColumnAnalysis, indexInAll: number): string {
  if (col.header) {
    return col.header;
  }
  const n = indexInAll + 1;
  switch (col.type) {
    case "number":
    case "percentage":
      return _t("Col %s (numeric)", n);
    case "date":
      return _t("Col %s (date)", n);
    case "boolean":
      return _t("Col %s (boolean)", n);
    case "categorical":
      return _t("Col %s (category)", n);
    case "label":
      return _t("Col %s (label)", n);
    default:
      return _t("Col %s", n);
  }
}

/** Pattern C — Single categorical column: count per category. */
function statsForCategoricalColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis,
  range: string
): StatGroup[] {
  const breakdown = uniqueValues(col).map((value) =>
    item(getters, sheetId, String(value), `=COUNTIF(${range},${literalForFormula(value)})`)
  );
  return [{ label: _t("Count by category"), items: breakdown }];
}

/** Patterns A–D — a single column's own stats, dispatched on its type. */
export function baseStatGroups(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis,
  range: string
): StatGroup[] {
  const commonStats = item(getters, sheetId, _t("Number of non-empty rows"), `=COUNTA(${range})`);
  switch (col.type) {
    case "categorical":
      return [{ items: [commonStats] }, ...statsForCategoricalColumn(getters, sheetId, col, range)];
    case "number":
    case "percentage":
    case "date":
    case "label":
    case "boolean":
    default:
      return [];
  }
}

/** Single column selected: just its own stats, no cross-column pattern applies. */
function sectionsForSingleColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis,
  title: (col: ColumnAnalysis) => string
): StatSection {
  const range = zoneToXc(col.zone);
  return { title: title(col), range, groups: baseStatGroups(getters, sheetId, col, range) };
}

export function buildStatSections(
  getters: Getters,
  cols: ColumnAnalysis[],
  sheetId: string
): StatSection | undefined {
  const nonEmpty = cols.filter((c) => c.type !== "empty");
  if (!nonEmpty.length) {
    return undefined;
  }

  const colIndex = new Map<ColumnAnalysis, number>();
  nonEmpty.forEach((col, i) => colIndex.set(col, i));
  const title = (col: ColumnAnalysis) => columnTitle(col, colIndex.get(col)!);

  const numberOfColumns = nonEmpty.length;

  if (numberOfColumns === 1) {
    return sectionsForSingleColumn(getters, sheetId, nonEmpty[0], title);
  }

  return undefined;
}
