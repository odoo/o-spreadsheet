import {
  compactBorderCell,
  expandBorderCell,
  makeIndexer,
} from "../helpers/clipboard/clipboard_helpers";
import { recomputeZones } from "../helpers/recompute_zones";
import { positionToZone } from "../helpers/zones";
import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
  CompactBorderHandlerData,
} from "../types/clipboard";
import { Border, BorderDescr, CellPosition, HeaderIndex, UID, Zone } from "../types/misc";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

export class BorderClipboardHandler extends AbstractCellClipboardHandler<
  Border | null,
  CompactBorderHandlerData
> {
  private queuedBordersToAdd: Record<string, Zone[]> = {};

  copy(data: ClipboardCellData): CompactBorderHandlerData | undefined {
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
    return this.compact(borders);
  }

  paste(
    target: ClipboardPasteTarget,
    content: (Border | null)[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    const sheetId = target.sheetId;
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    if (!options.isCutOperation) {
      this.pasteFromCopy(sheetId, zones, content, options, positions);
    } else {
      const { left, top } = zones[0];
      this.pasteZone(sheetId, left, top, content, options, positions);
    }

    this.executeQueuedChanges(sheetId);
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    borders: (Border | null)[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
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

  protected compact(data: (Border | null)[][]): CompactBorderHandlerData {
    const rows = data.length;
    const cols = data[0]?.length ?? 0;
    const { index: descrIndex, table: descrTable } = makeIndexer<BorderDescr>(
      (d) => `${d.style}|${d.color}`
    );
    const items: CompactBorderHandlerData["items"] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < (data[r]?.length ?? 0); c++) {
        const border = data[r][c];
        if (!border) {
          continue;
        }
        const v = compactBorderCell(border, descrIndex);
        if (Object.keys(v).length === 0) {
          continue;
        }
        items.push({ r, c, v });
      }
    }
    return { rows, cols, descrTable, items };
  }

  expand(data: unknown): (Border | null)[][] {
    if (Array.isArray(data)) {
      return data as (Border | null)[][];
    }
    const compact = data as CompactBorderHandlerData;
    const { rows, cols, descrTable, items } = compact;
    const result: (Border | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null)
    );
    for (const { r, c, v } of items) {
      result[r][c] = expandBorderCell(v, descrTable);
    }
    return result;
  }
}
