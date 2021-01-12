import { expandZoneOnInsertion } from "../../helpers";
import { otRegistry } from "../../registries";
import { AddRowsCommand, Zone, AddMergeCommand } from "../../types";
import { PositionalCommand, RowsCommand, TargetCommand } from "../../types/ot_types";

/*
 * This file contains the transformations when an AddRowsCommand is executed
 * before the command to transform.
 * Basically, the transformation is to move/expand position/zone based on the
 * position of the added rows
 */

otRegistry.addTransformation(
  "ADD_ROWS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  cellCommand
);

otRegistry.addTransformation(
  "ADD_ROWS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  targetCommand
);

otRegistry.addTransformation("ADD_ROWS", ["RESIZE_ROWS", "REMOVE_ROWS"], rowsCommand);

otRegistry.addTransformation("ADD_ROWS", ["ADD_ROWS"], addRowsCommand);

otRegistry.addTransformation("ADD_ROWS", ["ADD_MERGE", "REMOVE_MERGE"], mergeCommand);

function cellCommand(toTransform: PositionalCommand, executed: AddRowsCommand): PositionalCommand {
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

function targetCommand(toTransform: TargetCommand, executed: AddRowsCommand): TargetCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const adaptedTarget = toTransform.target.map((zone) => transformZone(zone, executed));
  return { ...toTransform, target: adaptedTarget };
}

function rowsCommand(toTransform: RowsCommand, executed: AddRowsCommand): RowsCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const baseRow = executed.position === "before" ? executed.row - 1 : executed.row;
  const rows = toTransform.rows.map((row) => (row > baseRow ? row + executed.quantity : row));
  return { ...toTransform, rows };
}

function addRowsCommand(toTransform: AddRowsCommand, executed: AddRowsCommand): AddRowsCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const baseRow = executed.position === "before" ? executed.row - 1 : executed.row;
  if (baseRow < toTransform.row) {
    return { ...toTransform, row: toTransform.row + executed.quantity };
  }
  return toTransform;
}

function transformZone(zone: Zone, executed: AddRowsCommand): Zone {
  return expandZoneOnInsertion(zone, "top", executed.row, executed.position, executed.quantity);
}

function mergeCommand(toTransform: AddMergeCommand, executed: AddRowsCommand): AddMergeCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  return { ...toTransform, zone: transformZone(toTransform.zone, executed) };
}
