import { ModelConfig } from "../../model";
import { Registry } from "../../registries/registry";
import { ApplyRangeChange, CoreGetters, Getters, Range } from "../../types";
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

export type PivotUIConstructor = new (custom: ModelConfig["custom"], params: PivotParams) => Pivot;

type PivotDefinitionConstructor = new (
  definition: PivotCoreDefinition,
  fields: PivotFields,
  getters: Getters
) => PivotRuntimeDefinition;

export interface PivotRegistryItem {
  ui: PivotUIConstructor;
  definition: PivotDefinitionConstructor;
  dateGranularities: string[];
  datetimeGranularities: string[];
  isMeasureCandidate: (field: PivotField) => boolean;
  isGroupable: (field: PivotField) => boolean;
  adaptRanges?: (
    getters: CoreGetters,
    definition: PivotCoreDefinition,
    applyChange: ApplyRangeChange
  ) => PivotCoreDefinition;
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
  dateGranularities: [...dateGranularities],
  datetimeGranularities: [...dateGranularities, "hour_number", "minute_number", "second_number"],
  isMeasureCandidate: (field: PivotField) => !["datetime", "boolean"].includes(field.type),
  isGroupable: () => true,
  adaptRanges: (getters, definition, applyChange) => {
    if (definition.type !== "SPREADSHEET" || !definition.dataSet) {
      return definition;
    }
    const { sheetId, zone } = definition.dataSet;
    const range = getters.getRangeFromZone(sheetId, zone);
    const adaptedRange = adaptPivotRange(range, applyChange);

    if (adaptedRange === range) {
      return definition;
    }

    const dataSet = adaptedRange && {
      sheetId: adaptedRange.sheetId,
      zone: adaptedRange.zone,
    };
    return { ...definition, dataSet };
  },
});

function adaptPivotRange(
  range: Range | undefined,
  applyChange: ApplyRangeChange
): Range | undefined {
  if (!range) {
    return undefined;
  }
  const change = applyChange(range);
  switch (change.changeType) {
    case "NONE":
      return range;
    case "REMOVE":
      return undefined;
    default:
      return change.range;
  }
}
