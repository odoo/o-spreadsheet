import { _lt } from "../translation";
import {
  AddFunctionDescription,
  FunctionReturnValue,
  PrimitiveArg,
  PrimitiveArgValue,
} from "../types";
import { arg } from "./arguments";
import { assert, toNumber, toString } from "./helpers";
import { POWER } from "./module_math";

// -----------------------------------------------------------------------------
// ADD
// -----------------------------------------------------------------------------
export const ADD: AddFunctionDescription = {
  description: _lt(`Sum of two numbers.`),
  args: [
    arg("value1 (number)", _lt("The first addend.")),
    arg("value2 (number)", _lt("The second addend.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: PrimitiveArg, value2: PrimitiveArg) => value1?.format || value2?.format,
  compute: function (value1: PrimitiveArgValue, value2: PrimitiveArgValue): number {
    return toNumber(value1, this.locale) + toNumber(value2, this.locale);
  },
};

// -----------------------------------------------------------------------------
// CONCAT
// -----------------------------------------------------------------------------
export const CONCAT: AddFunctionDescription = {
  description: _lt(`Concatenation of two values.`),
  args: [
    arg("value1 (string)", _lt("The value to which value2 will be appended.")),
    arg("value2 (string)", _lt("The value to append to value1.")),
  ],
  returns: ["STRING"],
  compute: function (value1: PrimitiveArgValue, value2: PrimitiveArgValue): string {
    return toString(value1) + toString(value2);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DIVIDE
// -----------------------------------------------------------------------------
export const DIVIDE: AddFunctionDescription = {
  description: _lt(`One number divided by another.`),
  args: [
    arg("dividend (number)", _lt("The number to be divided.")),
    arg("divisor (number)", _lt("The number to divide by.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (dividend: PrimitiveArg, divisor: PrimitiveArg) =>
    dividend?.format || divisor?.format,
  compute: function (dividend: PrimitiveArgValue, divisor: PrimitiveArgValue): number {
    const _divisor = toNumber(divisor, this.locale);
    assert(() => _divisor !== 0, _lt("The divisor must be different from zero."));
    return toNumber(dividend, this.locale) / _divisor;
  },
};

// -----------------------------------------------------------------------------
// EQ
// -----------------------------------------------------------------------------
function isEmpty(value: PrimitiveArgValue): boolean {
  return value === null || value === undefined;
}

const getNeutral = { number: 0, string: "", boolean: false };

export const EQ: AddFunctionDescription = {
  description: _lt(`Equal.`),
  args: [
    arg("value1 (any)", _lt("The first value.")),
    arg("value2 (any)", _lt("The value to test against value1 for equality.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: PrimitiveArgValue, value2: PrimitiveArgValue): boolean {
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
  value1: PrimitiveArgValue,
  value2: PrimitiveArgValue,
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
  args: [
    arg("value1 (any)", _lt("The value to test as being greater than value2.")),
    arg("value2 (any)", _lt("The second value.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: PrimitiveArgValue, value2: PrimitiveArgValue): boolean {
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
  args: [
    arg("value1 (any)", _lt("The value to test as being greater than or equal to value2.")),
    arg("value2 (any)", _lt("The second value.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: PrimitiveArgValue, value2: PrimitiveArgValue): boolean {
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
  args: [
    arg("value1 (any)", _lt("The value to test as being less than value2.")),
    arg("value2 (any)", _lt("The second value.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: PrimitiveArgValue, value2: PrimitiveArgValue): boolean {
    return !GTE.compute.bind(this)(value1, value2);
  },
};

// -----------------------------------------------------------------------------
// LTE
// -----------------------------------------------------------------------------
export const LTE: AddFunctionDescription = {
  description: _lt(`Less than or equal to.`),
  args: [
    arg("value1 (any)", _lt("The value to test as being less than or equal to value2.")),
    arg("value2 (any)", _lt("The second value.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: PrimitiveArgValue, value2: PrimitiveArgValue): boolean {
    return !GT.compute.bind(this)(value1, value2);
  },
};

// -----------------------------------------------------------------------------
// MINUS
// -----------------------------------------------------------------------------
export const MINUS: AddFunctionDescription = {
  description: _lt(`Difference of two numbers.`),
  args: [
    arg("value1 (number)", _lt("The minuend, or number to be subtracted from.")),
    arg("value2 (number)", _lt("The subtrahend, or number to subtract from value1.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: PrimitiveArg, value2: PrimitiveArg) => value1?.format || value2?.format,
  compute: function (value1: PrimitiveArgValue, value2: PrimitiveArgValue): number {
    return toNumber(value1, this.locale) - toNumber(value2, this.locale);
  },
};

// -----------------------------------------------------------------------------
// MULTIPLY
// -----------------------------------------------------------------------------
export const MULTIPLY: AddFunctionDescription = {
  description: _lt(`Product of two numbers`),
  args: [
    arg("factor1 (number)", _lt("The first multiplicand.")),
    arg("factor2 (number)", _lt("The second multiplicand.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (factor1: PrimitiveArg, factor2: PrimitiveArg) =>
    factor1?.format || factor2?.format,
  compute: function (factor1: PrimitiveArgValue, factor2: PrimitiveArgValue): number {
    return toNumber(factor1, this.locale) * toNumber(factor2, this.locale);
  },
};

// -----------------------------------------------------------------------------
// NE
// -----------------------------------------------------------------------------
export const NE: AddFunctionDescription = {
  description: _lt(`Not equal.`),
  args: [
    arg("value1 (any)", _lt("The first value.")),
    arg("value2 (any)", _lt("The value to test against value1 for inequality.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (value1: PrimitiveArgValue, value2: PrimitiveArgValue): boolean {
    return !EQ.compute.bind(this)(value1, value2);
  },
};

// -----------------------------------------------------------------------------
// POW
// -----------------------------------------------------------------------------
export const POW: AddFunctionDescription = {
  description: _lt(`A number raised to a power.`),
  args: [
    arg("base (number)", _lt("The number to raise to the exponent power.")),
    arg("exponent (number)", _lt("The exponent to raise base to.")),
  ],
  returns: ["NUMBER"],
  compute: function (base: PrimitiveArgValue, exponent: PrimitiveArgValue): number {
    return POWER.compute.bind(this)(base, exponent) as number;
  },
};

// -----------------------------------------------------------------------------
// UMINUS
// -----------------------------------------------------------------------------
export const UMINUS: AddFunctionDescription = {
  description: _lt(`A number with the sign reversed.`),
  args: [
    arg(
      "value (number)",
      _lt("The number to have its sign reversed. Equivalently, the number to multiply by -1.")
    ),
  ],
  computeFormat: (value: PrimitiveArg) => value?.format,
  returns: ["NUMBER"],
  compute: function (value: PrimitiveArgValue): number {
    return -toNumber(value, this.locale);
  },
};

// -----------------------------------------------------------------------------
// UNARY_PERCENT
// -----------------------------------------------------------------------------
export const UNARY_PERCENT: AddFunctionDescription = {
  description: _lt(`Value interpreted as a percentage.`),
  args: [arg("percentage (number)", _lt("The value to interpret as a percentage."))],
  returns: ["NUMBER"],
  compute: function (percentage: PrimitiveArgValue): number {
    return toNumber(percentage, this.locale) / 100;
  },
};

// -----------------------------------------------------------------------------
// UPLUS
// -----------------------------------------------------------------------------
export const UPLUS: AddFunctionDescription = {
  description: _lt(`A specified number, unchanged.`),
  args: [arg("value (any)", _lt("The number to return."))],
  returns: ["ANY"],
  computeFormat: (value: PrimitiveArg) => value?.format,
  compute: function (value: PrimitiveArgValue): FunctionReturnValue {
    return value === null ? "" : value;
  },
};
