import { Registry } from "../registries/registry";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";
import { AbstractFigureClipboardHandler } from "./abstract_figure_clipboard_handler";
import { BorderClipboardHandler } from "./borders";
import { CellClipboardHandler } from "./cell";
import { ChartClipboardHandler } from "./chart";
import { ConditionalFormatClipboardHandler } from "./conditional_format";
import { DataValidationClipboardHandler } from "./data_validation";
import { FilterClipboardHandler } from "./filters";
import { ImageClipboardHandler } from "./image";
import { MergeClipboardHandler } from "./merge";
import { SheetClipboardHandler } from "./sheet";

export const clipboardHandlersRegistries = {
  figureHandlers: new Registry<typeof AbstractFigureClipboardHandler<any>>(),
  cellHandlers: new Registry<typeof AbstractCellClipboardHandler<any, any>>(),
};

clipboardHandlersRegistries.figureHandlers
  .add("chart", ChartClipboardHandler)
  .add("image", ImageClipboardHandler);

clipboardHandlersRegistries.cellHandlers
  .add("dataValidation", DataValidationClipboardHandler)
  .add("cell", CellClipboardHandler)
  .add("sheet", SheetClipboardHandler)
  .add("merge", MergeClipboardHandler)
  .add("border", BorderClipboardHandler)
  .add("filter", FilterClipboardHandler)
  .add("conditionalFormat", ConditionalFormatClipboardHandler);
