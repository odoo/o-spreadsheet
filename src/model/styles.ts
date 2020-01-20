import { toXC, stringify } from "../helpers";
import { Style, GridState } from "./state";
import { getCell, addCell, selectedCell } from "./core";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export function setStyle(state: GridState, style: Style) {
  state.selection.zones.forEach(selection => {
    for (let col = selection.left; col <= selection.right; col++) {
      for (let row = selection.top; row <= selection.bottom; row++) {
        setStyleToCell(state, col, row, style);
      }
    }
  });
}

export function getStyle(state: GridState): Style {
  const cell = selectedCell(state);
  return cell && cell.style ? state.styles[cell.style] : {};
}

function setStyleToCell(state: GridState, col: number, row: number, style) {
  const xc = toXC(col, row);
  const cell = getCell(state, col, row);
  const currentStyle = cell && cell.style ? state.styles[cell.style] : {};
  const nextStyle = Object.assign({}, currentStyle, style);
  const id = registerStyle(state, nextStyle);
  if (cell) {
    cell.style = id;
  } else {
    addCell(state, xc, { style: id, content: "" });
  }
}

function registerStyle(state: GridState, style) {
  const strStyle = stringify(style);
  for (let k in state.styles) {
    if (stringify(state.styles[k]) === strStyle) {
      return parseInt(k, 10);
    }
  }
  const id = state.nextId++;
  state.styles[id] = style;
  return id;
}
