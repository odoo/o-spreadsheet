import { isDefined } from "../helpers/index";
import { OTRegistry } from "../registries/ot_registry";
import { CoreCommand } from "../types";
import {
  columnsAddedAddColumns,
  columnsAddedCellCommand,
  columnsAddedMergeCommand,
  columnsAddedResizeOrRemoveColumns,
  columnsAddedTargetCommand,
} from "./ot_columns_added";
import {
  columnsRemovedAddColumns,
  columnsRemovedAddOrRemoveMerge,
  columnsRemovedCellCommand,
  columnsRemovedResizeOrRemoveColumns,
  columnsRemovedTargetCommand,
} from "./ot_columns_removed";
import {
  figureDeletedUpdateChartFigure,
  sheetDeleted,
  sheetDeletedAndDuplicate,
} from "./ot_helpers";
import { mergedCellAddMerge, mergedCellCommand } from "./ot_merged";
import {
  rowsAddedCellCommand,
  rowsAddedMergeCommand,
  rowsAddedResizeOrRemoveRows,
  rowsAddedTargetCommand,
  rowsAddedAddRows,
} from "./ot_rows_added";
import {
  rowsRemovedCellCommand,
  rowsRemovedTargetCommand,
  rowsRemovedRemoveOrResizeRows,
  rowsRemovedAddRows,
  rowsRemovedAddOrRemoveMerge,
} from "./ot_rows_removed";

/**
 * TODO
 */
export function transform(
  toTransform: CoreCommand,
  executed: CoreCommand
): CoreCommand | undefined {
  const ot = otRegistry.getTransformation(toTransform.type, executed.type);
  return ot ? ot(toTransform, executed) : toTransform;
}

/**
 * TODO
 */
export function transformAll(
  toTransform: readonly CoreCommand[],
  executed: readonly CoreCommand[]
): CoreCommand[] {
  let transformedCommands = [...toTransform];
  for (const executedCommand of executed) {
    transformedCommands = transformedCommands
      .map((cmd) => transform(cmd, executedCommand))
      .filter(isDefined);
  }
  return transformedCommands;
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
otRegistry.addTransformation("RESIZE_COLUMNS", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("RESIZE_ROWS", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("REMOVE_CONDITIONAL_FORMAT", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("DELETE_SHEET", "DELETE_SHEET", sheetDeleted);
otRegistry.addTransformation("DUPLICATE_SHEET", "DELETE_SHEET", sheetDeletedAndDuplicate);

// -----------------------------------------------------------------------------
// Columns Added
// -----------------------------------------------------------------------------
/** Cell Commands */
otRegistry.addTransformation("UPDATE_CELL", "ADD_COLUMNS", columnsAddedCellCommand);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "ADD_COLUMNS", columnsAddedCellCommand);
otRegistry.addTransformation("CLEAR_CELL", "ADD_COLUMNS", columnsAddedCellCommand);
otRegistry.addTransformation("SET_BORDER", "ADD_COLUMNS", columnsAddedCellCommand);
/** Target Commands */
otRegistry.addTransformation("DELETE_CONTENT", "ADD_COLUMNS", columnsAddedTargetCommand);
otRegistry.addTransformation("SET_FORMATTING", "ADD_COLUMNS", columnsAddedTargetCommand);
otRegistry.addTransformation("CLEAR_FORMATTING", "ADD_COLUMNS", columnsAddedTargetCommand);
otRegistry.addTransformation("SET_DECIMAL", "ADD_COLUMNS", columnsAddedTargetCommand);
/** Resize Columns */
otRegistry.addTransformation("RESIZE_COLUMNS", "ADD_COLUMNS", columnsAddedResizeOrRemoveColumns);
/** Remove Columns */
otRegistry.addTransformation("REMOVE_COLUMNS", "ADD_COLUMNS", columnsAddedResizeOrRemoveColumns);
/** Add Columns */
otRegistry.addTransformation("ADD_COLUMNS", "ADD_COLUMNS", columnsAddedAddColumns);
/** Merge */
otRegistry.addTransformation("ADD_MERGE", "ADD_COLUMNS", columnsAddedMergeCommand);
otRegistry.addTransformation("REMOVE_MERGE", "ADD_COLUMNS", columnsAddedMergeCommand);

// -----------------------------------------------------------------------------
// Rows Added
// -----------------------------------------------------------------------------
/** Cell Commands */
otRegistry.addTransformation("UPDATE_CELL", "ADD_ROWS", rowsAddedCellCommand);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "ADD_ROWS", rowsAddedCellCommand);
otRegistry.addTransformation("CLEAR_CELL", "ADD_ROWS", rowsAddedCellCommand);
otRegistry.addTransformation("SET_BORDER", "ADD_ROWS", rowsAddedCellCommand);
/** Target Commands */
otRegistry.addTransformation("DELETE_CONTENT", "ADD_ROWS", rowsAddedTargetCommand);
otRegistry.addTransformation("SET_FORMATTING", "ADD_ROWS", rowsAddedTargetCommand);
otRegistry.addTransformation("CLEAR_FORMATTING", "ADD_ROWS", rowsAddedTargetCommand);
otRegistry.addTransformation("SET_DECIMAL", "ADD_ROWS", rowsAddedTargetCommand);
/** Resize Rows */
otRegistry.addTransformation("RESIZE_ROWS", "ADD_ROWS", rowsAddedResizeOrRemoveRows);
/** Remove Rows */
otRegistry.addTransformation("REMOVE_ROWS", "ADD_ROWS", rowsAddedResizeOrRemoveRows);
/** Add Rows */
otRegistry.addTransformation("ADD_ROWS", "ADD_ROWS", rowsAddedAddRows);
/** Merge */
otRegistry.addTransformation("ADD_MERGE", "ADD_ROWS", rowsAddedMergeCommand);
otRegistry.addTransformation("REMOVE_MERGE", "ADD_ROWS", rowsAddedMergeCommand);

// -----------------------------------------------------------------------------
// Columns Removed
// -----------------------------------------------------------------------------
/** Cell Commands */
otRegistry.addTransformation("UPDATE_CELL", "REMOVE_COLUMNS", columnsRemovedCellCommand);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "REMOVE_COLUMNS", columnsRemovedCellCommand);
otRegistry.addTransformation("CLEAR_CELL", "REMOVE_COLUMNS", columnsRemovedCellCommand);
otRegistry.addTransformation("SET_BORDER", "REMOVE_COLUMNS", columnsRemovedCellCommand);
/** Target Commands */
otRegistry.addTransformation("DELETE_CONTENT", "REMOVE_COLUMNS", columnsRemovedTargetCommand);
otRegistry.addTransformation("SET_FORMATTING", "REMOVE_COLUMNS", columnsRemovedTargetCommand);
otRegistry.addTransformation("CLEAR_FORMATTING", "REMOVE_COLUMNS", columnsRemovedTargetCommand);
otRegistry.addTransformation("SET_DECIMAL", "REMOVE_COLUMNS", columnsRemovedTargetCommand);
/** Add Columns */
otRegistry.addTransformation("ADD_COLUMNS", "REMOVE_COLUMNS", columnsRemovedAddColumns);
/** Remove Columns */
otRegistry.addTransformation(
  "REMOVE_COLUMNS",
  "REMOVE_COLUMNS",
  columnsRemovedResizeOrRemoveColumns
);
/** Resize Columns */
otRegistry.addTransformation(
  "RESIZE_COLUMNS",
  "REMOVE_COLUMNS",
  columnsRemovedResizeOrRemoveColumns
);
/** Merge */
otRegistry.addTransformation("ADD_MERGE", "REMOVE_COLUMNS", columnsRemovedAddOrRemoveMerge);
otRegistry.addTransformation("REMOVE_MERGE", "REMOVE_COLUMNS", columnsRemovedAddOrRemoveMerge);

// -----------------------------------------------------------------------------
// Rows Removed
// -----------------------------------------------------------------------------
/** Cell Commands */
otRegistry.addTransformation("UPDATE_CELL", "REMOVE_ROWS", rowsRemovedCellCommand);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "REMOVE_ROWS", rowsRemovedCellCommand);
otRegistry.addTransformation("CLEAR_CELL", "REMOVE_ROWS", rowsRemovedCellCommand);
otRegistry.addTransformation("SET_BORDER", "REMOVE_ROWS", rowsRemovedCellCommand);
/** Target Commands */
otRegistry.addTransformation("DELETE_CONTENT", "REMOVE_ROWS", rowsRemovedTargetCommand);
otRegistry.addTransformation("SET_FORMATTING", "REMOVE_ROWS", rowsRemovedTargetCommand);
otRegistry.addTransformation("CLEAR_FORMATTING", "REMOVE_ROWS", rowsRemovedTargetCommand);
otRegistry.addTransformation("SET_DECIMAL", "REMOVE_ROWS", rowsRemovedTargetCommand);
/** Add Rows */
otRegistry.addTransformation("ADD_ROWS", "REMOVE_ROWS", rowsRemovedAddRows);
/** Remove - Resize Rows */
otRegistry.addTransformation("REMOVE_ROWS", "REMOVE_ROWS", rowsRemovedRemoveOrResizeRows);
otRegistry.addTransformation("RESIZE_ROWS", "REMOVE_ROWS", rowsRemovedRemoveOrResizeRows);
/** Merge */
otRegistry.addTransformation("ADD_MERGE", "REMOVE_ROWS", rowsRemovedAddOrRemoveMerge);
otRegistry.addTransformation("REMOVE_MERGE", "REMOVE_ROWS", rowsRemovedAddOrRemoveMerge);

// -----------------------------------------------------------------------------
// Merged
// -----------------------------------------------------------------------------
/** Cell Commands */
otRegistry.addTransformation("UPDATE_CELL", "ADD_MERGE", mergedCellCommand);
otRegistry.addTransformation("UPDATE_CELL_POSITION", "ADD_MERGE", mergedCellCommand);
otRegistry.addTransformation("CLEAR_CELL", "ADD_MERGE", mergedCellCommand);
otRegistry.addTransformation("SET_BORDER", "ADD_MERGE", mergedCellCommand);
/** Merge */
otRegistry.addTransformation("ADD_MERGE", "ADD_MERGE", mergedCellAddMerge);
otRegistry.addTransformation("REMOVE_MERGE", "ADD_MERGE", mergedCellAddMerge);

otRegistry.addTransformation("UPDATE_FIGURE", "DELETE_FIGURE", figureDeletedUpdateChartFigure);
otRegistry.addTransformation("UPDATE_CHART", "DELETE_FIGURE", figureDeletedUpdateChartFigure);
