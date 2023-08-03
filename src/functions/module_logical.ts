import { _t } from "../translation";
import {
  AddFunctionDescription,
  ArgValue,
  FunctionReturnValue,
  PrimitiveArg,
  PrimitiveArgValue,
} from "../types";
import { CellErrorType } from "../types/errors";
import { arg } from "./arguments";
import { assert, conditionalVisitBoolean, toBoolean } from "./helpers";

// -----------------------------------------------------------------------------
// AND
// -----------------------------------------------------------------------------
export const AND: AddFunctionDescription = {
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
  returns: ["BOOLEAN"],
  compute: function (...logicalExpressions: ArgValue[]): boolean {
    let foundBoolean = false;
    let acc = true;
    conditionalVisitBoolean(logicalExpressions, (arg) => {
      foundBoolean = true;
      acc = acc && arg;
      return acc;
    });
    assert(() => foundBoolean, _t(`[[FUNCTION_NAME]] has no valid input data.`));
    return acc;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// FALSE
// -----------------------------------------------------------------------------
export const FALSE: AddFunctionDescription = {
  description: _t("Logical value `false`."),
  args: [],
  returns: ["BOOLEAN"],
  compute: function (): boolean {
    return false;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// IF
// -----------------------------------------------------------------------------
export const IF: AddFunctionDescription = {
  description: _t("Returns value depending on logical expression."),
  args: [
    arg(
      "logical_expression (boolean)",
      _t(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE."
      )
    ),
    arg(
      "value_if_true (any, lazy)",
      _t("The value the function returns if logical_expression is TRUE.")
    ),
    arg(
      "value_if_false (any, lazy, default=FALSE)",
      _t("The value the function returns if logical_expression is FALSE.")
    ),
  ],
  returns: ["ANY"],
  compute: function (
    logicalExpression: PrimitiveArgValue,
    valueIfTrue: () => PrimitiveArgValue,
    valueIfFalse: () => PrimitiveArgValue = () => false
  ): FunctionReturnValue {
    const result = toBoolean(logicalExpression) ? valueIfTrue() : valueIfFalse();
    return result === null || result === undefined ? "" : result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// IFERROR
// -----------------------------------------------------------------------------
export const IFERROR: AddFunctionDescription = {
  description: _t("Value if it is not an error, otherwise 2nd argument."),
  args: [
    arg("value (any, lazy)", _t("The value to return if value itself is not an error.")),
    arg(
      `value_if_error (any, lazy, default="empty")`,
      _t("The value the function returns if value is an error.")
    ),
  ],
  returns: ["ANY"],
  computeFormat: (
    value: () => PrimitiveArg,
    valueIfError: () => PrimitiveArg = () => ({ value: "" })
  ) => {
    try {
      return value().format;
    } catch (e) {
      return valueIfError()?.format;
    }
  },
  compute: function (
    value: () => PrimitiveArgValue,
    valueIfError: () => PrimitiveArgValue = () => ""
  ): FunctionReturnValue {
    let result;
    try {
      result = value();
    } catch (e) {
      result = valueIfError();
    }
    return result === null || result === undefined ? "" : result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// IFNA
// -----------------------------------------------------------------------------
export const IFNA: AddFunctionDescription = {
  description: _t("Value if it is not an #N/A error, otherwise 2nd argument."),
  args: [
    arg("value (any, lazy)", _t("The value to return if value itself is not #N/A an error.")),
    arg(
      `value_if_error (any, lazy, default="empty")`,
      _t("The value the function returns if value is an #N/A error.")
    ),
  ],
  returns: ["ANY"],
  compute: function (
    value: () => PrimitiveArgValue,
    valueIfError: () => PrimitiveArgValue = () => ""
  ): FunctionReturnValue {
    let result;
    try {
      result = value();
    } catch (e) {
      if (e.errorType === CellErrorType.NotAvailable) {
        result = valueIfError();
      } else {
        result = value();
      }
    }
    return result === null || result === undefined ? "" : result;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// IFS
// -----------------------------------------------------------------------------
export const IFS: AddFunctionDescription = {
  description: _t("Returns a value depending on multiple logical expressions."),
  args: [
    arg(
      "condition1 (boolean, lazy)",
      _t(
        "The first condition to be evaluated. This can be a boolean, a number, an array, or a reference to any of those."
      )
    ),
    arg("value1 (any, lazy)", _t("The returned value if condition1 is TRUE.")),
    arg(
      "condition2 (boolean, lazy, repeating)",
      _t("Additional conditions to be evaluated if the previous ones are FALSE.")
    ),
    arg(
      "value2 (any, lazy, repeating)",
      _t("Additional values to be returned if their corresponding conditions are TRUE.")
    ),
  ],
  returns: ["ANY"],
  compute: function (...values: (() => PrimitiveArgValue)[]): FunctionReturnValue {
    assert(
      () => values.length % 2 === 0,
      _t(`Wrong number of arguments. Expected an even number of arguments.`)
    );
    for (let n = 0; n < values.length - 1; n += 2) {
      if (toBoolean(values[n]())) {
        const returnValue = values[n + 1]();
        return returnValue !== null ? returnValue : "";
      }
    }
    throw new Error(_t(`No match.`));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// NOT
// -----------------------------------------------------------------------------
export const NOT: AddFunctionDescription = {
  description: _t("Returns opposite of provided logical value."),
  args: [
    arg(
      "logical_expression (boolean)",
      _t(
        "An expression or reference to a cell holding an expression that represents some logical value."
      )
    ),
  ],
  returns: ["BOOLEAN"],
  compute: function (logicalExpression: PrimitiveArgValue): boolean {
    return !toBoolean(logicalExpression);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// OR
// -----------------------------------------------------------------------------
export const OR: AddFunctionDescription = {
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
  returns: ["BOOLEAN"],
  compute: function (...logicalExpressions: ArgValue[]): boolean {
    let foundBoolean = false;
    let acc = false;
    conditionalVisitBoolean(logicalExpressions, (arg) => {
      foundBoolean = true;
      acc = acc || arg;
      return !acc;
    });
    assert(() => foundBoolean, _t(`[[FUNCTION_NAME]] has no valid input data.`));
    return acc;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TRUE
// -----------------------------------------------------------------------------
export const TRUE: AddFunctionDescription = {
  description: _t("Logical value `true`."),
  args: [],
  returns: ["BOOLEAN"],
  compute: function (): boolean {
    return true;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// XOR
// -----------------------------------------------------------------------------
export const XOR: AddFunctionDescription = {
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
  returns: ["BOOLEAN"],
  compute: function (...logicalExpressions: ArgValue[]): boolean {
    let foundBoolean = false;
    let acc = false;
    conditionalVisitBoolean(logicalExpressions, (arg) => {
      foundBoolean = true;
      acc = acc ? !arg : arg;
      return true; // no stop condition
    });
    assert(() => foundBoolean, _t(`[[FUNCTION_NAME]] has no valid input data.`));
    return acc;
  },
  isExported: true,
};
