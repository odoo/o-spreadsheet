import * as owl from "@odoo/owl";
import * as core from "./core";
import { _evaluateCells, evaluateCells } from "./evaluation";
import * as formatting from "./formatting";
import * as history from "./history";
import {
  exportData,
  importData,
  PartialWorkbookDataWithVersion,
  CURRENT_VERSION
} from "./import_export";
import * as merges from "./merges";
import * as entity from "./plugins/entity";
import * as resizing from "./resizing";
import * as selection from "./selection";
import { ClipboardPlugin } from "./plugins/clipboard";
import * as sheet from "./sheet";
import * as conditionalFormat from "./conditional_format";
import { Cell, Workbook, Box, Rect, Viewport, GridCommand, UI, CommandResult } from "./types";
import {
  DEFAULT_FONT_WEIGHT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT,
  HEADER_WIDTH,
  HEADER_HEIGHT
} from "../constants";
import { fontSizeMap } from "../fonts";
import { toXC, overlap } from "../helpers";
import { Plugin } from "./base_plugin";
import { functionMap } from "../functions/index";

// https://stackoverflow.com/questions/58764853/typescript-remove-first-argument-from-a-function
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;

// -----------------------------------------------------------------------------
// GridModel
// -----------------------------------------------------------------------------
export class GridModel extends owl.core.EventBus {
  static setTimeout = window.setTimeout.bind(window);

  private plugins: Plugin[];
  private evalContext: any;
  private ctx: CanvasRenderingContext2D;
  private isStarted: boolean = false;
  workbook: Workbook;
  state: UI;

  getters: { [key: string]: Function } = {};

  constructor(data: PartialWorkbookDataWithVersion = { version: CURRENT_VERSION }) {
    super();
    (window as any).gridmodel = this; // to debug. remove this someday

    const workbook = importData(data);
    this.workbook = workbook;

    // Plugins
    const clipboardPlugin = new ClipboardPlugin(workbook, data);
    const entityPlugin = new entity.EntityPlugin(workbook, data);
    this.plugins = [clipboardPlugin, entityPlugin];
    for (let p of this.plugins) {
      Object.assign(this.getters, p.getters);
    }

    // Evaluation context
    this.evalContext = Object.assign(Object.create(functionMap), {
      getEntity(type: string, key: string): any {
        return entityPlugin.getEntity(type, key);
      },
      getEntities(type: string): { [key: string]: any } {
        return entityPlugin.getEntities(type);
      }
    });

    evaluateCells(workbook, this.evalContext);

    // misc
    this.ctx = document.createElement("canvas").getContext("2d")!;
    this.state = this.computeDerivedState();
    if (this.workbook.loadingCells > 0) {
      this.startScheduler();
    }
  }

  load(data: PartialWorkbookDataWithVersion = { version: CURRENT_VERSION }) {
    this.workbook = importData(data);
    Object.assign(this.state, this.computeDerivedState());
    this.trigger("update");
  }

  private makeMutation<T>(f: T): OmitFirstArg<T> {
    return ((...args) => {
      history.start(this.workbook);
      let result = (f as any).call(null, this.workbook, ...args);
      history.stop(this.workbook);
      Object.assign(this.state, this.computeDerivedState());
      if (this.workbook.isStale) {
        evaluateCells(this.workbook, this.evalContext);
      }
      this.trigger("update");
      if (this.workbook.loadingCells > 0) {
        this.startScheduler();
      }
      return result;
    }) as any;
  }

  dispatch(command: GridCommand): CommandResult[] {
    history.start(this.workbook);
    const results: CommandResult[] = [];
    for (let plugin of this.plugins) {
      let result = plugin.dispatch(command);
      if (result) {
        results.push(result);
      }
    }
    history.stop(this.workbook);
    Object.assign(this.state, this.computeDerivedState());
    if (this.workbook.isStale) {
      evaluateCells(this.workbook, this.evalContext);
    }
    this.trigger("update");
    if (this.workbook.loadingCells > 0) {
      this.startScheduler();
    }
    return results;
  }

  computeDerivedState(): UI {
    const { viewport, cols, rows } = this.workbook;
    const clipboard = this.plugins[0] as ClipboardPlugin;
    const clipboardZones = clipboard.status === "visible" ? clipboard.zones : [];
    return {
      rows: this.workbook.rows,
      cols: this.workbook.cols,
      styles: this.workbook.styles,
      merges: this.workbook.merges,
      mergeCellMap: this.workbook.mergeCellMap,
      width: this.workbook.width,
      height: this.workbook.height,
      offsetX: cols[viewport.left].left - HEADER_WIDTH,
      offsetY: rows[viewport.top].top - HEADER_HEIGHT,
      scrollTop: this.workbook.scrollTop,
      scrollLeft: this.workbook.scrollLeft,
      viewport: this.workbook.viewport,
      selection: this.workbook.selection,
      activeCol: this.workbook.activeCol,
      activeRow: this.workbook.activeRow,
      activeXc: this.workbook.activeXc,
      clipboard: clipboardZones,
      highlights: this.workbook.highlights,
      isSelectingRange: this.workbook.isSelectingRange,
      isEditing: this.workbook.isEditing,
      isPaintingFormat: (this.plugins[0] as ClipboardPlugin).isPaintingFormat,
      selectedCell: core.selectedCell(this.workbook),
      style: formatting.getStyle(this.workbook),
      isMergeDestructive: merges.isMergeDestructive(this.workbook),
      aggregate: core.computeAggregate(this.workbook),
      canUndo: this.workbook.undoStack.length > 0,
      canRedo: this.workbook.redoStack.length > 0,
      currentContent: this.workbook.currentContent,
      sheets: this.workbook.sheets.map(s => s.name),
      activeSheet: this.workbook.activeSheet.name,
      conditionalFormats: this.workbook.activeSheet.conditionalFormats
    };
  }

  private makeFn<T>(f: T): OmitFirstArg<T> {
    return ((...args) => (f as any).call(null, this.workbook, ...args)) as any;
  }

  private startScheduler() {
    if (!this.isStarted) {
      this.isStarted = true;
      let current = this.workbook.loadingCells;
      const recomputeCells = () => {
        if (this.workbook.loadingCells !== current) {
          _evaluateCells(this.workbook, this.evalContext, true);
          current = this.workbook.loadingCells;
          if (current === 0) {
            this.isStarted = false;
          }
          Object.assign(this.state, this.computeDerivedState());
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
  setCurrentContent = this.makeMutation(core.setCurrentContent);
  removeHighlights = this.makeMutation(core.removeHighlights);
  selectCell = this.makeMutation(core.selectCell);
  // updateVisibleZone and updateScroll should not be a mutation

  updateVisibleZone = this.makeFn(core.updateVisibleZone);
  updateScroll(scrollTop, scrollLeft) {
    const result = core.updateScroll(this.workbook, scrollTop, scrollLeft);
    Object.assign(this.state, this.computeDerivedState());
    return result; //= this.makeFn(core.updateScroll);
  }
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
  setSelectingRange(isSelecting: boolean) {
    selection.setSelectingRange(this.workbook, isSelecting);
    this.state.isSelectingRange = isSelecting;
  }
  increaseSelectColumn = this.makeMutation(selection.increaseSelectColumn);
  increaseSelectRow = this.makeMutation(selection.increaseSelectRow);
  zoneIsEntireColumn = this.makeFn(selection.zoneIsEntireColumn);
  zoneIsEntireRow = this.makeFn(selection.zoneIsEntireRow);
  getActiveCols = this.makeFn(selection.getActiveCols);
  getActiveRows = this.makeFn(selection.getActiveRows);
  startNewComposerSelection = this.makeMutation(selection.startNewComposerSelection);
  selectionZoneXC = this.makeFn(selection.selectionZoneXC);
  zoneToXC = this.makeFn(selection.zoneToXC);
  addHighlights = this.makeMutation(selection.addHighlights);

  // merges
  // ---------------------------------------------------------------------------
  merge = this.makeMutation(merges.merge);
  unmerge = this.makeMutation(merges.unmerge);

  // resizing
  // ---------------------------------------------------------------------------
  updateColSize = this.makeMutation(resizing.updateColSize);
  updateColsSize = this.makeMutation(resizing.updateColsSize);
  updateRowSize = this.makeMutation(resizing.updateRowSize);
  updateRowsSize = this.makeMutation(resizing.updateRowsSize);
  setColSize = this.makeMutation(resizing.setColSize);
  setRowSize = this.makeMutation(resizing.setRowSize);

  // export
  // ---------------------------------------------------------------------------
  exportData() {
    const data = exportData(this.workbook);
    for (let plugin of this.plugins) {
      plugin.export(data);
    }
    return data;
  }

  // conditional formatting
  // ---------------------------------------------------------------------------
  addConditionalFormat = this.makeMutation(conditionalFormat.addConditionalFormat);

  _autoresizeCols = this.makeMutation(resizing.autoresizeCols);
  _autoresizeRows = this.makeMutation(resizing.autoresizeRows);

  autoresizeCols(col: number) {
    this._autoresizeCols(col, this.getMaxSize.bind(this));
  }

  autoresizeRows(row: number) {
    this._autoresizeRows(row, this.getMaxSize.bind(this));
  }

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
      boxes: this.getGridBoxes(),
      activeCols: selection.getActiveCols(this.workbook),
      activeRows: selection.getActiveRows(this.workbook)
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
    const { offsetX, offsetY } = this.state;
    const { right, left, top, bottom } = viewport;
    // process all visible cells
    for (let rowNumber = top; rowNumber <= bottom; rowNumber++) {
      let row = rows[rowNumber];
      for (let colNumber = left; colNumber <= right; colNumber++) {
        let cell = row.cells[colNumber];
        if (cell && !(cell.xc in mergeCellMap)) {
          let col = cols[colNumber];
          const text = this.formatCell(cell);
          const textWidth = this.getCellWidth(cell);
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
          text = refCell ? this.formatCell(refCell) : "";
          textWidth = this.getCellWidth(refCell);
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
