import { deepEquals } from "../../helpers";
import { PositionMap } from "../../helpers/cells/position_map";
import { getItemId } from "../../helpers/data_normalization";
import { recomputeZones } from "../../helpers/recompute_zones";
import {
  intersection,
  isInside,
  isZoneInside,
  positionToZone,
  toZone,
  zoneToXc,
} from "../../helpers/zones";
import {
  AddColumnsRowsCommand,
  CommandResult,
  CoreCommand,
  SetFormattingCommand,
} from "../../types/commands";
import {
  CellPosition,
  Color,
  RangeAdapterFunctions,
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

interface StylePluginState {
  readonly styles: Record<UID, ZoneStyle[] | undefined>;
}

export class StylePlugin extends CorePlugin<StylePluginState> implements StylePluginState {
  static getters = [
    "getCellStyle",
    "getCellStyleInZone",
    "getZoneStyles",
    "getStyleColors",
  ] as const;

  readonly styles: Record<UID, ZoneStyle[] | undefined> = {};

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "SET_FORMATTING":
        return this.checkUselessSetFormatting(cmd);
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_MERGE":
        for (const zone of cmd.target) {
          this.onMerge(cmd.sheetId, zone);
        }
        break;
      case "SET_FORMATTING":
        if (cmd.style !== undefined) {
          if (cmd.style !== null) {
            this.setStyles(cmd.sheetId, cmd.target, cmd.style);
          } else {
            this.clearStyle(cmd.sheetId, cmd.target);
          }
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearStyle(cmd.sheetId, cmd.target);
        break;
      case "UPDATE_CELL":
        if (cmd.style !== undefined) {
          if (cmd.style !== null) {
            this.setStyles(cmd.sheetId, [positionToZone(cmd)], cmd.style, { force: true });
          } else {
            this.clearStyle(cmd.sheetId, [positionToZone(cmd)]);
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
        break;
      case "DUPLICATE_SHEET":
        this.history.update("styles", cmd.sheetIdTo, this.styles[cmd.sheetId]);
        break;
    }
  }

  adaptRanges({ applyChange }: RangeAdapterFunctions, sheetId: UID) {
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
  }

  private handleAddColRow(cmd: AddColumnsRowsCommand) {
    const start = cmd.dimension === "COL" ? "left" : "top";
    const end = cmd.dimension === "COL" ? "right" : "bottom";
    const sheetId = cmd.sheetId;
    const sheetValues = this.styles[sheetId] ?? [];
    for (let i = 0; i < sheetValues.length; i++) {
      const value = sheetValues[i];
      if (value.zone[start] - cmd.quantity === cmd.base && cmd.position === "before") {
        this.history.update("styles", sheetId, i, "zone", start, value.zone[start] - cmd.quantity);
      } else if (value.zone[end] === cmd.base && cmd.position === "after") {
        this.history.update("styles", sheetId, i, "zone", end, value.zone[end] + cmd.quantity);
      }
    }
  }

  private styleIsDefault(style: Style) {
    for (const key in style) {
      if (DEFAULT_STYLE_NO_ALIGN[key] !== style[key]) {
        return false;
      }
    }
    return true;
  }

  private removeDefaultStyleValues(style: Style | undefined): Style | undefined {
    const cleanedStyle = { ...style };
    for (const property in style) {
      if (
        cleanedStyle[property] === undefined ||
        cleanedStyle[property] === DEFAULT_STYLE_NO_ALIGN[property]
      ) {
        delete cleanedStyle[property];
      }
    }
    return Object.keys(cleanedStyle).length > 0 ? cleanedStyle : undefined;
  }

  private onMerge(sheetId: UID, zone: Zone) {
    this.setStyle(sheetId, zone, this.getCellStyle({ sheetId, col: zone.left, row: zone.top }), {
      force: true,
    });
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

    style = this.removeDefaultStyleValues(style);
    if (style) {
      styles.push(
        ...editingZone.map((zone) => {
          return { zone, style };
        })
      );
    }

    this.history.update("styles", sheetId, styles);
  }

  private clearStyle(sheetId: UID, zones: Zone[]) {
    this.setStyles(sheetId, zones, undefined, { force: true });
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

  getCellStyleInZone(sheetId: UID, zone: Zone): PositionMap<Style> {
    const styles = new PositionMap<Style>();
    for (const { zone: z, style } of this.styles[sheetId] ?? []) {
      const inter = intersection(z, zone);
      if (inter) {
        styles.setMany(sheetId, inter, style);
      }
    }
    return styles;
  }

  getZoneStyles(sheetId: UID, zone: Zone): ZoneStyle[] {
    const styles: ZoneStyle[] = [];
    for (const style of this.styles[sheetId] ?? []) {
      const inter = intersection(style.zone, zone);
      if (inter) {
        styles.push({ zone: inter, style: style.style });
      }
    }
    return styles;
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
    for (const sheet of data.sheets) {
      sheet.styles = {};
      for (const style of this.styles[sheet.id] ?? []) {
        sheet.styles[zoneToXc(style.zone)] = getItemId(style.style, styles);
      }
    }
    data.styles = styles;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }

  private checkUselessSetFormatting(cmd: SetFormattingCommand) {
    const { sheetId, target } = cmd;
    const hasStyle = "style" in cmd;
    const hasFormat = "format" in cmd;
    if (!hasStyle && !hasFormat) {
      return CommandResult.NoChanges;
    }
    for (const zone of recomputeZones(target)) {
      if (hasStyle) {
        const currentStyle = this.getZoneStyles(sheetId, zone);
        if (
          currentStyle.find(
            (style) => !cmd.style || !deepEquals({ ...style.style, ...cmd.style }, style.style)
          )
        ) {
          return CommandResult.Success;
        }
        const currentStyleZone = recomputeZones(currentStyle.map((format) => format.zone));
        if (currentStyleZone.length !== 1 || !isZoneInside(zone, currentStyleZone[0])) {
          return CommandResult.Success;
        }
      }
      if (hasFormat) {
        const currentFormat = this.getters.getZoneFormats(sheetId, zone);
        if (currentFormat.find((format) => format.format !== cmd.format)) {
          return CommandResult.Success;
        }
        const currentFormatZone = recomputeZones(currentFormat.map((format) => format.zone));
        if (currentFormatZone.length !== 1 || !isZoneInside(zone, currentFormatZone[0])) {
          return CommandResult.Success;
        }
      }
    }
    return CommandResult.NoChanges;
  }
}
