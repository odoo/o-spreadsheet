import * as owl from "@odoo/owl";
import * as clipboard from "./clipboard";
import * as core from "./core";
import { _evaluateCells } from "./evaluation";
import * as formatting from "./formatting";
import * as history from "./history";
import * as merges from "./merges";
import * as resizing from "./resizing";
import * as selection from "./selection";
import {
  activateSheet,
  addSheet,
  Cell,
  GridState,
  importData,
  PartialGridDataWithVersion,
  Style
} from "./state";

export * from "./state";

// https://stackoverflow.com/questions/58764853/typescript-remove-first-argument-from-a-function
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;

export class GridModel extends owl.core.EventBus {
  state: GridState;

  // scheduling
  static setTimeout = window.setTimeout.bind(window);
  isStarted: boolean = false;

  // derived state
  selectedCell: Cell | null = null;
  style: Style = {};
  isMergeDestructive: boolean = false;
  aggregate: string | null = null;

  constructor(data?: PartialGridDataWithVersion) {
    super();
    this.state = importData(data);
    this.computeDerivedState();
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
          this.trigger("update");
        }
        if (current > 0) {
          GridModel.setTimeout(recomputeCells, 15);
        }
      };
      GridModel.setTimeout(recomputeCells, 15);
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
  addHighlights = this.makeMutation(core.addHighlights);
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
  addSheet = this.makeMutation(addSheet);
  activateSheet = this.makeMutation(activateSheet);

  // formatting
  // ---------------------------------------------------------------------------
  setBorder = this.makeMutation(formatting.setBorder);
  setStyle = this.makeMutation(formatting.setStyle);
  clearFormat = this.makeMutation(formatting.clearFormat);

  // selection
  // ---------------------------------------------------------------------------
  updateSelection = this.makeMutation(selection.updateSelection);
  moveSelection = this.makeMutation(selection.moveSelection);
  selectColumn = this.makeMutation(selection.selectColumn);
  selectRow = this.makeMutation(selection.selectRow);
  selectAll = this.makeMutation(selection.selectAll);
  setSelectingRange = this.makeFn(selection.setSelectingRange);

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
}
