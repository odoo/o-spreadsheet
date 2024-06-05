import { boolAnd, boolOr } from "../../functions/helper_logical";
import { countUnique, sum } from "../../functions/helper_math";
import { average, countAny, max, min } from "../../functions/helper_statistical";
import { inferFormat, toBoolean, toNumber, toString } from "../../functions/helpers";
import { Registry } from "../../registries/registry";
import { _t } from "../../translation";
import { Arg, CellValue, DEFAULT_LOCALE, FPayload, Format, Locale, Matrix } from "../../types";
import { EvaluationError } from "../../types/errors";
import {
  Granularity,
  PivotCoreDimension,
  PivotDimension,
  PivotDomain,
  PivotField,
} from "../../types/pivot";
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

type AggregatorFN = {
  fn: (args: Matrix<FPayload>, locale?: Locale) => CellValue;
  format: (data: Arg | undefined) => Format | undefined;
};

export const AGGREGATORS_FN: Record<string, AggregatorFN | undefined> = {
  count: {
    fn: (args: Matrix<FPayload>) => countAny([args]),
    format: () => "0",
  },
  count_distinct: {
    fn: (args: Matrix<FPayload>) => countUnique([args]),
    format: () => "0",
  },
  bool_and: {
    fn: (args: Matrix<FPayload>) => boolAnd([args]).result,
    format: () => undefined,
  },
  bool_or: {
    fn: (args: Matrix<FPayload>) => boolOr([args]).result,
    format: () => undefined,
  },
  max: {
    fn: (args: Matrix<FPayload>, locale: Locale) => max([args], locale),
    format: inferFormat,
  },
  min: {
    fn: (args: Matrix<FPayload>, locale: Locale) => min([args], locale),
    format: inferFormat,
  },
  avg: {
    fn: (args: Matrix<FPayload>, locale: Locale) => average([args], locale),
    format: inferFormat,
  },
  sum: {
    fn: (args: Matrix<FPayload>, locale: Locale) => sum([args], locale),
    format: inferFormat,
  },
};

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

export const ALL_PERIODS = {
  year: _t("Year"),
  quarter: _t("Quarter"),
  month: _t("Month"),
  week: _t("Week"),
  day: _t("Day"),
  year_number: _t("Year"),
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
  const [name, granularity] = dimension.split(":");
  if (granularity) {
    return { name, granularity };
  }
  return { name };
}

export function isDateField(field: PivotField) {
  return DATE_FIELDS.includes(field.type);
}

export function toPivotDomain(domainStr: string[]) {
  if (domainStr.length % 2 !== 0) {
    throw new Error("Invalid domain: odd number of elements");
  }
  const domain: PivotDomain = [];
  for (let i = 0; i < domainStr.length - 1; i += 2) {
    domain.push({ field: domainStr[i], value: domainStr[i + 1] });
  }
  return domain;
}

export function flatPivotDomain(domain: PivotDomain) {
  return domain.flatMap((arg) => [arg.field, arg.value]);
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
  if (!pivotNormalizationValueRegistry.contains(dimension.type)) {
    throw new EvaluationError(
      _t("Field %(field)s is not supported because of its type (%(type)s)", {
        field: dimension.displayName,
        type: dimension.type,
      })
    );
  }
  // represents a field which is not set (=False server side)
  if (groupValueString === "false") {
    return false;
  }
  const normalizer = pivotNormalizationValueRegistry.get(dimension.type);
  return normalizer(groupValueString, dimension.granularity);
}

function normalizeDateTime(value: string, granularity: Granularity) {
  if (!granularity) {
    throw "";
  }
  return pivotTimeAdapter(granularity).normalizeFunctionValue(value);
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
