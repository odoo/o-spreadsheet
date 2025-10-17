import { deepEquals, groupConsecutive } from "@odoo/o-spreadsheet-engine";
import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { splitZoneForPaste } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { ZoneBorder, ZoneBorderData } from "@odoo/o-spreadsheet-engine/plugins/core/borders";
import {
  BorderDescr,
  BorderPosition,
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  UID,
} from "../types";

type ClipboardContent = {
  borders: ZoneBorder[];
  width: number;
  height: number;
};

export class BorderClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  ZoneBorder
> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    if (data.zones.length === 0) {
      return;
    }
    const borders: ZoneBorder[] = [];
    let colsBefore = 0;
    for (const cols of groupConsecutive(data.columnsIndexes)) {
      let rowsBefore = 0;
      for (const rows of groupConsecutive(data.rowsIndexes)) {
        const zone = {
          left: cols[0],
          right: cols[cols.length - 1],
          top: rows[0],
          bottom: rows[rows.length - 1],
        };
        borders.push(
          ...this.getters.getBorders(sheetId, zone).map(({ zone: borderZone, style }) => {
            return {
              zone: {
                left: borderZone.left - zone.left + colsBefore,
                right: borderZone.right && borderZone.right - zone.left + colsBefore,
                top: borderZone.top - zone.top + rowsBefore,
                bottom: borderZone.bottom && borderZone.bottom - zone.top + rowsBefore,
              },
              style,
            };
          })
        );
        rowsBefore += rows.length;
      }
      colsBefore += cols.length;
    }
    return { borders, width: data.columnsIndexes.length, height: data.rowsIndexes.length };
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
          this.pasteBorderZone(sheetId, pasteZone.left, pasteZone.top, content.borders);
        }
      }
    } else {
      const { left, top } = zones[0];
      this.pasteBorderZone(sheetId, left, top, content.borders);
    }
  }

  pasteBorderZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, borders: ZoneBorder[]) {
    for (const border of borders) {
      const zone = {
        left: border.zone.left + col,
        right: (border.zone.right && border.zone.right + col) || border.zone.left + col,
        top: border.zone.top + row,
        bottom: (border.zone.bottom && border.zone.bottom + row) || border.zone.top + row,
      };
      for (const [position, style] of this.getOptimalBorderCommands(border.style)) {
        if (style)
          this.dispatch("SET_ZONE_BORDERS", {
            sheetId,
            target: [zone],
            border: { position, ...style },
          });
      }
    }
  }

  getOptimalBorderCommands(border: ZoneBorderData): [BorderPosition, BorderDescr | undefined][] {
    const hv = deepEquals(border.horizontal, border.vertical);
    const external = deepEquals(border.left, border.right, border.top, border.bottom);
    if (hv && external && deepEquals(border.horizontal, border.left)) {
      return [["all", border.top]];
    } else if (hv && external) {
      return [
        ["hv", border.horizontal],
        ["external", border.top],
      ];
    } else if (external) {
      return [
        ["h", border.horizontal],
        ["v", border.vertical],
        ["external", border.top],
      ];
    } else if (hv) {
      return [
        ["hv", border.horizontal],
        ["top", border.top],
        ["bottom", border.bottom],
        ["left", border.left],
        ["right", border.right],
      ];
    } else {
      return [
        ["h", border.horizontal],
        ["v", border.vertical],
        ["top", border.top],
        ["bottom", border.bottom],
        ["left", border.left],
        ["right", border.right],
      ];
    }
  }
}
