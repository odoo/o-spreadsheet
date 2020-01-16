import { GridModel } from "./grid_model";
import { toXC, stringify } from "../helpers";
import { Style } from "./types";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export function setStyle(this: GridModel, style: Style) {
  this.selections.zones.forEach(selection => {
    for (let col = selection.left; col <= selection.right; col++) {
      for (let row = selection.top; row <= selection.bottom; row++) {
        setStyleToCell(this, col, row, style);
      }
    }
  });
  this.notify();
}

function setStyleToCell(model: GridModel, col: number, row: number, style) {
  const xc = toXC(col, row);
  if (xc in model.mergeCellMap) {
    const merge = model.merges[model.mergeCellMap[xc]];
    if (xc !== merge.topLeft) {
      return;
    }
  }
  const cell = model.getCell(col, row);
  const currentStyle = cell && cell.style ? model.styles[cell.style] : {};
  const nextStyle = Object.assign({}, currentStyle, style);
  const id = registerStyle(model, nextStyle);
  if (cell) {
    cell.style = id;
  } else {
    model.addCell(xc, { style: id, content: "" });
  }
  model.notify();
}

function registerStyle(model: GridModel, style) {
  const strStyle = stringify(style);
  for (let k in model.styles) {
    if (stringify(model.styles[k]) === strStyle) {
      return parseInt(k, 10);
    }
  }
  const id = model.nextId++;
  model.styles[id] = style;
  return id;
}
