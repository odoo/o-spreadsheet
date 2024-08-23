import { DispatchResult, Model, UID } from "../../src";
import { toZone } from "../../src/helpers";
import { SpreadsheetPivotCoreDefinition } from "../../src/types/pivot";
import { pivotModelData } from "../pivots/pivot_data";

export function createModelWithPivot(range: string): Model {
  return new Model(pivotModelData(range));
}

function defaultPivotDefinition(sheetId: UID): SpreadsheetPivotCoreDefinition {
  return {
    name: "Pivot",
    type: "SPREADSHEET",
    dataSet: {
      zone: toZone("A1:D5"),
      sheetId,
    },
    rows: [],
    columns: [],
    measures: [],
  };
}

export function addPivot(
  model: Model,
  zone: string = "A1:D5",
  pivotData: Partial<SpreadsheetPivotCoreDefinition> = {},
  pivotId = "1",
  init = true
): DispatchResult {
  const pivot: SpreadsheetPivotCoreDefinition = {
    ...defaultPivotDefinition(model.getters.getActiveSheetId()),
    ...pivotData,
  };
  if (zone) {
    pivot.dataSet!.zone = toZone(zone);
  }
  const result = model.dispatch("ADD_PIVOT", { pivot, pivotId });
  const instance = model.getters.getPivot(pivotId);
  init && instance?.init();
  return result;
}

export function updatePivot(
  model: Model,
  pivotId: UID,
  pivotData: Partial<SpreadsheetPivotCoreDefinition>
) {
  const pivot = {
    ...model.getters.getPivotCoreDefinition(pivotId),
    ...pivotData,
  };
  return model.dispatch("UPDATE_PIVOT", { pivotId, pivot });
}

export function removePivot(model: Model, pivotId: UID) {
  return model.dispatch("REMOVE_PIVOT", { pivotId });
}

export const SELECTORS = {
  COG_WHEEL: ".os-cog-wheel-menu-icon",
  DUPLICATE_PIVOT: ".os-cog-wheel-menu .fa-copy",
  DELETE_PIVOT: ".os-cog-wheel-menu .fa-trash",
  FLIP_AXIS_PIVOT: ".os-cog-wheel-menu .fa-exchange",
  ZONE_INPUT: ".o-selection-input input",
  ZONE_CONFIRM: ".o-selection-input .o-selection-ok",
};
