import { BasePlugin } from "../base_plugin";
import { Viewport, Box, Rect, GridCommand, Workbook } from "../types";
import { toXC, overlap } from "../../helpers";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";

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
          let style = this.getters.getCellStyle(cell);
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
            border: this.getters.getCellBorder(cell),
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
          style = this.getters.getCellStyle(refCell);
          align = text
            ? (style && style.align) || (refCell.type === "text" ? "left" : "right")
            : null;
          border = this.getters.getCellBorder(refCell);
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

export function updateScroll(state: Workbook, scrollTop: number, scrollLeft: number): boolean {
  scrollTop = Math.round(scrollTop);
  scrollLeft = Math.round(scrollLeft);
  if (state.scrollTop === scrollTop && state.scrollLeft === scrollLeft) {
    return false;
  }
  state.scrollTop = scrollTop;
  state.scrollLeft = scrollLeft;
  const { offsetX, offsetY } = state;
  updateVisibleZone(state);
  return offsetX !== state.offsetX || offsetY !== state.offsetY;
}

/**
 * Here:
 * - width is the clientWidth, the actual width of the visible zone
 * - height is the clientHeight, the actual height of the visible zone
 */
export function updateVisibleZone(state: Workbook, width?: number, height?: number) {
  const { rows, cols, viewport, scrollLeft, scrollTop } = state;
  state.clientWidth = width || state.clientWidth;
  state.clientHeight = height || state.clientHeight;

  viewport.bottom = rows.length - 1;
  let effectiveTop = scrollTop;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].top <= effectiveTop) {
      if (rows[i].bottom > effectiveTop) {
        effectiveTop = rows[i].top;
      }
      viewport.top = i;
    }
    if (effectiveTop + state.clientHeight < rows[i].bottom + HEADER_HEIGHT) {
      viewport.bottom = i;
      break;
    }
  }
  viewport.right = cols.length - 1;
  let effectiveLeft = scrollLeft;
  for (let i = 0; i < cols.length; i++) {
    if (cols[i].left <= effectiveLeft) {
      if (cols[i].right > effectiveLeft) {
        effectiveLeft = cols[i].left;
      }
      viewport.left = i;
    }
    if (effectiveLeft + state.clientWidth < cols[i].right + HEADER_WIDTH) {
      viewport.right = i;
      break;
    }
  }
  state.offsetX = cols[viewport.left].left - HEADER_WIDTH;
  state.offsetY = rows[viewport.top].top - HEADER_HEIGHT;
}
