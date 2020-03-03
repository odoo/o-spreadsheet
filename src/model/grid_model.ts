import * as owl from "@odoo/owl";
import * as clipboard from "./clipboard";
import * as core from "./core";
import { _evaluateCells } from "./evaluation";
import * as formatting from "./formatting";
import * as history from "./history";
import {
  exportData,
  importData,
  PartialWorkbookDataWithVersion,
  CURRENT_VERSION
} from "./import_export";
import * as merges from "./merges";
import * as entity from "./entity";
import * as resizing from "./resizing";
import * as selection from "./selection";
import * as sheet from "./sheet";
import * as conditionalFormat from "./conditional_format";
import { Cell, Workbook, Style, Box, Rect, Viewport } from "./types";
import { DEFAULT_FONT_WEIGHT, DEFAULT_FONT_SIZE, DEFAULT_FONT } from "../constants";
import { fontSizeMap } from "../fonts";
import { toXC, overlap } from "../helpers";

// https://stackoverflow.com/questions/58764853/typescript-remove-first-argument-from-a-function
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;

export class GridModel extends owl.core.EventBus {
  state: Workbook;

  private ctx: CanvasRenderingContext2D;

  // scheduling
  static setTimeout = window.setTimeout.bind(window);
  isStarted: boolean = false;

  // derived state
  selectedCell: Cell | null = null;
  style: Style = {};
  isMergeDestructive: boolean = false;
  aggregate: string | null = null;

  constructor(data: PartialWorkbookDataWithVersion = { version: CURRENT_VERSION }) {
    super();
    (window as any).gridmodel = this; // to debug. remove this someday

    this.ctx = document.createElement("canvas").getContext("2d")!;
    this.state = importData(data);
    this.computeDerivedState();
    if (this.state.loadingCells > 0) {
      this.startScheduler();
    }
  }

  load(data: PartialWorkbookDataWithVersion = { version: CURRENT_VERSION }) {
    this.state = importData(data);
    this.computeDerivedState();
    this.trigger("update");
  }

  private makeMutation<T>(f: T): OmitFirstArg<T> {
    return ((...args) => {
      history.start(this.state);
      let result = (f as any).call(null, this.state, ...args);
      history.stop(this.state);
      this.computeDerivedState();
      this.trigger("update");
      if (this.state.loadingCells > 0) {
        this.startScheduler();
      }
      return result;
    }) as any;
  }

  private computeDerivedState() {
    this.selectedCell = core.selectedCell(this.state);
    this.style = formatting.getStyle(this.state);
    this.isMergeDestructive = merges.isMergeDestructive(this.state);
    this.aggregate = core.computeAggregate(this.state);
  }

  private makeFn<T>(f: T): OmitFirstArg<T> {
    return ((...args) => (f as any).call(null, this.state, ...args)) as any;
  }

  private startScheduler() {
    if (!this.isStarted) {
      this.isStarted = true;
      let current = this.state.loadingCells;
      const recomputeCells = () => {
        if (this.state.loadingCells !== current) {
          _evaluateCells(this.state, true);
          current = this.state.loadingCells;
          if (current === 0) {
            this.isStarted = false;
          }
          this.computeDerivedState();
          this.trigger("update");
        }
        if (current > 0) {
          GridModel.setTimeout(recomputeCells, 15);
        }
      };
      GridModel.setTimeout(recomputeCells, 5);
    }
  }

  // history
  // ---------------------------------------------------------------------------
  undo = this.makeMutation(history.undo);
  redo = this.makeMutation(history.redo);

  // core
  // ---------------------------------------------------------------------------
  movePosition = this.makeMutation(core.movePosition);
  getColSize = this.makeFn(core.getColSize);
  getRowSize = this.makeFn(core.getRowSize);
  deleteSelection = this.makeMutation(core.deleteSelection);
  setValue = this.makeMutation(core.setValue);
  cancelEdition = this.makeMutation(core.cancelEdition);
  startEditing = this.makeMutation(core.startEditing);
  stopEditing = this.makeMutation(core.stopEditing);
  setCurrentContent = this.makeFn(core.setCurrentContent);
  removeHighlights = this.makeMutation(core.removeHighlights);
  selectCell = this.makeMutation(core.selectCell);
  // updateVisibleZone and updateScroll should not be a mutation
  updateVisibleZone = this.makeFn(core.updateVisibleZone);
  updateScroll = this.makeFn(core.updateScroll);
  getCol = this.makeFn(core.getCol);
  getRow = this.makeFn(core.getRow);
  formatCell = this.makeFn(core.formatCell);

  // sheets
  // ---------------------------------------------------------------------------
  createSheet = this.makeMutation(sheet.createSheet);
  activateSheet = this.makeMutation(sheet.activateSheet);

  // formatting
  // ---------------------------------------------------------------------------
  setBorder = this.makeMutation(formatting.setBorder);
  setStyle = this.makeMutation(formatting.setStyle);
  clearFormatting = this.makeMutation(formatting.clearFormatting);
  setFormat = this.makeMutation(formatting.setFormat);

  // selection
  // ---------------------------------------------------------------------------
  updateSelection = this.makeMutation(selection.updateSelection);
  moveSelection = this.makeMutation(selection.moveSelection);
  selectColumn = this.makeMutation(selection.selectColumn);
  selectRow = this.makeMutation(selection.selectRow);
  selectAll = this.makeMutation(selection.selectAll);
  setSelectingRange = this.makeFn(selection.setSelectingRange);
  increaseSelectColumn = this.makeMutation(selection.increaseSelectColumn);
  increaseSelectRow = this.makeMutation(selection.increaseSelectRow);
  zoneIsEntireColumn = this.makeFn(selection.zoneIsEntireColumn);
  zoneIsEntireRow = this.makeFn(selection.zoneIsEntireRow);
  getActiveCols = this.makeFn(selection.getActiveCols);
  getActiveRows = this.makeFn(selection.getActiveRows);
  startNewComposerSelection = this.makeFn(selection.startNewComposerSelection);
  selectionZoneXC = this.makeFn(selection.selectionZoneXC);
  zoneToXC = this.makeFn(selection.zoneToXC);
  addHighlights = this.makeMutation(selection.addHighlights);

  // merges
  // ---------------------------------------------------------------------------
  merge = this.makeMutation(merges.merge);
  unmerge = this.makeMutation(merges.unmerge);

  // clipboard
  // ---------------------------------------------------------------------------
  cut = this.makeMutation(clipboard.cut);
  copy = this.makeMutation(clipboard.copy);
  paste = this.makeMutation(clipboard.paste);
  getClipboardContent = this.makeFn(clipboard.getClipboardContent);

  // resizing
  // ---------------------------------------------------------------------------
  updateColSize = this.makeMutation(resizing.updateColSize);
  updateColsSize = this.makeMutation(resizing.updateColsSize);
  updateRowSize = this.makeMutation(resizing.updateRowSize);
  updateRowsSize = this.makeMutation(resizing.updateRowsSize);
  setColSize = this.makeMutation(resizing.setColSize);
  setRowSize = this.makeMutation(resizing.setRowSize);

  // entity
  // ---------------------------------------------------------------------------
  addEntity = this.makeFn(entity.addEntity);
  removeEntity = this.makeFn(entity.removeEntity);
  getEntity = this.makeFn(entity.getEntity);
  getEntities = this.makeFn(entity.getEntities);

  // export
  // ---------------------------------------------------------------------------
  exportData = this.makeFn(exportData);

  // conditional formatting
  // ---------------------------------------------------------------------------
  addConditionalFormat = this.makeMutation(conditionalFormat.addConditionalFormat);

  getCellWidth(cell: Cell): number {
    const style = this.state.styles[cell ? cell.style || 0 : 0];
    const italic = style.italic ? "italic " : "";
    const weight = style.bold ? "bold" : DEFAULT_FONT_WEIGHT;
    const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
    const size = fontSizeMap[sizeInPt];
    this.ctx.font = `${italic}${weight} ${size}px ${DEFAULT_FONT}`;
    return this.ctx.measureText(this.formatCell(cell)).width;
  }

  /**
   * Return the max size of the text in a row/col
   * @param context Canvas context
   * @param _model Model
   * @param col True if the size it's a column, false otherwise
   * @param index Index of the row/col
   *
   * @returns Max size of the row/col
   */
  getMaxSize(col: boolean, index: number): number {
    let size = 0;
    const state = this.state;
    const headers = state[col ? "rows" : "cols"];
    for (let i = 0; i < headers.length; i++) {
      const cell = state.rows[col ? i : index].cells[col ? index : i];
      if (cell) {
        if (col) {
          size = Math.max(size, this.getCellWidth(cell));
        } else {
          const style = state.styles[cell ? cell.style || 0 : 0];
          const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
          const fontSize = fontSizeMap[sizeInPt];
          size = Math.max(size, fontSize);
        }
      }
    }
    return size ? size + 6 : 0;
  }

  getViewport(width: number, height: number, offsetX: number, offsetY: number): Viewport {
    return {
      width,
      height,
      offsetX,
      offsetY,
      boxes: getGridBoxes(this),
      activeCols: selection.getActiveCols(this.state),
      activeRows: selection.getActiveRows(this.state)
    };
  }
}

function hasContent(state: Workbook, col: number, row: number): boolean {
  const { cells, mergeCellMap } = state;
  const xc = toXC(col, row);
  const cell = cells[xc];
  return (cell && cell.content) || ((xc in mergeCellMap) as any);
}

function getGridBoxes(model: GridModel): Box[] {
  const result: Box[] = [];
  const state = model.state;
  const { cols, rows, viewport, mergeCellMap, offsetX, offsetY, merges } = state;
  const { cells } = state;
  const { right, left, top, bottom } = viewport;
  // process all visible cells
  for (let rowNumber = top; rowNumber <= bottom; rowNumber++) {
    let row = rows[rowNumber];
    for (let colNumber = left; colNumber <= right; colNumber++) {
      let cell = row.cells[colNumber];
      if (cell && !(cell.xc in mergeCellMap)) {
        let col = cols[colNumber];
        const text = model.formatCell(cell);
        const textWidth = model.getCellWidth(cell);
        let style = cell.style ? state.styles[cell.style] : null;
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
            while (c < right && !hasContent(state, c + 1, cell.row)) {
              c++;
            }
            const width = cols[c].right - col.left;
            if (width < textWidth) {
              clipRect = [col.left - offsetX, row.top - offsetY, width, row.size];
            }
          } else {
            let c = cell.col;
            while (c > left && !hasContent(state, c - 1, cell.row)) {
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
          border: cell.border ? state.borders[cell.border] : null,
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
        text = refCell ? model.formatCell(refCell) : "";
        textWidth = model.getCellWidth(refCell);
        style = refCell.style ? state.styles[refCell.style] : {};
        align = text
          ? (style && style.align) || (refCell.type === "text" ? "left" : "right")
          : null;
        border = refCell.border ? state.borders[refCell.border] : null;
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
