import { lettersToNumber, toCartesian, toZone, uuidv4 } from "../../src/helpers/index";
import { Model, ModelConfig } from "../../src/model";
import { BorderCommand, CommandResult, CreateSheetCommand, UID } from "../../src/types";
import { StateUpdateMessage } from "../../src/types/collaborative/transport_service";
import { target } from "./helpers";

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

export function activateSheet(
  model: Model,
  sheetIdTo: UID,
  sheetIdFrom: UID = model.getters.getActiveSheetId()
) {
  return model.dispatch("ACTIVATE_SHEET", { sheetIdFrom, sheetIdTo });
}

/**
 * Create a new sheet. By default, the sheet is added at position 1
 * If data.activate is true, a "ACTIVATE_SHEET" is dispatched
 */
export function createSheet(
  model: Model,
  data: Partial<CreateSheetCommand & { activate: boolean }>
) {
  const sheetId = data.sheetId || uuidv4();
  const result = model.dispatch("CREATE_SHEET", {
    position: data.position !== undefined ? data.position : 1,
    sheetId,
    name: data.name,
    cols: data.cols,
    rows: data.rows,
  });
  if (data.activate) {
    activateSheet(model, sheetId);
  }
  return result;
}

/**
 * Create a new chart by default of type bar with titles
 * in the data sets, on the active sheet.
 */

export function createChart(
  model: Model,
  data: {
    title?: string;
    dataSets: string[];
    labelRange: string;
    dataSetsHaveTitle?: boolean;
    type?: "bar" | "line" | "pie";
  },
  chartId?: string,
  sheetId?: string
) {
  const id = chartId || uuidv4();
  const title = data.title || "test";
  sheetId = sheetId || model.getters.getActiveSheetId();
  const dataSetsHaveTitle = data.dataSetsHaveTitle !== undefined ? data.dataSetsHaveTitle : true;
  const type = data.type || "bar";
  const result = model.dispatch("CREATE_CHART", {
    id,
    sheetId: sheetId,
    definition: {
      title,
      dataSets: data.dataSets,
      dataSetsHaveTitle,
      labelRange: data.labelRange,
      type,
    },
  });
  return result;
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
  return model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId,
    dimension: "COL",
    position,
    base: lettersToNumber(column),
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
  return model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId,
    dimension: "COL",
    elements: columns.map(lettersToNumber),
  });
}

/**
 * Resize columns
 */
export function resizeColumns(
  model: Model,
  columns: string[],
  size: number,
  sheetId: UID = model.getters.getActiveSheetId()
): CommandResult {
  return model.dispatch("RESIZE_COLUMNS_ROWS", {
    dimension: "COL",
    elements: columns.map(lettersToNumber),
    sheetId,
    size,
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
  return model.dispatch("ADD_COLUMNS_ROWS", {
    dimension: "ROW",
    sheetId,
    position,
    base: row,
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
  return model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId,
    elements: rows,
    dimension: "ROW",
  });
}

/**
 * Resize rows
 */
export function resizeRows(
  model: Model,
  rows: number[],
  size: number,
  sheetId: UID = model.getters.getActiveSheetId()
): CommandResult {
  return model.dispatch("RESIZE_COLUMNS_ROWS", {
    dimension: "ROW",
    elements: rows,
    sheetId,
    size,
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

export function createModelWithViewport(
  data?: any,
  config?: Partial<ModelConfig>,
  stateUpdateMessages?: StateUpdateMessage[],
  width: number = 1000,
  height: number = 1000
): Model {
  const model = new Model(data, config, stateUpdateMessages);
  model.dispatch("RESIZE_VIEWPORT", { width, height });
  return model;
}

export function merge(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): CommandResult {
  return model.dispatch("ADD_MERGE", {
    sheetId,
    target: target(range),
  });
}

export function unMerge(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): CommandResult {
  return model.dispatch("REMOVE_MERGE", {
    sheetId,
    target: target(range),
  });
}
