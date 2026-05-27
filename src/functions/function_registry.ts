import { Registry } from "../registries/registry";
import { AddFunctionDescription, FunctionDescription } from "../types/functions";
import { addMetaInfoFromArg, validateArguments } from "./arguments";

import { _t } from "../translation";

const functionNameRegex = /^[A-Z0-9\_\.]+$/;

export class FunctionRegistry extends Registry<FunctionDescription> {
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
    super.replace(name, descr);
    return this;
  }
}

export const functionRegistry = new FunctionRegistry();
