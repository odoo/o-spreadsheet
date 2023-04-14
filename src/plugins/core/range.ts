import { INCORRECT_RANGE_STRING } from "../../constants";
import {
  createAdaptedZone,
  getCanonicalSheetName,
  groupConsecutive,
  isZoneInside,
  isZoneValid,
  numberToLetters,
  RangeImpl,
  rangeReference,
  splitReference,
  toUnboundedZone,
} from "../../helpers/index";
import {
  ApplyRangeChange,
  ApplyRangeChangeResult,
  ChangeType,
  Command,
  CommandHandler,
  CommandResult,
  CoreCommand,
  CoreGetters,
  Range,
  RangeData,
  RangeProvider,
  UID,
  Zone,
} from "../../types/index";

export class RangeAdapter implements CommandHandler<CoreCommand> {
  private getters: CoreGetters;
  private providers: Array<RangeProvider["adaptRanges"]> = [];
  constructor(getters: CoreGetters) {
    this.getters = getters;
  }

  static getters = [
    "getRangeString",
    "getRangeFromSheetXC",
    "createAdaptedRanges",
    "getRangeDataFromXc",
    "getRangeDataFromZone",
    "getRangeFromRangeData",
  ] as const;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  allowDispatch(cmd: Command): CommandResult {
    if (cmd.type === "MOVE_RANGES") {
      return cmd.target.length === 1 ? CommandResult.Success : CommandResult.InvalidZones;
    }
    return CommandResult.Success;
  }
  beforeHandle(command: Command) {}

  handle(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_COLUMNS_ROWS": {
        let start: "left" | "top" = cmd.dimension === "COL" ? "left" : "top";
        let end: "right" | "bottom" = cmd.dimension === "COL" ? "right" : "bottom";
        let dimension: "columns" | "rows" = cmd.dimension === "COL" ? "columns" : "rows";

        const elements = [...cmd.elements];
        elements.sort((a, b) => b - a);

        const groups = groupConsecutive(elements);
        this.executeOnAllRanges((range: RangeImpl) => {
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
            } else if (range.zone[start] >= min && range.zone[end] <= max) {
              changeType = "REMOVE";
              newRange = range.clone({ ...this.getInvalidRange() });
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

        this.executeOnAllRanges((range: RangeImpl) => {
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
        this.executeOnAllRanges((range: RangeImpl) => {
          if (range.sheetId !== cmd.sheetId) {
            return { changeType: "NONE" };
          }
          const invalidSheetName = this.getters.getSheetName(cmd.sheetId);
          range = range.clone({
            ...this.getInvalidRange(),
            invalidSheetName,
          });
          return { changeType: "REMOVE", range };
        }, cmd.sheetId);

        break;
      }
      case "RENAME_SHEET": {
        this.executeOnAllRanges((range: RangeImpl) => {
          if (range.sheetId === cmd.sheetId) {
            return { changeType: "CHANGE", range };
          }
          if (cmd.name && range.invalidSheetName === cmd.name) {
            const invalidSheetName = undefined;
            const sheetId = cmd.sheetId;
            const newRange = range.clone({ sheetId, invalidSheetName });
            return { changeType: "CHANGE", range: newRange };
          }
          return { changeType: "NONE" };
        });
        break;
      }
      case "MOVE_RANGES": {
        const originZone = cmd.target[0];
        this.executeOnAllRanges((range: RangeImpl) => {
          if (range.sheetId !== cmd.sheetId || !isZoneInside(range.zone, originZone)) {
            return { changeType: "NONE" };
          }
          const targetSheetId = cmd.targetSheetId;
          const offsetX = cmd.col - originZone.left;
          const offsetY = cmd.row - originZone.top;
          const adaptedRange = this.createAdaptedRange(range, "both", "MOVE", [offsetX, offsetY]);
          const prefixSheet = cmd.sheetId === targetSheetId ? adaptedRange.prefixSheet : true;
          return {
            changeType: "MOVE",
            range: adaptedRange.clone({ sheetId: targetSheetId, prefixSheet }),
          };
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
    return (range: RangeImpl) => {
      const result: ApplyRangeChangeResult = adaptRange(range);
      if (result.changeType !== "NONE" && !isZoneValid(result.range.zone)) {
        return { range: result.range, changeType: "REMOVE" };
      }
      return result;
    };
  }

  private createAdaptedRange<Dimension extends "columns" | "rows" | "both">(
    range: RangeImpl,
    dimension: Dimension,
    operation: "MOVE" | "RESIZE",
    by: Dimension extends "both" ? [number, number] : number
  ) {
    const zone = createAdaptedZone(range.unboundedZone, dimension, operation, by);
    const adaptedRange = range.clone({ zone });
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
    const rangesImpl = ranges.map((range) => RangeImpl.fromRange(range, this.getters));
    return rangesImpl.map((range) => {
      if (!isZoneValid(range.zone)) {
        return range;
      }
      const copySheetId = range.prefixSheet ? range.sheetId : sheetId;
      const unboundZone = {
        ...range.unboundedZone,
        // Don't shift left if the range is a full row without header
        left:
          range.isFullRow && !range.unboundedZone.hasHeader
            ? range.unboundedZone.left
            : range.unboundedZone.left + (range.parts[0].colFixed ? 0 : offsetX),
        // Don't shift right if the range is a full row
        right: range.isFullRow
          ? range.unboundedZone.right
          : range.unboundedZone.right! +
            ((range.parts[1] || range.parts[0]).colFixed ? 0 : offsetX),
        // Don't shift up if the range is a column row without header
        top:
          range.isFullCol && !range.unboundedZone.hasHeader
            ? range.unboundedZone.top
            : range.unboundedZone.top + (range.parts[0].rowFixed ? 0 : offsetY),
        // Don't shift down if the range is a full column
        bottom: range.isFullCol
          ? range.unboundedZone.bottom
          : range.unboundedZone.bottom! +
            ((range.parts[1] || range.parts[0]).rowFixed ? 0 : offsetY),
      };
      return range.clone({ sheetId: copySheetId, zone: unboundZone }).orderZone();
    });
  }

  /**
   * Creates a range from a XC reference that can contain a sheet reference
   * @param defaultSheetId the sheet to default to if the sheetXC parameter does not contain a sheet reference (usually the active sheet Id)
   * @param sheetXC the string description of a range, in the form SheetName!XC:XC
   */
  getRangeFromSheetXC(defaultSheetId: UID, sheetXC: string): RangeImpl {
    if (!rangeReference.test(sheetXC)) {
      return new RangeImpl(
        {
          sheetId: "",
          zone: { left: -1, top: -1, right: -1, bottom: -1 },
          parts: [],
          invalidXc: sheetXC,
          prefixSheet: false,
        },
        this.getters.getSheetSize
      );
    }

    let sheetName: string | undefined;
    let xc = sheetXC;
    let prefixSheet = false;
    if (sheetXC.includes("!")) {
      ({ xc, sheetName } = splitReference(sheetXC));
      if (sheetName) {
        prefixSheet = true;
      }
    }
    const zone = toUnboundedZone(xc);
    const parts = RangeImpl.getRangeParts(xc, zone);
    const invalidSheetName =
      sheetName && !this.getters.getSheetIdByName(sheetName) ? sheetName : undefined;
    const sheetId = this.getters.getSheetIdByName(sheetName) || defaultSheetId;

    const rangeInterface = { prefixSheet, zone, sheetId, invalidSheetName, parts };

    return new RangeImpl(rangeInterface, this.getters.getSheetSize).orderZone();
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
    const rangeImpl = RangeImpl.fromRange(range, this.getters);
    let prefixSheet =
      rangeImpl.sheetId !== forSheetId || rangeImpl.invalidSheetName || rangeImpl.prefixSheet;
    let sheetName: string = "";
    if (prefixSheet) {
      if (rangeImpl.invalidSheetName) {
        sheetName = rangeImpl.invalidSheetName;
      } else {
        sheetName = getCanonicalSheetName(this.getters.getSheetName(rangeImpl.sheetId));
      }
    }

    if (prefixSheet && !sheetName) {
      return INCORRECT_RANGE_STRING;
    }

    let rangeString = this.getRangePartString(rangeImpl, 0);
    if (rangeImpl.parts && rangeImpl.parts.length === 2) {
      // this if converts A2:A2 into A2 except if any part of the original range had fixed row or column (with $)
      if (
        rangeImpl.zone.top !== rangeImpl.zone.bottom ||
        rangeImpl.zone.left !== rangeImpl.zone.right ||
        rangeImpl.parts[0].rowFixed ||
        rangeImpl.parts[0].colFixed ||
        rangeImpl.parts[1].rowFixed ||
        rangeImpl.parts[1].colFixed
      ) {
        rangeString += ":";
        rangeString += this.getRangePartString(rangeImpl, 1);
      }
    }

    return `${prefixSheet ? sheetName + "!" : ""}${rangeString}`;
  }

  getRangeDataFromXc(sheetId: UID, xc: string): RangeData {
    return this.getters.getRangeFromSheetXC(sheetId, xc).rangeData;
  }

  getRangeDataFromZone(sheetId: UID, zone: Zone): RangeData {
    return { _sheetId: sheetId, _zone: zone };
  }

  getRangeFromRangeData(data: RangeData): Range {
    const rangeInterface = {
      prefixSheet: false,
      zone: data._zone,
      sheetId: data._sheetId,
      invalidSheetName: undefined,
      parts: [
        { colFixed: false, rowFixed: false },
        { colFixed: false, rowFixed: false },
      ],
    };

    return new RangeImpl(rangeInterface, this.getters.getSheetSize);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Get a Xc string that represent a part of a range
   */
  private getRangePartString(range: RangeImpl, part: 0 | 1): string {
    const colFixed = range.parts && range.parts[part].colFixed ? "$" : "";
    const col = part === 0 ? numberToLetters(range.zone.left) : numberToLetters(range.zone.right);
    const rowFixed = range.parts && range.parts[part].rowFixed ? "$" : "";
    const row = part === 0 ? String(range.zone.top + 1) : String(range.zone.bottom + 1);

    let str = "";
    if (range.isFullCol) {
      if (part === 0 && range.unboundedZone.hasHeader) {
        str = colFixed + col + rowFixed + row;
      } else {
        str = colFixed + col;
      }
    } else if (range.isFullRow) {
      if (part === 0 && range.unboundedZone.hasHeader) {
        str = colFixed + col + rowFixed + row;
      } else {
        str = rowFixed + row;
      }
    } else {
      str = colFixed + col + rowFixed + row;
    }

    return str;
  }

  private getInvalidRange() {
    return {
      parts: [],
      prefixSheet: false,
      zone: { left: -1, top: -1, right: -1, bottom: -1 },
      sheetId: "",
      invalidXc: INCORRECT_RANGE_STRING,
    };
  }
}
