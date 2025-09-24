import { DispatchResult, Model, UID } from "../../src";
import { deepCopy, toZone } from "../../src/helpers";
import { PivotMeasureDisplay, SpreadsheetPivotCoreDefinition } from "../../src/types/pivot";
import { pivotModelData } from "../pivots/pivot_data";
import { setCellContent } from "./commands_helpers";
import { createModelFromGrid } from "./helpers";

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
  if (!result.isSuccessful) {
    return result;
  }
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
  COG_WHEEL: ".fa-cog",
  DUPLICATE_PIVOT: ".o-menu .fa-clone",
  DELETE_PIVOT: ".o-menu .fa-trash-o",
  FLIP_AXIS_PIVOT: ".o-menu .fa-exchange",
  ZONE_INPUT: ".o-selection-input input",
  ZONE_CONFIRM: ".o-selection-input .o-selection-ok",
};

export function updatePivotMeasureDisplay(
  model: Model,
  pivotId: string,
  measureId: string,
  display: PivotMeasureDisplay
) {
  const measures = deepCopy(model.getters.getPivotCoreDefinition(pivotId)).measures;
  const measure = measures.find((m) => m.id === measureId)!;
  measure.display = display;
  updatePivot(model, pivotId, { measures });
}

export function createModelWithTestPivotDataset(
  pivotDefinition?: Partial<SpreadsheetPivotCoreDefinition>,
  pivotId = "pivotId",
  measureId = "measureId"
) {
  // prettier-ignore
  const grid = {
    A1:"Created on",    B1: "Salesperson",  C1: "Expected Revenue",  D1: "Stage",  E1: "Active",
    A2: "04/02/2024",   B2: "Bob",          C2: "2000",              D2: "Won",    E2: "TRUE",
    A3: "03/28/2024",   B3: "Bob",          C3: "11000",             D3: "New",    E3: "TRUE",
    A4: "04/02/2024",   B4: "Alice",        C4: "4500",              D4: "Won",    E4: "TRUE",
    A5: "04/02/2024",   B5: "Alice",        C5: "9000",              D5: "New",    E5: "TRUE",
    A6: "03/27/2024",   B6: "Alice",        C6: "19800",             D6: "Won",    E6: "TRUE",
    A7: "04/01/2024",   B7: "Alice",        C7: "3800",              D7: "Won",    E7: "TRUE",
    A8: "04/02/2024",   B8: "Bob",          C8: "24000",             D8: "New",    E8: "TRUE",
    A9: "02/03/2024",   B9: "Alice",        C9: "22500",             D9: "Won",    E9: "FALSE",
    A10: "03/03/2024",  B10: "Alice",       C10: "40000",            D10: "New",   E10: "FALSE",
    A11: "03/26/2024",  B11: "Alice",       C11: "5600",             D11: "New",   E11: "FALSE",
    A12: "03/27/2024",  B12: "Bob",         C12: "15000",            D12: "New",   E12: "FALSE",
    A13: "03/27/2024",  B13: "Bob",         C13: "35000",            D13: "Won",   E13: "FALSE",
    A14: "03/31/2024",  B14: "Bob",         C14: "1000",             D14: "Won",   E14: "FALSE",
    A15: "04/02/2024",  B15: "Alice",       C15: "25000",            D15: "Won",   E15: "FALSE",
    A16: "04/02/2024",  B16: "Alice",       C16: "40000",            D16: "New",   E16: "FALSE",
    A17: "03/27/2024",  B17: "Alice",       C17: "60000",            D17: "New",   E17: "FALSE",
    A18: "03/27/2024",  B18: "Bob",         C18: "2000",             D18: "Won",   E18: "FALSE",
  };
  const model = createModelFromGrid(grid);

  pivotDefinition = {
    columns: [{ fieldName: "Salesperson", order: "asc" }],
    rows: [{ fieldName: "Created on", granularity: "month_number", order: "asc" }],
    measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: measureId }],
    ...pivotDefinition,
  };
  addPivot(model, "A1:E18", pivotDefinition, pivotId);
  setCellContent(model, "A20", "=PIVOT(1)");
  return model;
}
