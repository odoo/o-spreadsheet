import { isDefined } from "../helpers/index";
import { AddRowsCommand, RemoveRowsCommand, ResizeRowsCommand } from "../types";
import { CellCommand, TargetCommand } from "./ot_helpers";

export function rowsRemovedCellCommand(
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

export function rowsRemovedTargetCommand(
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

export function rowsRemovedAddRows(
  toTransform: AddRowsCommand,
  executed: RemoveRowsCommand
): AddRowsCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  if (executed.rows.includes(toTransform.row)) {
    return undefined;
  }
  let row = toTransform.row;
  for (let removedCol of executed.rows) {
    if (row > removedCol) {
      row--;
    }
  }
  return { ...toTransform, row };
}

export function rowsRemovedRemoveOrResizeRows(
  toTransform: RemoveRowsCommand | ResizeRowsCommand,
  executed: RemoveRowsCommand
): RemoveRowsCommand | ResizeRowsCommand | undefined {
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
