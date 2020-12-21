import { isDefined } from "../helpers/index";
import { AddColumnsCommand, AddMergeCommand, RemoveColumnsCommand, Zone } from "../types";
import { CellCommand, TargetCommand } from "./ot_types";


function transformZone(zone: Zone, executed: RemoveColumnsCommand): Zone | undefined {
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
}

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
    .map((zone) => transformZone(zone, executed))
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

export function columnsRemovedResizeOrRemoveColumns(
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

export function columnsRemovedAddOrRemoveMerge(toTransform: AddMergeCommand, executed: RemoveColumnsCommand):AddMergeCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const zone = transformZone(toTransform.zone, executed);
  if (!zone) {
    return undefined;
  }
  return {...toTransform, zone};
}