import { stringify, toXC } from "../helpers";
import { addCell, deleteCell, getCell, selectedCell } from "./core";
import { updateCell } from "./history";
import { Border, BorderCommand, GridState, Style, Zone } from "./state";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export function setStyle(state: GridState, style: Style) {
  for (let zone of state.selection.zones) {
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        setStyleToCell(state, col, row, style);
      }
    }
  }
}

export function clearFormat(state: GridState) {
  for (let zone of state.selection.zones) {
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        removeFormat(state, col, row);
      }
    }
  }
}

function removeFormat(state: GridState, col: number, row: number) {
  const cell = getCell(state, col, row);
  if (cell) {
    if (cell.content) {
      addCell(state, cell.xc, { content: cell.content }, { preserveFormatting: false });
    } else {
      deleteCell(state, cell.xc, true);
    }
  }
}

export function getStyle(state: GridState): Style {
  const cell = selectedCell(state);
  return cell && cell.style ? state.styles[cell.style] : {};
}

function setStyleToCell(state: GridState, col: number, row: number, style) {
  const cell = getCell(state, col, row);
  const currentStyle = cell && cell.style ? state.styles[cell.style] : {};
  const nextStyle = Object.assign({}, currentStyle, style);
  const id = registerStyle(state, nextStyle);
  const xc = toXC(col, row);
  if (cell) {
    updateCell(state, cell, "style", id);
    delete cell.width;
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

// ---------------------------------------------------------------------------
// Borders
// ---------------------------------------------------------------------------
const commandToSides = {
  top: ["top"],
  left: ["left"],
  right: ["right"],
  bottom: ["bottom"],
  all: ["top", "left", "bottom", "right"]
};

function getTargetZone(zone: Zone, side: string): Zone {
  const { left, right, top, bottom } = zone;
  switch (side) {
    case "left":
      return { left, top, right: left, bottom };
    case "top":
      return { left, top, right, bottom: top };
    case "right":
      return { left: right, top, right, bottom };
    case "bottom":
      return { left, top: bottom, right, bottom };
  }
  return zone;
}
export function setBorder(state: GridState, command: BorderCommand) {
  for (let zone of state.selection.zones) {
    setBorderToZone(state, zone, command);
  }
}

function setBorderToZone(state: GridState, zone: Zone, command: BorderCommand) {
  if (command === "clear") {
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        clearBorder(state, col, row);
      }
    }
    return;
  }
  if (command === "external") {
    setBorderToZone(state, zone, "left");
    setBorderToZone(state, zone, "right");
    setBorderToZone(state, zone, "top");
    setBorderToZone(state, zone, "bottom");
    return;
  }
  if (command === "hv") {
    setBorderToZone(state, zone, "h");
    setBorderToZone(state, zone, "v");
    return;
  }
  const { left, top, right, bottom } = zone;
  if (command === "h") {
    for (let r = top + 1; r <= bottom; r++) {
      setBorderToZone(state, { left, top: r, right, bottom: r }, "top");
    }
    return;
  }
  if (command === "v") {
    for (let c = left + 1; c <= right; c++) {
      setBorderToZone(state, { left: c, top, right: c, bottom }, "left");
    }
    return;
  }

  const border: Border = {};
  for (let side of commandToSides[command]) {
    border[side] = ["thin", "#000"];
  }

  const target = getTargetZone(zone, command);
  for (let row = target.top; row <= target.bottom; row++) {
    for (let col = target.left; col <= target.right; col++) {
      setBorderToCell(state, col, row, border);
    }
  }
}

function clearBorder(state: GridState, col: number, row: number) {
  const cell = getCell(state, col, row);
  if (cell) {
    if (!cell.content && !cell.style) {
      deleteCell(state, cell.xc, true);
    } else {
      updateCell(state, cell, "border", undefined);
    }
  }
  if (col > 0) {
    clearSide(state, col - 1, row, "right");
  }
  if (row > 0) {
    clearSide(state, col, row - 1, "bottom");
  }
  clearSide(state, col + 1, row, "left");
  clearSide(state, col, row + 1, "top");
}

function clearSide(state: GridState, col: number, row: number, side: string) {
  const cell = getCell(state, col, row);
  if (cell && cell.border) {
    const border = state.borders[cell.border];
    if (side in border) {
      const newBorder = Object.assign({}, border);
      delete newBorder[side];
      if (!cell.content && !cell.style && Object.keys(newBorder).length === 0) {
        deleteCell(state, cell.xc, true);
      } else {
        const id = registerBorder(state, newBorder);
        updateCell(state, cell, "border", id);
      }
    }
  }
}

function setBorderToCell(state: GridState, col: number, row: number, border: Border) {
  const cell = getCell(state, col, row);
  const currentBorder = cell && cell.border ? state.borders[cell.border] : {};
  const nextBorder = Object.assign({}, currentBorder, border);
  const id = registerBorder(state, nextBorder);
  if (cell) {
    updateCell(state, cell, "border", id);
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
