import { Model, SpreadsheetChildEnv } from "../../src";
import { PIVOT_TABLE_CONFIG } from "../../src/constants";
import { toCartesian, toZone } from "../../src/helpers";
import { cellMenuRegistry, topbarMenuRegistry } from "../../src/registries";
import {
  createSheet,
  createTable,
  redo,
  selectCell,
  setCellContent,
  setSelection,
  undo,
} from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellText,
  getCoreTable,
  getEvaluatedGrid,
  getTable,
} from "../test_helpers/getters_helpers";
import { createModelFromGrid, doAction, getNode, makeTestEnv } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

const reinsertDynamicPivotPath = ["data", "reinsert_dynamic_pivot", "reinsert_dynamic_pivot_1"];
const reinsertStaticPivotPath = ["data", "reinsert_static_pivot", "reinsert_static_pivot_1"];
const insertPivotPath = ["insert", "insert_pivot"];

describe("Pivot properties menu item", () => {
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
});

describe("Pivot fix formula menu item", () => {
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
      columns: [{ fieldName: "Customer", order: "asc" }],
      rows: [{ fieldName: "Date", order: "asc", granularity: "month_number" }],
      measures: [{ id: "Amount:sum", fieldName: "Amount", aggregator: "sum" }],
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
        `=PIVOT.HEADER(1,"Customer","Alice","measure","Amount:sum")`,
        `=PIVOT.HEADER(1,"Customer","Bob","measure","Amount:sum")`,
        `=PIVOT.HEADER(1,"Customer","Charlie","measure","Amount:sum")`,
        `=PIVOT.HEADER(1,"measure","Amount:sum")`,
      ],
      [
        `=PIVOT.HEADER(1,"Date:month_number",1)`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",1,"Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",1,"Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",1,"Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",1)`,
      ],
      [
        `=PIVOT.HEADER(1,"Date:month_number",2)`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",2,"Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",2,"Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",2,"Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",2)`,
      ],
      [
        `=PIVOT.HEADER(1,"Date:month_number",5)`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",5,"Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",5,"Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",5,"Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",5)`,
      ],
      [
        `=PIVOT.HEADER(1,"Date:month_number",12)`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",12,"Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",12,"Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",12,"Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount:sum","Date:month_number",12)`,
      ],
      [
        `=PIVOT.HEADER(1)`,
        `=PIVOT.VALUE(1,"Amount:sum","Customer","Alice")`,
        `=PIVOT.VALUE(1,"Amount:sum","Customer","Bob")`,
        `=PIVOT.VALUE(1,"Amount:sum","Customer","Charlie")`,
        `=PIVOT.VALUE(1,"Amount:sum")`,
      ],
    ]);
  });

  test("It should correctly manage empty values while fixing formulas", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Amount", C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "",         B3: "20",
    };
    const model = createModelFromGrid(grid);
    const env = makeTestEnv({ model });
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer", order: "asc" }],
      measures: [{ fieldName: "Amount", aggregator: "sum", id: "Amount:sum" }],
    });

    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:D4")).toEqual([
      ["(#1) Pivot", "Total"],
      ["",              "Amount"],
      ["Alice",         "10",],
      ["(Undefined)",   "20"],
    ]);

    selectCell(model, "C2");
    cellMenuRegistry.get("pivot_fix_formulas").execute!(env);

    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:D4")).toEqual([
      ["",            "Total"],
      ["",            "Amount"],
      ["Alice",       "10",],
      ["(Undefined)", "20"],
    ]);

    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(getEvaluatedGrid(model, "C3:D4")).toEqual([
      [`=PIVOT.HEADER(1,"Customer","Alice")`, `=PIVOT.VALUE(1,"Amount:sum","Customer","Alice")`],
      [`=PIVOT.HEADER(1,"Customer","null")`, `=PIVOT.VALUE(1,"Amount:sum","Customer","null")`],
    ]);
  });

  test("it also adapts the dynamic table linked to the pivot", () => {
    // prettier-ignore
    const grid = {
     A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
     A2: "Alice",    B2: "10",
     A3: "Bob",      B3: "30",
   };
    const model = createModelFromGrid(grid);
    const env = makeTestEnv({ model });

    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    selectCell(model, "C1");
    createTable(model, "C1", {}, "dynamic");
    const sheetId = model.getters.getActiveSheetId();
    const activePosition = model.getters.getActivePosition();
    expect(model.getters.getCoreTable(activePosition)).toMatchObject({
      type: "dynamic",
      range: model.getters.getRangeFromSheetXC(sheetId, "C1"),
    });

    selectCell(model, "C1");
    cellMenuRegistry.get("pivot_fix_formulas").execute!(env);

    expect(model.getters.getCoreTable(activePosition)).toMatchObject({
      type: "static",
      range: model.getters.getRangeFromSheetXC(sheetId, "C1:D5"),
    });
  });

  test("It should fix formulas with computed measure when clicking on pivot_fix_formulas", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    const env = makeTestEnv({ model });
    addPivot(model, "A1:A2", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          computedBy: { sheetId, formula: "=42" },
          aggregator: "sum",
        },
      ],
    });
    // Zone of the pivot is from A8 to E14
    selectCell(model, "A3");
    cellMenuRegistry.get("pivot_fix_formulas").execute?.(env);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A3:B6")).toEqual([
      ["",      "Total"],
      ["",      "calculated"],
      ["Alice", "42"],
      ["Total", "42"],
    ]);

    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(getEvaluatedGrid(model, "A3:B6")).toEqual([
      ["", "=PIVOT.HEADER(1)"],
      ["", '=PIVOT.HEADER(1,"measure","calculated")'],
      ['=PIVOT.HEADER(1,"Customer","Alice")', '=PIVOT.VALUE(1,"calculated","Customer","Alice")'],
      ["=PIVOT.HEADER(1)", '=PIVOT.VALUE(1,"calculated")'],
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
      rows: [{ fieldName: "Invalid" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    const env = makeTestEnv({ model });
    const pivot = model.getters.getPivot("1")!;
    expect(pivot.isValid()).toBe(false);
    selectCell(model, "C1");
    cellMenuRegistry.get("pivot_fix_formulas").execute!(env);
    expect(getCellText(model, "C1")).toBe("=PIVOT(1)");
  });

  test("It should ignore hidden measures", () => {
    const grid = {
      A1: "Price",
      A2: "10",
      A3: "30",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A3", {
      columns: [],
      rows: [],
      measures: [
        { id: "Price:sum", fieldName: "Price", aggregator: "sum", isHidden: true },
        {
          id: "double:sum",
          fieldName: "double",
          aggregator: "sum",
          computedBy: {
            sheetId,
            formula: "=2*Price",
          },
        },
      ],
    });
    const env = makeTestEnv({ model });
    selectCell(model, "A4");
    cellMenuRegistry.get("pivot_fix_formulas").execute?.(env);
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });

    // prettier-ignore
    expect(getEvaluatedGrid(model, "A4:B6")).toEqual([
      ["",                  "=PIVOT.HEADER(1)"],
      ["",                  '=PIVOT.HEADER(1,"measure\","double:sum")',],
      ["=PIVOT.HEADER(1)",  '=PIVOT.VALUE(1,"double:sum")'],
    ]);
  });

  test("Fixing the formula take into account the arguments of PIVOT()", () => {
    // prettier-ignore
    const grid = {
     A1: "Customer", B1: "Price", C1: "Date",     E1: "=PIVOT(1, 1, false, false, 1)",
     A2: "Alice",    B2: "10",    C2: "2/4/2023",
     A3: "Bob",      B3: "30",    C3: "1/1/2024",
   };
    const model = createModelFromGrid(grid);
    const env = makeTestEnv({ model });

    addPivot(model, "A1:C3", {
      columns: [{ fieldName: "Customer" }],
      rows: [{ fieldName: "Date", granularity: "year" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    createTable(model, "E1", {}, "dynamic");

    selectCell(model, "E1");
    cellMenuRegistry.get("pivot_fix_formulas").execute!(env);

    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(getEvaluatedGrid(model, "E1:F1")).toEqual([
      [
        `=PIVOT.HEADER(1,"Date:year",2023)`,
        `=PIVOT.VALUE(1,"Price:sum","Date:year",2023,"Customer","Alice")`,
      ],
    ]);
    expect(model.getters.getCoreTable(model.getters.getActivePosition())).toMatchObject({
      type: "static",
      range: { zone: toZone("E1:F1") },
    });
  });
});

describe("Pivot reinsertion menu item", () => {
  describe("Dynamic pivots", () => {
    test("Reinsert a dynamic pivot", () => {
      // prettier-ignore
      const grid = {
            A1: "Customer", B1: "Quantity",
            A2: "Alice",    B2: "Jambon",
          };
      const model = createModelFromGrid(grid);
      addPivot(model, "A1:B2", {
        columns: [],
        rows: [{ fieldName: "Customer" }],
        measures: [{ id: "Quantity:sum", fieldName: "Quantity", aggregator: "sum" }],
      });
      const env = makeTestEnv({ model });
      selectCell(model, "B8");
      doAction(reinsertDynamicPivotPath, env, topbarMenuRegistry);
      expect(getCellText(model, "B8")).toEqual(`=PIVOT(1)`);
      expect(
        model.getters.getCoreTable({
          sheetId: model.getters.getActiveSheetId(),
          ...toCartesian("B8"),
        })
      ).toMatchObject({
        range: { zone: toZone("B8") },
        config: { numberOfHeaders: 1, automaticAutofill: true },
        type: "dynamic",
      });
    });

    test("Reinsert a dynamic pivot in a sheet too small", () => {
      // prettier-ignore
      const grid = {
            A1: "Customer", B1: "Quantity",
            A2: "Alice",    B2: "Jambon",
          };
      const model = createModelFromGrid(grid);
      addPivot(model, "A1:B2", {
        columns: [],
        rows: [{ fieldName: "Customer" }],
        measures: [{ id: "Quantity:sum", fieldName: "Quantity", aggregator: "sum" }],
      });
      createSheet(model, { sheetId: "smallSheet", rows: 1, cols: 1, activate: true });
      const env = makeTestEnv({ model });
      doAction(reinsertDynamicPivotPath, env, topbarMenuRegistry);
      expect(getCellText(model, "A1")).toEqual(`=PIVOT(1)`);
      expect(model.getters.getPivot(model.getters.getPivotId("1")!).isValid()).toBeTruthy();
      expect(model.getters.getNumberCols("smallSheet")).toEqual(2);
      expect(model.getters.getNumberRows("smallSheet")).toEqual(4); // title, col group, row header, total
    });

    test("undo pivot reinsertion", () => {
      // prettier-ignore
      const grid = {
            A1: "Customer", B1: "Quantity",
            A2: "Alice",    B2: "Jambon",
          };
      const model = createModelFromGrid(grid);
      addPivot(model, "A1:B2", {
        columns: [],
        rows: [{ fieldName: "Customer" }],
        measures: [{ id: "Quantity:sum", fieldName: "Quantity", aggregator: "sum" }],
      });
      const env = makeTestEnv({ model });
      selectCell(model, "B8");
      doAction(reinsertDynamicPivotPath, env, topbarMenuRegistry);
      expect(getCellText(model, "B8")).toEqual(`=PIVOT(1)`);
      expect(getTable(model, "B8")).toBeDefined();
      undo(model);
      expect(getCell(model, "B8")).toBeUndefined();
      expect(getTable(model, "B8")).toBeUndefined();
      redo(model);
      expect(getCellText(model, "B8")).toEqual(`=PIVOT(1)`);
      expect(getTable(model, "B8")).toBeDefined();
    });
  });

  describe("Static pivots", () => {
    test("Reinsert a static pivot", () => {
      // prettier-ignore
      const grid = {
            A1: "Customer", B1: "Quantity",
            A2: "Alice",    B2: "Jambon",
          };
      const model = createModelFromGrid(grid);
      addPivot(model, "A1:B2", {
        columns: [],
        rows: [{ fieldName: "Customer" }],
        measures: [{ id: "Quantity:sum", fieldName: "Quantity", aggregator: "sum" }],
      });
      const env = makeTestEnv({ model });
      selectCell(model, "B8");
      doAction(reinsertStaticPivotPath, env, topbarMenuRegistry);
      expect(getCellText(model, "B10")).toEqual(`=PIVOT.HEADER(1,"Customer","Alice")`);
      expect(
        model.getters.getCoreTable({
          sheetId: model.getters.getActiveSheetId(),
          ...toCartesian("B8"),
        })
      ).toMatchObject({
        range: { zone: toZone("B8:C11") },
        config: { numberOfHeaders: 1, automaticAutofill: true },
        type: "static",
      });
    });

    test("Reinsert a static pivot in a sheet too small", () => {
      // prettier-ignore
      const grid = {
            A1: "Customer", B1: "Quantity",
            A2: "Alice",    B2: "Jambon",
          };
      const model = createModelFromGrid(grid);
      addPivot(model, "A1:B2", {
        columns: [],
        rows: [{ fieldName: "Customer" }],
        measures: [{ id: "Quantity:sum", fieldName: "Quantity", aggregator: "sum" }],
      });
      createSheet(model, { sheetId: "smallSheet", rows: 1, cols: 1, activate: true });
      const env = makeTestEnv({ model });
      doAction(reinsertStaticPivotPath, env, topbarMenuRegistry);
      expect(getCellText(model, "A3")).toEqual(`=PIVOT.HEADER(1,"Customer","Alice")`);
      expect(model.getters.getPivot(model.getters.getPivotId("1")!).isValid()).toBeTruthy();
      expect(model.getters.getNumberCols("smallSheet")).toEqual(2);
      expect(model.getters.getNumberRows("smallSheet")).toEqual(4); // title, col group, row header, total
    });

    test("undo pivot reinsertion", () => {
      // prettier-ignore
      const grid = {
            A1: "Customer", B1: "Quantity",
            A2: "Alice",    B2: "Jambon",
          };
      const model = createModelFromGrid(grid);
      addPivot(model, "A1:B2", {
        columns: [],
        rows: [{ fieldName: "Customer" }],
        measures: [{ id: "Quantity:sum", fieldName: "Quantity", aggregator: "sum" }],
      });
      const env = makeTestEnv({ model });
      selectCell(model, "B8");
      doAction(reinsertStaticPivotPath, env, topbarMenuRegistry);
      expect(getCellText(model, "B10")).toEqual(`=PIVOT.HEADER(1,"Customer","Alice")`);
      expect(getTable(model, "B10")).toBeDefined();
      undo(model);
      expect(getCell(model, "B10")).toBeUndefined();
      expect(getTable(model, "B10")).toBeUndefined();
      redo(model);
      expect(getCellText(model, "B10")).toEqual(`=PIVOT.HEADER(1,"Customer","Alice")`);
      expect(getTable(model, "B10")).toBeDefined();
    });
  });

  test("Reinsert pivot menu item should be hidden if the pivot is invalid", () => {
    // prettier-ignore
    const grid = {
          A1: "", B1: "Quantity",
          A2: "Alice",    B2: "Jambon",
        };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B2", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "quantity:sum", fieldName: "Quantity", aggregator: "sum" }],
    });
    const env = makeTestEnv({ model });
    selectCell(model, "B8");
    expect(model.getters.getPivot("1")!.isValid()).toBeFalsy();
    expect(getNode(reinsertDynamicPivotPath, env, topbarMenuRegistry).isVisible(env)).toBeFalsy();
    expect(getNode(reinsertStaticPivotPath, env, topbarMenuRegistry).isVisible(env)).toBeFalsy();
  });

  test("Verify re-insert pivot menu items invisibility when no pivots present", () => {
    const reinsertStaticPivotPath = ["data", "reinsert_static_pivot"];
    const reinsertDynamicPivotPath = ["data", "reinsert_dynamic_pivot"];

    // prettier-ignore
    const grid = {
            A1: "Customer", B1: "Quantity",
            A2: "Alice",    B2: "Jambon",
          };
    const model = createModelFromGrid(grid);
    const env = makeTestEnv({ model });

    expect(getNode(reinsertDynamicPivotPath, env, topbarMenuRegistry).isVisible(env)).toBeFalsy();
    expect(getNode(reinsertStaticPivotPath, env, topbarMenuRegistry).isVisible(env)).toBeFalsy();

    addPivot(model, "A1:B2", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "quantity:sum", fieldName: "Quantity", aggregator: "sum" }],
    });

    expect(getNode(reinsertDynamicPivotPath, env, topbarMenuRegistry).isVisible(env)).toBeTruthy();
    expect(getNode(reinsertStaticPivotPath, env, topbarMenuRegistry).isVisible(env)).toBeTruthy();
  });

  test("Insert a pivot", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const env = makeTestEnv({ model });
    setSelection(model, ["A1:B2"]);
    doAction(insertPivotPath, env, topbarMenuRegistry);
    expect(model.getters.getActiveSheetId()).not.toEqual(sheetId);
    expect(model.getters.getPivotIds()).toHaveLength(1);
    expect(getCellText(model, "A1")).toEqual(`=PIVOT(1)`);
    expect(getCoreTable(model, "A1")).toMatchObject({
      range: { zone: toZone("A1") },
      config: PIVOT_TABLE_CONFIG,
      type: "dynamic",
    });
  });
});
