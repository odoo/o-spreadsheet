import { FORBIDDEN_SHEETNAME_CHARS } from "@odoo/o-spreadsheet-engine/constants";
import { EMPTY_PIVOT_CELL } from "@odoo/o-spreadsheet-engine/helpers/pivot/table_spreadsheet_pivot";
import { CommandResult, Model } from "../../src";
import { toZone } from "../../src/helpers";
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
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
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
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    selectCell(model, "C1");
    expect(model.getters.getPivotCellFromPosition(model.getters.getActivePosition())).toMatchObject(
      EMPTY_PIVOT_CELL
    );
  });

  test("Cannot update a pivot with an empty name", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: '=PIVOT(1)',
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    const pivot = model.getters.getPivotCoreDefinition("1");
    expect(
      model.dispatch("UPDATE_PIVOT", { pivotId: "1", pivot: { ...pivot, name: "" } })
    ).toBeCancelledBecause(CommandResult.EmptyName);
  });

  test("cannot create a pivot with duplicated measure ids", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    const creationResult = addPivot(model, "A1:A2", {
      measures: [
        { id: "Customer", fieldName: "Customer", aggregator: "sum" },
        {
          id: "Customer",
          fieldName: "Customer",
          computedBy: { formula: "=42", sheetId },
          aggregator: "sum",
        },
      ],
    });
    expect(creationResult.isSuccessful).toBe(false);
  });

  test("sortedColumn must be in the measures", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30",
    };
    const model = createModelFromGrid(grid);
    const creationResult = addPivot(model, "A1:A2", {
      measures: [{ id: "Customer:sum", fieldName: "Customer", aggregator: "sum" }],
      sortedColumn: {
        domain: [],
        order: "asc",
        measure: "Price",
      },
    });
    expect(creationResult).toBeCancelledBecause(CommandResult.InvalidDefinition);
  });

  test("cannot update a pivot with duplicated measure ids", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [],
    });
    const updateResult = updatePivot(model, "1", {
      measures: [
        {
          id: "Calculated 1",
          fieldName: "Calculated 1",
          computedBy: { formula: "=42", sheetId },
          aggregator: "sum",
        },
        {
          id: "Calculated 1",
          fieldName: "Calculated 1",
          computedBy: { formula: "=43", sheetId },
          aggregator: "sum",
        },
      ],
    });
    expect(updateResult.isSuccessful).toBe(false);
  });

  test("can generate unique calculated measure", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [{ id: "Customer", fieldName: "Customer", aggregator: "sum" }],
    });
    let definition = model.getters.getPivotCoreDefinition("1");
    const firstCalculatedName = model.getters.generateNewCalculatedMeasureName(definition.measures);
    expect(firstCalculatedName).toBe("Calculated measure 1");

    updatePivot(model, "1", {
      measures: [
        {
          id: firstCalculatedName,
          fieldName: firstCalculatedName,
          computedBy: { formula: "=42", sheetId },
          aggregator: "sum",
        },
      ],
    });
    definition = model.getters.getPivotCoreDefinition("1");
    const secondCalculatedName = model.getters.generateNewCalculatedMeasureName(
      definition.measures
    );
    expect(secondCalculatedName).toBe("Calculated measure 2");

    updatePivot(model, "1", {
      measures: [
        {
          id: secondCalculatedName,
          fieldName: secondCalculatedName,
          computedBy: { formula: "=42", sheetId },
          aggregator: "sum",
        },
      ],
    });
    definition = model.getters.getPivotCoreDefinition("1");
    const thirdCalculatedName = model.getters.generateNewCalculatedMeasureName(definition.measures);
    expect(thirdCalculatedName).toBe("Calculated measure 1");
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
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    selectCell(model, "C5");
    expect(model.getters.getPivotCellFromPosition(model.getters.getActivePosition())).toEqual(
      EMPTY_PIVOT_CELL
    );
  });

  test("getPivotCellFromPosition can handle vectorization", () => {
    // prettier-ignore
    const grid = {
      A1: "Stage", B1: "Price", C1: '=PIVOT.VALUE(1,"Price","Stage",SEQUENCE(2))',
      A2: "1",     B2: "10",
      A3: "2",     B3: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    selectCell(model, "C1");
    expect(model.getters.getPivotCellFromPosition(model.getters.getActivePosition())).toMatchObject(
      {
        domain: [{ field: "Stage", type: "integer", value: 1 }],
      }
    );
    selectCell(model, "C2");
    expect(model.getters.getPivotCellFromPosition(model.getters.getActivePosition())).toMatchObject(
      {
        domain: [{ field: "Stage", type: "integer", value: 2 }],
      }
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

  test("cannot add a pivot with an existing id", () => {
    const model = new Model();
    const createResult1 = addPivot(model, "A1:A2", {}, "1");
    expect(createResult1.isSuccessful).toBe(true);
    const createResult2 = addPivot(model, "A1:A2", {}, "1");
    expect(createResult2).toBeCancelledBecause(CommandResult.PivotIdTaken);
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
      columns: [{ fieldName: "Customer" }],
      rows: [{ fieldName: "Price" }],
      measures: [{ id: "testCount", fieldName: "__count", aggregator: "sum" }],
    });
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "C1", "=PIVOT(1,,,false)");
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      type: "MEASURE_HEADER",
    });
    setCellContent(model, "C1", "=PIVOT(1,,,false,,false)");
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      measure: "testCount",
      type: "VALUE",
    });
    setCellContent(model, "C1", "=PIVOT(1,,,0)");
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      type: "MEASURE_HEADER",
    });
    setCellContent(model, "C1", "=PIVOT(1,,,0,,0)");
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      measure: "testCount",
      type: "VALUE",
    });
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      measure: "testCount",
      type: "VALUE",
    });
    setCellContent(model, "C1", `=PIVOT(1,,,"FALSE")`);
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      type: "MEASURE_HEADER",
    });
    setCellContent(model, "C1", `=PIVOT(1,,,"FALSE",,"FALSE")`);
    expect(model.getters.getPivotCellFromPosition(toCellPosition(sheetId, "D1"))).toMatchObject({
      measure: "testCount",
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

  test("getPivotCellFromPosition handles both the pivot style and the function arguments", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [{ fieldName: "Customer" }],
      rows: [{ fieldName: "Price" }],
      measures: [{ id: "testCount", fieldName: "__count", aggregator: "sum" }],
    });
    const D1 = toCellPosition(model.getters.getActiveSheetId(), "D1");

    setCellContent(model, "C1", "=PIVOT(1)");
    expect(model.getters.getPivotCellFromPosition(D1)).toMatchObject({ type: "HEADER" });

    updatePivot(model, "1", { style: { displayColumnHeaders: false } });
    expect(model.getters.getPivotCellFromPosition(D1)).toMatchObject({ type: "MEASURE_HEADER" });

    setCellContent(model, "C1", "=PIVOT(1,,,TRUE)");
    expect(model.getters.getPivotCellFromPosition(D1)).toMatchObject({ type: "HEADER" });
  });

  test("DUPLICATE_PIVOT_IN_NEW_SHEET is prevented if the pivot is in error", () => {
    const model = new Model();
    addPivot(model, "A1:A2", {}, "pivot1");
    const result = model.dispatch("DUPLICATE_PIVOT_IN_NEW_SHEET", {
      newPivotId: "pivot2",
      newSheetId: "Sheet2",
      pivotId: "pivot1",
    });
    expect(result).toBeCancelledBecause(CommandResult.PivotInError);
  });
});
