import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { columnRowIndexesToZones } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  Merge,
  UID,
  Zone,
} from "../types";

interface ClipboardContent {
  sheetId: UID;
  cellContent: { width: number; height: number };
  merges: Merge[];
  newMerges: Zone[];
}

export class MergeClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const newMerges: Zone[] = [];
    const merges: Merge[] = [];

    for (const [zone, colsBefore, rowsBefore] of columnRowIndexesToZones(
      data.columnsIndexes,
      data.rowsIndexes
    )) {
      for (const merge of this.getters.getMergesInZone(sheetId, zone)) {
        newMerges.push({
          left: merge.left - zone.left + colsBefore,
          right: merge.right && merge.right - zone.left + colsBefore,
          top: merge.top - zone.top + rowsBefore,
          bottom: merge.bottom && merge.bottom - zone.top + rowsBefore,
        });
        merges.push(merge);
      }
    }

    return {
      sheetId,
      newMerges,
      merges,
      cellContent: { width: data.columnsIndexes.length, height: data.rowsIndexes.length },
    };
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    if (options.isCutOperation) {
      this.dispatch("REMOVE_MERGE", { sheetId: content.sheetId, target: content.merges });
    }
    this.pasteFromCopy(target.sheetId, target.zones, content, options);
  }

  pasteZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, content: ClipboardContent) {
    const newMerges: Zone[] = [];
    for (const merge of content.newMerges) {
      const position = { col: col + merge.left, row: row + merge.top, sheetId };
      if (this.getters.isInMerge(position)) {
        return;
      }
      newMerges.push({
        left: col + merge.left,
        right: col + merge.right,
        top: row + merge.top,
        bottom: row + merge.bottom,
      });
    }
    this.dispatch("ADD_MERGE", { sheetId, force: true, target: newMerges });
  }
}
