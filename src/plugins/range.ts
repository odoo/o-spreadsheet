import { BasePlugin } from "../base_plugin";
import { Mode } from "../model";
import { ChangeType, Command, onRangeChange, UID, Zone } from "../types/index";
import { getComposerSheetName, toZone, uuidv4, zoneToXc } from "../helpers/index";
import { _lt } from "../translation";

export type Range = {
  id: UID;
  zone: Zone; // the zone the range actually spans
  sheetId: UID; // the sheet on which the range is defined
  onChange?: onRangeChange; // the callbacks that needs to be called if a range is modified
};

export class RangePlugin extends BasePlugin {
  static getters = ["getRangeFromZone", "getRangeFromXC", "getRangeString"];
  static modes: Mode[] = ["normal", "readonly", "headless"];
  static pluginName = "range";

  private ranges: Record<UID, Range> = {};
  private notifyResize: Set<UID> = new Set<UID>();
  private notifyMove: Set<UID> = new Set<UID>();
  private notifyRemove: Set<UID> = new Set<UID>();
  private notifyChange: Set<UID> = new Set<UID>();

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
              this.notifyResize.add(range.id);
            } else if (colIndexToRemove < range.zone.left) {
              range.zone.left--;
              range.zone.right--;
              this.notifyMove.add(range.id);
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
              this.notifyResize.add(range.id);
            } else if (rowsIndexToRemove < range.zone.top) {
              range.zone.top--;
              range.zone.bottom--;
              this.notifyMove.add(range.id);
            }
          }
        }
        break;
      case "ADD_COLUMNS":
        for (let range of Object.values(this.ranges)) {
          if (cmd.position === "after") {
            if (range.zone.left <= cmd.column && cmd.column <= range.zone.right) {
              range.zone.right++;
            } else if (cmd.column < range.zone.left) {
              range.zone.left++;
              range.zone.right++;
              this.notifyMove.add(range.id);
            }
          } else {
            if (range.zone.left < cmd.column && cmd.column <= range.zone.right) {
              range.zone.right++;
              this.notifyResize.add(range.id);
            } else if (cmd.column <= range.zone.left) {
              range.zone.left++;
              range.zone.right++;
              this.notifyMove.add(range.id);
            }
          }
        }
        break;
      case "ADD_ROWS":
        for (let range of Object.values(this.ranges)) {
          if (cmd.position === "after") {
            if (range.zone.top <= cmd.row && cmd.row < range.zone.bottom) {
              range.zone.bottom++;
              this.notifyResize.add(range.id);
            } else if (cmd.row < range.zone.top) {
              range.zone.top++;
              range.zone.bottom++;
              this.notifyMove.add(range.id);
            }
          } else {
            if (range.zone.top < cmd.row && cmd.row <= range.zone.bottom) {
              range.zone.bottom++;
              this.notifyResize.add(range.id);
            } else if (cmd.row <= range.zone.top) {
              range.zone.top++;
              range.zone.bottom++;
              this.notifyMove.add(range.id);
            }
          }
        }
        break;
      case "UPDATE_CELL":
        for (let range of Object.values(this.ranges)) {
          if (
            range.zone.left <= cmd.col &&
            cmd.col <= range.zone.right &&
            range.zone.top <= cmd.row &&
            cmd.row <= range.zone.bottom
          ) {
            this.notifyChange.add(range.id);
          }
        }

        break;
    }
  }

  finalize() {
    for (const rangeId of this.notifyResize) {
      const r = this.ranges[rangeId];
      if (r.zone.right - r.zone.left < 0 || r.zone.bottom - r.zone.top < 0) {
        this.notifyRemove.add(rangeId);
        this.notifyResize.delete(rangeId);
        this.notifyMove.delete(rangeId);
        this.notifyChange.delete(rangeId);
      }
    }

    this.notify(this.notifyRemove, "REMOVE");
    this.notify(this.notifyResize, "RESIZE");
    this.notify(this.notifyMove, "MOVE");
    this.notify(this.notifyChange, "CHANGE");
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getRangeFromXC(sheetId: UID, xc: string, onChange?: onRangeChange): Range {
    return this.getRangeFromZone(sheetId, toZone(xc), onChange);
  }

  getRangeFromZone(sheetId: UID, zone: Zone, onChange?: onRangeChange): Range {
    let r: Range = {
      id: uuidv4(),
      sheetId,
      zone,
      onChange,
      // isColFixed: false,
      // isRowFixed: false,
    };
    this.ranges[r.id] = r;
    return r;
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

  private notify(set: Set<UID>, type: ChangeType) {
    for (const rangeId of set) {
      if (this.ranges[rangeId].onChange) {
        this.ranges[rangeId].onChange!(type);
      }
    }
    set.clear();
  }

  // private uniqueRef(sheetId: UID, zone: Zone): string {
  //   return "".concat(sheetId, "|", zoneToXc(zone));
  // }
}
