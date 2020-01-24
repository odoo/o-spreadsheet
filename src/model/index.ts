import * as owl from "@odoo/owl";
import { setBorder } from "./borders";
import * as clipboard from "./clipboard";
import * as selection from "./selection";
import * as merges from "./merges";
import * as styles from "./styles";
import { importData, Cell, GridState, GridData, Style, addSheet, activateSheet } from "./state";
import * as core from "./core";

export * from "./state";

// https://stackoverflow.com/questions/58764853/typescript-remove-first-argument-from-a-function
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;

export class GridModel extends owl.core.EventBus {
  state: GridState;

  // derived state
  selectedCell: Cell | null = null;
  style: Style = {};
  isMergeDestructive: boolean = false;
  aggregate: number | null = null;

  constructor(data: Partial<GridData> = {}) {
    super();
    this.state = importData(data);
    this.prepareModel();
  }

  private makeMutation<T>(f: T): OmitFirstArg<T> {
    return ((...args) => {
      const result = (f as any).call(null, this.state, ...args);
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
    this.style = styles.getStyle(this.state);
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

  // core
  // ---------------------------------------------------------------------------
  deleteCell = this.makeMutation(core.deleteCell);
  movePosition = this.makeMutation(core.movePosition);
  getColSize = this.makeFn(core.getColSize);
  setColSize = this.makeMutation(core.setColSize);
  getRowSize = this.makeFn(core.getRowSize);
  setRowSize = this.makeMutation(core.setRowSize);
  deleteSelection = this.makeMutation(core.deleteSelection);
  setValue = this.makeMutation(core.setValue);
  cancelEdition = this.makeMutation(core.cancelEdition);
  startEditing = this.makeMutation(core.startEditing);
  stopEditing = this.makeMutation(core.stopEditing);
  addHighlights = this.makeMutation(core.addHighlights);
  selectCell = this.makeMutation(core.selectCell);
  // updateVisibleZone should not be a mutation
  updateVisibleZone = this.makeFn(core.updateVisibleZone);
  getCol = this.makeFn(core.getCol);
  getRow = this.makeFn(core.getRow);

  // sheets
  // ---------------------------------------------------------------------------
  addSheet = this.makeMutation(addSheet);
  activateSheet = this.makeMutation(activateSheet);

  // borders
  // ---------------------------------------------------------------------------
  setBorder = this.makeMutation(setBorder);

  // styles
  // ---------------------------------------------------------------------------
  setStyle = this.makeMutation(styles.setStyle);

  // selection
  // ---------------------------------------------------------------------------
  updateSelection = this.makeMutation(selection.updateSelection);
  addColumnToCurrentSelection = this.makeMutation(selection.addColumnToCurrentSelection);
  moveSelection = this.makeMutation(selection.moveSelection);
  selectColumn = this.makeMutation(selection.selectColumn);
  selectRow = this.makeMutation(selection.selectRow);
  selectAll = this.makeMutation(selection.selectAll);

  // merges
  // ---------------------------------------------------------------------------
  merge = this.makeMutation(merges.merge);
  unmerge = this.makeMutation(merges.unmerge);

  // clipboard
  // ---------------------------------------------------------------------------
  cut = this.makeMutation(clipboard.cut);
  copy = this.makeMutation(clipboard.copy);
  paste = this.makeMutation(clipboard.paste);
}
