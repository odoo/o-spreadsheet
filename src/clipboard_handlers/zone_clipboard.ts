import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
} from "../types/clipboard";
import { Zone } from "../types/misc";
import { ClipboardHandler } from "./abstract_clipboard_handler";

export class ZoneClipboardHandler extends ClipboardHandler<Zone[]> {
  copy(data: ClipboardCellData): Zone[] | undefined {
    return data.clippedZones;
  }

  paste(
    target: ClipboardPasteTarget,
    content: Zone[],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    const sheetId = positions.sheetId;
    if (options.isCutOperation && sheetId) {
      const selection = target.zones[0];
      this.dispatch("MOVE_RANGES", {
        target: content,
        sheetId,
        sheetName: this.getters.getSheetName(sheetId),
        targetSheetId: target.sheetId,
        col: selection.left,
        row: selection.top,
      });
    }
  }
}
