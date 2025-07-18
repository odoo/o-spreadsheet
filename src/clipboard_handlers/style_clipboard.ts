import { positionToZone, recomputeZones } from "../helpers";
import { PositionMap } from "../helpers/cells/position_map";
import { StyleAndBorder } from "../plugins/core";
import {
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
  styleAndBorder: (StyleAndBorder | null)[][];
};

export class StyleClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  StyleAndBorder | null
> {
  private queuedStylesToAdd: Record<string, Zone[]> = {};

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    if (data.zones.length === 0) {
      return;
    }
    const { rowsIndexes, columnsIndexes } = data;
    const styleAndBorder: (StyleAndBorder | null)[][] = [];
    const stylesPositions = new PositionMap<StyleAndBorder>();
    data.zones.map((zone) =>
      stylesPositions.setMultiple(this.getters.getCellStyleAndBorderInZone(sheetId, zone).entries())
    );

    for (const row of rowsIndexes) {
      const bordersInRow: (StyleAndBorder | null)[] = [];
      for (const col of columnsIndexes) {
        const position = { col, row, sheetId };
        bordersInRow.push(stylesPositions.get(position) ?? null);
      }
      styleAndBorder.push(bordersInRow);
    }
    return { styleAndBorder };
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    const sheetId = target.sheetId;
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content.styleAndBorder);
    } else {
      const { left, top } = zones[0];
      this.pasteZone(sheetId, left, top, content.styleAndBorder);
    }

    this.executeQueuedChanges(sheetId);
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    styleAndBorder: (StyleAndBorder | null)[][]
  ) {
    for (const [r, rowBorders] of styleAndBorder.entries()) {
      for (const [c, originBorders] of rowBorders.entries()) {
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteStyleAndBorder(originBorders, position);
      }
    }
  }

  /**
   * Paste the border at the given position to the target position
   */
  private pasteStyleAndBorder(pasteStyle: StyleAndBorder | null, target: CellPosition) {
    const styleKey = JSON.stringify(pasteStyle || {});
    if (!this.queuedStylesToAdd[styleKey]) {
      this.queuedStylesToAdd[styleKey] = [];
    }
    this.queuedStylesToAdd[styleKey].push(positionToZone(target));
  }

  private executeQueuedChanges(pasteSheetTarget: UID) {
    for (const styleKey in this.queuedStylesToAdd) {
      const zones = this.queuedStylesToAdd[styleKey];
      const styleAndBorder = JSON.parse(styleKey) as StyleAndBorder;
      const target = recomputeZones(zones, []);
      this.dispatch("SET_FORMATTING", {
        sheetId: pasteSheetTarget,
        target,
        style: styleAndBorder.style || {},
        border: styleAndBorder.border,
        force: true,
      });
    }
    this.queuedStylesToAdd = {};
  }
}
