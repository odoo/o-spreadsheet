import { Format, HeaderIndex, Style, UID, Zone } from "@odoo/o-spreadsheet-engine";
import { AbstractCellClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_cell_clipboard_handler";
import { DEFAULT_STYLE } from "@odoo/o-spreadsheet-engine/constants";
import { splitZoneForPaste } from "@odoo/o-spreadsheet-engine/helpers/clipboard/clipboard_helpers";
import { defaultValue } from "@odoo/o-spreadsheet-engine/plugins/core/default";
import { ClipboardCellData, ClipboardOptions, ClipboardPasteTarget } from "../types";

type ClipboardContent = {
  style: { [J in keyof Style]: defaultValue<Style[J]> | undefined };
  format: defaultValue<Format>;
  width: number;
  height: number;
  zones: Zone[];
  sheetId: UID;
};

export class DefaultClipboardHandler extends AbstractCellClipboardHandler<
  ClipboardContent,
  unknown
> {
  copy(data: ClipboardCellData): ClipboardContent | undefined {
    const content = {
      style: {},
      format: {},
      width: data.columnsIndexes.length,
      height: data.rowsIndexes.length,
      sheetId: data.sheetId,
      zones: data.clippedZones,
    };
    // TODO Format
    for (const key in DEFAULT_STYLE) {
      content.style[key] = {
        sheetDefault: this.getters.getDefaultStyle(
          data.sheetId,
          key as keyof Style,
          "SHEET",
          undefined
        ),
        colDefault: {},
        rowDefault: {},
      };
      let colIndex = 0;
      for (const col of data.columnsIndexes) {
        const value = this.getters.getDefaultStyle(data.sheetId, key as keyof Style, "COL", col);
        if (value) {
          content.style[key].colDefault[colIndex] = value;
        }
        colIndex++;
      }
      let rowIndex = 0;
      for (const row of data.rowsIndexes) {
        const value = this.getters.getDefaultStyle(data.sheetId, key as keyof Style, "ROW", row);
        if (value) {
          content.style[key].rowDefault[rowIndex] = value;
        }
        rowIndex++;
      }
    }
    return content;
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
          this.pasteStyle(
            sheetId,
            pasteZone.left,
            pasteZone.top,
            content.width,
            content.height,
            content.style
          );
        }
      }
    } else {
      this.clearClippedZones(content);
      const { left, top } = zones[0];
      this.pasteStyle(sheetId, left, top, content.width, content.height, content.style);
    }
  }

  /**
   * Clear the clipped zones: remove the cells and clear the formatting
   */
  private clearClippedZones(content: ClipboardContent) {
    this.dispatch("CLEAR_FORMATTING", {
      sheetId: content.sheetId,
      target: content.zones,
    });
  }

  pasteStyle(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    width: number,
    height: number,
    defaultValues: { [J in keyof Style]: defaultValue<Style[J]> | undefined }
  ) {
    this.dispatch("CLEAR_FORMATTING", {
      sheetId: sheetId,
      target: [{ left: col, right: col + width - 1, top: row, bottom: row + height - 1 }],
    });
    for (const key in defaultValues) {
      // Sheet format
      this.dispatch("SET_FORMATTING", {
        sheetId,
        target: [{ left: col, right: col + width - 1, top: row, bottom: row + height - 1 }],
        style: { [key]: defaultValues[key].sheetDefault },
      });
      // Col Formats
      for (const colDeltaIndex in defaultValues[key].colDefault) {
        const colDelta = parseInt(colDeltaIndex);
        this.dispatch("SET_FORMATTING", {
          sheetId,
          target: [
            { left: col + colDelta, right: col + colDelta, top: row, bottom: row + height - 1 },
          ],
          style: { [key]: defaultValues[key].colDefault[colDeltaIndex] },
        });
      }
      // Row Formats
      for (const rowDeltaIdx in defaultValues[key].rowDefault) {
        const rowDelta = parseInt(rowDeltaIdx);
        this.dispatch("SET_FORMATTING", {
          sheetId,
          target: [
            { left: col, right: col + width - 1, top: row + rowDelta, bottom: row + rowDelta },
          ],
          style: { [key]: defaultValues[key].rowDefault[rowDeltaIdx] },
        });
      }
    }
  }
}
