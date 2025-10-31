import { groupConsecutive } from "@odoo/o-spreadsheet-engine";
import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { splitZoneForPaste } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { ZoneFormat, ZoneStyle } from "@odoo/o-spreadsheet-engine/plugins/core/style";
import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  HeaderIndex,
  UID,
} from "../types";

type ClipboardContent = {
  styles: ZoneStyle[];
  formats: ZoneFormat[];
  width: number;
  height: number;
};

export class StyleClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  ZoneStyle
> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    if (data.zones.length === 0) {
      return;
    }
    const styles: ZoneStyle[] = [];
    const formats: ZoneFormat[] = [];
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
        rowsBefore += rows.length;
      }
      colsBefore += cols.length;
    }
    return { styles, formats, width: data.columnsIndexes.length, height: data.rowsIndexes.length };
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
          this.pasteZoneStyleFormat(
            sheetId,
            pasteZone.left,
            pasteZone.top,
            content.styles,
            content.formats
          );
        }
      }
    } else {
      const { left, top } = zones[0];
      this.pasteZoneStyleFormat(sheetId, left, top, content.styles, content.formats);
    }
  }

  pasteZoneStyleFormat(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    styles: ZoneStyle[],
    formats: ZoneFormat[]
  ) {
    for (const zoneStyle of styles) {
      const zone = {
        left: zoneStyle.zone.left + col,
        right: (zoneStyle.zone.right && zoneStyle.zone.right + col) || zoneStyle.zone.left + col,
        top: zoneStyle.zone.top + row,
        bottom: (zoneStyle.zone.bottom && zoneStyle.zone.bottom + row) || zoneStyle.zone.top + row,
      };
      this.dispatch("SET_FORMATTING", { sheetId, target: [zone], style: zoneStyle.style });
    }
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
