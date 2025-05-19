import { _t } from "../translation";
import { AddFunctionDescription, Arg, FunctionResultObject, isMatrix, Maybe } from "../types";
import { CellErrorType, EvaluationError } from "../types/errors";
import { arg } from "./arguments";
import { boolAnd, boolOr } from "./helper_logical";
import { isMultipleElementMatrix, toScalar } from "./helper_matrices";
import {
  applyVectorization,
  assert,
  conditionalVisitBoolean,
  isEvaluationError,
  toBoolean,
  valueNotAvailable,
} from "./helpers";

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
      "logical_expression (boolean, range<boolean>)",
      _t(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE."
      )
    ),
    arg(
      "value_if_true (any, range)",
      _t("The value the function returns if logical_expression is TRUE.")
    ),
    arg(
      "value_if_false (any, range, default=FALSE)",
      _t("The value the function returns if logical_expression is FALSE.")
    ),
  ],
  compute: function (logicalExpression: Arg, valueIfTrue: Arg, valueIfFalse: Arg) {
    if (isMultipleElementMatrix(logicalExpression)) {
      return applyVectorization(IF.compute, [logicalExpression, valueIfTrue, valueIfFalse]);
    }
    let result = toBoolean(toScalar(logicalExpression)) ? valueIfTrue : valueIfFalse;
    // useful for interpreting empty cell references as empty strings. But must be removed to make empty cell references equal to zero
    if (!isMultipleElementMatrix(result)) {
      result = toScalar(result);
    }
    if (result === undefined) {
      return { value: "" };
    }
    if (!isMatrix(result) && result.value === null) {
      return { ...result, value: "" };
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
    arg("value (any, range)", _t("The value to return if value itself is not an error.")),
    arg(
      `value_if_error (any, range, default="empty")`,
      _t("The value the function returns if value is an error.")
    ),
  ],
  compute: function (value: Arg, valueIfError: Arg) {
    if (isMultipleElementMatrix(value)) {
      return applyVectorization(IFERROR.compute, [value, valueIfError]);
    }
    let result = isEvaluationError(toScalar(value)?.value) ? valueIfError : value;
    // useful for interpreting empty cell references as empty strings. But must be removed to make empty cell references equal to zero
    if (!isMultipleElementMatrix(result)) {
      result = toScalar(result);
    }
    if (result === undefined) {
      return { value: "" };
    }
    if (!isMatrix(result) && result.value === null) {
      return { ...result, value: "" };
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
    arg("value (any, range)", _t("The value to return if value itself is not #N/A an error.")),
    arg(
      `value_if_error (any, range, default="empty")`,
      _t("The value the function returns if value is an #N/A error.")
    ),
  ],
  compute: function (value: Arg, valueIfError: Arg) {
    if (isMultipleElementMatrix(value)) {
      return applyVectorization(IFNA.compute, [value, valueIfError]);
    }
    let result = toScalar(value)?.value === CellErrorType.NotAvailable ? valueIfError : value;
    // useful for interpreting empty cell references as empty strings. But must be removed to make empty cell references equal to zero
    if (!isMultipleElementMatrix(result)) {
      result = toScalar(result);
    }
    if (result === undefined) {
      return { value: "" };
    }
    if (!isMatrix(result) && result.value === null) {
      return { ...result, value: "" };
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
      "condition1 (boolean, range<boolean>)",
      _t(
        "The first condition to be evaluated. This can be a boolean, a number, an array, or a reference to any of those."
      )
    ),
    arg("value1 (any, range)", _t("The returned value if condition1 is TRUE.")),
    arg(
      "condition2 (boolean, any, range, repeating)",
      _t("Additional conditions to be evaluated if the previous ones are FALSE.")
    ),
    arg(
      "value2 (any, range, repeating)",
      _t("Additional values to be returned if their corresponding conditions are TRUE.")
    ),
  ],
  compute: function (...values: Arg[]) {
    assert(
      () => values.length % 2 === 0,
      _t("Wrong number of arguments. Expected an even number of arguments.")
    );
    while (values.length > 0) {
      if (isMultipleElementMatrix(values[0])) {
        return applyVectorization(IFS.compute, values);
      }
      const condition = toBoolean(toScalar(values.shift()));
      let valueIfTrue = values.shift();
      if (condition) {
        // useful for interpreting empty cell references as empty strings. But must be removed to make empty cell references equal to zero
        if (!isMultipleElementMatrix(valueIfTrue)) {
          valueIfTrue = toScalar(valueIfTrue);
        }
        if (valueIfTrue === undefined) {
          return { value: "" };
        }
        if (!isMatrix(valueIfTrue) && valueIfTrue.value === null) {
          return { ...valueIfTrue, value: "" };
        }
        return valueIfTrue;
      }
    }
    return new EvaluationError(_t("No match."));
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
// SWITCH
// -----------------------------------------------------------------------------

export const SWITCH = {
  description: _t("Returns a value by comparing cases to an expression."),
  args: [
    arg("expression (number, boolean, string)", _t("The value to be checked.")),
    arg("case1 (number, boolean, string)", _t("The first case to be checked against expression.")),
    arg("value1 (any)", _t("The corresponding value to be returned if case1 matches expression.")),
    arg(
      "case2 (any, repeating)",
      _t("Additional cases to try if the previous ones don't match expression.")
    ),
    arg(
      "value2 (any, repeating)",
      _t("Additional values to be returned if their corresponding cases match expression.")
    ),
    arg(
      `default (any, default="empty")`,
      _t("An optional default value to be returned if none of the cases match expression.")
    ),
  ],
  compute: function (
    expression: Maybe<FunctionResultObject>,
    ...casesAndValues: Maybe<FunctionResultObject>[]
  ): FunctionResultObject {
    const defaultValue =
      casesAndValues.length % 2 === 0 ? valueNotAvailable(expression) : casesAndValues.pop();

    for (let i = 0; i < casesAndValues.length; i += 2) {
      const iCase = casesAndValues[i];

      if (iCase && isEvaluationError(iCase.value)) {
        return iCase;
      }

      if (expression?.value === iCase?.value) {
        return casesAndValues[i + 1] || { value: 0 };
      }
    }

    return defaultValue || { value: 0 };
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
