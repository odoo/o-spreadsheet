import { Registry } from "../registry";
import { _lt } from "../translation";
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

const functionNameRegex = /^[A-Z0-9\.]+$/;

//------------------------------------------------------------------------------
// Function registry
//------------------------------------------------------------------------------
class FunctionRegistry extends Registry<FunctionDescription> {
  mapping: { [key: string]: Function } = {};

  add(name: string, addDescr: AddFunctionDescription) {
    name = name.toUpperCase();
    if (!name.match(functionNameRegex)) {
      throw new Error(
        _lt(
          "Invalid function name %s. Function names can exclusively contain alphanumerical values separated by dots (.)",
          name
        )
      );
    }
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
    name = name.replace("_", ".");
    functionRegistry.add(name, { isExported: false, ...addDescr });
  }
}
