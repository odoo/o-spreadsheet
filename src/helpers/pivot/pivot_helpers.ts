import { Token, getFunctionsFromTokens } from "../../formulas";
import { _t } from "../../translation";
import { PivotCoreDimension, PivotField } from "../../types/pivot";

const PIVOT_FUNCTIONS = ["PIVOT.VALUE", "PIVOT.HEADER", "PIVOT"];

const AGGREGATOR_NAMES = {
  count: _t("Count"),
  count_distinct: _t("Count Distinct"),
  bool_and: _t("Bool And"),
  bool_or: _t("Bool Or"),
  max: _t("Max"),
  min: _t("Min"),
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
  day: _t("Day"),
  week: _t("Week"),
  month: _t("Month"),
  quarter: _t("Quarter"),
  year: _t("Year"),
};

const DATE_FIELDS = ["date", "datetime"];

/**
 * Parse a dimension string into a pivot dimension definition.
 * e.g "create_date:month" => { name: "create_date", granularity: "month" }
 */
export function parseDimension(dimension: string): PivotCoreDimension {
  const [name, granularity] = dimension.split(":");
  if (granularity) {
    return { name, granularity };
  }
  return { name };
}

export function isDateField(field: PivotField) {
  return DATE_FIELDS.includes(field.type);
}
