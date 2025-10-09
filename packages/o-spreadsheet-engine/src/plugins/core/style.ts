import { Format, Locale } from "../..";
import { deepEquals } from "../../helpers";
import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import { PositionMap } from "../../helpers/cells/position_map";
import { getItemId } from "../../helpers/data_normalization";
import {
  detectDateFormat,
  detectNumberFormat,
  isExcelCompatible,
} from "../../helpers/format/format";
import { getDateTimeFormat } from "../../helpers/locale";
import { recomputeZones } from "../../helpers/recompute_zones";
import { intersection, isInside, positionToZone, toZone, zoneToXc } from "../../helpers/zones";
import { AddColumnsRowsCommand, CoreCommand } from "../../types/commands";
import {
  ApplyRangeChange,
  CellPosition,
  Color,
  Style,
  UID,
  UnboundedZone,
  Zone,
} from "../../types/misc";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

export const DEFAULT_STYLE_NO_ALIGN = {
  verticalAlign: "bottom",
  wrapping: "overflow",
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  fontSize: 10,
  fillColor: "",
  textColor: "",
} as Partial<Style>;

export type ZoneStyle = {
  zone: UnboundedZone;
  style: Style;
};

export type ZoneFormat = {
  zone: UnboundedZone;
  format: Format;
};

interface StylePluginState {
  readonly styles: Record<UID, ZoneStyle[] | undefined>;
  readonly formats: Record<UID, ZoneFormat[] | undefined>;
}

export class StylePlugin extends CorePlugin<StylePluginState> implements StylePluginState {
  static getters = [
    "getCellStyle",
    "getCellStyleInZone",
    "getZoneStyles",
    "getCellFormat",
    "getCellFormatInZone",
    "getZoneFormats",
    "getStyleColors",
  ] as const;

  readonly styles: Record<UID, ZoneStyle[] | undefined> = {};
  readonly formats: Record<UID, ZoneFormat[] | undefined> = {};

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_MERGE":
        for (const zone of cmd.target) {
          this.onMerge(cmd.sheetId, zone);
        }
        break;
      case "SET_FORMATTING":
        if ("style" in cmd) {
          if (cmd.style) {
            this.setStyles(cmd.sheetId, cmd.target, cmd.style);
          } else {
            this.clearStyle(cmd.sheetId, cmd.target);
          }
        }
        if ("format" in cmd) {
          if (cmd.format) {
            this.setFormats(cmd.sheetId, cmd.target, cmd.format);
          } else {
            this.clearFormat(cmd.sheetId, cmd.target);
          }
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearStyle(cmd.sheetId, cmd.target);
        this.clearFormat(cmd.sheetId, cmd.target);
        break;
      case "UPDATE_CELL":
        if ("style" in cmd) {
          if (cmd.style) {
            this.setStyles(cmd.sheetId, [positionToZone(cmd)], cmd.style);
          } else {
            this.clearStyle(cmd.sheetId, [positionToZone(cmd)]);
          }
        }
        if ("format" in cmd) {
          if (cmd.format) {
            this.setFormats(cmd.sheetId, [positionToZone(cmd)], cmd.format);
          } else {
            this.clearFormat(cmd.sheetId, [positionToZone(cmd)]);
          }
        } else if ("content" in cmd && cmd.content && !cmd.content.startsWith("=")) {
          const locale = this.getters.getLocale();
          const parsedValue = parseLiteral(cmd.content, locale);
          const format =
            typeof parsedValue === "number"
              ? detectDateFormat(cmd.content, locale) || detectNumberFormat(cmd.content)
              : undefined;
          if (format) {
            this.setFormats(cmd.sheetId, [positionToZone(cmd)], format);
          }
        }
        break;
      case "ADD_COLUMNS_ROWS":
        this.handleAddColRow(cmd);
        break;
      case "CLEAR_CELL":
        this.clearStyle(cmd.sheetId, [positionToZone(cmd)]);
        break;
      case "CLEAR_CELLS":
        this.clearStyle(cmd.sheetId, cmd.target);
        break;
      case "DELETE_SHEET":
        this.history.update("styles", cmd.sheetId, undefined);
        this.history.update("formats", cmd.sheetId, undefined);
        break;
      case "UPDATE_LOCALE":
        this.updateLocale(this.getters.getLocale(), cmd.locale);
    }
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId: UID) {
    const newStyles: ZoneStyle[] = [];
    for (const style of this.styles[sheetId] ?? []) {
      const change = applyChange(this.getters.getRangeFromZone(sheetId, style.zone));
      switch (change.changeType) {
        case "RESIZE":
        case "CHANGE":
        case "MOVE":
          newStyles.push({ style: style.style, zone: change.range.unboundedZone });
          break;
        case "NONE":
          newStyles.push(style);
          break;
      }
    }
    this.history.update("styles", sheetId, newStyles);

    const newFormats: ZoneFormat[] = [];
    for (const format of this.formats[sheetId] ?? []) {
      const change = applyChange(this.getters.getRangeFromZone(sheetId, format.zone));
      switch (change.changeType) {
        case "RESIZE":
        case "CHANGE":
        case "MOVE":
          newFormats.push({ format: format.format, zone: change.range.unboundedZone });
          break;
        case "NONE":
          newFormats.push(format);
          break;
      }
    }
    this.history.update("formats", sheetId, newFormats);
  }

  private handleAddColRow(cmd: AddColumnsRowsCommand) {
    const start = cmd.dimension === "COL" ? "left" : "top";
    const end = cmd.dimension === "COL" ? "right" : "bottom";
    const sheetId = cmd.sheetId;
    for (const [name, values] of [
      ["styles", this.styles],
      ["formats", this.formats],
    ] as const) {
      const sheetValues = values[sheetId] ?? [];
      for (let idx = 0; idx < sheetValues.length; idx++) {
        const value = sheetValues[idx];
        if (value.zone[start] - cmd.quantity === cmd.base && cmd.position === "before") {
          this.history.update(name, sheetId, idx, "zone", start, value.zone[start] - cmd.quantity);
        } else if (value.zone[end] === cmd.base && cmd.position === "after") {
          this.history.update(name, sheetId, idx, "zone", end, value.zone[end] + cmd.quantity);
        }
      }
    }
  }

  private styleIsDefault(style: Style) {
    return deepEquals(this.removeDefaultStyleValues(style), {});
  }

  private removeDefaultStyleValues(style: Style | undefined): Style {
    const cleanedStyle = { ...style };
    for (const property in DEFAULT_STYLE_NO_ALIGN) {
      if (cleanedStyle[property] === DEFAULT_STYLE_NO_ALIGN[property]) {
        delete cleanedStyle[property];
      }
    }
    return cleanedStyle;
  }

  private onMerge(sheetId: UID, zone: Zone) {
    this.setStyle(sheetId, zone, this.getCellStyle({ sheetId, col: zone.left, row: zone.top }), {
      force: true,
    });
    this.setFormat(sheetId, zone, this.getCellFormat({ sheetId, col: zone.left, row: zone.top }));
  }

  private setStyles(
    sheetId: UID,
    zones: Zone[],
    style: Style | undefined,
    options: { force: boolean } = { force: false }
  ) {
    for (const zone of zones) {
      this.setStyle(sheetId, zone, style, options);
    }
  }

  private setStyle(
    sheetId: UID,
    zone: Zone,
    style: Style | undefined,
    options: { force: boolean } = { force: false }
  ) {
    const styles: ZoneStyle[] = [];
    let editingZone: Zone[] = [this.getters.expandZone(sheetId, zone)];
    for (const existingStyle of this.styles[sheetId] ?? []) {
      const inter = intersection(existingStyle.zone, zone);
      if (!inter) {
        styles.push(existingStyle);
        continue;
      }

      let newStyle = options.force ? style : { ...existingStyle.style, ...style };
      newStyle = this.removeDefaultStyleValues(newStyle);
      if (!deepEquals(existingStyle.style, newStyle)) {
        if (newStyle && !this.styleIsDefault(newStyle)) {
          styles.push({ zone: inter, style: newStyle });
        }
        for (const updatedBorderZone of recomputeZones([existingStyle.zone], [inter])) {
          styles.push({ zone: updatedBorderZone, style: existingStyle.style });
        }
      } else {
        styles.push(existingStyle);
      }

      editingZone = recomputeZones(editingZone, [inter]);
    }

    if (style) {
      const newStyle = this.removeDefaultStyleValues(style);
      styles.push(
        ...editingZone.map((zone) => {
          return { zone, style: newStyle };
        })
      );
    }

    this.history.update(
      "styles",
      sheetId,
      styles.filter((zoneStyle) => !this.styleIsDefault(zoneStyle.style))
    );
  }

  private clearStyle(sheetId: UID, zones: Zone[]) {
    this.setStyles(sheetId, zones, undefined, { force: true });
  }

  private setFormats(sheetId: UID, zones: Zone[], format: Format | undefined) {
    for (const zone of zones) {
      this.setFormat(sheetId, zone, format);
    }
  }

  private setFormat(sheetId: UID, zone: Zone, format: Format | undefined) {
    zone = this.getters.expandZone(sheetId, zone);
    const formats: ZoneFormat[] = [];
    if (format) formats.push({ zone, format });
    for (const existingFormat of this.formats[sheetId] ?? []) {
      const inter = intersection(existingFormat.zone, zone);
      if (!inter) {
        formats.push(existingFormat);
        continue;
      }

      for (const updatedBorderZone of recomputeZones([existingFormat.zone], [inter])) {
        formats.push({ zone: updatedBorderZone, format: existingFormat.format });
      }
    }

    this.history.update("formats", sheetId, formats);
  }

  private clearFormat(sheetId: UID, zones: Zone[]) {
    this.setFormats(sheetId, zones, undefined);
  }

  private updateLocale(oldLocale: Locale, newLocale: Locale) {
    for (const sheetId of this.getters.getSheetIds()) {
      if (!this.formats[sheetId]) continue;
      for (let formatId = 0; formatId < this.formats[sheetId].length; formatId++) {
        const format = this.formats[sheetId][formatId].format;
        if (format === oldLocale.dateFormat) {
          this.history.update("formats", sheetId, formatId, "format", newLocale.dateFormat);
        } else if (format === oldLocale.timeFormat) {
          this.history.update("formats", sheetId, formatId, "format", newLocale.timeFormat);
        } else if (format === getDateTimeFormat(oldLocale)) {
          this.history.update("formats", sheetId, formatId, "format", getDateTimeFormat(newLocale));
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellStyle(cellPosition: CellPosition): Style | undefined {
    const style = this.styles[cellPosition.sheetId]?.find((zoneStyle) => {
      return isInside(cellPosition.col, cellPosition.row, zoneStyle.zone);
    });
    return style?.style;
  }

  getCellFormat(cellPosition: CellPosition): Format | undefined {
    const style = this.formats[cellPosition.sheetId]?.find((zoneStyle) => {
      return isInside(cellPosition.col, cellPosition.row, zoneStyle.zone);
    });
    return style?.format;
  }

  getCellStyleInZone(sheetId: UID, zone: Zone): PositionMap<Style> {
    const styles = new PositionMap<Style>();
    for (const { zone: z, style } of this.styles[sheetId] ?? []) {
      const inter = intersection(z, zone);
      if (!inter) continue;
      for (let col = inter.left; col <= inter.right; col++) {
        for (let row = inter.top; row <= inter.bottom; row++) {
          styles.set({ sheetId, col, row }, style);
        }
      }
    }
    return styles;
  }

  getZoneStyles(sheetId: UID, zone: Zone): ZoneStyle[] {
    const styles: ZoneStyle[] = [];
    for (const style of this.styles[sheetId] ?? []) {
      const inter = intersection(style.zone, zone);
      if (inter) styles.push({ zone: inter, style: style.style });
    }
    return styles;
  }

  getCellFormatInZone(sheetId: UID, zone: Zone): PositionMap<Format> {
    const formats = new PositionMap<Format>();
    for (const { zone: z, format } of this.formats[sheetId] ?? []) {
      const inter = intersection(z, zone);
      if (!inter) continue;
      for (let col = inter.left; col <= inter.right; col++) {
        for (let row = inter.top; row <= inter.bottom; row++) {
          formats.set({ sheetId, col, row }, format);
        }
      }
    }
    return formats;
  }

  getZoneFormats(sheetId: UID, zone: Zone): ZoneFormat[] {
    const formats: ZoneFormat[] = [];
    for (const format of this.formats[sheetId] ?? []) {
      const inter = intersection(format.zone, zone);
      if (inter) formats.push({ zone: inter, format: format.format });
    }
    return formats;
  }

  getStyleColors(sheetId: UID): Color[] {
    const colors: Set<Color> = new Set();
    for (const style of this.styles[sheetId] ?? []) {
      if (style.style.textColor) {
        colors.add(style.style.textColor);
      }
      if (style.style.fillColor) {
        colors.add(style.style.fillColor);
      }
    }
    return [...colors];
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    if (Object.keys(data.styles || {}).length) {
      for (const sheet of data.sheets) {
        for (const zoneXc in sheet.styles) {
          const styleId = sheet.styles[zoneXc];
          this.setStyle(sheet.id, toZone(zoneXc), data.styles[styleId]);
        }
      }
    }
    if (Object.keys(data.formats || {}).length) {
      for (const sheet of data.sheets) {
        for (const zoneXc in sheet.formats) {
          const formatId = sheet.formats[zoneXc];
          this.setFormat(sheet.id, toZone(zoneXc), data.formats[formatId]);
        }
      }
    }
    for (const sheetData of data.sheets) {
      if (sheetData.merges) {
        for (const merge of sheetData.merges) {
          this.onMerge(sheetData.id, toZone(merge));
        }
      }
    }
  }

  export(data: WorkbookData) {
    const styles: { [styleId: number]: Style } = {};
    const formats: { [styleId: number]: Format } = {};
    for (const sheet of data.sheets) {
      sheet.styles = {};
      for (const style of this.styles[sheet.id] ?? []) {
        sheet.styles[zoneToXc(style.zone)] = getItemId(style.style, styles);
      }
      sheet.formats = {};
      for (const format of this.formats[sheet.id] ?? []) {
        sheet.formats[zoneToXc(format.zone)] = getItemId(format.format, formats);
      }
    }
    data.styles = styles;
    data.formats = formats;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
    const incompatibleIds: number[] = [];
    for (const formatId in data.formats || []) {
      if (!isExcelCompatible(data.formats[formatId])) {
        incompatibleIds.push(Number(formatId));
        delete data.formats[formatId];
      }
    }
    if (incompatibleIds.length) {
      for (const sheet of data.sheets) {
        for (const zoneXc in sheet.formats) {
          const formatId = sheet.formats[zoneXc];
          if (formatId && incompatibleIds.includes(formatId)) {
            delete sheet.formats[zoneXc];
          }
        }
      }
    }
  }
}
