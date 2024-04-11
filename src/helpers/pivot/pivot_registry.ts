import { ModelConfig } from "../../model";
import { Registry } from "../../registries/registry";
import { CoreGetters, Getters } from "../../types";
import { PivotCoreDefinition, PivotField, PivotFields } from "../../types/pivot";
import { Pivot } from "../../types/pivot_runtime";
import { PivotRuntimeDefinition } from "./pivot_runtime_definition";
import { SpreadsheetPivotRuntimeDefinition } from "./spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { SpreadsheetPivot } from "./spreadsheet_pivot/spreadsheet_pivot";

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
  onIterationEndEvaluation: (pivot: Pivot) => void;
  granularities: string[];
  isMeasureCandidate: (field: PivotField) => boolean;
  isGroupable: (field: PivotField) => boolean;
}

export const pivotRegistry = new Registry<PivotRegistryItem>();

pivotRegistry.add("SPREADSHEET", {
  ui: SpreadsheetPivot,
  definition: SpreadsheetPivotRuntimeDefinition,
  externalData: false,
  onIterationEndEvaluation: (pivot: SpreadsheetPivot) => pivot.markAsDirtyForEvaluation(),
  granularities: ["year_number", "month_number", "day_of_month", "day"],
  isMeasureCandidate: (field: PivotField) => !["date", "boolean"].includes(field.type),
  isGroupable: () => true,
});
