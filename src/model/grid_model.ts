import * as owl from "@odoo/owl";
import { compile } from "../formulas/index";
import { numberToLetters, toCartesian, toXC } from "../helpers";
import * as borders from "./borders";
import * as clipboard from "./clipboard";
import * as evaluation from "./evaluation";
import * as merges from "./merges";
import * as selection from "./selection";
import * as styles from "./styles";
import * as edition from "./edition";
import {
  Border,
  Cell,
  CellData,
  ClipBoard,
  Col,
  GridData,
  Highlight,
  Merge,
  Row,
  Selection,
  Sheet,
  Style,
  Zone
} from "./types";

const DEFAULT_CELL_WIDTH = 96;
const DEFAULT_CELL_HEIGHT = 23;
export const HEADER_HEIGHT = 26;
export const HEADER_WIDTH = 60;

const numberRegexp = /^-?\d+(,\d+)*(\.\d+(e\d+)?)?$/;

export const DEFAULT_STYLE: Style = {
  fillColor: "white",
  textColor: "black",
  fontSize: 10
};

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

  borders: { [key: number]: Border } = {};

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
  selection: Selection = {
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

  isSelectingRange: boolean = false; // true if the user is editing a formula and he should input a range or a cell

  // ---------------------------------------------------------------------------
  // Constructor and private methods
  // ---------------------------------------------------------------------------
  constructor(data: Partial<GridData> = {}) {
    super();
    const sheets = data.sheets || [
      {
        name: "Sheet1",
        colNumber: 10,
        rowNumber: 10
      }
    ];
    if (sheets.length === 0) {
      sheets.push({ name: "Sheet1", colNumber: 10, rowNumber: 10 });
    }
    this.borders = data.borders || {};
    // styles
    this.styles = data.styles || {};
    for (let k in this.styles) {
      this.nextId = Math.max(k as any, this.nextId);
    }
    for (let k in this.borders) {
      this.nextId = Math.max(k as any, this.nextId);
    }
    this.nextId++;
    this.styles[0] = Object.assign({}, DEFAULT_STYLE, this.styles[0]);

    const sheet = sheets[0];
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
    const border = data.border;
    if (border) {
      cell.border = border;
    }
    if (style) {
      cell.style = style;
    }
    if (cell.type === "formula") {
      cell.error = false;
      try {
        cell.formula = compile(content);
      } catch (e) {
        cell.value = "#BAD_EXPR";
        cell.error = true;
      }
    }
    this.cells[xc] = cell;
    this.rows[row].cells[col] = cell;
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
   * The selectedCell property is slightly different from the active col/row.
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

  deleteSelection() {
    this.selection.zones.forEach(zone => {
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

  // Edition
  startEditing = edition.startEditing;
  stopEditing = edition.stopEditing;
  addHighlights = edition.addHighlights;
  cancelEdition = edition.cancelEdition;

  // Evaluation
  evaluateCells = evaluation.evaluateCells;

  // Merges
  addMerge = merges.addMerge;
  mergeSelection = merges.mergeSelection;
  unmergeSelection = merges.unmergeSelection;
  isMergeDestructive = merges.isMergeDestructive;

  // Clipboard
  copySelection = clipboard.copySelection;
  pasteSelection = clipboard.pasteSelection;

  // Styles
  setStyle = styles.setStyle;

  // Selection
  selectCell = selection.selectCell;
  moveSelection = selection.moveSelection;
  selectColumn = selection.selectColumn;
  updateSelection = selection.updateSelection;

  // Borders
  setBorder = borders.setBorder;
}
