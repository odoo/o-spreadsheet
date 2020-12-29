import { Model } from "../src";
import { uuidv4 } from "../src/helpers";
import { CommandResult, CreateSheetCommand } from "../src/types";

/**
 * Dispatch an "UNDO" on the model
 */
export function undo(model: Model): CommandResult {
  return model.dispatch("UNDO");
}

/**
 * Dispatch an "UNDO" on the model
 */
export function redo(model: Model): CommandResult {
  return model.dispatch("REDO");
}

/**
 * Create a new sheet. By default, the sheet is added at position 1
 */
export function createSheet(
  model: Model,
  data?: Partial<CreateSheetCommand>
) {
  model.dispatch("CREATE_SHEET", {
    position: data?.position !== undefined ? data.position : 1,
    sheetId: data?.sheetId || uuidv4(),
    name: data?.name,
    cols: data?.cols,
    rows: data?.rows,
    activate: data?.activate
  });
}