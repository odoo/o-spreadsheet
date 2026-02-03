import { getPasteZones } from "../helpers/clipboard/clipboard_helpers";
import { recomputeZones } from "../helpers/recompute_zones";
import { ClipboardCellData, ClipboardCopyOptions, ClipboardOptions } from "../types/clipboard";
import { HeaderIndex, UID, Zone } from "../types/misc";
import { ClipboardHandler } from "./abstract_clipboard_handler";

export class AbstractCellClipboardHandler<T, T1> extends ClipboardHandler<T> {
  copy(
    data: ClipboardCellData,
    isCutOperation: boolean,
    mode: ClipboardCopyOptions = "copyPaste"
  ): T | undefined {
    return;
  }

  pasteFromCopy(sheetId: UID, target: Zone[], content: T1[][], options?: ClipboardOptions) {
    if (target.length === 1) {
      // in this specific case, due to the isPasteAllowed function:
      // state.cells can contain several cells.
      // So if the target zone is larger than the copied zone,
      // we duplicate each cell as many times as possible to fill the zone.
      for (const zone of getPasteZones(target, content)) {
        this.pasteZone(sheetId, zone.left, zone.top, content, options);
      }
    } else {
      // in this case, due to the isPasteAllowed function: state.cells contains
      // only one cell
      for (const zone of recomputeZones(target)) {
        for (let col = zone.left; col <= zone.right; col++) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            this.pasteZone(sheetId, col, row, content, options);
          }
        }
      }
    }
  }

  protected pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    data: T1[][],
    clipboardOptions?: ClipboardOptions
  ) {}
}
