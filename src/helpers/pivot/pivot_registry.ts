import { ModelConfig } from "../../model";
import { Registry } from "../../registries/registry";
import { Getters } from "../../types";
import { PivotCoreDefinition, PivotFields } from "../../types/pivot";
import { Pivot } from "./pivot_runtime";
import { PivotRuntimeDefinition } from "./pivot_runtime_definition";
import { SpreadsheetCorePivot } from "./spreadsheet_core_pivot";
import { SpreadsheetPivot, SpreadsheetPivotRuntimeDefinition } from "./spreadsheet_pivot";

export interface PivotParams {
  definition: PivotCoreDefinition;
  getters: Getters;
}

type PivotConstructor = new (custom: ModelConfig["custom"], params: PivotParams) => Pivot;
type PivotDefinitionConstructor = new (
  definition: PivotCoreDefinition,
  fields: PivotFields,
  getters: Getters //TODOPRO Put getters in odoo
) => PivotRuntimeDefinition;
export interface PivotRegistryItem {
  cls: PivotConstructor;
  definition: PivotDefinitionConstructor;
}

export const pivotRuntimeRegistry = new Registry<PivotRegistryItem>();

pivotRuntimeRegistry.add("SPREADSHEET", {
  cls: SpreadsheetPivot,
  definition: SpreadsheetPivotRuntimeDefinition,
});

//TODOPRO
export const pivotRegistry = new Registry<unknown>();

pivotRegistry.add("SPREADSHEET", {
  cls: SpreadsheetCorePivot,
  definition: SpreadsheetPivotRuntimeDefinition,
});
