import { Mode } from "../../model";
import { ChangeType, Command, onRangeChange, Range, RangePart, UID } from "../../types/index";
import {
  getComposerSheetName,
  isDefined,
  numberToLetters,
  toZone,
  uuidv4,
} from "../../helpers/index";
import { _lt } from "../../translation";
import { CorePlugin } from "../core_plugin";

interface RangeState {
  ranges: Record<UID, Range | undefined>;
}

export class RangePlugin extends CorePlugin<RangeState> {
  static getters = ["getRangeString", "getRangeFromSheetXC"];
  static modes: Mode[] = ["normal", "readonly", "headless"];
  static pluginName = "range";

  public readonly ranges: Record<UID, Range | undefined> = {};
  private notifyResize: Set<UID> = new Set<UID>();
  private notifyMove: Set<UID> = new Set<UID>();
  private notifyRemove: Set<UID> = new Set<UID>();
  private notifyChange: Set<UID> = new Set<UID>();
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
            if (range.zone.left <= cmd.column && cmd.column <= range.zone.right) {
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
      case "UPDATE_CELL":
        this.notifyChangeSheetId = cmd.sheetId;

        for (let range of Object.values(this.ranges)
          .filter(isDefined)
          .filter((r) => r.sheetId === cmd.sheetId)) {
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
   * @param onChange a function that will be called if this range is modified
   */
  getRangeFromSheetXC(defaultSheetId: UID, sheetXC: string, onChange?: onRangeChange): Range {
    let xc = sheetXC;
    let sheetName = "";
    let sheetId;
    let invalidSheetName;
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
    let zone = toZone(xc);

    let rangeParts: RangePart[] = xc.split(":").map((p) => {
      return {
        colFixed: p.startsWith("$"),
        rowFixed: p.includes("$", 1),
      };
    });

    let r: Range = {
      id: uuidv4(),
      sheetId: sheetId || defaultSheetId,
      zone: zone,
      onChange: onChange,
      parts: rangeParts,
      invalidSheetName,
      prefixSheet,
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
      return "#REF";
    }

    if (r.zone.bottom - r.zone.top < 0 || r.zone.right - r.zone.left < 0) {
      return "#REF";
    }
    let prefixSheet = r.sheetId !== forSheetId || r.invalidSheetName || r.prefixSheet;
    let sheetName: string = "";
    if (prefixSheet) {
      if (r.invalidSheetName) {
        sheetName = r.invalidSheetName;
      } else {
        const s = this.getters.getSheetName(r.sheetId);
        if (s) {
          sheetName = getComposerSheetName(s);
        }
      }
    }

    let ref: string[] = Array(9);
    ref.push(r.parts && r.parts[0].colFixed ? "$" : "");
    ref.push(numberToLetters(r.zone.left));
    ref.push(r.parts && r.parts[0].rowFixed ? "$" : "");
    ref.push(String(r.zone.top + 1));
    if (r.parts && r.parts.length === 2) {
      // this if converts A2:A2 into A2 except if any part of the original range had fixed row or column (with $)
      if (
        r.zone.top !== r.zone.bottom ||
        r.zone.left !== r.zone.right ||
        r.parts[0].rowFixed ||
        r.parts[0].colFixed ||
        r.parts[1].rowFixed ||
        r.parts[1].colFixed
      ) {
        ref.push(":");
        ref.push(r.parts[1].colFixed ? "$" : "");
        ref.push(numberToLetters(r.zone.right));
        ref.push(r.parts[1].rowFixed ? "$" : "");
        ref.push(String(r.zone.bottom + 1));
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
        range.onChange!(type, this.notifyChangeSheetId);
      }
    }
    set.clear();
  }
}
