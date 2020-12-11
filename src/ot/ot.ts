import { toXC } from "../helpers/coordinates";
import { isInside } from "../helpers/zones";
import { OTRegistry } from "../registries/ot_registry";
import {
  AddMergeCommand,
  AddRowsCommand,
  UpdateCellCommand,
  AddColumnsCommand,
  RemoveRowsCommand,
  RemoveColumnsCommand,
  CoreCommand,
} from "../types";
import { sheetDeleted } from "./ot_helpers";

export function transform(
  toTransform: CoreCommand,
  executed: CoreCommand
): CoreCommand | undefined {
  const ot = otRegistry.getTransformation(toTransform.type, executed.type);
  return ot ? ot(toTransform, executed) : toTransform;
}

export const otRegistry = new OTRegistry();

otRegistry.addTransformation("UPDATE_CELL", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("CLEAR_CELL", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("DELETE_CONTENT", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("ADD_COLUMNS", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("ADD_ROWS", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("REMOVE_COLUMNS", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("REMOVE_ROWS", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("ADD_MERGE", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("REMOVE_MERGE", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("MOVE_SHEET", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("RENAME_SHEET", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("ADD_CONDITIONAL_FORMAT", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("CREATE_FIGURE", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("SET_FORMATTING", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("CLEAR_FORMATTING", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("SET_BORDER", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("SET_DECIMAL", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("CREATE_CHART", "DELETE_SHEET", sheetDeleted);

otRegistry
  .addTransformation(
    "UPDATE_CELL",
    "ADD_MERGE",
    (toTransform: UpdateCellCommand, executed: AddMergeCommand): UpdateCellCommand | undefined => {
      if (toTransform.sheetId !== executed.sheetId) {
        return toTransform;
      }
      const xc = toXC(toTransform.col, toTransform.row);
      const xcMerge = toXC(executed.zone.left, executed.zone.top);
      if (xc === xcMerge || !isInside(toTransform.col, toTransform.row, executed.zone)) {
        return toTransform;
      }
      return undefined;
    }
  )
  .addTransformation(
    "UPDATE_CELL",
    "ADD_ROWS",
    (toTransform: UpdateCellCommand, executed: AddRowsCommand): UpdateCellCommand => {
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
  )
  .addTransformation(
    "UPDATE_CELL",
    "REMOVE_ROWS",
    (
      toTransform: UpdateCellCommand,
      executed: RemoveRowsCommand
    ): UpdateCellCommand | undefined => {
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
  )
  .addTransformation(
    "UPDATE_CELL",
    "REMOVE_COLUMNS",
    (
      toTransform: UpdateCellCommand,
      executed: RemoveColumnsCommand
    ): UpdateCellCommand | undefined => {
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
  )
  .addTransformation(
    "UPDATE_CELL",
    "ADD_COLUMNS",
    (toTransform: UpdateCellCommand, executed: AddColumnsCommand): UpdateCellCommand => {
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
  );
