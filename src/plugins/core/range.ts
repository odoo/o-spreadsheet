import { ChangeType, Command, onRangeChange, Range, RangePart, UID } from "../../types/index";
import {
  getComposerSheetName,
  isDefined,
  numberToLetters,
  toZone,
  uuidv4,
} from "../../helpers/index";
import { CorePlugin } from "../core_plugin";

interface RangeState {
  ranges: Record<UID, Range | undefined>;
}

export const INCORRECT_RANGE_STRING = "#REF";

export class RangePlugin extends CorePlugin<RangeState> {
  static getters = ["getRangeString", "getRangeFromSheetXC"];

  public readonly ranges: Record<UID, Range | undefined> = {};

  private notifyResize: Set<UID> = new Set<UID>(); // temporary set filled with ranges resized, to notify in the finalize
  private notifyMove: Set<UID> = new Set<UID>(); // idem for moved ranges
  private notifyRemove: Set<UID> = new Set<UID>(); // idem for removed ranges (where the end is before the start)
  private notifyChange: Set<UID> = new Set<UID>(); // item, for change
  private notifyChangeSheetId: UID = "";

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_COLUMNS":
      case "REMOVE_ROWS":
        let start: "left" | "top" = cmd.type === "REMOVE_COLUMNS" ? "left" : "top";
        let end: "right" | "bottom" = cmd.type === "REMOVE_COLUMNS" ? "right" : "bottom";
        let dimension = cmd.type === "REMOVE_COLUMNS" ? "columns" : "rows";
        this.notifyChangeSheetId = cmd.sheetId;

        cmd[dimension].sort((a, b) => b - a);

        for (let colIndexToRemove of cmd[dimension]) {
          for (let range of Object.values(this.ranges)
            .filter(isDefined)
            .filter((r) => r.sheetId === cmd.sheetId)) {
            if (range.zone[start] <= colIndexToRemove && colIndexToRemove <= range.zone[end]) {
              this.history.update("ranges", range.id, "zone", end, range.zone[end] - 1);
              this.notifyResize.add(range.id);
            } else if (colIndexToRemove < range.zone[start]) {
              this.history.update("ranges", range.id, "zone", end, range.zone[end] - 1);
              this.history.update("ranges", range.id, "zone", start, range.zone[start] - 1);
              this.notifyMove.add(range.id);
            }
          }
        }
        break;
      case "ADD_COLUMNS":
        this.notifyChangeSheetId = cmd.sheetId;

        for (let range of Object.values(this.ranges)
          .filter(isDefined)
          .filter((r) => r.sheetId === cmd.sheetId)) {
          if (cmd.position === "after") {
            if (range.zone.left <= cmd.column && cmd.column < range.zone.right) {
              this.history.update("ranges", range.id, "zone", "right", range.zone.right + 1);
              this.notifyResize.add(range.id);
            } else if (cmd.column < range.zone.left) {
              this.history.update("ranges", range.id, "zone", "right", range.zone.right + 1);
              this.history.update("ranges", range.id, "zone", "left", range.zone.left + 1);
              this.notifyMove.add(range.id);
            }
          } else {
            if (range.zone.left < cmd.column && cmd.column <= range.zone.right) {
              this.history.update("ranges", range.id, "zone", "right", range.zone.right + 1);
              this.notifyResize.add(range.id);
            } else if (cmd.column <= range.zone.left) {
              this.history.update("ranges", range.id, "zone", "right", range.zone.right + 1);
              this.history.update("ranges", range.id, "zone", "left", range.zone.left + 1);
              this.notifyMove.add(range.id);
            }
          }
        }
        break;
      case "ADD_ROWS":
        this.notifyChangeSheetId = cmd.sheetId;

        for (let range of Object.values(this.ranges)
          .filter(isDefined)
          .filter((r) => r.sheetId === cmd.sheetId)) {
          if (cmd.position === "after") {
            if (range.zone.top <= cmd.row && cmd.row < range.zone.bottom) {
              this.history.update("ranges", range.id, "zone", "bottom", range.zone.bottom + 1);
              this.notifyResize.add(range.id);
            } else if (cmd.row < range.zone.top) {
              this.history.update("ranges", range.id, "zone", "top", range.zone.top + 1);
              this.history.update("ranges", range.id, "zone", "bottom", range.zone.bottom + 1);
              this.notifyMove.add(range.id);
            }
          } else {
            if (range.zone.top < cmd.row && cmd.row <= range.zone.bottom) {
              this.history.update("ranges", range.id, "zone", "bottom", range.zone.bottom + 1);
              this.notifyResize.add(range.id);
            } else if (cmd.row <= range.zone.top) {
              this.history.update("ranges", range.id, "zone", "top", range.zone.top + 1);
              this.history.update("ranges", range.id, "zone", "bottom", range.zone.bottom + 1);
              this.notifyMove.add(range.id);
            }
          }
        }
        break;
      case "DELETE_SHEET":
        for (let range of Object.values(this.ranges)
          .filter(isDefined)
          .filter((r) => r.sheetId === cmd.sheetId)) {
          this.notifyRemove.add(range.id);
        }
        break;
      case "CREATE_SHEET":
      case "RENAME_SHEET":
        for (let range of Object.values(this.ranges).filter(isDefined)) {
          if (range.sheetId === cmd.sheetId) {
            this.notifyChange.add(range.id);
          }
          if (cmd.name && range.invalidSheetName === cmd.name) {
            let newSheetId = this.getters.getSheetIdByName(cmd.name);
            if (newSheetId) {
              this.history.update("ranges", range.id, "invalidSheetName", undefined);
              this.history.update("ranges", range.id, "sheetId", newSheetId);
              this.notifyChange.add(range.id);
            }
          }
        }
        break;
    }

    // ensure that even if a range has been updated after being removed, the last thing to happen to a removed range is being removed
    for (let rangeId of this.notifyRemove) {
      this.history.update("ranges", rangeId, undefined);
    }
  }

  finalize() {
    for (const rangeId of this.notifyResize) {
      const r = this.ranges[rangeId];
      if (!r || r.zone.right - r.zone.left < 0 || r.zone.bottom - r.zone.top < 0) {
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

  /**
   * Creates a range from a XC reference that can contain a sheet reference
   * @param defaultSheetId the sheet to default to if the sheetXC parameter does not contain a sheet reference (usually the active sheet Id)
   * @param sheetXC the string description of a range, in the form SheetName!XC:XC
   * @param onChange a function that will be called if this range is modified. Note that this function will be called
   *                 in the finalize of the command, so it cannot use `dispatch` or `this.history`
   */
  getRangeFromSheetXC(
    defaultSheetId: UID,
    sheetXC: string,
    onChange?: onRangeChange,
    transient: boolean = false
  ): Range {
    let xc = sheetXC;
    let sheetName: string = "";
    let sheetId: UID | undefined;
    let invalidSheetName: string | undefined;
    let prefixSheet: boolean = false;
    if (sheetXC.includes("!")) {
      [xc, sheetName] = sheetXC.split("!").reverse();
      if (sheetName) {
        sheetId = this.getters.getSheetIdByName(sheetName);
        prefixSheet = true;
        if (!sheetId) {
          invalidSheetName = sheetName;
        }
      } else {
        invalidSheetName = sheetName;
      }
    }
    let zone = toZone(xc, true);

    let rangeParts: RangePart[] = xc.split(":").map((p) => {
      return {
        colFixed: p.startsWith("$"),
        rowFixed: p.includes("$", 1),
      };
    });

    if (zone.right < zone.left) {
      let right = zone.right;
      zone.right = zone.left;
      zone.left = right;

      let rightFixed = rangeParts[1].colFixed;
      rangeParts[1].colFixed = rangeParts[0].colFixed;
      rangeParts[0].colFixed = rightFixed;
    }

    if (zone.bottom < zone.top) {
      let bottom = zone.bottom;
      zone.bottom = zone.top;
      zone.top = bottom;

      let bottomFixed = rangeParts[1].rowFixed;
      rangeParts[1].rowFixed = rangeParts[0].rowFixed;
      rangeParts[0].rowFixed = bottomFixed;
    }

    const r: Range = {
      id: uuidv4(),
      sheetId: sheetId || defaultSheetId,
      zone: zone,
      onChange: onChange,
      parts: rangeParts,
      invalidSheetName,
      prefixSheet,
    };
    if (!transient) {
      this.ranges[r.id] = r;
    }
    return r;
  }

  /**
   * Gets the string that represents the range as it is at the moment of the call.
   * The string will be prefixed with the sheet name if the call specified a sheet id in `forSheetId`
   * different than the sheet on which the range has been created.
   *
   * @param range the range (received from getRangeFromXC or getRangeFromZone)
   * @param forSheetId the id of the sheet where the range string is supposed to be used.
   */
  getRangeString(range: Range, forSheetId: UID): string {
    if (!range) {
      return INCORRECT_RANGE_STRING;
    }

    if (range.zone.bottom - range.zone.top < 0 || range.zone.right - range.zone.left < 0) {
      return INCORRECT_RANGE_STRING;
    }
    let prefixSheet = range.sheetId !== forSheetId || range.invalidSheetName || range.prefixSheet;
    let sheetName: string = "";
    if (prefixSheet) {
      if (range.invalidSheetName) {
        sheetName = range.invalidSheetName;
      } else {
        const s = this.getters.getSheetName(range.sheetId);
        if (s) {
          sheetName = getComposerSheetName(s);
        }
      }
    }

    if (prefixSheet && !sheetName) {
      return INCORRECT_RANGE_STRING;
    }

    let ref: string[] = Array(9);
    ref[0] = range.parts && range.parts[0].colFixed ? "$" : "";
    ref[1] = numberToLetters(range.zone.left);
    ref[2] = range.parts && range.parts[0].rowFixed ? "$" : "";
    ref[3] = String(range.zone.top + 1);
    if (range.parts && range.parts.length === 2) {
      // this if converts A2:A2 into A2 except if any part of the original range had fixed row or column (with $)
      if (
        range.zone.top !== range.zone.bottom ||
        range.zone.left !== range.zone.right ||
        range.parts[0].rowFixed ||
        range.parts[0].colFixed ||
        range.parts[1].rowFixed ||
        range.parts[1].colFixed
      ) {
        ref[4] = ":";
        ref[5] = range.parts[1].colFixed ? "$" : "";
        ref[6] = numberToLetters(range.zone.right);
        ref[7] = range.parts[1].rowFixed ? "$" : "";
        ref[8] = String(range.zone.bottom + 1);
      }
    }

    return `${prefixSheet ? sheetName + "!" : ""}${ref.join("")}`;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private notify(set: Set<UID>, type: ChangeType) {
    for (const rangeId of set) {
      const range = this.ranges[rangeId];
      if (range && range.onChange) {
        range.onChange(type, this.notifyChangeSheetId);
      }
    }
    set.clear();
  }
}
