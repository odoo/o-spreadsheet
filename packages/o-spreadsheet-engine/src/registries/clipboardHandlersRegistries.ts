import { AbstractCellClipboardHandler } from "../clipboard_handlers/abstract_cell_clipboard_handler";
import { AbstractFigureClipboardHandler } from "../clipboard_handlers/abstract_figure_clipboard_handler";
import { Registry } from "./registry";

export const clipboardHandlersRegistries = {
  figureHandlers: new Registry<typeof AbstractFigureClipboardHandler<any>>(),
  cellHandlers: new Registry<typeof AbstractCellClipboardHandler<any>>(),
};
