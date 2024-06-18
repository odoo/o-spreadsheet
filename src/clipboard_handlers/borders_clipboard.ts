import {
  Border,
  CellPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  UID,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

type ClipboardContent = {
  borders: (Border | null)[][];
};

export class BorderClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  Border | null
> {
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
    if (!("zones" in target) || !target.zones.length) {
      return;
    }
    const zones = target.zones;
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content.borders);
    } else {
      const { left, top } = zones[0];
      this.pasteZone(sheetId, left, top, content.borders);
    }
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
    this.dispatch("SET_BORDER", { ...target, border });
  }
}
