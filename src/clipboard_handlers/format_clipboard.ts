import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import {
  columnRowIndexesToZones,
  splitZoneForPaste,
} from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { ZoneFormat } from "@odoo/o-spreadsheet-engine/plugins/core/format";
import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  UID,
} from "../types";

type ClipboardContent = {
  formats: ZoneFormat[];
  cellContent: { width: number; height: number };
};

export class FormatClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    if (data.zones.length === 0) {
      return;
    }
    const formats: ZoneFormat[] = [];
    for (const [zone, colsBefore, rowsBefore] of columnRowIndexesToZones(
      data.columnsIndexes,
      data.rowsIndexes
    )) {
      formats.push(
        ...this.getters.getZoneFormats(sheetId, zone).map((zb) => {
          return {
            zone: {
              left: zb.zone.left - zone.left + colsBefore,
              right: zb.zone.right && zb.zone.right - zone.left + colsBefore,
              top: zb.zone.top - zone.top + rowsBefore,
              bottom: zb.zone.bottom && zb.zone.bottom - zone.top + rowsBefore,
            },
            format: zb.format,
          };
        })
      );
    }
    return {
      formats,
      cellContent: { width: data.columnsIndexes.length, height: data.rowsIndexes.length },
    };
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    const sheetId = target.sheetId;
    if (options.pasteOption === "asValue") {
      return;
    }
    const zones = target.zones;
    if (!options.isCutOperation) {
      for (const zone of zones) {
        for (const pasteZone of splitZoneForPaste(
          zone,
          content.cellContent.width,
          content.cellContent.height
        )) {
          this.pasteFormatZone(sheetId, pasteZone.left, pasteZone.top, content.formats);
        }
      }
    } else {
      const { left, top } = zones[0];
      this.pasteFormatZone(sheetId, left, top, content.formats);
    }
  }

  pasteFormatZone(sheetId: UID, col: HeaderIndex, row: HeaderIndex, formats: ZoneFormat[]) {
    for (const zoneFormat of formats) {
      const zone = {
        left: zoneFormat.zone.left + col,
        right: (zoneFormat.zone.right && zoneFormat.zone.right + col) || zoneFormat.zone.left + col,
        top: zoneFormat.zone.top + row,
        bottom:
          (zoneFormat.zone.bottom && zoneFormat.zone.bottom + row) || zoneFormat.zone.top + row,
      };
      this.dispatch("SET_FORMATTING", { sheetId, target: [zone], format: zoneFormat.format });
    }
  }
}
