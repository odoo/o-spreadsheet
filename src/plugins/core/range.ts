import { compile } from "../../formulas";
import {
  createInvalidRange,
  createRange,
  createRangeFromXc,
  duplicateRangeInDuplicatedSheet,
  getRangeAdapter,
  getRangeString,
  isFullColRange,
  isFullRowRange,
  isZoneValid,
  orderRange,
  rangeReference,
  recomputeZones,
  splitReference,
  unionUnboundedZones,
} from "../../helpers/index";
import { CellErrorType } from "../../types/errors";
import {
  AdaptSheetName,
  ApplyRangeChange,
  ApplyRangeChangeResult,
  Command,
  CommandHandler,
  CommandResult,
  CoreCommand,
  CoreGetters,
  Dimension,
  Range,
  RangeData,
  RangeProvider,
  RangeStringOptions,
  UID,
  UnboundedZone,
  Zone,
} from "../../types/index";

export class RangeAdapter implements CommandHandler<CoreCommand> {
  private getters: CoreGetters;
  private providers: Array<RangeProvider["adaptRanges"]> = [];
  constructor(getters: CoreGetters) {
    this.getters = getters;
  }

  static getters = [
    "adaptFormulaStringDependencies",
    "copyFormulaStringForSheet",
    "extendRange",
    "getRangeString",
    "getRangeFromSheetXC",
    "createAdaptedRanges",
    "getRangeData",
    "getRangeDataFromXc",
    "getRangeDataFromZone",
    "getRangeFromRangeData",
    "getRangeFromZone",
    "getRangesUnion",
    "recomputeRanges",
    "isRangeValid",
    "removeRangesSheetPrefix",
  ] as const;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  allowDispatch(cmd: CoreCommand): CommandResult {
    if (cmd.type === "MOVE_RANGES") {
      return cmd.target.length === 1 ? CommandResult.Success : CommandResult.InvalidZones;
    }
    return CommandResult.Success;
  }
  beforeHandle(command: Command) {}

  handle(cmd: CoreCommand) {
    const rangeAdapter = getRangeAdapter(cmd);
    if (rangeAdapter?.applyChange) {
      this.executeOnAllRanges(
        rangeAdapter.applyChange,
        rangeAdapter.sheetId,
        rangeAdapter.sheetName
      );
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

  private executeOnAllRanges(
    adaptRange: ApplyRangeChange,
    sheetId: UID,
    sheetName: AdaptSheetName
  ) {
    const func = this.verifyRangeRemoved(adaptRange);
    for (const provider of this.providers) {
      provider(func, sheetId, sheetName);
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
      }
      const copySheetId = range.prefixSheet ? range.sheetId : sheetId;
      const isFullRow = isFullRowRange(range);
      const isFullCol = isFullColRange(range);
      const parts = range.parts ?? [
        { colFixed: false, rowFixed: false },
        { colFixed: false, rowFixed: false },
      ];
      const unboundZone = {
        ...range.unboundedZone,
        // Don't shift left if the range is a full row without header
        left:
          isFullRow && !range.unboundedZone.hasHeader
            ? range.unboundedZone.left
            : range.unboundedZone.left + (parts[0].colFixed ? 0 : offsetX),
        // Don't shift right if the range is a full row
        right: isFullRow
          ? range.unboundedZone.right
          : range.unboundedZone.right! + ((parts[1] || parts[0]).colFixed ? 0 : offsetX),
        // Don't shift up if the range is a column row without header
        top:
          isFullCol && !range.unboundedZone.hasHeader
            ? range.unboundedZone.top
            : range.unboundedZone.top + (parts[0].rowFixed ? 0 : offsetY),
        // Don't shift down if the range is a full column
        bottom: isFullCol
          ? range.unboundedZone.bottom
          : range.unboundedZone.bottom! + ((parts[1] || parts[0]).rowFixed ? 0 : offsetY),
      };
      return orderRange(
        createRange(
          { ...range, sheetId: copySheetId, zone: unboundZone },
          this.getters.getSheetSize
        )
      );
    });
  }

  /**
   * Remove the sheet name prefix if a range is part of the given sheet.
   */
  removeRangesSheetPrefix(sheetId: UID, ranges: Range[]): Range[] {
    return ranges.map((range) => {
      if (range.prefixSheet && range.sheetId === sheetId) {
        return { ...range, prefixSheet: false };
      }
      return range;
    });
  }

  extendRange(range: Range, dimension: Dimension, quantity: number): Range {
    const right = dimension === "COL" ? range.zone.right + quantity : range.zone.right;
    const bottom = dimension === "ROW" ? range.zone.bottom + quantity : range.zone.bottom;
    const unboundedZone = {
      left: range.zone.left,
      top: range.zone.top,
      right: isFullRowRange(range) ? undefined : right,
      bottom: isFullColRange(range) ? undefined : bottom,
    };
    return createRange({ ...range, zone: unboundedZone }, this.getters.getSheetSize);
  }

  /**
   * Creates a range from a XC reference that can contain a sheet reference
   * @param defaultSheetId the sheet to default to if the sheetXC parameter does not contain a sheet reference (usually the active sheet Id)
   * @param sheetXC the string description of a range, in the form SheetName!XC:XC
   */
  getRangeFromSheetXC(defaultSheetId: UID, sheetXC: string): Range {
    if (!rangeReference.test(sheetXC) || !this.getters.tryGetSheet(defaultSheetId)) {
      return createInvalidRange(sheetXC);
    }

    const { sheetName } = splitReference(sheetXC);
    const sheetId = this.getters.getSheetIdByName(sheetName) || defaultSheetId;
    const invalidSheetName =
      sheetName && !this.getters.getSheetIdByName(sheetName) ? sheetName : undefined;

    return createRangeFromXc({ xc: sheetXC, sheetId, invalidSheetName }, this.getters.getSheetSize);
  }

  /**
   * Gets the string that represents the range as it is at the moment of the call.
   * The string will be prefixed with the sheet name if the call specified a sheet id in `forSheetId`
   * different than the sheet on which the range has been created.
   *
   * @param range the range (received from getRangeFromXC or getRangeFromZone)
   * @param forSheetId the id of the sheet where the range string is supposed to be used.
   * @param options
   * @param options.useBoundedReference if true, the range will be returned with bounded row and column
   * @param options.useFixedReference if true, the range will be returned with fixed row and column
   */
  getRangeString(
    range: Range,
    forSheetId: UID,
    options: RangeStringOptions = { useBoundedReference: false, useFixedReference: false }
  ): string {
    if (!range) {
      return CellErrorType.InvalidReference;
    }
    if (range.invalidXc) {
      return range.invalidXc;
    }
    if (!this.getters.tryGetSheet(range.sheetId)) {
      return CellErrorType.InvalidReference;
    }
    return getRangeString(range, forSheetId, this.getters.getSheetName, options);
  }

  getRangeDataFromXc(sheetId: UID, xc: string): RangeData {
    const range = this.getters.getRangeFromSheetXC(sheetId, xc);
    return this.getRangeDataFromZone(range.sheetId, range.unboundedZone);
  }

  getRangeDataFromZone(sheetId: UID, zone: Zone | UnboundedZone): RangeData {
    zone = this.getters.getUnboundedZone(sheetId, zone);
    return { _sheetId: sheetId, _zone: zone };
  }

  getRangeData(range: Range): RangeData {
    return this.getRangeDataFromZone(range.sheetId, range.unboundedZone);
  }

  getRangeFromZone(sheetId: UID, zone: Zone | UnboundedZone): Range {
    return createRange(
      {
        sheetId,
        zone,
        parts: [
          { colFixed: false, rowFixed: false },
          { colFixed: false, rowFixed: false },
        ],
        prefixSheet: false,
      },
      this.getters.getSheetSize
    );
  }

  /**
   * Allows you to recompute ranges from the same sheet
   */
  recomputeRanges(ranges: Range[], rangesToRemove: Range[]): Range[] {
    const zones = ranges.map((range) => range.unboundedZone);
    const zonesToRemove = rangesToRemove.map((range) => range.unboundedZone);
    return recomputeZones(zones, zonesToRemove).map((zone) =>
      this.getRangeFromZone(ranges[0].sheetId, zone)
    );
  }

  getRangeFromRangeData(data: RangeData): Range {
    if (!this.getters.tryGetSheet(data._sheetId)) {
      return createInvalidRange(CellErrorType.InvalidReference);
    }
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
    return createRange(rangeInterface, this.getters.getSheetSize);
  }

  isRangeValid(rangeStr: string): boolean {
    if (!rangeStr) {
      return false;
    }
    const { xc, sheetName } = splitReference(rangeStr);
    return (
      xc.match(rangeReference) !== null &&
      (!sheetName || this.getters.getSheetIdByName(sheetName) !== undefined)
    );
  }

  getRangesUnion(ranges: Range[]): Range {
    const zones = ranges.map((range) => range.unboundedZone);
    const unionOfZones = unionUnboundedZones(...zones);
    return this.getRangeFromZone(ranges[0].sheetId, unionOfZones);
  }

  adaptFormulaStringDependencies(
    sheetId: UID,
    formula: string,
    applyChange: ApplyRangeChange
  ): string {
    if (!formula.startsWith("=")) {
      return formula;
    }

    const compiledFormula = compile(formula);
    const updatedDependencies = compiledFormula.dependencies.map((dep) => {
      const range = this.getters.getRangeFromSheetXC(sheetId, dep);
      const changedRange = applyChange(range);
      return changedRange.changeType === "NONE" ? range : changedRange.range;
    });
    return this.getters.getFormulaString(sheetId, compiledFormula.tokens, updatedDependencies);
  }

  /**
   * Copy a formula string to another sheet.
   *
   * @param mode
   * `keepSameReference` will make the formula reference the exact same ranges,
   * `moveReference` will change all the references to `sheetIdFrom` into references to `sheetIdTo`.
   */
  copyFormulaStringForSheet(
    sheetIdFrom: UID,
    sheetIdTo: UID,
    formula: string,
    mode: "keepSameReference" | "moveReference"
  ): string {
    if (!formula.startsWith("=")) {
      return formula;
    }

    const compiledFormula = compile(formula);
    const updatedDependencies = compiledFormula.dependencies.map((dep) => {
      const range = this.getters.getRangeFromSheetXC(sheetIdFrom, dep);
      return mode === "keepSameReference"
        ? range
        : duplicateRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, range);
    });
    return this.getters.getFormulaString(sheetIdTo, compiledFormula.tokens, updatedDependencies);
  }
}
