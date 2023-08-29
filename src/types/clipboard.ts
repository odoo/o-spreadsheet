import { Command, CommandResult } from "./commands";
import { UID, Zone } from "./misc";
import { GridRenderingContext } from "./rendering";

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
   * Check if any modification at the given position post cut operation requires clipboard invalidation.
   */
  isInvalidatedBy(cmd: Command): boolean;
}
