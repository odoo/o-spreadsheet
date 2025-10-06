import { FunctionRegistry as EngineFunctionRegistry } from "@odoo/o-spreadsheet-engine";
import {
  addMetaInfoFromArg,
  validateArguments,
} from "@odoo/o-spreadsheet-engine/functions/arguments";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import {
  AddFunctionDescription,
  ComputeFunction,
  FunctionDescription,
} from "@odoo/o-spreadsheet-engine/types/functions";
import { FunctionResultObject, Matrix } from "@odoo/o-spreadsheet-engine/types/misc";

import * as misc from "@odoo/o-spreadsheet-engine/formulas/module_custom";
import { createComputeFunction } from "@odoo/o-spreadsheet-engine/functions/createComputeFunction";
import * as array from "@odoo/o-spreadsheet-engine/functions/module_array";
import * as database from "@odoo/o-spreadsheet-engine/functions/module_database";
import * as date from "@odoo/o-spreadsheet-engine/functions/module_date";
import * as engineering from "@odoo/o-spreadsheet-engine/functions/module_engineering";
import * as filter from "@odoo/o-spreadsheet-engine/functions/module_filter";
import * as financial from "@odoo/o-spreadsheet-engine/functions/module_financial";
import * as info from "@odoo/o-spreadsheet-engine/functions/module_info";
import * as math from "@odoo/o-spreadsheet-engine/functions/module_math";
import * as statistical from "@odoo/o-spreadsheet-engine/functions/module_statistical";
import * as logical from "../../packages/o-spreadsheet-engine/src/functions/module_logical";
import * as lookup from "../../packages/o-spreadsheet-engine/src/functions/module_lookup";
import * as operators from "../../packages/o-spreadsheet-engine/src/functions/module_operators";
import * as parser from "../../packages/o-spreadsheet-engine/src/functions/module_parser";
import * as text from "../../packages/o-spreadsheet-engine/src/functions/module_text";
import * as web from "../../packages/o-spreadsheet-engine/src/functions/module_web";
import { createAutocompleteArgumentsProvider } from "./autocompleteArgumentsProvider";
import * as pivots from "./module_pivot";

export { FunctionRegistry } from "@odoo/o-spreadsheet-engine";

export { arg } from "@odoo/o-spreadsheet-engine/functions/arguments";

type Functions = { [functionName: string]: AddFunctionDescription };
type Category = { name: string; functions: Functions };
const categories: Category[] = [
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

const functionNameRegex = /^[A-Z0-9\_\.]+$/;

//------------------------------------------------------------------------------
// Function registry
//------------------------------------------------------------------------------

class SpreadsheetFunctionRegistry extends EngineFunctionRegistry<
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

for (const category of categories) {
  const fns = category.functions;
  for (let name in fns) {
    const addDescr = fns[name];
    addDescr.category = addDescr.category || category.name;
    name = name.replace(/_/g, ".");
    functionRegistry.add(name, { isExported: false, ...addDescr });

    createAutocompleteArgumentsProvider(name, addDescr.args);
  }
}
