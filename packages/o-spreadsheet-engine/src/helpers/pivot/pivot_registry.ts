import { Registry } from "../../registry";
import { CoreGetters } from "../../types/core_getters";
import { Getters } from "../../types/getters";
import { ApplyRangeChange, UID } from "../../types/misc";
import { ModelConfig } from "../../types/model";
import { PivotCoreDefinition, PivotField, PivotFields } from "../../types/pivot";
import { Pivot } from "../../types/pivot_runtime";
import { Range } from "../../types/range";
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
  canHaveCustomGroup: (field: PivotField) => boolean;
  isPivotUnused: (getters: Getters, pivotId: UID) => boolean;
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
  isMeasureCandidate: (field: PivotField) => field.type !== "boolean",
  isGroupable: () => true,
  canHaveCustomGroup: (field: PivotField) => field.type === "char" && !field.isCustomField,
  isPivotUnused: () => true,
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
