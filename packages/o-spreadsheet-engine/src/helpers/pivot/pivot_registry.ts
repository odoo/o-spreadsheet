import { Registry } from "../../registry";
import { CoreGetters } from "../../types/coreGetters";
import { Getters } from "../../types/getters";
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

export type PivotUIConstructor = new (params: PivotParams) => Pivot;

type PivotDefinitionConstructor = new (
  definition: PivotCoreDefinition,
  fields: PivotFields,
  getters: Getters
) => PivotRuntimeDefinition;

export interface PivotRegistryItem {
  ui: PivotUIConstructor;
  definition: PivotDefinitionConstructor;
  externalData: boolean;
  dateGranularities: string[];
  datetimeGranularities: string[];
  isMeasureCandidate: (field: PivotField) => boolean;
  isGroupable: (field: PivotField) => boolean;
  canHaveCustomGroup: (field: PivotField) => boolean;
}

export const pivotRegistry = new Registry<PivotRegistryItem>();

const dateGranularities = [
  "year",
  "quarter_number",
  "month_number",
  "month",
  "iso_week_number",
  "day_of_month",
  "day",
  "day_of_week",
];

pivotRegistry.add("SPREADSHEET", {
  ui: SpreadsheetPivot,
  definition: SpreadsheetPivotRuntimeDefinition,
  externalData: false,
  dateGranularities: [...dateGranularities],
  datetimeGranularities: [...dateGranularities, "hour_number", "minute_number", "second_number"],
  isMeasureCandidate: (field: PivotField) => field.type !== "boolean",
  isGroupable: () => true,
  canHaveCustomGroup: (field: PivotField) => field.type === "char" && !field.isCustomField,
});
