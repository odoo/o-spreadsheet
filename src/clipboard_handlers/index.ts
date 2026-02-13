import { clipboardHandlersRegistries } from "@odoo/o-spreadsheet-engine/registries/clipboardHandlersRegistries";
import { BorderClipboardHandler } from "./borders_clipboard";
import { CarouselClipboardHandler } from "./carousel_clipboard";
import { CellClipboardHandler } from "./cell_clipboard";
import { ChartClipboardHandler } from "./chart_clipboard";
import { ConditionalFormatClipboardHandler } from "./conditional_format_clipboard";
import { DataValidationClipboardHandler } from "./data_validation_clipboard";
import { ImageClipboardHandler } from "./image_clipboard";
import { MergeClipboardHandler } from "./merge_clipboard";
import { ReferenceClipboardHandler } from "./references_clipboard";
import { SheetClipboardHandler } from "./sheet_clipboard";
import { StyleClipboardHandler } from "./style_clipboard";
import { TableClipboardHandler } from "./tables_clipboard";

clipboardHandlersRegistries.figureHandlers
  .add("chart", ChartClipboardHandler)
  .add("image", ImageClipboardHandler)
  .add("carousel", CarouselClipboardHandler);

clipboardHandlersRegistries.cellHandlers
  .add("dataValidation", DataValidationClipboardHandler)
  .add("cell", CellClipboardHandler)
  .add("sheet", SheetClipboardHandler)
  .add("merge", MergeClipboardHandler)
  .add("border", BorderClipboardHandler)
  .add("table", TableClipboardHandler)
  .add("conditionalFormat", ConditionalFormatClipboardHandler)
<<<<<<< f135c07860d14c28c3002f0aacd7d4d10b229c3f
  .add("references", ReferenceClipboardHandler)
  .add("border", BorderClipboardHandler)
  .add("style", StyleClipboardHandler);
||||||| a1801a94ff524e45fe8f7f409e4b80837c7a37b7
  .add("references", ReferenceClipboardHandler)
  .add("border", BorderClipboardHandler);
=======
  .add("references", ReferenceClipboardHandler);
>>>>>>> 81aa2cdcb3b43f517fb9cbc15c989686107464de
