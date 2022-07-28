import { CommandResult } from "./commands";
import { Dimension, HeaderIndex, UID, Zone } from "./misc";
import { GridRenderingContext } from "./rendering";

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
  getClipboardContent(): string;
  drawClipboard(renderingContext: GridRenderingContext): void;

  /**
   * Check if a col/row added/removed at the given position is dirtying the clipboard
   */
  isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension): boolean;
}
