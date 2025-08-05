import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import {
  columnRowIndexesToZones,
  splitZoneForPaste,
} from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { ZoneStyle } from "@odoo/o-spreadsheet-engine/plugins/core/style";
import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  UID,
} from "../types";

type ClipboardContent = {
  styles: ZoneStyle[];
  cellContent: { width: number; height: number };
};

export class StyleClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    if (data.zones.length === 0) {
      return;
    }
    const styles: ZoneStyle[] = [];
    for (const [zone, colsBefore, rowsBefore] of columnRowIndexesToZones(
      data.columnsIndexes,
      data.rowsIndexes
    )) {
      styles.push(
        ...this.getters.getZoneStyles(sheetId, zone).map((zb) => {
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
    }
    return {
      styles,
      cellContent: { width: data.columnsIndexes.length, height: data.rowsIndexes.length },
    };
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    const sheetId = target.sheetId;
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    if (content.styles.length === 0) {
      this.dispatch("SET_FORMATTING", { sheetId, target: zones, style: null });
    } else if (!options.isCutOperation) {
      this.dispatch("SET_FORMATTING", { sheetId, target: zones, style: null });
      for (const zone of zones) {
        for (const pasteZone of splitZoneForPaste(
          zone,
          content.cellContent.width,
          content.cellContent.height
        )) {
          this.pasteStyleZone(sheetId, pasteZone.left, pasteZone.top, content.styles);
        }
      }
    } else {
      const { left, top } = zones[0];
      this.dispatch("SET_FORMATTING", { sheetId, target: [zones[0]], style: null });
      this.pasteStyleZone(sheetId, left, top, content.styles);
    }
  }

  pasteStyleZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, styles: ZoneStyle[]) {
    for (const zoneStyle of styles) {
      const zone = {
        left: zoneStyle.zone.left + col,
        right: (zoneStyle.zone.right && zoneStyle.zone.right + col) || zoneStyle.zone.left + col,
        top: zoneStyle.zone.top + row,
        bottom: (zoneStyle.zone.bottom && zoneStyle.zone.bottom + row) || zoneStyle.zone.top + row,
      };
      this.dispatch("SET_FORMATTING", { sheetId, target: [zone], style: zoneStyle.style });
    }
  }
}
