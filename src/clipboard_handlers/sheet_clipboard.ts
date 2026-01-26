import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { getPasteZones } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { doesAnyZoneCrossFrozenPane } from "../helpers";
import { ClipboardOptions, CommandResult, Map2D, UID, Zone } from "../types";

type ClipboardContent = {
  cellContent: Map2D<any>;
  zones: Zone[];
  sheetId: UID;
};

export class SheetClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  isPasteAllowed(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options: ClipboardOptions
  ): CommandResult {
    if (!("cellContent" in content)) {
      return CommandResult.Success;
    }
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    const pasteZones = getPasteZones(target, content.cellContent.width, content.cellContent.height);
    if (doesAnyZoneCrossFrozenPane(pasteZones, xSplit, ySplit)) {
      return CommandResult.FrozenPaneOverlap;
    }
    return CommandResult.Success;
  }
}
