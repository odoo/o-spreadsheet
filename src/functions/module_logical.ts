import { args } from "./arguments";
import { toBoolean, visitBooleans } from "./helpers";
import { AddFunctionDescription } from "../types";
import { _lt } from "../translation";

// -----------------------------------------------------------------------------
// WAIT
// -----------------------------------------------------------------------------
export const WAIT: AddFunctionDescription = {
  description: _lt("Wait"),
  args: args(`ms (number) ${_lt("wait time in milliseconds")}`),
  returns: ["ANY"],
  async: true,
  compute: function (delay) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve(delay);
      }, delay);
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
      logical_expression1 (boolean, range<boolean>, optional, repeating) ${_lt(
        "More expressions that represent logical values."
      )}
    `),
  returns: ["BOOLEAN"],
  compute: function (): boolean {
    let result = true;
    let foundBoolean = false;
    visitBooleans(arguments, (b) => {
      result = result && b;
      foundBoolean = true;
      return result;
    });
    if (!foundBoolean) {
      throw new Error(_lt(`[[FUNCTION_NAME]] has no valid input data.`));
    }
    return result;
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
      value_if_false (any, lazy, optional, default=FALSE) ${_lt(
        "The value the function returns if logical_expression is FALSE."
      )}
    `),
  returns: ["ANY"],
  compute: function (
    logicalExpression: any,
    valueIfTrue: () => any,
    valueIfFalse: () => any = () => false
  ): any {
    const result = toBoolean(logicalExpression) ? valueIfTrue() : valueIfFalse();
    return result === null ? "" : result;
  },
};

// -----------------------------------------------------------------------------
// IFERROR
// -----------------------------------------------------------------------------
export const IFERROR: AddFunctionDescription = {
  description: _lt("Value if it is not an error, otherwise 2nd argument."),
  args: args(`
    value (any, lazy) ${_lt("The value to return if value itself is not an error.")}
    value_if_error (any, lazy, optional, default="") ${_lt(
      "The value the function returns if value is an error."
    )}
  `),
  returns: ["ANY"],
  compute: function (value: () => any, valueIfError: () => any = () => ""): any {
    let result;
    try {
      result = value();
    } catch (e) {
      result = valueIfError();
    }
    return result === null ? "" : result;
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
      condition2 (boolean, lazy, optional, repeating) ${_lt(
        "Additional conditions to be evaluated if the previous ones are FALSE."
      )}
      value2 (any, lazy, optional, repeating) ${_lt(
        "Additional values to be returned if their corresponding conditions are TRUE."
      )}
  `),
  returns: ["ANY"],
  compute: function (): any {
    if (arguments.length % 2 === 1) {
      throw new Error(_lt(`Wrong number of arguments. Expected an even number of arguments.`));
    }
    for (let n = 0; n < arguments.length - 1; n += 2) {
      if (toBoolean(arguments[n]())) {
        return arguments[n + 1]();
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
  compute: function (logicalExpression: any): boolean {
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
      logical_expression2 (boolean, range<boolean>, optional, repeating) ${_lt(
        "More expressions that evaluate to logical values."
      )}
    `),
  returns: ["BOOLEAN"],
  compute: function (): boolean {
    let result = false;
    let foundBoolean = false;
    visitBooleans(arguments, (b) => {
      result = result || b;
      foundBoolean = true;
      return !result;
    });
    if (!foundBoolean) {
      throw new Error(_lt(`[[FUNCTION_NAME]] has no valid input data.`));
    }
    return result;
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
      logical_expression2 (boolean, range<boolean>, optional, repeating) ${_lt(
        "More expressions that evaluate to logical values."
      )}
    `),
  returns: ["BOOLEAN"],
  compute: function (): boolean {
    let result = false;
    let foundBoolean = false;
    visitBooleans(arguments, (b) => {
      result = result ? !b : b;
      foundBoolean = true;
      return true;
    });
    if (!foundBoolean) {
      throw new Error(_lt(`[[FUNCTION_NAME]] has no valid input data.`));
    }
    return result;
  },
};
