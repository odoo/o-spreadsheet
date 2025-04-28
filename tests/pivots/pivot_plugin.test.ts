import { CommandResult, Model } from "../../src";
import { FORBIDDEN_SHEETNAME_CHARS } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { EMPTY_PIVOT_CELL } from "../../src/helpers/pivot/table_spreadsheet_pivot";
import { renameSheet, selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { createModelFromGrid, toCellPosition } from "../test_helpers/helpers";
import { addPivot, updatePivot } from "../test_helpers/pivot_helpers";

describe("Pivot plugin", () => {
  test("isSpillPivotFormula", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ name: "Customer" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });

    const sheetId = model.getters.getActiveSheetId();
    const isSpillPivotFormula = (xc: string) =>
      model.getters.isSpillPivotFormula(toCellPosition(sheetId, xc));
    expect(isSpillPivotFormula("A1")).toBe(false); //Dataset
    expect(isSpillPivotFormula("C1")).toBe(true); // PIVOT Formula
    expect(isSpillPivotFormula("D2")).toBe(true); // Spill result
    setCellContent(model, "G1", "=PIVOT.VALUE(1)");
    expect(isSpillPivotFormula("G1")).toBe(false);
    setCellContent(model, "G1", "=PIVOT.HEADER(1)");
    expect(isSpillPivotFormula("G1")).toBe(false);
  });

  test("getPivotCellFromPosition doesn't throw with invalid pivot domain", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: '=PIVOT.VALUE(1,"Price","5","Bob")',
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ name: "Customer" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    selectCell(model, "C1");
    expect(model.getters.getPivotCellFromPosition(model.getters.getActivePosition())).toMatchObject(
      EMPTY_PIVOT_CELL
    );
  });

  test("getPivotCellFromPosition cannot get the pivot cell when the table is manipulated by other functions", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: '=PIVOT.VALUE(1,"Price","5","Bob")',
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30",
      A4: "=TRANSPOSE(PIVOT(1))",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ name: "Customer" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    selectCell(model, "C5");
    expect(model.getters.getPivotCellFromPosition(model.getters.getActivePosition())).toEqual(
      EMPTY_PIVOT_CELL
    );
  });

  test("cannot update a pivot with a wrong id", () => {
    const model = new Model();
    const updateResult = model.dispatch("UPDATE_PIVOT", {
      pivotId: "9999",
      pivot: {
        columns: [],
        rows: [],
        measures: [],
        name: "Pivot",
        type: "SPREADSHEET",
      },
    });
    expect(updateResult).toBeCancelledBecause(CommandResult.PivotIdNotFound);
  });

  test("cannot duplicate a pivot with a wrong id", () => {
    const model = new Model();
    const updateResult = model.dispatch("DUPLICATE_PIVOT", {
      pivotId: "9999",
      newPivotId: "1",
    });
    expect(updateResult).toBeCancelledBecause(CommandResult.PivotIdNotFound);
  });

  test("cannot remove a pivot with a wrong id", () => {
    const model = new Model();
    const updateResult = model.dispatch("REMOVE_PIVOT", {
      pivotId: "9999",
    });
    expect(updateResult).toBeCancelledBecause(CommandResult.PivotIdNotFound);
  });

  test("cannot create a pivot with and invalid dataset sheetId or zone", () => {
    const model = new Model();
    const createResult1 = addPivot(model, "", {
      dataSet: { sheetId: "BADSHEETID", zone: toZone("A1:A2") },
    });
    expect(createResult1).toBeCancelledBecause(CommandResult.InvalidDataSet);
    const sheetId = model.getters.getActiveSheetId();
    const createResult2 = addPivot(model, "", {
      dataSet: { sheetId, zone: { top: -1, left: 1, bottom: 2, right: 2 } },
    });
    expect(createResult2).toBeCancelledBecause(CommandResult.InvalidDataSet);

    // Out of bounds zone
    const createResult3 = addPivot(model, "", {
      dataSet: { sheetId, zone: { top: 1, left: 1, bottom: 200, right: 200 } },
    });
    expect(createResult3).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
  });

  test("cannot update a pivot with and invalid dataset sheetId or zone", () => {
    const model = new Model();
    addPivot(model, "A1:A2");

    const updateResult1 = updatePivot(model, "1", {
      dataSet: { sheetId: "BADSHEETID", zone: toZone("A1:A2") },
    });
    expect(updateResult1).toBeCancelledBecause(CommandResult.InvalidDataSet);
    const sheetId = model.getters.getActiveSheetId();
    const updateResult2 = updatePivot(model, "1", {
      dataSet: { sheetId, zone: { top: -1, left: 1, bottom: 2, right: 2 } },
    });
    expect(updateResult2).toBeCancelledBecause(CommandResult.InvalidDataSet);

    // Out of bounds zone
    const updateResult3 = updatePivot(model, "1", {
      dataSet: { sheetId, zone: { top: 1, left: 1, bottom: 200, right: 200 } },
    });
    expect(updateResult3).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
  });

  test("forbidden characters are removed from new sheet name when duplicating a pivot", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A2", { name: `forbidden: ${FORBIDDEN_SHEETNAME_CHARS}` }, "pivot1");
    model.dispatch("DUPLICATE_PIVOT_IN_NEW_SHEET", {
      newPivotId: "pivot2",
      newSheetId: "Sheet2",
      pivotId: "pivot1",
    });
    expect(model.getters.getSheetName("Sheet2")).toEqual(
      "forbidden:  , , , , , ,  (copy) (Pivot #2)"
    );
    expect(model.getters.getPivotName("pivot2")).toEqual("forbidden: ',*,?,/,\\,[,] (copy)");
  });

  test("sheet names with forbidden characters cannot conflict", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    const name = "forbidden: /";
    renameSheet(model, sheetId, "forbidden:   (copy) (Pivot #2)");
    addPivot(model, "A1:A2", { name }, "pivot1");
    model.dispatch("DUPLICATE_PIVOT_IN_NEW_SHEET", {
      newPivotId: "pivot2",
      newSheetId: "Sheet2",
      pivotId: "pivot1",
    });
    expect(model.getters.getSheetName("Sheet2")).toEqual("forbidden:   (copy) (Pivot #2) (1)");
  });

  test("getPivotCellFromPosition handles falsy arguments for includeColumnTitle", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",
      A2: "Alice",    B2: "10",    
      A3: "Bob",      B3: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [{ name: "Customer" }],
      rows: [{ name: "Price" }],
      measures: [{ name: "__count", aggregator: "sum" }],
    });
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "C1", "=PIVOT(1,,,false)");
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      measure: "__count",
      type: "VALUE",
    });
    setCellContent(model, "C1", "=PIVOT(1,,,0)");
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      measure: "__count",
      type: "VALUE",
    });
    setCellContent(model, "C1", `=PIVOT(1,,,"FALSE")`);
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      measure: "__count",
      type: "VALUE",
    });
    setCellContent(model, "C1", "=PIVOT(1,,,true)");
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      type: "HEADER",
    });
    setCellContent(model, "C1", "=PIVOT(1,,,1)");
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      type: "HEADER",
    });
    setCellContent(model, "C1", `=PIVOT(1,,,"TRUE")`);
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      type: "HEADER",
    });
  });
});
