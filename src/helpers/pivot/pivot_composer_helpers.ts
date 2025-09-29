import { CellComposerStore } from "../../components/composer/composer/cell_composer_store";
import { tokenColors } from "../../constants";
import { Token, getFunctionsFromTokens } from "../../formulas";
import { EnrichedToken } from "../../formulas/composer_tokenizer";
import { Granularity, PivotField, PivotMeasure } from "../../types";

const PIVOT_FUNCTIONS = ["PIVOT.VALUE", "PIVOT.HEADER", "PIVOT"];

/**
 * Create a proposal entry for the composer autocomplete
 * to insert a field name string in a formula.
 */
export function makeFieldProposal(field: PivotField, granularity?: Granularity) {
  const groupBy = granularity ? `${field.name}:${granularity}` : field.name;
  const quotedGroupBy = `"${groupBy}"`;
  const fuzzySearchKey =
    field.string !== field.name
      ? field.string + quotedGroupBy // search on translated name and on technical name
      : quotedGroupBy;
  return {
    text: quotedGroupBy,
    description: field.string + (field.help ? ` (${field.help})` : ""),
    htmlContent: [{ value: quotedGroupBy, color: tokenColors.STRING }],
    fuzzySearchKey,
  };
}

export function makeMeasureProposal(measure: PivotMeasure) {
  const quotedMeasure = `"${measure.id}"`;
  const fuzzySearchKey = measure.displayName + measure.fieldName + quotedMeasure;
  return {
    text: quotedMeasure,
    description: measure.displayName,
    htmlContent: [{ value: quotedMeasure, color: tokenColors.STRING }],
    fuzzySearchKey,
  };
}

/**
 * Perform the autocomplete of the composer by inserting the value
 * at the cursor position, replacing the current token if necessary.
 * Must be bound to the autocomplete provider.
 */
export function insertTokenAfterArgSeparator(
  this: { composer: CellComposerStore },
  tokenAtCursor: EnrichedToken,
  value: string
) {
  let start = tokenAtCursor.end;
  const end = tokenAtCursor.end;
  if (tokenAtCursor.type !== "ARG_SEPARATOR") {
    // replace the whole token
    start = tokenAtCursor.start;
  }
  this.composer.stopComposerRangeSelection();
  this.composer.changeComposerCursorSelection(start, end);
  this.composer.replaceComposerCursorSelection(value);
}

/**
 * Perform the autocomplete of the composer by inserting the value
 * at the cursor position, replacing the current token if necessary.
 * Must be bound to the autocomplete provider.
 * @param {EnrichedToken} tokenAtCursor
 * @param {string} value
 */
export function insertTokenAfterLeftParenthesis(
  this: { composer: CellComposerStore },
  tokenAtCursor: EnrichedToken,
  value: string
) {
  let start = tokenAtCursor.end;
  const end = tokenAtCursor.end;
  if (tokenAtCursor.type !== "LEFT_PAREN") {
    // replace the whole token
    start = tokenAtCursor.start;
  }
  this.composer.stopComposerRangeSelection();
  this.composer.changeComposerCursorSelection(start, end);
  this.composer.replaceComposerCursorSelection(value);
}

/**
 * Extract the pivot id (always the first argument) from the function
 * context of the given token.
 */
export function extractFormulaIdFromToken(tokenAtCursor: EnrichedToken) {
  const idAst = tokenAtCursor.functionContext?.args[0];
  if (!idAst || (idAst.type !== "STRING" && idAst.type !== "NUMBER")) {
    return;
  }
  return idAst.value;
}

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
