import { BasePlugin } from "../base_plugin";
import {
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
} from "../helpers/grid_manipulation";
import { isEqual, toCartesian, toXC, union } from "../helpers/index";
import { CancelledReason, Command, CommandResult, Merge, WorkbookData, Zone } from "../types/index";

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
  ];

  private nextId: number = 1;
  private pending: PendingMerges | null = null;

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
      case "PASTE_CELL":
        const xc = toXC(cmd.originCol, cmd.originRow);
        if (this.isMainCell(xc, cmd.sheet)) {
          this.pasteMerge(xc, cmd.col, cmd.row, cmd.sheet, cmd.cut);
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

  /**
   * Return true if the current selection requires losing state if it is merged.
   * This happens when there is some textual content in other cells than the
   * top left.
   */
  isMergeDestructive(zone: Zone): boolean {
    const { left, right, top, bottom } = zone;
    for (let row = top; row <= bottom; row++) {
      const actualRow = this.workbook.rows[row];
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
        if (this.workbook.mergeCellMap[cellXc]) {
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
    let result: Zone = { left, right, top, bottom };
    for (let i = left; i <= right; i++) {
      for (let j = top; j <= bottom; j++) {
        let mergeId = this.workbook.mergeCellMap[toXC(i, j)];
        if (mergeId) {
          result = union(this.workbook.merges[mergeId], result);
        }
      }
    }
    return isEqual(result, zone) ? result : this.expandZone(result);
  }

  isInMerge(xc: string): boolean {
    return xc in this.workbook.mergeCellMap;
  }

  isMainCell(xc: string, sheet: string): boolean {
    const sheetID = this.workbook.sheets.findIndex((s) => s.name === sheet);
    for (let merge of Object.values(this.workbook.sheets[sheetID].merges)) {
      if (xc === merge.topLeft) {
        return true;
      }
    }
    return false;
  }

  getMainCell(xc: string): string {
    if (!this.isInMerge(xc)) {
      return xc;
    }
    const merge = this.workbook.mergeCellMap[xc];
    return this.workbook.merges[merge].topLeft;
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
  private addMerge(sheet: string, zone: Zone) {
    const { left, right, top, bottom } = zone;
    let tl = toXC(left, top);
    let br = toXC(right, bottom);
    if (tl === br) {
      return;
    }

    let id = this.nextId++;
    this.history.updateState(["merges", id], {
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
            sheet,
            col,
            row,
          });
        }
        if (this.workbook.mergeCellMap[xc]) {
          previousMerges.add(this.workbook.mergeCellMap[xc]);
        }
        this.history.updateState(["mergeCellMap", xc], id);
      }
    }
    for (let m of previousMerges) {
      const { top, bottom, left, right } = this.workbook.merges[m];
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const xc = toXC(c, r);
          if (this.workbook.mergeCellMap[xc] !== id) {
            this.history.updateState(["mergeCellMap", xc], undefined);
            this.dispatch("CLEAR_CELL", {
              sheet,
              col: c,
              row: r,
            });
          }
        }
      }
      this.history.updateState(["merges", m], undefined);
    }
  }

  private removeMerge(sheet: string, zone: Zone) {
    const sheetID = this.workbook.sheets.findIndex((s) => s.name === sheet);
    const { left, top, bottom, right } = zone;
    let tl = toXC(left, top);
    const mergeId = this.workbook.sheets[sheetID].mergeCellMap[tl];
    const mergeZone = this.workbook.sheets[sheetID].merges[mergeId];
    if (!isEqual(zone, mergeZone)) {
      throw new Error("Invalid merge zone");
    }
    this.history.updateState(["merges", mergeId], undefined);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const xc = toXC(c, r);
        this.history.updateState(["mergeCellMap", xc], undefined);
      }
    }
  }

  private interactiveMerge(sheet: string, zone: Zone) {
    const result = this.dispatch("ADD_MERGE", { sheet, zone });

    if (result.status === "CANCELLED") {
      if (result.reason === CancelledReason.MergeIsDestructive) {
        this.ui.askConfirmation(
          "Merging these cells will only preserve the top-leftmost value. Merge anyway?",
          () => {
            this.dispatch("ADD_MERGE", { sheet, zone, force: true });
          }
        );
      }
    }
  }
  // ---------------------------------------------------------------------------
  // Add/Remove columns
  // ---------------------------------------------------------------------------

  private removeAllMerges(sheetName: string) {
    const index = this.workbook.sheets.findIndex((s) => s.name === sheetName);
    for (let id in this.workbook.sheets[index].merges) {
      this.history.updateState(["sheets", index, "merges", id], undefined);
    }
    for (let id in this.workbook.sheets[index].mergeCellMap) {
      this.history.updateState(["sheets", index, "mergeCellMap", id], undefined);
    }
  }

  private exportAndRemoveMerges(
    sheetName: string,
    updater: (s: string) => string | null,
    isCol: boolean
  ) {
    const sheet = this.workbook.sheets.find((s) => s.name === sheetName)!;
    const merges = exportMerges(sheet.merges);
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
    this.updateMergesStyles(sheetName, isCol);
    this.removeAllMerges(sheetName);
    this.history.updateLocalState(["pending"], { sheet: sheetName, merges: updatedMerges });
  }

  private updateMergesStyles(sheetName: string, isColumn: boolean) {
    const index = this.workbook.sheets.findIndex((s) => s.name === sheetName);
    for (let merge of Object.values(this.workbook.merges)) {
      const xc = merge.topLeft;
      const topLeft = this.workbook.cells[xc];
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
        sheet: this.workbook.sheets[index].name,
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

  private pasteMerge(xc: string, col: number, row: number, sheet: string, cut?: boolean) {
    const sheetID = this.workbook.sheets.findIndex((s) => s.name === sheet);
    const mergeId = this.workbook.sheets[sheetID].mergeCellMap[xc];
    const merge = this.workbook.sheets[sheetID].merges[mergeId];
    const newMerge = {
      left: col,
      top: row,
      right: col + merge.right - merge.left,
      bottom: row + merge.bottom - merge.top,
    };
    if (cut) {
      this.dispatch("REMOVE_MERGE", {
        sheet: sheet,
        zone: merge,
      });
    }
    this.dispatch("ADD_MERGE", {
      sheet: this.workbook.activeSheet.name,
      zone: newMerge,
    });
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    const sheets = data.sheets || [];
    for (let [sheetID, sheetData] of sheets.entries()) {
      const sheet = this.workbook.sheets[sheetID];
      if (sheet && sheetData.merges) {
        this.importMerges(sheet.name, sheetData.merges);
      }
    }
  }

  private importMerges(sheetName: string, merges: string[]) {
    const index = this.workbook.sheets.findIndex((s) => s.name === sheetName);
    for (let m of merges) {
      let id = this.nextId++;
      const [tl, br] = m.split(":");
      const [left, top] = toCartesian(tl);
      const [right, bottom] = toCartesian(br);
      this.history.updateState(["sheets", index, "merges", id], {
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
          this.history.updateState(["sheets", index, "mergeCellMap", xc], id);
        }
      }
    }
  }
  export(data: WorkbookData) {
    for (let [sheetID, sheetData] of data.sheets.entries()) {
      const sheet = this.workbook.sheets[sheetID];
      sheetData.merges.push(...exportMerges(sheet.merges));
    }
  }
}

function exportMerges(merges: { [key: number]: Merge }): string[] {
  return Object.values(merges).map(
    (merge) => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom)
  );
}
