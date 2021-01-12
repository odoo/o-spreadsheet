import { expandZoneOnInsertion } from "../../helpers";
import { otRegistry } from "../../registries";
import { AddColumnsCommand, AddMergeCommand, Zone } from "../../types";
import { ColumnsCommand, PositionalCommand, TargetCommand } from "../../types/ot_types";

/*
 * This file contains the transformations when an AddColumnsCommand is executed
 * before the command to transform.
 * Basically, the transformation is to move/expand position/zone based on the
 * position of the added columns
 */

otRegistry.addTransformation(
  "ADD_COLUMNS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  cellCommand
);

otRegistry.addTransformation(
  "ADD_COLUMNS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  targetCommand
);

otRegistry.addTransformation("ADD_COLUMNS", ["RESIZE_COLUMNS", "REMOVE_COLUMNS"], columnsCommand);

otRegistry.addTransformation("ADD_COLUMNS", ["ADD_COLUMNS"], addColumnsCommand);

otRegistry.addTransformation("ADD_COLUMNS", ["ADD_MERGE", "REMOVE_MERGE"], mergeCommand);

function transformZone(zone: Zone, executed: AddColumnsCommand) {
  return expandZoneOnInsertion(zone, "left", executed.column, executed.position, executed.quantity);
}

function cellCommand(
  toTransform: PositionalCommand,
  executed: AddColumnsCommand
): PositionalCommand {
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

function targetCommand(toTransform: TargetCommand, executed: AddColumnsCommand): TargetCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const adaptedTarget = toTransform.target.map((zone) => transformZone(zone, executed));
  return { ...toTransform, target: adaptedTarget };
}

function mergeCommand(toTransform: AddMergeCommand, executed: AddColumnsCommand): AddMergeCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  return { ...toTransform, zone: transformZone(toTransform.zone, executed) };
}

function columnsCommand(toTransform: ColumnsCommand, executed: AddColumnsCommand): ColumnsCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const baseColumn = executed.position === "before" ? executed.column - 1 : executed.column;
  const columns = toTransform.columns.map((col) =>
    col > baseColumn ? col + executed.quantity : col
  );
  return { ...toTransform, columns };
}

function addColumnsCommand(
  toTransform: AddColumnsCommand,
  executed: AddColumnsCommand
): AddColumnsCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const baseColumn = executed.position === "before" ? executed.column - 1 : executed.column;
  if (baseColumn < toTransform.column) {
    return { ...toTransform, column: toTransform.column + executed.quantity };
  }
  return toTransform;
}
