import { clipboardHandlersRegistries } from "@odoo/o-spreadsheet-engine/registries/clipboardHandlersRegistries";
import { BorderClipboardHandler } from "./borders_clipboard";
import { CarouselClipboardHandler } from "./carousel_clipboard";
import { CellClipboardHandler } from "./cell_clipboard";
import { ChartClipboardHandler } from "./chart_clipboard";
import { ConditionalFormatClipboardHandler } from "./conditional_format_clipboard";
import { DataValidationClipboardHandler } from "./data_validation_clipboard";
import { DefaultClipboardHandler } from "./default_clipboard";
import { ImageClipboardHandler } from "./image_clipboard";
import { MergeClipboardHandler } from "./merge_clipboard";
import { ReferenceClipboardHandler } from "./references_clipboard";
import { SheetClipboardHandler } from "./sheet_clipboard";
import { TableClipboardHandler } from "./tables_clipboard";

clipboardHandlersRegistries.figureHandlers
  .add("chart", ChartClipboardHandler)
  .add("image", ImageClipboardHandler)
  .add("carousel", CarouselClipboardHandler);

clipboardHandlersRegistries.cellHandlers
  .add("dataValidation", DataValidationClipboardHandler)
  .add("default", DefaultClipboardHandler)
  .add("cell", CellClipboardHandler)
  .add("sheet", SheetClipboardHandler)
  .add("merge", MergeClipboardHandler)
  .add("table", TableClipboardHandler)
  .add("conditionalFormat", ConditionalFormatClipboardHandler)
  .add("references", ReferenceClipboardHandler)
  .add("border", BorderClipboardHandler);
