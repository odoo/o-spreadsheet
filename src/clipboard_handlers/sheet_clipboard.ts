import { UID, Zone } from "@odoo/o-spreadsheet-engine";
import { doesAnyZoneCrossFrozenPane } from "../helpers";
import { getPasteZones } from "../helpers/clipboard/clipboard_helpers";
import { ClipboardOptions, CommandResult } from "../types";
type ClipboardContent = {
  cells: any[][];
  zones: Zone[];
  sheetId: UID;
};

export class SheetClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent, any> {
  isPasteAllowed(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options: ClipboardOptions
  ): CommandResult {
    if (!("cells" in content)) {
      return CommandResult.Success;
    }
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    const pasteZones = getPasteZones(target, content.cells);
    if (doesAnyZoneCrossFrozenPane(pasteZones, xSplit, ySplit)) {
      return CommandResult.FrozenPaneOverlap;
    }
    return CommandResult.Success;
  }
}
