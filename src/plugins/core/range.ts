import {
  getComposerSheetName,
  getShiftedRange,
  getUnquotedSheetName,
  groupConsecutive,
  numberToLetters,
  toZone,
} from "../../helpers/index";
import {
  ApplyRangeChange,
  ApplyRangeChangeResult,
  ChangeType,
  Command,
  CommandHandler,
  CommandResult,
  Getters,
  Range,
  RangePart,
  RangeProvider,
  UID,
} from "../../types/index";

export const INCORRECT_RANGE_STRING = "#REF";

export class RangePlugin implements CommandHandler {
  private modelGetters: Getters;
  private providers: Array<RangeProvider["adaptRanges"]> = [];
  constructor(getters: Getters) {
    this.modelGetters = getters;
  }

  static getters = ["getRangeString", "getRangeFromSheetXC"];

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  allowDispatch(command: Command): CommandResult {
    return { status: "SUCCESS" };
  }
  beforeHandle(command: Command) {}

  verifyRangeRemoved(adaptRange: ApplyRangeChange): ApplyRangeChange {
    return (range: Range) => {
      const result: ApplyRangeChangeResult = adaptRange(range);
      if (
        result.changeType !== "NONE" &&
        result.range &&
        (result.range.zone.right - result.range.zone.left < 0 ||
          result.range.zone.bottom - result.range.zone.top < 0)
      ) {
        return { range: result.range, changeType: "REMOVE" };
      }
      return result;
    };
  }

  executeOnAllRanges(adaptRange: ApplyRangeChange, sheetId?: UID) {
    const func = this.verifyRangeRemoved(adaptRange);
    for (const provider of this.providers) {
      provider(func, sheetId);
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_COLUMNS":
      case "REMOVE_ROWS": {
        let start: "left" | "top" = cmd.type === "REMOVE_COLUMNS" ? "left" : "top";
        let end: "right" | "bottom" = cmd.type === "REMOVE_COLUMNS" ? "right" : "bottom";
        let dimension = cmd.type === "REMOVE_COLUMNS" ? "columns" : "rows";

        cmd[dimension].sort((a, b) => b - a);

        const groups = groupConsecutive(cmd[dimension]);
        this.executeOnAllRanges((range: Range) => {
          let newRange = range;
          let changeType: ChangeType = "NONE";
          for (let group of groups) {
            const min = Math.min(...group);
            const max = Math.max(...group);
            if (range.zone[start] <= min && min <= range.zone[end]) {
              const toRemove = Math.min(range.zone[end], max) - min + 1;
              newRange = getShiftedRange(newRange, { [end]: -toRemove });
              changeType = "RESIZE";
            }
            if (min < range.zone[start]) {
              newRange = getShiftedRange(newRange, {
                [end]: -(max - min + 1),
                [start]: -(max - min + 1),
              });
              changeType = "MOVE";
            }
          }
          if (changeType !== "NONE") {
            return { changeType, range: newRange };
          }
          return { changeType: "NONE" };
        }, cmd.sheetId);
        break;
      }
      case "ADD_ROWS":
      case "ADD_COLUMNS": {
        const start: "left" | "top" = cmd.type === "ADD_COLUMNS" ? "left" : "top";
        const end: "right" | "bottom" = cmd.type === "ADD_COLUMNS" ? "right" : "bottom";
        const dimension = cmd.type === "ADD_COLUMNS" ? "column" : "row";
        this.executeOnAllRanges((range: Range) => {
          if (cmd.position === "after") {
            if (range.zone[start] <= cmd[dimension] && cmd[dimension] < range.zone[end]) {
              return { changeType: "RESIZE", range: getShiftedRange(range, { [end]: 1 }) };
            }
            if (cmd[dimension] < range.zone[start]) {
              return {
                changeType: "MOVE",
                range: getShiftedRange(range, { [start]: 1, [end]: 1 }),
              };
            }
          } else {
            if (range.zone[start] < cmd[dimension] && cmd[dimension] <= range.zone[end]) {
              return { changeType: "RESIZE", range: getShiftedRange(range, { [end]: 1 }) };
            }
            if (cmd[dimension] <= range.zone[start]) {
              return {
                changeType: "MOVE",
                range: getShiftedRange(range, { [start]: 1, [end]: 1 }),
              };
            }
          }
          return { changeType: "NONE" };
        }, cmd.sheetId);

        break;
      }
      case "DELETE_SHEET": {
        this.executeOnAllRanges((range: Range) => {
          range = {
            ...range,
            zone: { ...range.zone },
            invalidSheetName: this.modelGetters.getSheetName(cmd.sheetId),
            sheetId: "",
          };
          return { changeType: "REMOVE", range };
        }, cmd.sheetId);

        break;
      }
      case "CREATE_SHEET":
      case "RENAME_SHEET": {
        this.executeOnAllRanges((range: Range) => {
          if (range.sheetId === cmd.sheetId) {
            return { changeType: "CHANGE", range };
          }
          if (cmd.name && range.invalidSheetName === cmd.name) {
            const newRange = { ...range, zone: { ...range.zone } };
            newRange.invalidSheetName = undefined;
            newRange.sheetId = cmd.sheetId;
            return { changeType: "CHANGE", range: newRange };
          }
          return { changeType: "NONE" };
        });
        break;
      }
    }
  }

  finalize(command: Command) {}

  addRangeProvider(provider: RangeProvider["adaptRanges"]) {
    this.providers.push(provider);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Creates a range from a XC reference that can contain a sheet reference
   * @param defaultSheetId the sheet to default to if the sheetXC parameter does not contain a sheet reference (usually the active sheet Id)
   * @param sheetXC the string description of a range, in the form SheetName!XC:XC
   */
  getRangeFromSheetXC(defaultSheetId: UID, sheetXC: string): Range {
    let xc = sheetXC;
    let sheetName: string = "";
    let sheetId: UID | undefined;
    let invalidSheetName: string | undefined;
    let prefixSheet: boolean = false;
    if (sheetXC.includes("!")) {
      [xc, sheetName] = sheetXC.split("!").reverse();
      if (sheetName) {
        sheetId = this.modelGetters.getSheetIdByName(getUnquotedSheetName(sheetName));
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
      sheetId: sheetId || defaultSheetId,
      zone: zone,
      parts: rangeParts,
      invalidSheetName,
      prefixSheet,
    };
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
        const s = this.modelGetters.getSheetName(range.sheetId);
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
}
