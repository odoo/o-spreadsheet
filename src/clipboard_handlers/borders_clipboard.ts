<<<<<<< f135c07860d14c28c3002f0aacd7d4d10b229c3f
import { deepEquals, groupConsecutive } from "@odoo/o-spreadsheet-engine";
import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { splitZoneForPaste } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { ZoneBorder, ZoneBorderData } from "@odoo/o-spreadsheet-engine/plugins/core/borders";
||||||| a1801a94ff524e45fe8f7f409e4b80837c7a37b7
import { splitZoneForPaste } from "../helpers/clipboard/clipboard_helpers";
import { deepEquals, groupConsecutive } from "../helpers/misc";
import { ZoneBorder, ZoneBorderData } from "../plugins/core";
=======
import { positionToZone, recomputeZones } from "../helpers";
>>>>>>> 81aa2cdcb3b43f517fb9cbc15c989686107464de
import {
  Border,
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  UID,
  Zone,
} from "../types";

type ClipboardContent = {
  borders: (Border | null)[][];
};

export class BorderClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  Border | null
> {
  private queuedBordersToAdd: Record<string, Zone[]> = {};

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    if (data.zones.length === 0) {
      return;
    }
    const { rowsIndexes, columnsIndexes } = data;
    const borders: (Border | null)[][] = [];

    for (const row of rowsIndexes) {
      const bordersInRow: (Border | null)[] = [];
      for (const col of columnsIndexes) {
        const position = { col, row, sheetId };
        bordersInRow.push(this.getters.getCellBorder(position));
      }
      borders.push(bordersInRow);
    }
    return { borders };
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    const sheetId = target.sheetId;
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content.borders);
    } else {
      const { left, top } = zones[0];
      this.pasteZone(sheetId, left, top, content.borders);
    }

    this.executeQueuedChanges(sheetId);
  }

  pasteZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, borders: (Border | null)[][]) {
    for (const [r, rowBorders] of borders.entries()) {
      for (const [c, originBorders] of rowBorders.entries()) {
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteBorder(originBorders, position);
      }
    }
  }

  /**
   * Paste the border at the given position to the target position
   */
  private pasteBorder(originBorders: Border | null, target: CellPosition) {
    const targetBorders = this.getters.getCellBorder(target);
    const border = {
      ...targetBorders,
      ...originBorders,
    };
    const borderKey = JSON.stringify(border);
    if (!this.queuedBordersToAdd[borderKey]) {
      this.queuedBordersToAdd[borderKey] = [];
    }
    this.queuedBordersToAdd[borderKey].push(positionToZone(target));
  }

  private executeQueuedChanges(pasteSheetTarget: UID) {
    for (const borderKey in this.queuedBordersToAdd) {
      const zones = this.queuedBordersToAdd[borderKey];
      const border = JSON.parse(borderKey) as Border;
      const target = recomputeZones(zones, []);
      this.dispatch("SET_BORDERS_ON_TARGET", { sheetId: pasteSheetTarget, target, border });
    }
    this.queuedBordersToAdd = {};
  }
}
