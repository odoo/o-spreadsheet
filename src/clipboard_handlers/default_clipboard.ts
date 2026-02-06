import {
  defaultDict,
  Format,
  HeaderIndex,
  isObjectEmpty,
  Style,
  UID,
  Zone,
} from "@odoo/o-spreadsheet-engine";
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
      format: {} as defaultValue<Format>,
      width: data.columnsIndexes.length,
      height: data.rowsIndexes.length,
      sheetId: data.sheetId,
      zones: data.clippedZones,
    };
    content.format = {
      sheetDefault: this.getters.getDefaultFormat(data.sheetId, "SHEET", undefined) ?? "",
      colDefault: [],
      rowDefault: [],
    };
    let colIndex = 0;
    for (const col of data.columnsIndexes) {
      const value = this.getters.getDefaultFormat(data.sheetId, "COL", col);
      if (value && content.format.colDefault) {
        content.format.colDefault[colIndex] = value;
      }
      colIndex++;
    }
    let rowIndex = 0;
    for (const row of data.rowsIndexes) {
      const value = this.getters.getDefaultFormat(data.sheetId, "ROW", row);
      if (value && content.format.rowDefault) {
        content.format.rowDefault[rowIndex] = value;
      }
      rowIndex++;
    }
    for (const key in DEFAULT_STYLE) {
      content.style[key] = {
        sheetDefault:
          this.getters.getDefaultStyle(data.sheetId, key as keyof Style, "SHEET", undefined) ??
          DEFAULT_STYLE[key],
        colDefault: {},
        rowDefault: {},
      };
      let colIndex = 0;
      for (const col of data.columnsIndexes) {
        const value = this.getters.getDefaultStyle(data.sheetId, key as keyof Style, "COL", col);
        if (value !== undefined) {
          content.style[key].colDefault[colIndex] = value;
        }
        colIndex++;
      }
      let rowIndex = 0;
      for (const row of data.rowsIndexes) {
        const value = this.getters.getDefaultStyle(data.sheetId, key as keyof Style, "ROW", row);
        if (value !== undefined) {
          content.style[key].rowDefault[rowIndex] = value;
        }
        rowIndex++;
      }
    }
    return content;
  }

  clearStyleFormat(sheetId: UID, zone: Zone) {
    this.dispatch("SET_FORMATTING", { sheetId, target: [zone], format: "" });
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
          this.pasteFormat(
            sheetId,
            pasteZone.left,
            pasteZone.top,
            content.width,
            content.height,
            content.format
          );
        }
      }
    } else {
      this.clearClippedZones(content);
      const { left, top } = zones[0];
      this.pasteStyle(sheetId, left, top, content.width, content.height, content.style);
      this.pasteFormat(sheetId, left, top, content.width, content.height, content.format);
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
    const updateCells = defaultDict<Style>({});
    const zones: Record<string, [Zone, number]> = {};
    let formatPriority = 0;

    function setFormatting(zone: Zone, style: Style) {
      const zoneStr = `${zone.left}:${zone.right}:${zone.top}:${zone.bottom}`;
      zones[zoneStr] = [zone, formatPriority++];
      updateCells.set(zoneStr, { ...updateCells.get(zoneStr), ...style });
    }

    setFormatting(
      { left: col, right: col + width - 1, top: row, bottom: row + height - 1 },
      DEFAULT_STYLE
    );

    for (const key in defaultValues) {
      // Sheet format
      setFormatting(
        { left: col, right: col + width - 1, top: row, bottom: row + height - 1 },
        { [key]: defaultValues[key].sheetDefault }
      );
    }
    for (const key in defaultValues) {
      // Col Formats
      for (const colDeltaIndex in defaultValues[key].colDefault) {
        const colDelta = parseInt(colDeltaIndex);
        setFormatting(
          { left: col + colDelta, right: col + colDelta, top: row, bottom: row + height - 1 },
          { [key]: defaultValues[key].colDefault[colDeltaIndex] }
        );
      }
    }
    for (const key in defaultValues) {
      // Row Formats
      for (const rowDeltaIdx in defaultValues[key].rowDefault) {
        const rowDelta = parseInt(rowDeltaIdx);
        setFormatting(
          { left: col, right: col + width - 1, top: row + rowDelta, bottom: row + rowDelta },
          { [key]: defaultValues[key].rowDefault[rowDeltaIdx] }
        );
      }
    }
    const commands: [number, Zone, Style][] = [];
    for (const [zoneStr, [zone, priority]] of Object.entries(zones)) {
      const style = updateCells.get(zoneStr);
      if (isObjectEmpty(style)) {
        continue;
      }
      commands.push([priority, zone, style]);
    }
    commands.sort((a, b) => a[0] - b[0]);
    for (const [_, zone, style] of commands) {
      this.dispatch("SET_FORMATTING", { sheetId, target: [zone], style });
    }
  }

  pasteFormat(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    width: number,
    height: number,
    defaultFormat: defaultValue<Format>
  ) {
    const updateCells: Record<string, Format | undefined> = {};
    const zones: Record<string, [Zone, number]> = {};
    let formatPriority = 0;

    function setFormatting(zone: Zone, format: Format | undefined) {
      const zoneStr = `${zone.left}:${zone.right}:${zone.top}:${zone.bottom}`;
      zones[zoneStr] = [zone, formatPriority++];
      updateCells[zoneStr] = format;
    }

    setFormatting(
      { left: col, right: col + width - 1, top: row, bottom: row + height - 1 },
      defaultFormat.sheetDefault ?? ""
    );
    // Col Formats
    for (const colDeltaIndex in defaultFormat.colDefault) {
      const colDelta = parseInt(colDeltaIndex);
      setFormatting(
        { left: col + colDelta, right: col + colDelta, top: row, bottom: row + height - 1 },
        defaultFormat.colDefault[colDeltaIndex]
      );
    }
    // Row Formats
    for (const rowDeltaIdx in defaultFormat.rowDefault) {
      const rowDelta = parseInt(rowDeltaIdx);
      setFormatting(
        { left: col, right: col + width - 1, top: row + rowDelta, bottom: row + rowDelta },
        defaultFormat.rowDefault[rowDeltaIdx]
      );
    }
    const commands: [number, Zone, Format | undefined][] = [];
    for (const [zoneStr, [zone, priority]] of Object.entries(zones)) {
      const format = updateCells[zoneStr];
      commands.push([priority, zone, format]);
    }
    commands.sort((a, b) => a[0] - b[0]);
    for (const [_, zone, format] of commands) {
      this.dispatch("SET_FORMATTING", { sheetId, target: [zone], format });
    }
  }
}
