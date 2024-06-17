import {
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  Maybe,
  Merge,
  UID,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

interface ClipboardContent {
  merges: Maybe<Merge>[][];
}

export class MergeClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  Maybe<Merge>
> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    if (!data.zones.length) {
      return;
    }

    const sheetId = this.getters.getActiveSheetId();
    const { rowsIndexes, columnsIndexes } = data;
    const merges: Maybe<Merge>[][] = [];

    for (const row of rowsIndexes) {
      const mergesInRow: Maybe<Merge>[] = [];
      for (const col of columnsIndexes) {
        const position = { col, row, sheetId };
        mergesInRow.push(this.getters.getMerge(position));
      }
      merges.push(mergesInRow);
    }
    return { merges };
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    if (options?.isCutOperation || !("zones" in target) || !target.zones.length) {
      return;
    }
    this.pasteFromCopy(target.sheetId, target.zones, content.merges, options);
  }

  pasteZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, merges: Maybe<Merge>[][]) {
    for (const [r, rowMerges] of merges.entries()) {
      for (const [c, originMerge] of rowMerges.entries()) {
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteMerge(originMerge, position);
      }
    }
  }

  private pasteMerge(originMerge: Maybe<Merge>, target: CellPosition) {
    if (!originMerge) {
      return;
    }

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
