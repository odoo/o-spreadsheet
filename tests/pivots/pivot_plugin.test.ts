import { setCellContent } from "../test_helpers/commands_helpers";
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
});
