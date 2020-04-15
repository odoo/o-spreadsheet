import { args } from "./arguments";
import { toBoolean, visitBooleans } from "./helpers";
import { FunctionDescription } from "./index";

// -----------------------------------------------------------------------------
// WAIT
// -----------------------------------------------------------------------------
export const WAIT: FunctionDescription = {
  description: "Wait",
  args: args`ms (number) wait time in milliseconds`,
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
export const AND: FunctionDescription = {
  description: "Logical `and` operator.",
  args: args`
      logical_expression1 (boolean, range<boolean>) An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE, or an expression that can be coerced to a logical value.
      logical_expression1 (boolean, range<boolean>, optional, repeating) More expressions that represent logical values.
    `,
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
      throw new Error(`AND has no valid input data.`);
    }
    return result;
  },
};

// -----------------------------------------------------------------------------
// IF
// -----------------------------------------------------------------------------
export const IF: FunctionDescription = {
  description: "Returns value depending on logical expression.",
  args: args`
      logical_expression (boolean) An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE.
      value_if_true (any) The value the function returns if logical_expression is TRUE.
      value_if_false (any, optional, default=FALSE) The value the function returns if logical_expression is FALSE.
    `,
  returns: ["ANY"],
  compute: function (
    logical_expression: any,
    value_if_true: any,
    value_if_false: any = false
  ): any {
    const result = toBoolean(logical_expression) ? value_if_true : value_if_false;
    return result === null ? "" : result;
  },
};

// -----------------------------------------------------------------------------
// IFS
// -----------------------------------------------------------------------------
export const IFS: FunctionDescription = {
  description: "Returns a value depending on multiple logical expressions.",
  args: args`
      condition1 (boolean) The first condition to be evaluated. This can be a boolean, a number, an array, or a reference to any of those.
      value1 (any) The returned value if condition1 is TRUE.
      additional_values (any, optional, repeating) Additional conditions and values to be evaluated if the previous ones are FALSE.
    `,
  // @compatibility: on google sheets, args definitions are next:
  // condition1 (boolean) The first condition to be evaluated. This can be a boolean, a number, an array, or a reference to any of those.
  // value1 (any) The returned value if condition1 is TRUE.
  // condition2 (boolean, optional, repeating) Additional conditions to be evaluated if the previous ones are FALSE.
  // value2 (any, optional, repeating) Additional values to be returned if their corresponding conditions are TRUE.
  returns: ["ANY"],
  compute: function (): any {
    if (arguments.length % 2 === 1) {
      throw new Error(`
          Wrong number of arguments. Expected an even number of arguments.
      `);
    }
    for (let n = 0; n < arguments.length - 1; n += 2) {
      if (toBoolean(arguments[n])) {
        return arguments[n + 1];
      }
    }
    throw new Error(`No match.`);
  },
};

// -----------------------------------------------------------------------------
// NOT
// -----------------------------------------------------------------------------
export const NOT: FunctionDescription = {
  description: "Returns opposite of provided logical value.",
  args: args`logical_expression (boolean) An expression or reference to a cell holding an expression that represents some logical value.`,
  returns: ["BOOLEAN"],
  compute: function (logical_expression: any): boolean {
    return !toBoolean(logical_expression);
  },
};

// -----------------------------------------------------------------------------
// OR
// -----------------------------------------------------------------------------
export const OR: FunctionDescription = {
  description: "Logical `or` operator.",
  args: args`
      logical_expression1 (boolean, range<boolean>) An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE, or an expression that can be coerced to a logical value.
      logical_expression2 (boolean, range<boolean>, optional, repeating) More expressions that evaluate to logical values.
    `,
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
      throw new Error(`OR has no valid input data.`);
    }
    return result;
  },
};

// -----------------------------------------------------------------------------
// XOR
// -----------------------------------------------------------------------------
export const XOR: FunctionDescription = {
  description: "Logical `xor` operator.",
  args: args`
      logical_expression1 (boolean, range<boolean>) An expression or reference to a cell containing an expression that represents some logical value, i.e. TRUE or FALSE, or an expression that can be coerced to a logical value.
      logical_expression2 (boolean, range<boolean>, optional, repeating) More expressions that evaluate to logical values.
    `,
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
      throw new Error(`XOR has no valid input data.`);
    }
    return result;
  },
};
