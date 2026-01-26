import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { ClipboardCellData, ClipboardOptions, ClipboardPasteTarget, UID, Zone } from "../types";

interface ClipboardContent {
  zones: Zone[];
  sheetId: UID;
  cellContent: { height: 0; width: 0 };
}

export class ReferenceClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  copy(data: ClipboardCellData): ClipboardContent {
    return {
      zones: data.clippedZones,
      sheetId: data.sheetId,
      cellContent: { height: 0, width: 0 },
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
