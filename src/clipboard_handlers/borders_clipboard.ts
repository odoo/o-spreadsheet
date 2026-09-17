import { transpose } from "../helpers/misc";
import { recomputeZones } from "../helpers/recompute_zones";
import { positionToZone } from "../helpers/zones";
import { ClipboardCellData, ClipboardOptions, ClipboardPasteTarget } from "../types/clipboard";
import { Border, CellPosition, HeaderIndex, UID, Zone } from "../types/misc";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

type ClipboardContent = {
  borders: (Border | null)[][];
};

function transposeBorder(border: Border | null): Border | null {
  if (!border) {
    return border;
  }
  return {
    top: border.left,
    left: border.top,
    bottom: border.right,
    right: border.bottom,
  };
}

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
    const shouldPasteBorders =
      !options.pasteOptions?.length || options.pasteOptions.includes("onlyBorders");
    if (!shouldPasteBorders) {
      return;
    }
    const zones = target.zones;
    const borders = options.pasteOptions?.includes("transpose")
      ? transpose(content.borders).map((row) => row.map(transposeBorder))
      : content.borders;
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, borders);
    } else {
      const { left, top } = zones[0];
      this.pasteZone(sheetId, left, top, borders);
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
