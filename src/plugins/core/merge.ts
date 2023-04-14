import {
  clip,
  getCanonicalSheetName,
  isDefined,
  isEqual,
  overlap,
  positions,
  RangeImpl,
  splitReference,
  toXC,
  toZone,
  union,
  zoneToDimension,
  zoneToXc,
} from "../../helpers/index";
import {
  AddMergeCommand,
  ApplyRangeChange,
  CellPosition,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  HeaderIndex,
  Merge,
  Range,
  TargetDependentCommand,
  UID,
  UpdateCellCommand,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

// type SheetMergeCellMap = Record<string, number | undefined>;
type SheetMergeCellMap = Record<number, Record<number, number | undefined> | undefined>;

interface MergeState {
  readonly merges: Record<UID, Record<number, Range | undefined> | undefined>;
  // readonly mergeCellMap: Record<UID, SheetMergeCellMap | undefined>; // SheetId [ XC ] --> merge ID
  readonly mergeCellMap: Record<UID, SheetMergeCellMap | undefined>; // SheetId [ col ][ row ] --> merge ID
}

export class MergePlugin extends CorePlugin<MergeState> implements MergeState {
  static getters = [
    "isInMerge",
    "isInSameMerge",
    "isMergeHidden",
    "getMainCellPosition",
    "getBottomLeftCell",
    "expandZone",
    "doesIntersectMerge",
    "doesColumnsHaveCommonMerges",
    "doesRowsHaveCommonMerges",
    "getMerges",
    "getMerge",
    "getMergesInZone",
    "isSingleCellOrMerge",
    "getSelectionRangeString",
  ] as const;

  private nextId: number = 1;

  readonly merges: Record<UID, Record<number, Range | undefined> | undefined> = {};
  readonly mergeCellMap: Record<UID, SheetMergeCellMap | undefined> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  allowDispatch(cmd: CoreCommand) {
    const force = "force" in cmd ? !!cmd.force : false;

    switch (cmd.type) {
      case "ADD_MERGE":
        if (force) {
          return this.checkValidations(cmd, this.checkFrozenPanes);
        }
        return this.checkValidations(
          cmd,
          this.checkDestructiveMerge,
          this.checkOverlap,
          this.checkFrozenPanes
        );
      case "UPDATE_CELL":
        return this.checkMergedContentUpdate(cmd);
      case "REMOVE_MERGE":
        return this.checkMergeExists(cmd);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.history.update("merges", cmd.sheetId, {});
        this.history.update("mergeCellMap", cmd.sheetId, {});
        break;
      case "DELETE_SHEET":
        this.history.update("merges", cmd.sheetId, {});
        this.history.update("mergeCellMap", cmd.sheetId, {});
        break;
      case "DUPLICATE_SHEET":
        const merges = this.merges[cmd.sheetId];
        if (!merges) break;
        for (const range of Object.values(merges).filter(isDefined)) {
          this.addMerge(cmd.sheetIdTo, range.zone);
        }
        break;
      case "ADD_MERGE":
        for (const zone of cmd.target) {
          this.addMerge(cmd.sheetId, zone);
        }
        break;
      case "REMOVE_MERGE":
        for (const zone of cmd.target) {
          this.removeMerge(cmd.sheetId, zone);
        }
        break;
    }
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    const sheetIds = sheetId ? [sheetId] : Object.keys(this.merges);
    for (const sheetId of sheetIds) {
      this.applyRangeChangeOnSheet(sheetId, applyChange);
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getMerges(sheetId: UID): Merge[] {
    return Object.keys(this.merges[sheetId] || {})
      .map((mergeId) => this.getMergeById(sheetId, parseInt(mergeId, 10)))
      .filter(isDefined);
  }

  getMerge({ sheetId, col, row }: CellPosition): Merge | undefined {
    const sheetMap = this.mergeCellMap[sheetId];
    const mergeId = sheetMap ? col in sheetMap && sheetMap[col]?.[row] : undefined;
    return mergeId ? this.getMergeById(sheetId, mergeId) : undefined;
  }

  getMergesInZone(sheetId: UID, zone: Zone): Merge[] {
    const sheetMap = this.mergeCellMap[sheetId];
    if (!sheetMap) return [];
    const mergeIds = new Set<number>();

    for (const { col, row } of positions(zone)) {
      const mergeId = sheetMap[col]?.[row];
      if (mergeId) {
        mergeIds.add(mergeId);
      }
    }

    return Array.from(mergeIds)
      .map((mergeId) => this.getMergeById(sheetId, mergeId))
      .filter(isDefined);
  }

  /**
   * Same as `getRangeString` but add all necessary merge to the range to make it a valid selection
   */
  getSelectionRangeString(range: Range, forSheetId: UID): string {
    const rangeImpl = RangeImpl.fromRange(range, this.getters);
    const expandedZone = this.getters.expandZone(rangeImpl.sheetId, rangeImpl.zone);
    const expandedRange = rangeImpl.clone({
      zone: {
        ...expandedZone,
        bottom: rangeImpl.isFullCol ? undefined : expandedZone.bottom,
        right: rangeImpl.isFullRow ? undefined : expandedZone.right,
      },
    });
    const rangeString = this.getters.getRangeString(expandedRange, forSheetId);
    if (this.isSingleCellOrMerge(rangeImpl.sheetId, rangeImpl.zone)) {
      const { sheetName, xc } = splitReference(rangeString);
      return `${sheetName !== undefined ? getCanonicalSheetName(sheetName) + "!" : ""}${
        xc.split(":")[0]
      }`;
    }
    return rangeString;
  }

  /**
   * Return true if the zone intersects an existing merge:
   * if they have at least a common cell
   */
  doesIntersectMerge(sheetId: UID, zone: Zone): boolean {
    return positions(zone).some(
      ({ col, row }) => this.getMerge({ sheetId, col, row }) !== undefined
    );
  }

  /**
   * Returns true if two columns have at least one merge in common
   */
  doesColumnsHaveCommonMerges(sheetId: string, colA: HeaderIndex, colB: HeaderIndex) {
    const sheet = this.getters.getSheet(sheetId);
    for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
      if (this.isInSameMerge(sheet.id, colA, row, colB, row)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns true if two rows have at least one merge in common
   */
  doesRowsHaveCommonMerges(sheetId: string, rowA: HeaderIndex, rowB: HeaderIndex) {
    const sheet = this.getters.getSheet(sheetId);
    for (let col = 0; col <= this.getters.getNumberCols(sheetId); col++) {
      if (this.isInSameMerge(sheet.id, col, rowA, col, rowB)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add all necessary merge to the current selection to make it valid
   */
  expandZone(sheetId: UID, zone: Zone): Zone {
    let { left, right, top, bottom } = zone;
    let result: Zone = { left, right, top, bottom };

    for (let id in this.merges[sheetId]) {
      const merge = this.getMergeById(sheetId, parseInt(id));
      if (merge && overlap(merge, result)) {
        result = union(merge, result);
      }
    }
    return isEqual(result, zone) ? result : this.expandZone(sheetId, result);
  }

  isInSameMerge(
    sheetId: UID,
    colA: HeaderIndex,
    rowA: HeaderIndex,
    colB: HeaderIndex,
    rowB: HeaderIndex
  ): boolean {
    const mergeA = this.getMerge({ sheetId, col: colA, row: rowA });
    const mergeB = this.getMerge({ sheetId, col: colB, row: rowB });
    if (!mergeA || !mergeB) {
      return false;
    }
    return isEqual(mergeA, mergeB);
  }

  isInMerge({ sheetId, col, row }: CellPosition): boolean {
    const sheetMap = this.mergeCellMap[sheetId];
    return sheetMap ? col in sheetMap && Boolean(sheetMap[col]?.[row]) : false;
  }

  getMainCellPosition(position: CellPosition): CellPosition {
    if (!this.isInMerge(position)) {
      return position;
    }
    const mergeTopLeftPos = this.getMerge(position)!.topLeft;
    return { sheetId: position.sheetId, col: mergeTopLeftPos.col, row: mergeTopLeftPos.row };
  }

  getBottomLeftCell(position: CellPosition): CellPosition {
    if (!this.isInMerge(position)) {
      return position;
    }
    const { bottom, left } = this.getMerge(position)!;
    return { sheetId: position.sheetId, col: left, row: bottom };
  }

  isMergeHidden(sheetId: UID, merge: Merge): boolean {
    const hiddenColsGroups = this.getters.getHiddenColsGroups(sheetId);
    const hiddenRowsGroups = this.getters.getHiddenRowsGroups(sheetId);

    for (let group of hiddenColsGroups) {
      if (merge.left >= group[0] && merge.right <= group[group.length - 1]) {
        return true;
      }
    }
    for (let group of hiddenRowsGroups) {
      if (merge.top >= group[0] && merge.bottom <= group[group.length - 1]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if the zone represents a single cell or a single merge.
   */
  isSingleCellOrMerge(sheetId: UID, zone: Zone): boolean {
    const merge = this.getMerge({ sheetId, col: zone.left, row: zone.top });
    if (merge) {
      return isEqual(zone, merge);
    }
    const { numberOfCols, numberOfRows } = zoneToDimension(zone);
    return numberOfCols === 1 && numberOfRows === 1;
  }
  // ---------------------------------------------------------------------------
  // Merges
  // ---------------------------------------------------------------------------

  /**
   * Return true if the current selection requires losing state if it is merged.
   * This happens when there is some textual content in other cells than the
   * top left.
   */
  private isMergeDestructive(sheetId: UID, zone: Zone): boolean {
    let { left, right, top, bottom } = zone;
    right = clip(right, 0, this.getters.getNumberCols(sheetId) - 1);
    bottom = clip(bottom, 0, this.getters.getNumberRows(sheetId) - 1);
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          const cell = this.getters.getCell({ sheetId, col, row });
          if (cell && cell.content !== "") {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getMergeById(sheetId: UID, mergeId: number): Merge | undefined {
    const range = this.merges[sheetId]?.[mergeId];
    return range !== undefined ? rangeToMerge(mergeId, range) : undefined;
  }

  private checkDestructiveMerge({ sheetId, target }: AddMergeCommand): CommandResult {
    const sheet = this.getters.tryGetSheet(sheetId);
    if (!sheet) return CommandResult.Success;
    const isDestructive = target.some((zone) => this.isMergeDestructive(sheetId, zone));
    return isDestructive ? CommandResult.MergeIsDestructive : CommandResult.Success;
  }

  private checkOverlap({ target }: AddMergeCommand): CommandResult {
    for (const zone of target) {
      for (const zone2 of target) {
        if (zone !== zone2 && overlap(zone, zone2)) {
          return CommandResult.MergeOverlap;
        }
      }
    }
    return CommandResult.Success;
  }

  private checkFrozenPanes({ sheetId, target }: AddMergeCommand): CommandResult {
    const sheet = this.getters.tryGetSheet(sheetId);
    if (!sheet) return CommandResult.Success;
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    for (const zone of target) {
      if (
        (zone.left < xSplit && zone.right >= xSplit) ||
        (zone.top < ySplit && zone.bottom >= ySplit)
      ) {
        return CommandResult.FrozenPaneOverlap;
      }
    }

    return CommandResult.Success;
  }

  /**
   * The content of a merged cell should always be empty.
   * Except for the top-left cell.
   */
  private checkMergedContentUpdate(cmd: UpdateCellCommand): CommandResult {
    const { col, row, content } = cmd;
    if (content === undefined) {
      return CommandResult.Success;
    }
    const { col: mainCol, row: mainRow } = this.getMainCellPosition(cmd);
    if (mainCol === col && mainRow === row) {
      return CommandResult.Success;
    }
    return CommandResult.CellIsMerged;
  }

  private checkMergeExists(cmd: TargetDependentCommand): CommandResult {
    const { sheetId, target } = cmd;
    for (const zone of target) {
      const { left, top } = zone;
      const merge = this.getMerge({ sheetId, col: left, row: top });
      if (merge === undefined || !isEqual(zone, merge)) {
        return CommandResult.InvalidTarget;
      }
    }
    return CommandResult.Success;
  }

  /**
   * Merge the current selection. Note that:
   * - it assumes that we have a valid selection (no intersection with other
   *   merges)
   * - it does nothing if the merge is trivial: A1:A1
   */
  private addMerge(sheetId: UID, zone: Zone) {
    let { left, right, top, bottom } = zone;
    right = clip(right, 0, this.getters.getNumberCols(sheetId) - 1);
    bottom = clip(bottom, 0, this.getters.getNumberRows(sheetId) - 1);
    const tl = toXC(left, top);
    const br = toXC(right, bottom);
    if (tl === br) {
      return;
    }
    const topLeft = this.getters.getCell({ sheetId, col: left, row: top });

    let id = this.nextId++;
    this.history.update(
      "merges",
      sheetId,
      id,
      this.getters.getRangeFromSheetXC(sheetId, zoneToXc({ left, top, right, bottom }))
    );
    let previousMerges: Set<number> = new Set();
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: topLeft ? topLeft.style : null,
            content: "",
          });
        }
        const merge = this.getMerge({ sheetId, col, row });
        if (merge) {
          previousMerges.add(merge.id);
        }
        this.history.update("mergeCellMap", sheetId, col, row, id);
      }
    }

    for (let mergeId of previousMerges) {
      const { top, bottom, left, right } = this.getMergeById(sheetId, mergeId)!;
      for (let row = top; row <= bottom; row++) {
        for (let col = left; col <= right; col++) {
          const position = { sheetId, col, row };
          const merge = this.getMerge(position);
          if (!merge || merge.id !== id) {
            this.history.update("mergeCellMap", sheetId, col, row, undefined);
            this.dispatch("CLEAR_CELL", position);
          }
        }
      }
      this.history.update("merges", sheetId, mergeId, undefined);
    }
  }

  private removeMerge(sheetId: string, zone: Zone) {
    const { left, top, bottom, right } = zone;
    const merge = this.getMerge({ sheetId, col: left, row: top });
    if (merge === undefined || !isEqual(zone, merge)) {
      return;
    }
    this.history.update("merges", sheetId, merge.id, undefined);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        this.history.update("mergeCellMap", sheetId, c, r, undefined);
      }
    }
  }

  /**
   * Apply a range change on merges of a particular sheet.
   */
  private applyRangeChangeOnSheet(sheetId: UID, applyChange: ApplyRangeChange) {
    const merges = Object.entries(this.merges[sheetId] || {});
    for (const [mergeId, range] of merges) {
      if (range) {
        const currentZone = range.zone;
        const result = applyChange(range);
        switch (result.changeType) {
          case "NONE":
            break;
          case "REMOVE":
            this.removeMerge(sheetId, currentZone);
            break;
          default:
            const { numberOfCols, numberOfRows } = zoneToDimension(result.range.zone);
            if (numberOfCols === 1 && numberOfRows === 1) {
              this.removeMerge(sheetId, currentZone);
            } else {
              this.history.update("merges", sheetId, parseInt(mergeId, 10), result.range);
            }
            break;
        }
      }
    }
    this.history.update("mergeCellMap", sheetId, {});
    for (const merge of this.getMerges(sheetId)) {
      for (const { col, row } of positions(merge)) {
        this.history.update("mergeCellMap", sheetId, col, row, merge.id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    const sheets = data.sheets || [];
    for (let sheetData of sheets) {
      this.history.update("merges", sheetData.id, {});
      this.history.update("mergeCellMap", sheetData.id, {});
      if (sheetData.merges) {
        this.importMerges(sheetData.id, sheetData.merges);
      }
    }
  }

  private importMerges(sheetId: string, merges: string[]) {
    for (let merge of merges) {
      this.addMerge(sheetId, toZone(merge));
    }
  }
  export(data: WorkbookData) {
    for (let sheetData of data.sheets) {
      const merges = this.merges[sheetData.id];
      if (merges) {
        sheetData.merges.push(...exportMerges(merges));
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}

function exportMerges(merges: Record<number, Range | undefined>): string[] {
  return Object.entries(merges)
    .map(([mergeId, range]) => (range ? rangeToMerge(parseInt(mergeId, 10), range) : undefined))
    .filter(isDefined)
    .map((merge) => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom));
}

function rangeToMerge(mergeId: number, range: Range): Merge {
  return {
    ...range.zone,
    topLeft: { col: range.zone.left, row: range.zone.top },
    id: mergeId,
  };
}
