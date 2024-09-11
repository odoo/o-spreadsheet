import { boolAnd, boolOr } from "../../functions/helper_logical";
import { countUnique, sum } from "../../functions/helper_math";
import { average, countAny, max, min } from "../../functions/helper_statistical";
import { inferFormat, toBoolean, toNumber, toString } from "../../functions/helpers";
import { Registry } from "../../registries/registry";
import { _t } from "../../translation";
import { CellValue, DEFAULT_LOCALE, FunctionResultObject, Locale, Matrix } from "../../types";
import { EvaluationError } from "../../types/errors";
import {
  Granularity,
  PivotCoreDimension,
  PivotDimension,
  PivotDomain,
  PivotField,
  PivotTableCell,
} from "../../types/pivot";
import { PivotRuntimeDefinition } from "./pivot_runtime_definition";
import { pivotTimeAdapter } from "./pivot_time_adapter";

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

const NUMBER_CHAR_AGGREGATORS = ["max", "min", "avg", "sum", "count_distinct", "count"];

const AGGREGATORS_BY_FIELD_TYPE = {
  integer: NUMBER_CHAR_AGGREGATORS,
  char: NUMBER_CHAR_AGGREGATORS,
  boolean: ["count_distinct", "count", "bool_and", "bool_or"],
};

export const AGGREGATORS = {};

for (const type in AGGREGATORS_BY_FIELD_TYPE) {
  AGGREGATORS[type] = {};
  for (const aggregator of AGGREGATORS_BY_FIELD_TYPE[type]) {
    AGGREGATORS[type][aggregator] = AGGREGATOR_NAMES[aggregator];
  }
}

type AggregatorFN = (args: Matrix<FunctionResultObject>, locale?: Locale) => FunctionResultObject;

export const AGGREGATORS_FN: Record<string, AggregatorFN | undefined> = {
  count: (args: Matrix<FunctionResultObject>) => ({
    value: countAny([args]),
    format: "0",
  }),
  count_distinct: (args: Matrix<FunctionResultObject>) => ({
    value: countUnique([args]),
    format: "0",
  }),
  bool_and: (args: Matrix<FunctionResultObject>) => ({
    value: boolAnd([args]).result,
  }),
  bool_or: (args: Matrix<FunctionResultObject>) => ({
    value: boolOr([args]).result,
  }),
  max: (args: Matrix<FunctionResultObject>, locale: Locale) => max([args], locale),
  min: (args: Matrix<FunctionResultObject>, locale: Locale) => min([args], locale),
  avg: (args: Matrix<FunctionResultObject>, locale: Locale) => ({
    value: average([args], locale),
    format: inferFormat(args),
  }),
  sum: (args: Matrix<FunctionResultObject>, locale: Locale) => ({
    value: sum([args], locale),
    format: inferFormat(args),
  }),
};

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

export const ALL_PERIODS = {
  year: _t("Year"),
  quarter: _t("Quarter & Year"),
  month: _t("Month & Year"),
  week: _t("Week & Year"),
  day: _t("Day"),
  quarter_number: _t("Quarter"),
  month_number: _t("Month"),
  iso_week_number: _t("Week"),
  day_of_month: _t("Day of Month"),
};

const DATE_FIELDS = ["date", "datetime"];

/**
 * Parse a dimension string into a pivot dimension definition.
 * e.g "create_date:month" => { name: "create_date", granularity: "month" }
 */
export function parseDimension(dimension: string): PivotCoreDimension {
  const [fieldName, granularity] = dimension.split(":");
  if (granularity) {
    return { fieldName, granularity };
  }
  return { fieldName };
}

export function isDateField(field: PivotField) {
  return DATE_FIELDS.includes(field.type);
}

function generatePivotArgs(formulaId: string, domain: PivotDomain, measure?: string): string[] {
  const args: string[] = [formulaId];
  if (measure) {
    args.push(`"${measure}"`);
  }
  for (const { field, value, type } of domain) {
    if (field === "measure") {
      args.push(`"measure"`, `"${value}"`);
      continue;
    }
    const { granularity } = parseDimension(field);
    const formattedValue = toFunctionPivotValue(value, { type, granularity });
    args.push(`"${field}"`, formattedValue);
  }
  return args;
}

/**
 * Check if the fields in the domain part of
 * a pivot function are valid according to the pivot definition.
 * e.g. =PIVOT.VALUE(1,"revenue","country_id",...,"create_date:month",...,"source_id",...)
 */
export function areDomainArgsFieldsValid(dimensions: string[], definition: PivotRuntimeDefinition) {
  let argIndex = 0;
  let definitionIndex = 0;
  const cols = definition.columns.map((col) => col.nameWithGranularity);
  const rows = definition.rows.map((row) => row.nameWithGranularity);
  while (dimensions[argIndex] !== undefined && dimensions[argIndex] === rows[definitionIndex]) {
    argIndex++;
    definitionIndex++;
  }
  definitionIndex = 0;
  while (dimensions[argIndex] !== undefined && dimensions[argIndex] === cols[definitionIndex]) {
    argIndex++;
    definitionIndex++;
  }
  return dimensions.length === argIndex;
}

export function createPivotFormula(formulaId: string, cell: PivotTableCell) {
  switch (cell.type) {
    case "HEADER":
      return `=PIVOT.HEADER(${generatePivotArgs(formulaId, cell.domain).join(",")})`;
    case "VALUE":
      return `=PIVOT.VALUE(${generatePivotArgs(formulaId, cell.domain, cell.measure).join(",")})`;
    case "MEASURE_HEADER":
      return `=PIVOT.HEADER(${generatePivotArgs(formulaId, [
        ...cell.domain,
        { field: "measure", value: cell.measure, type: "char" },
      ]).join(",")})`;
  }
  return "";
}

/**
 * Parses the value defining a pivot group in a PIVOT formula
 * e.g. given the following formula PIVOT.VALUE("1", "stage_id", "42", "status", "won"),
 * the two group values are "42" and "won".
 */
export function toNormalizedPivotValue(
  dimension: Pick<PivotDimension, "type" | "displayName" | "granularity">,
  groupValue
) {
  if (groupValue === null || groupValue === "null") {
    return null;
  }
  const groupValueString =
    typeof groupValue === "boolean"
      ? toString(groupValue).toLocaleLowerCase()
      : toString(groupValue);
  if (groupValueString === "null") {
    return null;
  }
  if (!pivotNormalizationValueRegistry.contains(dimension.type)) {
    throw new EvaluationError(
      _t("Field %(field)s is not supported because of its type (%(type)s)", {
        field: dimension.displayName,
        type: dimension.type,
      })
    );
  }
  // represents a field which is not set (=False server side)
  if (groupValueString.toLowerCase() === "false") {
    return false;
  }
  const normalizer = pivotNormalizationValueRegistry.get(dimension.type);
  return normalizer(groupValueString, dimension.granularity);
}

function normalizeDateTime(value: CellValue, granularity: Granularity) {
  if (!granularity) {
    throw new Error("Missing granularity");
  }
  return pivotTimeAdapter(granularity).normalizeFunctionValue(value);
}

export function toFunctionPivotValue(
  value: CellValue,
  dimension: Pick<PivotDimension, "type" | "granularity">
) {
  if (value === null) {
    return `"null"`;
  }
  if (!pivotToFunctionValueRegistry.contains(dimension.type)) {
    return `"${value}"`;
  }
  return pivotToFunctionValueRegistry.get(dimension.type)(value, dimension.granularity);
}

function toFunctionValueDateTime(value: CellValue, granularity: Granularity) {
  if (!granularity) {
    throw new Error("Missing granularity");
  }
  return pivotTimeAdapter(granularity).toFunctionValue(value);
}

export const pivotNormalizationValueRegistry = new Registry<
  (value: string, granularity?: Granularity | string) => CellValue
>();

pivotNormalizationValueRegistry
  .add("date", normalizeDateTime)
  .add("datetime", normalizeDateTime)
  .add("integer", (value) => toNumber(value, DEFAULT_LOCALE))
  .add("boolean", (value) => toBoolean(value))
  .add("char", (value) => toString(value));

export const pivotToFunctionValueRegistry = new Registry<
  (value: CellValue, granularity?: string) => string
>();

pivotToFunctionValueRegistry
  .add("date", toFunctionValueDateTime)
  .add("datetime", toFunctionValueDateTime)
  .add("integer", (value: CellValue) => `${toNumber(value, DEFAULT_LOCALE)}`)
  .add("boolean", (value: CellValue) => (toBoolean(value) ? "TRUE" : "FALSE"))
  .add("char", (value: CellValue) => `"${toString(value).replace(/"/g, '\\"')}"`);

export const PREVIOUS_VALUE = "(previous)";
export const NEXT_VALUE = "(next)";

export function getFieldDisplayName(field: PivotDimension) {
  return field.displayName + (field.granularity ? ` (${ALL_PERIODS[field.granularity]})` : "");
}
