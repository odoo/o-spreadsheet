import { CellValueType, EvaluatedCell } from "../types/cells";
import { Getters } from "../types/getters";
import { Zone } from "../types/misc";
import { isDateTimeFormat } from "./format/format";
import { getColumnTableHeaderPosition } from "./table_helpers";
import { getZonesByColumns } from "./zones";

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
  header?: string;
  headerInZone: boolean;
  rowCount: number;
  uniqueCount: number;
  uniqueRatio: number;
  maxValue?: number;
  nonEmpty: EvaluatedCell[];
}

export function analyzeColumns(zones: Zone[], getters: Getters): ColumnAnalysis[] {
  return getZonesByColumns(zones).map((zone) => analyzeColumn(zone, getters));
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
      uniqueRatio: 0,
      nonEmpty: [],
    };
  }

  const firstCell = cells[0];
  const rest = cells.slice(1);

  let header: string | undefined;
  let dataCells: EvaluatedCell[] = [];
  let headerInZone = false;
  const tableHeaderPosition = getColumnTableHeaderPosition(sheetId, zone, getters);

  if (tableHeaderPosition) {
    header = getters.getCellText(tableHeaderPosition) || undefined;
    dataCells = cells.filter((c) => c.position && c.position.row > tableHeaderPosition.row);
    headerInZone =
      !!header && tableHeaderPosition.row >= zone.top && tableHeaderPosition.row <= zone.bottom;
  } else if (
    firstCell.type === CellValueType.text &&
    rest.some((c) => c.type !== CellValueType.text)
  ) {
    //first cell is text AND rest has at least one non-text, non-empty cell
    header = firstCell.value;
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
    zone,
    type: computeColumnType(dataCells),
    header,
    headerInZone,
    rowCount: dataCells.length,
    uniqueCount,
    uniqueRatio: allVals.length > 0 ? uniqueCount / allVals.length : 0,
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
