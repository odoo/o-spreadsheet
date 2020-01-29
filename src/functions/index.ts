import { addFunction, FunctionMap } from "./functions";
import { functions as logical } from "./logical";
import { functions as math } from "./math";

export { functionMap, functions, addFunction, ArgType } from "./functions";

importFunctions(math, "math");
importFunctions(logical, "logical");

function importFunctions(mapping: FunctionMap, category: string) {
  for (let name in mapping) {
    const descr = mapping[name];
    descr.category = descr.category || category;
    addFunction(name, descr);
  }
}
