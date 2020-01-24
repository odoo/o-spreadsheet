import { compile } from "../formulas/index";
import { toCartesian, toXC } from "../helpers";
import { evaluateCells } from "./evaluation";
import { Cell, CellData, GridState, Highlight, Zone, Sheet } from "./state";
import { AsyncFunction } from "../formulas/compiler";
import { HEADER_WIDTH, HEADER_HEIGHT } from "../constants";
import { fromString, add, N, zero } from "../decimal";

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

export function formatCell(state: GridState, cell: Cell): string {
  // todo: apply formatters if needed
  return cell.value.toString();
}

const numberRegexp = /^-?\d+(,\d+)*(\.\d+(e\d+)?)?$/;

/**
 * Set the text value for a given cell.
 *
 * Todo: maybe the composer should use this and we could remove the startEditing
 * stopediting/current string logic...
 */
export function setValue(state: GridState, xc: string, text: string) {
  addCell(state, xc, { content: text });
  evaluateCells(state);
}

/**
 * Add a cell (it recreates a new cell from scratch).
 *
 * Note that this does not reevaluate the values of the cells. This should be
 * done at some point by the caller.
 */
export function addCell(state: GridState, xc: string, data: CellData, sheet?: Sheet) {
  const [col, row] = toCartesian(xc);
  const currentCell = sheet ? sheet.cells[xc] : state.cells[xc];
  const content = data.content || "";
  const type = content[0] === "=" ? "formula" : content.match(numberRegexp) ? "number" : "text";
  const value = type === "text" ? content : type === "number" ? fromString(content) : null;
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
      if (cell.formula instanceof AsyncFunction) {
        cell.async = true;
      }
    } catch (e) {
      cell.value = "#BAD_EXPR";
      cell.error = true;
    }
  }
  if (sheet) {
    sheet.cells[xc] = cell;
  } else {
    state.cells[xc] = cell;
    state.rows[row].cells[col] = cell;
  }
}

/**
 * Delete the content of a cell.
 *
 * This method tolerates the case where xc does not map to an existing cell.
 *
 * The `force` parameter force deletion, even if there is some style applied to
 * the cell.
 */
export function deleteCell(state: GridState, xc: string, force: boolean = false) {
  const cell = state.cells[xc];
  if (cell) {
    if (!force && ("style" in cell || "border" in cell)) {
      const newCell: CellData = { content: "" };
      if ("style" in cell) {
        newCell.style = cell.style;
      }
      if ("border" in cell) {
        newCell.border = cell.border;
      }
      addCell(state, xc, newCell);
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

export function getColSize(state: GridState, index: number) {
  const { cols } = state;
  return cols[index].size;
}

export function getRowSize(state: GridState, index: number) {
  const { rows } = state;
  return rows[index].size;
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
  state.clientHeight = height;

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
}

export function startEditing(state: GridState, str?: string) {
  if (!str) {
    const cell = selectedCell(state);
    str = cell ? cell.content || "" : "";
  }
  state.isEditing = true;
  state.currentContent = str;
  state.highlights = [];
}

export function addHighlights(state: GridState, highlights: Highlight[]) {
  state.highlights = state.highlights.concat(highlights);
}

export function cancelEdition(state: GridState) {
  state.isEditing = false;
  state.isSelectingRange = false;
  state.selection.zones = [
    {
      top: state.activeRow,
      bottom: state.activeRow,
      left: state.activeCol,
      right: state.activeCol
    }
  ];
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
    cancelEdition(state);
  }
}

/**
 * Change the active cell.
 *
 * This is a non trivial task. We need to stop the editing process and update
 * properly the current selection.  Also, this method can optionally create a new
 * range in the selection.
 */
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
    activateCell(state, col, row);
  }
}

export function computeAggregate(state: GridState): number | null {
  let aggregate = zero;
  let n = 0;
  for (let zone of state.selection.zones) {
    for (let row = zone.top; row <= zone.bottom; row++) {
      const r = state.rows[row];
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = r.cells[col];
        if (cell && cell.value instanceof N) {
          n++;
          aggregate = add(aggregate, cell.value);
        }
      }
    }
  }
  return n < 2 ? null : aggregate.toNumber();
}

/**
 * Set the active cell to col/row. Basically, it makes sure that activeXC is
 * properly set as well.
 */
export function activateCell(state: GridState, col: number, row: number) {
  state.activeCol = col;
  state.activeRow = row;
  state.activeXc = toXC(col, row);
}
