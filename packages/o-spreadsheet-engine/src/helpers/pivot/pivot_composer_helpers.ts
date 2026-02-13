import { CompiledFormula } from "../../formulas/compiler";
import { CoreGetters } from "../../types/core_getters";

const PIVOT_FUNCTIONS = ["PIVOT.VALUE", "PIVOT.HEADER", "PIVOT"];

/**
 * Get the first Pivot function description of the given formula.
 */
export function getFirstPivotFunction(compiledFormula: CompiledFormula, getters: CoreGetters) {
  return compiledFormula.getFunctionsFromTokens(PIVOT_FUNCTIONS, getters)[0];
}

/**
 * Parse a spreadsheet formula and detect the number of PIVOT functions that are
 * present in the given formula.
 */
export function getNumberOfPivotFunctions(
  compiledFormula: CompiledFormula,
  getters: CoreGetters
): number {
  return compiledFormula.getFunctionsFromTokens(PIVOT_FUNCTIONS, getters).length;
}
