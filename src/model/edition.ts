import { toXC } from "../helpers";
import { GridModel } from "./grid_model";
import { Highlight } from "./types";

// ---------------------------------------------------------------------------
// Edition
// ---------------------------------------------------------------------------

export function startEditing(this: GridModel, str?: string) {
  if (!str) {
    const cell = this.selectedCell;
    str = cell ? cell.content || "" : "";
  }
  this.state.isEditing = true;
  this.state.currentContent = str;
  this.state.highlights = [];
  this.notify();
}

export function addHighlights(this: GridModel, highlights: Highlight[]) {
  this.state.highlights = this.state.highlights.concat(highlights);
  this.notify();
}

export function cancelEdition(this: GridModel) {
  resetEditing(this);
  this.notify();
}

function resetEditing(model: GridModel) {
  model.state.isEditing = false;
  model.state.isSelectingRange = false;
  model.state.highlights = [];
}

export function stopEditing(this: GridModel) {
  if (this.state.isEditing) {
    let xc = toXC(this.state.activeCol, this.state.activeRow);
    if (xc in this.state.mergeCellMap) {
      const mergeId = this.state.mergeCellMap[xc];
      xc = this.state.merges[mergeId].topLeft;
    }
    if (this.state.currentContent) {
      this.addCell(xc, { content: this.state.currentContent });
    } else {
      this.deleteCell(xc);
    }

    this.evaluateCells();
    this.state.currentContent = "";
    resetEditing(this);
    this.notify();
  }
}
