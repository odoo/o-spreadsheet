import { isDefined } from "../../helpers/index";
import { otRegistry } from "../../registries";
import { Zone, RemoveColumnsCommand, AddColumnsCommand, AddMergeCommand } from "../../types";
import { ColumnsCommand, PositionalCommand, TargetCommand } from "./ot_types";

/*
 * This file contains the transformations when an RemoveColumnsCommand is executed
 * before the command to transform.
 * Basically, the transformation is to move/expand/remove position/zone based on the
 * position of the removed columns
 */

otRegistry.addTransformation("UPDATE_CELL", "REMOVE_COLUMNS", cellCommand);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "REMOVE_COLUMNS", cellCommand);
otRegistry.addTransformation("CLEAR_CELL", "REMOVE_COLUMNS", cellCommand);
otRegistry.addTransformation("SET_BORDER", "REMOVE_COLUMNS", cellCommand);

otRegistry.addTransformation("DELETE_CONTENT", "REMOVE_COLUMNS", targetCommand);
otRegistry.addTransformation("SET_FORMATTING", "REMOVE_COLUMNS", targetCommand);
otRegistry.addTransformation("CLEAR_FORMATTING", "REMOVE_COLUMNS", targetCommand);
otRegistry.addTransformation("SET_DECIMAL", "REMOVE_COLUMNS", targetCommand);

otRegistry.addTransformation("ADD_COLUMNS", "REMOVE_COLUMNS", addColumnsCommand);

otRegistry.addTransformation("REMOVE_COLUMNS", "REMOVE_COLUMNS", columnsCommand);
otRegistry.addTransformation("RESIZE_COLUMNS", "REMOVE_COLUMNS", columnsCommand);

otRegistry.addTransformation("ADD_MERGE", "REMOVE_COLUMNS", mergeCommand);
otRegistry.addTransformation("REMOVE_MERGE", "REMOVE_COLUMNS", mergeCommand);

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

function cellCommand(
  toTransform: PositionalCommand,
  executed: RemoveColumnsCommand
): PositionalCommand | undefined {
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

function targetCommand(
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

function addColumnsCommand(
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

function columnsCommand(
  toTransform: ColumnsCommand,
  executed: RemoveColumnsCommand
): ColumnsCommand | undefined {
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

function mergeCommand(
  toTransform: AddMergeCommand,
  executed: RemoveColumnsCommand
): AddMergeCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const zone = transformZone(toTransform.zone, executed);
  if (!zone) {
    return undefined;
  }
  return { ...toTransform, zone };
}
