import { AbstractCellClipboardHandler } from "../clipboard_handlers/abstract_cell_clipboard_handler";
import {
  ClipboardHandler,
  ClipboardHandlerConstructor,
  NamedClipboardHandler,
} from "../clipboard_handlers/abstract_clipboard_handler";
import { AbstractFigureClipboardHandler } from "../clipboard_handlers/abstract_figure_clipboard_handler";
import { CommandDispatcher } from "../types/commands";
import { Getters } from "../types/getters";
import { Registry } from "./registry";

export const clipboardHandlersRegistries = {
  figureHandlers: new Registry<ClipboardHandlerConstructor<AbstractFigureClipboardHandler<any>>>(),
  sheetHandlers: new Registry<ClipboardHandlerConstructor<ClipboardHandler<any>>>(),
  cellHandlers: new Registry<ClipboardHandlerConstructor<AbstractCellClipboardHandler<any, any>>>(),
  rangeHandlers: new Registry<ClipboardHandlerConstructor<ClipboardHandler<any>>>(),
};

export interface CrossSpreadsheetClipboardTransformer<TransformerData, CrossSpreadsheetData> {
  /** Go through all the clipboard handlers to collect data that will be copied in the OS clipboard */
  collectData(
    getters: Getters,
    copiedContent: any,
    handlers: NamedClipboardHandler[]
  ): CrossSpreadsheetData;
  /** Called when pasting data from the OS clipboard into the spreadsheet. */
  onCrossSpreadsheetPaste(
    getters: Getters,
    dispatch: CommandDispatcher["dispatch"],
    data: CrossSpreadsheetData
  ): TransformerData;
  /** Transforms in place the content of the clipboards. */
  transform(data: TransformerData, copiedContent: any, handlers: NamedClipboardHandler[]): void;
}

export const crossSpreadsheetClipboardTransformerRegistry = new Registry<
  CrossSpreadsheetClipboardTransformer<any, any>
>();
