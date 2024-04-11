import { DispatchResult, Model, UID } from "../../src";
import { toZone } from "../../src/helpers";
import { SpreadsheetPivotCoreDefinition } from "../../src/types/pivot";
import { pivotModelData } from "../pivots/pivot_data";

export function createModelWithPivot(range: string): Model {
  return new Model(pivotModelData(range));
}

function DEFAULT_PIVOT_DATA(sheetId: UID): SpreadsheetPivotCoreDefinition {
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
  pivotData: Partial<SpreadsheetPivotCoreDefinition> = {},
  zone: string = "A1:D5",
  pivotId = "1",
  init = true
): DispatchResult {
  const pivot: SpreadsheetPivotCoreDefinition = {
    ...DEFAULT_PIVOT_DATA(model.getters.getActiveSheetId()),
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
