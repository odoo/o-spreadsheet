import { getPasteZones } from "../helpers/clipboard/clipboard_helpers";
import { recomputeZones } from "../helpers/recompute_zones";
import {
  ClipboardCellData,
  ClipboardCopyOptions,
  ClipboardOptions,
  ClipboardPositions,
} from "../types/clipboard";
import { CellPosition, HeaderIndex, UID, Zone } from "../types/misc";
import { ClipboardHandler } from "./abstract_clipboard_handler";

export class AbstractCellClipboardHandler<T, T1> extends ClipboardHandler<(T | null)[][]> {
  copy(
    data: ClipboardCellData,
    isCutOperation: boolean,
    mode: ClipboardCopyOptions = "copyPaste"
  ): T1 | undefined {
    return;
  }

  pasteFromCopy(
    sheetId: UID,
    target: Zone[],
    content: (T | null)[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    if (target.length === 1) {
      // in this specific case, due to the isPasteAllowed function:
      // state.cells can contain several cells.
      // So if the target zone is larger than the copied zone,
      // we duplicate each cell as many times as possible to fill the zone.
      for (const zone of getPasteZones(target, content)) {
        this.pasteZone(sheetId, zone.left, zone.top, content, options, positions);
      }
    } else {
      // in this case, due to the isPasteAllowed function: state.cells contains
      // only one cell
      for (const zone of recomputeZones(target)) {
        for (let col = zone.left; col <= zone.right; col++) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            this.pasteZone(sheetId, col, row, content, options, positions);
          }
        }
      }
    }
  }

  protected pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    data: (T | null)[][],
    clipboardOptions: ClipboardOptions,
    clipboardPositions: ClipboardPositions
  ) {}

  protected getOriginPosition(r: number, c: number, positions: ClipboardPositions): CellPosition {
    return {
      col: positions.columnsIndexes?.[c] ?? positions.zones[0].left + c,
      row: positions.rowsIndexes?.[r] ?? positions.zones[0].top + r,
      sheetId: positions.sheetId,
    };
  }

  protected compact(data: T[][]): T1 {
    return data as T1;
  }
  expand(data: T1): T[][] {
    return data as T[][];
  }
}
