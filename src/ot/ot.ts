import { isDefined } from "../helpers/index";
import { toXC } from "../helpers/coordinates";
import { isInside } from "../helpers/zones";
import { OTRegistry } from "../registries/ot_registry";
import { AddMergeCommand, UpdateCellCommand, CoreCommand, RenameSheetCommand } from "../types";
import {
  columnAdded,
  columnRemoved,
  columnRemovedcolumnRemoved as columnRemovedcolumnRemove,
  columnRemovedTarget,
  rowAdded,
  rowRemoved,
  rowRemovedRowRemove,
  rowRemovedTarget,
  sheetDeleted,
} from "./ot_helpers";

export function transform(
  toTransform: CoreCommand,
  executed: CoreCommand
): CoreCommand | undefined {
  const ot = otRegistry.getTransformation(toTransform.type, executed.type);
  return ot ? ot(toTransform, executed) : toTransform;
}

export function transformAll(toTransform: CoreCommand[], executed: CoreCommand): CoreCommand[] {
  return toTransform.map((cmd) => transform(cmd, executed)).filter(isDefined);
}

export const otRegistry = new OTRegistry();

otRegistry.addTransformation("UPDATE_CELL", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "DELETE_SHEET", sheetDeleted);
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

otRegistry.addTransformation("UPDATE_CELL", "ADD_COLUMNS", columnAdded);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "ADD_COLUMNS", columnAdded);
otRegistry.addTransformation("CLEAR_CELL", "ADD_COLUMNS", columnAdded);
otRegistry.addTransformation("SET_BORDER", "ADD_COLUMNS", columnAdded);

otRegistry.addTransformation("UPDATE_CELL", "ADD_ROWS", rowAdded);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "ADD_ROWS", rowAdded);
otRegistry.addTransformation("CLEAR_CELL", "ADD_ROWS", rowAdded);
otRegistry.addTransformation("SET_BORDER", "ADD_ROWS", rowAdded);

otRegistry.addTransformation("UPDATE_CELL", "REMOVE_COLUMNS", columnRemoved);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "REMOVE_COLUMNS", columnRemoved);
otRegistry.addTransformation("CLEAR_CELL", "REMOVE_COLUMNS", columnRemoved);
otRegistry.addTransformation("SET_BORDER", "REMOVE_COLUMNS", columnRemoved);
otRegistry.addTransformation("DELETE_CONTENT", "REMOVE_COLUMNS", columnRemovedTarget);
otRegistry.addTransformation("SET_FORMATTING", "REMOVE_COLUMNS", columnRemovedTarget);
otRegistry.addTransformation("CLEAR_FORMATTING", "REMOVE_COLUMNS", columnRemovedTarget);
otRegistry.addTransformation("SET_DECIMAL", "REMOVE_COLUMNS", columnRemovedTarget);
otRegistry.addTransformation("REMOVE_COLUMNS", "REMOVE_COLUMNS", columnRemovedcolumnRemove);

otRegistry.addTransformation("UPDATE_CELL", "REMOVE_ROWS", rowRemoved);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "REMOVE_ROWS", rowRemoved);
otRegistry.addTransformation("CLEAR_CELL", "REMOVE_ROWS", rowRemoved);
otRegistry.addTransformation("SET_BORDER", "REMOVE_ROWS", rowRemoved);
otRegistry.addTransformation("DELETE_CONTENT", "REMOVE_ROWS", rowRemovedTarget);
otRegistry.addTransformation("SET_FORMATTING", "REMOVE_ROWS", rowRemovedTarget);
otRegistry.addTransformation("CLEAR_FORMATTING", "REMOVE_ROWS", rowRemovedTarget);
otRegistry.addTransformation("SET_DECIMAL", "REMOVE_ROWS", rowRemovedTarget);
otRegistry.addTransformation("REMOVE_ROWS", "REMOVE_ROWS", rowRemovedRowRemove);

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
    "RENAME_SHEET",
    (toTransform: UpdateCellCommand, executed: RenameSheetCommand): UpdateCellCommand => {
      //TODO Not sure what to do here, we do not have the old name in the renameSheetCommand :/
      return toTransform;
    }
  );
