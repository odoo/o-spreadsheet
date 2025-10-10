import { AddFunctionDescription, ComputeFunction, FunctionDescription } from "../types/functions";
import { FunctionResultObject, Matrix } from "../types/misc";
import { addMetaInfoFromArg, validateArguments } from "./arguments";
import { createComputeFunction } from "./createComputeFunction";

import { _t } from "../translation";
import { FunctionRegistry } from "./function_registry";
import * as array from "./module_array";
import * as misc from "./module_custom";
import * as database from "./module_database";
import * as date from "./module_date";
import * as engineering from "./module_engineering";
import * as filter from "./module_filter";
import * as financial from "./module_financial";
import * as info from "./module_info";
import * as logical from "./module_logical";
import * as lookup from "./module_lookup";
import * as math from "./module_math";
import * as operators from "./module_operators";
import * as parser from "./module_parser";
import * as pivots from "./module_pivot";
import * as statistical from "./module_statistical";
import * as text from "./module_text";
import * as web from "./module_web";

const functionNameRegex = /^[A-Z0-9\_\.]+$/;

export class SpreadsheetFunctionRegistry extends FunctionRegistry<
  AddFunctionDescription,
  FunctionDescription,
  ComputeFunction<Matrix<FunctionResultObject> | FunctionResultObject>
> {
  protected process(name: string, addDescr: AddFunctionDescription) {
    const normalizedName = name.toUpperCase();
    if (!functionNameRegex.test(normalizedName)) {
      throw new Error(
        _t(
          "Invalid function name %s. Function names can exclusively contain alphanumerical values separated by dots (.) or underscore (_)",
          normalizedName
        )
      );
    }
    const descr = addMetaInfoFromArg(normalizedName, addDescr);
    validateArguments(descr);
    const compute = createComputeFunction(descr);
    return {
      key: normalizedName,
      stored: descr,
      mapped: compute,
    };
  }
}

export const functionRegistry = new SpreadsheetFunctionRegistry();

type Functions = { [functionName: string]: AddFunctionDescription };
type Category = { name: string; functions: Functions };
export const categories: Category[] = [
  { name: _t("Array"), functions: array },
  { name: _t("Database"), functions: database },
  { name: _t("Date"), functions: date },
  { name: _t("Filter"), functions: filter },
  { name: _t("Financial"), functions: financial },
  { name: _t("Info"), functions: info },
  { name: _t("Lookup"), functions: { ...lookup, ...pivots } },
  { name: _t("Logical"), functions: logical },
  { name: _t("Math"), functions: math },
  { name: _t("Misc"), functions: misc },
  { name: _t("Operator"), functions: operators },
  { name: _t("Statistical"), functions: statistical },
  { name: _t("Text"), functions: text },
  { name: _t("Engineering"), functions: engineering },
  { name: _t("Web"), functions: web },
  { name: _t("Parser"), functions: parser },
];

for (const category of categories) {
  const fns = category.functions;
  for (let name in fns) {
    const addDescr = fns[name];
    addDescr.category = addDescr.category || category.name;
    name = name.replace(/_/g, ".");
    functionRegistry.add(name, { isExported: false, ...addDescr });
  }
}
