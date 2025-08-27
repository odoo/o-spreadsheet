import { splitZoneForPaste } from "../helpers/clipboard/clipboard_helpers";
import { groupConsecutive } from "../helpers/misc";
import { ZoneBorder } from "../plugins/core";
import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  UID,
} from "../types";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

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
          ...this.getters.getBorders(sheetId, zone).map((zb) => {
            return {
              zone: {
                left: zb.zone.left - zone.left + colsBefore,
                right: zb.zone.right && zb.zone.right - zone.left + colsBefore,
                top: zb.zone.top - zone.top + rowsBefore,
                bottom: zb.zone.bottom && zb.zone.bottom - zone.top + rowsBefore,
              },
              style: zb.style,
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
      this.dispatch("SET_ZONE_BORDERDATA", { sheetId, target: [zone], border: border.style });
    }
  }
}
