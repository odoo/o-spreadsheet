import { _t } from "../translation";
import type { AddFunctionDescription, CellValue, Maybe, ValueAndFormat } from "../types";
import { arg } from "./arguments";
import { assert, toNumber, toString } from "./helpers";
import { POWER } from "./module_math";

// -----------------------------------------------------------------------------
// ADD
// -----------------------------------------------------------------------------
export const ADD = {
  description: _t("Sum of two numbers."),
  args: [
    arg("value1 (number)", _t("The first addend.")),
    arg("value2 (number)", _t("The second addend.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Maybe<ValueAndFormat>, value2: Maybe<ValueAndFormat>) =>
    value1?.format || value2?.format,
  compute: function (value1: Maybe<CellValue>, value2: Maybe<CellValue>): number {
    return toNumber(value1, this.locale) + toNumber(value2, this.locale);
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CONCAT
// -----------------------------------------------------------------------------
export const CONCAT = {
  description: _t("Concatenation of two values."),
  args: [
    arg("value1 (string)", _t("The value to which value2 will be appended.")),
    arg("value2 (string)", _t("The value to append to value1.")),
  ],
  returns: ["STRING"],
  compute: function (value1: Maybe<CellValue>, value2: Maybe<CellValue>): string {
    return toString(value1) + toString(value2);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DIVIDE
// -----------------------------------------------------------------------------
export const DIVIDE = {
  description: _t("One number divided by another."),
  args: [
    arg("dividend (number)", _t("The number to be divided.")),
    arg("divisor (number)", _t("The number to divide by.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (dividend: Maybe<ValueAndFormat>, divisor: Maybe<ValueAndFormat>) =>
    dividend?.format || divisor?.format,
  compute: function (dividend: Maybe<CellValue>, divisor: Maybe<CellValue>): number {
    const _divisor = toNumber(divisor, this.locale);
    assert(() => _divisor !== 0, _t("The divisor must be different from zero."));
    return toNumber(dividend, this.locale) / _divisor;
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EQ
// -----------------------------------------------------------------------------
function isEmpty(value: Maybe<CellValue>): boolean {
  return value === null || value === undefined;
}

const getNeutral = { number: 0, string: "", boolean: false };

export const EQ = {
  description: _t("Equal."),
  args: [
    arg("value1 (any)", _t("The first value.")),
    arg("value2 (any)", _t("The value to test against value1 for equality.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: Maybe<CellValue>, value2: Maybe<CellValue>): boolean {
    value1 = isEmpty(value1) ? getNeutral[typeof value2] : value1;
    value2 = isEmpty(value2) ? getNeutral[typeof value1] : value2;
    if (typeof value1 === "string") {
      value1 = value1.toUpperCase();
    }
    if (typeof value2 === "string") {
      value2 = value2.toUpperCase();
    }
    return value1 === value2;
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// GT
// -----------------------------------------------------------------------------
function applyRelationalOperator(
  value1: Maybe<CellValue>,
  value2: Maybe<CellValue>,
  cb: (v1: string | number, v2: string | number) => boolean
): boolean {
  value1 = isEmpty(value1) ? getNeutral[typeof value2] : value1;
  value2 = isEmpty(value2) ? getNeutral[typeof value1] : value2;
  if (typeof value1 !== "number") {
    value1 = toString(value1).toUpperCase();
  }
  if (typeof value2 !== "number") {
    value2 = toString(value2).toUpperCase();
  }
  const tV1 = typeof value1;
  const tV2 = typeof value2;
  if (tV1 === "string" && tV2 === "number") {
    return true;
  }
  if (tV2 === "string" && tV1 === "number") {
    return false;
  }
  return cb(value1, value2);
}

export const GT = {
  description: _t("Strictly greater than."),
  args: [
    arg("value1 (any)", _t("The value to test as being greater than value2.")),
    arg("value2 (any)", _t("The second value.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: Maybe<CellValue>, value2: Maybe<CellValue>): boolean {
    return applyRelationalOperator(value1, value2, (v1, v2) => {
      return v1 > v2;
    });
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// GTE
// -----------------------------------------------------------------------------
export const GTE = {
  description: _t("Greater than or equal to."),
  args: [
    arg("value1 (any)", _t("The value to test as being greater than or equal to value2.")),
    arg("value2 (any)", _t("The second value.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: Maybe<CellValue>, value2: Maybe<CellValue>): boolean {
    return applyRelationalOperator(value1, value2, (v1, v2) => {
      return v1 >= v2;
    });
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// LT
// -----------------------------------------------------------------------------
export const LT = {
  description: _t("Less than."),
  args: [
    arg("value1 (any)", _t("The value to test as being less than value2.")),
    arg("value2 (any)", _t("The second value.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: Maybe<CellValue>, value2: Maybe<CellValue>): boolean {
    return !GTE.compute.bind(this)(value1, value2);
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// LTE
// -----------------------------------------------------------------------------
export const LTE = {
  description: _t("Less than or equal to."),
  args: [
    arg("value1 (any)", _t("The value to test as being less than or equal to value2.")),
    arg("value2 (any)", _t("The second value.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: Maybe<CellValue>, value2: Maybe<CellValue>): boolean {
    return !GT.compute.bind(this)(value1, value2);
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MINUS
// -----------------------------------------------------------------------------
export const MINUS = {
  description: _t("Difference of two numbers."),
  args: [
    arg("value1 (number)", _t("The minuend, or number to be subtracted from.")),
    arg("value2 (number)", _t("The subtrahend, or number to subtract from value1.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Maybe<ValueAndFormat>, value2: Maybe<ValueAndFormat>) =>
    value1?.format || value2?.format,
  compute: function (value1: Maybe<CellValue>, value2: Maybe<CellValue>): number {
    return toNumber(value1, this.locale) - toNumber(value2, this.locale);
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MULTIPLY
// -----------------------------------------------------------------------------
export const MULTIPLY = {
  description: _t("Product of two numbers"),
  args: [
    arg("factor1 (number)", _t("The first multiplicand.")),
    arg("factor2 (number)", _t("The second multiplicand.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (factor1: Maybe<ValueAndFormat>, factor2: Maybe<ValueAndFormat>) =>
    factor1?.format || factor2?.format,
  compute: function (factor1: Maybe<CellValue>, factor2: Maybe<CellValue>): number {
    return toNumber(factor1, this.locale) * toNumber(factor2, this.locale);
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NE
// -----------------------------------------------------------------------------
export const NE = {
  description: _t("Not equal."),
  args: [
    arg("value1 (any)", _t("The first value.")),
    arg("value2 (any)", _t("The value to test against value1 for inequality.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: Maybe<CellValue>, value2: Maybe<CellValue>): boolean {
    return !EQ.compute.bind(this)(value1, value2);
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// POW
// -----------------------------------------------------------------------------
export const POW = {
  description: _t("A number raised to a power."),
  args: [
    arg("base (number)", _t("The number to raise to the exponent power.")),
    arg("exponent (number)", _t("The exponent to raise base to.")),
  ],
  returns: ["NUMBER"],
  compute: function (base: Maybe<CellValue>, exponent: Maybe<CellValue>): number {
    return POWER.compute.bind(this)(base, exponent);
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// UMINUS
// -----------------------------------------------------------------------------
export const UMINUS = {
  description: _t("A number with the sign reversed."),
  args: [
    arg(
      "value (number)",
      _t("The number to have its sign reversed. Equivalently, the number to multiply by -1.")
    ),
  ],
  computeFormat: (value: Maybe<ValueAndFormat>) => value?.format,
  returns: ["NUMBER"],
  compute: function (value: Maybe<CellValue>): number {
    return -toNumber(value, this.locale);
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// UNARY_PERCENT
// -----------------------------------------------------------------------------
export const UNARY_PERCENT = {
  description: _t("Value interpreted as a percentage."),
  args: [arg("percentage (number)", _t("The value to interpret as a percentage."))],
  returns: ["NUMBER"],
  compute: function (percentage: Maybe<CellValue>): number {
    return toNumber(percentage, this.locale) / 100;
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// UPLUS
// -----------------------------------------------------------------------------
export const UPLUS = {
  description: _t("A specified number, unchanged."),
  args: [arg("value (any)", _t("The number to return."))],
  returns: ["ANY"],
  computeFormat: (value: Maybe<ValueAndFormat>) => value?.format,
  compute: function (value: Maybe<CellValue> = ""): CellValue {
    return value === null ? "" : value;
  },
} satisfies AddFunctionDescription;
