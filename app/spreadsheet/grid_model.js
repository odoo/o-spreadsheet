import { numberToLetters, toCartesian, toXC } from "./helpers.js";
import { compileExpression } from "./expression_compiler.js";

const DEFAULT_CELL_WIDTH = 96;
const DEFAULT_CELL_HEIGHT = 26;
export const HEADER_HEIGHT = 26;
export const HEADER_WIDTH = 60;

const numberRegexp = /^-?\d+(,\d+)*(\.\d+(e\d+)?)?$/;

export class GridModel extends owl.core.EventBus {
  // each row is described by: { top: ..., bottom: ..., name: '5', size: ... }
  rows = [];
  // each col is described by: { left: ..., right: ..., name: 'B', size: ... }
  cols = [];

  cells = {};

  styles = {
    text: {
      align: "left"
    },
    formula: {
      align: "right"
    },
    number: {
      align: "right"
    }
  };

  // width and height of the sheet zone (not just the visible part, and excluding
  // the row and col headers)
  width = null;
  height = null;

  // offset between the visible zone and the full zone (take into account
  // headers)
  offsetX = 0;
  offsetY = 0;

  // coordinates of the visible and selected zone
  current = {
    top: null,
    left: null,
    bottom: null,
    right: null
  };
  selection = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  };

  // coordinates of the selected cell
  selectedCol = 0;
  selectedRow = 0;

  // null if there is no "active" selected cell
  selectedCell = null;

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
      cell._formula = compileExpression(cell.content.slice(1));
      // cell._formula = parse(cell.content.slice(1)); // slice to remove the = sign
    }
    cell._style = cell.style || cell._type;
    this.cells[xc] = cell;
  }

  evaluateCells() {
    const cells = this.cells;
    const vars = {};
    function getValue(xc) {
      if (xc in vars) {
        if (vars[xc] === null) {
          throw new Error("cycle...");
        }
        return vars[xc];
      } else {
        vars[xc] = null;
        const cell = cells[xc];
        if (cell._type === "number") {
          vars[xc] = parseFloat(cell.content);
        }
        if (cell._type === "text") {
          vars[xc] = cell.content;
        }
        if (cell._type === "formula") {
          vars[xc] = cell._formula(getValue);
        }
        return vars[xc];
      }
    }

    for (let xc in cells) {
      const cell = cells[xc];
      cell._value = getValue(xc);
    }
  }

  updateVisibleZone(width, height, offsetX, offsetY) {
    const { rows, cols, current } = this;

    current.bottom = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].top <= offsetY) {
        current.top = i;
      }
      if (offsetY + height < rows[i].bottom) {
        current.bottom = i;
        break;
      }
    }
    current.right = cols.length - 1;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].left <= offsetX) {
        current.left = i;
      }
      if (offsetX + width < cols[i].right) {
        current.right = i;
        break;
      }
    }
    this.offsetX = cols[current.left].left - HEADER_WIDTH;
    this.offsetY = rows[current.top].top - HEADER_HEIGHT;
  }

  selectCell(col, row) {
    this.stopEditing();
    this.selectedCol = col;
    this.selectedRow = row;
    this.selectedCell = this.cells[toXC(col, row)] || null;
    this.trigger("update");
  }

  moveSelection(deltaX, deltaY) {
    if (
      (deltaY < 0 && this.selectedRow === 0) ||
      (deltaX < 0 && this.selectedCol === 0)
    ) {
      return;
    }
    // todo: prevent selected zone to go off screen, and to go out of the
    //   bounds
    this.selectCell(this.selectedCol + deltaX, this.selectedRow + deltaY);
    this.trigger("update");
  }

  startEditing(str) {
    if (!str) {
      str = this.selectedCell ? this.selectedCell.content : "";
    }
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
