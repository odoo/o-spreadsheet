import { Registry } from "../registry";
import { _lt } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  ArgValue,
  ComputeFunction,
  ComputeFunctionArg,
  EvalContext,
  FunctionDescription,
  FunctionReturn,
} from "../types";
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
  mapping: {
    [key: string]: ComputeFunction<Arg, FunctionReturn>;
  } = {};

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

    function computeValueAndFormat(
      this: EvalContext,
      ...args: ComputeFunctionArg<Arg>[]
    ): FunctionReturn {
      const computeValue = descr.compute.bind(this);
      const computeFormat = descr.computeFormat ? descr.computeFormat.bind(this) : () => undefined;

      return {
        value: computeValue(...extractArgValuesFromArgs(args)),
        format: computeFormat(...args),
      };
    }

    this.mapping[name] = computeValueAndFormat;

    super.add(name, descr);
    return this;
  }
}

function extractArgValuesFromArgs(args: ComputeFunctionArg<Arg>[]): ComputeFunctionArg<ArgValue>[] {
  return args.map((arg) => {
    if (arg === undefined) {
      return undefined;
    }
    if (typeof arg === "function") {
      return () => _extractArgValuesFromArgs(arg());
    }
    return _extractArgValuesFromArgs(arg);
  });
}

function _extractArgValuesFromArgs(arg: Arg): ArgValue {
  if (Array.isArray(arg)) {
    return arg.map((col) => col.map((simpleArg) => simpleArg?.value));
  }
  return arg?.value;
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
