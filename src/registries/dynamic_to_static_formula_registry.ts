import { deepEquals } from "../helpers/misc";
import { createPivotFormula } from "../helpers/pivot/pivot_helpers";
import { isZoneInside } from "../helpers/zones";
import { ClipboardCellData } from "../types/clipboard";
import { Getters } from "../types/getters";
import { CellPosition } from "../types/misc";
import { Registry } from "./registry";

export interface DynamicToStaticFormulaRule {
  /** Whether the rule applies to this cell */
  condition: (position: CellPosition, getters: Getters) => boolean;
  /** Static formula giving the same value as the cell */
  getStaticFormula: (position: CellPosition, getters: Getters) => string;
}

/**
 * Registry to get the static formula of a cell of a spread formula,
 * e.g. =PIVOT.HEADER(1,"Customer","Alice") for a cell of =PIVOT(1).
 * Used to paste static formulas when copying a part of a spread formula.
 */
export const dynamicToStaticFormulaRegistry = new Registry<DynamicToStaticFormulaRule>();

dynamicToStaticFormulaRegistry.add("pivot", {
  condition: (position, getters) => !!getters.getPivotIdFromPosition(position),
  getStaticFormula: (position, getters) => {
    const pivotId = getters.getPivotIdFromPosition(position)!;
    const formulaId = getters.getPivotFormulaId(pivotId);
    return createPivotFormula(formulaId, getters.getPivotCellFromPosition(position));
  },
});

export function getDynamicToStaticFormulaRule(position: CellPosition, getters: Getters) {
  return dynamicToStaticFormulaRegistry.getAll().find((rule) => rule.condition(position, getters));
}

/**
 * Whether the formula of the cell stays dynamic when copying it, instead of being
 * copied as static formulas, e.g. =PIVOT(1) copied as =PIVOT.HEADER(...) and
 * =PIVOT.VALUE(...) (see `dynamicToStaticFormulaRegistry`). It stays dynamic when
 * copying only the formula cell, or its whole spread zone.
 */
export function isCopiedAsDynamicFormula(
  getters: Getters,
  position: CellPosition,
  data: ClipboardCellData
): boolean {
  const spreader = getters.getArrayFormulaSpreadingOn(position);
  const spreadZone = spreader && getters.getSpreadZone(spreader);
  // Other spread formulas, e.g. =SEQUENCE(3), are copied as they are
  if (!spreadZone || !getDynamicToStaticFormulaRule(position, getters)) {
    return true;
  }
  const isOnlyFormulaCellCopied =
    data.rowsIndexes.length === 1 &&
    data.columnsIndexes.length === 1 &&
    deepEquals(spreader, position);
  const isWholeSpreadZoneCopied = data.zones.some((zone) => isZoneInside(spreadZone, zone));
  return isOnlyFormulaCellCopied || isWholeSpreadZoneCopied;
}
