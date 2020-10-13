import {
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
} from "../../helpers/grid_manipulation";
import { isEqual, toCartesian, toXC, union, overlap, clip, toZone } from "../../helpers/index";
import {
  CancelledReason,
  Command,
  CommandResult,
  Merge,
  SheetCreatedEvent,
  SheetDeletedEvent,
  UID,
  WorkbookData,
  Zone,
} from "../../types/index";
import { BasePlugin } from "./base_plugin";
import { _lt } from "../../translation";

interface PendingMerges {
  sheet: string;
  merges: string[];
}

export class MergePlugin extends BasePlugin {
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
  private merges: Record<UID, { [key: number]: Merge }> = {};
  private mergeCellMap: Record<UID, { [key: string]: number }> = {};

  registerListener() {
    this.bus.on("sheet-created", this, (event: SheetCreatedEvent) => {
      this.history.update(["merges", event.sheetId], {});
      this.history.update(["mergeCellMap", event.sheetId], {});
    });
    this.bus.on("sheet-deleted", this, (event: SheetDeletedEvent) => {
      this.history.update(["merges", event.sheetId], {});
      this.history.update(["mergeCellMap", event.sheetId], {});
    });
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  allowDispatch(cmd: Command): CommandResult {
    const force = "force" in cmd ? !!cmd.force : false;

    switch (cmd.type) {
      case "ADD_MERGE":
        return this.isMergeAllowed(cmd.zone, force);
      default:
        return { status: "SUCCESS" };
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "DUPLICATE_SHEET":
        this.history.update(
          ["merges", cmd.sheetIdTo],
          Object.assign({}, this.merges[cmd.sheetIdFrom])
        );
        this.history.update(
          ["mergeCellMap", cmd.sheetIdTo],
          Object.assign({}, this.mergeCellMap[cmd.sheetIdFrom])
        );
        break;
      case "ADD_MERGE":
        if (cmd.interactive) {
          this.interactiveMerge(cmd.sheetId, cmd.zone);
        } else {
          this.addMerge(cmd.sheetId, cmd.zone);
        }
        break;
      case "REMOVE_MERGE":
        this.removeMerge(cmd.sheetId, cmd.zone);
        break;
      case "AUTOFILL_CELL":
        this.autoFillMerge(cmd.originCol, cmd.originRow, cmd.col, cmd.row);
        break;
      case "PASTE_CELL":
        const xc = toXC(cmd.originCol, cmd.originRow);
        if (this.isMainCell(xc, cmd.sheetId)) {
          this.duplicateMerge(xc, cmd.col, cmd.row, cmd.sheetId, cmd.cut);
        }
        break;
      case "REMOVE_COLUMNS":
        this.exportAndRemoveMerges(
          cmd.sheetId,
          (range) => updateRemoveColumns(range, cmd.columns),
          true
        );
        if (this.pending) {
          this.importMerges(this.pending.sheet, this.pending.merges);
          this.pending = null;
        }
        break;
      case "REMOVE_ROWS":
        this.exportAndRemoveMerges(
          cmd.sheetId,
          (range) => updateRemoveRows(range, cmd.rows),
          false
        );
        if (this.pending) {
          this.importMerges(this.pending.sheet, this.pending.merges);
          this.pending = null;
        }
        break;
      case "ADD_COLUMNS":
        const col = cmd.position === "before" ? cmd.column : cmd.column + 1;
        this.exportAndRemoveMerges(
          cmd.sheetId,
          (range) => updateAddColumns(range, col, cmd.quantity),
          true
        );
        if (this.pending) {
          this.importMerges(this.pending.sheet, this.pending.merges);
          this.pending = null;
        }
        break;
      case "ADD_ROWS":
        const row = cmd.position === "before" ? cmd.row : cmd.row + 1;
        this.exportAndRemoveMerges(
          cmd.sheetId,
          (range) => updateAddRows(range, row, cmd.quantity),
          false
        );
        if (this.pending) {
          this.importMerges(this.pending.sheet, this.pending.merges);
          this.pending = null;
        }
        break;
      // case "ADD_COLUMNS":
      // case "ADD_ROWS":
      // case "REMOVE_COLUMNS":
      // case "REMOVE_ROWS":
      //   if (this.pending) {
      //     this.importMerges(this.pending.sheet, this.pending.merges);
      //     this.pending = null;
      //   }
      //   break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getMerges(sheetId: UID): Merge[] {
    return Object.values(this.merges[sheetId]);
  }

  getMerge(sheetId: UID, xc: string): Merge | undefined {
    return this.merges[sheetId][this.mergeCellMap[sheetId][xc]];
  }

  /**
   * Return true if the current selection requires losing state if it is merged.
   * This happens when there is some textual content in other cells than the
   * top left.
   */
  isMergeDestructive(zone: Zone): boolean {
    const { left, right, top, bottom } = zone;
    for (let row = top; row <= bottom; row++) {
      const actualRow = this.getters.getRow(this.getters.getActiveSheetId(), row);
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
        const activeSheet = this.getters.getActiveSheetId();
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
    const activeSheet = this.getters.getActiveSheetId();
    let result: Zone = { left, right, top, bottom };

    for (let id in this.merges[activeSheet]) {
      const merge = this.merges[activeSheet][id];
      if (overlap(merge, result)) {
        result = union(merge, result);
      }
    }
    return isEqual(result, zone) ? result : this.expandZone(result);
  }

  isInSameMerge(xc1: string, xc2: string): boolean {
    if (!this.isInMerge(xc1) || !this.isInMerge(xc2)) {
      return false;
    }
    const activeSheet = this.getters.getActiveSheetId();
    return this.mergeCellMap[activeSheet][xc1] === this.mergeCellMap[activeSheet][xc2];
  }

  isInMerge(xc: string): boolean {
    const activeSheet = this.getters.getActiveSheetId();
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
    const activeSheet = this.getters.getActiveSheetId();
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
    const tl = toXC(left, top);
    const br = toXC(right, bottom);
    if (tl === br) {
      return;
    }
    const topLeft = this.getters.getCell(left, top);

    let id = this.nextId++;
    this.history.update(["merges", sheetId, id], {
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
            sheetId,
            col,
            row,
            style: topLeft ? topLeft.style : undefined,
            content: undefined,
          });
        }
        if (this.mergeCellMap[sheetId][xc]) {
          previousMerges.add(this.mergeCellMap[sheetId][xc]);
        }
        this.history.update(["mergeCellMap", sheetId, xc], id);
      }
    }

    for (let mergeId of previousMerges) {
      const { top, bottom, left, right } = this.merges[sheetId][mergeId];
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const xc = toXC(c, r);
          if (this.mergeCellMap[sheetId][xc] !== id) {
            this.history.update(["mergeCellMap", sheetId, xc], undefined);
            this.dispatch("CLEAR_CELL", {
              sheetId: sheetId,
              col: c,
              row: r,
            });
          }
        }
      }
      this.history.update(["merges", sheetId, mergeId], undefined);
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
    this.history.update(["merges", sheetId, mergeId], undefined);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const xc = toXC(c, r);
        this.history.update(["mergeCellMap", sheetId, xc], undefined);
      }
    }
  }

  private interactiveMerge(sheet: string, zone: Zone) {
    const result = this.dispatch("ADD_MERGE", { sheetId: sheet, zone });

    if (result.status === "CANCELLED") {
      if (result.reason === CancelledReason.MergeIsDestructive) {
        this.ui.askConfirmation(
          _lt("Merging these cells will only preserve the top-leftmost value. Merge anyway?"),
          () => {
            this.dispatch("ADD_MERGE", { sheetId: sheet, zone, force: true });
          }
        );
      }
    }
  }

  private duplicateMerge(xc: string, col: number, row: number, sheetId: UID, cut?: boolean) {
    const mergeId = this.mergeCellMap[sheetId][xc];
    const merge = this.merges[sheetId][mergeId];
    const sheet = this.getters.getSheet(sheetId);
    const colNumber = sheet.colNumber - 1;
    const rowNumber = sheet.rowNumber - 1;
    const newMerge = {
      left: col,
      top: row,
      right: clip(col + merge.right - merge.left, 0, colNumber),
      bottom: clip(row + merge.bottom - merge.top, 0, rowNumber),
    };
    if (cut) {
      this.dispatch("REMOVE_MERGE", {
        sheetId: sheetId,
        zone: merge,
      });
    }
    this.dispatch("ADD_MERGE", {
      sheetId: this.getters.getActiveSheetId(),
      zone: newMerge,
    });
  }

  // ---------------------------------------------------------------------------
  // Add/Remove columns
  // ---------------------------------------------------------------------------

  private removeAllMerges(sheetId: UID) {
    for (let id in this.merges[sheetId]) {
      this.history.update(["merges", sheetId, id], undefined);
    }
    for (let id in this.mergeCellMap[sheetId]) {
      this.history.update(["mergeCellMap", sheetId, id], undefined);
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
    //this.updateMergesStyles(sheetId, isCol);
    this.removeAllMerges(sheetId);
    this.pending = { sheet: sheetId, merges: updatedMerges };
  }

  // @ts-ignore
  private updateMergesStyles(sheetId: string, isColumn: boolean) {
    const sheet = this.getters.getSheets().find((s) => s.id === sheetId)!;
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
        sheetId: sheet.id,
        col: x,
        row: y,
        style: topLeft.style,
        border: topLeft.border,
        format: topLeft.format,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Autofill
  // ---------------------------------------------------------------------------

  private autoFillMerge(originCol: number, originRow: number, col: number, row: number) {
    const xcOrigin = toXC(originCol, originRow);
    const xcTarget = toXC(col, row);
    const activeSheet = this.getters.getActiveSheetId();
    if (this.isInMerge(xcTarget) && !this.isInMerge(xcOrigin)) {
      const mergeId = this.mergeCellMap[activeSheet][xcTarget];
      const zone = this.merges[activeSheet][mergeId];
      this.dispatch("REMOVE_MERGE", {
        sheetId: activeSheet,
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
      this.history.update(["merges", sheetData.id], {});
      this.history.update(["mergeCellMap", sheetData.id], {});
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
      sheetData.merges.push(...exportMerges(this.merges[sheetData.id]));
    }
  }
}

function exportMerges(merges: { [key: number]: Merge }): string[] {
  return Object.values(merges).map(
    (merge) => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom)
  );
}
