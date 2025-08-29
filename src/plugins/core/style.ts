import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CoreCommand,
  UID,
  UnboundedZone,
  Zone,
} from "../..";
import { DEFAULT_STYLE } from "../../constants";
import { deepEquals, positionToZone } from "../../helpers";
import { CellPosition, Style } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

export type ZoneStyle = {
  zone: UnboundedZone;
  style: Style;
};

interface StylePluginState {
  readonly styles: Record<UID, ZoneStyle[] | undefined>;
}

export class StylePlugin extends CorePlugin<StylePluginState> implements StylePluginState {
  static getters = ["getCellStyle", "getStyleCustomColor"] as const;

  readonly styles: Record<UID, ZoneStyle[] | undefined> = {};

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_FORMATTING":
        if ("style" in cmd) {
          if (cmd.style) this.setStyle(cmd.sheetId, cmd.target, cmd.style);
          else this.clearStyle(cmd.sheetId, cmd.target);
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearStyle(cmd.sheetId, cmd.target);
        break;
      case "ADD_COLUMNS_ROWS":
        this.handleAddColumnsRows(cmd);
        break;
      case "UPDATE_CELL":
        if ("style" in cmd) {
          if (cmd.style) this.setStyle(cmd.sheetId, [positionToZone(cmd)], cmd.style);
          else this.clearStyle(cmd.sheetId, [positionToZone(cmd)]);
        }
        break;
      case "CLEAR_CELL":
        this.clearStyle(cmd.sheetId, [positionToZone(cmd)]);
        break;
      case "CLEAR_CELLS":
        this.clearStyle(cmd.sheetId, cmd.target);
        break;
      case "DELETE_CONTENT":
        this.clearStyle(cmd.sheetId, cmd.target);
        break;
      case "DELETE_SHEET":
        this.history.update("styles", cmd.sheetId, undefined);
        break;
    }
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID, sheetName?: string) {
    const sheetIds = sheetId ? [sheetId] : Object.keys(this.styles);
    for (const sheetId of sheetIds) {
      this.adaptBorderRange(applyChange, sheetId);
    }
  }

  private adaptBorderRange(applyChange: ApplyRangeChange, sheetId: UID) {
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
    this.history.update(
      "styles",
      sheetId,
      newStyles.filter((styleZone) => !this.styleIsDefault(styleZone.style))
    );
  }

  private styleIsDefault(style: Style) {
    return deepEquals(this.removeDefaultStyleValues(style), {});
  }

  private removeDefaultStyleValues(style: Style | undefined): Style {
    const cleanedStyle = { ...style };
    for (const property in DEFAULT_STYLE) {
      if (cleanedStyle[property] === DEFAULT_STYLE[property]) {
        delete cleanedStyle[property];
      }
    }
    return cleanedStyle;
  }

  private setStyle(sheetId: UID, zones: Zone[], style: Style) {
    if (this.styleIsDefault(style)) {
      return this.clearStyle(sheetId, zones);
    }
  }

  private clearStyle(sheetId: UID, zones: Zone[]) {}

  private handleAddColumnsRows(cmd: AddColumnsRowsCommand) {}

  /////////////
  // Getters //
  /////////////

  getCellStyle(cellPosition: CellPosition): Style | undefined {
    return this.getters.getCell(cellPosition)?.style;
  }

  getStyleCustomColor(sheetId: UID): Color[] {
    const cells = Object.values(this.getters.getCells(sheetId));
    const colors: Set<Color> = new Set();
    for (const cell of cells) {
      if (cell.style?.textColor) {
        colors.add(cell.style.textColor);
      }
      if (cell.style?.fillColor) {
        colors.add(cell.style.fillColor);
      }
    }
    return [...colors];
  }
}
