import { deepCopy } from "../helpers";
import {
  genericRepeatsTransforms,
  repeatZoneDependantCommand,
} from "../history/repeat_commands/repeat_commands_generic";
import {
  repeatAddColumnsRowsCommand,
  repeatAutoResizeCommand,
  repeatCreateChartCommand,
  repeatCreateFigureCommand,
  repeatCreateImageCommand,
  repeatCreateSheetCommand,
  repeatGroupHeadersCommand,
  repeatHeaderElementCommand,
  repeatInsertOrDeleteCellCommand,
  repeatPasteCommand,
  repeatSortCellsCommand,
} from "../history/repeat_commands/repeat_commands_specific";
import { CoreCommand, Getters } from "../types";
import { Command, LocalCommand } from "./../types/commands";
import { Registry } from "./registry";

type RepeatTransform = (getters: Getters, cmd: CoreCommand) => CoreCommand | undefined;

type LocalRepeatTransform = (
  getters: Getters,
  cmd: LocalCommand,
  childCommands: readonly CoreCommand[]
) => CoreCommand[] | LocalCommand | undefined;

/**
 *  Registry containing all the command that can be repeated on redo, and function to transform them
 *  to the current state of the model.
 *
 * If the transform function is undefined, the command will be transformed using generic transformations.
 * (change the sheetId, the row, the col, the target, the ranges, to the current active sheet & selection)
 *
 */
export const repeatCommandTransformRegistry = new Registry<RepeatTransform>();

repeatCommandTransformRegistry.add("UPDATE_CELL", genericRepeat);
repeatCommandTransformRegistry.add("CLEAR_CELL", genericRepeat);
repeatCommandTransformRegistry.add("DELETE_CONTENT", genericRepeat);

repeatCommandTransformRegistry.add("ADD_MERGE", genericRepeat);
repeatCommandTransformRegistry.add("REMOVE_MERGE", genericRepeat);

repeatCommandTransformRegistry.add("SET_FORMATTING", genericRepeat);
repeatCommandTransformRegistry.add("CLEAR_FORMATTING", genericRepeat);
repeatCommandTransformRegistry.add("SET_BORDER", genericRepeat);

repeatCommandTransformRegistry.add("CREATE_TABLE", genericRepeat);
repeatCommandTransformRegistry.add("REMOVE_TABLE", genericRepeat);

repeatCommandTransformRegistry.add("HIDE_SHEET", genericRepeat);

repeatCommandTransformRegistry.add("ADD_COLUMNS_ROWS", repeatAddColumnsRowsCommand);
repeatCommandTransformRegistry.add("REMOVE_COLUMNS_ROWS", repeatHeaderElementCommand);
repeatCommandTransformRegistry.add("HIDE_COLUMNS_ROWS", repeatHeaderElementCommand);
repeatCommandTransformRegistry.add("RESIZE_COLUMNS_ROWS", repeatHeaderElementCommand);

repeatCommandTransformRegistry.add("CREATE_SHEET", repeatCreateSheetCommand);

repeatCommandTransformRegistry.add("CREATE_FIGURE", repeatCreateFigureCommand);
repeatCommandTransformRegistry.add("CREATE_CHART", repeatCreateChartCommand);
repeatCommandTransformRegistry.add("CREATE_IMAGE", repeatCreateImageCommand);
repeatCommandTransformRegistry.add("GROUP_HEADERS", repeatGroupHeadersCommand);
repeatCommandTransformRegistry.add("UNGROUP_HEADERS", repeatGroupHeadersCommand);
repeatCommandTransformRegistry.add("UNGROUP_HEADERS", repeatGroupHeadersCommand);
repeatCommandTransformRegistry.add("UNFOLD_HEADER_GROUPS_IN_ZONE", repeatZoneDependantCommand);
repeatCommandTransformRegistry.add("FOLD_HEADER_GROUPS_IN_ZONE", repeatZoneDependantCommand);

export const repeatLocalCommandTransformRegistry = new Registry<LocalRepeatTransform>();
repeatLocalCommandTransformRegistry.add("PASTE", repeatPasteCommand);
repeatLocalCommandTransformRegistry.add("INSERT_CELL", repeatInsertOrDeleteCellCommand);
repeatLocalCommandTransformRegistry.add("DELETE_CELL", repeatInsertOrDeleteCellCommand);
repeatLocalCommandTransformRegistry.add("AUTORESIZE_COLUMNS", repeatAutoResizeCommand);
repeatLocalCommandTransformRegistry.add("AUTORESIZE_ROWS", repeatAutoResizeCommand);
repeatLocalCommandTransformRegistry.add("SORT_CELLS", repeatSortCellsCommand);
repeatLocalCommandTransformRegistry.add("SUM_SELECTION", genericRepeat);
repeatLocalCommandTransformRegistry.add("SET_DECIMAL", genericRepeat);

export function genericRepeat<T extends Command>(getters: Getters, command: T): T {
  let transformedCommand = deepCopy(command);

  for (const repeatTransform of genericRepeatsTransforms) {
    transformedCommand = repeatTransform(getters, transformedCommand);
  }

  return transformedCommand;
}

export function repeatCoreCommand(
  getters: Getters,
  command: CoreCommand | undefined
): CoreCommand | undefined {
  if (!command) {
    return undefined;
  }

  const isRepeatable = repeatCommandTransformRegistry.contains(command.type);
  if (!isRepeatable) {
    return undefined;
  }

  const transform = repeatCommandTransformRegistry.get(command.type);
  return transform(getters, command);
}

export function repeatLocalCommand(
  getters: Getters,
  command: LocalCommand,
  childCommands: readonly CoreCommand[]
): CoreCommand[] | LocalCommand | undefined {
  const isRepeatable = repeatLocalCommandTransformRegistry.contains(command.type);
  if (!isRepeatable) {
    return undefined;
  }

  const repeatTransform = repeatLocalCommandTransformRegistry.get(command.type);
  return repeatTransform(getters, command, childCommands);
}
