import { Registry } from "../registries/registry";
import { _lt } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  ArgDefinition,
  ArgValue,
  ComputeFunction,
  EvalContext,
  FunctionDescription,
  FunctionReturn,
  isMatrix,
} from "../types";
import { addMetaInfoFromArg, validateArguments } from "./arguments";
import * as misc from "./module_custom";
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
import * as web from "./module_web";

export { arg } from "./arguments";

type Functions = { [functionName: string]: AddFunctionDescription };
type Category = { name: string; functions: Functions };
const categories = [
  { name: _lt("Database"), functions: database },
  { name: _lt("Date"), functions: date },
  { name: _lt("Financial"), functions: financial },
  { name: _lt("Info"), functions: info },
  { name: _lt("Lookup"), functions: lookup },
  { name: _lt("Logical"), functions: logical },
  { name: _lt("Math"), functions: math },
  { name: _lt("Misc"), functions: misc },
  { name: _lt("Operator"), functions: operators },
  { name: _lt("Statistical"), functions: statistical },
  { name: _lt("Text"), functions: text },
  { name: _lt("Engineering"), functions: engineering },
  { name: _lt("Web"), functions: web },
] as const;

const functionNameRegex = /^[A-Z0-9\_\.]+$/;

//------------------------------------------------------------------------------
// Function registry
//------------------------------------------------------------------------------
class FunctionRegistry extends Registry<FunctionDescription> {
  mapping: {
    [key: string]: ComputeFunction<Arg, FunctionReturn>;
  } = {};

  add<Args extends ArgDefinition<any>[]>(name: string, addDescr: AddFunctionDescription<Args>) {
    name = name.toUpperCase();
    if (!functionNameRegex.test(name)) {
      throw new Error(
        _lt(
          "Invalid function name %s. Function names can exclusively contain alphanumerical values separated by dots (.) or underscore (_)",
          name
        )
      );
    }
    const descr = addMetaInfoFromArg(addDescr);
    validateArguments(descr.args);

    const castingFns;

    function computeValueAndFormat(
      this: EvalContext,
      ...args: ComputeFunctionArg<Arg>[]
    ): FunctionReturn {
      const castedArgs = castArgs;
      const computeValue = descr.compute.bind(this);
      const computeFormat = descr.computeFormat ? descr.computeFormat.bind(this) : () => undefined;

      const value = computeValue(...extractValuesFromArgs(args));
      const format = computeFormat(...args);
      if (isMatrix(value)) {
        return {
          value,
          format,
        };
      }
      if (!isMatrix(format)) {
        return {
          value,
          format,
        };
      }
      throw new Error("A format matrix should never be associated with a scalar value");
    }

    this.mapping[name] = computeValueAndFormat;

    super.add(name, descr);
    return this;
  }
}

function extractValuesFromArgs(args: ComputeFunctionArg<Arg>[]): ComputeFunctionArg<ArgValue>[] {
  return args.map((arg) => {
    if (arg === undefined) {
      return undefined;
    }
    if (typeof arg === "function") {
      return () => arg()?.value;
    }
    return arg.value;
  });
}

export const functionRegistry = new FunctionRegistry();

for (let category of categories) {
  const fns = category.functions;
  for (let name in fns) {
    const addDescr = fns[name];
    addDescr.category = addDescr.category || category.name;
    name = name.replace(/_/g, ".");
    functionRegistry.add(name, { isExported: false, ...addDescr });
  }
}

export type ComputeFunctionArg<T> = T | (() => T) | undefined;
