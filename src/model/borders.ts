import { BorderCommand, GridState, Border } from "./state";
import { toXC, stringify } from "../helpers";
import { getCell, addCell, deleteCell } from "./core";

// ---------------------------------------------------------------------------
// Borders
// ---------------------------------------------------------------------------
export function setBorder(state: GridState, command: BorderCommand) {
  if (command === "top") {
    const border: Border = { top: ["thin", "#000"] };
    for (let zone of state.selection.zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        setBorderToCell(state, col, zone.top, border);
      }
    }
  }
  if (command === "clear") {
    clearBorder(state, state.activeCol, state.activeRow);
  }
}

function clearBorder(state: GridState, col: number, row: number) {
  const cell = getCell(state, col, row);
  if (!cell) {
    return;
  }
  if (!cell.content && !cell.style) {
    deleteCell(state, toXC(col, row));
  } else {
    delete cell.border;
  }
}

function setBorderToCell(state: GridState, col: number, row: number, border: Border) {
  const cell = getCell(state, col, row);
  const currentBorder = cell && cell.border ? state.borders[cell.border] : {};
  const nextBorder = Object.assign({}, currentBorder, border);
  const id = registerBorder(state, nextBorder);
  if (cell) {
    cell.border = id;
  } else {
    const xc = toXC(col, row);
    addCell(state, xc, { border: id });
  }
}

function registerBorder(state: GridState, border: Border) {
  const strBorder = stringify(border);
  for (let k in state.borders) {
    if (stringify(state.borders[k]) === strBorder) {
      return parseInt(k, 10);
    }
  }
  const id = state.nextId++;
  state.borders[id] = border;
  return id;
}
