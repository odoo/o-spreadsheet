import { GridModel } from "./grid_model";
import { toXC, stringify } from "../helpers";
import { Style } from "./types";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export function setStyle(this: GridModel, style: Style) {
  this.state.selection.zones.forEach(selection => {
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
  if (xc in model.state.mergeCellMap) {
    const merge = model.state.merges[model.state.mergeCellMap[xc]];
    if (xc !== merge.topLeft) {
      return;
    }
  }
  const cell = model.getCell(col, row);
  const currentStyle = cell && cell.style ? model.state.styles[cell.style] : {};
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
  for (let k in model.state.styles) {
    if (stringify(model.state.styles[k]) === strStyle) {
      return parseInt(k, 10);
    }
  }
  const id = model.state.nextId++;
  model.state.styles[id] = style;
  return id;
}
