import {
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
} from "../../helpers/grid_manipulation";
import { clip, isDefined, isEqual, overlap, toXC, toZone, union } from "../../helpers/index";
import { _lt } from "../../translation";
import {
  CancelledReason,
  CellType,
  CommandResult,
  CoreCommand,
  Merge,
  Sheet,
  UID,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface PendingMerges {
  sheet: string;
  merges: string[];
}

// type SheetMergeCellMap = Record<string, number | undefined>;
type SheetMergeCellMap = Record<number, Record<number, number | undefined> | undefined>;

interface MergeState {
  readonly merges: Record<UID, Record<number, Merge | undefined> | undefined>;
  // readonly mergeCellMap: Record<UID, SheetMergeCellMap | undefined>; // SheetId [ XC ] --> merge ID
  readonly mergeCellMap: Record<UID, SheetMergeCellMap | undefined>; // SheetId [ col ][ row ] --> merge ID
  readonly pending: PendingMerges | null;
}

export class MergePlugin extends CorePlugin<MergeState> implements MergeState {
  static getters = [
    "isInMerge",
    "isInSameMerge",
    "getMainCell",
    "expandZone",
    "doesIntersectMerge",
    "getMerges",
    "getMerge",
  ];

  private nextId: number = 1;
  pending: PendingMerges | null = null;

  readonly merges: Record<UID, Record<number, Merge | undefined> | undefined> = {};
  readonly mergeCellMap: Record<UID, SheetMergeCellMap | undefined> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  allowDispatch(cmd: CoreCommand): CommandResult {
    const force = "force" in cmd ? !!cmd.force : false;

    switch (cmd.type) {
      case "ADD_MERGE":
        return this.isMergeAllowed(cmd.sheetId, cmd.zone, force);
      default:
        return { status: "SUCCESS" };
    }
  }

  beforeHandle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "REMOVE_COLUMNS":
        this.exportAndRemoveMerges(
          cmd.sheetId,
          (range) => updateRemoveColumns(range, cmd.columns),
          true
        );
        break;
      case "REMOVE_ROWS":
        this.exportAndRemoveMerges(
          cmd.sheetId,
          (range) => updateRemoveRows(range, cmd.rows),
          false
        );
        break;
      case "ADD_COLUMNS":
        const col = cmd.position === "before" ? cmd.column : cmd.column + 1;
        this.exportAndRemoveMerges(
          cmd.sheetId,
          (range) => updateAddColumns(range, col, cmd.quantity),
          true
        );
        break;
      case "ADD_ROWS":
        const row = cmd.position === "before" ? cmd.row : cmd.row + 1;
        this.exportAndRemoveMerges(
          cmd.sheetId,
          (range) => updateAddRows(range, row, cmd.quantity),
          false
        );
        break;
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
        this.history.update(
          "merges",
          cmd.sheetIdTo,
          Object.assign({}, this.merges[cmd.sheetIdFrom])
        );
        this.history.update(
          "mergeCellMap",
          cmd.sheetIdTo,
          Object.assign({}, this.mergeCellMap[cmd.sheetIdFrom])
        );
        break;
      case "ADD_MERGE":
        if (!cmd.interactive) {
          this.addMerge(this.getters.getSheet(cmd.sheetId)!, cmd.zone);
        }
        break;
      case "REMOVE_MERGE":
        this.removeMerge(cmd.sheetId, cmd.zone);
        break;
      case "ADD_COLUMNS":
      case "ADD_ROWS":
      case "REMOVE_COLUMNS":
      case "REMOVE_ROWS":
        if (this.pending) {
          this.importMerges(this.pending.sheet, this.pending.merges);
          this.pending = null;
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getMerges(sheetId: UID): Merge[] {
    return Object.values(this.merges[sheetId] || {}).filter(isDefined);
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
    if (!this.isInMerge(sheetId, colA, rowA) || !this.isInMerge(sheetId, colB, rowB)) {
      return false;
    }
    return this.getMerge(sheetId, colA, rowA) === this.getMerge(sheetId, colB, rowB);
  }

  isInMerge(sheetId: UID, col: number, row: number): boolean {
    const sheetMap = this.mergeCellMap[sheetId];
    return sheetMap ? col in sheetMap && Boolean(sheetMap[col]?.[row]) : false;
  }

  isMainCell(sheetId: string, col: number, row: number): boolean {
    for (let mergeId in this.merges[sheetId]) {
      const merge = this.getMergeById(sheetId, parseInt(mergeId));
      if (merge && merge.topLeft.col === col && merge.topLeft.row === row) {
        return true;
      }
    }
    return false;
  }

  getMainCell(sheetId: UID, col: number, row: number): [number, number] {
    if (!this.isInMerge(sheetId, col, row)) {
      return [col, row];
    }
    const mergeTopLeftPos = this.getMerge(sheetId, col, row)!.topLeft;
    return [mergeTopLeftPos.col, mergeTopLeftPos.row];
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
      const actualRow = this.getters.getRow(sheet.id, row)!;
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          const cell = actualRow.cells[col];
          if (cell && cell.type !== CellType.empty) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getMergeById(sheetId: UID, mergeId: number): Merge | undefined {
    const merges = this.merges[sheetId];
    return merges !== undefined ? merges[mergeId] : undefined;
  }

  /**
   * Verify that we can merge without losing content of other cells or
   * because the user gave his permission
   */
  private isMergeAllowed(sheetId: UID, zone: Zone, force: boolean): CommandResult {
    if (!force) {
      const sheet = this.getters.tryGetSheet(sheetId);
      if (sheet && this.isMergeDestructive(sheet, zone)) {
        return {
          status: "CANCELLED",
          reason: CancelledReason.MergeIsDestructive,
        };
      }
    }
    return {
      status: "SUCCESS",
    };
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
    this.history.update("merges", sheet.id, id, {
      id,
      left,
      top,
      right,
      bottom,
      topLeft: { col: left, row: top },
    });
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

  // ---------------------------------------------------------------------------
  // Add/Remove columns
  // ---------------------------------------------------------------------------

  private removeAllMerges(sheetId: UID) {
    for (let id in this.merges[sheetId]) {
      this.history.update("merges", sheetId, parseInt(id), undefined);
    }

    for (let colNumber in this.mergeCellMap[sheetId]) {
      this.history.update("mergeCellMap", sheetId, parseInt(colNumber), undefined);
    }
  }

  private exportAndRemoveMerges(
    sheetId: UID,
    updater: (s: string) => string | null,
    isCol: boolean
  ) {
    const merges = this.merges[sheetId];
    if (!merges) return;
    const mergeXcs = exportMerges(merges);
    const updatedMerges: string[] = [];
    for (let m of mergeXcs) {
      const update = updater(m);
      if (update) {
        const [tl, br] = update.split(":");
        if (tl !== br) {
          updatedMerges.push(update);
        }
      }
    }
    this.removeAllMerges(sheetId);
    this.pending = { sheet: sheetId, merges: updatedMerges };
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
}

function exportMerges(merges: Record<number, Merge | undefined>): string[] {
  return Object.values(merges)
    .filter(isDefined)
    .map((merge) => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom));
}
