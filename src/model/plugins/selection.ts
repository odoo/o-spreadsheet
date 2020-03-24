import { isEqual, toXC, union } from "../../helpers";
import { BasePlugin } from "../base_plugin";
import { activateCell, stopEditing, updateScroll } from "../core";
import { GridCommand, Zone } from "../types";

export class SelectionPlugin extends BasePlugin {
  static getters = ["getActiveCols", "getActiveRows", "getSelectionXC"];

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  canDispatch(cmd: GridCommand): boolean {
    if (cmd.type === "MOVE_POSITION") {
      const [refCol, refRow] = this.getReferenceCoords();
      const { cols, rows } = this.workbook;
      return !(
        (cmd.deltaY < 0 && refRow === 0) ||
        (cmd.deltaY > 0 && refRow === rows.length - 1) ||
        (cmd.deltaX < 0 && refCol === 0) ||
        (cmd.deltaX > 0 && refCol === cols.length - 1)
      );
    }
    return true;
  }

  dispatch(cmd: GridCommand): GridCommand[] | void {
    switch (cmd.type) {
      case "SET_SELECTION":
        this.setSelection(cmd.anchor, cmd.zones);
        break;
      case "ACTIVATE_SHEET":
        this.selectCell(0, 0);
        break;
      case "MOVE_POSITION":
        this.movePosition(cmd.deltaX, cmd.deltaY);
        break;
      case "SELECT_CELL":
        this.selectCell(cmd.col, cmd.row, cmd.createNewRange);
        break;
      case "SELECT_COLUMN":
        return this.selectColumn(cmd.index, cmd.addToSelection);
      case "SELECT_ROW":
        return this.selectRow(cmd.index, cmd.addToSelection);
      case "SELECT_ALL":
        return this.selectAll();
      case "ALTER_SELECTION":
        if (cmd.delta) {
          return this.moveSelection(cmd.delta[0], cmd.delta[1]);
        }
        if (cmd.cell) {
          return this.addCellToSelection(...cmd.cell);
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getActiveCols(): Set<number> {
    const activeCols = new Set<number>();
    for (let zone of this.workbook.selection.zones) {
      if (zone.top === 0 && zone.bottom === this.workbook.rows.length - 1) {
        for (let i = zone.left; i <= zone.right; i++) {
          activeCols.add(i);
        }
      }
    }
    return activeCols;
  }

  getActiveRows(): Set<number> {
    const activeRows = new Set<number>();
    for (let zone of this.workbook.selection.zones) {
      if (zone.left === 0 && zone.right === this.workbook.cols.length - 1) {
        for (let i = zone.top; i <= zone.bottom; i++) {
          activeRows.add(i);
        }
      }
    }
    return activeRows;
  }

  getSelectionXC(): string {
    return this.getters.zoneToXC(this.workbook.selection.zones[0]);
  }
  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  /**
   * Return [col, row]
   */
  private getReferenceCoords(): [number, number] {
    const { isSelectingRange, selection, activeCol, activeRow } = this.workbook;
    return isSelectingRange ? [selection.anchor.col, selection.anchor.row] : [activeCol, activeRow];
  }

  private selectColumn(index: number, addToSelection: boolean = false): GridCommand[] {
    const bottom = this.workbook.rows.length - 1;
    const column = { left: index, right: index, top: 0, bottom };
    const current = this.workbook.selection.zones;
    const zones = addToSelection ? current.concat(column) : [column];
    return [{ type: "SET_SELECTION", zones, anchor: [index, 0] }];
  }

  private selectRow(index: number, addToSelection: boolean = false): GridCommand[] {
    const right = this.workbook.cols.length - 1;
    const row = { top: index, bottom: index, left: 0, right };
    const current = this.workbook.selection.zones;
    const zones = addToSelection ? current.concat(row) : [row];
    return [{ type: "SET_SELECTION", zones, anchor: [0, index] }];
  }

  private selectAll(): GridCommand[] {
    const bottom = this.workbook.rows.length - 1;
    const right = this.workbook.cols.length - 1;
    const zone = { left: 0, top: 0, bottom, right };
    return [{ type: "SET_SELECTION", zones: [zone], anchor: [0, 0] }];
  }

  /**
   * Change the anchor of the selection active cell to an absolute col and row inded.
   *
   * This is a non trivial task. We need to stop the editing process and update
   * properly the current selection.  Also, this method can optionally create a new
   * range in the selection.
   */
  private selectCell(col: number, row: number, newRange: boolean = false) {
    if (!this.workbook.isSelectingRange) {
      stopEditing(this.workbook);
    }
    const xc = toXC(col, row);
    let zone: Zone;
    if (xc in this.workbook.mergeCellMap) {
      const merge = this.workbook.merges[this.workbook.mergeCellMap[xc]];
      zone = {
        left: merge.left,
        right: merge.right,
        top: merge.top,
        bottom: merge.bottom
      };
    } else {
      zone = {
        left: col,
        right: col,
        top: row,
        bottom: row
      };
    }

    if (newRange) {
      this.workbook.selection.zones.push(zone);
    } else {
      this.workbook.selection.zones = [zone];
    }
    this.workbook.selection.anchor.col = col;
    this.workbook.selection.anchor.row = row;
    if (!this.workbook.isSelectingRange) {
      activateCell(this.workbook, col, row);
    }
  }

  /**
   * Moves the position of either the active cell of the anchor of the current selection by a number of rows / cols delta
   */
  movePosition(deltaX: number, deltaY: number) {
    const { cols, rows, viewport } = this.workbook;

    const [refCol, refRow] = this.getReferenceCoords();
    const activeReference = toXC(refCol, refRow);

    let mergeId = this.workbook.mergeCellMap[activeReference];
    if (mergeId) {
      let targetCol = refCol;
      let targetRow = refRow;
      while (this.workbook.mergeCellMap[toXC(targetCol, targetRow)] === mergeId) {
        targetCol += deltaX;
        targetRow += deltaY;
      }
      if (targetCol >= 0 && targetRow >= 0) {
        this.selectCell(targetCol, targetRow);
      }
    } else {
      this.selectCell(refCol + deltaX, refRow + deltaY);
    }
    // keep current cell in the viewport, if possible
    // todo: move this in a viewport/layout plugin
    while (
      this.workbook.activeCol >= viewport.right &&
      this.workbook.activeCol !== cols.length - 1
    ) {
      updateScroll(this.workbook, this.workbook.scrollTop, cols[viewport.left].right);
    }
    while (this.workbook.activeCol < viewport.left) {
      updateScroll(this.workbook, this.workbook.scrollTop, cols[viewport.left - 1].left);
    }
    while (
      this.workbook.activeRow >= viewport.bottom &&
      this.workbook.activeRow !== rows.length - 1
    ) {
      updateScroll(this.workbook, rows[viewport.top].bottom, this.workbook.scrollLeft);
    }
    while (this.workbook.activeRow < viewport.top) {
      updateScroll(this.workbook, rows[viewport.top - 1].top, this.workbook.scrollLeft);
    }
  }

  import() {
    this.selectCell(0, 0);
  }

  setSelection(anchor: [number, number], zones: Zone[]) {
    this.selectCell(...anchor);
    this.workbook.selection.zones = zones.map(z => this.expandZone(z));
    this.workbook.selection.anchor.col = anchor[0];
    this.workbook.selection.anchor.row = anchor[1];
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

  private moveSelection(deltaX: number, deltaY: number): GridCommand[] {
    const selection = this.workbook.selection;
    const zones = selection.zones.slice();
    const lastZone = zones[selection.zones.length - 1];
    const anchorCol = selection.anchor.col;
    const anchorRow = selection.anchor.row;
    const { left, right, top, bottom } = lastZone;
    let result: Zone | null = lastZone;
    const expand = (z: Zone) => {
      const { left, right, top, bottom } = this.expandZone(z);
      return {
        left: Math.max(0, left),
        right: Math.min(this.workbook.cols.length - 1, right),
        top: Math.max(0, top),
        bottom: Math.min(this.workbook.rows.length - 1, bottom)
      };
    };

    // check if we can shrink selection
    let n = 0;
    while (result !== null) {
      n++;
      if (deltaX < 0) {
        result = anchorCol <= right - n ? expand({ top, left, bottom, right: right - n }) : null;
      }
      if (deltaX > 0) {
        result = left + n <= anchorCol ? expand({ top, left: left + n, bottom, right }) : null;
      }
      if (deltaY < 0) {
        result = anchorRow <= bottom - n ? expand({ top, left, bottom: bottom - n, right }) : null;
      }
      if (deltaY > 0) {
        result = top + n <= anchorRow ? expand({ top: top + n, left, bottom, right }) : null;
      }
      if (result && !isEqual(result, lastZone)) {
        zones[zones.length - 1] = result;
        return [{ type: "SET_SELECTION", zones, anchor: [anchorCol, anchorRow] }];
      }
    }
    const currentZone = { top: anchorRow, bottom: anchorRow, left: anchorCol, right: anchorCol };
    const zoneWithDelta = {
      top: top + deltaY,
      left: left + deltaX,
      bottom: bottom + deltaY,
      right: right + deltaX
    };
    result = expand(union(currentZone, zoneWithDelta));
    if (!isEqual(result, lastZone)) {
      zones[zones.length - 1] = result;
      return [{ type: "SET_SELECTION", zones, anchor: [anchorCol, anchorRow] }];
    }
    return [];
  }

  private addCellToSelection(col: number, row: number): GridCommand[] {
    const selection = this.workbook.selection;
    const anchorCol = selection.anchor.col;
    const anchorRow = selection.anchor.row;
    const zone: Zone = {
      left: Math.min(anchorCol, col),
      top: Math.min(anchorRow, row),
      right: Math.max(anchorCol, col),
      bottom: Math.max(anchorRow, row)
    };
    const zones = selection.zones.slice(0, -1).concat(zone);
    return [{ type: "SET_SELECTION", zones, anchor: [anchorCol, anchorRow] }];
  }
}
