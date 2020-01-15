export interface FunctionDescription {
  description: string;
  compute: Function;
}

export type FunctionMap = { [key: string]: FunctionDescription };

import { functions as math } from "./math";

export const functions: FunctionMap = {};
export const functionMap: { [name: string]: Function } = {};

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

importFunctions(math);
