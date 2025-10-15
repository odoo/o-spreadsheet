import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";

/**
 * Registry to enable or disable the support of positional arguments
 * (with a leading #) in pivot functions
 * e.g. =PIVOT.VALUE(1,"probability","#stage",1)
 */
export const supportedPivotPositionalFormulaRegistry = new Registry<boolean>();

supportedPivotPositionalFormulaRegistry.add("SPREADSHEET", false);
