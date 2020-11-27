import { otRegistry } from "../../registries";
import { DeleteSheetCommand, DuplicateSheetCommand } from "../../types";
import { SheetyCommand } from "./ot_types";

/*
 * This file contains the transformations when an DeleteSheetCommand is executed
 * before the command to transform.
 * Basically, the transformation is to skip commands which do stuff on the
 * deleted sheet
 */

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
otRegistry.addTransformation("RESIZE_COLUMNS", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("RESIZE_ROWS", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("REMOVE_CONDITIONAL_FORMAT", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("DELETE_SHEET", "DELETE_SHEET", sheetDeleted);

otRegistry.addTransformation("DUPLICATE_SHEET", "DELETE_SHEET", duplicateCommand);

function sheetDeleted(
  toTransform: SheetyCommand,
  executed: DeleteSheetCommand
): SheetyCommand | undefined {
  if (toTransform.sheetId === executed.sheetId) {
    return undefined;
  }
  return toTransform;
}

function duplicateCommand(
  toTransform: DuplicateSheetCommand,
  executed: DeleteSheetCommand
): DuplicateSheetCommand | undefined {
  if (toTransform.sheetIdFrom === executed.sheetId) {
    return undefined;
  }
  return toTransform;
}
