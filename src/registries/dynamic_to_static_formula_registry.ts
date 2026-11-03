import { createPivotFormula } from "../helpers/pivot/pivot_helpers";
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
