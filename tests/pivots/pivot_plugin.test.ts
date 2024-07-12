import { setCellContent } from "../test_helpers/commands_helpers";
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
});
