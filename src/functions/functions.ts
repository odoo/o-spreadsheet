//------------------------------------------------------------------------------
// Types
//------------------------------------------------------------------------------
export interface FunctionDescription {
  description: string;
  compute: Function;
  async?: boolean;
  category?: string;
  args: Arg[];
  returns: [ArgType];
}

export type FunctionMap = { [key: string]: FunctionDescription };
export type ArgType = "BOOLEAN" | "ANY" | "RANGE" | "CELL" | "NUMBER" | "STRING";

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
// Functions
//------------------------------------------------------------------------------

// todo: make name more descriptive, and add some docstring

/**
 * Mapping from function names to descriptions
 */
export const functions: FunctionMap = {};

/**
 * Mapping from function name to the corresponding compute method
 */
export const functionMap: { [name: string]: Function } = {};

//------------------------------------------------------------------------------
// Others
//------------------------------------------------------------------------------

function validateArguments(args: Arg[]) {
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

/**
 * Add a function to the internal function list.
 */
export function addFunction(name: string, descr: FunctionDescription) {
  name = name.toUpperCase();
  if (name in functionMap) {
    throw new Error(`Function ${name} already registered...`);
  }

  validateArguments(descr.args);

  functionMap[name] = descr.compute;
  functions[name] = descr;
}

//------------------------------------------------------------------------------
// Arg description DSL
//------------------------------------------------------------------------------

const ARG_REGEXP = /(.*)\((.*)\)(.*)/;
const ARG_TYPES: ArgType[] = ["BOOLEAN", "NUMBER", "ANY", "RANGE", "CELL", "NUMBER", "STRING"];

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
