import { args } from "./arguments";
import { FunctionDescription } from "../types";
import { toNumber, toString, typeNumber, numberValue } from "./helpers";
import { POWER } from "./module_math";
import { InternalDate } from "../helpers/index";
import { _lt } from "../translation";

// -----------------------------------------------------------------------------
// ADD
// -----------------------------------------------------------------------------
export const ADD: FunctionDescription = {
  description: _lt(`Sum of two numbers.`),
  args: args(`
      value1 (number) ${_lt("The first addend.")}
      value2 (number) ${_lt("The second addend.")}
    `),
  returns: ["NUMBER"],
  compute: function (value1: any, value2: any): number | InternalDate {
    let format1 = value1 ? value1.format : null;
    let format2 = value2 ? value2.format : null;
    if ((format1 && !format2) || (format2 && !format1)) {
      return {
        value: toNumber(value1) + toNumber(value2),
        format: format1 || format2,
      };
    }
    return toNumber(value1) + toNumber(value2);
  },
};

// -----------------------------------------------------------------------------
// CONCAT
// -----------------------------------------------------------------------------
export const CONCAT: FunctionDescription = {
  description: _lt(`Concatenation of two values.`),
  args: args(`
      value1 (string) ${_lt("The value to which value2 will be appended.")}
      value2 (string) ${_lt("The value to append to value1.")}
    `),
  returns: ["STRING"],
  compute: function (value1: any, value2: any): string {
    return toString(value1) + toString(value2);
  },
};

// -----------------------------------------------------------------------------
// DIVIDE
// -----------------------------------------------------------------------------
export const DIVIDE: FunctionDescription = {
  description: _lt(`One number divided by another.`),
  args: args(`
      dividend (number) ${_lt("The number to be divided.")}
      divisor (number) ${_lt("The number to divide by.")}
    `),
  returns: ["NUMBER"],
  compute: function (dividend: any, divisor: any): number {
    const _divisor = toNumber(divisor);
    if (_divisor === 0) {
      throw new Error(_lt("Function DIVIDE parameter 2 cannot be zero."));
    }
    return toNumber(dividend) / _divisor;
  },
};

// -----------------------------------------------------------------------------
// EQ
// -----------------------------------------------------------------------------
function isEmpty(value: any): boolean {
  return value === null || value === undefined;
}

const getNeutral = { number: 0, string: "", boolean: false };

export const EQ: FunctionDescription = {
  description: _lt(`Equal.`),
  args: args(`
      value1 (any) ${_lt("The first value.")}
      value2 (any) ${_lt("The value to test against value1 for equality.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: any, value2: any): boolean {
    let v1 = typeNumber(value1) ? numberValue(value1) : value1;
    let v2 = typeNumber(value2) ? numberValue(value2) : value2;

    v1 = isEmpty(v1) ? getNeutral[typeof v2] : v1;
    v2 = isEmpty(v2) ? getNeutral[typeof v1] : v2;
    if (typeof v1 === "string") {
      v1 = v1.toUpperCase();
    }
    if (typeof v2 === "string") {
      v2 = v2.toUpperCase();
    }
    return v1 === v2;
  },
};

// -----------------------------------------------------------------------------
// GT
// -----------------------------------------------------------------------------
function applyRelationalOperator(
  value1: any,
  value2: any,
  cb: (v1: any, v2: any) => boolean
): boolean {
  let v1 = typeNumber(value1) ? numberValue(value1) : value1;
  let v2 = typeNumber(value2) ? numberValue(value2) : value2;
  v1 = isEmpty(v1) ? getNeutral[typeof v2] : v1;
  v2 = isEmpty(v2) ? getNeutral[typeof v1] : v2;
  if (typeof v1 !== "number") {
    v1 = toString(v1).toUpperCase();
  }
  if (typeof v2 !== "number") {
    v2 = toString(v2).toUpperCase();
  }
  const tV1 = typeof v1;
  const tV2 = typeof v2;
  if (tV1 === "string" && tV2 === "number") {
    return true;
  }
  if (tV2 === "string" && tV1 === "number") {
    return false;
  }
  return cb(v1, v2);
}

export const GT: FunctionDescription = {
  description: _lt(`Strictly greater than.`),
  args: args(`
      value1 (any) ${_lt("The value to test as being greater than value2.")}
      value2 (any) ${_lt("The second value.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: any, value2: any): boolean {
    return applyRelationalOperator(value1, value2, (v1, v2) => {
      return v1 > v2;
    });
  },
};

// -----------------------------------------------------------------------------
// GTE
// -----------------------------------------------------------------------------
export const GTE: FunctionDescription = {
  description: _lt(`Greater than or equal to.`),
  args: args(`
      value1 (any) ${_lt("The value to test as being greater than or equal to value2.")}
      value2 (any) ${_lt("The second value.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: any, value2: any): boolean {
    return applyRelationalOperator(value1, value2, (v1, v2) => {
      return v1 >= v2;
    });
  },
};

// -----------------------------------------------------------------------------
// LT
// -----------------------------------------------------------------------------
export const LT: FunctionDescription = {
  description: _lt(`Less than.`),
  args: args(`
      value1 (any) ${_lt("The value to test as being less than value2.")}
      value2 (any) ${_lt("The second value.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: any, value2: any): boolean {
    return !GTE.compute(value1, value2);
  },
};

// -----------------------------------------------------------------------------
// LTE
// -----------------------------------------------------------------------------
export const LTE: FunctionDescription = {
  description: _lt(`Less than or equal to.`),
  args: args(`
      value1 (any) ${_lt("The value to test as being less than or equal to value2.")}
      value2 (any) ${_lt("The second value.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: any, value2: any): boolean {
    return !GT.compute(value1, value2);
  },
};

// -----------------------------------------------------------------------------
// MINUS
// -----------------------------------------------------------------------------
export const MINUS: FunctionDescription = {
  description: _lt(`Difference of two numbers.`),
  args: args(`
      value1 (number) ${_lt("The minuend, or number to be subtracted from.")}
      value2 (number) ${_lt("The subtrahend, or number to subtract from value1.")}
    `),
  returns: ["NUMBER"],
  compute: function (value1: any, value2: any): number | InternalDate {
    let format1 = value1 ? value1.format : null;
    let format2 = value2 ? value2.format : null;
    if ((format1 && !format2) || (format2 && !format1)) {
      return {
        value: toNumber(value1) - toNumber(value2),
        format: format1 || format2,
      };
    }
    return toNumber(value1) - toNumber(value2);
  },
};

// -----------------------------------------------------------------------------
// MULTIPLY
// -----------------------------------------------------------------------------
export const MULTIPLY: FunctionDescription = {
  description: _lt(`Product of two numbers`),
  args: args(`
      factor1 (number) ${_lt("The first multiplicand.")}
      factor2 (number) ${_lt("The second multiplicand.")}
    `),
  returns: ["NUMBER"],
  compute: function (factor1: any, factor2: any): number {
    return toNumber(factor1) * toNumber(factor2);
  },
};

// -----------------------------------------------------------------------------
// NE
// -----------------------------------------------------------------------------
export const NE: FunctionDescription = {
  description: _lt(`Not equal.`),
  args: args(`
      value1 (any) ${_lt("The first value.")}
      value2 (any) ${_lt("The value to test against value1 for inequality.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (value1: any, value2: any): boolean {
    return !EQ.compute(value1, value2);
  },
};

// -----------------------------------------------------------------------------
// POW
// -----------------------------------------------------------------------------
export const POW: FunctionDescription = {
  description: _lt(`A number raised to a power.`),
  args: args(`
      base (number) ${_lt("The number to raise to the exponent power.")}
      exponent (number) ${_lt("The exponent to raise base to.")}
    `),
  returns: ["BOOLEAN"],
  compute: function (base: any, exponent: any): number {
    return POWER.compute(base, exponent);
  },
};

// -----------------------------------------------------------------------------
// UMINUS
// -----------------------------------------------------------------------------
export const UMINUS: FunctionDescription = {
  description: _lt(`A number with the sign reversed.`),
  args: args(`
      value (number) ${_lt(
        "The number to have its sign reversed. Equivalently, the number to multiply by -1."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (value: any): number {
    return -toNumber(value);
  },
};

// -----------------------------------------------------------------------------
// UNARY_PERCENT
// -----------------------------------------------------------------------------
export const UNARY_PERCENT: FunctionDescription = {
  description: _lt(`Value interpreted as a percentage.`),
  args: args(`
      percentage (number) ${_lt("The value to interpret as a percentage.")}
    `),
  returns: ["NUMBER"],
  compute: function (percentage: any): number {
    return toNumber(percentage) / 100;
  },
};

// -----------------------------------------------------------------------------
// UPLUS
// -----------------------------------------------------------------------------
export const UPLUS: FunctionDescription = {
  description: _lt(`A specified number, unchanged.`),
  args: args(`
      value (any) ${_lt("The number to return.")}
    `),
  returns: ["ANY"],
  compute: function (value: any): any {
    return value;
  },
};
