import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { BorderDescrInternal } from "@odoo/o-spreadsheet-engine/plugins/core/borders";
import { defaultValue } from "@odoo/o-spreadsheet-engine/plugins/core/default";
import { groupConsecutive, positionToZone, recomputeZones } from "../helpers";
import {
  Border,
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  Column,
  HeaderIndex,
  UID,
  Zone,
} from "../types";

type ClipboardContent = {
  left: HeaderIndex;
  top: HeaderIndex;
  bordersTop: Column<BorderDescrInternal>[];
  bordersLeft: Column<BorderDescrInternal>[];
  defaultTop: defaultValue<BorderDescrInternal>;
  defaultLeft: defaultValue<BorderDescrInternal>;
}[];

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
    const content: ClipboardContent = [];

    let topIndex = 0;
    for (const row of groupConsecutive(data.rowsIndexes)) {
      const top = row[0];
      const bottom = row[row.length - 1];
      let leftIndex = 0;
      for (const col of groupConsecutive(data.columnsIndexes)) {
        const left = col[0];
        const right = col[col.length - 1];
        content.push({
          left: leftIndex,
          top: topIndex,
          ...this.getters.getBorderClipboardData(sheetId, { left, right, top, bottom }),
        });
        leftIndex += col.length;
      }
      topIndex += row.length;
    }
    return content;
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    const sheetId = target.sheetId;
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    if (!options.isCutOperation) {
      for (const zone of zones) {
        for (const pasteZone of splitZoneForPaste(zone, content.width, content.height)) {
        }
      }
    } else {
      this.clearClippedZones(content);
      const { left, top } = zones[0];
      this.pasteStyle(sheetId, left, top, content.width, content.height, content.style);
      this.pasteFormat(sheetId, left, top, content.width, content.height, content.format);
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
