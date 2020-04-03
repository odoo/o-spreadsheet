import { BasePlugin } from "../base_plugin";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../constants";
import { overlap, toXC } from "../helpers/index";
import { Box, GridCommand, Rect, UI, Viewport } from "../types/index";

export class LayoutPlugin extends BasePlugin {
  static getters = ["getViewport", "getUI"];

  ui: UI | null = null;

  handle(cmd: GridCommand) {
    this.ui = null;
    switch (cmd.type) {
      case "MOVE_POSITION":
        this.updateScrollPosition();
        break;
    }
  }

  getUI(force?: boolean): UI {
    if (!this.ui || force) {
      this.ui = this.computeDerivedState();
    }
    return this.ui;
  }

  /**
   *  keep current cell in the viewport, if possible
   */
  updateScrollPosition() {
    const { cols, rows, viewport } = this.workbook;
    const [col, row] = this.getters.getPosition();

    while (col >= viewport.right && col !== cols.length - 1) {
      this.updateScroll(this.workbook.scrollTop, cols[viewport.left].right);
    }
    while (col < viewport.left) {
      this.updateScroll(this.workbook.scrollTop, cols[viewport.left - 1].left);
    }
    while (row >= viewport.bottom && row !== rows.length - 1) {
      this.updateScroll(rows[viewport.top].bottom, this.workbook.scrollLeft);
    }
    while (row < viewport.top) {
      this.updateScroll(rows[viewport.top - 1].top, this.workbook.scrollLeft);
    }
  }

  updateScroll(scrollTop: number, scrollLeft: number): boolean {
    scrollTop = Math.round(scrollTop);
    scrollLeft = Math.round(scrollLeft);
    if (this.workbook.scrollTop === scrollTop && this.workbook.scrollLeft === scrollLeft) {
      return false;
    }
    this.workbook.scrollTop = scrollTop;
    this.workbook.scrollLeft = scrollLeft;
    const { offsetX, offsetY } = this.workbook;
    this.updateVisibleZone();
    return offsetX !== this.workbook.offsetX || offsetY !== this.workbook.offsetY;
  }

  /**
   * Here:
   * - width is the clientWidth, the actual width of the visible zone
   * - height is the clientHeight, the actual height of the visible zone
   */
  updateVisibleZone(width?: number, height?: number) {
    const { rows, cols, viewport, scrollLeft, scrollTop } = this.workbook;
    this.workbook.clientWidth = width || this.workbook.clientWidth;
    this.workbook.clientHeight = height || this.workbook.clientHeight;

    viewport.bottom = rows.length - 1;
    let effectiveTop = scrollTop;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].top <= effectiveTop) {
        if (rows[i].bottom > effectiveTop) {
          effectiveTop = rows[i].top;
        }
        viewport.top = i;
      }
      if (effectiveTop + this.workbook.clientHeight < rows[i].bottom + HEADER_HEIGHT) {
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
      if (effectiveLeft + this.workbook.clientWidth < cols[i].right + HEADER_WIDTH) {
        viewport.right = i;
        break;
      }
    }
    this.workbook.offsetX = cols[viewport.left].left - HEADER_WIDTH;
    this.workbook.offsetY = rows[viewport.top].top - HEADER_HEIGHT;
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
            ? (style && style.align) || (typeof cell.value === "number" ? "right" : "left")
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
            ? (style && style.align) || (typeof refCell.value === "number" ? "right" : "left")
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

  computeDerivedState(): UI {
    const { viewport, cols, rows } = this.workbook;
    const [col, row] = this.getters.getPosition();
    return {
      rows: this.workbook.rows,
      cols: this.workbook.cols,
      merges: this.workbook.merges,
      mergeCellMap: this.workbook.mergeCellMap,
      width: this.workbook.width,
      height: this.workbook.height,
      clientWidth: this.workbook.clientWidth,
      clientHeight: this.workbook.clientHeight,
      offsetX: cols[viewport.left].left - HEADER_WIDTH,
      offsetY: rows[viewport.top].top - HEADER_HEIGHT,
      scrollTop: this.workbook.scrollTop,
      scrollLeft: this.workbook.scrollLeft,
      clipboard: this.getters.getClipboardZones(),
      viewport: this.workbook.viewport,
      selection: this.getters.getSelection(),
      activeCol: col,
      activeRow: row,
      activeXc: toXC(col, row),
      highlights: this.workbook.highlights,
      isSelectingRange: this.workbook.isSelectingRange,
      isEditing: this.getters.isEditing(),
      selectedCell: this.getters.getActiveCell(),
      aggregate: this.getters.getAggregate(),
      canUndo: this.getters.canUndo(),
      canRedo: this.getters.canRedo(),
      currentContent: this.workbook.currentContent,
      sheets: this.workbook.sheets.map(s => s.name),
      activeSheet: this.workbook.activeSheet.name
    };
  }
}
