import { AbstractCellClipboardHandler } from "../clipboard_handlers/abstract_cell_clipboard_handler";
import {
  ClipboardHandler,
  ClipboardHandlerConstructor,
} from "../clipboard_handlers/abstract_clipboard_handler";
import { AbstractFigureClipboardHandler } from "../clipboard_handlers/abstract_figure_clipboard_handler";
import { Registry } from "./registry";

export const clipboardHandlersRegistries = {
  figureHandlers: new Registry<ClipboardHandlerConstructor<AbstractFigureClipboardHandler<any>>>(),
  sheetHandlers: new Registry<ClipboardHandlerConstructor<ClipboardHandler<any>>>(),
  cellHandlers: new Registry<ClipboardHandlerConstructor<AbstractCellClipboardHandler<any, any>>>(),
  rangeHandlers: new Registry<ClipboardHandlerConstructor<ClipboardHandler<any>>>(),
};
