import { deepCopy } from "@odoo/o-spreadsheet-engine";
import {
  genericRepeatsTransforms,
  repeatZoneDependantCommand,
} from "@odoo/o-spreadsheet-engine/history/repeat_commands/repeat_commands_generic";
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
} from "@odoo/o-spreadsheet-engine/history/repeat_commands/repeat_commands_specific";
import {
  repeatCommandTransformRegistry,
  repeatLocalCommandTransformRegistry,
} from "@odoo/o-spreadsheet-engine/registries/repeat_transform_registry";
import { Command } from "@odoo/o-spreadsheet-engine/types/commands";
import { Getters } from "../types";

repeatCommandTransformRegistry.add("UPDATE_CELL", genericRepeat);
repeatCommandTransformRegistry.add("CLEAR_CELL", genericRepeat);
repeatCommandTransformRegistry.add("CLEAR_CELLS", genericRepeat);
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
repeatCommandTransformRegistry.add("UNFOLD_HEADER_GROUPS_IN_ZONE", repeatZoneDependantCommand);
repeatCommandTransformRegistry.add("FOLD_HEADER_GROUPS_IN_ZONE", repeatZoneDependantCommand);

repeatLocalCommandTransformRegistry.add("PASTE", repeatPasteCommand);
repeatLocalCommandTransformRegistry.add("INSERT_CELL", repeatInsertOrDeleteCellCommand);
repeatLocalCommandTransformRegistry.add("DELETE_CELL", repeatInsertOrDeleteCellCommand);
repeatLocalCommandTransformRegistry.add("AUTORESIZE_COLUMNS", repeatAutoResizeCommand);
repeatLocalCommandTransformRegistry.add("AUTORESIZE_ROWS", repeatAutoResizeCommand);
repeatLocalCommandTransformRegistry.add("SORT_CELLS", repeatSortCellsCommand);
repeatLocalCommandTransformRegistry.add("SUM_SELECTION", genericRepeat);
repeatLocalCommandTransformRegistry.add("SET_DECIMAL", genericRepeat);
repeatLocalCommandTransformRegistry.add("DELETE_UNFILTERED_CONTENT", genericRepeat);

export function genericRepeat<T extends Command>(getters: Getters, command: T): T {
  let transformedCommand = deepCopy(command);

  for (const repeatTransform of genericRepeatsTransforms) {
    transformedCommand = repeatTransform(getters, transformedCommand);
  }

  return transformedCommand;
}
