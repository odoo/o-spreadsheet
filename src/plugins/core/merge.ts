import { CorePlugin } from "../core_plugin";
import {
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
} from "../../helpers/grid_manipulation";
import {
  isEqual,
  toCartesian,
  toXC,
  union,
  overlap,
  clip,
  isDefined,
  toZone,
} from "../../helpers/index";
import { _lt } from "../../translation";
import {
  CancelledReason,
  Command,
  CommandResult,
  Merge,
  UID,
  WorkbookData,
  Zone,
  Sheet,
} from "../../types/index";

interface PendingMerges {
  sheet: string;
  merges: string[];
}

type SheetMergeCellMap = Record<string, number | undefined>;

interface MergeState {
  readonly merges: Record<UID, Record<number, Merge | undefined> | undefined>;
  readonly mergeCellMap: Record<UID, SheetMergeCellMap | undefined>; // SheetId [ XC ] --> merge ID
  readonly pending: PendingMerges | null;
}

export class MergePlugin extends CorePlugin<MergeState> implements MergeState {
  static getters = [
    "isMergeDestructive",
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
  allowDispatch(cmd: Command): CommandResult {
    const force = "force" in cmd ? !!cmd.force : false;

    switch (cmd.type) {
      case "ADD_MERGE":
        return this.isMergeAllowed(cmd.sheetId, cmd.zone, force);
      default:
        return { status: "SUCCESS" };
    }
  }

  beforeHandle(cmd: Command) {
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

  handle(cmd: Command) {
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

  getMerge(sheetId: UID, xc: string): Merge | undefined {
    return this.getMergeByXc(sheetId, xc);
  }

  /**
   * Return true if the current selection requires losing state if it is merged.
   * This happens when there is some textual content in other cells than the
   * top left.
   */
  isMergeDestructive(sheet: Sheet, zone: Zone): boolean {
    let { left, right, top, bottom } = zone;
    right = clip(right, 0, sheet.cols.length - 1);
    bottom = clip(bottom, 0, sheet.rows.length - 1);
    for (let row = top; row <= bottom; row++) {
      const actualRow = this.getters.getRow(sheet.id, row)!;
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          const cell = actualRow.cells[col];
          if (cell && (cell.content || cell.formula)) {
            return true;
          }
        }
      }
    }
    return false;
  }
  /**
   * Return true if the zone intersects an existing merge:
   * if they have at least a common cell
   */
  doesIntersectMerge(sheetId: UID, zone: Zone): boolean {
    const { left, right, top, bottom } = zone;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const cellXc = toXC(col, row);
        if (this.getMergeByXc(sheetId, cellXc)) {
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

  isInSameMerge(sheetId: UID, xc1: string, xc2: string): boolean {
    if (!this.isInMerge(sheetId, xc1) || !this.isInMerge(sheetId, xc2)) {
      return false;
    }
    return this.getMergeByXc(sheetId, xc1) === this.getMergeByXc(sheetId, xc2);
  }

  isInMerge(sheetId: UID, xc: string): boolean {
    const sheetMap = this.mergeCellMap[sheetId];
    return sheetMap ? xc in sheetMap : false;
  }

  isMainCell(xc: string, sheetId: string): boolean {
    for (let mergeId in this.merges[sheetId]) {
      const merge = this.getMergeById(sheetId, parseInt(mergeId));
      if (merge && merge.topLeft === xc) {
        return true;
      }
    }
    return false;
  }

  getMainCell(sheetId: UID, xc: string): string {
    if (!this.isInMerge(sheetId, xc)) {
      return xc;
    }
    return this.getMergeByXc(sheetId, xc)!.topLeft;
  }

  // ---------------------------------------------------------------------------
  // Merges
  // ---------------------------------------------------------------------------

  private getMergeById(sheetId: UID, mergeId: number): Merge | undefined {
    const merges = this.merges[sheetId];
    return merges !== undefined ? merges[mergeId] : undefined;
  }

  private getMergeByXc(sheetId: UID, xc: string): Merge | undefined {
    const sheetMap = this.mergeCellMap[sheetId];
    const mergeId = sheetMap ? sheetMap[xc] : undefined;
    return mergeId ? this.getMergeById(sheetId, mergeId) : undefined;
  }
  /**
   * Verify that we can merge without losing content of other cells or
   * because the user gave his permission
   */
  private isMergeAllowed(sheetId: UID, zone: Zone, force: boolean): CommandResult {
    if (!force) {
      try {
        const sheet = this.getters.getSheet(sheetId);
        if (this.isMergeDestructive(sheet, zone)) {
          return {
            status: "CANCELLED",
            reason: CancelledReason.MergeIsDestructive,
          };
        }
      } catch (error) {
        return { status: "CANCELLED", reason: CancelledReason.InvalidSheetId };
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
      topLeft: tl,
    });
    let previousMerges: Set<number> = new Set();
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const xc = toXC(col, row);
        if (col !== left || row !== top) {
          this.dispatch("UPDATE_CELL", {
            sheetId: sheet.id,
            col,
            row,
            style: topLeft ? topLeft.style : undefined,
            content: undefined,
          });
        }
        const merge = this.getMergeByXc(sheet.id, xc);
        if (merge) {
          previousMerges.add(merge.id);
        }
        this.history.update("mergeCellMap", sheet.id, xc, id);
      }
    }

    for (let mergeId of previousMerges) {
      const { top, bottom, left, right } = this.getMergeById(sheet.id, mergeId)!;
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const xc = toXC(c, r);
          const merge = this.getMergeByXc(sheet.id, xc);
          if (!merge || merge.id !== id) {
            this.history.update("mergeCellMap", sheet.id, xc, undefined);
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
    const merge = this.getMergeByXc(sheetId, toXC(left, top));
    if (merge === undefined || !isEqual(zone, merge)) {
      throw new Error(_lt("Invalid merge zone"));
    }
    this.history.update("merges", sheetId, merge.id, undefined);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const xc = toXC(c, r);
        this.history.update("mergeCellMap", sheetId, xc, undefined);
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
    for (let id in this.mergeCellMap[sheetId]) {
      this.history.update("mergeCellMap", sheetId, id, undefined);
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
    this.updateMergesStyles(sheetId, isCol);
    this.removeAllMerges(sheetId);
    this.pending = { sheet: sheetId, merges: updatedMerges };
  }

  private updateMergesStyles(sheetId: string, isColumn: boolean) {
    const merges = Object.values(this.merges[sheetId] || {}).filter(isDefined);
    for (let merge of merges) {
      const xc = merge.topLeft;
      const topLeft = this.getters.getCellByXc(sheetId, xc);
      if (!topLeft) {
        continue;
      }
      let [x, y] = toCartesian(xc);
      if (isColumn && merge.left !== merge.right) {
        x += 1;
      }
      if (!isColumn && merge.top !== merge.bottom) {
        y += 1;
      }
      this.dispatch("UPDATE_CELL", {
        sheetId,
        col: x,
        row: y,
        style: topLeft.style,
        border: topLeft.border,
        format: topLeft.format,
      });
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
}

function exportMerges(merges: Record<number, Merge | undefined>): string[] {
  return Object.values(merges)
    .filter(isDefined)
    .map((merge) => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom));
}
