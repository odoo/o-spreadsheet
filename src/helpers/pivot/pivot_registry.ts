import { ModelConfig } from "../../model";
import { Registry } from "../../registries/registry";
import { CoreGetters, Getters } from "../../types";
import { PivotCoreDefinition, PivotFields } from "../../types/pivot";
import { Pivot } from "../../types/pivot_runtime";
import { PivotRuntimeDefinition } from "./pivot_runtime_definition";
import { SpreadsheetPivot } from "./spreadsheet_pivot/spreadsheet_pivot";
import { SpreadsheetPivotRuntimeDefinition } from "./spreadsheet_pivot/spreadsheet_pivot_runtime_definition";

export interface PivotParams {
  definition: PivotCoreDefinition;
  getters: Getters;
}

export interface PivotCoreParams {
  definition: PivotCoreDefinition;
  getters: CoreGetters;
}

type PivotUIConstructor = new (custom: ModelConfig["custom"], params: PivotParams) => Pivot;

type PivotDefinitionConstructor = new (
  definition: PivotCoreDefinition,
  fields: PivotFields,
  getters: Getters
) => PivotRuntimeDefinition;

export interface PivotRegistryItem {
  ui: PivotUIConstructor;
  definition: PivotDefinitionConstructor;
  externalData: boolean;
  onEvaluationCycleEnded: (pivot: Pivot) => void;
  granularities: string[];
}

export const pivotRegistry = new Registry<PivotRegistryItem>();

pivotRegistry.add("SPREADSHEET", {
  ui: SpreadsheetPivot,
  definition: SpreadsheetPivotRuntimeDefinition,
  externalData: false,
  onEvaluationCycleEnded: (pivot: SpreadsheetPivot) => pivot.markAsDirtyForEvaluation(),
  granularities: ["year_number", "month_number", "day_of_month", "day"],
});
