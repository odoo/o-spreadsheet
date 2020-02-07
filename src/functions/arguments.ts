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

export function sanitizeArguments(fn: Function, argList: Arg[]): Function {
  if (argList.length === 0) {
    return fn;
  }
  return function(this: any, ...args) {
    for (let i = 0; i < argList.length; i++) {
      const descr = argList[i];
      const arg = args[i];
      if (arg === undefined) {
        if (descr.optional) {
          args = args.slice(0, i);
          break;
        }
        if (descr.type.includes("NUMBER")) {
          args[i] = 0;
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
        }
      }
    }
    return fn.call(this, ...args);
  };
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
