import { isDefined, reduceZoneOnDeletion } from "../../helpers/index";
import { otRegistry } from "../../registries";
import { Zone, RemoveColumnsCommand, AddColumnsCommand, AddMergeCommand } from "../../types";
import { ColumnsCommand, PositionalCommand, TargetCommand } from "../../types/ot_types";

/*
 * This file contains the transformations when an RemoveColumnsCommand is executed
 * before the command to transform.
 * Basically, the transformation is to move/expand/remove position/zone based on the
 * position of the removed columns
 */

otRegistry.addTransformation(
  "REMOVE_COLUMNS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  cellCommand
);

otRegistry.addTransformation(
  "REMOVE_COLUMNS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  targetCommand
);

otRegistry.addTransformation("REMOVE_COLUMNS", ["ADD_COLUMNS"], addColumnsCommand);

otRegistry.addTransformation(
  "REMOVE_COLUMNS",
  ["REMOVE_COLUMNS", "RESIZE_COLUMNS"],
  columnsCommand
);

otRegistry.addTransformation("REMOVE_COLUMNS", ["ADD_MERGE", "REMOVE_MERGE"], mergeCommand);

function transformZone(zone: Zone, executed: RemoveColumnsCommand): Zone | undefined {
  return reduceZoneOnDeletion(zone, "left", executed.columns);
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
