import { BasePlugin } from "../base_plugin";
import { Mode } from "../model";
import { Command, UID, Zone } from "../types/index";
import { getComposerSheetName, toZone, uuidv4, zoneToXc } from "../helpers/index";
import { _lt } from "../translation";

export type onRangeChange = () => void;

export type Range = {
  id: UID;
  zone: Zone; // the zone the range actually spans
  sheetId: UID; // the sheet on which the range is defined
  isRowFixed: boolean; // if the row is preceded by $
  isColFixed: boolean; // if the col is preceded by $
  onChange?: onRangeChange; // the callbacks that needs to be called if a range is modified
};

export class RangePlugin extends BasePlugin {
  static getters = ["getRangeFromZone", "getRangeFromXC", "getRangeString"];
  static modes: Mode[] = ["normal", "readonly", "headless"];
  static pluginName = "range";

  private ranges: Record<UID, Range> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_COLUMNS":
        cmd.columns.sort((a, b) => b - a);
        for (let colIndexToRemove of cmd.columns) {
          for (let range of Object.values(this.ranges)) {
            if (range.zone.left <= colIndexToRemove && colIndexToRemove <= range.zone.right) {
              range.zone.right--;
            } else if (colIndexToRemove < range.zone.left) {
              range.zone.left--;
              range.zone.right--;
            }
          }
        }
        break;
      case "REMOVE_ROWS":
        cmd.rows.sort((a, b) => b - a);
        for (let rowsIndexToRemove of cmd.rows) {
          for (let range of Object.values(this.ranges)) {
            if (range.zone.top <= rowsIndexToRemove && rowsIndexToRemove <= range.zone.bottom) {
              range.zone.bottom--;
            } else if (rowsIndexToRemove < range.zone.top) {
              range.zone.top--;
              range.zone.bottom--;
            }
          }
        }
        break;
      case "ADD_COLUMNS":
        break;
      case "ADD_ROWS":
        break;
    }
  }

  finalize() {
    // call all the onchange
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getRangeFromXC(sheetId: UID, xc: string, onChange?: onRangeChange): string {
    return this.getRangeFromZone(sheetId, toZone(xc), onChange);
  }

  getRangeFromZone(sheetId: UID, zone: Zone, onChange?: onRangeChange): string {
    let r: Range = {
      id: uuidv4(),
      sheetId,
      zone,
      onChange,
      isColFixed: false,
      isRowFixed: false,
    };
    this.ranges[r.id] = r;
    return r.id;
  }

  /**
   * Gets the string that represents the range as it is at the moment of the call.
   * The string will be prefixed with the sheet name if the call specified a sheet id in `forSheetId`
   * different than the sheet on which the range has been created.
   *
   * @param rangeId the id of the range (received from getRangeFromXC or getRangeFromZone)
   * @param forSheetId the id of the sheet where the range string is supposed to be used.
   */
  getRangeString(rangeId: UID, forSheetId: UID): string {
    const r = this.ranges[rangeId];
    if (!r) {
      throw Error(_lt(`Cannot find range id ${rangeId}`));
    }

    let prefixSheet = r.sheetId !== forSheetId;
    let sheetName: string = "";
    if (prefixSheet) {
      const s = this.getters.getSheetName(r.sheetId);
      if (s) {
        sheetName = getComposerSheetName(s);
      }
    }
    return `${prefixSheet ? sheetName + "!" : ""}${zoneToXc(r.zone)}`;
  }

  //getRange(rangeId: string): Range {}

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  // private uniqueRef(sheetId: UID, zone: Zone): string {
  //   return "".concat(sheetId, "|", zoneToXc(zone));
  // }
}
