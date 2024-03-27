import { INCORRECT_RANGE_STRING } from "../../constants";
import {
  createAdaptedZone,
  getComposerSheetName,
  groupConsecutive,
  isZoneValid,
  largeMax,
  largeMin,
  numberToLetters,
  rangeReference,
  splitReference,
  toZoneWithoutBoundaryChanges,
} from "../../helpers/index";
import {
  ApplyRangeChange,
  ApplyRangeChangeResult,
  ChangeType,
  Command,
  CommandHandler,
  CommandResult,
  CoreCommand,
  Getters,
  Range,
  RangePart,
  RangeProvider,
  UID,
  Zone,
} from "../../types/index";

export class RangeAdapter implements CommandHandler<CoreCommand> {
  private getters: Getters;
  private providers: Array<RangeProvider["adaptRanges"]> = [];
  constructor(getters: Getters) {
    this.getters = getters;
  }

  static getters = ["getRangeString", "getRangeFromSheetXC", "createAdaptedRanges"];

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  allowDispatch(command: Command): CommandResult {
    return CommandResult.Success;
  }
  beforeHandle(command: Command) {}

  handle(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_COLUMNS_ROWS": {
        let start: "left" | "top" = cmd.dimension === "COL" ? "left" : "top";
        let end: "right" | "bottom" = cmd.dimension === "COL" ? "right" : "bottom";
        let dimension: "columns" | "rows" = cmd.dimension === "COL" ? "columns" : "rows";

        cmd.elements.sort((a, b) => b - a);

        const groups = groupConsecutive(cmd.elements);
        this.executeOnAllRanges((range: Range) => {
          if (range.sheetId !== cmd.sheetId) {
            return { changeType: "NONE" };
          }
          let newRange = range;
          let changeType: ChangeType = "NONE";
          for (let group of groups) {
            const min = largeMin(group);
            const max = largeMax(group);
            if (range.zone[start] <= min && min <= range.zone[end]) {
              const toRemove = Math.min(range.zone[end], max) - min + 1;
              changeType = "RESIZE";
              newRange = this.createAdaptedRange(newRange, dimension, changeType, -toRemove);
            } else if (range.zone[start] >= min && range.zone[end] <= max) {
              changeType = "REMOVE";
              newRange = this.buildInvalidRange(INCORRECT_RANGE_STRING);
            } else if (range.zone[start] <= max && range.zone[end] >= max) {
              const toRemove = max - range.zone[start] + 1;
              changeType = "RESIZE";
              newRange = this.createAdaptedRange(newRange, dimension, changeType, -toRemove);
              newRange = this.createAdaptedRange(
                newRange,
                dimension,
                "MOVE",
                -(range.zone[start] - min)
              );
            } else if (min < range.zone[start]) {
              changeType = "MOVE";
              newRange = this.createAdaptedRange(newRange, dimension, changeType, -(max - min + 1));
            }
          }
          if (changeType !== "NONE") {
            return { changeType, range: newRange };
          }
          return { changeType: "NONE" };
        }, cmd.sheetId);
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        let start: "left" | "top" = cmd.dimension === "COL" ? "left" : "top";
        let end: "right" | "bottom" = cmd.dimension === "COL" ? "right" : "bottom";
        let dimension: "columns" | "rows" = cmd.dimension === "COL" ? "columns" : "rows";

        this.executeOnAllRanges((range: Range) => {
          if (range.sheetId !== cmd.sheetId) {
            return { changeType: "NONE" };
          }
          if (cmd.position === "after") {
            if (range.zone[start] <= cmd.base && cmd.base < range.zone[end]) {
              return {
                changeType: "RESIZE",
                range: this.createAdaptedRange(range, dimension, "RESIZE", cmd.quantity),
              };
            }
            if (cmd.base < range.zone[start]) {
              return {
                changeType: "MOVE",
                range: this.createAdaptedRange(range, dimension, "MOVE", cmd.quantity),
              };
            }
          } else {
            if (range.zone[start] < cmd.base && cmd.base <= range.zone[end]) {
              return {
                changeType: "RESIZE",
                range: this.createAdaptedRange(range, dimension, "RESIZE", cmd.quantity),
              };
            }
            if (cmd.base <= range.zone[start]) {
              return {
                changeType: "MOVE",
                range: this.createAdaptedRange(range, dimension, "MOVE", cmd.quantity),
              };
            }
          }
          return { changeType: "NONE" };
        }, cmd.sheetId);

        break;
      }
      case "DELETE_SHEET": {
        this.executeOnAllRanges((range: Range) => {
          if (range.sheetId !== cmd.sheetId) {
            return { changeType: "NONE" };
          }
          range = {
            ...this.buildInvalidRange(INCORRECT_RANGE_STRING),
            invalidSheetName: this.getters.getSheetName(cmd.sheetId),
          };
          return { changeType: "REMOVE", range };
        }, cmd.sheetId);

        break;
      }
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

  finalize() {}

  /**
   * Return a modified adapting function that verifies that after adapting a range, the range is still valid.
   * Any range that gets adapted by the function adaptRange in parameter does so
   * without caring if the start and end of the range in both row and column
   * direction can be incorrect. This function ensure that an incorrect range gets removed.
   */
  private verifyRangeRemoved(adaptRange: ApplyRangeChange): ApplyRangeChange {
    return (range: Range) => {
      const result: ApplyRangeChangeResult = adaptRange(range);
      if (result.changeType !== "NONE" && !isZoneValid(result.range.zone)) {
        return { range: result.range, changeType: "REMOVE" };
      }
      return result;
    };
  }

  private createAdaptedRange(
    range: Range,
    dimension: "columns" | "rows",
    operation: "MOVE" | "RESIZE",
    by: number
  ) {
    return {
      ...range,
      zone: createAdaptedZone(range.zone, dimension, operation, by),
    };
  }

  private executeOnAllRanges(adaptRange: ApplyRangeChange, sheetId?: UID) {
    const func = this.verifyRangeRemoved(adaptRange);
    for (const provider of this.providers) {
      provider(func, sheetId);
    }
  }

  /**
   * Stores the functions bound to each plugin to be able to iterate over all ranges of the application,
   * without knowing any details of the internal data structure of the plugins and without storing ranges
   * in the range adapter.
   *
   * @param provider a function bound to a plugin that will loop over its internal data structure to find
   * all ranges
   */
  addRangeProvider(provider: RangeProvider["adaptRanges"]) {
    this.providers.push(provider);
  }

  /**
   * Check that a zone is valid regarding the order of top-bottom and left-right.
   * Left should be smaller than right, top should be smaller than bottom.
   * If it's not the case, simply invert them, and invert the linked parts
   * (in place!)
   */
  private orderZone(zone: Zone, parts: RangePart[]) {
    if (zone.right < zone.left) {
      let right = zone.right;
      zone.right = zone.left;
      zone.left = right;

      let rightFixed = parts[1].colFixed;
      parts[1].colFixed = parts[0].colFixed;
      parts[0].colFixed = rightFixed;
    }

    if (zone.bottom < zone.top) {
      let bottom = zone.bottom;
      zone.bottom = zone.top;
      zone.top = bottom;

      let bottomFixed = parts[1].rowFixed;
      parts[1].rowFixed = parts[0].rowFixed;
      parts[0].rowFixed = bottomFixed;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  createAdaptedRanges(ranges: Range[], offsetX: number, offsetY: number, sheetId: UID): Range[] {
    return ranges.map((range) => {
      if (!isZoneValid(range.zone)) {
        return range;
      }
      range = {
        ...range,
        sheetId: range.prefixSheet ? range.sheetId : sheetId,
        zone: {
          left: range.zone.left + (range.parts[0].colFixed ? 0 : offsetX),
          right: range.zone.right + ((range.parts[1] || range.parts[0]).colFixed ? 0 : offsetX),
          top: range.zone.top + (range.parts[0].rowFixed ? 0 : offsetY),
          bottom: range.zone.bottom + ((range.parts[1] || range.parts[0]).rowFixed ? 0 : offsetY),
        },
      };
      this.orderZone(range.zone, range.parts);
      return range;
    });
  }

  /**
   * Creates a range from a XC reference that can contain a sheet reference
   * @param defaultSheetId the sheet to default to if the sheetXC parameter does not contain a sheet reference (usually the active sheet Id)
   * @param sheetXC the string description of a range, in the form SheetName!XC:XC
   */
  getRangeFromSheetXC(defaultSheetId: UID, sheetXC: string): Range {
    let xc = sheetXC;
    let sheetName: string | undefined;
    let sheetId: UID | undefined;
    let invalidSheetName: string | undefined;
    let prefixSheet: boolean = false;
    if (!rangeReference.test(sheetXC)) {
      return this.buildInvalidRange(sheetXC);
    }
    if (sheetXC.includes("!")) {
      ({ xc, sheetName } = splitReference(sheetXC));
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
    const zone = toZoneWithoutBoundaryChanges(xc);

    let rangeParts: RangePart[] = xc.split(":").map((p) => {
      return {
        colFixed: p.startsWith("$"),
        rowFixed: p.includes("$", 1),
      };
    });

    this.orderZone(zone, rangeParts);

    return {
      sheetId: sheetId || defaultSheetId,
      zone: zone,
      parts: rangeParts,
      invalidSheetName,
      prefixSheet,
    };
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
    if (range.invalidXc) {
      return range.invalidXc;
    }
    if (range.zone.bottom - range.zone.top < 0 || range.zone.right - range.zone.left < 0) {
      return INCORRECT_RANGE_STRING;
    }
    if (range.zone.left < 0 || range.zone.top < 0) {
      return INCORRECT_RANGE_STRING;
    }
    let prefixSheet = range.sheetId !== forSheetId || range.invalidSheetName || range.prefixSheet;
    let sheetName: string = "";
    if (prefixSheet) {
      if (range.invalidSheetName) {
        sheetName = range.invalidSheetName;
      } else {
        sheetName = getComposerSheetName(this.getters.getSheetName(range.sheetId));
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

  private buildInvalidRange(invalidXc: string): Range {
    return {
      parts: [],
      prefixSheet: false,
      zone: { left: -1, top: -1, right: -1, bottom: -1 },
      sheetId: "",
      invalidXc,
    };
  }
}
