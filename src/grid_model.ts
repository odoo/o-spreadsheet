import { numberToLetters, toCartesian, toXC, stringify, union, isEqual } from "./helpers";
import { compileExpression, applyOffset } from "./expressions";
import { functions } from "./functions";
import * as owl from "@odoo/owl";

const DEFAULT_CELL_WIDTH = 96;
const DEFAULT_CELL_HEIGHT = 23;
export const HEADER_HEIGHT = 26;
export const HEADER_WIDTH = 60;

const numberRegexp = /^-?\d+(,\d+)*(\.\d+(e\d+)?)?$/;

const fns = Object.fromEntries(Object.entries(functions).map(([k, v]) => [k, v.compute]));

export const DEFAULT_STYLE: Style = {
  fillColor: "white",
  textColor: "black",
  fontSize: 10
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Selections {
  anchor: {
    col: number;
    row: number;
  };
  zones: Zone[];
}

export interface Style {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  align?: "left" | "right";
  fillColor?: string;
  textColor?: string;
  fontSize?: number; // in pt, not in px!
}

interface CellData {
  content?: string;
  style?: number;
}

interface HeaderData {
  size?: number;
}

export interface Sheet {
  name?: string;
  colNumber: number;
  rowNumber: number;
  cells?: { [key: string]: CellData };
  merges?: string[];
  cols?: { [key: number]: HeaderData };
  rows?: { [key: number]: HeaderData };
}

export interface GridData {
  sheets: Sheet[];
  styles?: { [key: number]: Style };
}

export interface Cell extends CellData {
  col: number;
  row: number;
  xc: string;
  error?: boolean;
  value: any;
  formula?: any;
  type: "formula" | "text" | "number";
}

export interface Row {
  cells: { [col: number]: Cell };
  bottom: number;
  top: number;
  name: string;
  size: number;
}

export interface Col {
  left: number;
  right: number;
  name: string;
  size: number;
}

export interface Merge extends Zone {
  id: number;
  topLeft: string;
}

export interface ClipBoard {
  zone?: Zone;
  cells?: (Cell | null)[][];
}

export interface Highlight {
  zone: Zone;
  color: string | null;
}

// ---------------------------------------------------------------------------
// GridModel
// ---------------------------------------------------------------------------
export class GridModel extends owl.core.EventBus {
  // each row is described by: { top: ..., bottom: ..., name: '5', size: ... }
  rows: Row[] = [];
  // each col is described by: { left: ..., right: ..., name: 'B', size: ... }
  cols: Col[] = [];

  cells: { [key: string]: Cell } = {};

  styles: { [key: number]: Style } = {};

  merges: { [key: number]: Merge } = {};
  mergeCellMap: { [key: string]: number } = {};

  // width and height of the sheet zone (not just the visible part, and excluding
  // the row and col headers)
  width: number = 0;
  height: number = 0;
  clientWidth: number = 0;

  // offset between the visible zone and the full zone (take into account
  // headers)
  offsetX = 0;
  offsetY = 0;
  scrollTop = 0;
  scrollLeft = 0;

  // coordinates of the visible and selected zone
  viewport: Zone = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  };
  selections: Selections = {
    zones: [
      {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      }
    ],
    anchor: {
      col: 0,
      row: 0
    }
  };
  activeCol = 0;
  activeRow = 0;
  activeXc = "A1";
  activeSheet: string = "Sheet1";

  isEditing = false;
  currentContent = "";

  clipBoard: ClipBoard = {};
  nextId = 1;

  highlights: Highlight[] = [];

  isSilent: boolean = true;

  /**
   * The selectedcell property is slightly different from the active col/row.
   * It is the reference cell for the current ui state. So, if the position is
   * inside a merge, then it will be the top left cell.
   */
  get selectedCell(): Cell | null {
    let mergeId = this.mergeCellMap[this.activeXc];
    if (mergeId) {
      return this.cells[this.merges[mergeId].topLeft];
    } else {
      return this.getCell(this.activeCol, this.activeRow);
    }
  }

  getCell(col: number, row: number): Cell | null {
    return this.rows[row].cells[col] || null;
  }

  getStyle(): Style {
    const cell = this.selectedCell;
    return cell && cell.style ? this.styles[cell.style] : {};
  }

  getCol(x: number): number {
    if (x <= HEADER_WIDTH) {
      return -1;
    }
    const { cols, offsetX, viewport } = this;
    const { left, right } = viewport;
    for (let i = left; i <= right; i++) {
      let c = cols[i];
      if (c.left - offsetX <= x && x <= c.right - offsetX) {
        return i;
      }
    }
    return -1;
  }

  getRow(y: number): number {
    if (y <= HEADER_HEIGHT) {
      return -1;
    }
    const { rows, offsetY, viewport } = this;
    const { top, bottom } = viewport;
    for (let i = top; i <= bottom; i++) {
      let r = rows[i];
      if (r.top - offsetY <= y && y <= r.bottom - offsetY) {
        return i;
      }
    }
    return -1;
  }

  // ---------------------------------------------------------------------------
  // Constructor and private methods
  // ---------------------------------------------------------------------------
  constructor(data: GridData) {
    super();
    if (data.sheets.length === 0) {
      throw new Error("No sheet defined in data");
    }
    // styles
    this.styles = data.styles || {};
    for (let k in this.styles) {
      this.nextId = Math.max(k as any, this.nextId);
    }
    this.nextId++;
    this.styles[0] = Object.assign({}, DEFAULT_STYLE, this.styles[0]);

    const sheet = data.sheets[0];
    this.activateSheet(sheet);
  }

  activateSheet(sheet: Sheet) {
    this.isSilent = true;
    this.activeSheet = sheet.name || "Sheet1";

    // setting up rows and columns
    this.addRowsCols(sheet);

    // merges
    if (sheet.merges) {
      for (let m of sheet.merges) {
        this.addMerge(m);
      }
    }

    // cells
    for (let xc in sheet.cells) {
      this.addCell(xc, sheet.cells[xc]);
    }
    this.evaluateCells();
    this.selectCell(0, 0);
    this.isSilent = false;
  }

  addRowsCols(sheet: Sheet) {
    let current = 0;
    const rows = sheet.rows || {};
    const cols = sheet.cols || {};
    for (let i = 0; i < sheet.rowNumber; i++) {
      const size = rows[i] ? rows[i].size || DEFAULT_CELL_HEIGHT : DEFAULT_CELL_HEIGHT;
      const row = {
        top: current,
        bottom: current + size,
        size: size,
        name: String(i + 1),
        cells: {}
      };
      this.rows.push(row);
      current = row.bottom;
    }
    this.height = this.rows[this.rows.length - 1].bottom + 20; // 10 to have some space at the end

    current = 0;
    for (let i = 0; i < sheet.colNumber; i++) {
      const size = cols[i] ? cols[i].size || DEFAULT_CELL_WIDTH : DEFAULT_CELL_WIDTH;
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

  addCell(xc: string, data: CellData) {
    const [col, row] = toCartesian(xc);
    const currentCell = this.cells[xc];
    const content = data.content || "";
    const type = content[0] === "=" ? "formula" : content.match(numberRegexp) ? "number" : "text";
    const value =
      type === "text" ? content : type === "number" ? +parseFloat(content).toFixed(4) : null;
    const cell: Cell = { col, row, xc, content, value, type };
    const style = data.style || (currentCell && currentCell.style);
    if (style) {
      cell.style = style;
    }
    if (cell.type === "formula") {
      cell.error = false;
      try {
        cell.formula = compileExpression(content);
      } catch (e) {
        cell.value = "#BAD_EXPR";
        cell.error = true;
      }
    }
    this.cells[xc] = cell;
    this.rows[row].cells[col] = cell;
  }

  evaluateCells() {
    const cells = this.cells;
    const visited = {};
    const functions = Object.assign({ range }, fns);

    function computeValue(xc, cell: Cell) {
      if (cell.type !== "formula" || !cell.formula) {
        return;
      }
      if (xc in visited) {
        if (visited[xc] === null) {
          cell.value = "#CYCLE";
          cell.error = true;
        }
        return;
      }
      visited[xc] = null;
      try {
        // todo: move formatting in grid and formatters.js
        cell.value = +cell.formula(getValue, functions).toFixed(4);
        cell.error = false;
      } catch (e) {
        cell.value = cell.value || "#ERROR";
        cell.error = true;
      }
      visited[xc] = true;
    }

    function getValue(xc: string): any {
      const cell = cells[xc];
      if (!cell || cell.content === "") {
        return 0;
      }
      computeValue(xc, cell);
      if (cell.error) {
        throw new Error("boom");
      }
      return cells[xc].value;
    }

    function range(v1: string, v2: string): any[] {
      const [c1, r1] = toCartesian(v1);
      const [c2, r2] = toCartesian(v2);
      const result: any[] = [];
      for (let c = c1; c <= c2; c++) {
        for (let r = r1; r <= r2; r++) {
          result.push(getValue(toXC(c, r)));
        }
      }
      return result;
    }

    for (let xc in cells) {
      computeValue(xc, cells[xc]);
    }
  }

  /**
   * This method is silent, does not notify the user interface.  Also, it
   * does not ask for confirmation if we delete a cell content.
   */
  addMerge(m: string) {
    let id = this.nextId++;
    const [tl, br] = m.split(":");
    const [left, top] = toCartesian(tl);
    const [right, bottom] = toCartesian(br);
    this.merges[id] = {
      id,
      left,
      top,
      right,
      bottom,
      topLeft: tl
    };
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const xc = toXC(col, row);
        if (col !== left || row !== top) {
          this.deleteCell(xc);
        }
        this.mergeCellMap[xc] = id;
      }
    }
  }

  /**
   * This method is the correct way to notify the rest of the system that
   * some interesting internal state has changed, and that the UI should be
   * rerendered
   */
  notify() {
    if (!this.isSilent) {
      this.trigger("update");
    }
  }

  /**
   * Add all necessary merge to the current selection to make it valid
   */
  private expandZone(zone: Zone): Zone {
    let { left, right, top, bottom } = zone;
    let result: Zone = { left, right, top, bottom };
    for (let i = left; i <= right; i++) {
      for (let j = top; j <= bottom; j++) {
        let mergeId = this.mergeCellMap[toXC(i, j)];
        if (mergeId) {
          result = union(this.merges[mergeId], result);
        }
      }
    }
    return isEqual(result, zone) ? result : this.expandZone(result);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  setColSize(index: number, delta: number) {
    const { cols } = this;
    const col = cols[index];
    col.size += delta;
    col.right += delta;
    for (let i = index + 1; i < this.cols.length; i++) {
      const col = cols[i];
      col.left += delta;
      col.right += delta;
    }
    this.notify();
  }
  /**
   * Delete a cell.  This method does not trigger an update!
   */
  deleteCell(xc: string) {
    const cell = this.cells[xc];
    if (cell) {
      if ("style" in cell) {
        this.addCell(xc, { content: "", style: cell.style });
      } else {
        delete this.cells[xc];
        delete this.rows[cell.row].cells[cell.col];
      }
    }
  }

  updateVisibleZone(width: number, height: number, scrollLeft: number, scrollTop: number) {
    const { rows, cols, viewport } = this;
    this.clientWidth = width;

    viewport.bottom = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].top <= scrollTop) {
        viewport.top = i;
      }
      if (scrollTop + height < rows[i].bottom) {
        viewport.bottom = i;
        break;
      }
    }
    viewport.right = cols.length - 1;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].left <= scrollLeft) {
        viewport.left = i;
      }
      if (scrollLeft + width < cols[i].right) {
        viewport.right = i;
        break;
      }
    }
    this.scrollLeft = scrollLeft;
    this.scrollTop = scrollTop;
    this.offsetX = cols[viewport.left].left - HEADER_WIDTH;
    this.offsetY = rows[viewport.top].top - HEADER_HEIGHT;
  }

  selectCell(col: number, row: number) {
    this.stopEditing();
    const xc = toXC(col, row);
    if (xc in this.mergeCellMap) {
      const merge = this.merges[this.mergeCellMap[xc]];
      this.selections.zones[0] = {
        left: merge.left,
        right: merge.right,
        top: merge.top,
        bottom: merge.bottom
      };
    } else {
      this.selections.zones[0].left = col;
      this.selections.zones[0].right = col;
      this.selections.zones[0].top = row;
      this.selections.zones[0].bottom = row;
    }
    this.selections.anchor.col = col;
    this.selections.anchor.row = row;
    this.activeCol = col;
    this.activeRow = row;
    this.activeXc = xc;
    this.notify();
  }

  movePosition(deltaX: number, deltaY: number) {
    const { activeCol, activeRow } = this;
    if ((deltaY < 0 && activeRow === 0) || (deltaX < 0 && activeCol === 0)) {
      if (this.isEditing) {
        this.stopEditing();
        this.notify();
      }
      return;
    }
    let mergeId = this.mergeCellMap[this.activeXc];
    if (mergeId) {
      let targetCol = this.activeCol;
      let targetRow = this.activeRow;
      while (this.mergeCellMap[toXC(targetCol, targetRow)] === mergeId) {
        targetCol += deltaX;
        targetRow += deltaY;
      }
      if (targetCol >= 0 && targetRow >= 0) {
        this.selectCell(targetCol, targetRow);
      }
    } else {
      this.selectCell(this.activeCol + deltaX, this.activeRow + deltaY);
    }
  }

  moveSelection(deltaX: number, deltaY: number) {
    const selection = this.selections.zones[this.selections.zones.length - 1];
    const activeCol = this.selections.anchor.col;
    const activeRow = this.selections.anchor.row;
    const { left, right, top, bottom } = selection;
    if (top + deltaY < 0 || left + deltaX < 0) {
      return;
    }
    let result: Zone | null = selection;
    // check if we can shrink selection
    let expand = z => this.expandZone(z);

    let n = 0;
    while (result !== null) {
      n++;
      if (deltaX < 0) {
        result = activeCol <= right - n ? expand({ top, left, bottom, right: right - n }) : null;
      }
      if (deltaX > 0) {
        result = left + n <= activeCol ? expand({ top, left: left + n, bottom, right }) : null;
      }
      if (deltaY < 0) {
        result = activeRow <= bottom - n ? expand({ top, left, bottom: bottom - n, right }) : null;
      }
      if (deltaY > 0) {
        result = top + n <= activeRow ? expand({ top: top + n, left, bottom, right }) : null;
      }
      if (result && !isEqual(result, selection)) {
        this.selections.zones[this.selections.zones.length - 1] = result;
        this.notify();
        return;
      }
    }
    const currentZone = { top: activeRow, bottom: activeRow, left: activeCol, right: activeCol };
    const zoneWithDelta = {
      top: top + deltaY,
      left: left + deltaX,
      bottom: bottom + deltaY,
      right: right + deltaX
    };
    result = expand(union(currentZone, zoneWithDelta));
    if (!isEqual(result, selection)) {
      this.selections.zones[this.selections.zones.length - 1] = result;
      this.notify();
      return;
    }
  }

  startEditing(str?: string) {
    if (!str) {
      const cell = this.selectedCell;
      str = cell ? cell.content || "" : "";
    }
    this.isEditing = true;
    this.currentContent = str;
    this.highlights = [];
    this.notify();
  }

  addHighlights(highlights: Highlight[]) {
    this.highlights = this.highlights.concat(highlights);
    this.notify();
  }

  removeAllHighlights() {
    this.highlights = [];
    this.notify();
  }

  cancelEdition() {
    this.isEditing = false;
    this.notify();
  }

  stopEditing() {
    if (this.isEditing) {
      const xc = toXC(this.activeCol, this.activeRow);
      if (this.currentContent) {
        this.addCell(xc, { content: this.currentContent });
      } else {
        this.deleteCell(xc);
      }

      this.evaluateCells();
      this.currentContent = "";
      this.isEditing = false;
    }
  }

  deleteSelection() {
    this.selections.zones.forEach(zone => {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const xc = toXC(col, row);
          if (xc in this.cells) {
            this.deleteCell(xc);
          }
        }
      }
    });
    this.evaluateCells();
    this.notify();
  }

  selectColumn(col: number) {
    this.stopEditing();
    this.activeCol = col;
    this.activeRow = 0;
    this.activeXc = toXC(col, 0);
    const selection = {
      top: 0,
      left: col,
      right: col,
      bottom: this.rows.length - 1
    };
    this.selections.anchor = { col: this.activeCol, row: this.activeRow };
    this.selections.zones = [selection];

    this.notify();
  }
  updateSelection(col: number, row: number) {
    const { activeCol, activeRow } = this;
    const zone: Zone = {
      left: Math.min(activeCol, col),
      top: Math.min(activeRow, row),
      right: Math.max(activeCol, col),
      bottom: Math.max(activeRow, row)
    };
    this.selections.zones[this.selections.zones.length - 1] = this.expandZone(zone);
    this.notify();
  }

  copySelection(cut: boolean = false) {
    console.warn("implement copySelection for multi selection");
    let { left, right, top, bottom } = this.selections.zones[this.selections.zones.length - 1];
    const cells: (Cell | null)[][] = [];
    for (let i = left; i <= right; i++) {
      const vals: (Cell | null)[] = [];
      cells.push(vals);
      for (let j = top; j <= bottom; j++) {
        const cell = this.getCell(i, j);
        vals.push(cell ? Object.assign({}, cell) : null);
        if (cut) {
          this.deleteCell(toXC(i, j));
        }
      }
    }
    this.clipBoard = {
      zone: { left, right, top, bottom },
      cells
    };
    if (cut) {
      this.notify();
    }
  }

  pasteSelection() {
    console.warn("implement pasteSelection for multi selection");

    const { zone, cells } = this.clipBoard;
    if (!zone || !cells) {
      return;
    }
    const selection = this.selections.zones[this.selections.zones.length - 1];
    let col = selection.left;
    let row = selection.top;
    let { left, right, top, bottom } = zone;
    const offsetX = col - left;
    const offsetY = row - top;
    for (let i = 0; i <= right - left; i++) {
      for (let j = 0; j <= bottom - top; j++) {
        const xc = toXC(col + i, row + j);
        const originCell = cells[i][j];
        const targetCell = this.getCell(col + i, row + j);
        if (originCell) {
          let content = originCell.content || "";
          if (originCell.type === "formula") {
            content = applyOffset(content, offsetX, offsetY);
          }
          this.addCell(xc, { content, style: originCell.style });
        }
        if (!originCell && targetCell) {
          this.addCell(xc, { content: "" });
        }
      }
    }

    this.evaluateCells();
    this.notify();
  }

  setStyle(style) {
    this.selections.zones.forEach(selection => {
      for (let col = selection.left; col <= selection.right; col++) {
        for (let row = selection.top; row <= selection.bottom; row++) {
          this.setStyleToCell(col, row, style);
        }
      }
    });
    this.notify();
  }

  setStyleToCell(col: number, row: number, style) {
    const xc = toXC(col, row);
    const cell = this.getCell(col, row);
    const currentStyle = cell && cell.style ? this.styles[cell.style] : {};
    const nextStyle = Object.assign({}, currentStyle, style);
    const id = this.registerStyle(nextStyle);
    if (cell) {
      cell.style = id;
    } else {
      this.addCell(xc, { style: id, content: "" });
    }
    this.notify();
  }

  registerStyle(style) {
    const strStyle = stringify(style);
    for (let k in this.styles) {
      if (stringify(this.styles[k]) === strStyle) {
        return parseInt(k, 10);
      }
    }
    const id = this.nextId++;
    this.styles[id] = style;
    return id;
  }

  mergeSelection() {
    const { left, right, top, bottom } = this.selections.zones[this.selections.zones.length - 1];
    let tl = toXC(left, top);
    let br = toXC(right, bottom);
    if (tl !== br) {
      this.addMerge(`${tl}:${br}`);
      this.notify();
    }
  }

  unmergeSelection() {
    const mergeId = this.mergeCellMap[this.activeXc];
    const { left, top, right, bottom } = this.merges[mergeId];
    delete this.merges[mergeId];
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const xc = toXC(c, r);
        delete this.mergeCellMap[xc];
      }
    }
    this.notify();
  }

  isMergeDestructive(): boolean {
    const { left, right, top, bottom } = this.selections.zones[this.selections.zones.length - 1];
    for (let row = top; row <= bottom; row++) {
      const actualRow = this.rows[row];
      for (let col = left; col <= right; col++) {
        if (col !== left || row !== top) {
          const cell = actualRow.cells[col];
          if (cell && cell.content) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
