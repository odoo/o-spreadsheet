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
  this.isEditing = true;
  this.currentContent = str;
  this.highlights = [];
  this.notify();
}

export function addHighlights(this: GridModel, highlights: Highlight[]) {
  this.highlights = this.highlights.concat(highlights);
  this.notify();
}

export function cancelEdition(this: GridModel) {
  resetEditing(this);
  this.notify();
}

function resetEditing(model: GridModel) {
  model.isEditing = false;
  model.isSelectingRange = false;
  model.highlights = [];
}

export function stopEditing(this: GridModel) {
  if (this.isEditing) {
    let xc = toXC(this.activeCol, this.activeRow);
    if (xc in this.mergeCellMap) {
      const mergeId = this.mergeCellMap[xc];
      xc = this.merges[mergeId].topLeft;
    }
    if (this.currentContent) {
      this.addCell(xc, { content: this.currentContent });
    } else {
      this.deleteCell(xc);
    }

    this.evaluateCells();
    this.currentContent = "";
    resetEditing(this);
    this.notify();
  }
}
