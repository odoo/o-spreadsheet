import { tokenColors } from "../../components/composer/composer/composer";
import { ComposerStore } from "../../components/composer/composer/composer_store";
import { Token, getFunctionsFromTokens } from "../../formulas";
import { EnrichedToken } from "../../formulas/composer_tokenizer";
import { _t } from "../../translation";
import { PivotCoreDimension, PivotField } from "../../types/pivot";

const PIVOT_FUNCTIONS = ["PIVOT.VALUE", "PIVOT.HEADER", "PIVOT"];

const AGGREGATOR_NAMES = {
  count: _t("Count"),
  count_distinct: _t("Count Distinct"),
  bool_and: _t("Boolean And"),
  bool_or: _t("Boolean Or"),
  max: _t("Maximum"),
  min: _t("Minimum"),
  avg: _t("Average"),
  sum: _t("Sum"),
};

const NUMBER_AGGREGATORS = ["max", "min", "avg", "sum", "count_distinct", "count"];
const DATE_AGGREGATORS = ["max", "min", "count_distinct", "count"];

const AGGREGATORS_BY_FIELD_TYPE = {
  integer: NUMBER_AGGREGATORS,
  float: NUMBER_AGGREGATORS,
  monetary: NUMBER_AGGREGATORS,
  date: DATE_AGGREGATORS,
  datetime: DATE_AGGREGATORS,
  boolean: ["count_distinct", "count", "bool_and", "bool_or"],
  char: ["count_distinct", "count"],
  many2one: ["count_distinct", "count"],
  reference: ["count_distinct", "count"],
};

export const AGGREGATORS = {};

for (const type in AGGREGATORS_BY_FIELD_TYPE) {
  AGGREGATORS[type] = {};
  for (const aggregator of AGGREGATORS_BY_FIELD_TYPE[type]) {
    AGGREGATORS[type][aggregator] = AGGREGATOR_NAMES[aggregator];
  }
}

/**
 * Build a pivot formula expression
 */
export function makePivotFormula(
  formula: "PIVOT.VALUE" | "PIVOT.HEADER",
  args: (string | boolean | number)[]
) {
  return `=${formula}(${args
    .map((arg) => {
      const stringIsNumber =
        typeof arg == "string" && !isNaN(Number(arg)) && Number(arg).toString() === arg;
      const convertToNumber = typeof arg == "number" || stringIsNumber;
      return convertToNumber ? `${arg}` : `"${arg.toString().replace(/"/g, '\\"')}"`;
    })
    .join(",")})`;
}

/**
 * Given an object of form {"1": {...}, "2": {...}, ...} get the maximum ID used
 * in this object
 * If the object has no keys, return 0
 *
 */
export function getMaxObjectId(o: object) {
  const keys = Object.keys(o);
  if (!keys.length) {
    return 0;
  }
  const nums = keys.map((id) => parseInt(id, 10));
  const max = Math.max(...nums);
  return max;
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

export const PERIODS = {
  year: _t("Year"),
  quarter: _t("Quarter"),
  month: _t("Month"),
  week: _t("Week"),
  day: _t("Day"),
};

const DATE_FIELDS = ["date", "datetime"];
export const MEASURES_TYPES = ["integer", "float", "monetary"];

/**
 * Parse a dimension string into a pivot dimension definition.
 * e.g "create_date:month" => { name: "create_date", granularity: "month" }
 */
export function parseDimension(dimension: string): PivotCoreDimension {
  const indexOfColon = dimension.indexOf(":");
  if (indexOfColon === -1) {
    return { name: dimension };
  }
  return { name: dimension.slice(0, indexOfColon), granularity: dimension.slice(indexOfColon + 1) };
}

export function isDateField(field: PivotField) {
  return DATE_FIELDS.includes(field.type);
}

/**
 * Create a proposal entry for the compose autocomplete
 * to insert a field name string in a formula.
 */
export function makeFieldProposal(field: PivotField) {
  const quotedFieldName = `"${field.name}"`;
  return {
    text: quotedFieldName,
    description: field.string + (field.help ? ` (${field.help})` : ""),
    htmlContent: [{ value: quotedFieldName, color: tokenColors.STRING }],
    fuzzySearchKey: field.string + quotedFieldName, // search on translated name and on technical name
  };
}

/**
 * Perform the autocomplete of the composer by inserting the value
 * at the cursor position, replacing the current token if necessary.
 * Must be bound to the autocomplete provider.
 */
export function insertTokenAfterArgSeparator(
  this: { composer: ComposerStore },
  tokenAtCursor: EnrichedToken,
  value: string
) {
  let start = tokenAtCursor.end;
  const end = tokenAtCursor.end;
  if (tokenAtCursor.type !== "ARG_SEPARATOR") {
    // replace the whole token
    start = tokenAtCursor.start;
  }
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
  this: { composer: ComposerStore },
  tokenAtCursor: EnrichedToken,
  value: string
) {
  let start = tokenAtCursor.end;
  const end = tokenAtCursor.end;
  if (tokenAtCursor.type !== "LEFT_PAREN") {
    // replace the whole token
    start = tokenAtCursor.start;
  }
  this.composer.changeComposerCursorSelection(start, end);
  this.composer.replaceComposerCursorSelection(value);
}

/**
 * Extract the pivot id (always the first argument) from the function
 * context of the given token.
 */
export function extractFormulaIdFromToken(tokenAtCursor: EnrichedToken) {
  const idAst = tokenAtCursor.functionContext?.args[0];
  if (!idAst || !["STRING", "NUMBER"].includes(idAst.type)) {
    return;
  }
  return idAst.value;
}
