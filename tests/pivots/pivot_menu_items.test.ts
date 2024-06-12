import { Model, SpreadsheetChildEnv } from "../../src";
import { cellMenuRegistry } from "../../src/registries";
import { selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { getCellText, getEvaluatedGrid } from "../test_helpers/getters_helpers";
import { createModelFromGrid, makeTestEnv } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

describe("Pivot menu items", () => {
  let model: Model;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    env = makeTestEnv();
    model = env.model;
  });
  test("It should not display pivot_properties if there is no pivot in the cell", () => {
    selectCell(model, "A1");
    expect(model.getters.getPivotIdFromPosition(model.getters.getActivePosition())).toBeUndefined();
    expect(cellMenuRegistry.get("pivot_properties").isVisible!(env)).toBe(false);
  });

  test("It should display pivot_properties if there is a pivot in the cell", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    setCellContent(model, "A1", `=PIVOT("1")`);
    expect(model.getters.getPivotIdFromPosition(model.getters.getActivePosition())).toBe("1");
    expect(cellMenuRegistry.get("pivot_properties").isVisible!(env)).toBe(true);
  });

  test("It should not display pivot_properties if the pivot does not exist", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    setCellContent(model, "A1", `=PIVOT("2")`);
    expect(model.getters.getPivotIdFromPosition(model.getters.getActivePosition())).toBeUndefined();
    expect(cellMenuRegistry.get("pivot_properties").isVisible!(env)).toBe(false);
  });

  test("It should display pivot_properties if there are multiple pivots in the cell", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    addPivot(model, "M1:N1", {}, "2");
    setCellContent(model, "A1", `=PIVOT("1") + PIVOT("2")`);
    expect(model.getters.getPivotIdFromPosition(model.getters.getActivePosition())).toBe("1");
    expect(cellMenuRegistry.get("pivot_properties").isVisible!(env)).toBe(true);
  });

  test("It should open the pivot side panel when clicking on pivot_properties", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    setCellContent(model, "A1", `=PIVOT("1")`);
    const openSidePanel = jest.spyOn(env, "openSidePanel");
    cellMenuRegistry.get("pivot_properties").execute!(env);
    expect(openSidePanel).toHaveBeenCalledWith("PivotSidePanel", { pivotId: "1" });
  });

  test("It should open the pivot side panel when clicking on pivot_properties with the first pivot id", () => {
    selectCell(model, "A1");
    addPivot(model, "M1:N1", {}, "1");
    addPivot(model, "M1:N1", {}, "2");
    setCellContent(model, "A1", `=PIVOT("1") + PIVOT("2")`);
    const openSidePanel = jest.spyOn(env, "openSidePanel");
    cellMenuRegistry.get("pivot_properties").execute!(env);
    expect(openSidePanel).toHaveBeenCalledWith("PivotSidePanel", { pivotId: "1" });
  });

  test("It should fix formula when clicking on pivot_fix_formulas", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Product",  C1: "Quantity", D1: "Amount", E1: "Date",
      A2: "Alice",    B2: "Jambon",   C2: "2",        D2: "10",     E2: "2/4/2023",
      A3: "Bob",      B3: "Poulet",   C3: "3",        D3: "20",     E3: "1/1/2024",
      A4: "Charlie",  B4: "Jambon",   C4: "1",        D4: "5",      E4: "1/4/2024",
      A5: "Alice",    B5: "Tabouret", C5: "5",        D5: "50",     E5: "5/5/2024",
      A6: "Bob",      B6: "Tabouret", C6: "4",        D6: "40",     E6: "12/31/2024",
      A8: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const env = makeTestEnv({ model });
    addPivot(model, "A1:E6", {
      columns: [{ name: "Customer", order: "asc" }],
      rows: [{ name: "Date", order: "asc", granularity: "month_number" }],
      measures: [{ name: "Amount", aggregator: "sum" }],
    });
    // Zone of the pivot is from A8 to E14
    selectCell(model, "B8");
    cellMenuRegistry.get("pivot_fix_formulas").execute!(env);

    // prettier-ignore
    expect(getEvaluatedGrid(model, "A8:E14")).toEqual([
      ["",         "Alice",  "Bob",    "Charlie", "Total"],
      ["",         "Amount", "Amount", "Amount",  "Amount"],
      ["January",  "",       "20",     "5",       "25"],
      ["February", "10",     "",       "",        "10"],
      ["May",      "50",     "",       "",        "50"],
      ["December", "",       "40",     "",        "40"],
      ["Total",    "60",     "60",     "5",       "125"],
    ]);

    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(getEvaluatedGrid(model, "A8:E14")).toEqual([
      [
        "",
        `=PIVOT.HEADER(1,"Customer","Alice")`,
        `=PIVOT.HEADER(1,"Customer","Bob")`,
        `=PIVOT.HEADER(1,"Customer","Charlie")`,
        "=PIVOT.HEADER(1)",
      ],
      [
        "",
        `=PIVOT.HEADER(1,"Customer","Alice","measure","Amount")`,
        `=PIVOT.HEADER(1,"Customer","Bob","measure","Amount")`,
        `=PIVOT.HEADER(1,"Customer","Charlie","measure","Amount")`,
        `=PIVOT.HEADER(1,"measure","Amount")`,
      ],
      [
        `=PIVOT.HEADER(1,"Date:month_number",1)`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",1,"Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",1,"Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",1,"Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",1)`,
      ],
      [
        `=PIVOT.HEADER(1,"Date:month_number",2)`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",2,"Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",2,"Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",2,"Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",2)`,
      ],
      [
        `=PIVOT.HEADER(1,"Date:month_number",5)`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",5,"Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",5,"Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",5,"Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",5)`,
      ],
      [
        `=PIVOT.HEADER(1,"Date:month_number",12)`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",12,"Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",12,"Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",12,"Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount","Date:month_number",12)`,
      ],
      [
        `=PIVOT.HEADER(1)`,
        `=PIVOT.VALUE(1,"Amount","Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount","Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount","Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount")`,
      ],
    ]);
  });

  test("It should not fix formula when the pivot is not valid", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ name: "Invalid" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    const env = makeTestEnv({ model });
    const pivot = model.getters.getPivot("1")!;
    expect(pivot.isValid()).toBe(false);
    selectCell(model, "C1");
    cellMenuRegistry.get("pivot_fix_formulas").execute!(env);
    expect(getCellText(model, "C1")).toBe("=PIVOT(1)");
  });
});
