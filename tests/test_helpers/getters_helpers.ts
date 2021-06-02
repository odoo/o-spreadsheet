import { toCartesian, toXC, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { MergePlugin } from "../../src/plugins/core/merge";
import { Border, Cell, Merge, Sheet, UID } from "../../src/types";

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
  return cell ? model.getters.getCellText(cell, sheetId, model.getters.shouldShowFormulas()) : "";
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
  return cell ? model.getters.getCellText(cell, sheetId, true) : "";
}

export function getRangeFormattedValues(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): string[][] {
  return model.getters.getRangeFormattedValues(model.getters.getRangeFromSheetXC(sheetId, xc));
}

export function getRangeValues(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): any[][] {
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
  const mergePlugin = model["handlers"].find(
    (handler) => handler instanceof MergePlugin
  )! as MergePlugin;
  const sheetMerges = mergePlugin["merges"][model.getters.getActiveSheetId()];
  return sheetMerges
    ? (Object.fromEntries(
        Object.entries(sheetMerges).filter(([mergeId, merge]) => merge !== undefined)
      ) as Record<number, Merge>)
    : {};
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
  const mainSelectedZone = toZone(xcs[0]);
  const anchorPosition: [number, number] = anchor
    ? toCartesian(anchor)
    : [mainSelectedZone.left, mainSelectedZone.top];
  model.dispatch("SET_SELECTION", {
    anchor: anchorPosition,
    zones: xcs.map(toZone),
  });
  return model.dispatch("SUM_SELECTION");
}
