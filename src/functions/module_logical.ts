import { _lt } from "../translation";
import { AddFunctionDescription, Argument, ArgValue } from "../types";
import { args } from "./arguments";
import { assert, conditionalVisitBoolean, toBoolean, toNumber } from "./helpers";

// -----------------------------------------------------------------------------
// WAIT
// -----------------------------------------------------------------------------
export const WAIT: AddFunctionDescription = {
  description: _lt("Wait"),
  args: args(`ms (number) ${_lt("wait time in milliseconds")}`),
  returns: ["ANY"],
  async: true,
  compute: function (delay: ArgValue) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve(delay);
      }, toNumber(delay));
    });
  },
};

// -----------------------------------------------------------------------------
// AND
// -----------------------------------------------------------------------------
export const AND: AddFunctionDescription = {
  description: _lt("Logical `and` operator."),
  args: args(`
      logical_expression1 (boolean, range<boolean>) ${_lt(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE, or an expression that can be coerced to a logical value."
      )}
      logical_expression1 (boolean, range<boolean>, repeating) ${_lt(
        "More expressions that represent logical values."
      )}
    `),
  returns: ["BOOLEAN"],
  compute: function (...logicalExpressions: Argument[]): boolean {
    let foundBoolean = false;
    let acc = true;
    conditionalVisitBoolean(logicalExpressions, (arg) => {
      foundBoolean = true;
      acc = acc && arg;
      return acc;
    });
    assert(() => foundBoolean, _lt(`[[FUNCTION_NAME]] has no valid input data.`));
    return acc;
  },
};

// -----------------------------------------------------------------------------
// IF
// -----------------------------------------------------------------------------
export const IF: AddFunctionDescription = {
  description: _lt("Returns value depending on logical expression."),
  args: args(`
      logical_expression (boolean) ${_lt(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE."
      )}
      value_if_true (any, lazy) ${_lt(
        "The value the function returns if logical_expression is TRUE."
      )}
      value_if_false (any, lazy, default=FALSE) ${_lt(
        "The value the function returns if logical_expression is FALSE."
      )}
    `),
  returns: ["ANY"],
  compute: function (
    logicalExpression: ArgValue,
    valueIfTrue: () => ArgValue,
    valueIfFalse: () => ArgValue = () => false
  ): ArgValue {
    const result = toBoolean(logicalExpression) ? valueIfTrue() : valueIfFalse();
    return result === null || result === undefined ? "" : result;
  },
};

// -----------------------------------------------------------------------------
// IFERROR
// -----------------------------------------------------------------------------
export const IFERROR: AddFunctionDescription = {
  description: _lt("Value if it is not an error, otherwise 2nd argument."),
  args: args(`
    value (any, lazy) ${_lt("The value to return if value itself is not an error.")}
    value_if_error (any, lazy, default=${_lt("An empty value")}) ${_lt(
    "The value the function returns if value is an error."
  )}
  `),
  returns: ["ANY"],
  compute: function (value: () => ArgValue, valueIfError: () => ArgValue = () => ""): ArgValue {
    let result;
    try {
      result = value();
    } catch (e) {
      result = valueIfError();
    }
    return result === null || result === undefined ? "" : result;
  },
};

// -----------------------------------------------------------------------------
// IFS
// -----------------------------------------------------------------------------
export const IFS: AddFunctionDescription = {
  description: _lt("Returns a value depending on multiple logical expressions."),
  args: args(`
      condition1 (boolean, lazy) ${_lt(
        "The first condition to be evaluated. This can be a boolean, a number, an array, or a reference to any of those."
      )}
      value1 (any, lazy) ${_lt("The returned value if condition1 is TRUE.")}
      condition2 (boolean, lazy, repeating) ${_lt(
        "Additional conditions to be evaluated if the previous ones are FALSE."
      )}
      value2 (any, lazy, repeating) ${_lt(
        "Additional values to be returned if their corresponding conditions are TRUE."
      )}
  `),
  returns: ["ANY"],
  compute: function (...values: (() => ArgValue)[]): ArgValue {
    assert(
      () => values.length % 2 === 0,
      _lt(`Wrong number of arguments. Expected an even number of arguments.`)
    );
    for (let n = 0; n < values.length - 1; n += 2) {
      if (toBoolean(values[n]())) {
        return values[n + 1]();
      }
    }
    throw new Error(_lt(`No match.`));
  },
};

// -----------------------------------------------------------------------------
// NOT
// -----------------------------------------------------------------------------
export const NOT: AddFunctionDescription = {
  description: _lt("Returns opposite of provided logical value."),
  args: args(
    `logical_expression (boolean) ${_lt(
      "An expression or reference to a cell holding an expression that represents some logical value."
    )}
    `
  ),
  returns: ["BOOLEAN"],
  compute: function (logicalExpression: ArgValue): boolean {
    return !toBoolean(logicalExpression);
  },
};

// -----------------------------------------------------------------------------
// OR
// -----------------------------------------------------------------------------
export const OR: AddFunctionDescription = {
  description: _lt("Logical `or` operator."),
  args: args(`
      logical_expression1 (boolean, range<boolean>) ${_lt(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE, or an expression that can be coerced to a logical value."
      )}
      logical_expression2 (boolean, range<boolean>, repeating) ${_lt(
        "More expressions that evaluate to logical values."
      )}
    `),
  returns: ["BOOLEAN"],
  compute: function (...logicalExpressions: Argument[]): boolean {
    let foundBoolean = false;
    let acc = false;
    conditionalVisitBoolean(logicalExpressions, (arg) => {
      foundBoolean = true;
      acc = acc || arg;
      return !acc;
    });
    assert(() => foundBoolean, _lt(`[[FUNCTION_NAME]] has no valid input data.`));
    return acc;
  },
};

// -----------------------------------------------------------------------------
// XOR
// -----------------------------------------------------------------------------
export const XOR: AddFunctionDescription = {
  description: _lt("Logical `xor` operator."),
  args: args(`
      logical_expression1 (boolean, range<boolean>) ${_lt(
        "An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE, or an expression that can be coerced to a logical value."
      )}
      logical_expression2 (boolean, range<boolean>, repeating) ${_lt(
        "More expressions that evaluate to logical values."
      )}
    `),
  returns: ["BOOLEAN"],
  compute: function (...logicalExpressions: Argument[]): boolean {
    let foundBoolean = false;
    let acc = false;
    conditionalVisitBoolean(logicalExpressions, (arg) => {
      foundBoolean = true;
      acc = acc ? !arg : arg;
      return true; // no stop condition
    });
    assert(() => foundBoolean, _lt(`[[FUNCTION_NAME]] has no valid input data.`));
    return acc;
  },
};
