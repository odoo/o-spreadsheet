import { functions as math } from "./math";
import { functions as logical } from "./logical";

//------------------------------------------------------------------------------
// Types
//------------------------------------------------------------------------------
export interface FunctionDescription {
  description: string;
  compute: Function;
  async?: boolean;
}

export type FunctionMap = { [key: string]: FunctionDescription };

//------------------------------------------------------------------------------
// Functions
//------------------------------------------------------------------------------

export const functions: FunctionMap = {};
export const functionMap: { [name: string]: Function } = {};

importFunctions(math);
importFunctions(logical);

//------------------------------------------------------------------------------
// Others
//------------------------------------------------------------------------------

/**
 * Add a function to the internal function list.
 */
export function addFunction(name: string, descr: FunctionDescription) {
  name = name.toUpperCase();
  functionMap[name] = descr.compute;
  functions[name] = descr;
}

function importFunctions(mapping: FunctionMap) {
  for (let name in mapping) {
    addFunction(name, mapping[name]);
  }
}
