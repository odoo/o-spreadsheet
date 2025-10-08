import { getFunctionsFromTokens } from "../../formulas/helpers";
import { Token } from "../../formulas/tokenizer";

const PIVOT_FUNCTIONS = ["PIVOT.VALUE", "PIVOT.HEADER", "PIVOT"];

/**
 * Get the first Pivot function description of the given formula.
 */
export function getFirstPivotFunction(tokens: Token[]) {
  return getFunctionsFromTokens(tokens, PIVOT_FUNCTIONS)[0];
}

/**
 * Parse a spreadsheet formula and detect the number of PIVOT functions that are
 * present in the given formula.
 */
export function getNumberOfPivotFunctions(tokens: Token[]) {
  return getFunctionsFromTokens(tokens, PIVOT_FUNCTIONS).length;
}
