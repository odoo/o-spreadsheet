import * as owl from "@odoo/owl";
import * as formatting from "./formatting";
import * as clipboard from "./clipboard";
import * as core from "./core";
import * as merges from "./merges";
import * as history from "./history";
import * as selection from "./selection";
import * as resizing from "./resizing";
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

  // derived state
  selectedCell: Cell | null = null;
  style: Style = {};
  isMergeDestructive: boolean = false;
  aggregate: string | null = null;

  constructor(data?: PartialGridDataWithVersion) {
    super();
    this.state = importData(data);
    this.prepareModel();
  }

  private makeMutation<T>(f: T): OmitFirstArg<T> {
    return ((...args) => {
      history.start(this.state);
      let result = (f as any).call(null, this.state, ...args);
      history.stop(this.state);
      this.prepareModel();
      this.trigger("update");
      return result;
    }) as any;
  }

  /**
   * 1. Compute derived state
   * 2. make sure async formulas trigger an update
   */
  private prepareModel() {
    this.selectedCell = core.selectedCell(this.state);
    this.style = formatting.getStyle(this.state);
    this.isMergeDestructive = merges.isMergeDestructive(this.state);
    this.aggregate = core.computeAggregate(this.state);

    const computations = this.state.asyncComputations;
    for (let cmp of computations) {
      cmp.then(() => this.trigger("update"));
    }
    this.state.asyncComputations = [];
  }

  private makeFn<T>(f: T): OmitFirstArg<T> {
    return ((...args) => (f as any).call(null, this.state, ...args)) as any;
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
  setSelectingRange = this.makeFn(selection.setSelectionRange);

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
}
