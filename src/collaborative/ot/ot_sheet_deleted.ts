import { otRegistry } from "../../registries";
import { DeleteSheetCommand, DuplicateSheetCommand } from "../../types";
import { SheetyCommand } from "../../types/ot_types";

/*
 * This file contains the transformations when an DeleteSheetCommand is executed
 * before the command to transform.
 * Basically, the transformation is to skip commands which do stuff on the
 * deleted sheet
 */

otRegistry.addTransformation(
  "DELETE_SHEET",
  [
    "UPDATE_CELL",
    "UPDATE_CELL_POSITION",
    "CLEAR_CELL",
    "DELETE_CONTENT",
    "ADD_COLUMNS",
    "ADD_ROWS",
    "REMOVE_COLUMNS",
    "REMOVE_ROWS",
    "ADD_MERGE",
    "REMOVE_MERGE",
    "MOVE_SHEET",
    "RENAME_SHEET",
    "ADD_CONDITIONAL_FORMAT",
    "SET_FORMATTING",
    "CLEAR_FORMATTING",
    "SET_BORDER",
    "SET_DECIMAL",
    "RESIZE_COLUMNS",
    "RESIZE_ROWS",
    "REMOVE_CONDITIONAL_FORMAT",
    "DELETE_SHEET",
    "CREATE_FIGURE",
    "UPDATE_FIGURE",
    "DELETE_FIGURE",
    "CREATE_CHART",
    "UPDATE_CHART",
  ],
  sheetDeleted
);

otRegistry.addTransformation("DELETE_SHEET", ["DUPLICATE_SHEET"], duplicateCommand);

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
