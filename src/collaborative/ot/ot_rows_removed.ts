import { isDefined, reduceZoneOnDeletion } from "../../helpers/index";
import { otRegistry } from "../../registries";
import { Zone, RemoveRowsCommand, AddRowsCommand, AddMergeCommand } from "../../types";
import { PositionalCommand, RowsCommand, TargetCommand } from "../../types/ot_types";

/*
 * This file contains the transformations when an RemoveRowsCommand is executed
 * before the command to transform.
 * Basically, the transformation is to move/expand/remove position/zone based on the
 * position of the removed rows
 */

otRegistry.addTransformation(
  "REMOVE_ROWS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  cellCommand
);

otRegistry.addTransformation(
  "REMOVE_ROWS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  targetCommand
);

otRegistry.addTransformation("REMOVE_ROWS", ["RESIZE_ROWS", "REMOVE_ROWS"], rowsCommand);

otRegistry.addTransformation("REMOVE_ROWS", ["ADD_ROWS"], addRowsCommand);

otRegistry.addTransformation("REMOVE_ROWS", ["ADD_MERGE", "REMOVE_MERGE"], mergeCommand);

function transformZone(zone: Zone, executed: RemoveRowsCommand): Zone | undefined {
  return reduceZoneOnDeletion(zone, "top", executed.rows);
}

function cellCommand(
  toTransform: PositionalCommand,
  executed: RemoveRowsCommand
): PositionalCommand | undefined {
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

function targetCommand(
  toTransform: TargetCommand,
  executed: RemoveRowsCommand
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

function addRowsCommand(
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

function rowsCommand(
  toTransform: RowsCommand,
  executed: RemoveRowsCommand
): RowsCommand | undefined {
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

function mergeCommand(
  toTransform: AddMergeCommand,
  executed: RemoveRowsCommand
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
