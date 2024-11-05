import { Registry } from "../registries/registry";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";
import { AbstractFigureClipboardHandler } from "./abstract_figure_clipboard_handler";
import { BorderClipboardHandler } from "./borders_clipboard";
import { CellClipboardHandler } from "./cell_clipboard";
import { ChartClipboardHandler } from "./chart_clipboard";
import { ConditionalFormatClipboardHandler } from "./conditional_format_clipboard";
import { DataValidationClipboardHandler } from "./data_validation_clipboard";
import { FigureViewportClipboardHandler } from "./figure_viewport_clipboard";
import { ImageClipboardHandler } from "./image_clipboard";
import { MergeClipboardHandler } from "./merge_clipboard";
import { SheetClipboardHandler } from "./sheet_clipboard";
import { TableClipboardHandler } from "./tables_clipboard";

export const clipboardHandlersRegistries = {
  figureHandlers: new Registry<typeof AbstractFigureClipboardHandler<any>>(),
  cellHandlers: new Registry<typeof AbstractCellClipboardHandler<any, any>>(),
};

clipboardHandlersRegistries.figureHandlers
  .add("chart", ChartClipboardHandler)
  .add("image", ImageClipboardHandler)
  .add("viewport_figure", FigureViewportClipboardHandler);

clipboardHandlersRegistries.cellHandlers
  .add("dataValidation", DataValidationClipboardHandler)
  .add("cell", CellClipboardHandler)
  .add("sheet", SheetClipboardHandler)
  .add("merge", MergeClipboardHandler)
  .add("border", BorderClipboardHandler)
  .add("table", TableClipboardHandler)
  .add("conditionalFormat", ConditionalFormatClipboardHandler);
