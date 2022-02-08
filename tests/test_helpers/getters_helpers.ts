import { toCartesian, toXC } from "../../src/helpers/index";
import { Model } from "../../src/model";
import {
  Border,
  Cell,
  CellValue,
  CellValueType,
  FormattedValue,
  Merge,
  Sheet,
  UID,
} from "../../src/types";
import { setSelection } from "./commands_helpers";

/**
 * Get the active XC
 */
export function getActiveXc(model: Model): string {
  return toXC(...model.getters.getPosition());
}

/**
 * Get the cell at the given XC
 */
export function getCell(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): Cell | undefined {
  let [col, row] = toCartesian(xc);
  return model.getters.getCell(sheetId, col, row);
}

export function getCellError(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): string | undefined {
  const cell = getCell(model, xc, sheetId);
  return cell && cell.evaluated.type === CellValueType.error ? cell.evaluated.error : undefined;
}

/**
 * Get the string representation of the content of a cell (the value for formula
 * cell, or the formula, depending on ShowFormula)
 */
export function getCellContent(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): string {
  const cell = getCell(model, xc, sheetId);
  return cell ? model.getters.getCellText(cell, model.getters.shouldShowFormulas()) : "";
}

/**
 * Get the string representation of the content of a cell, and always formula
 * for formula cells
 */
export function getCellText(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const cell = getCell(model, xc, sheetId);
  return cell ? model.getters.getCellText(cell, true) : "";
}

export function getRangeFormattedValues(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): FormattedValue[] {
  return model.getters.getRangeFormattedValues(model.getters.getRangeFromSheetXC(sheetId, xc));
}

export function getRangeValues(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): (CellValue | undefined)[] {
  return model.getters.getRangeValues(model.getters.getRangeFromSheetXC(sheetId, xc));
}

/**
 * Get the sheet at the given index
 */
export function getSheet(model: Model, index: number = 0): Sheet {
  return model.getters.getSheets()[index];
}

/**
 * Get the borders at the given XC
 */
export function getBorder(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): Border | null {
  const [col, row] = toCartesian(xc);
  return model.getters.getCellBorder(sheetId, col, row);
}

/**
 * Get the list of the merges
 */
export function getMerges(model: Model): Record<number, Merge> {
  const merges = model.getters.getMerges(model.getters.getActiveSheetId());
  return Object.fromEntries(merges.map((merge) => [merge.id, merge]));
}

export function automaticSum(
  model: Model,
  xc: string,
  { anchor }: { anchor?: string } = {},
  sheetId?: UID
) {
  return automaticSumMulti(model, [xc], { anchor }, sheetId);
}

export function automaticSumMulti(
  model: Model,
  xcs: string[],
  { anchor }: { anchor?: string } = {},
  sheetId?: UID
) {
  if (!sheetId) {
    sheetId = model.getters.getActiveSheetId();
  }
  setSelection(model, xcs, { anchor });
  return model.dispatch("SUM_SELECTION");
}
