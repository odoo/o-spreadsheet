import type { CommandResult } from "./commands";
import type { Dimension, HeaderIndex, UID, Zone } from "./misc";
import type { GridRenderingContext } from "./rendering";

export enum ClipboardMIMEType {
  PlainText = "text/plain",
  Html = "text/html",
}

export type ClipboardContent = { [type in ClipboardMIMEType]?: string };

export interface ClipboardOptions {
  pasteOption?: ClipboardPasteOptions;
  shouldPasteCF?: boolean;
  selectTarget?: boolean;
}
export type ClipboardPasteOptions = "onlyFormat" | "onlyValue";
export type ClipboardOperation = "CUT" | "COPY";

export interface ClipboardState {
  operation: ClipboardOperation;
  sheetId: UID;

  isCutAllowed(target: Zone[]): CommandResult;

  isPasteAllowed(target: Zone[], clipboardOption?: ClipboardOptions): CommandResult;

  paste(target: Zone[], options?: ClipboardOptions | undefined): void;
  getClipboardContent(): ClipboardContent;
  drawClipboard(renderingContext: GridRenderingContext): void;

  /**
   * Check if a col/row added/removed at the given position is dirtying the clipboard
   */
  isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension): boolean;
}
