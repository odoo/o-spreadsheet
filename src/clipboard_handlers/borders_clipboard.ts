import { splitZoneForPaste } from "../helpers/clipboard/clipboard_helpers";
import { getItemId } from "../helpers/data_normalization";
import { groupConsecutive, range } from "../helpers/misc";
import { recomputeZones } from "../helpers/recompute_zones";
import { positionToZone } from "../helpers/zones";
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

function toDescr(
  border: BorderDescrInternal | undefined,
  undefinedIf?: "external" | "internal"
): BorderDescr | undefined | null {
  if (border?.style === "empty") {
    return null;
  }
  if (!border || border.internal === undefinedIf) {
    return undefined;
  }
  return { color: border.color, style: border.style };
}

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
        for (const pasteZone of splitZoneForPaste(zone, content.width, content.height)) {
          this.pasteContent(sheetId, pasteZone, content.content);
        }
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
      // Sheet default
      this.dispatch("SET_BORDERS_ON_TARGET", {
        border: {
          left: toDescr(content.defaultLeft.sheetDefault),
          top: toDescr(content.defaultTop.sheetDefault),
        },
        sheetId,
        target: [{ left, top, right, bottom }],
      });
      // Col default
      for (const col of range(0, content.width)) {
        const borderLeft = toDescr(content.defaultLeft.colDefault?.[col], "external");
        const borderRight = toDescr(content.defaultLeft.colDefault?.[col + 1], "internal");
        const borderTop = toDescr(content.defaultTop.colDefault?.[col], "external");
        const borderBottom = toDescr(content.defaultTop.colDefault?.[col], "internal");
        if (
          borderLeft !== undefined ||
          borderRight !== undefined ||
          borderTop !== undefined ||
          borderBottom !== undefined
        ) {
          this.dispatch("SET_BORDERS_ON_TARGET", {
            border: {
              left: borderLeft,
              right: borderRight,
              top: borderTop,
              bottom: borderBottom,
            },
            sheetId,
            target: [{ left: left + col, right: left + col, top, bottom }],
          });
        }
      }
      // Row default
      for (const row of range(0, content.height)) {
        const borderLeft = toDescr(content.defaultLeft.rowDefault?.[row], "external");
        const borderRight = toDescr(content.defaultLeft.rowDefault?.[row], "internal");
        const borderTop = toDescr(content.defaultTop.rowDefault?.[row], "external");
        const borderBottom = toDescr(content.defaultTop.rowDefault?.[row + 1], "internal");
        if (
          borderLeft !== undefined ||
          borderRight !== undefined ||
          borderTop !== undefined ||
          borderBottom !== undefined
        ) {
          this.dispatch("SET_BORDERS_ON_TARGET", {
            border: {
              left: borderLeft,
              right: borderRight,
              top: borderTop,
              bottom: borderBottom,
            },
            sheetId,
            target: [{ left, right, top: top + row, bottom: top + row }],
          });
        }
      }

      const cellBorders: Record<number, Record<number, BorderOrNull>> = {};
      function set(col: number, row: number, side: keyof Border, border: BorderDescrInternal) {
        cellBorders[col] ??= {};
        cellBorders[col][row] ??= {};
        cellBorders[col][row][side] = toDescr(border);
      }
      // Cells
      for (const [colIndex, column] of Object.entries(content.bordersLeft)) {
        if (!column) {
          continue;
        }
        const col = parseInt(colIndex) + left;
        for (const [rowIndex, border] of Object.entries(column)) {
          if (!border) {
            continue;
          }
          const row = parseInt(rowIndex) + top;
          if (border?.internal === "internal" || border.style === "empty") {
            set(col, row, "left", border);
          } else if (border?.internal === "external") {
            set(col - 1, row, "right", border);
          } else {
            set(col, row, "left", border);
            set(col - 1, row, "right", border);
          }
        }
      }
      for (const [colIndex, column] of Object.entries(content.bordersTop)) {
        if (!column) {
          continue;
        }
        const col = parseInt(colIndex) + left;
        for (const [rowIndex, border] of Object.entries(column)) {
          if (!border) {
            continue;
          }
          const row = parseInt(rowIndex) + top;
          if (border?.internal === "internal" || border.style === "empty") {
            set(col, row, "top", border);
          } else if (border?.internal === "external") {
            set(col, row - 1, "bottom", border);
          } else {
            set(col, row, "top", border);
            set(col, row - 1, "bottom", border);
          }
        }
      }
      const borders: { [borderId: number]: Border } = {};
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
}
