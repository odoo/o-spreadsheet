import { FORBIDDEN_SHEET_CHARS } from "../../src/constants";
import { EMPTY_PIVOT_CELL } from "../../src/helpers/pivot/table_spreadsheet_pivot";
import { renameSheet, selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { createModelFromGrid, toCellPosition } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

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

  test("forbidden characters are removed from new sheet name when duplicating a pivot", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A2", { name: `forbidden: ${FORBIDDEN_SHEET_CHARS}` }, "pivot1");
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
});
