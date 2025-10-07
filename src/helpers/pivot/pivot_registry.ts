import { CoreGetters } from "@odoo/o-spreadsheet-engine";
import { PivotRuntimeDefinition } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_runtime_definition";
import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import {
  PivotCoreDefinition,
  PivotField,
  PivotFields,
} from "@odoo/o-spreadsheet-engine/types/pivot";
import { Pivot } from "@odoo/o-spreadsheet-engine/types/pivot_runtime";
import { Getters } from "../../types";
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
