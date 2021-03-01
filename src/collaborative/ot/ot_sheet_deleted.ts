import { otRegistry } from "../../registries";
import { DeleteSheetCommand } from "../../types";
import { SheetCommand } from "../../types/collaborative/ot_types";

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
    "ADD_COLUMNS_ROWS",
    "REMOVE_COLUMNS_ROWS",
    "ADD_MERGE",
    "REMOVE_MERGE",
    "MOVE_SHEET",
    "RENAME_SHEET",
    "ADD_CONDITIONAL_FORMAT",
    "SET_FORMATTING",
    "CLEAR_FORMATTING",
    "SET_BORDER",
    "SET_DECIMAL",
    "RESIZE_COLUMNS_ROWS",
    "REMOVE_CONDITIONAL_FORMAT",
    "DELETE_SHEET",
    "CREATE_FIGURE",
    "UPDATE_FIGURE",
    "DELETE_FIGURE",
    "CREATE_CHART",
    "UPDATE_CHART",
    "DUPLICATE_SHEET",
  ],
  sheetDeleted
);

function sheetDeleted(
  toTransform: SheetCommand,
  executed: DeleteSheetCommand
): SheetCommand | undefined {
  if (toTransform.sheetId === executed.sheetId) {
    return undefined;
  }
  return toTransform;
}
