import { BasePlugin } from "../base_plugin";
import { Viewport, Box, Rect, GridCommand } from "../types";
import { toXC, overlap } from "../../helpers";
import { updateScroll } from "../core";

export class LayouPlugin extends BasePlugin {
  static getters = ["getViewport"];

  handle(cmd: GridCommand) {
    switch (cmd.type) {
      case "MOVE_POSITION":
        this.updateScrollPosition();
        break;
    }
  }

  /**
   *  keep current cell in the viewport, if possible
   */
  updateScrollPosition() {
    const { cols, rows, viewport } = this.workbook;

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

  getViewport(width: number, height: number, offsetX: number, offsetY: number): Viewport {
    return {
      width,
      height,
      offsetX,
      offsetY,
      boxes: this.getGridBoxes(),
      activeCols: this.getters.getActiveCols(),
      activeRows: this.getters.getActiveRows()
    };
  }

  private hasContent(col: number, row: number): boolean {
    const { cells, mergeCellMap } = this.workbook;
    const xc = toXC(col, row);
    const cell = cells[xc];
    return (cell && cell.content) || ((xc in mergeCellMap) as any);
  }
  private getGridBoxes(): Box[] {
    const result: Box[] = [];
    const { cols, rows, viewport, mergeCellMap, merges, cells } = this.workbook;
    const { offsetX, offsetY } = this.workbook;
    const { right, left, top, bottom } = viewport;
    // process all visible cells
    for (let rowNumber = top; rowNumber <= bottom; rowNumber++) {
      let row = rows[rowNumber];
      for (let colNumber = left; colNumber <= right; colNumber++) {
        let cell = row.cells[colNumber];
        if (cell && !(cell.xc in mergeCellMap)) {
          let col = cols[colNumber];
          const text = this.getters.getCellText(cell);
          const textWidth = this.getters.getCellWidth(cell);
          let style = cell.style ? this.workbook.styles[cell.style] : null;
          if (cell.conditionalStyle) {
            style = Object.assign({}, style, cell.conditionalStyle);
          }
          const align = text
            ? (style && style.align) || (cell.type === "text" ? "left" : "right")
            : null;
          let clipRect: Rect | null = null;
          if (text && textWidth > cols[cell.col].size) {
            if (align === "left") {
              let c = cell.col;
              while (c < right && !this.hasContent(c + 1, cell.row)) {
                c++;
              }
              const width = cols[c].right - col.left;
              if (width < textWidth) {
                clipRect = [col.left - offsetX, row.top - offsetY, width, row.size];
              }
            } else {
              let c = cell.col;
              while (c > left && !this.hasContent(c - 1, cell.row)) {
                c--;
              }
              const width = col.right - cols[c].left;
              if (width < textWidth) {
                clipRect = [cols[c].left - offsetX, row.top - offsetY, width, row.size];
              }
            }
          }

          result.push({
            x: col.left - offsetX,
            y: row.top - offsetY,
            width: col.size,
            height: row.size,
            text,
            textWidth,
            border: cell.border ? this.workbook.borders[cell.border] : null,
            style,
            align,
            clipRect,
            isError: cell.error
          });
        }
      }
    }
    // process all visible merges
    for (let id in merges) {
      let merge = merges[id];
      if (overlap(merge, viewport)) {
        const refCell = cells[merge.topLeft];
        const width = cols[merge.right].right - cols[merge.left].left;
        let text, textWidth, style, align, border;
        if (refCell) {
          text = refCell ? this.getters.getCellText(refCell) : "";
          textWidth = this.getters.getCellWidth(refCell);
          style = refCell.style ? this.workbook.styles[refCell.style] : {};
          align = text
            ? (style && style.align) || (refCell.type === "text" ? "left" : "right")
            : null;
          border = refCell.border ? this.workbook.borders[refCell.border] : null;
        }
        style = style || {};
        if (!style.fillColor) {
          style = Object.create(style);
          style.fillColor = "#fff";
        }

        const x = cols[merge.left].left - offsetX;
        const y = rows[merge.top].top - offsetY;
        const height = rows[merge.bottom].bottom - rows[merge.top].top;
        result.push({
          x: x,
          y: y,
          width,
          height,
          text,
          textWidth,
          border,
          style,
          align,
          clipRect: [x, y, width, height],
          isError: refCell ? refCell.error : false
        });
      }
    }
    return result;
  }
}
