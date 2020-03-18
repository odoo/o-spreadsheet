import { BasePlugin } from "../base_plugin";
import { Cell, GridCommand } from "../types";
import { DEFAULT_FONT_WEIGHT, DEFAULT_FONT_SIZE, DEFAULT_FONT } from "../../constants";
import { fontSizeMap } from "../../fonts";
import { formatCell } from "../core";
import { updateState } from "../history";

const MIN_PADDING = 3;

export class GridPlugin extends BasePlugin {
  private ctx = document.createElement("canvas").getContext("2d")!;

  getters = {
    getCellWidth: this.getCellWidth
  };

  dispatch(cmd: GridCommand) {
    switch (cmd.type) {
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(col);
          if (size !== 0) {
            this.setColSize(col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let col of cmd.rows) {
          const size = this.getRowMaxHeight(col);
          if (size !== 0) {
            this.setRowSize(col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "RESIZE_COLUMNS":
        for (let col of cmd.cols) {
          this.setColSize(col, cmd.size);
        }
        break;
      case "RESIZE_ROWS":
        for (let row of cmd.rows) {
          this.setRowSize(row, cmd.size);
        }
        break;
    }
  }

  getCellWidth(cell: Cell): number {
    // todo: use a getters here, exported by future style plugin
    const style = this.workbook.styles[cell ? cell.style || 0 : 0];
    const italic = style.italic ? "italic " : "";
    const weight = style.bold ? "bold" : DEFAULT_FONT_WEIGHT;
    const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
    const size = fontSizeMap[sizeInPt];
    this.ctx.font = `${italic}${weight} ${size}px ${DEFAULT_FONT}`;
    return this.ctx.measureText(formatCell(this.workbook, cell)).width;
  }

  getCellHeight(cell: Cell): number {
    const style = this.workbook.styles[cell ? cell.style || 0 : 0];
    const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
    return fontSizeMap[sizeInPt];
  }

  private getColMaxWidth(index: number): number {
    const cells = this.workbook.rows.reduce(
      (acc: Cell[], cur) => (cur.cells[index] ? acc.concat(cur.cells[index]) : acc),
      []
    );
    const sizes = cells.map(c => this.getCellWidth(c));
    return Math.max(0, ...sizes);
  }

  private getRowMaxHeight(index: number): number {
    const cells = Object.values(this.workbook.rows[index].cells);
    const sizes = cells.map(c => this.getCellHeight(c));
    return Math.max(0, ...sizes);
  }

  private setColSize(index: number, size: number) {
    const col = this.workbook.cols[index];
    const delta = size - col.size;
    updateState(this.workbook, ["cols", index, "size"], size);
    updateState(this.workbook, ["cols", index, "right"], col.right + delta);
    for (let i = index + 1; i < this.workbook.cols.length; i++) {
      const col = this.workbook.cols[i];
      updateState(this.workbook, ["cols", i, "left"], col.left + delta);
      updateState(this.workbook, ["cols", i, "right"], col.right + delta);
    }
    this.workbook.width += delta;
  }

  private setRowSize(index: number, size: number) {
    const row = this.workbook.rows[index];
    const delta = size - row.size;
    updateState(this.workbook, ["rows", index, "size"], size);
    updateState(this.workbook, ["rows", index, "bottom"], row.bottom + delta);
    for (let i = index + 1; i < this.workbook.rows.length; i++) {
      const row = this.workbook.rows[i];
      updateState(this.workbook, ["rows", i, "top"], row.top + delta);
      updateState(this.workbook, ["rows", i, "bottom"], row.bottom + delta);
    }
    this.workbook.height += delta;
  }
}
