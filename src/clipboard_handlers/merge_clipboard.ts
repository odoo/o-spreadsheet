import { getPasteZones } from "../helpers/clipboard/clipboard_helpers";
import {
  CellPosition,
  ClipboardCell,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  HeaderIndex,
  UID,
  Zone,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

interface ClipboardContent {
  merges: Merge[];
}

export class MergeClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  ClipboardCell
> {
  isPasteAllowed(sheetId: UID, target: Zone[], content: ClipboardContent): CommandResult {
    if (!("cells" in content)) {
      return CommandResult.Success;
    }
    const clipboardHeight = content.cells.length;
    const clipboardWidth = content.cells[0].length;
    for (const zone of getPasteZones(target, content.cells)) {
      if (this.getters.doesIntersectMerge(sheetId, zone)) {
        if (
          target.length > 1 ||
          !this.getters.isSingleCellOrMerge(sheetId, target[0]) ||
          clipboardHeight * clipboardWidth !== 1
        ) {
          return CommandResult.WillRemoveExistingMerge;
        }
      }
    }
    return CommandResult.Success;
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    if (!("cells" in content) || options?.isCutOperation) {
      return;
    }
    const sheetId = this.getters.getActiveSheetId();
    this.pasteFromCopy(sheetId, target.zones, content.cells, options);
  }

  pasteZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, cells: ClipboardCell[][]) {
    for (const [r, rowCells] of cells.entries()) {
      for (const [c, origin] of rowCells.entries()) {
        if (!origin.position) {
          continue;
        }
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteMergeIfExist(origin.position, position);
      }
    }
  }

  /**
   * If the origin position given is the top left of a merge, merge the target
   * position.
   */
  private pasteMergeIfExist(origin: CellPosition, target: CellPosition) {
    let { sheetId, col, row } = origin;

    const { col: mainCellColOrigin, row: mainCellRowOrigin } =
      this.getters.getMainCellPosition(origin);
    if (mainCellColOrigin === col && mainCellRowOrigin === row) {
      const merge = this.getters.getMerge(origin);
      if (!merge) {
        return;
      }
      ({ sheetId, col, row } = target);
      this.dispatch("ADD_MERGE", {
        sheetId,
        force: true,
        target: [
          {
            left: col,
            top: row,
            right: col + merge.right - merge.left,
            bottom: row + merge.bottom - merge.top,
          },
        ],
      });
    }
  }
}
