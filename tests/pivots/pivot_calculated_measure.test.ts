import {
  activateSheet,
  addColumns,
  createSheet,
  deleteSheet,
  renameSheet,
  setCellContent,
  setFormat,
} from "../test_helpers/commands_helpers";
import { getEvaluatedCell, getEvaluatedGrid } from "../test_helpers/getters_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";
import { addPivot, updatePivot } from "../test_helpers/pivot_helpers";

describe("Pivot calculated measure", () => {
  test("can reference another measure", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "Price times 2",
          fieldName: "Price times 2",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:E3")).toEqual([
      ["(#1) Pivot", "Total", ""],
      ["",           "Price", "Price times 2"],
      ["Total",      "10",    "20"],
    ]);
  });

  test("can reference another measure with a space in its name", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Expected revenue",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        { id: "Expected revenue", fieldName: "Expected revenue", aggregator: "sum" },
        {
          id: "Revenue times 2",
          fieldName: "Revenue times 2",
          aggregator: "sum",
          computedBy: { formula: "='Expected revenue'*2", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:E3")).toEqual([
      ["(#1) Pivot", "Total",             ""],
      ["",           "Expected revenue",  "Revenue times 2"],
      ["Total",      "10",                "20"],
    ]);
  });

  test("cannot reference an unused measure", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "D2").value).toEqual("calculated");
    expect(getEvaluatedCell(model, "D3").value).toEqual("#ERROR");
    expect(getEvaluatedCell(model, "D3").message).toEqual("Field Price is not a measure");
  });

  test("cannot reference a measure which does not exist", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: '=PIVOT.VALUE(1, "calculated")',
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual("#ERROR");
    expect(getEvaluatedCell(model, "A3").message).toEqual("Field Price is not a measure");
    expect(getEvaluatedGrid(model, "A4:B6")).toEqual([
      ["(#1) Pivot", "Total"],
      ["", "calculated"],
      ["Total", "#ERROR"],
    ]);
  });

  test("can reference and aggregate row dimensions", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Category",
      A2: "Alice",    B2: "10",     C2: "Food",
      A3: "Bob",      B3: "10",     C3: "Food",
      A4: "Alice",    B4: "10",     C4: "Drink",
      A5: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C4", {
      rows: [{ fieldName: "Customer" }, { fieldName: "Category" }],
      measures: [
        {
          id: "calc Customer",
          fieldName: "calc Customer",
          aggregator: "count_distinct",
          computedBy: { formula: "=Customer", sheetId },
        },
        {
          id: "calc Category",
          fieldName: "calc Category",
          aggregator: "count_distinct",
          computedBy: { formula: "=Category", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A5:C12")).toEqual(
      [
        ["(#1) Pivot",      "Total",          "",],
        ["",                "calc Customer",  "calc Category"],
        ["Alice",           "1",              "2"],
        ["    Food",        "Alice",          "Food"],
        ["    Drink",       "Alice",          "Drink"],
        ["Bob",             "1",              "1"],
        ["    Food",        "Bob",            "Food"],
        ["Total",           "2",              "2"],
      ]
    );
  });

  test("can reference and aggregate column dimensions", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Category",
      A2: "Alice",    B2: "10",     C2: "Food",
      A3: "Bob",      B3: "10",     C3: "Food",
      A4: "Alice",    B4: "10",     C4: "Drink",
      A5: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C4", {
      columns: [{ fieldName: "Customer" }, { fieldName: "Category" }],
      measures: [
        {
          id: "calc Cust",
          fieldName: "calc Cust",
          aggregator: "count_distinct",
          computedBy: { formula: "=Customer", sheetId },
        },
        {
          id: "calc Categ",
          fieldName: "calc Categ",
          aggregator: "count_distinct",
          computedBy: { formula: "=Category", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A5:I8")).toEqual(
      [
        ["(#1) Pivot",  "Alice",      "",           "",           "",           "Bob",        "",           "",           ""],
        ["",            "Food",       "",           "Drink",      "",           "Food",       "",           "Total",      ""],
        ["",            "calc Cust",  "calc Categ", "calc Cust",  "calc Categ", "calc Cust",  "calc Categ", "calc Cust",  "calc Categ"],
        ["Total",       "Alice",      "Food",       "Alice",      "Drink",      "Bob",        "Food",       "2",          "2"],
      ]
    );
  });

  test("aggregate row measures with a column group", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Category",
      A2: "Alice",    B2: "10",     C2: "Food",
      A3: "Bob",      B3: "10",     C3: "Food",
      A4: "Alice",    B4: "10",     C4: "Drink",
      A5: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C4", {
      columns: [{ fieldName: "Customer" }],
      rows: [{ fieldName: "Category" }],
      measures: [
        {
          id: "calc Customer",
          fieldName: "calc Customer",
          aggregator: "count_distinct",
          computedBy: { formula: "=Customer", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A5:D9")).toEqual(
      [
        ["(#1) Pivot",  "Alice",          "Bob",            "Total"],
        ["",            "calc Customer",  "calc Customer",  "calc Customer"],
        ["Food",        "Alice",          "Bob",            "2"],
        ["Drink",       "Alice",          "Bob",            "2"],
        ["Total",       "1",              "1",              "2"],
      ]
    );
  });

  test("calculated measure without (sub)totals aggregates", () => {
    // prettier-ignore
    const grid = {
      A1: "Product", B1: "Price",  C1: "Margin",
      A2: "Table",   B2: "1000",   C2: "200",
      A3: "Chair",   B3: "100",    C3: "50",
      A5: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C3", {
      columns: [],
      rows: [{ fieldName: "Product" }],
      measures: [
        { id: "Price:sum", fieldName: "Price", aggregator: "sum" },
        { id: "Margin:sum", fieldName: "Margin", aggregator: "sum" },
        {
          id: "percent_margin",
          fieldName: "% Margin",
          aggregator: "",
          computedBy: { formula: "='Margin:sum'/'Price:sum'", sheetId },
          format: "0.00%",
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A6:D9")).toEqual(
      [
        ["",      "Price",  "Margin", "% Margin"],
        ["Table", "1000",   "200",    "20.00%"],
        ["Chair", "100",    "50",     "50.00%"],
        ["Total", "1100",   "250",    "22.73%"],
      ]
    );
  });

  test("row header value is #N/A in formula in totals without aggregates", () => {
    // prettier-ignore
    const grid = {
      A1: "Product", B1: "Color",
      A2: "Table",   B2: "black",
      A3: "Chair",   B3: "blue",
      A5: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B3", {
      rows: [{ fieldName: "Product" }, { fieldName: "Color" }],
      measures: [
        {
          id: "p",
          fieldName: "p",
          aggregator: "",
          computedBy: { formula: "=Product", sheetId },
        },
        {
          id: "c",
          fieldName: "c",
          aggregator: "",
          computedBy: { formula: "=Color", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A6:C11")).toEqual(
      [
        ["",          "p",      "c",],
        ["Table",     "Table",  "#N/A"],
        ["    black", "Table",  "black"],
        ["Chair",     "Chair",  "#N/A"],
        ["    blue",  "Chair",  "blue"],
        ["Total",     "#N/A",   "#N/A"],
      ]
    );
  });

  test("col header value is #N/A in formula in totals without aggregates", () => {
    // prettier-ignore
    const grid = {
      A1: "Product", B1: "Color",
      A2: "Table",   B2: "black",
      A3: "Chair",   B3: "blue",
      A5: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B3", {
      columns: [{ fieldName: "Product" }, { fieldName: "Color" }],
      rows: [],
      measures: [
        {
          id: "p",
          fieldName: "p",
          aggregator: "",
          computedBy: { formula: "=Product", sheetId },
        },
        {
          id: "c",
          fieldName: "c",
          aggregator: "",
          computedBy: { formula: "=Color", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A5:G8")).toEqual(
      [
        ["(#1) Pivot",  "Table",  "",       "Chair",  "",     "",     ""],
        ["",            "black",  "",       "blue",   "",     "Total",""],
        ["",            "p",      "c",      "p",      "c",    "p",    "c"],
        ["Total",       "Table",  "black",  "Chair",  "blue", "#N/A", "#N/A"],
      ]
    );
  });

  test("aggregate intermediary row aggregates in a column group", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Category",
      A2: "Alice",    B2: "10",     C2: "Food",
      A3: "Alice",    B3: "10",     C3: "Food",
      A4: "Alice",    B4: "10",     C4: "Drink",
      A5: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C4", {
      columns: [{ fieldName: "Price" }],
      rows: [{ fieldName: "Customer" }, { fieldName: "Category" }],
      measures: [
        {
          id: "calc Category",
          fieldName: "calc Category",
          aggregator: "count_distinct",
          computedBy: { formula: "=Category", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A5:C10")).toEqual(
      [
        ["(#1) Pivot",      "10",             "Total"],
        ["",                "calc Category",  "calc Category"],
        ["Alice",           "2",              "2"],
        ["    Food",        "Food",           "1"],
        ["    Drink",       "Drink",          "1"],
        ["Total",           "2",              "2" ],
      ]
    );
  });

  test("can reference a cell", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A5: "2",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "Price times A5",
          fieldName: "Price times A5",
          aggregator: "sum",
          computedBy: { formula: "=Price*A5", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "E3").value).toEqual(20);
    setCellContent(model, "A5", "3");
    expect(getEvaluatedCell(model, "E3").value).toEqual(30);
  });

  test("can indirectly reference a cell", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A5: "2",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "Price times A5",
          fieldName: "Price times A5",
          aggregator: "sum",
          computedBy: { formula: '=Price*INDIRECT("A5")', sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "E3").value).toEqual(20);
    setCellContent(model, "A5", "3");
    expect(getEvaluatedCell(model, "E3").value).toEqual(30);
  });

  test("a real use case", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Category",
      A2: "Alice",    B2: "10",     C2: "Food",
      A3: "Bob",      B3: "10",     C3: "Food",
      A4: "Alice",    B4: "20",     C4: "Drink",

      A6: "Commission",
      A7: "Alice",     B7: "0.1",
      A8: "Bob",       B8: "0.3",

      A10: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C4", {
      rows: [{ fieldName: "Customer" }, { fieldName: "Category" }],
      measures: [
        {
          id: "Price:sum",
          fieldName: "Price",
          aggregator: "sum",
        },
        {
          id: "Commission",
          fieldName: "Commission",
          aggregator: "sum",
          computedBy: { formula: "='Price:sum'*VLOOKUP(Customer,A7:B8,2,0)", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A10:C17")).toEqual(
      [
        ["(#1) Pivot",      "Total",  ""],
        ["",                "Price",  "Commission"],
        ["Alice",           "30",             "3"],
        ["    Food",        "10",             "1"],
        ["    Drink",       "20",             "2"],
        ["Bob",             "10",             "3"],
        ["    Food",        "10",             "3"],
        ["Total",           "40",             "6" ],
      ]
    );
  });

  test("two identical formulas referencing two different sheets", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: '=PIVOT.VALUE(1, "calculated1")',
      A4: '=PIVOT.VALUE(1, "calculated2")',
      A5: "A5 in sheet 1",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "sheet2" });
    setCellContent(model, "A5", "A5 in sheet 2", "sheet2");
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated1",
          fieldName: "calculated1",
          aggregator: "sum",
          computedBy: { formula: "=A5", sheetId },
        },
        {
          id: "calculated2",
          fieldName: "calculated2",
          aggregator: "sum",
          computedBy: { formula: "=A5", sheetId: "sheet2" },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual("A5 in sheet 1");
    expect(getEvaluatedCell(model, "A4").value).toEqual("A5 in sheet 2");
  });

  test("can depend on a previous calculated measure", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",
      A2: "Alice",    B2: "10",
      A3: '=PIVOT.VALUE(1, "Price times 4")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "Price times 2",
          fieldName: "Price times 2",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId },
        },
        {
          id: "Price times 4",
          fieldName: "Price times 4",
          aggregator: "sum",
          computedBy: { formula: "='Price times 2'*2", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual(40);
  });

  test("can depend on a calculated measure defined after", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",
      A2: "Alice",    B2: "10",
      A3: '=PIVOT.VALUE(1, "Price times 4")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "Price times 4",
          fieldName: "Price times 4",
          aggregator: "sum",
          computedBy: { formula: "='Price times 2'*2", sheetId },
        },
        {
          id: "Price times 2",
          fieldName: "Price times 2",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual(40);
  });

  test("cannot depend on itself", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: '=PIVOT.VALUE(1, "calculated")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=calculated*2", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual("#CYCLE");
    expect(getEvaluatedCell(model, "A3").message).toEqual("Circular reference");
  });

  test("cannot depend on a cell depending on itself", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: '=PIVOT.VALUE(1, "calculated")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=A3", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual("#CYCLE");
    expect(getEvaluatedCell(model, "A3").message).toEqual("Circular reference");
  });

  test("can depend on a cell containing another header", () => {
    const grid = {
      A1: '=PIVOT.HEADER(1, "Customer", "Alice")', // not referenced by the computed measure
      A10: '=PIVOT.HEADER(1, "Customer", "Alice")', // referenced by the computed measure
      A2: "Customer",
      A3: "Alice",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A2:A3", {
      rows: [{ fieldName: "Customer" }],
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=A10", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A10").value).toEqual("Alice");
    expect(getEvaluatedCell(model, "A1").value).toEqual("Alice");
  });

  test("can depend on a cell containing another value", () => {
    const grid = {
      A1: '=PIVOT.VALUE(1, "Customer")', // not referenced by the computed measure
      A10: '=PIVOT.VALUE(1, "Customer")', // referenced by the computed measure
      A2: "Customer",
      A3: "Alice",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A2:A3", {
      measures: [
        { id: "Customer", fieldName: "Customer", aggregator: "sum" },
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=A10", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A10").value).toEqual(0);
    expect(getEvaluatedCell(model, "A1").value).toEqual(0);
  });

  test("measures symbols are scoped to the formula", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",
      A2: "Alice",    B2: "10",
      A3: '=PIVOT.VALUE(1, "Price times A4")',
      // this symbol is invalid in the grid, only in the measure formula,
      // even if A4 is referenced in the formula
      A4: "=Price",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B2", {
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "Price times A4",
          fieldName: "Price times A4",
          aggregator: "sum",
          computedBy: { formula: "=Price*A4", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual("#BAD_EXPR");
    expect(getEvaluatedCell(model, "A4").value).toEqual("#BAD_EXPR");
  });

  test("values on rows are aggregated", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Year", D1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",     C2: "2020",
      A3: "Alice",    B3: "20",     C3: "2021",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C3", {
      rows: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=Price+10", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "D1:F6")).toEqual([
      ["(#1) Pivot",      "Total", ""],
      ["",                "Price", "calculated"],
      ["Alice",           "30",    "50"], // 50 = 20 + 30
      ["    2020",        "10",    "20"], // 20 = 10 + 10
      ["    2021",        "20",    "30"], // 30 = 20 + 10
      ["Total",           "30",    "50"],
    ]);
  });

  test("values on cols are aggregated", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Year", D1: "Category",
      A2: "Alice",    B2: "10",     C2: "2020", D2: "Food",
      A3: "Alice",    B3: "300",    C3: "2021", D3: "Drink",
      A4: "Bob",      B4: "1000",   C4: "2020", D4: "Food",
      A5: "Bob",      B5: "3000",   C5: "2021", D5: "Drink",
      A6: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:D5", {
      columns: [{ fieldName: "Category" }],
      rows: [{ fieldName: "Customer" }],
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "calc",
          fieldName: "calc",
          aggregator: "sum",
          computedBy: { formula: "=Price+10", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A6:G10")).toEqual([
      ["(#1) Pivot",  "Food",  "",     "Drink", "",     "Total",  ""],
      ["",            "Price", "calc", "Price", "calc", "Price",  "calc"],
      ["Alice",       "10",    "20",   "300",   "310",  "310",    "330"],
      ["Bob",         "1000",  "1010", "3000",  "3010", "4000",   "4020"],
      ["Total",       "1010",  "1030", "3300",  "3320", "4310",   "4350"],
    ]);
  });

  test("aggregate grouped by integer field", () => {
    const grid = {
      A1: "Type",
      A2: "10",
      A6: '=PIVOT.VALUE(1,"calc", "Type", "10")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      columns: [],
      rows: [{ fieldName: "Type" }],
      measures: [
        {
          id: "calc",
          fieldName: "calc",
          aggregator: "sum",
          computedBy: { formula: "=10", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A6").value).toEqual(10);
  });

  test("aggregate grouped by date field aggregated by month number", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Name",
      A2: "2024/01/01", B2: "Bob",
      A3: "2024/01/01", B3: "Alice",
      A6: '=PIVOT.VALUE(1,"calc")',
      A7: '=PIVOT.VALUE(1,"calc","Name","Bob")',
      A8: '=PIVOT.VALUE(1,"calc","Name","Bob","Date:month_number",1)',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Name" }, { fieldName: "Date", granularity: "month_number" }],
      measures: [
        {
          id: "calc",
          fieldName: "calc",
          aggregator: "sum",
          computedBy: { formula: "=10", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A6").value).toEqual(20);
    expect(getEvaluatedCell(model, "A7").value).toEqual(10);
    expect(getEvaluatedCell(model, "A8").value).toEqual(10);
  });

  test("aggregator preserves the format", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "10",
      A4: '=PIVOT.VALUE(1, "double", "Customer", "Alice")',
      A5: '=PIVOT.VALUE(1, "double")',
    };
    const model = createModelFromGrid(grid);
    setFormat(model, "B2:B3", "#,##0[$€]");
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:B3", {
      rows: [{ fieldName: "Customer" }],
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "double",
          fieldName: "double",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A4").formattedValue).toBe("20€");
    expect(getEvaluatedCell(model, "A5").formattedValue).toBe("40€");
    expect(getEvaluatedCell(model, "A4").format).toBe("#,##0[$€]");
    expect(getEvaluatedCell(model, "A5").format).toBe("#,##0[$€]");
  });

  test("format of empty values is preserved", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Country",  C1: "Price",
      A2: "Alice",    B2: "BE",       C2: "",
      A3: "Alice",    B3: "FR",       C3: "10",
      A4: '=PIVOT.VALUE(1, "double", "Customer", "Alice")',
      A5: '=PIVOT.VALUE(1, "double")',
      A6: '=PIVOT.VALUE(1, "double", "Customer", "Alice", "Country", "BE")',
    };
    const model = createModelFromGrid(grid);
    setFormat(model, "C2:C3", "#,##0[$€]");
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C3", {
      rows: [
        { fieldName: "Customer", order: "asc" },
        { fieldName: "Country", order: "asc" },
      ],
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "double",
          fieldName: "double",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A4").formattedValue).toBe("20€");
    expect(getEvaluatedCell(model, "A5").formattedValue).toBe("20€");
    expect(getEvaluatedCell(model, "A6").formattedValue).toBe("0€");

    // same if sorted the other way
    updatePivot(model, "1", {
      rows: [
        { fieldName: "Customer", order: "desc" },
        { fieldName: "Country", order: "desc" },
      ],
    });
    expect(getEvaluatedCell(model, "A4").formattedValue).toBe("20€");
    expect(getEvaluatedCell(model, "A5").formattedValue).toBe("20€");
    expect(getEvaluatedCell(model, "A6").formattedValue).toBe("0€");
  });

  test("formula is applied with specified aggregator", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Year", D1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",     C2: "2020",
      A3: "Alice",    B3: "20",     C3: "2021",
      A4: "Alice",    B4: "1",      C4: "2021",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C4", {
      rows: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "min" }, // not the default sum aggregator
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "min",
          computedBy: { formula: "=Price+10", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "D1:F6")).toEqual([
      ["(#1) Pivot",      "Total",  ""],
      ["",                "Price",  "calculated"],
      ["Alice",           "1",      "11"],
      ["    2020",        "10",     "20"],
      ["    2021",        "1",      "11"],
      ["Total",           "1",      "11"],
    ]);
  });

  test("formula returning a matrix", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "B1",
      A2: "Alice",    B2: "B2",
      A3: "=PIVOT(1)"
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=TRANSPOSE(B1:B2)", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "B5").value).toEqual("B1");
    setCellContent(model, "B1", "B1 bis");
    expect(getEvaluatedCell(model, "B5").value).toEqual("B1 bis");
  });

  test("formula with a compilation error", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=SUM(", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "B5").value).toEqual("#BAD_EXPR");
    expect(getEvaluatedCell(model, "B5").message).toEqual("Invalid expression");
  });

  test("formula with a runtime error", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      rows: [{ fieldName: "Customer" }],
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=0/0", sheetId },
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A3:B6")).toEqual([
      ["(#1) Pivot",  "Total"],
      ["",            "calculated"],
      ["Alice",       "#DIV/0!",],
      ["Total",       "#DIV/0!",],
    ]);
  });

  test("formula does not start with =", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: '=PIVOT.VALUE(1, "calculated")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "41+1", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual(42);
  });

  test("update formula", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: '=PIVOT.VALUE(1, "calculated")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=42", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual(42);
    updatePivot(model, "1", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=43", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual(43);
  });

  test("references are adapted with sheet", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: "42",
      A4: '=PIVOT.VALUE(1, "calculated")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=A3", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A4").value).toEqual(42);
    addColumns(model, "before", "A", 1);
    expect(model.getters.getPivotCoreDefinition("1").measures).toEqual([
      {
        id: "calculated",
        fieldName: "calculated",
        aggregator: "sum",
        computedBy: { formula: "=B3", sheetId },
      },
    ]);
    expect(getEvaluatedCell(model, "B4").value).toEqual(42);
  });

  test("references are adapted with rename sheet", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A3: "42",
      A4: '=PIVOT.VALUE(1, "calculated")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    const sheetName = model.getters.getSheetName(sheetId);
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: `=${sheetName}!A3`, sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A4").value).toEqual(42);
    renameSheet(model, sheetId, "MyNameIs");
    expect(model.getters.getPivotCoreDefinition("1").measures).toEqual([
      {
        id: "calculated",
        fieldName: "calculated",
        aggregator: "sum",
        computedBy: { formula: "=MyNameIs!A3", sheetId },
      },
    ]);
  });

  test("references becomes invalid when sheet is deleted", () => {
    const grid = {
      A1: "Customer",
      A2: "Alice",
      A4: '=PIVOT.VALUE(1, "calculated")',
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    const sheetId2 = "sheetId2";
    createSheet(model, { sheetId: sheetId2 });
    addPivot(model, "A1:A2", {
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=Sheet2!A3", sheetId },
        },
      ],
    });
    activateSheet(model, sheetId2);
    setCellContent(model, "A3", "42");
    expect(getEvaluatedCell(model, "A4", sheetId).value).toEqual(42);
    deleteSheet(model, sheetId2);
    expect(model.getters.getPivotCoreDefinition("1").measures).toEqual([
      {
        id: "calculated",
        fieldName: "calculated",
        aggregator: "sum",
        computedBy: { formula: "=#REF", sheetId },
      },
    ]);
    expect(getEvaluatedCell(model, "A4", sheetId).value).toEqual("#REF");
  });

  test("Can get subtotal of calculated measure", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Year",
      A2: "Alice",    B2: "10",     C2: "2020",
      A3: "Alice",    B3: "20",     C3: "2021",
      A4: "Bob",      B4: "30",     C4: "2020",
      A5: "Bob",      B5: "40",     C5: "2021",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C5", {
      columns: [{ fieldName: "Year" }, { fieldName: "Customer" }],
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "=Price*1", sheetId },
        },
      ],
    });

    setCellContent(model, "E2", '=PIVOT.VALUE(1, "calculated", "Year", 2020)');
    expect(getEvaluatedCell(model, "E2").value).toEqual(40);

    setCellContent(model, "E3", '=PIVOT.VALUE(1, "calculated", "Year", 2021)');
    expect(getEvaluatedCell(model, "E3").value).toEqual(60);

    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Year" }, { fieldName: "Customer" }],
    });

    expect(getEvaluatedCell(model, "E2").value).toEqual(40);
    expect(getEvaluatedCell(model, "E3").value).toEqual(60);
  });

  test("formula with a domain not matching any data in the pivot", () => {
    const grid = {
      A1: "Customer",
      B1: "Country",
      C1: "Price",
      A2: "Alice",
      B2: "BE",
      C2: "10",
      A3: '=PIVOT.VALUE(1, "calculated", "Country", "BE", "Customer", "Bob")', // Missing Bob in BE
      A4: '=PIVOT.VALUE(1, "calculated", "Country", "IN", "Customer", "Alice")', // Missing IN
      A5: '=PIVOT.VALUE(1, "calculated", "Country", "IN", "Customer", "Bob")', // All missing
      A6: '=PIVOT.VALUE(1, "calculated", "Country", "IN")', // aggregated value
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    addPivot(model, "A1:C2", {
      rows: [{ fieldName: "Country" }, { fieldName: "Customer" }],
      measures: [
        {
          id: "calculated",
          fieldName: "calculated",
          aggregator: "sum",
          computedBy: { formula: "='Country'&'Customer'", sheetId },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A3").value).toEqual("BE");
    expect(getEvaluatedCell(model, "A4").value).toEqual("");
    expect(getEvaluatedCell(model, "A5").value).toEqual("");
    expect(getEvaluatedCell(model, "A6").value).toEqual(0);
  });
});
