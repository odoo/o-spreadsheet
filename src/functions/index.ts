import { Arg, ArgType, protectFunction, validateArguments } from "./arguments";
import { functions as logical } from "./module_logical";
import { functions as math } from "./module_math";

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

export { ArgType } from "./arguments";

importFunctions(math, "math");
importFunctions(logical, "logical");

function importFunctions(mapping: FunctionMap, category: string) {
  for (let name in mapping) {
    const descr = mapping[name];
    descr.category = descr.category || category;
    addFunction(name, descr);
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

  functionMap[name] = protectFunction(descr.compute, descr.args);
  functions[name] = descr;
}
