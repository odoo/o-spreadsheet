import { isEqual, toXC, union } from "../../helpers";
import { BasePlugin } from "../base_plugin";
import { activateCell, stopEditing, updateScroll } from "../core";
import { GridCommand, Zone } from "../types";

export class SelectionPlugin extends BasePlugin {
  static getters = ["getActiveCols", "getActiveRows"];

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  dispatch(cmd: GridCommand) {
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

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

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
    const { activeCol, activeRow, cols, rows, viewport, selection } = this.workbook;

    const moveReferenceRow = this.workbook.isSelectingRange ? selection.anchor.row : activeRow;
    const moveReferenceCol = this.workbook.isSelectingRange ? selection.anchor.col : activeCol;
    const activeReference = toXC(moveReferenceCol, moveReferenceRow);

    const invalidMove =
      (deltaY < 0 && moveReferenceRow === 0) ||
      (deltaY > 0 && moveReferenceRow === rows.length - 1) ||
      (deltaX < 0 && moveReferenceCol === 0) ||
      (deltaX > 0 && moveReferenceCol === cols.length - 1);
    if (invalidMove) {
      return;
    }
    let mergeId = this.workbook.mergeCellMap[activeReference];
    if (mergeId) {
      let targetCol = moveReferenceCol;
      let targetRow = moveReferenceRow;
      while (this.workbook.mergeCellMap[toXC(targetCol, targetRow)] === mergeId) {
        targetCol += deltaX;
        targetRow += deltaY;
      }
      if (targetCol >= 0 && targetRow >= 0) {
        this.selectCell(targetCol, targetRow);
      }
    } else {
      this.selectCell(moveReferenceCol + deltaX, moveReferenceRow + deltaY);
    }
    // keep current cell in the viewport, if possible
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
    // const anchor = Object.assign({}, workbook.selection.anchor);
    this.selectCell(...anchor);
    this.workbook.selection.zones = zones.map(z => this.expandZone(z));
    // updateSelection(this.workbook, col + repX * width - 1, row + repY * height - 1);
    this.workbook.selection.anchor.col = anchor[0];
    this.workbook.selection.anchor.row = anchor[1];
    // activateCell(workbook, newCol, newRow);
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
}
