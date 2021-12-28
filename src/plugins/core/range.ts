import { INCORRECT_RANGE_STRING } from "../../constants";
import {
  createAdaptedZone,
  getComposerSheetName,
  groupConsecutive,
  isZoneValid,
  numberToLetters,
  rangeReference,
  toUnboundZone,
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
} from "../../types/index";

export class RangeAdapter implements CommandHandler<CoreCommand> {
  private getters: Getters;
  private providers: Array<RangeProvider["adaptRanges"]> = [];
  constructor(getters: Getters) {
    this.getters = getters;
  }

  static getters = ["getRangeString", "getRangeFromSheetXC", "createAdaptedRanges"] as const;

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
            const min = Math.min(...group);
            const max = Math.max(...group);
            if (range.zone[start] <= min && min <= range.zone[end]) {
              const toRemove = Math.min(range.zone[end], max) - min + 1;
              changeType = "RESIZE";
              newRange = this.createAdaptedRange(newRange, dimension, changeType, -toRemove);
            }
            if (min < range.zone[start]) {
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
          range = range.clone();
          range.invalidSheetName = this.getters.getSheetName(cmd.sheetId);
          range.sheetId = "";
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
            const newRange = range.clone();
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

  private createAdaptedRange(
    range: Range,
    dimension: "columns" | "rows",
    operation: "MOVE" | "RESIZE",
    by: number
  ) {
    const adaptedRange = range.clone();
    adaptedRange.unboundZone = createAdaptedZone(range.unboundZone, dimension, operation, by);
    return adaptedRange;
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

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  createAdaptedRanges(ranges: Range[], offsetX: number, offsetY: number, sheetId: UID): Range[] {
    return ranges.map((range) => {
      if (!isZoneValid(range.zone)) {
        return range;
      } // TODO : testing
      range = range.clone();
      range.sheetId = range.prefixSheet ? range.sheetId : sheetId;
      range.zone = {
        // Don't shift left if the range is a full row without header
        left:
          range.isFullRow && !range.unboundZone.hasHeader
            ? range.zone.left
            : range.zone.left + (range.parts[0].colFixed ? 0 : offsetX),
        // Don't shift right if the range is a full row
        right: range.isFullRow
          ? range.zone.right
          : range.zone.right + ((range.parts[1] || range.parts[0]).colFixed ? 0 : offsetX),
        // Don't shift left if the range is a column row without header
        top:
          range.isFullCol && !range.unboundZone.hasHeader
            ? range.zone.top
            : range.zone.top + (range.parts[0].rowFixed ? 0 : offsetY),
        // Don't shift right if the range is a full column
        bottom: range.isFullCol
          ? range.zone.bottom
          : range.zone.bottom + ((range.parts[1] || range.parts[0]).rowFixed ? 0 : offsetY),
      };
      range.orderZone();
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
    let sheetName: string = "";
    let sheetId: UID | undefined;
    let invalidSheetName: string | undefined;
    let prefixSheet: boolean = false;
    if (!rangeReference.test(sheetXC)) {
      return this.buildInvalidRange(sheetXC);
    }
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
    const zone = toUnboundZone(xc);

    let rangeParts: RangePart[] = xc.split(":").map((p) => {
      return {
        colFixed: p.startsWith("$"),
        rowFixed: p.includes("$", 1),
      };
    });

    const range = new Range(
      {
        sheetId: sheetId || defaultSheetId,
        zone: zone,
        parts: rangeParts,
        invalidSheetName: invalidSheetName,
        prefixSheet: prefixSheet,
      },
      this.getters.getSheetSize
    );
    range.orderZone();

    return range;
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

    let rangeString = this.getRangePartString(range, 0);
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
        rangeString += ":";
        rangeString += this.getRangePartString(range, 1);
      }
    }

    return `${prefixSheet ? sheetName + "!" : ""}${rangeString}`;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Get a Xc string that represent a part of a range
   */
  private getRangePartString(range: Range, part: 0 | 1): string {
    const colFixed = range.parts && range.parts[part].colFixed ? "$" : "";
    const col = part === 0 ? numberToLetters(range.zone.left) : numberToLetters(range.zone.right);
    const rowFixed = range.parts && range.parts[part].rowFixed ? "$" : "";
    const row = part === 0 ? String(range.zone.top + 1) : String(range.zone.bottom + 1);

    let str = "";
    if (range.isFullCol) {
      if (part === 0 && range.unboundZone.hasHeader) {
        str = colFixed + col + rowFixed + row;
      } else {
        str = colFixed + col;
      }
    } else if (range.isFullRow) {
      if (part === 0 && range.unboundZone.hasHeader) {
        str = colFixed + col + rowFixed + row;
      } else {
        str = rowFixed + row;
      }
    } else {
      str = colFixed + col + rowFixed + row;
    }

    return str;
  }

  private buildInvalidRange(invalidXc: string): Range {
    return new Range(
      {
        sheetId: "",
        zone: { left: -1, top: -1, right: -1, bottom: -1 },
        parts: [],
        invalidXc: invalidXc,
        prefixSheet: false,
      },
      this.getters.getSheetSize
    );
  }
}
