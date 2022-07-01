import { _lt } from "../translation";
import { AddFunctionDescription, ArgValue, PrimitiveArg, ReturnValue } from "../types";
import { args } from "./arguments";
import { assert, toNumber, toString } from "./helpers";
import { POWER } from "./module_math";

// -----------------------------------------------------------------------------
// ADD
// -----------------------------------------------------------------------------
export const ADD: AddFunctionDescription = {
  description: _lt(`Sum of two numbers.`),
  args: args(`
      value1 (number) ${_lt("The first addend.")}
      value2 (number) ${_lt("The second addend.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (value1: PrimitiveArg, value2: PrimitiveArg) => value1?.format || value2?.format,
  compute: function (value1: ArgValue, value2: ArgValue): number {
    return toNumber(value1) + toNumber(value2);
  },
};

// -----------------------------------------------------------------------------
// CONCAT
// -----------------------------------------------------------------------------
export const CONCAT: AddFunctionDescription = {
  description: _lt(`Concatenation of two values.`),
  args: args(`
      value1 (string) ${_lt("The value to which value2 will be appended.")}
      value2 (string) ${_lt("The value to append to value1.")}
    `),
  returns: ["STRING"],
  compute: function (value1: ArgValue, value2: ArgValue): string {
    return toString(value1) + toString(value2);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DIVIDE
// -----------------------------------------------------------------------------
export const DIVIDE: AddFunctionDescription = {
  description: _lt(`One number divided by another.`),
  args: args(`
      dividend (number) ${_lt("The number to be divided.")}
      divisor (number) ${_lt("The number to divide by.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (dividend: PrimitiveArg, divisor: PrimitiveArg) =>
    dividend?.format || divisor?.format,
  compute: function (dividend: ArgValue, divisor: ArgValue): number {
    const _divisor = toNumber(divisor);
    assert(() => _divisor !== 0, _lt("The divisor must be different from zero."));
    return toNumber(dividend) / _divisor;
  },
};

// -----------------------------------------------------------------------------
// EQ
// -----------------------------------------------------------------------------
function isEmpty(value: ArgValue): boolean {
  return value === null || value === undefined;
}

const getNeutral = { number: 0, string: "", boolean: false };

export const EQ: AddFunctionDescription = {
  description: _lt(`Equal.`),
  args: args(`
      value1 (any) ${_lt("The first value.")}
      value2 (any) ${_lt("The value to test against value1 for equality.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: ArgValue, value2: ArgValue): boolean {
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
};

// -----------------------------------------------------------------------------
// GT
// -----------------------------------------------------------------------------
function applyRelationalOperator(
  value1: ArgValue,
  value2: ArgValue,
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

export const GT: AddFunctionDescription = {
  description: _lt(`Strictly greater than.`),
  args: args(`
      value1 (any) ${_lt("The value to test as being greater than value2.")}
      value2 (any) ${_lt("The second value.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: ArgValue, value2: ArgValue): boolean {
    return applyRelationalOperator(value1, value2, (v1, v2) => {
      return v1 > v2;
    });
  },
};

// -----------------------------------------------------------------------------
// GTE
// -----------------------------------------------------------------------------
export const GTE: AddFunctionDescription = {
  description: _lt(`Greater than or equal to.`),
  args: args(`
      value1 (any) ${_lt("The value to test as being greater than or equal to value2.")}
      value2 (any) ${_lt("The second value.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: ArgValue, value2: ArgValue): boolean {
    return applyRelationalOperator(value1, value2, (v1, v2) => {
      return v1 >= v2;
    });
  },
};

// -----------------------------------------------------------------------------
// LT
// -----------------------------------------------------------------------------
export const LT: AddFunctionDescription = {
  description: _lt(`Less than.`),
  args: args(`
      value1 (any) ${_lt("The value to test as being less than value2.")}
      value2 (any) ${_lt("The second value.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: ArgValue, value2: ArgValue): boolean {
    return !GTE.compute(value1, value2);
  },
};

// -----------------------------------------------------------------------------
// LTE
// -----------------------------------------------------------------------------
export const LTE: AddFunctionDescription = {
  description: _lt(`Less than or equal to.`),
  args: args(`
      value1 (any) ${_lt("The value to test as being less than or equal to value2.")}
      value2 (any) ${_lt("The second value.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: ArgValue, value2: ArgValue): boolean {
    return !GT.compute(value1, value2);
  },
};

// -----------------------------------------------------------------------------
// MINUS
// -----------------------------------------------------------------------------
export const MINUS: AddFunctionDescription = {
  description: _lt(`Difference of two numbers.`),
  args: args(`
      value1 (number) ${_lt("The minuend, or number to be subtracted from.")}
      value2 (number) ${_lt("The subtrahend, or number to subtract from value1.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (value1: PrimitiveArg, value2: PrimitiveArg) => value1?.format || value2?.format,
  compute: function (value1: ArgValue, value2: ArgValue): number {
    return toNumber(value1) - toNumber(value2);
  },
};

// -----------------------------------------------------------------------------
// MULTIPLY
// -----------------------------------------------------------------------------
export const MULTIPLY: AddFunctionDescription = {
  description: _lt(`Product of two numbers`),
  args: args(`
      factor1 (number) ${_lt("The first multiplicand.")}
      factor2 (number) ${_lt("The second multiplicand.")}
    `),
  returns: ["NUMBER"],
  computeFormat: (factor1: PrimitiveArg, factor2: PrimitiveArg) =>
    factor1?.format || factor2?.format,
  compute: function (factor1: ArgValue, factor2: ArgValue): number {
    return toNumber(factor1) * toNumber(factor2);
  },
};

// -----------------------------------------------------------------------------
// NE
// -----------------------------------------------------------------------------
export const NE: AddFunctionDescription = {
  description: _lt(`Not equal.`),
  args: args(`
      value1 (any) ${_lt("The first value.")}
      value2 (any) ${_lt("The value to test against value1 for inequality.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: ArgValue, value2: ArgValue): boolean {
    return !EQ.compute(value1, value2);
  },
};

// -----------------------------------------------------------------------------
// POW
// -----------------------------------------------------------------------------
export const POW: AddFunctionDescription = {
  description: _lt(`A number raised to a power.`),
  args: args(`
      base (number) ${_lt("The number to raise to the exponent power.")}
      exponent (number) ${_lt("The exponent to raise base to.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (base: ArgValue, exponent: ArgValue): number {
    return POWER.compute(base, exponent) as number;
  },
};

// -----------------------------------------------------------------------------
// UMINUS
// -----------------------------------------------------------------------------
export const UMINUS: AddFunctionDescription = {
  description: _lt(`A number with the sign reversed.`),
  args: args(`
      value (number) ${_lt(
        "The number to have its sign reversed. Equivalently, the number to multiply by -1."
      )}
    `),
  computeFormat: (value: PrimitiveArg) => value?.format,
  returns: ["NUMBER"],
  compute: function (value: ArgValue): number {
    return -toNumber(value);
  },
};

// -----------------------------------------------------------------------------
// UNARY_PERCENT
// -----------------------------------------------------------------------------
export const UNARY_PERCENT: AddFunctionDescription = {
  description: _lt(`Value interpreted as a percentage.`),
  args: args(`
      percentage (number) ${_lt("The value to interpret as a percentage.")}
    `),
  returns: ["NUMBER"],
  compute: function (percentage: ArgValue): number {
    return toNumber(percentage) / 100;
  },
};

// -----------------------------------------------------------------------------
// UPLUS
// -----------------------------------------------------------------------------
export const UPLUS: AddFunctionDescription = {
  description: _lt(`A specified number, unchanged.`),
  args: args(`
      value (any) ${_lt("The number to return.")}
    `),
  returns: ["ANY"],
  computeFormat: (value: PrimitiveArg) => value?.format,
  compute: function (value: ArgValue): ReturnValue {
    return value === null ? "" : value;
  },
};
