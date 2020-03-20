import { BasePlugin } from "../base_plugin";
import { GridCommand } from "../types";
import { toXC } from "../../helpers";
import { selectCell, updateScroll } from "../core";

export class SelectionPlugin extends BasePlugin {
  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  dispatch(cmd: GridCommand) {
    switch (cmd.type) {
      case "MOVE_POSITION":
        this.movePosition(cmd.deltaX, cmd.deltaY);
        break;
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
        selectCell(this.workbook, targetCol, targetRow);
      }
    } else {
      selectCell(this.workbook, moveReferenceCol + deltaX, moveReferenceRow + deltaY);
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
}
