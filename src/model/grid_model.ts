import * as owl from "@odoo/owl";
import { compile } from "../formulas/index";
import { numberToLetters, toCartesian, toXC } from "../helpers";
import * as borders from "./borders";
import * as clipboard from "./clipboard";
import * as edition from "./edition";
import * as evaluation from "./evaluation";
import * as merges from "./merges";
import * as selection from "./selection";
import * as styles from "./styles";
import { Cell, CellData, GridData, GridState, Sheet, Style } from "./types";

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
  state: GridState = {
    rows: [],
    cols: [],
    cells: {},
    styles: {},
    borders,
    merges: {},
    mergeCellMap: {},
    width: 0,
    height: 0,
    clientWidth: 0,
    offsetX: 0,
    offsetY: 0,
    scrollTop: 0,
    scrollLeft: 0,
    viewport: { top: 0, left: 0, bottom: 0, right: 0 },
    selection: { zones: [{ top: 0, left: 0, bottom: 0, right: 0 }], anchor: { col: 0, row: 0 } },
    activeCol: 0,
    activeRow: 0,
    activeXc: "A1",
    activeSheet: "Sheet1",
    isEditing: false,
    currentContent: "",
    clipboard: {},
    nextId: 1,
    highlights: [],
    isSilent: true,
    isSelectingRange: false
  };

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
    this.state.borders = data.borders || {};
    // styles
    this.state.styles = data.styles || {};
    for (let k in this.state.styles) {
      this.state.nextId = Math.max(k as any, this.state.nextId);
    }
    for (let k in this.state.borders) {
      this.state.nextId = Math.max(k as any, this.state.nextId);
    }
    this.state.nextId++;
    this.state.styles[0] = Object.assign({}, DEFAULT_STYLE, this.state.styles[0]);

    const sheet = sheets[0];
    this.activateSheet(sheet);
  }

  activateSheet(sheet: Sheet) {
    this.state.isSilent = true;
    this.state.activeSheet = sheet.name || "Sheet1";

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
    this.state.isSilent = false;
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
      this.state.rows.push(row);
      current = row.bottom;
    }
    this.state.height = this.state.rows[this.state.rows.length - 1].bottom + 20; // 10 to have some space at the end

    current = 0;
    for (let i = 0; i < sheet.colNumber; i++) {
      const size = cols[i] ? cols[i].size || DEFAULT_CELL_WIDTH : DEFAULT_CELL_WIDTH;
      const col = {
        left: current,
        right: current + size,
        size: size,
        name: numberToLetters(i)
      };
      this.state.cols.push(col);
      current = col.right;
    }
    this.state.width = this.state.cols[this.state.cols.length - 1].right + 10;
  }

  addCell(xc: string, data: CellData) {
    const [col, row] = toCartesian(xc);
    const currentCell = this.state.cells[xc];
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
    this.state.cells[xc] = cell;
    this.state.rows[row].cells[col] = cell;
  }

  /**
   * This method is the correct way to notify the rest of the system that
   * some interesting internal state has changed, and that the UI should be
   * rerendered
   */
  notify() {
    if (!this.state.isSilent) {
      this.trigger("update");
    }
  }

  /**
   * The selectedCell property is slightly different from the active col/row.
   * It is the reference cell for the current ui state. So, if the position is
   * inside a merge, then it will be the top left cell.
   */
  get selectedCell(): Cell | null {
    let mergeId = this.state.mergeCellMap[this.state.activeXc];
    if (mergeId) {
      return this.state.cells[this.state.merges[mergeId].topLeft];
    } else {
      return this.getCell(this.state.activeCol, this.state.activeRow);
    }
  }

  getCell(col: number, row: number): Cell | null {
    return this.state.rows[row].cells[col] || null;
  }

  getStyle(): Style {
    const cell = this.selectedCell;
    return cell && cell.style ? this.state.styles[cell.style] : {};
  }

  getCol(x: number): number {
    if (x <= HEADER_WIDTH) {
      return -1;
    }
    const { cols, offsetX, viewport } = this.state;
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
    const { rows, offsetY, viewport } = this.state;
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
    const { cols } = this.state;
    const col = cols[index];
    col.size += delta;
    col.right += delta;
    for (let i = index + 1; i < this.state.cols.length; i++) {
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
    const cell = this.state.cells[xc];
    if (cell) {
      if ("style" in cell) {
        this.addCell(xc, { content: "", style: cell.style });
      } else {
        delete this.state.cells[xc];
        delete this.state.rows[cell.row].cells[cell.col];
      }
    }
  }

  updateVisibleZone(width: number, height: number, scrollLeft: number, scrollTop: number) {
    const { rows, cols, viewport } = this.state;
    this.state.clientWidth = width;

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
    this.state.scrollLeft = scrollLeft;
    this.state.scrollTop = scrollTop;
    this.state.offsetX = cols[viewport.left].left - HEADER_WIDTH;
    this.state.offsetY = rows[viewport.top].top - HEADER_HEIGHT;
  }

  movePosition(deltaX: number, deltaY: number) {
    const { activeCol, activeRow } = this.state;
    if ((deltaY < 0 && activeRow === 0) || (deltaX < 0 && activeCol === 0)) {
      if (this.state.isEditing) {
        this.stopEditing();
        this.notify();
      }
      return;
    }
    let mergeId = this.state.mergeCellMap[this.state.activeXc];
    if (mergeId) {
      let targetCol = this.state.activeCol;
      let targetRow = this.state.activeRow;
      while (this.state.mergeCellMap[toXC(targetCol, targetRow)] === mergeId) {
        targetCol += deltaX;
        targetRow += deltaY;
      }
      if (targetCol >= 0 && targetRow >= 0) {
        this.selectCell(targetCol, targetRow);
      }
    } else {
      this.selectCell(this.state.activeCol + deltaX, this.state.activeRow + deltaY);
    }
  }

  deleteSelection() {
    this.state.selection.zones.forEach(zone => {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const xc = toXC(col, row);
          if (xc in this.state.cells) {
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
