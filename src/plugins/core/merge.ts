import {
  clip,
  isDefined,
  isEqual,
  overlap,
  positions,
  toXC,
  toZone,
  union,
  zoneToDimension,
  zoneToXc,
} from "../../helpers/index";
import { _lt } from "../../translation";
import {
  AddMergeCommand,
  ApplyRangeChange,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  Merge,
  Range,
  Sheet,
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
    "getMainCell",
    "getBottomLeftCell",
    "expandZone",
    "doesIntersectMerge",
    "doesColumnsHaveCommonMerges",
    "doesRowsHaveCommonMerges",
    "getMerges",
    "getMerge",
    "isSingleCellOrMerge",
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
          return CommandResult.Success;
        }
        return this.checkValidations(cmd, this.checkDestructiveMerge, this.checkOverlap);
      case "UPDATE_CELL":
        return this.checkMergedContentUpdate(cmd);
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
        const sheet = this.getters.getSheet(cmd.sheetIdTo);
        for (const range of Object.values(merges).filter(isDefined)) {
          this.addMerge(sheet, range.zone);
        }
        break;
      case "ADD_MERGE":
        for (const zone of cmd.target) {
          this.addMerge(this.getters.getSheet(cmd.sheetId)!, zone);
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

  getMerge(sheetId: UID, col: number, row: number): Merge | undefined {
    const sheetMap = this.mergeCellMap[sheetId];
    const mergeId = sheetMap ? col in sheetMap && sheetMap[col]?.[row] : undefined;
    return mergeId ? this.getMergeById(sheetId, mergeId) : undefined;
  }

  /**
   * Return true if the zone intersects an existing merge:
   * if they have at least a common cell
   */
  doesIntersectMerge(sheetId: UID, zone: Zone): boolean {
    const { left, right, top, bottom } = zone;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (this.getMerge(sheetId, col, row)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Returns true if two columns have at least one merge in common
   */
  doesColumnsHaveCommonMerges(sheetId: string, colA: number, colB: number) {
    const sheet = this.getters.getSheet(sheetId);
    for (let row = 0; row < sheet.rows.length; row++) {
      if (this.isInSameMerge(sheet.id, colA, row, colB, row)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns true if two rows have at least one merge in common
   */
  doesRowsHaveCommonMerges(sheetId: string, rowA: number, rowB: number) {
    const sheet = this.getters.getSheet(sheetId);
    for (let col = 0; col <= sheet.cols.length; col++) {
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

  isInSameMerge(sheetId: UID, colA: number, rowA: number, colB: number, rowB: number): boolean {
    const mergeA = this.getMerge(sheetId, colA, rowA);
    const mergeB = this.getMerge(sheetId, colB, rowB);
    if (!mergeA || !mergeB) {
      return false;
    }
    return isEqual(mergeA, mergeB);
  }

  isInMerge(sheetId: UID, col: number, row: number): boolean {
    const sheetMap = this.mergeCellMap[sheetId];
    return sheetMap ? col in sheetMap && Boolean(sheetMap[col]?.[row]) : false;
  }

  getMainCell(sheetId: UID, col: number, row: number): [number, number] {
    if (!this.isInMerge(sheetId, col, row)) {
      return [col, row];
    }
    const mergeTopLeftPos = this.getMerge(sheetId, col, row)!.topLeft;
    return [mergeTopLeftPos.col, mergeTopLeftPos.row];
  }

  getBottomLeftCell(sheetId: UID, col: number, row: number): [number, number] {
    if (!this.isInMerge(sheetId, col, row)) {
      return [col, row];
    }
    const { bottom, left } = this.getMerge(sheetId, col, row)!;
    return [left, bottom];
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
    const merge = this.getMerge(sheetId, zone.left, zone.top);
    if (merge) {
      return isEqual(zone, merge);
    }
    const { width, height } = zoneToDimension(zone);
    return width === 1 && height === 1;
  }
  // ---------------------------------------------------------------------------
  // Merges
  // ---------------------------------------------------------------------------

  /**
   * Return true if the current selection requires losing state if it is merged.
   * This happens when there is some textual content in other cells than the
   * top left.
   */
  private isMergeDestructive(sheet: Sheet, zone: Zone): boolean {
    let { left, right, top, bottom } = zone;
    right = clip(right, 0, sheet.cols.length - 1);
    bottom = clip(bottom, 0, sheet.rows.length - 1);
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          const cell = this.getters.getCell(sheet.id, col, row);
          if (cell && !cell.isEmpty()) {
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
    const isDestructive = target.some((zone) => this.isMergeDestructive(sheet, zone));
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

  /**
   * The content of a merged cell should always be empty.
   * Except for the top-left cell.
   */
  private checkMergedContentUpdate(cmd: UpdateCellCommand): CommandResult {
    const { col, row, sheetId, content } = cmd;
    if (content === undefined) {
      return CommandResult.Success;
    }
    const [mainCol, mainRow] = this.getMainCell(sheetId, col, row);
    if (mainCol === col && mainRow === row) {
      return CommandResult.Success;
    }
    return CommandResult.CellIsMerged;
  }

  /**
   * Merge the current selection. Note that:
   * - it assumes that we have a valid selection (no intersection with other
   *   merges)
   * - it does nothing if the merge is trivial: A1:A1
   */
  private addMerge(sheet: Sheet, zone: Zone) {
    let { left, right, top, bottom } = zone;
    right = clip(right, 0, sheet.cols.length - 1);
    bottom = clip(bottom, 0, sheet.rows.length - 1);
    const tl = toXC(left, top);
    const br = toXC(right, bottom);
    if (tl === br) {
      return;
    }
    const topLeft = this.getters.getCell(sheet.id, left, top);

    let id = this.nextId++;
    this.history.update(
      "merges",
      sheet.id,
      id,
      this.getters.getRangeFromSheetXC(sheet.id, zoneToXc({ left, top, right, bottom }))
    );
    let previousMerges: Set<number> = new Set();
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          this.dispatch("UPDATE_CELL", {
            sheetId: sheet.id,
            col,
            row,
            style: topLeft ? topLeft.style : undefined,
            content: undefined,
          });
        }
        const merge = this.getMerge(sheet.id, col, row);
        if (merge) {
          previousMerges.add(merge.id);
        }
        this.history.update("mergeCellMap", sheet.id, col, row, id);
      }
    }

    for (let mergeId of previousMerges) {
      const { top, bottom, left, right } = this.getMergeById(sheet.id, mergeId)!;
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const merge = this.getMerge(sheet.id, c, r);
          if (!merge || merge.id !== id) {
            this.history.update("mergeCellMap", sheet.id, c, r, undefined);
            this.dispatch("CLEAR_CELL", {
              sheetId: sheet.id,
              col: c,
              row: r,
            });
          }
        }
      }
      this.history.update("merges", sheet.id, mergeId, undefined);
    }
  }

  private removeMerge(sheetId: string, zone: Zone) {
    const { left, top, bottom, right } = zone;
    const merge = this.getMerge(sheetId, left, top);
    if (merge === undefined || !isEqual(zone, merge)) {
      throw new Error(_lt("Invalid merge zone"));
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
            const { width, height } = zoneToDimension(result.range.zone);
            if (width === 1 && height === 1) {
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
      for (const [col, row] of positions(merge)) {
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
    const sheet = this.getters.getSheet(sheetId)!;
    for (let merge of merges) {
      this.addMerge(sheet, toZone(merge));
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
