import { functionRegistry } from "@odoo/o-spreadsheet-engine";
import { createAutocompleteArgumentsProvider } from "./createAutocompleteArgumentsProvider";

import { categories } from "@odoo/o-spreadsheet-engine";

//------------------------------------------------------------------------------
// Function registry
//------------------------------------------------------------------------------

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
