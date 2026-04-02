import { Registry } from "../registry";
import { AddFunctionDescription, ComputeFunction, FunctionDescription } from "../types/functions";
import { FunctionResultObject, Matrix } from "../types/misc";
import { addMetaInfoFromArg, validateArguments } from "./arguments";
import { createComputeFunction } from "./create_compute_function";

import { _t } from "../translation";

const functionNameRegex = /^[A-Z0-9\_\.]+$/;

export class FunctionRegistry extends Registry<FunctionDescription> {
  mapping: {
    [key: string]: ComputeFunction<Matrix<FunctionResultObject> | FunctionResultObject>;
  } = {};

  add(name: string, addDescr: AddFunctionDescription) {
    name = name.toUpperCase();
    if (name in this.content) {
      throw new Error(`${name} is already present in this registry!`);
    }
    return this.replace(name, addDescr);
  }

  replace(name: string, addDescr: AddFunctionDescription) {
    name = name.toUpperCase();
    if (!functionNameRegex.test(name)) {
      throw new Error(
        _t(
          "Invalid function name %s. Function names can exclusively contain alphanumerical values separated by dots (.) or underscore (_)",
          name
        )
      );
    }
    const descr = addMetaInfoFromArg(name, addDescr);
    validateArguments(descr);
    this.mapping[name] = createComputeFunction(descr);
    super.replace(name, descr);
    return this;
  }
}

export const functionRegistry = new FunctionRegistry();
