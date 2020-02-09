export type ArgType = "BOOLEAN" | "ANY" | "RANGE" | "NUMBER" | "STRING";

export interface Arg {
  repeating?: boolean;
  optional?: boolean;
  description: string;
  name: string;
  type: ArgType[];
  default?: any;
  valueProvider?: Function;
  isValueProviderRestrictive?: boolean;
}

//------------------------------------------------------------------------------
// Argument validation
//------------------------------------------------------------------------------

export function validateArguments(args: Arg[]) {
  let previousArgRepeating: boolean | undefined = false;
  let previousArgOptional: boolean | undefined = false;
  for (let current of args) {
    if (previousArgRepeating) {
      throw new Error(
        "Function ${name} has at least 2 arguments that are repeating. The maximum repeating arguments is 1."
      );
    }

    if (previousArgOptional && !current.optional) {
      throw new Error(
        "Function ${name} has at mandatory arguments declared after optional ones. All optional arguments must be after all mandatory arguments."
      );
    }
    previousArgRepeating = current.repeating;
    previousArgOptional = current.optional;
  }
}

//------------------------------------------------------------------------------
// Wrapping functions for arguments sanitization
//------------------------------------------------------------------------------
export function protectFunction(fn: Function, argList: Arg[]): Function {
  if (argList.length === 0) {
    return fn;
  }
  return function(this: any, ...args: any[]) {
    args = sanitizeArgs(args, argList);
    return fn.call(this, ...args);
  };
}

/**
 * If you read this, and are horrified by the code, worry not, dear friend.
 * This code is here only for a while, to solidify the test suite and prepare
 * the future. It will be replaced by a shiny argument sanitizer compiler soon.
 *
 * Note: this function modifies args in place!
 */
export function sanitizeArgs(args: any[], argList: Arg[]): any[] {
  for (let i = 0; i < argList.length; i++) {
    const descr = argList[i];
    if (!(i in args) && !descr.optional) {
      throw new Error("Wrong number of arguments. Expected 1, but got 0 argument instead.");
    }
    const arg = args[i];
    if (arg === undefined && descr.optional) {
      args = args.slice(0, i);
      break;
    }
    if (descr.repeating) {
      for (let j = i; j < args.length; j++) {
        sanitizeArg(args, j, args[j], descr);
      }
      return args;
    }
    sanitizeArg(args, i, arg, descr);
  }
  if (args.length > argList.length) {
    throw new Error(
      `Wrong number of arguments. Expected ${argList.length}, but got ${args.length} arguments instead.`
    );
  }
  return args;
}

function sanitizeArg(args: any[], i: number, arg: any, descr: Arg) {
  if (arg === undefined) {
    if (descr.type.includes("NUMBER")) {
      args[i] = 0;
    }
    if (descr.type.includes("BOOLEAN")) {
      args[i] = false;
    }
  } else if (typeof arg === "boolean" && !descr.type.includes("BOOLEAN")) {
    if (descr.type.includes("NUMBER")) {
      args[i] = arg ? 1 : 0;
    }
  } else if (typeof arg === "string") {
    if (descr.type.includes("NUMBER")) {
      if (arg) {
        const n = Number(arg);
        if (isNaN(n)) {
          throw new Error(
            `Argument "${descr.name}" should be a number, but "${arg}" is a text, and cannot be coerced to a number.`
          );
        }
      } else {
        args[i] = 0;
      }
      args[i] = arg ? parseFloat(arg) : 0;
    } else if (descr.type.includes("BOOLEAN")) {
      if (arg === "") {
        args[i] = false;
      } else if (arg.toUpperCase() === "TRUE") {
        args[i] = true;
      } else if (arg.toUpperCase() === "FALSE") {
        args[i] = false;
      } else {
        throw new Error(
          `Argument "${descr.name}" should be a boolean, but "${arg}" is a text, and cannot be coerced to a boolean.`
        );
      }
    }
  } else if (typeof arg === "number") {
    if (descr.type.includes("BOOLEAN")) {
      args[i] = arg ? true : false;
    }
  }
}
//------------------------------------------------------------------------------
// Arg description DSL
//------------------------------------------------------------------------------

const ARG_REGEXP = /(.*)\((.*)\)(.*)/;
const ARG_TYPES: ArgType[] = ["BOOLEAN", "NUMBER", "STRING", "ANY", "RANGE"];

/**
 * This function is meant to be used as a tag for a template strings.
 *
 * Its job is to convert a textual description of the list of arguments into an
 * actual array of Arg, suitable for consumption.
 */
export function args(strings: TemplateStringsArray): Arg[] {
  let lines = strings[0].split("\n");
  const result: Arg[] = [];
  for (let l of lines) {
    l = l.trim();
    if (l) {
      result.push(makeArg(l));
    }
  }
  return result;
}

function makeArg(str: string): Arg {
  let parts = str.match(ARG_REGEXP)!;
  let name = parts[1].trim();
  let types: ArgType[] = [];
  let isOptional = false;
  let isRepeating = false;
  for (let param of parts[2].split(",")) {
    param = param.trim().toUpperCase();
    let type = ARG_TYPES.find(t => param === t);
    if (type) {
      types.push(type);
    } else if (param === "OPTIONAL") {
      isOptional = true;
    } else if (param === "REPEATING") {
      isRepeating = true;
    }
  }
  let description = parts[3].trim();
  const result: Arg = {
    name,
    description,
    type: types
  };
  if (isOptional) {
    result.optional = true;
  }
  if (isRepeating) {
    result.repeating = true;
  }
  return result;
}
