import { CellValueType, EvaluatedCell } from "../../types/cells";
import { Getters } from "../../types/getters";
import { CellPosition, UID, Zone } from "../../types/misc";
import { isDateTimeFormat } from "../format/format";
import { getZonesByColumns, isInside } from "../zones";

export const CATEGORICAL_OR_BOOLEAN: readonly ExtendedColumnType[] = ["categorical", "boolean"];
export const CATEGORICAL_OR_LABEL_OR_BOOLEAN: readonly ExtendedColumnType[] = [
  "categorical",
  "label",
  "boolean",
];
export const CATEGORICAL_OR_LABEL_OR_NUMBER_OR_PERCENTAGE: readonly ExtendedColumnType[] = [
  "categorical",
  "label",
  "number",
  "percentage",
];
export const NUMBER_OR_PERCENTAGE: readonly ExtendedColumnType[] = ["number", "percentage"];
export const ANY_TYPE: readonly ExtendedColumnType[] = [
  "number",
  "percentage",
  "date",
  "categorical",
  "label",
  "boolean",
];

export type ExtendedColumnType =
  | "error"
  | "number"
  | "percentage"
  | "date"
  | "categorical"
  | "label"
  | "boolean"
  | "empty";

export interface ColumnAnalysis {
  zone: Zone;
  type: ExtendedColumnType;
  title?: string;
  headerInZone: boolean;
  rowCount: number;
  uniqueCount: number;
  maxValue?: number;
  nonEmpty: EvaluatedCell[];
}

// -----------------------------------------------------------------------------
// Rule framework
//
// A column "shape" (the tuple of each selected column's ExtendedColumnType) is matched
// against a table of rules to decide which chart suggestions to propose.
// Rules are divided in two categories:
//  * EXACT_PATTERNS: a fixed-length array of column types (e.g. "number + number" or "categorical + date + percentage").
//  * EXTENDABLE_PATTERNS: a fixed-length set of leading types followed by one or more columns of a fixed type (e.g. "many-numbers" or "label + multiple numbers").
// -----------------------------------------------------------------------------

type ColumnTypeSpec = ExtendedColumnType | readonly ExtendedColumnType[];

/** A RulePattern describes the column types that a rule applies to. It contains a fixed-length
 *  array of leading types, and optionally an extension type that can repeat one or more times.
 * The leadingTypes is required anytime, while the extension is only present for extendable patterns.
 */
export interface RulePattern {
  readonly leadingTypes: readonly ColumnTypeSpec[];
  //Present only for extendable patterns: every column after leadingTypes must match `type`,
  readonly extension?: { readonly type: ColumnTypeSpec; readonly minSize: number };
}

function matchesColumnType(spec: ColumnTypeSpec, type: ExtendedColumnType): boolean {
  return Array.isArray(spec) ? spec.includes(type) : spec === type;
}

export function matchesShape(pattern: RulePattern, shape: ExtendedColumnType[]): boolean {
  const { leadingTypes, extension } = pattern;
  const expectedLength = leadingTypes.length + (extension?.minSize ?? 0);
  if (extension ? shape.length < expectedLength : shape.length !== expectedLength) {
    return false;
  }
  return shape.every((type, i) => {
    const spec = i < leadingTypes.length ? leadingTypes[i] : extension?.type;
    return spec !== undefined && matchesColumnType(spec, type);
  });
}

export function hasSameRowSpan(zones: Zone[]) {
  const firstZone = zones[0];
  return zones.every((zone) => zone.top === firstZone.top && zone.bottom === firstZone.bottom);
}

function getFirstNonEmptyRow(zone: Zone, sheetId: string, getters: Getters): number | undefined {
  for (let row = zone.top; row <= zone.bottom; row++) {
    for (let col = zone.left; col <= zone.right; col++) {
      const cell = getters.getEvaluatedCell({ sheetId, col, row });
      if (cell.type !== CellValueType.empty) {
        return row;
      }
    }
  }
  return undefined;
}

export function analyzeColumns(zones: Zone[], getters: Getters): ColumnAnalysis[] {
  const sheetId = getters.getActiveSheetId();

  let firstCommonNonEmptyRow = Number.POSITIVE_INFINITY;
  for (const zone of zones) {
    const firstNonEmptyRowOfZone = getFirstNonEmptyRow(zone, sheetId, getters);
    if (firstNonEmptyRowOfZone !== undefined) {
      firstCommonNonEmptyRow = Math.min(firstCommonNonEmptyRow, firstNonEmptyRowOfZone);
    }
  }

  const cleanedAndAlignedZones = zones.map((zone) => {
    if (firstCommonNonEmptyRow > zone.top && firstCommonNonEmptyRow <= zone.bottom) {
      return { ...zone, top: firstCommonNonEmptyRow };
    }
    return zone;
  });
  return getZonesByColumns(cleanedAndAlignedZones)
    .map((zone) => analyzeColumn(zone, getters))
    .filter((c) => c.type !== "empty");
}

function analyzeColumn(zone: Zone, getters: Getters): ColumnAnalysis {
  const sheetId = getters.getActiveSheetId();
  const cells = getters
    .getEvaluatedCellsInZone(sheetId, zone)
    .filter((c) => c.type !== CellValueType.empty);

  if (!cells.length) {
    return {
      zone,
      type: "empty",
      headerInZone: false,
      rowCount: 0,
      uniqueCount: 0,
      nonEmpty: [],
    };
  }

  const firstCell = cells[0];
  const rest = cells.slice(1);

  let title: string | undefined;
  let dataCells: EvaluatedCell[] = [];
  let headerInZone = false;

  let analyzedZone: Zone = zone;
  const tableHeaderPosition = getColumnTableHeaderPosition(sheetId, zone, getters);

  if (tableHeaderPosition) {
    title = getters.getCellText(tableHeaderPosition) || undefined;
    dataCells = cells.filter((c) => c.position && c.position.row > tableHeaderPosition.row);
    headerInZone = tableHeaderPosition.row >= zone.top && tableHeaderPosition.row <= zone.bottom;
    if (headerInZone) {
      analyzedZone = {
        ...analyzedZone,
        top: tableHeaderPosition.row,
      };
    }
  } else if (
    firstCell.type === CellValueType.text &&
    rest.some((c) => c.type !== CellValueType.text)
  ) {
    //first cell is text AND rest has at least one non-text, non-empty cell
    title = firstCell.value;
    dataCells = rest;
    headerInZone = true;
  } else {
    dataCells = cells;
  }

  const numericValues = dataCells
    .filter((c) => c.type === CellValueType.number)
    .map((c) => c.value);

  const allVals = dataCells.map((c) => String(c.value ?? ""));
  const uniqueCount = new Set(allVals).size;

  return {
    zone: analyzedZone,
    type: computeColumnType(dataCells),
    title,
    headerInZone,
    rowCount: dataCells.length,
    uniqueCount,
    maxValue: numericValues.length
      ? numericValues.reduce((max, v) => (v > max ? v : max), numericValues[0])
      : undefined,
    nonEmpty: dataCells,
  };
}

function computeColumnType(cells: EvaluatedCell[]): ExtendedColumnType {
  if (cells.length === 0) {
    return "empty";
  }
  if (cells.every((c) => c.type === CellValueType.error)) {
    return "error";
  }
  cells = cells.filter((c) => c.type !== CellValueType.error);
  if (cells.every((c) => c.type === CellValueType.boolean)) {
    return "boolean";
  }
  if (
    cells.every((c) => c.type === CellValueType.number && !!c.format && isDateTimeFormat(c.format))
  ) {
    return "date";
  } else if (cells.every((c) => c.type === CellValueType.number)) {
    if (cells.every((c) => c.format?.includes("%"))) {
      return "percentage";
    }
    return "number";
  } else {
    const textVals = cells.filter((c) => c.type === CellValueType.text).map((c) => c.value);

    if (textVals.length > 0) {
      const unique = new Set(textVals).size;
      const ratio = unique / textVals.length;
      return ratio < 0.75 && unique <= 20 ? "categorical" : "label";
    }
  }
  return "empty";
}

/*
 * Get the position of the table header for a given zone.
 * The zone needs to be a single column and all non-empty cells in the zone must be inside the same table.
 */
export function getColumnTableHeaderPosition(
  sheetId: UID,
  zone: Zone,
  getters: Getters
): CellPosition | undefined {
  if (zone.left !== zone.right) {
    return undefined;
  }
  const tables = getters.getTablesOverlappingZones(sheetId, [zone]);
  if (tables.length !== 1) {
    return undefined;
  }
  const table = tables[0];
  const firstCell = { sheetId, col: zone.left, row: zone.top };
  const lastCell = { sheetId, col: zone.left, row: zone.bottom };
  if (firstCell.row < table.range.zone.top || lastCell.row > table.range.zone.bottom) {
    const cells = getters
      .getEvaluatedCellsInZone(sheetId, zone)
      .filter((c) => c.type !== CellValueType.empty);
    for (const cell of cells) {
      if (cell.position && !isInside(cell.position.col, cell.position.row, table.range.zone)) {
        return undefined;
      }
    }
  }
  const numberOfHeaders = table.config.numberOfHeaders;
  if (numberOfHeaders === 0) {
    return undefined;
  }
  return { sheetId, col: zone.left, row: table.range.zone.top + numberOfHeaders - 1 };
}
