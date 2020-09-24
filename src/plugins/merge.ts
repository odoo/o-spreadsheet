import { BasePlugin } from "../base_plugin";
import {
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
} from "../helpers/grid_manipulation";
import { isEqual, toCartesian, toXC, union, overlap, clip } from "../helpers/index";
import { _lt } from "../translation";
import {
  CancelledReason,
  Command,
  CommandResult,
  Merge,
  UID,
  WorkbookData,
  Zone,
} from "../types/index";

interface PendingMerges {
  sheet: string;
  merges: string[];
}

export class MergePlugin extends BasePlugin {
  static getters = [
    "isMergeDestructive",
    "isInMerge",
    "getMainCell",
    "expandZone",
    "doesIntersectMerge",
    "getMergeCellMap",
    "getMerges",
  ];

  private nextId: number = 1;
  private pending: PendingMerges | null = null;

  private merges: Record<UID, { [key: number]: Merge }> = {};
  private mergeCellMap: Record<UID, { [key: string]: number }> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  allowDispatch(cmd: Command): CommandResult {
    const force = "force" in cmd ? !!cmd.force : false;

    switch (cmd.type) {
      case "PASTE":
        return this.isPasteAllowed(cmd.target, force);
      case "ADD_MERGE":
        return this.isMergeAllowed(cmd.zone, force);
      default:
        return { status: "SUCCESS" };
    }
  }

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_COLUMNS":
        this.exportAndRemoveMerges(
          cmd.sheet,
          (range) => updateRemoveColumns(range, cmd.columns),
          true
        );
        break;
      case "REMOVE_ROWS":
        this.exportAndRemoveMerges(cmd.sheet, (range) => updateRemoveRows(range, cmd.rows), false);
        break;
      case "ADD_COLUMNS":
        const col = cmd.position === "before" ? cmd.column : cmd.column + 1;
        this.exportAndRemoveMerges(
          cmd.sheet,
          (range) => updateAddColumns(range, col, cmd.quantity),
          true
        );
        break;
      case "ADD_ROWS":
        const row = cmd.position === "before" ? cmd.row : cmd.row + 1;
        this.exportAndRemoveMerges(
          cmd.sheet,
          (range) => updateAddRows(range, row, cmd.quantity),
          false
        );
        break;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.history.updateLocalState(["merges", cmd.id], {});
        this.history.updateLocalState(["mergeCellMap", cmd.id], {});
        break;
      case "DELETE_SHEET":
        this.history.updateLocalState(["merges", cmd.sheet], {});
        this.history.updateLocalState(["mergeCellMap", cmd.sheet], {});
        break;
      case "DUPLICATE_SHEET":
        this.history.updateLocalState(
          ["merges", cmd.to],
          Object.assign({}, this.merges[cmd.from])
        );
        this.history.updateLocalState(
          ["mergeCellMap", cmd.to],
          Object.assign({}, this.mergeCellMap[cmd.from])
        );
        break;
      case "ADD_MERGE":
        if (cmd.interactive) {
          this.interactiveMerge(cmd.sheet, cmd.zone);
        } else {
          this.addMerge(cmd.sheet, cmd.zone);
        }
        break;
      case "REMOVE_MERGE":
        this.removeMerge(cmd.sheet, cmd.zone);
        break;
      case "AUTOFILL_CELL":
        this.autoFillMerge(cmd.originCol, cmd.originRow, cmd.col, cmd.row);
        break;
      case "PASTE_CELL":
        const xc = toXC(cmd.originCol, cmd.originRow);
        if (this.isMainCell(xc, cmd.sheet)) {
          this.duplicateMerge(xc, cmd.col, cmd.row, cmd.sheet, cmd.cut);
        }
        break;
    }
    if (this.pending) {
      this.importMerges(this.pending.sheet, this.pending.merges);
      this.history.updateLocalState(["pending"], null);
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getMergeCellMap(sheetId: UID): { [key: string]: number } {
    return this.mergeCellMap[sheetId];
  }

  getMerges(sheetId: UID): { [key: number]: Merge } {
    return this.merges[sheetId];
  }

  /**
   * Return true if the current selection requires losing state if it is merged.
   * This happens when there is some textual content in other cells than the
   * top left.
   */
  isMergeDestructive(zone: Zone): boolean {
    const { left, right, top, bottom } = zone;
    for (let row = top; row <= bottom; row++) {
      const actualRow = this.workbook.activeSheet.rows[row];
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          const cell = actualRow.cells[col];
          if (cell && cell.content) {
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
  doesIntersectMerge(zone: Zone): boolean {
    const { left, right, top, bottom } = zone;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const cellXc = toXC(col, row);
        const activeSheet = this.getters.getActiveSheet();
        if (this.mergeCellMap[activeSheet][cellXc]) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Add all necessary merge to the current selection to make it valid
   */
  expandZone(zone: Zone): Zone {
    let { left, right, top, bottom } = zone;
    const activeSheet = this.getters.getActiveSheet();
    let result: Zone = { left, right, top, bottom };

    for (let id in this.merges[activeSheet]) {
      const merge = this.merges[activeSheet][id];
      if (overlap(merge, result)) {
        result = union(merge, result);
      }
    }
    return isEqual(result, zone) ? result : this.expandZone(result);
  }

  isInMerge(xc: string): boolean {
    const activeSheet = this.getters.getActiveSheet();
    return xc in this.mergeCellMap[activeSheet];
  }

  isMainCell(xc: string, sheetId: string): boolean {
    for (let key in this.merges[sheetId]) {
      if (this.merges[sheetId][key].topLeft === xc) {
        return true;
      }
    }
    return false;
  }

  getMainCell(xc: string): string {
    if (!this.isInMerge(xc)) {
      return xc;
    }
    const activeSheet = this.getters.getActiveSheet();
    const merge = this.mergeCellMap[activeSheet][xc];
    return this.merges[activeSheet][merge].topLeft;
  }

  // ---------------------------------------------------------------------------
  // Merges
  // ---------------------------------------------------------------------------

  /**
   * Verify that we can merge without losing content of other cells or
   * because the user gave his permission
   */
  private isMergeAllowed(zone: Zone, force: boolean): CommandResult {
    if (!force) {
      if (this.isMergeDestructive(zone)) {
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
  private addMerge(sheetId: UID, zone: Zone) {
    const { left, right, top, bottom } = zone;
    let tl = toXC(left, top);
    let br = toXC(right, bottom);
    if (tl === br) {
      return;
    }

    let id = this.nextId++;
    this.history.updateLocalState(["merges", sheetId, id], {
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
          this.dispatch("CLEAR_CELL", {
            sheet: sheetId,
            col,
            row,
          });
        }
        if (this.mergeCellMap[sheetId][xc]) {
          previousMerges.add(this.mergeCellMap[sheetId][xc]);
        }
        this.history.updateLocalState(["mergeCellMap", sheetId, xc], id);
      }
    }
    for (let m of previousMerges) {
      const { top, bottom, left, right } = this.merges[sheetId][m];
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const xc = toXC(c, r);
          if (this.mergeCellMap[sheetId][xc] !== id) {
            this.history.updateLocalState(["mergeCellMap", sheetId, xc], undefined);
            this.dispatch("CLEAR_CELL", {
              sheet: sheetId,
              col: c,
              row: r,
            });
          }
        }
      }
      this.history.updateLocalState(["merges", sheetId, m], undefined);
    }
  }

  private removeMerge(sheetId: string, zone: Zone) {
    const { left, top, bottom, right } = zone;
    let tl = toXC(left, top);
    const mergeId = this.mergeCellMap[sheetId][tl];
    const mergeZone = this.merges[sheetId][mergeId];
    if (!isEqual(zone, mergeZone)) {
      throw new Error(_lt("Invalid merge zone"));
    }
    this.history.updateLocalState(["merges", sheetId, mergeId], undefined);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const xc = toXC(c, r);
        this.history.updateLocalState(["mergeCellMap", sheetId, xc], undefined);
      }
    }
  }

  private interactiveMerge(sheet: string, zone: Zone) {
    const result = this.dispatch("ADD_MERGE", { sheet, zone });

    if (result.status === "CANCELLED") {
      if (result.reason === CancelledReason.MergeIsDestructive) {
        this.ui.askConfirmation(
          _lt("Merging these cells will only preserve the top-leftmost value. Merge anyway?"),
          () => {
            this.dispatch("ADD_MERGE", { sheet, zone, force: true });
          }
        );
      }
    }
  }

  private duplicateMerge(xc: string, col: number, row: number, sheetId: UID, cut?: boolean) {
    const mergeId = this.mergeCellMap[sheetId][xc];
    const merge = this.merges[sheetId][mergeId];
    const colNumber = this.getters.getNumberCols(sheetId) - 1;
    const rowNumber = this.getters.getNumberRows(sheetId) - 1;
    const newMerge = {
      left: col,
      top: row,
      right: clip(col + merge.right - merge.left, 0, colNumber),
      bottom: clip(row + merge.bottom - merge.top, 0, rowNumber),
    };
    if (cut) {
      this.dispatch("REMOVE_MERGE", {
        sheet: sheetId,
        zone: merge,
      });
    }
    this.dispatch("ADD_MERGE", {
      sheet: this.getters.getActiveSheet(),
      zone: newMerge,
    });
  }

  // ---------------------------------------------------------------------------
  // Add/Remove columns
  // ---------------------------------------------------------------------------

  private removeAllMerges(sheetId: UID) {
    for (let id in this.merges[sheetId]) {
      this.history.updateLocalState(["merges", sheetId, id], undefined);
    }
    for (let id in this.mergeCellMap[sheetId]) {
      this.history.updateLocalState(["mergeCellMap", sheetId, id], undefined);
    }
  }

  private exportAndRemoveMerges(
    sheetId: UID,
    updater: (s: string) => string | null,
    isCol: boolean
  ) {
    const merges = exportMerges(this.merges[sheetId]);
    const updatedMerges: string[] = [];
    for (let m of merges) {
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
    this.history.updateLocalState(["pending"], { sheet: sheetId, merges: updatedMerges });
  }

  private updateMergesStyles(sheetId: string, isColumn: boolean) {
    const sheet = this.workbook.sheets[sheetId];
    for (let merge of Object.values(this.merges[sheetId])) {
      const xc = merge.topLeft;
      const topLeft = sheet.cells[xc];
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
        sheet: sheet.id,
        col: x,
        row: y,
        style: topLeft.style,
        border: topLeft.border,
        format: topLeft.format,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Copy/Cut/Paste and Merge
  // ---------------------------------------------------------------------------

  private isPasteAllowed(target: Zone[], force: boolean): CommandResult {
    if (!force) {
      const pasteZones = this.getters.getPasteZones(target);
      for (let zone of pasteZones) {
        if (this.doesIntersectMerge(zone)) {
          return {
            status: "CANCELLED",
            reason: CancelledReason.WillRemoveExistingMerge,
          };
        }
      }
    }
    return {
      status: "SUCCESS",
    };
  }

  // ---------------------------------------------------------------------------
  // Autofill
  // ---------------------------------------------------------------------------

  private autoFillMerge(originCol: number, originRow: number, col: number, row: number) {
    const xcOrigin = toXC(originCol, originRow);
    const xcTarget = toXC(col, row);
    const activeSheet = this.getters.getActiveSheet();
    if (this.isInMerge(xcTarget) && !this.isInMerge(xcOrigin)) {
      const mergeId = this.mergeCellMap[activeSheet][xcTarget];
      const zone = this.merges[activeSheet][mergeId];
      this.dispatch("REMOVE_MERGE", {
        sheet: activeSheet,
        zone,
      });
    }
    if (this.isMainCell(xcOrigin, activeSheet)) {
      this.duplicateMerge(xcOrigin, col, row, activeSheet);
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    const sheets = data.sheets || [];
    for (let sheetData of sheets) {
      const sheet = this.workbook.sheets[sheetData.id];
      this.history.updateLocalState(["merges", sheetData.id], {});
      this.history.updateLocalState(["mergeCellMap", sheetData.id], {});
      if (sheet && sheetData.merges) {
        this.importMerges(sheet.id, sheetData.merges);
      }
    }
  }

  private importMerges(sheetId: string, merges: string[]) {
    for (let m of merges) {
      let id = this.nextId++;
      const [tl, br] = m.split(":");
      const [left, top] = toCartesian(tl);
      const [right, bottom] = toCartesian(br);
      this.history.updateLocalState(["merges", sheetId, id], {
        id,
        left,
        top,
        right,
        bottom,
        topLeft: tl,
      });
      for (let row = top; row <= bottom; row++) {
        for (let col = left; col <= right; col++) {
          const xc = toXC(col, row);
          this.history.updateLocalState(["mergeCellMap", sheetId, xc], id);
        }
      }
    }
  }
  export(data: WorkbookData) {
    for (let sheetData of data.sheets) {
      sheetData.merges.push(...exportMerges(this.merges[sheetData.id]));
    }
  }
}

function exportMerges(merges: { [key: number]: Merge }): string[] {
  return Object.values(merges).map(
    (merge) => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom)
  );
}
