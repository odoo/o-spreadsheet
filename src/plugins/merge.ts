import { BasePlugin } from "../base_plugin";
import {
  updateAddColumns,
  updateAddRows,
  updateRemoveColumns,
  updateRemoveRows,
} from "../helpers/grid_manipulation";
import { isEqual, toCartesian, toXC, union, overlap, clip, isDefined } from "../helpers/index";
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

type SheetMergeCellMap = Record<string, number | undefined>;

interface MergeState {
  readonly merges: Record<UID, Record<number, Merge | undefined> | undefined>;
  readonly mergeCellMap: Record<UID, SheetMergeCellMap | undefined>; // SheetId [ XC ] --> merge ID
  readonly pending: PendingMerges | null;
}

export class MergePlugin extends BasePlugin<MergeState> implements MergeState {
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
  readonly pending: PendingMerges | null = null;

  readonly merges: Record<UID, Record<number, Merge | undefined> | undefined> = {};
  readonly mergeCellMap: Record<UID, SheetMergeCellMap | undefined> = {};

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
      case "UPDATE_CELL":
        const xc = toXC(cmd.col, cmd.row);
        return this.getMainCell(xc) === xc
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.CellInMerge };
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
    }
    if (this.pending) {
      this.importMerges(this.pending.sheet, this.pending.merges);
      this.history.update("pending", null);
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
  isMergeDestructive(zone: Zone): boolean {
    const { left, right, top, bottom } = zone;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          const cell = this.getters.getCell(this.getters.getActiveSheetId(), col, row);
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
        if (this.getMergeByXc(activeSheet, cellXc)) {
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
      const merge = this.getMergeById(activeSheet, parseInt(id));
      if (merge && overlap(merge, result)) {
        result = union(merge, result);
      }
    }
    return isEqual(result, zone) ? result : this.expandZone(result);
  }

  isInSameMerge(xc1: string, xc2: string): boolean {
    if (!this.isInMerge(xc1) || !this.isInMerge(xc2)) {
      return false;
    }
    const activeSheetId = this.getters.getActiveSheetId();
    return this.getMergeByXc(activeSheetId, xc1) === this.getMergeByXc(activeSheetId, xc2);
  }

  isInMerge(xc: string): boolean {
    const activeSheet = this.getters.getActiveSheetId();
    const sheetMap = this.mergeCellMap[activeSheet];
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

  getMainCell(xc: string): string {
    if (!this.isInMerge(xc)) {
      return xc;
    }
    const activeSheet = this.getters.getActiveSheetId();
    return this.getMergeByXc(activeSheet, xc)!.topLeft;
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
    const topLeft = this.getters.getCell(sheetId, left, top);

    let id = this.nextId++;
    this.history.update("merges", sheetId, id, {
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
        const merge = this.getMergeByXc(sheetId, xc);
        if (merge) {
          previousMerges.add(merge.id);
        }
        this.history.update("mergeCellMap", sheetId, xc, id);
      }
    }
    this.applyBorderMerge(sheetId, zone);
    for (let mergeId of previousMerges) {
      const { top, bottom, left, right } = this.getMergeById(sheetId, mergeId)!;
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const xc = toXC(c, r);
          const merge = this.getMergeByXc(sheetId, xc);
          if (!merge || merge.id !== id) {
            this.history.update("mergeCellMap", sheetId, xc, undefined);
            this.dispatch("CLEAR_CELL", {
              sheetId: sheetId,
              col: c,
              row: r,
            });
          }
        }
      }
      this.history.update("merges", sheetId, mergeId, undefined);
    }
  }

  private applyBorderMerge(sheetId: UID, zone: Zone) {
    const { left, right, top, bottom } = zone;
    const topLeft = this.getters.getCell(sheetId, left, top);
    const bottomRight = this.getters.getCell(sheetId, right, bottom) || topLeft;
    const bordersTopLeft = topLeft ? this.getters.getCellBorder(topLeft) : null;
    const bordersBottomRight =
      (bottomRight ? this.getters.getCellBorder(bottomRight) : null) || bordersTopLeft;
    this.dispatch("SET_FORMATTING", {
      sheetId,
      target: [{ left, right, top, bottom }],
      border: "clear",
    });
    if (bordersBottomRight && bordersBottomRight.right) {
      const zone = [{ left: right, right, top, bottom }];
      this.dispatch("SET_FORMATTING", {
        sheetId,
        target: zone,
        border: "right",
      });
    }
    if (bordersTopLeft && bordersTopLeft.left) {
      const zone = [{ left, right: left, top, bottom }];
      this.dispatch("SET_FORMATTING", {
        sheetId,
        target: zone,
        border: "left",
      });
    }
    if (bordersTopLeft && bordersTopLeft.top) {
      const zone = [{ left, right, top, bottom: top }];
      this.dispatch("SET_FORMATTING", {
        sheetId,
        target: zone,
        border: "top",
      });
    }
    if (bordersBottomRight && bordersBottomRight.bottom) {
      const zone = [{ left, right, top: bottom, bottom }];
      this.dispatch("SET_FORMATTING", {
        sheetId,
        target: zone,
        border: "bottom",
      });
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
    const merge = this.getMergeByXc(sheetId, xc);
    const sheet = this.getters.getSheet(sheetId);
    if (!merge || !sheet) return;
    const colNumber = sheet.cols.length - 1;
    const rowNumber = sheet.rows.length - 1;
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
    this.history.update("pending", { sheet: sheetId, merges: updatedMerges });
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
    const activeSheet = this.getters.getActiveSheetId();
    if (this.isInMerge(xcTarget) && !this.isInMerge(xcOrigin)) {
      const zone = this.getMergeByXc(activeSheet, xcTarget);
      if (zone) {
        this.dispatch("REMOVE_MERGE", {
          sheetId: activeSheet,
          zone,
        });
      }
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
      this.history.update("merges", sheetData.id, {});
      this.history.update("mergeCellMap", sheetData.id, {});
      if (sheetData.merges) {
        this.importMerges(sheetData.id, sheetData.merges);
      }
    }
  }

  private importMerges(sheetId: string, merges: string[]) {
    for (let m of merges) {
      let id = this.nextId++;
      const [tl, br] = m.split(":");
      const [left, top] = toCartesian(tl);
      const [right, bottom] = toCartesian(br);
      this.history.update("merges", sheetId, id, {
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
          this.history.update("mergeCellMap", sheetId, xc, id);
        }
      }
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
