import {
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  Map2D,
  Merge,
  UID,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

interface ClipboardContent {
  sheetId: UID;
  cellContent: Map2D<Merge>;
}

export class MergeClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const { rowsIndexes, columnsIndexes } = data;
    const cellContent = new Map2D<Merge>(columnsIndexes.length, rowsIndexes.length);

    for (const [r, row] of rowsIndexes.entries()) {
      for (const [c, col] of columnsIndexes.entries()) {
        const value = this.getters.getMerge({ col, row, sheetId });
        if (value !== undefined) cellContent.set(c, r, value);
      }
    }
    return { sheetId, cellContent };
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    if (options.isCutOperation) {
      const copiedMerges = [...content.cellContent.values()];
      this.dispatch("REMOVE_MERGE", { sheetId: content.sheetId, target: copiedMerges });
    }
    this.pasteFromCopy(target.sheetId, target.zones, content, options);
  }

  pasteZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, content: ClipboardContent) {
    for (const [c, r, originMerge] of content.cellContent.entries()) {
      const position = { col: col + c, row: row + r, sheetId };
      this.pasteMerge(originMerge, position);
    }
  }

  private pasteMerge(originMerge: Merge, target: CellPosition) {
    if (this.getters.isInMerge(target)) {
      return;
    }

    const { sheetId, col, row } = target;
    this.dispatch("ADD_MERGE", {
      sheetId,
      force: true,
      target: [
        {
          left: col,
          top: row,
          right: col + originMerge.right - originMerge.left,
          bottom: row + originMerge.bottom - originMerge.top,
        },
      ],
    });
  }
}
