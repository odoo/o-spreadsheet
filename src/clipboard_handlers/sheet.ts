import { getPasteZones } from "../helpers/clipboard/clipboard_helpers";
import { ClipboardOptions, CommandResult, UID, Zone } from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

type ClipboardContent = {
  cells: any[][];
  zones: Zone[];
  sheetId: UID;
  isCutOperation: boolean;
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
    for (const zone of getPasteZones(target, content.cells)) {
      if (
        (zone.left < xSplit && zone.right >= xSplit) ||
        (zone.top < ySplit && zone.bottom >= ySplit)
      ) {
        return CommandResult.FrozenPaneOverlap;
      }
    }
    return CommandResult.Success;
  }
}
