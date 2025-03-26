import { getEvaluatedGrid } from "../test_helpers/getters_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

describe("Pivot collapse", () => {
  test("Can collapse pivot row", () => {
    // prettier-ignore
    const grid = {
        A1: "Customer", B1: "Price",  C1: "Year", D1: "=PIVOT(1)",
        A2: "Alice",    B2: "10",     C2: "2020",
        A3: "Alice",    B3: "20",     C3: "2021",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      rows: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
      collapsedDomains: { ROW: [[{ field: "Customer", value: "Alice", type: "char" }]], COL: [] },
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "D1:E4")).toEqual([
        ["(#1) Pivot",      "Total"],
        ["",                "Price"],
        ["Alice",           "30"],
        ["Total",           "30"],
    ]);
  });

  test("Can collapse pivot column", () => {
    // prettier-ignore
    const grid = {
        A1: "Customer", B1: "Price",  C1: "Year", D1: "=PIVOT(1)",
        A2: "Alice",    B2: "10",     C2: "2020",
        A3: "Alice",    B3: "20",     C3: "2021",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      columns: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
      collapsedDomains: { ROW: [], COL: [[{ field: "Customer", value: "Alice", type: "char" }]] },
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "D1:F4")).toEqual([
        ["(#1) Pivot",      "Alice",   ""],
        ["",                "",        "Total"],
        ["",                "Price",   "Price"],
        ["Total",           "30",      "30"],
    ]);
  });

  test("Can collapse pivot column with multiple measures", () => {
    // prettier-ignore
    const grid = {
        A1: "Customer", B1: "Price",  C1: "Year", D1: "Quantity", E1: "=PIVOT(1)",
        A2: "Alice",    B2: "10",     C2: "2020", D2: "5",
        A3: "Alice",    B3: "20",     C3: "2021", D3: "10",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:D3", {
      columns: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum" },
        { id: "Quantity", fieldName: "Quantity", aggregator: "sum" },
      ],
      collapsedDomains: { ROW: [], COL: [[{ field: "Customer", value: "Alice", type: "char" }]] },
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "E1:I4")).toEqual([
        ["(#1) Pivot",      "Alice",   "",          "",        ""],
        ["",                "",        "",          "Total",   ""],
        ["",                "Price",   "Quantity",  "Price",   "Quantity"],
        ["Total",           "30",      "15",       "30",      "15"],
    ]);
  });

  test("Can collapse calculated measure", () => {
    // prettier-ignore
    const grid = {
            A1: "Customer", B1: "Price",  C1: "Year", D1: "=PIVOT(1)",
            A2: "Alice",    B2: "10",     C2: "2020",
            A3: "Alice",    B3: "20",     C3: "2021",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      rows: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      measures: [
        { id: "Price", fieldName: "Price", aggregator: "sum", isHidden: true },
        {
          id: "calc",
          fieldName: "calc",
          aggregator: "sum",
          computedBy: { formula: "=Price*2", sheetId: model.getters.getActiveSheetId() },
        },
      ],
      collapsedDomains: { ROW: [[{ field: "Customer", value: "Alice", type: "char" }]], COL: [] },
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "D1:E4")).toEqual([
            ["(#1) Pivot",      "Total"],
            ["",                "calc"],
            ["Alice",           "60"],
            ["Total",           "60"],
    ]);
  });

  test("Can collapse multiple levels of rows", () => {
    // prettier-ignore
    const grid = {
        A1: "Customer", B1: "Price",  C1: "Year",  D1: "Active", E1: "=PIVOT(1)",
        A2: "Alice",    B2: "10",     C2: "2020",  D2: "FALSE",
        A3: "Alice",    B3: "20",     C3: "2021",  D3: "TRUE",
        A4: "Bob",      B4: "30",     C4: "2020",  D4: "FALSE",
        A5: "Bob",      B5: "40",     C5: "2021",  D5: "TRUE",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:D5", {
      rows: [{ fieldName: "Customer" }, { fieldName: "Year" }, { fieldName: "Active" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
      collapsedDomains: {
        ROW: [
          [{ field: "Customer", value: "Alice", type: "char" }],
          [
            { field: "Customer", value: "Bob", type: "char" },
            { field: "Year", value: 2020, type: "integer" },
          ],
        ],
        COL: [],
      },
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "E1:F8")).toEqual([
        ["(#1) Pivot",      "Total"],
        ["",                "Price"],
        ["Alice",           "30"],
        ["Bob",             "70"],
        ["2020",            "30"],
        ["2021",            "40"],
        ["TRUE",            "40"],
        ["Total",           "100"],
    ]);
  });

  test("Can collapse multiple levels of columns", () => {
    // prettier-ignore
    const grid = {
        A1: "Customer", B1: "Price",  C1: "Year",  D1: "Active", E1: "=PIVOT(1)",
        A2: "Alice",    B2: "10",     C2: "2020",  D2: "FALSE",
        A3: "Alice",    B3: "20",     C3: "2021",  D3: "TRUE",
        A4: "Bob",      B4: "30",     C4: "2020",  D4: "FALSE",
        A5: "Bob",      B5: "40",     C5: "2021",  D5: "TRUE",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:D5", {
      columns: [{ fieldName: "Customer" }, { fieldName: "Year" }, { fieldName: "Active" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
      collapsedDomains: {
        COL: [
          [{ field: "Customer", value: "Alice", type: "char" }],
          [
            { field: "Customer", value: "Bob", type: "char" },
            { field: "Year", value: 2020, type: "integer" },
          ],
        ],
        ROW: [],
      },
    });

    // prettier-ignore
    expect(getEvaluatedGrid(model, "E1:I5")).toEqual([
        ["(#1) Pivot",      "Alice",  "Bob",   "",        ""],
        ["",                "",       "2020",  "2021",    ""],
        ["",                "",       "",      "TRUE",    "Total"],
        ["",                "Price",  "Price", "Price",   "Price"],
        ["Total",           "30",     "30",    "40",      "100"],
    ]);
  });

  test("Can collapse both rows and columns", () => {
    // prettier-ignore
    const grid = {
        A1: "Customer", B1: "Price",  C1: "Year",  D1: "Active", E1: "Client", F1: "=PIVOT(1)",
        A2: "Alice",    B2: "10",     C2: "2020",  D2: "FALSE",  E2: "Marc",
        A3: "Alice",    B3: "20",     C3: "2021",  D3: "TRUE",   E3: "Marc",
        A4: "Bob",      B4: "30",     C4: "2020",  D4: "FALSE",  E4: "Marc",
        A5: "Bob",      B5: "40",     C5: "2021",  D5: "TRUE",   E5: "Marc",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:E5", {
      columns: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      rows: [{ fieldName: "Client" }, { fieldName: "Active" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
      collapsedDomains: {
        COL: [
          [{ field: "Customer", value: "Alice", type: "char" }],
          [{ field: "Customer", value: "Bob", type: "char" }],
        ],
        ROW: [[{ field: "Client", value: "Marc", type: "char" }]],
      },
    });

    // prettier-ignore
    expect(getEvaluatedGrid(model, "F1:I5")).toEqual([
        ["(#1) Pivot",      "Alice",  "Bob",   ""],
        ["",                "",       "",      "Total"],
        ["",                "Price",  "Price", "Price"],
        ["Marc",            "30",     "70",    "100"],
        ["Total",           "30",     "70",    "100"],
    ]);
  });
});
