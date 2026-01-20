import { _t } from "../translation";
import { DivisionByZeroError, EvaluationError, InvalidReferenceError } from "../types/errors";
import { AddFunctionDescription } from "../types/functions";
import { Arg, FunctionResultObject, Maybe } from "../types/misc";
import { arg } from "./arguments";
import { MimicMatrix, toMimicMatrix } from "./helper_arg";
import { expectReferenceError, isEvaluationError, toNumber, toString } from "./helpers";
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
  compute: function (value1: Maybe<FunctionResultObject>, value2: Maybe<FunctionResultObject>) {
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
  compute: function (
    value1: Maybe<FunctionResultObject>,
    value2: Maybe<FunctionResultObject>
  ): { value: string } {
    return { value: toString(value1) + toString(value2) };
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
  compute: function (dividend: Maybe<FunctionResultObject>, divisor: Maybe<FunctionResultObject>) {
    const _divisor = toNumber(divisor, this.locale);
    if (_divisor === 0) {
      return new DivisionByZeroError(_t("The divisor must be different from zero."));
    }
    return {
      value: toNumber(dividend, this.locale) / _divisor,
      format: dividend?.format || divisor?.format,
    };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EQ
// -----------------------------------------------------------------------------
function isEmpty(data: Maybe<FunctionResultObject>): boolean {
  return data === undefined || data.value === null;
}

const getNeutral = { number: 0, string: "", boolean: false };

function areAlmostEqual(value1: number, value2: number, epsilon: number = 2e-16): boolean {
  return Math.abs(value1 - value2) < epsilon;
}

export const EQ = {
  description: _t("Equal."),
  args: [
    arg("value1 (string, number, boolean)", _t("The first value.")),
    arg("value2 (string, number, boolean)", _t("The value to test against value1 for equality.")),
  ],
  compute: function (value1: Maybe<FunctionResultObject>, value2: Maybe<FunctionResultObject>) {
    if (isEvaluationError(value1?.value)) {
      return value1;
    }
    if (isEvaluationError(value2?.value)) {
      return value2;
    }
    let _value1 = isEmpty(value1) ? getNeutral[typeof value2?.value] : value1?.value;
    let _value2 = isEmpty(value2) ? getNeutral[typeof value1?.value] : value2?.value;
    if (typeof _value1 === "string") {
      _value1 = _value1.toUpperCase();
    }
    if (typeof _value2 === "string") {
      _value2 = _value2.toUpperCase();
    }
    if (typeof _value1 === "number" && typeof _value2 === "number") {
      return { value: areAlmostEqual(_value1, _value2) };
    }
    return { value: _value1 === _value2 };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// GT
// -----------------------------------------------------------------------------
function applyRelationalOperator(
  value1: Maybe<FunctionResultObject>,
  value2: Maybe<FunctionResultObject>,
  cb: (v1: string | number, v2: string | number) => boolean
): FunctionResultObject {
  if (isEvaluationError(value1?.value)) {
    return value1;
  }
  if (isEvaluationError(value2?.value)) {
    return value2;
  }
  let _value1 = isEmpty(value1) ? getNeutral[typeof value2?.value] : value1?.value;
  let _value2 = isEmpty(value2) ? getNeutral[typeof value1?.value] : value2?.value;
  if (typeof _value1 !== "number") {
    _value1 = toString(_value1).toUpperCase();
  }
  if (typeof _value2 !== "number") {
    _value2 = toString(_value2).toUpperCase();
  }
  const tV1 = typeof _value1;
  const tV2 = typeof _value2;
  if (tV1 === "string" && tV2 === "number") {
    return { value: true };
  }
  if (tV2 === "string" && tV1 === "number") {
    return { value: false };
  }
  return { value: cb(_value1, _value2) };
}

export const GT = {
  description: _t("Strictly greater than."),
  args: [
    arg("value1 (number, string, boolean)", _t("The value to test as being greater than value2.")),
    arg("value2 (number, string, boolean)", _t("The second value.")),
  ],
  compute: function (value1: Maybe<FunctionResultObject>, value2: Maybe<FunctionResultObject>) {
    return applyRelationalOperator(value1, value2, (v1, v2) => {
      if (typeof v1 === "number" && typeof v2 === "number") {
        return !areAlmostEqual(v1, v2) && v1 > v2;
      }
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
    arg(
      "value1 (number, string, boolean)",
      _t("The value to test as being greater than or equal to value2.")
    ),
    arg("value2 (number, string, boolean)", _t("The second value.")),
  ],
  compute: function (value1: Maybe<FunctionResultObject>, value2: Maybe<FunctionResultObject>) {
    return applyRelationalOperator(value1, value2, (v1, v2) => {
      if (typeof v1 === "number" && typeof v2 === "number") {
        return areAlmostEqual(v1, v2) || v1 > v2;
      }
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
    arg("value1 (number, string, boolean)", _t("The value to test as being less than value2.")),
    arg("value2 (number, string, boolean)", _t("The second value.")),
  ],
  compute: function (value1: Maybe<FunctionResultObject>, value2: Maybe<FunctionResultObject>) {
    const result = GTE.compute.bind(this)(value1, value2);
    if (isEvaluationError(result.value)) {
      return result;
    }
    return { value: !result.value };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// LTE
// -----------------------------------------------------------------------------
export const LTE = {
  description: _t("Less than or equal to."),
  args: [
    arg(
      "value1 (number, string, boolean)",
      _t("The value to test as being less than or equal to value2.")
    ),
    arg("value2 (number, string, boolean)", _t("The second value.")),
  ],
  compute: function (value1: Maybe<FunctionResultObject>, value2: Maybe<FunctionResultObject>) {
    const result = GT.compute.bind(this)(value1, value2);
    if (isEvaluationError(result.value)) {
      return result;
    }
    return { value: !result.value };
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
  compute: function (value1: Maybe<FunctionResultObject>, value2: Maybe<FunctionResultObject>) {
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
  compute: function (factor1: Maybe<FunctionResultObject>, factor2: Maybe<FunctionResultObject>) {
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
    arg("value1 (string, number, boolean)", _t("The first value.")),
    arg("value2 (string, number, boolean)", _t("The value to test against value1 for inequality.")),
  ],
  compute: function (value1: Maybe<FunctionResultObject>, value2: Maybe<FunctionResultObject>) {
    const result = EQ.compute.bind(this)(value1, value2);
    if (isEvaluationError(result.value)) {
      return result;
    }
    return { value: !result.value };
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
  compute: function (base: Maybe<FunctionResultObject>, exponent: Maybe<FunctionResultObject>) {
    return POWER.compute.bind(this)(base, exponent);
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SPILLED_RANGE
// -----------------------------------------------------------------------------

/**
 * Internal formula implementing the # operator.
 * It allows to get the spilled range of an array formula from any reference, including
 * references returned by other functions.
 * e.g. =IF(condition, A1, H10)#
 **/
export const SPILLED_RANGE = {
  description: _t("Gets the spilled range of an array formula."),
  args: [arg("ref (any, range<any>)", _t("The reference to get the spilled range from."))],
  compute: function (ref: Arg) {
    if (ref === undefined) {
      return new InvalidReferenceError(expectReferenceError);
    }

    const _ref = toMimicMatrix(ref);
    if (!_ref.isSingleElement()) {
      return new EvaluationError(
        _t("Only single-cell references are allowed to get the spilled range.")
      );
    }
    const firstCell = _ref.get(0, 0);

    if (isEvaluationError(firstCell.value)) {
      return firstCell;
    }

    if (firstCell.position === undefined) {
      return new InvalidReferenceError(expectReferenceError);
    }

    const spilledZone = this.getters.getSpreadZone(firstCell.position);
    if (spilledZone === undefined) {
      return new InvalidReferenceError();
    }

    // TO DO: see to use directly the'range' function from compilation_parameters
    // to benefit from its caching system instead of creating a new MimicMatrix here
    return new MimicMatrix(
      spilledZone.right - spilledZone.left + 1,
      spilledZone.bottom - spilledZone.top + 1,
      (col: number, row: number): FunctionResultObject =>
        this.getRef({
          sheetId: this.__originSheetId,
          col: spilledZone.left + col,
          row: spilledZone.top + row,
        })
    );
  },
  hidden: true,
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
  compute: function (value: Maybe<FunctionResultObject>) {
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
  compute: function (percentage: Maybe<FunctionResultObject>) {
    return { value: toNumber(percentage, this.locale) / 100 };
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// UPLUS
// -----------------------------------------------------------------------------
export const UPLUS = {
  description: _t("A specified number, unchanged."),
  args: [arg("value (any)", _t("The number to return."))],
  compute: function (value: Maybe<FunctionResultObject> = { value: null }) {
    return value;
  },
} satisfies AddFunctionDescription;
