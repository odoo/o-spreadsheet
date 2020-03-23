import { HEADER_HEIGHT, HEADER_WIDTH } from "../constants";
import { formatNumber } from "../formatters";
import { AsyncFunction } from "../formulas/compiler";
import { compile, tokenize } from "../formulas/index";
import { isNumber } from "../functions/helpers";
import { toCartesian, toXC } from "../helpers";
import { updateState } from "./history";
import { Cell, NewCell, Workbook } from "./types";

export function getCell(state: Workbook, col: number, row: number): Cell | null {
  return state.rows[row].cells[col] || null;
}

export function selectedCell(state: Workbook): Cell | null {
  let mergeId = state.mergeCellMap[state.activeXc];
  if (mergeId) {
    return state.cells[state.merges[mergeId].topLeft];
  } else {
    return getCell(state, state.activeCol, state.activeRow);
  }
}

/**
 * Set the text value for a given cell.
 *
 * Todo: maybe the composer should use this and we could remove the startEditing
 * stopediting/current string logic...
 */
export function setValue(state: Workbook, xc: string, text: string) {
  addCell(state, xc, { content: text });
}

interface AddCellOptions {
  sheet?: string;
  preserveFormatting?: boolean;
}

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

/**
 * Add a cell (it recreates a new cell from scratch).
 *
 * Note that this does not reevaluate the values of the cells. This should be
 * done at some point by the caller.
 */
export function addCell(
  state: Workbook,
  xc: string,
  data: NewCell,
  options: AddCellOptions = { preserveFormatting: true }
) {
  const [col, row] = toCartesian(xc);
  const sheet = options.sheet
    ? state.sheets.find(s => s.name === options.sheet)!
    : state.activeSheet;
  const currentCell = sheet.cells[xc];
  const content = data.content ? data.content.replace(nbspRegexp, " ") : "";
  let type: Cell["type"] = "text";
  let value: Cell["value"] = content;
  let format;
  if (content[0] === "=") {
    type = "formula";
  }
  if (isNumber(content)) {
    type = "number";
    value = parseFloat(content);
    if (content.includes("%")) {
      value = value / 100;
      format = content.includes(".") ? "0.00%" : "0%";
    }
  }
  const contentUpperCase = content.toUpperCase();
  if (contentUpperCase === "TRUE") {
    value = true;
  }
  if (contentUpperCase === "FALSE") {
    value = false;
  }
  const cell: Cell = { col, row, xc, content, value, type };
  const style = "style" in data ? data.style : currentCell && currentCell.style;
  const border = "border" in data ? data.border : currentCell && currentCell.border;
  format = format || ("format" in data ? data.format : currentCell && currentCell.format);
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
      cell.formula = compile(content, sheet.name);

      if (cell.formula instanceof AsyncFunction) {
        cell.async = true;
      }
    } catch (e) {
      cell.value = "#BAD_EXPR";
      cell.error = true;
    }
  }
  if (options.sheet) {
    sheet.cells[xc] = cell;
  } else {
    updateState(state, ["cells", xc], cell);
    updateState(state, ["rows", cell.row, "cells", cell.col], cell);
  }
  state.isStale = true;
}

/**
 * Delete the content of a cell.
 *
 * This method tolerates the case where xc does not map to an existing cell.
 *
 * The `force` parameter force deletion, even if there is some style applied to
 * the cell.
 */
export function deleteCell(state: Workbook, xc: string, force: boolean = false) {
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
    state.isStale = true;
  }
}

export function updateScroll(state: Workbook, scrollTop: number, scrollLeft: number): boolean {
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
export function updateVisibleZone(state: Workbook, width?: number, height?: number) {
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

export function deleteSelection(state: Workbook) {
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
}

export function startEditing(state: Workbook, str?: string) {
  if (!str) {
    const cell = selectedCell(state);
    str = cell ? cell.content || "" : "";
  }
  state.isEditing = true;
  state.currentContent = str;
  state.highlights = [];
}

export function removeHighlights(state: Workbook) {
  state.highlights = [];
}

export function cancelEdition(state: Workbook) {
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

export function stopEditing(state: Workbook) {
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

    cancelEdition(state);
  }
}

/**
 * set the current content
 * */
export function setCurrentContent(state: Workbook, content: string) {
  state.currentContent = content;
}

export function computeAggregate(state: Workbook): string | null {
  let aggregate = 0;
  let n = 0;
  for (let zone of state.selection.zones) {
    for (let row = zone.top; row <= zone.bottom; row++) {
      const r = state.rows[row];
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = r.cells[col];
        if (cell && cell.type !== "text" && !cell.error && typeof cell.value === "number") {
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
export function activateCell(state: Workbook, col: number, row: number) {
  state.activeCol = col;
  state.activeRow = row;
  state.activeXc = toXC(col, row);
}
