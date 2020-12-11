import { isDefined } from "../helpers";
import { UID, Zone } from "../types";
import {
  AddColumnsCommand,
  AddRowsCommand,
  ClearCellCommand,
  CoreCommand,
  DeleteSheetCommand,
  RemoveColumnsCommand,
  RemoveRowsCommand,
  UpdateCellCommand,
  UpdateCellPositionCommand,
} from "../types/commands";

type SheetyCommand = Extract<CoreCommand, { sheetId: UID }>;

type CellCommand = UpdateCellPositionCommand | UpdateCellCommand | ClearCellCommand;
type TargetCommand = Extract<CoreCommand, { target: Zone[] }>;

export function sheetDeleted(
  toTransform: SheetyCommand,
  executed: DeleteSheetCommand
): SheetyCommand | undefined {
  if (toTransform.sheetId === executed.sheetId) {
    return undefined;
  }
  return toTransform;
}

export function columnAdded(toTransform: CellCommand, executed: AddColumnsCommand): CellCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const updatedCol = toTransform.col;
  const pivotCol = executed.column;
  if (updatedCol > pivotCol || (updatedCol === pivotCol && executed.position === "before")) {
    return { ...toTransform, col: updatedCol + executed.quantity };
  }
  return toTransform;
}

export function rowAdded(toTransform: CellCommand, executed: AddRowsCommand): CellCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const updatedRow = toTransform.row;
  const pivotRow = executed.row;
  if (updatedRow > pivotRow || (updatedRow === pivotRow && executed.position === "before")) {
    return { ...toTransform, row: updatedRow + executed.quantity };
  }
  return toTransform;
}

export function columnRemoved(
  toTransform: CellCommand,
  executed: RemoveColumnsCommand
): CellCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  let col = toTransform.col;
  if (executed.columns.includes(col)) {
    return undefined;
  }
  for (let removedColumn of executed.columns) {
    if (col >= removedColumn) {
      col--;
    }
  }
  return { ...toTransform, col };
}

export function columnRemovedTarget(
  toTransform: TargetCommand,
  executed: RemoveColumnsCommand
): TargetCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const adaptedTarget = toTransform.target
    .map((zone) => {
      let left = zone.left;
      let right = zone.right;
      for (let removedColumn of executed.columns.sort((a, b) => b - a)) {
        if (zone.left > removedColumn) {
          left--;
          right--;
        }
        if (zone.left <= removedColumn && zone.right >= removedColumn) {
          right--;
        }
      }
      if (left > right) {
        return undefined;
      }
      return { ...zone, left, right };
    })
    .filter(isDefined);
  if (!adaptedTarget.length) {
    return undefined;
  }
  return { ...toTransform, target: adaptedTarget };
}

export function columnRemovedcolumnRemoved(
  toTransform: RemoveColumnsCommand,
  executed: RemoveColumnsCommand
): RemoveColumnsCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const columnsToRemove = toTransform.columns
    .map((col) => {
      if (executed.columns.includes(col)) {
        return undefined;
      }
      for (let removedCol of executed.columns) {
        if (col > removedCol) {
          col--;
        }
      }
      return col;
    })
    .filter(isDefined);
  if (!columnsToRemove.length) {
    return undefined;
  }
  return { ...toTransform, columns: columnsToRemove };
}

export function rowRemovedTarget(
  toTransform: TargetCommand,
  executed: RemoveRowsCommand
): TargetCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const adaptedTarget = toTransform.target
    .map((zone) => {
      let top = zone.top;
      let bottom = zone.bottom;
      for (let removedColumn of executed.rows.sort((a, b) => b - a)) {
        if (zone.top > removedColumn) {
          top--;
          bottom--;
        }
        if (zone.top <= removedColumn && zone.bottom >= removedColumn) {
          bottom--;
        }
      }
      if (top > bottom) {
        return undefined;
      }
      return { ...zone, top, bottom };
    })
    .filter(isDefined);
  if (!adaptedTarget.length) {
    return undefined;
  }
  return { ...toTransform, target: adaptedTarget };
}

export function rowRemoved(
  toTransform: CellCommand,
  executed: RemoveRowsCommand
): CellCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  let row = toTransform.row;
  if (executed.rows.includes(row)) {
    return undefined;
  }
  for (let removedRow of executed.rows) {
    if (row >= removedRow) {
      row--;
    }
  }
  return { ...toTransform, row };
}

export function rowRemovedRowRemove(
  toTransform: RemoveRowsCommand,
  executed: RemoveRowsCommand
): RemoveRowsCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const rowsToRemove = toTransform.rows
    .map((row) => {
      if (executed.rows.includes(row)) {
        return undefined;
      }
      for (let removedCol of executed.rows) {
        if (row > removedCol) {
          row--;
        }
      }
      return row;
    })
    .filter(isDefined);
  if (!rowsToRemove.length) {
    return undefined;
  }
  return { ...toTransform, rows: rowsToRemove };
}
