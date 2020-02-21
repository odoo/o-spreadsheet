import { HEADER_HEIGHT, HEADER_WIDTH } from "../constants";
import { formatNumber, formatValue } from "../formatters";
import { AsyncFunction } from "../formulas/compiler";
import { compile, tokenize } from "../formulas/index";
import { toCartesian, toXC } from "../helpers";
import { evaluateCells } from "./evaluation";
import { updateState } from "./history";
import { Cell, GridState, NewCell, Sheet, Zone } from "./state";

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
  if (cell.value === "") {
    return "";
  }
  if (cell.value === false) {
    return "FALSE";
  }
  if (cell.value === true) {
    return "TRUE";
  }
  if (cell.error) {
    return cell.value;
  }

  const value = cell.value || 0;

  if (cell.type === "text") {
    return value.toString();
  }
  if (cell.format) {
    return formatValue(cell.value, cell.format);
  }
  return formatNumber(value);
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

interface AddCellOptions {
  sheet?: Sheet;
  preserveFormatting?: boolean;
}

/**
 * Add a cell (it recreates a new cell from scratch).
 *
 * Note that this does not reevaluate the values of the cells. This should be
 * done at some point by the caller.
 */
export function addCell(
  state: GridState,
  xc: string,
  data: NewCell,
  options: AddCellOptions = { preserveFormatting: true }
) {
  const [col, row] = toCartesian(xc);
  const currentCell = options.sheet ? options.sheet.cells[xc] : state.cells[xc];
  const content = data.content || "";
  const type = content[0] === "=" ? "formula" : content.match(numberRegexp) ? "number" : "text";
  const value = type === "text" ? content : type === "number" ? parseFloat(content) : null;
  const cell: Cell = { col, row, xc, content, value, type };
  const style = "style" in data ? data.style : currentCell && currentCell.style;
  const border = "border" in data ? data.border : currentCell && currentCell.border;
  const format = "format" in data ? data.format : currentCell && currentCell.format;
  if (options.preserveFormatting || options.sheet) {
    if (border) {
      cell.border = border;
    }
    if (style) {
      cell.style = style;
    }
    if (format) {
      cell.format = format;
    }
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
  if (options.sheet) {
    options.sheet.cells[xc] = cell;
  } else {
    updateState(state, ["cells", xc], cell);
    updateState(state, ["rows", cell.row, "cells", cell.col], cell);
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
      const newCell: NewCell = { content: "" };
      if ("style" in cell) {
        newCell.style = cell.style;
      }
      if ("border" in cell) {
        newCell.border = cell.border;
      }
      addCell(state, xc, newCell);
    } else {
      updateState(state, ["cells", xc], undefined);
      updateState(state, ["rows", cell.row, "cells", cell.col], undefined);
    }
  }
}

export function movePosition(state: GridState, deltaX: number, deltaY: number) {
  const { activeCol, activeRow, cols, rows, viewport, selection } = state;

  const moveReferenceRow = state.isSelectingRange ? selection.anchor.row : activeRow;
  const moveReferenceCol = state.isSelectingRange ? selection.anchor.col : activeCol;
  const activeReference = toXC(moveReferenceCol, moveReferenceRow);

  const invalidMove =
    (deltaY < 0 && moveReferenceRow === 0) ||
    (deltaY > 0 && moveReferenceRow === rows.length - 1) ||
    (deltaX < 0 && moveReferenceCol === 0) ||
    (deltaX > 0 && moveReferenceCol === cols.length - 1);
  if (invalidMove) {
    return;
  }
  let mergeId = state.mergeCellMap[activeReference];
  if (mergeId) {
    let targetCol = moveReferenceCol;
    let targetRow = moveReferenceRow;
    while (state.mergeCellMap[toXC(targetCol, targetRow)] === mergeId) {
      targetCol += deltaX;
      targetRow += deltaY;
    }
    if (targetCol >= 0 && targetRow >= 0) {
      selectCell(state, targetCol, targetRow);
    }
  } else {
    selectCell(state, moveReferenceCol + deltaX, moveReferenceRow + deltaY);
  }
  // keep current cell in the viewport, if possible
  while (state.activeCol >= viewport.right && state.activeCol !== cols.length - 1) {
    updateScroll(state, state.scrollTop, cols[viewport.left].right);
  }
  while (state.activeCol < viewport.left) {
    updateScroll(state, state.scrollTop, cols[viewport.left - 1].left);
  }
  while (state.activeRow >= viewport.bottom && state.activeRow !== rows.length - 1) {
    updateScroll(state, rows[viewport.top].bottom, state.scrollLeft);
  }
  while (state.activeRow < viewport.top) {
    updateScroll(state, rows[viewport.top - 1].top, state.scrollLeft);
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

export function updateScroll(state: GridState, scrollTop: number, scrollLeft: number): boolean {
  scrollTop = Math.round(scrollTop);
  scrollLeft = Math.round(scrollLeft);
  if (state.scrollTop === scrollTop && state.scrollLeft === scrollLeft) {
    return false;
  }
  state.scrollTop = scrollTop;
  state.scrollLeft = scrollLeft;
  const { offsetX, offsetY } = state;
  updateVisibleZone(state);
  return offsetX !== state.offsetX || offsetY !== state.offsetY;
}

/**
 * Here:
 * - width is the clientWidth, the actual width of the visible zone
 * - height is the clientHeight, the actual height of the visible zone
 */
export function updateVisibleZone(state: GridState, width?: number, height?: number) {
  const { rows, cols, viewport, scrollLeft, scrollTop } = state;
  state.clientWidth = width || state.clientWidth;
  state.clientHeight = height || state.clientHeight;

  viewport.bottom = rows.length - 1;
  let effectiveTop = scrollTop;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].top <= effectiveTop) {
      if (rows[i].bottom > effectiveTop) {
        effectiveTop = rows[i].top;
      }
      viewport.top = i;
    }
    if (effectiveTop + state.clientHeight < rows[i].bottom + HEADER_HEIGHT) {
      viewport.bottom = i;
      break;
    }
  }
  viewport.right = cols.length - 1;
  let effectiveLeft = scrollLeft;
  for (let i = 0; i < cols.length; i++) {
    if (cols[i].left <= effectiveLeft) {
      if (cols[i].right > effectiveLeft) {
        effectiveLeft = cols[i].left;
      }
      viewport.left = i;
    }
    if (effectiveLeft + state.clientWidth < cols[i].right + HEADER_WIDTH) {
      viewport.right = i;
      break;
    }
  }
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

export function removeHighlights(state: GridState) {
  state.highlights = [];
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
    let content = state.currentContent;
    state.currentContent = "";
    const cell = state.cells[xc];
    const didChange = cell ? cell.content !== content : content !== "";
    if (!didChange) {
      cancelEdition(state);
      return;
    }
    if (content) {
      if (content.startsWith("=")) {
        const tokens = tokenize(content);
        const left = tokens.filter(t => t.type === "LEFT_PAREN").length;
        const right = tokens.filter(t => t.type === "RIGHT_PAREN").length;
        const missing = left - right;
        if (missing > 0) {
          content += new Array(missing).fill(")").join("");
        }
      }
      addCell(state, xc, { content: content });
    } else {
      deleteCell(state, xc);
    }

    evaluateCells(state);
    cancelEdition(state);
  }
}

/**
 * set the current content
 * */
export function setCurrentContent(state: GridState, content: string) {
  state.currentContent = content;
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

export function computeAggregate(state: GridState): string | null {
  let aggregate = 0;
  let n = 0;
  for (let zone of state.selection.zones) {
    for (let row = zone.top; row <= zone.bottom; row++) {
      const r = state.rows[row];
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = r.cells[col];
        if (cell && cell.type !== "text" && !cell.error) {
          n++;
          aggregate += cell.value;
        }
      }
    }
  }
  return n < 2 ? null : formatNumber(aggregate);
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
