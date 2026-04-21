import { splitZoneForPaste } from "../helpers/clipboard/clipboard_helpers";
import { doesAnyZoneCrossFrozenPane } from "../helpers/zones";
import { ClipboardCellData, ClipboardOptions } from "../types/clipboard";
import { CommandResult } from "../types/commands";
import { UID, Zone } from "../types/misc";
import { ClipboardHandler } from "./abstract_clipboard_handler";

interface CopiedDimensions {
  width: number;
  height: number;
}

export class FrozenPaneClipboardHandler extends ClipboardHandler<CopiedDimensions> {
  copy(data: ClipboardCellData): CopiedDimensions {
    return {
      width: data.columnsIndexes.length,
      height: data.rowsIndexes.length,
    };
  }

  isPasteAllowed(
    sheetId: UID,
    target: Zone[],
    content: CopiedDimensions,
    options: ClipboardOptions
  ): CommandResult {
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    const pasteZones = target.flatMap((t) => splitZoneForPaste(t, content.width, content.height));
    if (doesAnyZoneCrossFrozenPane(pasteZones, xSplit, ySplit)) {
      return CommandResult.FrozenPaneOverlap;
    }
    return CommandResult.Success;
  }
}
