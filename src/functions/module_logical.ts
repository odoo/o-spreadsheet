import { _t } from "../translation";
import { AddFunctionDescription, Arg, FunctionResultObject, Maybe } from "../types";
import { CellErrorType, EvaluationError } from "../types/errors";
import { arg } from "./arguments";
import { boolAnd, boolOr } from "./helper_logical";
import { assert, conditionalVisitBoolean, isEvaluationError, toBoolean } from "./helpers";

// -----------------------------------------------------------------------------
// AND
// -----------------------------------------------------------------------------
export const AND = {
  description: _t("Logical `and` operator."),
  args: [
    arg(
      "logical_expression1 (boolean, range<boolean>)",
      _t(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE, or an expression that can be coerced to a logical value."
      )
    ),
    arg(
      "logical_expression2 (boolean, range<boolean>, repeating)",
      _t("More expressions that represent logical values.")
    ),
  ],
  compute: function (...logicalExpressions: Arg[]): boolean {
    const { result, foundBoolean } = boolAnd(logicalExpressions);
    assert(() => foundBoolean, _t("[[FUNCTION_NAME]] has no valid input data."));
    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FALSE
// -----------------------------------------------------------------------------
export const FALSE: AddFunctionDescription = {
  description: _t("Logical value `false`."),
  args: [],
  compute: function (): boolean {
    return false;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// IF
// -----------------------------------------------------------------------------
export const IF = {
  description: _t("Returns value depending on logical expression."),
  args: [
    arg(
      "logical_expression (boolean)",
      _t(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE."
      )
    ),
    arg("value_if_true (any)", _t("The value the function returns if logical_expression is TRUE.")),
    arg(
      "value_if_false (any, default=FALSE)",
      _t("The value the function returns if logical_expression is FALSE.")
    ),
  ],
  compute: function (
    logicalExpression: Maybe<FunctionResultObject>,
    valueIfTrue: Maybe<FunctionResultObject>,
    valueIfFalse: Maybe<FunctionResultObject>
  ): FunctionResultObject {
    const result = toBoolean(logicalExpression?.value) ? valueIfTrue : valueIfFalse;
    if (result === undefined) {
      return { value: "" };
    }
    if (result.value === null) {
      result.value = "";
    }
    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// IFERROR
// -----------------------------------------------------------------------------
export const IFERROR = {
  description: _t("Value if it is not an error, otherwise 2nd argument."),
  args: [
    arg("value (any)", _t("The value to return if value itself is not an error.")),
    arg(
      `value_if_error (any, default="empty")`,
      _t("The value the function returns if value is an error.")
    ),
  ],
  compute: function (
    value: Maybe<FunctionResultObject>,
    valueIfError: Maybe<FunctionResultObject> = { value: "" }
  ): FunctionResultObject {
    const result = isEvaluationError(value?.value) ? valueIfError : value;
    if (result === undefined) {
      return { value: "" };
    }
    if (result.value === null) {
      result.value = "";
    }
    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// IFNA
// -----------------------------------------------------------------------------
export const IFNA = {
  description: _t("Value if it is not an #N/A error, otherwise 2nd argument."),
  args: [
    arg("value (any)", _t("The value to return if value itself is not #N/A an error.")),
    arg(
      `value_if_error (any, default="empty")`,
      _t("The value the function returns if value is an #N/A error.")
    ),
  ],
  compute: function (
    value: Maybe<FunctionResultObject>,
    valueIfError: Maybe<FunctionResultObject> = { value: "" }
  ): FunctionResultObject {
    const result = value?.value === CellErrorType.NotAvailable ? valueIfError : value;
    if (result === undefined) {
      return { value: "" };
    }
    if (result.value === null) {
      result.value = "";
    }
    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// IFS
// -----------------------------------------------------------------------------
export const IFS = {
  description: _t("Returns a value depending on multiple logical expressions."),
  args: [
    arg(
      "condition1 (boolean)",
      _t(
        "The first condition to be evaluated. This can be a boolean, a number, an array, or a reference to any of those."
      )
    ),
    arg("value1 (any)", _t("The returned value if condition1 is TRUE.")),
    arg(
      "condition2 (boolean, any, repeating)",
      _t("Additional conditions to be evaluated if the previous ones are FALSE.")
    ),
    arg(
      "value2 (any, repeating)",
      _t("Additional values to be returned if their corresponding conditions are TRUE.")
    ),
  ],
  compute: function (...values: Maybe<FunctionResultObject>[]): FunctionResultObject {
    assert(
      () => values.length % 2 === 0,
      _t("Wrong number of arguments. Expected an even number of arguments.")
    );
    for (let n = 0; n < values.length - 1; n += 2) {
      if (toBoolean(values[n]?.value)) {
        const result = values[n + 1];
        if (result === undefined) {
          return { value: "" };
        }
        if (result.value === null) {
          result.value = "";
        }
        return result;
      }
    }
    throw new EvaluationError(_t("No match."));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// NOT
// -----------------------------------------------------------------------------
export const NOT = {
  description: _t("Returns opposite of provided logical value."),
  args: [
    arg(
      "logical_expression (boolean)",
      _t(
        "An expression or reference to a cell holding an expression that represents some logical value."
      )
    ),
  ],
  compute: function (logicalExpression: Maybe<FunctionResultObject>): boolean {
    return !toBoolean(logicalExpression);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// OR
// -----------------------------------------------------------------------------
export const OR = {
  description: _t("Logical `or` operator."),
  args: [
    arg(
      "logical_expression1 (boolean, range<boolean>)",
      _t(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE, or an expression that can be coerced to a logical value."
      )
    ),
    arg(
      "logical_expression2 (boolean, range<boolean>, repeating)",
      _t("More expressions that evaluate to logical values.")
    ),
  ],
  compute: function (...logicalExpressions: Arg[]): boolean {
    const { result, foundBoolean } = boolOr(logicalExpressions);
    assert(() => foundBoolean, _t("[[FUNCTION_NAME]] has no valid input data."));
    return result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TRUE
// -----------------------------------------------------------------------------
export const TRUE: AddFunctionDescription = {
  description: _t("Logical value `true`."),
  args: [],
  compute: function (): boolean {
    return true;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// XOR
// -----------------------------------------------------------------------------
export const XOR = {
  description: _t("Logical `xor` operator."),
  args: [
    arg(
      "logical_expression1 (boolean, range<boolean>)",
      _t(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE, or an expression that can be coerced to a logical value."
      )
    ),
    arg(
      "logical_expression2 (boolean, range<boolean>, repeating)",
      _t("More expressions that evaluate to logical values.")
    ),
  ],
  compute: function (...logicalExpressions: Arg[]): boolean {
    let foundBoolean = false;
    let acc = false;
    conditionalVisitBoolean(logicalExpressions, (arg) => {
      foundBoolean = true;
      acc = acc ? !arg : arg;
      return true; // no stop condition
    });
    assert(() => foundBoolean, _t("[[FUNCTION_NAME]] has no valid input data."));
    return acc;
  },
  isExported: true,
} satisfies AddFunctionDescription;
