import { ArgType, Arg } from "../types";

//------------------------------------------------------------------------------
// Arg description DSL
//------------------------------------------------------------------------------

const ARG_REGEXP = /(.*?)\((.*?)\)(.*)/;
const ARG_TYPES: ArgType[] = [
  "ANY",
  "BOOLEAN",
  "NUMBER",
  "STRING",
  "DATE",
  "RANGE",
  "RANGE<BOOLEAN>",
  "RANGE<NUMBER>",
  "RANGE<STRING>",
];

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
  let defaultVal;

  for (let param of parts[2].split(",")) {
    const key = param.trim().toUpperCase();
    let type = ARG_TYPES.find((t) => key === t);
    if (type) {
      types.push(type);
    } else if (key === "RANGE<ANY>") {
      types.push("RANGE");
    } else if (key === "OPTIONAL") {
      isOptional = true;
    } else if (key === "REPEATING") {
      isRepeating = true;
    } else if (key.startsWith("DEFAULT=")) {
      const value = param.trim().slice(8);
      defaultVal = value[0] === '"' ? value.slice(1, -1) : parseFloat(value);
    }
  }
  let description = parts[3].trim();
  const result: Arg = {
    name,
    description,
    type: types,
  };
  if (isOptional) {
    result.optional = true;
  }
  if (isRepeating) {
    result.repeating = true;
  }
  if (defaultVal !== undefined) {
    result.default = defaultVal;
  }
  return result;
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
