import { lettersToNumber, toCartesian, toZone, uuidv4 } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { BorderCommand, CommandResult, CreateSheetCommand, UID } from "../../src/types";

/**
 * Dispatch an UNDO to the model
 */
export function undo(model: Model): CommandResult {
  return model.dispatch("UNDO");
}

/**
 * Dispatch a REDO to the model
 */
export function redo(model: Model): CommandResult {
  return model.dispatch("REDO");
}

/**
 * Create a new sheet. By default, the sheet is added at position 1
 * If data.activate is true, a "ACTIVATE_SHEET" is dispatched
 */
export function createSheet(
  model: Model,
  data: Partial<CreateSheetCommand & { activate: boolean }>
) {
  const activeSheetId = model.getters.getActiveSheetId();
  const sheetId = data.sheetId || uuidv4();
  model.dispatch("CREATE_SHEET", {
    position: data.position !== undefined ? data.position : 1,
    sheetId,
    name: data.name,
    cols: data.cols,
    rows: data.rows,
  });
  if (data.activate) {
    model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: activeSheetId,
      sheetIdTo: sheetId,
    });
  }
}

/**
 * Add columns
 */
export function addColumns(
  model: Model,
  position: "before" | "after",
  column: string,
  quantity: number,
  sheetId: UID = model.getters.getActiveSheetId()
): CommandResult {
  return model.dispatch("ADD_COLUMNS", {
    sheetId,
    position,
    column: lettersToNumber(column),
    quantity,
  });
}

/**
 * Delete columns
 */
export function deleteColumns(
  model: Model,
  columns: string[],
  sheetId: UID = model.getters.getActiveSheetId()
): CommandResult {
  return model.dispatch("REMOVE_COLUMNS", {
    sheetId,
    columns: columns.map(lettersToNumber),
  });
}

/**
 * Add rows
 */
export function addRows(
  model: Model,
  position: "before" | "after",
  row: number,
  quantity: number,
  sheetId: UID = model.getters.getActiveSheetId()
): CommandResult {
  return model.dispatch("ADD_ROWS", {
    sheetId,
    position,
    row,
    quantity,
  });
}

/**
 * Delete rows
 */
export function deleteRows(
  model: Model,
  rows: number[],
  sheetId: UID = model.getters.getActiveSheetId()
): CommandResult {
  return model.dispatch("REMOVE_ROWS", {
    sheetId,
    rows,
  });
}

/**
 * Set a border to a given zone or the selected zones
 */
export function setBorder(model: Model, border: BorderCommand, xc?: string) {
  const target = xc ? [toZone(xc)] : model.getters.getSelectedZones();
  model.dispatch("SET_FORMATTING", {
    sheetId: model.getters.getActiveSheetId(),
    target,
    border,
  });
}

/**
 * Clear a cell
 */
export function clearCell(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const [col, row] = toCartesian(xc);
  model.dispatch("CLEAR_CELL", { col, row, sheetId });
}

/**
 * Set the content of a cell
 */
export function setCellContent(
  model: Model,
  xc: string,
  content: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const [col, row] = toCartesian(xc);
  return model.dispatch("UPDATE_CELL", { col, row, sheetId, content });
}

/**
 * Select a cell
 */
export function selectCell(model: Model, xc: string) {
  const [col, row] = toCartesian(xc);
  model.dispatch("SELECT_CELL", { col, row });
}
