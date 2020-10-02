import { BasePlugin } from "../base_plugin";
import {
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
} from "../helpers/grid_manipulation";
import { isEqual, toCartesian, toXC, union, overlap, clip } from "../helpers/index";
import { _lt } from "../translation";
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
        if (this.workbook.activeSheet.mergeCellMap[cellXc]) {
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
    const sheet = this.workbook.activeSheet;
    let result: Zone = { left, right, top, bottom };

    for (let id in sheet.merges) {
      const merge = sheet.merges[id];
      if (overlap(merge, result)) {
        result = union(merge, result);
      }
    }
    return isEqual(result, zone) ? result : this.expandZone(result);
  }

  isInMerge(xc: string): boolean {
    return xc in this.workbook.activeSheet.mergeCellMap;
  }

  isMainCell(xc: string, sheetId: string): boolean {
    const merges = this.workbook.sheets[sheetId].merges;
    for (let key in merges) {
      if (merges[key].topLeft === xc) {
        return true;
      }
    }
    return false;
  }

  getMainCell(xc: string): string {
    if (!this.isInMerge(xc)) {
      return xc;
    }
    const sheet = this.workbook.activeSheet;
    const merge = sheet.mergeCellMap[xc];
    return sheet.merges[merge].topLeft;
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
  private addMerge(sheetId: string, zone: Zone) {
    const sheet = this.workbook.sheets[sheetId];
    const { left, right, top, bottom } = zone;
    const tl = toXC(left, top);
    const br = toXC(right, bottom);
    if (tl === br) {
      return;
    }
    const topLeft = this.getters.getCell(left, top);

    let id = this.nextId++;
    this.history.updateState(["sheets", sheetId, "merges", id], {
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
            sheet: sheetId,
            col,
            row,
            style: topLeft ? topLeft.style : undefined,
            content: undefined,
          });
        }
        if (sheet.mergeCellMap[xc]) {
          previousMerges.add(sheet.mergeCellMap[xc]);
        }
        this.history.updateState(["sheets", sheetId, "mergeCellMap", xc], id);
      }
    }
    this.applyBorderMerge(zone, sheetId);
    for (let m of previousMerges) {
      const { top, bottom, left, right } = sheet.merges[m];
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const xc = toXC(c, r);
          if (sheet.mergeCellMap[xc] !== id) {
            this.history.updateState(["sheets", sheetId, "mergeCellMap", xc], undefined);
            this.dispatch("CLEAR_CELL", {
              sheet: sheetId,
              col: c,
              row: r,
            });
          }
        }
      }
      this.history.updateState(["sheets", sheetId, "merges", m], undefined);
    }
  }

  private applyBorderMerge(zone: Zone, sheet: string) {
    const { left, right, top, bottom } = zone;
    const topLeft = this.getters.getCell(left, top);
    const bottomRight = this.getters.getCell(right, bottom) || topLeft;
    const bordersTopLeft = topLeft ? this.getters.getCellBorder(topLeft) : null;
    const bordersBottomRight =
      (bottomRight ? this.getters.getCellBorder(bottomRight) : null) || bordersTopLeft;
    this.dispatch("SET_FORMATTING", {
      sheet,
      target: [{ left, right, top, bottom }],
      border: "clear",
    });
    if (bordersBottomRight && bordersBottomRight.right) {
      const zone = [{ left: right, right, top, bottom }];
      this.dispatch("SET_FORMATTING", {
        sheet,
        target: zone,
        border: "right",
      });
    }
    if (bordersTopLeft && bordersTopLeft.left) {
      const zone = [{ left, right: left, top, bottom }];
      this.dispatch("SET_FORMATTING", {
        sheet,
        target: zone,
        border: "left",
      });
    }
    if (bordersTopLeft && bordersTopLeft.top) {
      const zone = [{ left, right, top, bottom: top }];
      this.dispatch("SET_FORMATTING", {
        sheet,
        target: zone,
        border: "top",
      });
    }
    if (bordersBottomRight && bordersBottomRight.bottom) {
      const zone = [{ left, right, top: bottom, bottom }];
      this.dispatch("SET_FORMATTING", {
        sheet,
        target: zone,
        border: "bottom",
      });
    }
  }

  private removeMerge(sheetId: string, zone: Zone) {
    const { left, top, bottom, right } = zone;
    let tl = toXC(left, top);
    const mergeId = this.workbook.sheets[sheetId].mergeCellMap[tl];
    const mergeZone = this.workbook.sheets[sheetId].merges[mergeId];
    if (!isEqual(zone, mergeZone)) {
      throw new Error(_lt("Invalid merge zone"));
    }
    this.history.updateState(["sheets", sheetId, "merges", mergeId], undefined);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const xc = toXC(c, r);
        this.history.updateState(["sheets", sheetId, "mergeCellMap", xc], undefined);
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

  private duplicateMerge(xc: string, col: number, row: number, sheetId: string, cut?: boolean) {
    const mergeId = this.workbook.sheets[sheetId].mergeCellMap[xc];
    const merge = this.workbook.sheets[sheetId].merges[mergeId];
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
      sheet: this.workbook.activeSheet.id,
      zone: newMerge,
    });
  }

  // ---------------------------------------------------------------------------
  // Add/Remove columns
  // ---------------------------------------------------------------------------

  private removeAllMerges(sheetId: string) {
    const sheet = this.workbook.sheets[sheetId];
    for (let id in sheet.merges) {
      this.history.updateState(["sheets", sheetId, "merges", id], undefined);
    }
    for (let id in sheet.mergeCellMap) {
      this.history.updateState(["sheets", sheetId, "mergeCellMap", id], undefined);
    }
  }

  private exportAndRemoveMerges(
    sheetId: string,
    updater: (s: string) => string | null,
    isCol: boolean
  ) {
    const sheet = this.workbook.sheets[sheetId];
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
    this.updateMergesStyles(sheetId, isCol);
    this.removeAllMerges(sheetId);
    this.history.updateLocalState(["pending"], { sheet: sheetId, merges: updatedMerges });
  }

  private updateMergesStyles(sheetId: string, isColumn: boolean) {
    const sheet = this.workbook.sheets[sheetId];
    for (let merge of Object.values(sheet.merges)) {
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
    const sheet = this.getters.getActiveSheet();
    if (this.isInMerge(xcTarget) && !this.isInMerge(xcOrigin)) {
      const mergeId = this.workbook.sheets[sheet].mergeCellMap[xcTarget];
      const zone = this.workbook.sheets[sheet].merges[mergeId];
      this.dispatch("REMOVE_MERGE", {
        sheet,
        zone,
      });
    }
    if (this.isMainCell(xcOrigin, sheet)) {
      this.duplicateMerge(xcOrigin, col, row, sheet);
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    const sheets = data.sheets || [];
    for (let sheetData of sheets) {
      const sheet = this.workbook.sheets[sheetData.id];
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
      this.history.updateState(["sheets", sheetId, "merges", id], {
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
          this.history.updateState(["sheets", sheetId, "mergeCellMap", xc], id);
        }
      }
    }
  }
  export(data: WorkbookData) {
    for (let sheetData of data.sheets) {
      const sheet = this.workbook.sheets[sheetData.id];
      sheetData.merges.push(...exportMerges(sheet.merges));
    }
  }
}

function exportMerges(merges: { [key: number]: Merge }): string[] {
  return Object.values(merges).map(
    (merge) => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom)
  );
}
