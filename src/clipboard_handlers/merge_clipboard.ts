import { zoneToDimension } from "../helpers";
import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  Merge,
  UID,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

type ClipboardMerge = Merge | undefined;

interface ClipboardContent {
  sheetId: UID;
  merges: ClipboardMerge[][];
}

export class MergeClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  ClipboardMerge
> {
  copy(data: ClipboardCellData): ClipboardContent {
    const sheetId = this.getters.getActiveSheetId();

    const { rowsIndexes, columnsIndexes, zones } = data;
    if (!zones || !rowsIndexes.length || !columnsIndexes.length) {
      return { merges: [[]], sheetId };
    }

    const copiedMerges: ClipboardMerge[][] = [];
    for (let row of rowsIndexes) {
      let mergesInRow: ClipboardMerge[] = [];
      copiedMerges.push(mergesInRow);
      for (let col of columnsIndexes) {
        const position = { col, row, sheetId };
        const merge = this.getters.getMerge(position);
        const mainCell = this.getters.getMainCellPosition(position);
        if (merge && mainCell.col === col && mainCell.row === row) {
          mergesInRow.push(merge);
        } else {
          mergesInRow.push(undefined);
        }
      }
    }

    return { sheetId, merges: copiedMerges };
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    if (!target.zones?.length || !content.merges) {
      return;
    }
    const sheetId = this.getters.getActiveSheetId();
    if (options.isCutOperation) {
      for (const merge of content.merges.flat()) {
        if (merge) {
          this.dispatch("REMOVE_MERGE", {
            sheetId: content.sheetId,
            target: [merge],
          });
        }
      }
    }
    this.pasteFromCopy(sheetId, target.zones, content.merges, options);
  }

  pasteZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, merges: Merge[][]) {
    for (let r = 0; r < merges.length; r++) {
      const rowMerges = merges[r];
      for (let c = 0; c < rowMerges.length; c++) {
        const merge = rowMerges[c];
        if (!merge) {
          continue;
        }
        const dimensions = zoneToDimension(merge);
        this.dispatch("ADD_MERGE", {
          sheetId,
          force: true,
          target: [
            {
              left: col + c,
              top: row + r,
              right: col + c + dimensions.numberOfCols - 1,
              bottom: row + r + dimensions.numberOfRows - 1,
            },
          ],
        });
      }
    }
  }
}
