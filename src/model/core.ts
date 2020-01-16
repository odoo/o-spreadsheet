import { compile } from "../formulas/index";
import { toCartesian, toXC } from "../helpers";
import { evaluateCells } from "./evaluation";
import { Cell, CellData, GridState, Highlight, Zone } from "./state";


export const HEADER_HEIGHT = 26;
export const HEADER_WIDTH = 60;

export function getCell(state: GridState, col: number, row: number): Cell | null {
  return state.rows[row].cells[col] || null;
}

export function selectedCell(state: GridState): Cell | null {
  let mergeId = state.mergeCellMap[state.activeXc];
  if (mergeId) {
    return state.cells[state.merges[mergeId].topLeft];
  } else {
    return getCell(state, state.activeCol, state.activeRow);
  }
}

const numberRegexp = /^-?\d+(,\d+)*(\.\d+(e\d+)?)?$/;

export function addCell(state: GridState, xc: string, data: CellData) {
  const [col, row] = toCartesian(xc);
  const currentCell = state.cells[xc];
  const content = data.content || "";
  const type = content[0] === "=" ? "formula" : content.match(numberRegexp) ? "number" : "text";
  const value =
    type === "text" ? content : type === "number" ? +parseFloat(content).toFixed(4) : null;
  const cell: Cell = { col, row, xc, content, value, type };
  const style = data.style || (currentCell && currentCell.style);
  const border = data.border;
  if (border) {
    cell.border = border;
  }
  if (style) {
    cell.style = style;
  }
  if (cell.type === "formula") {
    cell.error = false;
    try {
      cell.formula = compile(content);
    } catch (e) {
      cell.value = "#BAD_EXPR";
      cell.error = true;
    }
  }
  state.cells[xc] = cell;
  state.rows[row].cells[col] = cell;
}

/**
 * Delete a cell
 */
export function deleteCell(state: GridState, xc: string) {
  const cell = state.cells[xc];
  if (cell) {
    if ("style" in cell) {
      addCell(state, xc, { content: "", style: cell.style });
    } else {
      delete state.cells[xc];
      delete state.rows[cell.row].cells[cell.col];
    }
  }
}

export function movePosition(state: GridState, deltaX: number, deltaY: number) {
  const { activeCol, activeRow } = state;
  if ((deltaY < 0 && activeRow === 0) || (deltaX < 0 && activeCol === 0)) {
    if (state.isEditing) {
      stopEditing(state);
      state.isDirty = true;
    }
    return;
  }
  let mergeId = state.mergeCellMap[state.activeXc];
  if (mergeId) {
    let targetCol = state.activeCol;
    let targetRow = state.activeRow;
    while (state.mergeCellMap[toXC(targetCol, targetRow)] === mergeId) {
      targetCol += deltaX;
      targetRow += deltaY;
    }
    if (targetCol >= 0 && targetRow >= 0) {
      selectCell(state, targetCol, targetRow);
    }
  } else {
    selectCell(state, state.activeCol + deltaX, state.activeRow + deltaY);
  }
}

export function getCol(state: GridState, x: number): number {
  if (x <= HEADER_WIDTH) {
    return -1;
  }
  const { cols, offsetX, viewport } = state;
  const { left, right } = viewport;
  for (let i = left; i <= right; i++) {
    let c = cols[i];
    if (c.left - offsetX <= x && x <= c.right - offsetX) {
      return i;
    }
  }
  return -1;
}

export function getRow(state: GridState, y: number): number {
  if (y <= HEADER_HEIGHT) {
    return -1;
  }
  const { rows, offsetY, viewport } = state;
  const { top, bottom } = viewport;
  for (let i = top; i <= bottom; i++) {
    let r = rows[i];
    if (r.top - offsetY <= y && y <= r.bottom - offsetY) {
      return i;
    }
  }
  return -1;
}

export function setColSize(state: GridState, index: number, delta: number) {
  const { cols } = state;
  const col = cols[index];
  col.size += delta;
  col.right += delta;
  for (let i = index + 1; i < state.cols.length; i++) {
    const col = cols[i];
    col.left += delta;
    col.right += delta;
  }
  state.isDirty = true;
}

export function updateVisibleZone(
  state: GridState,
  width: number,
  height: number,
  scrollLeft: number,
  scrollTop: number
) {
  const { rows, cols, viewport } = state;
  state.clientWidth = width;

  viewport.bottom = rows.length - 1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].top <= scrollTop) {
      viewport.top = i;
    }
    if (scrollTop + height < rows[i].bottom) {
      viewport.bottom = i;
      break;
    }
  }
  viewport.right = cols.length - 1;
  for (let i = 0; i < cols.length; i++) {
    if (cols[i].left <= scrollLeft) {
      viewport.left = i;
    }
    if (scrollLeft + width < cols[i].right) {
      viewport.right = i;
      break;
    }
  }
  state.scrollLeft = scrollLeft;
  state.scrollTop = scrollTop;
  state.offsetX = cols[viewport.left].left - HEADER_WIDTH;
  state.offsetY = rows[viewport.top].top - HEADER_HEIGHT;
}

export function deleteSelection(state: GridState) {
  state.selection.zones.forEach(zone => {
    for (let col = zone.left; col <= zone.right; col++) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        const xc = toXC(col, row);
        if (xc in state.cells) {
          deleteCell(state, xc);
        }
      }
    }
  });
  evaluateCells(state);
  state.isDirty = true;
}

export function startEditing(state: GridState, str?: string) {
  if (!str) {
    const cell = selectedCell(state);
    str = cell ? cell.content || "" : "";
  }
  state.isEditing = true;
  state.currentContent = str;
  state.highlights = [];
  state.isDirty = true;
}

export function addHighlights(state: GridState, highlights: Highlight[]) {
  state.highlights = state.highlights.concat(highlights);
  state.isDirty = true;
}

export function cancelEdition(state: GridState) {
  resetEditing(state);
  state.isDirty = true;
}

function resetEditing(state: GridState) {
  state.isEditing = false;
  state.isSelectingRange = false;
  state.highlights = [];
}

export function stopEditing(state: GridState) {
  if (state.isEditing) {
    let xc = toXC(state.activeCol, state.activeRow);
    if (xc in state.mergeCellMap) {
      const mergeId = state.mergeCellMap[xc];
      xc = state.merges[mergeId].topLeft;
    }
    if (state.currentContent) {
      addCell(state, xc, { content: state.currentContent });
    } else {
      deleteCell(state, xc);
    }

    evaluateCells(state);
    state.currentContent = "";
    resetEditing(state);
    state.isDirty = true;
  }
}

export function selectCell(state: GridState, col: number, row: number, newRange: boolean = false) {
  if (!state.isSelectingRange) {
    stopEditing(state);
  }

  const xc = toXC(col, row);
  let zone: Zone;
  if (xc in state.mergeCellMap) {
    const merge = state.merges[state.mergeCellMap[xc]];
    zone = {
      left: merge.left,
      right: merge.right,
      top: merge.top,
      bottom: merge.bottom
    };
  } else {
    zone = {
      left: col,
      right: col,
      top: row,
      bottom: row
    };
  }

  if (newRange) {
    state.selection.zones.push(zone);
  } else {
    state.selection.zones = [zone];
  }
  state.selection.anchor.col = col;
  state.selection.anchor.row = row;

  if (!state.isSelectingRange) {
    state.activeCol = col;
    state.activeRow = row;
    state.activeXc = xc;
  }
  state.isDirty = true;
}
