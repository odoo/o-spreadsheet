import { Registry } from "../registry";
import { AddFunctionDescription, FunctionDescription } from "../types";
import { addMetaInfoFromArg, validateArguments } from "./arguments";
import * as database from "./module_database";
import * as date from "./module_date";
import * as engineering from "./module_engineering";
import * as financial from "./module_financial";
import * as info from "./module_info";
import * as logical from "./module_logical";
import * as lookup from "./module_lookup";
import * as math from "./module_math";
import * as operators from "./module_operators";
import * as statistical from "./module_statistical";
import * as text from "./module_text";

export { args } from "./arguments";

const functions: { [category: string]: { [name: string]: AddFunctionDescription } } = {
  database,
  date,
  financial,
  info,
  lookup,
  logical,
  math,
  operators,
  statistical,
  text,
  engineering,
};

//------------------------------------------------------------------------------
// Function registry
//------------------------------------------------------------------------------
class FunctionRegistry extends Registry<FunctionDescription> {
  mapping: { [key: string]: Function } = {};

  add(name: string, addDescr: AddFunctionDescription) {
    name = name.toUpperCase().replace("_", ".");
    const descr = addMetaInfoFromArg(addDescr);
    validateArguments(descr.args);
    this.mapping[name] = descr.compute;
    super.add(name, descr);
    return this;
  }
}

export const functionRegistry = new FunctionRegistry();

for (let category in functions) {
  const fns = functions[category];
  for (let name in fns) {
    const addDescr = fns[name];
    addDescr.category = category;
    functionRegistry.add(name, { isExported: false, ...addDescr });
  }
}
