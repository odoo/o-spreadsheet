import { numberToLetters, toCartesian, toXC } from "./helpers.js";
import { parse, evaluate } from "./expression_parser.js";

const DEFAULT_CELL_WIDTH = 100;
const DEFAULT_CELL_HEIGHT = 26;
export const HEADER_HEIGHT = 26;
export const HEADER_WIDTH = 60;

const numberRegexp = /^-?\d+(,\d+)*(\.\d+(e\d+)?)?$/;

export class GridState extends owl.core.EventBus {
  // width and height of the sheet zone (not just the visible part, and excluding
  // the row and col headers)
  width = null;
  height = null;

  // offset between the visible zone and the full zone (take into account
  // headers)
  offsetX = 0;
  offsetY = 0;

  // coordinates of the visible zone
  topRow = null;
  leftCol = null;
  rightCol = null;
  bottomRow = null;

  // each row is described by: { top: ..., bottom: ..., name: '5', size: ... }
  rows = [];
  // each col is described by: { left: ..., right: ..., name: 'B', size: ... }
  cols = [];

  // coordinates of the selected cell
  selectedCol = 0;
  selectedRow = 0;

  // null if there is no "active" selected cell
  selectedCell = null;

  cells = {};

  isEditing = false;
  currentContent = "";

  constructor(data) {
    super();
    this.computeDims(data);
    for (let xc in data.cells) {
      this.processCell(xc, data.cells[xc]);
    }
    this.evaluateCells();
  }

  computeDims(data) {
    let current = 0;
    for (let i = 0; i < data.rowNumber; i++) {
      const size = data.rows[i] ? data.rows[i].size : DEFAULT_CELL_HEIGHT;
      const row = {
        top: current,
        bottom: current + size,
        size: size,
        name: String(i + 1)
      };
      this.rows.push(row);
      current = row.bottom;
    }
    this.height = this.rows[this.rows.length - 1].bottom + 20; // 10 to have some space at the end

    current = 0;
    for (let i = 0; i < data.colNumber; i++) {
      const size = data.cols[i] ? data.cols[i].size : DEFAULT_CELL_WIDTH;
      const col = {
        left: current,
        right: current + size,
        size: size,
        name: numberToLetters(i)
      };
      this.cols.push(col);
      current = col.right;
    }
    this.width = this.cols[this.cols.length - 1].right + 10;
  }

  processCell(xc, cell) {
    const [col, row] = toCartesian(xc);
    cell = Object.assign({ _col: col, _row: row }, cell);
    const content = cell.content;
    cell._type =
      content[0] === "="
        ? "formula"
        : content.match(numberRegexp)
        ? "number"
        : "text";
    if (cell._type === "formula") {
      cell._formula = parse(cell.content.slice(1)); // slice to remove the = sign
    }
    this.cells[xc] = cell;
  }

  evaluateCells() {
    const cells = this.cells;
    for (let xc in cells) {
      const cell = cells[xc];
      if (cell._type === "number") {
        cell._value = parseFloat(cell.content);
      }
      if (cell._type === "text") {
        cell._value = cell.content;
      }
      if (cell._type === "formula") {
        cell._value = evaluate(cell._formula, cells);
      }
    }
  }

  updateVisibleZone(width, height, offsetX, offsetY) {
    const { rows, cols } = this;

    this.bottomRow = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].top <= offsetY) {
        this.topRow = i;
      }
      if (offsetY + height < rows[i].bottom) {
        this.bottomRow = i;
        break;
      }
    }
    this.rightCol = cols.length - 1;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].left <= offsetX) {
        this.leftCol = i;
      }
      if (offsetX + width < cols[i].right) {
        this.rightCol = i;
        break;
      }
    }
    this.offsetX = cols[this.leftCol].left - HEADER_WIDTH;
    this.offsetY = rows[this.topRow].top - HEADER_HEIGHT;
  }

  selectCell(col, row) {
    this.stopEditing();
    this.selectedCol = col;
    this.selectedRow = row;
    this.selectedCell = this.cells[toXC(col, row)] || null;
    this.trigger("update");
  }

  moveSelection(deltaX, deltaY) {
    // todo: prevent selected zone to go off screen, and to go out of the
    //   bounds
    this.selectCell(this.selectedCol + deltaX, this.selectedRow + deltaY);
    this.trigger("update");
  }

  startEditing(str) {
    this.isEditing = true;
    this.currentContent = str;
    this.trigger("update");
  }

  stopEditing() {
    if (this.currentContent) {
      const xc = toXC(this.selectedCol, this.selectedRow);
      this.processCell(xc, { content: this.currentContent });
      this.evaluateCells();
      this.currentContent = "";
    }
    this.isEditing = false;
  }
}
