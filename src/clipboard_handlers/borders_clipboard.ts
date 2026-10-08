import { splitZoneForPaste } from "../helpers/clipboard/clipboard_helpers";
import { getItemId } from "../helpers/data_normalization";
import { groupConsecutive, range } from "../helpers/misc";
import { recomputeZones } from "../helpers/recompute_zones";
import { isInside, positionToZone } from "../helpers/zones";
import { BorderDescrInternal } from "../plugins/core/borders";
import { defaultValue } from "../plugins/core/default";
import { ClipboardCellData, ClipboardOptions, ClipboardPasteTarget } from "../types/clipboard";
import {
  Border,
  BorderDescr,
  BorderOrNull,
  CellPosition,
  Column,
  HeaderIndex,
  UID,
  Zone,
} from "../types/misc";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

/**
 * The side of a copied edge belonging to the cell after it ("internal": its
 * left/top) or before it ("external": its right/bottom). An edge with a value
 * fully describes both sides: the missing one is explicitly empty.
 */
function sideOf(
  border: BorderDescrInternal | undefined,
  side: "internal" | "external"
): BorderDescr | null | undefined {
  if (!border) {
    return undefined;
  }
  if (border.style === "empty" || (border.internal !== side && border.internal !== "both")) {
    return null;
  }
  return { style: border.style, color: border.color };
}

type ClipboardContent = {
  content: {
    left: HeaderIndex;
    top: HeaderIndex;
    bordersTop: Column<BorderDescrInternal>[];
    bordersLeft: Column<BorderDescrInternal>[];
    defaultTop: defaultValue<BorderDescrInternal>;
    defaultLeft: defaultValue<BorderDescrInternal>;
    height: number;
    width: number;
  }[];
  height: number;
  width: number;
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
    const content: ClipboardContent["content"] = [];
    let width = 0;
    let height = 0;

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
          height: row.length,
          width: col.length,
          ...this.getters.getBorderClipboardData(sheetId, { left, right, top, bottom }),
        });
        leftIndex += col.length;
        width = Math.max(leftIndex, width);
      }
      topIndex += row.length;
      height = Math.max(topIndex, height);
    }
    return { content, height, width };
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    const sheetId = target.sheetId;
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    if (!options.isCutOperation) {
      for (const zone of zones) {
        this.pasteContent(sheetId, zone, content.content);
      }
    } else {
      this.pasteContent(sheetId, zones[0], content.content);
    }
  }

  pasteContent(sheetId: UID, zone: Zone, contents: ClipboardContent["content"]) {
    for (const content of contents) {
      const left = zone.left + content.left;
      const right = left + content.width - 1;
      const top = zone.top + content.top;
      const bottom = top + content.height - 1;
      const { defaultLeft, defaultTop } = content;
      // Sheet default
      this.setBorders(sheetId, [{ left, top, right, bottom }], {
        left: sideOf(defaultLeft.sheetDefault, "internal"),
        right: sideOf(defaultLeft.sheetDefault, "external"),
        top: sideOf(defaultTop.sheetDefault, "internal"),
        bottom: sideOf(defaultTop.sheetDefault, "external"),
      });
      // Col default
      for (const col of range(0, content.width)) {
        this.setBorders(sheetId, [{ left: left + col, right: left + col, top, bottom }], {
          left: sideOf(defaultLeft.colDefault?.[col], "internal"),
          right: sideOf(defaultLeft.colDefault?.[col + 1], "external"),
          top: sideOf(defaultTop.colDefault?.[col], "internal"),
          bottom: sideOf(defaultTop.colDefault?.[col], "external"),
        });
      }
      // Row default
      for (const row of range(0, content.height)) {
        this.setBorders(sheetId, [{ left, right, top: top + row, bottom: top + row }], {
          left: sideOf(defaultLeft.rowDefault?.[row], "internal"),
          right: sideOf(defaultLeft.rowDefault?.[row], "external"),
          top: sideOf(defaultTop.rowDefault?.[row], "internal"),
          bottom: sideOf(defaultTop.rowDefault?.[row + 1], "external"),
        });
      }

      const cellBorders: Record<number, Record<number, BorderOrNull>> = {};
      for (const pasteZone of splitZoneForPaste(zone, content.width, content.height)) {
        const left = pasteZone.left + content.left;
        const top = pasteZone.top + content.top;
        const tile = {
          left,
          top,
          right: left + content.width - 1,
          bottom: top + content.height - 1,
        };
        // An edge holds the sides of the cells on each of its side. Only set
        // the sides of the pasted cells.
        const set = (
          col: number,
          row: number,
          side: keyof Border,
          border: BorderDescr | null | undefined
        ) => {
          if (border === undefined || !isInside(col, row, tile)) {
            return;
          }
          cellBorders[col] ??= {};
          cellBorders[col][row] ??= {};
          cellBorders[col][row][side] = border;
        };
        // Cells
        for (const [colIndex, column] of Object.entries(content.bordersLeft)) {
          const col = parseInt(colIndex) + left;
          for (const [rowIndex, border] of Object.entries(column ?? [])) {
            const row = parseInt(rowIndex) + top;
            set(col, row, "left", sideOf(border, "internal"));
            set(col - 1, row, "right", sideOf(border, "external"));
          }
        }
        for (const [colIndex, column] of Object.entries(content.bordersTop)) {
          const col = parseInt(colIndex) + left;
          for (const [rowIndex, border] of Object.entries(column ?? [])) {
            const row = parseInt(rowIndex) + top;
            set(col, row, "top", sideOf(border, "internal"));
            set(col, row - 1, "bottom", sideOf(border, "external"));
          }
        }
      }
      const borders: { [borderId: number]: BorderOrNull } = {};
      const bordersPositions: Record<number, CellPosition[]> = {};

      for (const col of Object.keys(cellBorders)) {
        const colIndex = parseInt(col, 10);
        for (const row of Object.keys(cellBorders[col])) {
          const position = { sheetId, col: colIndex, row: parseInt(row, 10) };
          const borderId = getItemId(cellBorders[col][row], borders);
          bordersPositions[borderId] ??= [];
          bordersPositions[borderId].push(position);
        }
      }

      for (const itemId in bordersPositions) {
        this.dispatch("SET_BORDERS_ON_TARGET", {
          border: borders[itemId],
          sheetId,
          target: recomputeZones(bordersPositions[itemId].map(positionToZone)),
        });
      }
    }
  }

  private setBorders(sheetId: UID, target: Zone[], border: BorderOrNull) {
    if (Object.values(border).some((side) => side !== undefined)) {
      this.dispatch("SET_BORDERS_ON_TARGET", { border, sheetId, target });
    }
  }
}
