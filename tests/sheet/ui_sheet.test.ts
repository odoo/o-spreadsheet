import { Model, SpreadsheetPivotCoreDefinition, UID } from "../../src";
import { zoneToXc } from "../../src/helpers/zones";
import {
  addEqualCf,
  clearAllStyling,
  createTable,
  merge,
  setBordersOnTarget,
  setCellContent,
  setFormatting,
} from "../test_helpers";
import { createModelFromGrid, toCellPosition } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

let model: Model;
let sheetId: UID;

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
});

describe("CLEAR_ALL_STYLING command", () => {
  test("Can clear the cell style", () => {
    setFormatting(model, "A1:A3", { bold: true });
    setBordersOnTarget(model, ["A1:A3"], { bottom: { color: "#ff0000", style: "thin" } });

    clearAllStyling(model, "A1:A2");
    expect(model.getters.getCellStyle(toCellPosition(sheetId, "A1"))).toEqual({});
    expect(model.getters.getCellStyle(toCellPosition(sheetId, "A2"))).toEqual({});
    expect(model.getters.getCellStyle(toCellPosition(sheetId, "A3"))).toEqual({ bold: true });

    expect(model.getters.getCellBorder(toCellPosition(sheetId, "A1"))).toEqual(null);
    expect(model.getters.getCellBorder(toCellPosition(sheetId, "A2"))).toEqual(null);
    expect(model.getters.getCellBorder(toCellPosition(sheetId, "A3"))).toEqual({
      bottom: { color: "#ff0000", style: "thin" },
    });
  });

  test("Clear merges fully inside the target", () => {
    merge(model, "A1:B2");
    merge(model, "C1:D2");

    clearAllStyling(model, "A1:C2");
    expect(model.getters.getMerges(sheetId).map(zoneToXc)).toEqual(["C1:D2"]);
  });

  test("Clear table style for tables fully inside the target", () => {
    createTable(model, "A1:B2", { styleId: "TableStyleLight1" });
    createTable(model, "C1:D2", { styleId: "TableStyleLight2" });

    clearAllStyling(model, "A1:C2");
    expect(model.getters.getTables(sheetId)).toMatchObject([
      { config: { styleId: "None" } },
      { config: { styleId: "TableStyleLight2" } },
    ]);
  });

  test("Clear pivot table style for pivot tables fully inside the target", () => {
    const grid = { A1: "Customer", B1: "Price", A2: "Alice", B2: "10" };
    const model = createModelFromGrid(grid);
    const pivotDefinition: Partial<SpreadsheetPivotCoreDefinition> = {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
      style: { tableStyleId: "PivotTableStyleMedium9" },
    };
    addPivot(model, "A1:B2", pivotDefinition, "pivot1");
    addPivot(model, "A1:B2", pivotDefinition, "pivot2");

    setCellContent(model, "A4", "=PIVOT(1)");
    setCellContent(model, "D4", "=PIVOT(2)");

    clearAllStyling(model, "A1:D10");
    expect(model.getters.getPivotCoreDefinition("pivot1")?.style?.tableStyleId).toEqual("None");
    expect(model.getters.getPivotCoreDefinition("pivot2")?.style?.tableStyleId).toEqual(
      "PivotTableStyleMedium9"
    );
  });

  test("Clear conditional formats", () => {
    addEqualCf(model, "A1:A7", { fillColor: "#FF0000" }, "5", "cf1");
    addEqualCf(model, "C2:C3", { fillColor: "#FF0000" }, "5", "cf2");

    clearAllStyling(model, "A2:C3");
    expect(model.getters.getConditionalFormats(sheetId).map((cf) => cf.id)).toEqual(["cf1"]);
    expect(model.getters.getConditionalFormats(sheetId)[0].ranges).toEqual(["A1", "A4:A7"]);
  });

  test("Can clear conditional formats with unbounded ranges", () => {
    addEqualCf(model, "A2:A", { fillColor: "#FF0000" }, "5", "cf1");

    clearAllStyling(model, "A4:A5");
    expect(model.getters.getConditionalFormats(sheetId)[0].ranges).toEqual(["A2:A3", "A6:A"]);

    clearAllStyling(model, "A1:A100"); // whole column
    expect(model.getters.getConditionalFormats(sheetId)).toHaveLength(0);
  });
});
