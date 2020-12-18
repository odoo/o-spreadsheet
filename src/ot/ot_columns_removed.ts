import { isDefined } from "../helpers/index";
import { AddColumnsCommand, RemoveColumnsCommand, ResizeColumnsCommand } from "../types";
import { CellCommand, TargetCommand } from "./ot_helpers";

export function columnsRemovedCellCommand(
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

export function columnsRemovedTargetCommand(
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

export function columnsRemovedAddColumns(
  toTransform: AddColumnsCommand,
  executed: RemoveColumnsCommand
): AddColumnsCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  if (executed.columns.includes(toTransform.column)) {
    return undefined;
  }
  let column = toTransform.column;
  for (let removedCol of executed.columns) {
    if (column > removedCol) {
      column--;
    }
  }
  return { ...toTransform, column };
}

export function columnsRemovedRemoveColumns(
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

//TODO If we change the ResizeColumnsCommands "cols" to "columns", we can use columnsRemovedRemoveColumns
export function columnsRemovedResizeColumns(
  toTransform: ResizeColumnsCommand,
  executed: RemoveColumnsCommand
): ResizeColumnsCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const columnsToResize = toTransform.cols
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
  if (!columnsToResize.length) {
    return undefined;
  }
  return { ...toTransform, cols: columnsToResize };
}
