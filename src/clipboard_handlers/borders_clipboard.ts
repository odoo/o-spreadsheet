import { positionToZone, recomputeZones } from "../helpers";
import {
  Border,
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  Map2D,
  UID,
  Zone,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

type ClipboardContent = {
  cellContent: Map2D<Border>;
};

export class BorderClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  private queuedBordersToAdd: Record<string, Zone[]> = {};

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    if (data.zones.length === 0) {
      return;
    }
    const sheetId = this.getters.getActiveSheetId();
    const { rowsIndexes, columnsIndexes } = data;
    const cellContent = new Map2D<Border>(columnsIndexes.length, rowsIndexes.length);

    for (const [r, row] of rowsIndexes.entries()) {
      for (const [c, col] of columnsIndexes.entries()) {
        const value = this.getters.getCellBorder({ col, row, sheetId });
        if (value !== null) cellContent.set(c, r, value);
      }
    }
    return { cellContent };
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    const sheetId = target.sheetId;
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content);
    } else {
      const { left, top } = zones[0];
      this.pasteZone(sheetId, left, top, content);
    }

    this.executeQueuedChanges(sheetId);
  }

  pasteZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, borders: ClipboardContent) {
    for (const [c, r, originBorders] of borders.cellContent.entries()) {
      const position = { col: col + c, row: row + r, sheetId };
      this.pasteBorder(originBorders, position);
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
