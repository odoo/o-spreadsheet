import * as owl from "@odoo/owl";
import { setBorder } from "./borders";
import * as clipboard from "./clipboard";
import * as selection from "./selection";
import * as merges from "./merges";
import * as styles from "./styles";
import { importData, Cell, GridState, GridData, Style } from "./state";
import * as core from "./core";

export { HEADER_HEIGHT, HEADER_WIDTH } from "./core";
export * from "./state";

// https://stackoverflow.com/questions/58764853/typescript-remove-first-argument-from-a-function
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;

export class GridModel extends owl.core.EventBus {
  state: GridState;

  // derived state
  selectedCell: Cell | null = null;
  style: Style = {};
  isMergeDestructive: boolean = false;

  constructor(data: Partial<GridData>) {
    super();
    this.state = importData(data);
    this.computeDerivedState();
  }

  private makeMutation<T>(f: T): OmitFirstArg<T> {
    return ((...args) => {
      const result = (f as any).call(null, this.state, ...args);
      this.computeDerivedState();
      this.trigger("update");
      return result;
    }) as any;
  }

  private computeDerivedState() {
    this.selectedCell = core.selectedCell(this.state);
    this.style = styles.getStyle(this.state);
    this.isMergeDestructive = merges.isMergeDestructive(this.state);
  }

  private makeFn<T>(f: T): OmitFirstArg<T> {
    return ((...args) => (f as any).call(null, this.state, ...args)) as any;
  }

  // core
  deleteCell = this.makeMutation(core.deleteCell);
  movePosition = this.makeMutation(core.movePosition);
  setColSize = this.makeMutation(core.setColSize);
  deleteSelection = this.makeMutation(core.deleteSelection);
  cancelEdition = this.makeMutation(core.cancelEdition);
  startEditing = this.makeMutation(core.startEditing);
  stopEditing = this.makeMutation(core.stopEditing);
  addHighlights = this.makeMutation(core.addHighlights);
  selectCell = this.makeMutation(core.selectCell);
  updateVisibleZone = this.makeFn(core.updateVisibleZone);
  getCol = this.makeFn(core.getCol);
  getRow = this.makeFn(core.getRow);

  // borders
  setBorder = this.makeMutation(setBorder);

  // styles
  setStyle = this.makeMutation(styles.setStyle);

  // selection
  updateSelection = this.makeMutation(selection.updateSelection);
  moveSelection = this.makeMutation(selection.moveSelection);
  selectColumn = this.makeMutation(selection.selectColumn);

  // merges
  merge = this.makeMutation(merges.merge);
  unmerge = this.makeMutation(merges.unmerge);

  // clipboard
  cut = this.makeMutation(clipboard.cut);
  copy = this.makeMutation(clipboard.copy);
  paste = this.makeMutation(clipboard.paste);
}
