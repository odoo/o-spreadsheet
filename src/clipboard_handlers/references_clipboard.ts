import { UID, Zone } from "@odoo/o-spreadsheet-engine";
import { ClipboardCellData, ClipboardOptions, ClipboardPasteTarget } from "../types";
interface ClipboardContent {
  zones: Zone[];
  sheetId: UID;
}

export class ReferenceClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent, {}> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    return {
      zones: data.clippedZones,
      sheetId: data.sheetId,
    };
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    if (options.isCutOperation) {
      const selection = target.zones[0];
      this.dispatch("MOVE_RANGES", {
        target: content.zones,
        sheetId: content.sheetId,
        sheetName: this.getters.getSheetName(content.sheetId),
        targetSheetId: target.sheetId,
        col: selection.left,
        row: selection.top,
      });
    }
  }
}
