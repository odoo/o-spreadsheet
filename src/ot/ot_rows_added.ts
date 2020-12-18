import { AddRowsCommand, ResizeRowsCommand } from "../types";
import { CellCommand, TargetCommand } from "./ot_helpers";

export function rowsAddedCellCommand(
  toTransform: CellCommand,
  executed: AddRowsCommand
): CellCommand {
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

export function rowsAddedTargetCommand(
  toTransform: TargetCommand,
  executed: AddRowsCommand
): TargetCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const baseRow = executed.position === "before" ? executed.row - 1 : executed.row;
  const adaptedTarget = toTransform.target.map((zone) => {
    if (zone.top <= baseRow && zone.bottom >= baseRow) {
      zone.bottom += executed.quantity;
    } else if (baseRow < zone.top) {
      zone.top += executed.quantity;
      zone.bottom += executed.quantity;
    }
    return zone;
  });
  return { ...toTransform, target: adaptedTarget };
}

export function rowsAddedResizeRows(
  toTransform: ResizeRowsCommand,
  executed: AddRowsCommand
): ResizeRowsCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const baseRow = executed.position === "before" ? executed.row - 1 : executed.row;
  const rows = toTransform.rows.map((row) => (row > baseRow ? row + executed.quantity : row));
  return { ...toTransform, rows };
}

export function rowsAddedAddRows(
  toTransform: AddRowsCommand,
  executed: AddRowsCommand
): AddRowsCommand {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const baseRow = executed.position === "before" ? executed.row - 1 : executed.row;
  if (baseRow < toTransform.row) {
    return { ...toTransform, row: toTransform.row + executed.quantity };
  }
  return toTransform;
}
