import { AsyncFunction } from "../formulas/compiler";
import { compile } from "../formulas/index";
import { isNumber } from "../functions/helpers";
import { toCartesian } from "../helpers";
import { Cell, NewCell, Workbook } from "../types/index";
import { updateState } from "./history";

export function getCell(state: Workbook, col: number, row: number): Cell | null {
  return state.rows[row].cells[col] || null;
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
