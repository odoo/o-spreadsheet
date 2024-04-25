import { Registry } from "../../registries/registry";
//TODO This registry is only used to disable the support of exploded pivot for spreadsheet
export const supportedPivotExplodedFormulaRegistry = new Registry<boolean>();
supportedPivotExplodedFormulaRegistry.add("SPREADSHEET", false);
