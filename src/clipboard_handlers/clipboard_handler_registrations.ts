import { clipboardHandlersRegistries } from "../registries/clipboardHandlersRegistries";
import { BorderClipboardHandler } from "./borders_clipboard";
import { CarouselClipboardHandler } from "./carousel_clipboard";
import { CellClipboardHandler } from "./cell_clipboard";
import { ChartClipboardHandler } from "./chart_clipboard";
import { ConditionalFormatClipboardHandler } from "./conditional_format_clipboard";
import { DataValidationClipboardHandler } from "./data_validation_clipboard";
import { FrozenPaneClipboardHandler } from "./frozen_pane_clipboard";
import { ImageClipboardHandler } from "./image_clipboard";
import { MergeClipboardHandler } from "./merge_clipboard";
import { TableClipboardHandler } from "./tables_clipboard";
import { ZoneClipboardHandler } from "./zone_clipboard";

clipboardHandlersRegistries.figureHandlers
  .add("chart", ChartClipboardHandler)
  .add("image", ImageClipboardHandler)
  .add("carousel", CarouselClipboardHandler);

clipboardHandlersRegistries.cellHandlers
  .add("dataValidation", DataValidationClipboardHandler)
  .add("cell", CellClipboardHandler)
  .add("merge", MergeClipboardHandler)
  .add("border", BorderClipboardHandler)
  .add("table", TableClipboardHandler)
  .add("conditionalFormat", ConditionalFormatClipboardHandler);

clipboardHandlersRegistries.sheetHandlers
  .add("frozenPane", FrozenPaneClipboardHandler)
  .add("zones", ZoneClipboardHandler);
