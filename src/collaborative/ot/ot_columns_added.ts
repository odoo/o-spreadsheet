import { otRegistry } from "../../registries";
import { AddColumnsCommand, AddMergeCommand, Zone } from "../../types";
import { ColumnsCommand, PositionalCommand, TargetCommand } from "./ot_types";

/*
 * This file contains the transformations when an AddColumnsCommand is executed
 * before the command to transform.
 * Basically, the transformation is to move/expand position/zone based on the
 * position of the added columns
 */

otRegistry.addTransformation("UPDATE_CELL", "ADD_COLUMNS", cellCommand);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "ADD_COLUMNS", cellCommand);
otRegistry.addTransformation("CLEAR_CELL", "ADD_COLUMNS", cellCommand);
otRegistry.addTransformation("SET_BORDER", "ADD_COLUMNS", cellCommand);

otRegistry.addTransformation("DELETE_CONTENT", "ADD_COLUMNS", targetCommand);
otRegistry.addTransformation("SET_FORMATTING", "ADD_COLUMNS", targetCommand);
otRegistry.addTransformation("CLEAR_FORMATTING", "ADD_COLUMNS", targetCommand);
otRegistry.addTransformation("SET_DECIMAL", "ADD_COLUMNS", targetCommand);

otRegistry.addTransformation("RESIZE_COLUMNS", "ADD_COLUMNS", columnsCommand);
otRegistry.addTransformation("REMOVE_COLUMNS", "ADD_COLUMNS", columnsCommand);

otRegistry.addTransformation("ADD_COLUMNS", "ADD_COLUMNS", addColumnsCommand);

otRegistry.addTransformation("ADD_MERGE", "ADD_COLUMNS", mergeCommand);
otRegistry.addTransformation("REMOVE_MERGE", "ADD_COLUMNS", mergeCommand);

function transformZone(zone: Zone, executed: AddColumnsCommand) {
  const baseColumn = executed.position === "before" ? executed.column - 1 : executed.column;
  if (zone.left <= baseColumn && zone.right >= baseColumn) {
    zone.right += executed.quantity;
  } else if (baseColumn < zone.left) {
    zone.left += executed.quantity;
    zone.right += executed.quantity;
  }
  return zone;
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
