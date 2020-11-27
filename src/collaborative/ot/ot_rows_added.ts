import { otRegistry } from "../../registries";
import { AddRowsCommand, Zone, AddMergeCommand } from "../../types";
import { PositionalCommand, RowsCommand, TargetCommand } from "./ot_types";

/*
 * This file contains the transformations when an AddRowsCommand is executed
 * before the command to transform.
 * Basically, the transformation is to move/expand position/zone based on the
 * position of the added rows
 */

otRegistry.addTransformation("UPDATE_CELL", "ADD_ROWS", cellCommand);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "ADD_ROWS", cellCommand);
otRegistry.addTransformation("CLEAR_CELL", "ADD_ROWS", cellCommand);
otRegistry.addTransformation("SET_BORDER", "ADD_ROWS", cellCommand);

otRegistry.addTransformation("DELETE_CONTENT", "ADD_ROWS", targetCommand);
otRegistry.addTransformation("SET_FORMATTING", "ADD_ROWS", targetCommand);
otRegistry.addTransformation("CLEAR_FORMATTING", "ADD_ROWS", targetCommand);
otRegistry.addTransformation("SET_DECIMAL", "ADD_ROWS", targetCommand);

otRegistry.addTransformation("RESIZE_ROWS", "ADD_ROWS", rowsCommand);
otRegistry.addTransformation("REMOVE_ROWS", "ADD_ROWS", rowsCommand);

otRegistry.addTransformation("ADD_ROWS", "ADD_ROWS", addRowsCommand);

otRegistry.addTransformation("ADD_MERGE", "ADD_ROWS", mergeCommand);
otRegistry.addTransformation("REMOVE_MERGE", "ADD_ROWS", mergeCommand);

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
  const baseRow = executed.position === "before" ? executed.row - 1 : executed.row;
  if (zone.top <= baseRow && zone.bottom >= baseRow) {
    zone.bottom += executed.quantity;
  } else if (baseRow < zone.top) {
    zone.top += executed.quantity;
    zone.bottom += executed.quantity;
  }
  return zone;
}

function mergeCommand(toTransform: AddMergeCommand, executed: AddRowsCommand): AddMergeCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  return { ...toTransform, zone: transformZone(toTransform.zone, executed) };
}
