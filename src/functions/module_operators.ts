import { _t } from "../translation";
import { AddFunctionDescription, FPayload, FPayloadNumber, Maybe } from "../types";
import { CellErrorType } from "../types/errors";
import { arg } from "./arguments";
import { assert, isEvaluationError, toNumber, toString } from "./helpers";
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
  compute: function (value1: Maybe<FPayload>, value2: Maybe<FPayload>): FPayloadNumber {
    return {
      value: toNumber(value1, this.locale) + toNumber(value2, this.locale),
      format: value1?.format || value2?.format,
    };
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
  compute: function (value1: Maybe<FPayload>, value2: Maybe<FPayload>): string {
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
  compute: function (dividend: Maybe<FPayload>, divisor: Maybe<FPayload>): FPayloadNumber {
    const _divisor = toNumber(divisor, this.locale);
    assert(
      () => _divisor !== 0,
      _t("The divisor must be different from zero."),
      CellErrorType.DivisionByZero
    );
    return {
      value: toNumber(dividend, this.locale) / _divisor,
      format: dividend?.format || divisor?.format,
    };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EQ
// -----------------------------------------------------------------------------
function isEmpty(data: Maybe<FPayload>): boolean {
  return data === undefined || data.value === null;
}

const getNeutral = { number: 0, string: "", boolean: false };

export const EQ = {
  description: _t("Equal."),
  args: [
    arg("value1 (any)", _t("The first value.")),
    arg("value2 (any)", _t("The value to test against value1 for equality.")),
  ],
  compute: function (value1: Maybe<FPayload>, value2: Maybe<FPayload>): boolean {
    let _value1 = isEmpty(value1) ? getNeutral[typeof value2?.value] : value1?.value;
    let _value2 = isEmpty(value2) ? getNeutral[typeof value1?.value] : value2?.value;
    if (typeof _value1 === "string") {
      _value1 = _value1.toUpperCase();
    }
    if (typeof _value2 === "string") {
      _value2 = _value2.toUpperCase();
    }
    if (isEvaluationError(_value1)) {
      throw value1;
    }
    if (isEvaluationError(_value2)) {
      throw value2;
    }
    return _value1 === _value2;
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// GT
// -----------------------------------------------------------------------------
function applyRelationalOperator(
  value1: Maybe<FPayload>,
  value2: Maybe<FPayload>,
  cb: (v1: string | number, v2: string | number) => boolean
): boolean {
  let _value1 = isEmpty(value1) ? getNeutral[typeof value2?.value] : value1?.value;
  let _value2 = isEmpty(value2) ? getNeutral[typeof value1?.value] : value2?.value;
  if (isEvaluationError(_value1)) {
    throw value1;
  }
  if (isEvaluationError(_value2)) {
    throw value2;
  }
  if (typeof _value1 !== "number") {
    _value1 = toString(_value1).toUpperCase();
  }
  if (typeof _value2 !== "number") {
    _value2 = toString(_value2).toUpperCase();
  }
  const tV1 = typeof _value1;
  const tV2 = typeof _value2;
  if (tV1 === "string" && tV2 === "number") {
    return true;
  }
  if (tV2 === "string" && tV1 === "number") {
    return false;
  }
  return cb(_value1, _value2);
}

export const GT = {
  description: _t("Strictly greater than."),
  args: [
    arg("value1 (any)", _t("The value to test as being greater than value2.")),
    arg("value2 (any)", _t("The second value.")),
  ],
  compute: function (value1: Maybe<FPayload>, value2: Maybe<FPayload>): boolean {
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
  compute: function (value1: Maybe<FPayload>, value2: Maybe<FPayload>): boolean {
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
  compute: function (value1: Maybe<FPayload>, value2: Maybe<FPayload>): boolean {
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
  compute: function (value1: Maybe<FPayload>, value2: Maybe<FPayload>): boolean {
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
  compute: function (value1: Maybe<FPayload>, value2: Maybe<FPayload>): FPayloadNumber {
    return {
      value: toNumber(value1, this.locale) - toNumber(value2, this.locale),
      format: value1?.format || value2?.format,
    };
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
  compute: function (factor1: Maybe<FPayload>, factor2: Maybe<FPayload>): FPayloadNumber {
    return {
      value: toNumber(factor1, this.locale) * toNumber(factor2, this.locale),
      format: factor1?.format || factor2?.format,
    };
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
  compute: function (value1: Maybe<FPayload>, value2: Maybe<FPayload>): boolean {
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
  compute: function (base: Maybe<FPayload>, exponent: Maybe<FPayload>): FPayloadNumber {
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
  compute: function (value: Maybe<FPayload>): FPayloadNumber {
    return {
      value: -toNumber(value, this.locale),
      format: value?.format,
    };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// UNARY_PERCENT
// -----------------------------------------------------------------------------
export const UNARY_PERCENT = {
  description: _t("Value interpreted as a percentage."),
  args: [arg("percentage (number)", _t("The value to interpret as a percentage."))],
  compute: function (percentage: Maybe<FPayload>): number {
    return toNumber(percentage, this.locale) / 100;
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// UPLUS
// -----------------------------------------------------------------------------
export const UPLUS = {
  description: _t("A specified number, unchanged."),
  args: [arg("value (any)", _t("The number to return."))],
  compute: function (value: Maybe<FPayload> = { value: null }): FPayload {
    return value;
  },
} satisfies AddFunctionDescription;
