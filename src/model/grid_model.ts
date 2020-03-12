import * as owl from "@odoo/owl";
import * as clipboard from "./clipboard";
import * as core from "./core";
import { _evaluateCells } from "./evaluation";
import * as formatting from "./formatting";
import * as history from "./history";
import { exportData, importData, PartialGridDataWithVersion } from "./import_export";
import * as merges from "./merges";
import * as entity from "./entity";
import * as resizing from "./resizing";
import * as selection from "./selection";
import * as sheet from "./sheet";
import { Cell, CURRENT_VERSION, WorkBookState, Style, RenderState, ViewPortState, ViewPort } from "./state";

// https://stackoverflow.com/questions/58764853/typescript-remove-first-argument-from-a-function
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;

export class GridModel extends owl.core.EventBus {
  private _state: WorkBookState;
  private _renderState: RenderState | null = null;

  // scheduling
  static setTimeout = window.setTimeout.bind(window);
  isStarted: boolean = false;

  // derived state
  selectedCell: Cell | null = null;
  style: Style = {};
  isMergeDestructive: boolean = false;
  aggregate: string | null = null;

  constructor(data: PartialGridDataWithVersion = { version: CURRENT_VERSION }) {
    super();
    this._state = importData(data);
    // this.state = this.computeDerivedState();
    if (this._state.loadingCells > 0) {
      this.startScheduler();
    }
  }

  load(data: PartialGridDataWithVersion = { version: CURRENT_VERSION }) {
    this._state = importData(data);
    this._renderState = null;
    this.trigger("update");
  }

  private makeMutation<T>(f: T): OmitFirstArg<T> {
    return ((...args) => {
      history.start(this._state);
      let result = (f as any).call(null, this._state, ...args);
      history.stop(this._state);
      this._renderState = null;
      this.trigger("update");
      if (this._state.loadingCells > 0) {
        this.startScheduler();
      }
      return result;
    }) as any;
  }

  get renderState(): RenderState {
    if (!this._renderState) {
      this._renderState = {
        isCopyingFormat: this._state.isCopyingFormat,
        scrollTop: this._state.scrollTop,
        scrollLeft: this._state.scrollLeft,
        isSelectingRange: this._state.isSelectingRange,
        selection: this._state.selection,
        // selectedCell: core.selectedCell(this._state)
      }
    }
    return this._renderState;
    // this.selectedCell = core.selectedCell(this._state);
    // this.style = formatting.getStyle(this._state);
    // this.isMergeDestructive = merges.isMergeDestructive(this._state);
    // this.aggregate = core.computeAggregate(this._state);
  }

  getViewportState(viewport: ViewPort): ViewPortState {
    return {
      width: viewport.width,
      height: viewport.height,
      boxes: [],
      bgColor: this._state.styles[0].fillColor || "white",
    }
  }

  private makeFn<T>(f: T): OmitFirstArg<T> {
    return ((...args) => (f as any).call(null, this._state, ...args)) as any;
  }

  private startScheduler() {
    if (!this.isStarted) {
      this.isStarted = true;
      let current = this._state.loadingCells;
      const recomputeCells = () => {
        if (this._state.loadingCells !== current) {
          _evaluateCells(this._state, true);
          current = this._state.loadingCells;
          if (current === 0) {
            this.isStarted = false;
          }
          this._renderState = null;
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
}




// function formatCell(model: GridModel, cell: Cell) {
//   let value = valuesCache[cell.xc];
//   if (value) {
//     return value;
//   }
//   value = model.formatCell(cell);
//   valuesCache[cell.xc] = value;
//   return value;
// }


// function hasContent(state: ViewPortState, col: number, row: number): boolean {
//   const { cells, mergeCellMap } = state;
//   const xc = toXC(col, row);
//   const cell = cells[xc];
//   return (cell && cell.content) || ((xc in mergeCellMap) as any);
// }

// function getGridBoxes(model: GridModel, ctx: CanvasRenderingContext2D): Box[] {
//   const result: Box[] = [];
//   const state = model.state;
//   const { cols, rows, viewport, mergeCellMap, offsetX, offsetY, merges } = state;
//   const { cells } = state;
//   const { right, left, top, bottom } = viewport;
//   // process all visible cells
//   for (let rowNumber = top; rowNumber <= bottom; rowNumber++) {
//     let row = rows[rowNumber];
//     for (let colNumber = left; colNumber <= right; colNumber++) {
//       let cell = row.cells[colNumber];
//       if (cell && !(cell.xc in mergeCellMap)) {
//         let col = cols[colNumber];
//         const text = formatCell(model, cell);
//         const textWidth = getCellWidth(cell, model, ctx);
//         const style = cell.style ? state.styles[cell.style] : null;
//         const align = text
//           ? (style && style.align) || (cell.type === "text" ? "left" : "right")
//           : null;
//         let clipRect: Rect | null = null;
//         if (text && textWidth > cols[cell.col].size) {
//           if (align === "left") {
//             let c = cell.col;
//             while (c < right && !hasContent(state, c + 1, cell.row)) {
//               c++;
//             }
//             const width = cols[c].right - col.left;
//             if (width < textWidth) {
//               clipRect = [col.left - offsetX, row.top - offsetY, width, row.size];
//             }
//           } else {
//             let c = cell.col;
//             while (c > left && !hasContent(state, c - 1, cell.row)) {
//               c--;
//             }
//             const width = col.right - cols[c].left;
//             if (width < textWidth) {
//               clipRect = [cols[c].left - offsetX, row.top - offsetY, width, row.size];
//             }
//           }
//         }

//         result.push({
//           x: col.left - offsetX,
//           y: row.top - offsetY,
//           width: col.size,
//           height: row.size,
//           text,
//           textWidth,
//           border: cell.border ? state.borders[cell.border] : null,
//           style,
//           align,
//           clipRect,
//           isError: cell.error
//         });
//       }
//     }
//   }
//   // process all visible merges
//   for (let id in merges) {
//     let merge = merges[id];
//     if (overlap(merge, viewport)) {
//       const refCell = cells[merge.topLeft];
//       const width = cols[merge.right].right - cols[merge.left].left;
//       let text, textWidth, style, align, border;
//       if (refCell) {
//         text = refCell ? formatCell(model, refCell) : "";
//         textWidth = getCellWidth(refCell, model, ctx);
//         style = refCell.style ? state.styles[refCell.style] : {};
//         align = text
//           ? (style && style.align) || (refCell.type === "text" ? "left" : "right")
//           : null;
//         border = refCell.border ? state.borders[refCell.border] : null;
//       }
//       style = style || {};
//       if (!style.fillColor) {
//         style = Object.create(style);
//         style.fillColor = "#fff";
//       }

//       const x = cols[merge.left].left - offsetX;
//       const y = rows[merge.top].top - offsetY;
//       const height = rows[merge.bottom].bottom - rows[merge.top].top;
//       result.push({
//         x: x,
//         y: y,
//         width,
//         height,
//         text,
//         textWidth,
//         border,
//         style,
//         align,
//         clipRect: [x, y, width, height],
//         isError: refCell ? refCell.error : false
//       });
//     }
//   }
//   return result;
// }

// function getCellWidth(cell: Cell, model: GridModel, ctx: CanvasRenderingContext2D): number {
//   if (cell.width) {
//     return cell.width;
//   }
//   const style = model.state.styles[cell ? cell.style || 0 : 0];
//   const italic = style.italic ? "italic " : "";
//   const weight = style.bold ? "bold" : DEFAULT_FONT_WEIGHT;
//   const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
//   const size = fontSizeMap[sizeInPt];
//   ctx.font = `${italic}${weight} ${size}px ${DEFAULT_FONT}`;
//   cell.width = ctx.measureText(formatCell(model, cell)).width;
//   return cell.width;
// }