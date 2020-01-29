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
