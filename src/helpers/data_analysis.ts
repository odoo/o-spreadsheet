import { CellValueType, EvaluatedCell } from "../types/cells";
import { Getters } from "../types/getters";
import { Zone } from "../types/misc";
import { isDateTimeFormat } from "./format/format";
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
  hasHeader: boolean;
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
  const cells = getters.getEvaluatedCellsInZone(sheetId, zone);

  if (!cells.length) {
    return {
      zone,
      type: "empty",
      hasHeader: false,
      rowCount: 0,
      uniqueCount: 0,
      uniqueRatio: 0,
      nonEmpty: [],
    };
  }

  const firstCell = cells[0];
  const rest = cells.slice(1);

  // Header: first cell is text AND rest has at least one non-text, non-empty cell
  const hasHeader =
    firstCell.type === CellValueType.text &&
    rest.some((c) => c.type !== CellValueType.text && c.type !== CellValueType.empty);

  const dataCells: EvaluatedCell[] = hasHeader ? rest : cells;
  const nonEmpty = dataCells.filter((c) => c.type !== CellValueType.empty);

  const type = computeColumnType(nonEmpty);

  const numVals = nonEmpty
    .filter((c) => c.type === CellValueType.number)
    .map((c) => c.value as number);

  const allVals = nonEmpty.map((c) => String(c.value ?? ""));
  const uniqueCount = new Set(allVals).size;

  return {
    zone,
    type,
    header: hasHeader ? String(firstCell.value ?? "") : undefined,
    hasHeader,
    rowCount: nonEmpty.length,
    uniqueCount,
    uniqueRatio: allVals.length > 0 ? uniqueCount / allVals.length : 0,
    maxValue: numVals.length ? Math.max(...numVals) : undefined,
    nonEmpty,
  };
}

function computeColumnType(cells: EvaluatedCell[]): ExtendedColumnType {
  if (cells.length > 0) {
    if (cells.every((c) => c.type === CellValueType.error)) {
      return "error";
    }
    cells = cells.filter((c) => c.type !== CellValueType.error);
    if (cells.every((c) => c.type === CellValueType.boolean)) {
      return "boolean";
    }
    if (
      cells.every(
        (c) => c.type === CellValueType.number && !!c.format && isDateTimeFormat(c.format)
      )
    ) {
      return "date";
    } else if (
      cells.every((c) => {
        if (c.type !== CellValueType.number) {
          return false;
        }
        if (c.format?.includes("%")) {
          return true;
        }
        return false;
      })
    ) {
      return "percentage";
    } else if (cells.every((c) => c.type === CellValueType.number)) {
      return "number";
    } else {
      const textVals = cells
        .filter((c) => c.type === CellValueType.text)
        .map((c) => c.value as string);

      if (textVals.length > 0) {
        const unique = new Set(textVals).size;
        const ratio = unique / textVals.length;
        return ratio < 0.75 && unique <= 20 ? "categorical" : "label";
      }
    }
  }
  return "empty";
}
