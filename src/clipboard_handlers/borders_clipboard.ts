import { positionToZone, recomputeZones } from "../helpers";
import { PositionMap } from "../helpers/cells/position_map";
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
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

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
    const bordersPosition = new PositionMap<Border>();
    data.zones.map((zone) =>
      bordersPosition.setMultiple(this.getters.getCellBordersInZone(sheetId, zone).entries())
    );

    for (const row of rowsIndexes) {
      const bordersInRow: (Border | null)[] = [];
      for (const col of columnsIndexes) {
        const position = { col, row, sheetId };
        bordersInRow.push(bordersPosition.get(position) ?? null);
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
