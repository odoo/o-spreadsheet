import { deepCopy } from "../../helpers";
import { PositionMap } from "../../helpers/cells/position_map";
import { getItemId } from "../../helpers/data_normalization";
import { getDateOrNumberFormat, isExcelCompatible } from "../../helpers/format/format";
import { getDateTimeFormat } from "../../helpers/locale";
import { recomputeZones } from "../../helpers/recompute_zones";
import { intersection, isInside, positionToZone, toZone, zoneToXc } from "../../helpers/zones";
import { AddColumnsRowsCommand, CoreCommand } from "../../types/commands";
import { Format } from "../../types/format";
import { Locale } from "../../types/locale";
import { CellPosition, RangeAdapterFunctions, UID, UnboundedZone, Zone } from "../../types/misc";
import { BoundedRange } from "../../types/range";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";
import { RangeSet } from "../ui_core_views/cell_evaluation/range_set";

export type ZoneFormat = {
  zone: UnboundedZone;
  format: Format;
};

interface FormatPluginState {
  readonly formats: Record<UID, ZoneFormat[] | undefined>;
}

export class CoreFormatPlugin extends CorePlugin<FormatPluginState> implements FormatPluginState {
  static getters = [
    "getCellFormat",
    "getCellFormatInZone",
    "addCellFormatInRanges",
    "getZoneFormats",
  ] as const;

  readonly formats: Record<UID, ZoneFormat[] | undefined> = {};

  beforeHandle(cmd: CoreCommand): void {
    if (cmd.type === "UPDATE_LOCALE") {
      this.updateLocale(this.getters.getLocale(), cmd.locale);
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_MERGE":
        for (const zone of cmd.target) {
          this.onMerge(cmd.sheetId, zone);
        }
        break;
      case "SET_FORMATTING":
        if ("format" in cmd) {
          if (cmd.format) {
            this.setFormats(cmd.sheetId, cmd.target, cmd.format);
          } else {
            this.clearFormat(cmd.sheetId, cmd.target);
          }
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearFormat(cmd.sheetId, cmd.target);
        break;
      case "UPDATE_CELL":
        if ("format" in cmd) {
          if (cmd.format) {
            this.setFormats(cmd.sheetId, [positionToZone(cmd)], cmd.format);
          } else {
            this.clearFormat(cmd.sheetId, [positionToZone(cmd)]);
          }
        } else if (
          "content" in cmd &&
          cmd.content &&
          !cmd.content.startsWith("=") &&
          !this.getCellFormat(cmd)
        ) {
          const format = getDateOrNumberFormat(cmd.content, this.getters.getLocale());
          if (format) {
            this.setFormats(cmd.sheetId, [positionToZone(cmd)], format);
          }
        }
        break;
      case "ADD_COLUMNS_ROWS":
        this.handleAddColRow(cmd);
        break;
      case "CLEAR_CELL":
        this.clearFormat(cmd.sheetId, [positionToZone(cmd)]);
        break;
      case "CLEAR_CELLS":
        this.clearFormat(cmd.sheetId, cmd.target);
        break;
      case "DELETE_SHEET":
        this.history.update("formats", cmd.sheetId, undefined);
        break;
      case "DUPLICATE_SHEET":
        this.history.update("formats", cmd.sheetIdTo, deepCopy(this.formats[cmd.sheetId]));
        break;
    }
  }

  adaptRanges({ applyChange }: RangeAdapterFunctions, sheetId: UID) {
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
    const formats = this.formats[sheetId] ?? [];
    for (let idx = 0; idx < formats.length; idx++) {
      const { zone } = formats[idx];
      if (zone[start] - cmd.quantity === cmd.base && cmd.position === "before") {
        this.history.update("formats", sheetId, idx, "zone", start, zone[start] - cmd.quantity);
      } else if (zone[end] === cmd.base && cmd.position === "after") {
        this.history.update("formats", sheetId, idx, "zone", end, zone[end] + cmd.quantity);
      }
    }
  }

  private onMerge(sheetId: UID, zone: Zone) {
    this.setFormat(sheetId, zone, this.getCellFormat({ sheetId, col: zone.left, row: zone.top }));
  }

  private setFormats(sheetId: UID, zones: Zone[], format: Format | undefined) {
    for (const zone of zones) {
      this.setFormat(sheetId, zone, format);
    }
  }

  private setFormat(sheetId: UID, zone: Zone, format: Format | undefined) {
    zone = this.getters.expandZone(sheetId, zone);
    const formats: ZoneFormat[] = [];
    if (format) {
      formats.push({ zone, format });
    }
    for (const existingFormat of this.formats[sheetId] ?? []) {
      const inter = intersection(existingFormat.zone, zone);
      if (!inter) {
        formats.push(existingFormat);
        continue;
      }

      for (const remainderZone of recomputeZones([existingFormat.zone], [inter])) {
        formats.push({ zone: remainderZone, format: existingFormat.format });
      }
    }

    this.history.update("formats", sheetId, formats);
  }

  private clearFormat(sheetId: UID, zones: Zone[]) {
    this.setFormats(sheetId, zones, undefined);
  }

  private updateLocale(oldLocale: Locale, newLocale: Locale) {
    for (const sheetId of this.getters.getSheetIds()) {
      if (!this.formats[sheetId]) {
        continue;
      }
      for (let i = 0; i < this.formats[sheetId].length; i++) {
        const format = this.formats[sheetId][i].format;
        if (format === oldLocale.dateFormat) {
          this.history.update("formats", sheetId, i, "format", newLocale.dateFormat);
        } else if (format === oldLocale.timeFormat) {
          this.history.update("formats", sheetId, i, "format", newLocale.timeFormat);
        } else if (format === getDateTimeFormat(oldLocale)) {
          this.history.update("formats", sheetId, i, "format", getDateTimeFormat(newLocale));
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellFormat(position: CellPosition): Format | undefined {
    const style = this.formats[position.sheetId]?.find((zoneStyle) => {
      return isInside(position.col, position.row, zoneStyle.zone);
    });
    return style?.format;
  }

  getCellFormatInZone(sheetId: UID, zone: Zone): PositionMap<Format> {
    const formats = new PositionMap<Format>();
    for (const { zone: z, format } of this.formats[sheetId] ?? []) {
      const inter = intersection(z, zone);
      if (!inter) {
        continue;
      }
      for (let col = inter.left; col <= inter.right; col++) {
        for (let row = inter.top; row <= inter.bottom; row++) {
          formats.set({ sheetId, col, row }, format);
        }
      }
    }
    return formats;
  }

  getZoneFormats(sheetId: UID, zone?: Zone): ZoneFormat[] {
    const formats: ZoneFormat[] = [];
    for (const format of this.formats[sheetId] ?? []) {
      const inter = zone ? intersection(format.zone, zone) : format.zone;
      if (inter) {
        formats.push({ zone: inter, format: format.format });
      }
    }
    return formats;
  }

  addCellFormatInRanges(ranges: RangeSet | BoundedRange[], startingMap: PositionMap<Format>) {
    const zonesBySheet: Record<UID, Zone[]> = {};
    for (const range of ranges) {
      if (!(range.sheetId in zonesBySheet)) {
        zonesBySheet[range.sheetId] = [];
      }
      zonesBySheet[range.sheetId].push(range.zone);
    }
    for (const sheetId in zonesBySheet) {
      const zones = recomputeZones(zonesBySheet[sheetId]);
      for (const zone of zones) {
        for (const { zone: z, format } of this.formats[sheetId] ?? []) {
          const inter = intersection(z, zone);
          if (inter) {
            startingMap.setMany(sheetId, inter, format);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
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
    const formats: { [styleId: number]: Format } = {};
    for (const sheet of data.sheets) {
      sheet.formats = {};
      for (const format of this.formats[sheet.id] ?? []) {
        sheet.formats[zoneToXc(format.zone)] = getItemId(format.format, formats);
      }
    }
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
