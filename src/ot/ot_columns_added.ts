import { AddColumnsCommand, AddMergeCommand, ResizeColumnsCommand } from "../types";
import { CellCommand, TargetCommand } from "./ot_helpers";

export function columnsAddedCellCommand(
  toTransform: CellCommand,
  executed: AddColumnsCommand
): CellCommand {
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

function transformZone(zone, executed: AddColumnsCommand) {
  const baseColumn = executed.position === "before" ? executed.column - 1 : executed.column;
  if (zone.left <= baseColumn && zone.right >= baseColumn) {
    zone.right += executed.quantity;
  } else if (baseColumn < zone.left) {
    zone.left += executed.quantity;
    zone.right += executed.quantity;
  }
  return zone;
}

export function columnsAddedTargetCommand(
  toTransform: TargetCommand,
  executed: AddColumnsCommand
): TargetCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  // const baseColumn = executed.position === "before" ? executed.column - 1 : executed.column;
  const adaptedTarget = toTransform.target.map((zone) => transformZone(zone, executed));
  return { ...toTransform, target: adaptedTarget };
}

// TODO write test
export function columnsAddedMergeCommand(
  toTransform: AddMergeCommand,
  executed: AddColumnsCommand
): AddMergeCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  return { ...toTransform, zone: transformZone(toTransform.zone, executed) };
}

export function columnsAddedResizeOrRemoveColumns(
  toTransform: ResizeColumnsCommand, // TODO || RemoveColumnsCommand => create a type
  executed: AddColumnsCommand
): ResizeColumnsCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const baseColumn = executed.position === "before" ? executed.column - 1 : executed.column;
  const columns = toTransform.columns.map((col) =>
    col > baseColumn ? col + executed.quantity : col
  );
  return { ...toTransform, columns };
}

export function columnsAddedAddColumns(
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
