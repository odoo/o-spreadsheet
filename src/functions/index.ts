import { Registry } from "../registry";
import { Arg, ArgType, validateArguments } from "./arguments";
import * as logical from "./module_logical";
import * as lookup from "./module_lookup";
import * as math from "./module_math";
import * as operators from "./module_operators";
import * as statistical from "./module_statistical";

export { Arg, ArgType, args } from "./arguments";

export interface FunctionDescription {
  description: string;
  compute: Function;
  async?: boolean;
  category?: string;
  args: Arg[];
  returns: [ArgType];
}

const functions: { [category: string]: { [name: string]: FunctionDescription } } = {
  lookup,
  math,
  logical,
  operators,
  statistical
};

//------------------------------------------------------------------------------
// Function registry
//------------------------------------------------------------------------------
class FunctionRegistry extends Registry<FunctionDescription> {
  mapping: { [key: string]: Function } = {};

  add(name: string, descr: FunctionDescription) {
    name = name.toUpperCase().replace("_", ".");
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
    const descr = fns[name];
    descr.category = category;
    functionRegistry.add(name, descr);
  }
}
