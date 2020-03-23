import * as owl from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../constants";
import { functionMap } from "../functions/index";
import { overlap, toXC } from "../helpers";
import { BasePlugin } from "./base_plugin";
import * as conditionalFormat from "./conditional_format";
import * as core from "./core";
import { evaluateCells, _evaluateCells } from "./evaluation";
import * as formatting from "./formatting";
import * as history from "./history";
import {
  CURRENT_VERSION,
  exportData,
  importData,
  PartialWorkbookDataWithVersion
} from "./import_export";
import * as merges from "./merges";
import { ClipboardPlugin } from "./plugins/clipboard";
import { EntityPlugin } from "./plugins/entity";
import { GridPlugin } from "./plugins/grid";
import { SelectionPlugin } from "./plugins/selection";
import * as selection from "./selection";
import { Box, CommandResult, Getters, GridCommand, Rect, UI, Viewport, Workbook } from "./types";
import { CorePlugin } from "./plugins/core";

// https://stackoverflow.com/questions/58764853/typescript-remove-first-argument-from-a-function
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;

// -----------------------------------------------------------------------------
// GridModel
// -----------------------------------------------------------------------------
export class GridModel extends owl.core.EventBus {
  static setTimeout = window.setTimeout.bind(window);

  private plugins: BasePlugin[];
  private evalContext: any;
  private isStarted: boolean = false;
  workbook: Workbook;
  state: UI;

  getters: Getters;

  constructor(data: PartialWorkbookDataWithVersion = { version: CURRENT_VERSION }) {
    super();
    (window as any).gridmodel = this; // to debug. remove this someday

    const workbook = importData(data);
    this.workbook = workbook;

    // Plugins
    this.getters = {} as Getters;
    this.plugins = [];

    const Plugins = [CorePlugin, ClipboardPlugin, EntityPlugin, GridPlugin, SelectionPlugin];
    for (let Plugin of Plugins) {
      const plugin = new Plugin(workbook, this.getters);
      plugin.import(data);
      for (let name of Plugin.getters) {
        if (!(name in plugin)) {
          throw new Error(`Invalid getter name: ${name} for plugin ${plugin.constructor}`);
        }
        this.getters[name] = plugin[name].bind(plugin);
      }
      this.plugins.push(plugin);
    }

    // Evaluation context
    const entityPlugin = this.plugins.find(p => p instanceof EntityPlugin) as EntityPlugin;
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
    this.state = this.computeDerivedState();
    if (this.workbook.loadingCells > 0) {
      this.startScheduler();
    }
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

  dispatch(command: GridCommand): CommandResult {
    for (let plugin of this.plugins) {
      let result = plugin.predispatch(command);
      if (result === "CANCELLED") {
        return result;
      }
    }

    history.start(this.workbook);
    const commands: GridCommand[] = [command];
    while (commands.length) {
      const current = commands.shift()!;
      for (let plugin of this.plugins) {
        let result = plugin.dispatch(current);
        if (result) {
          commands.push(...result);
        }
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
    return "COMPLETED";
  }

  computeDerivedState(): UI {
    const { viewport, cols, rows } = this.workbook;
    const clipboard = this.plugins.find(p => p instanceof ClipboardPlugin) as ClipboardPlugin;
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
      isPaintingFormat: clipboard.isPaintingFormat,
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
  deleteSelection = this.makeMutation(core.deleteSelection);
  setValue = this.makeMutation(core.setValue);
  cancelEdition = this.makeMutation(core.cancelEdition);
  startEditing = this.makeMutation(core.startEditing);
  stopEditing = this.makeMutation(core.stopEditing);
  setCurrentContent = this.makeMutation(core.setCurrentContent);
  removeHighlights = this.makeMutation(core.removeHighlights);
  // updateVisibleZone and updateScroll should not be a mutation

  updateVisibleZone = this.makeFn(core.updateVisibleZone);
  updateScroll(scrollTop, scrollLeft) {
    const result = core.updateScroll(this.workbook, scrollTop, scrollLeft);
    Object.assign(this.state, this.computeDerivedState());
    return result; //= this.makeFn(core.updateScroll);
  }

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
  startNewComposerSelection = this.makeMutation(selection.startNewComposerSelection);
  selectionZoneXC = this.makeFn(selection.selectionZoneXC);
  zoneToXC = this.makeFn(selection.zoneToXC);
  addHighlights = this.makeMutation(selection.addHighlights);

  // merges
  // ---------------------------------------------------------------------------
  merge = this.makeMutation(merges.merge);
  unmerge = this.makeMutation(merges.unmerge);

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
    const { offsetX, offsetY } = this.state;
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
          text = refCell ? this.getters.getCellText(refCell) : "";
          textWidth = this.getters.getCellWidth(refCell);
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
