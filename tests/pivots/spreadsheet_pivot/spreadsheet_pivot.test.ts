import { CellErrorType, FunctionResultObject, Model } from "../../../src";
import {
  createSheet,
  deleteContent,
  deleteSheet,
  redo,
  setCellContent,
  undo,
} from "../../test_helpers/commands_helpers";
import {
  getCellContent,
  getCellError,
  getEvaluatedCell,
  getEvaluatedGrid,
} from "../../test_helpers/getters_helpers";
import { createModelFromGrid } from "../../test_helpers/helpers";
import {
  addPivot,
  createModelWithPivot,
  removePivot,
  updatePivot,
} from "../../test_helpers/pivot_helpers";
import { CellValue, CellValueType } from "./../../../src/types/cells";

describe("Spreadsheet Pivot", () => {
  test("Pivot is correctly registered", () => {
    const model = createModelWithPivot("A1:D5");
    expect(model.getters.getPivotIds()).toEqual(["1"]);
  });

  test("Pivot fields are correctly computed", () => {
    const model = new Model({
      sheets: [
        {
          cells: {
            A1: { content: "Customer" },
            B1: { content: "Order" },
            C1: { content: "Date" },
          },
        },
      ],
    });
    addPivot(model, "A1:C5", {});
    const fields = model.getters.getPivot("1").getFields();
    expect(Object.keys(fields)).toEqual(["Customer", "Order", "Date"]);
  });

  test("Pivot fields with same name are correctly loaded", () => {
    const model = new Model({
      sheets: [
        {
          cells: {
            A1: { content: "Customer" },
            B1: { content: "Customer" },
          },
        },
      ],
    });
    addPivot(model, "A1:B5", {});
    const fields = model.getters.getPivot("1").getFields();
    expect(Object.keys(fields)).toEqual(["Customer", "Customer2"]);
  });

  test("Pivot fields are correctly loaded after evaluation", () => {
    const model = new Model({
      sheets: [
        {
          cells: {
            A1: { content: "Customer" },
            B1: { content: `="Hello"` },
          },
        },
      ],
    });
    addPivot(model, "A1:B5", {});
    const fields = model.getters.getPivot("1").getFields();
    expect(Object.keys(fields)).toEqual(["Customer", "Hello"]);
  });

  test("Types are correctly inferred", () => {
    const model = new Model({
      sheets: [
        {
          cells: {
            A1: { content: "Date" },
            A2: { content: "04/01/2024" },
            A3: { content: "04/02/2024" },
            A4: { content: "12/12/2024 12:00:00 AM" },

            B1: { content: "Boolean" },
            B2: { content: "True" },
            B3: { content: "False" },

            C1: { content: "Char" },
            C2: { content: "Jambon" },
            C3: { content: "Tabouret" },

            D1: { content: "Number" },
            D2: { content: "14" },
            D3: { content: "12" },

            E1: { content: "AllDateButOneNumber" },
            E2: { content: "04/01/2024" },
            E3: { content: "14" },

            F1: { content: "AllBooleanButOneString" },
            F2: { content: "True" },
            F3: { content: "Hello" },

            G1: { content: "AllNumberButOneString" },
            G2: { content: "14" },
            G3: { content: "Tabouret" },

            H1: { content: "AllDateButOneNumberAndOneString" },
            H2: { content: "14" },
            H3: { content: "Tabouret" },
            H4: { content: "04/01/2024" },

            I1: { content: "EmptyData" },
          },
        },
      ],
    });
    addPivot(model, "A1:I4", {});
    const fields = model.getters.getPivot("1").getFields();
    expect(
      Object.keys(fields).map((field) => ({ name: field, type: fields[field]?.type }))
    ).toEqual([
      { name: "Date", type: "date" },
      { name: "Boolean", type: "boolean" },
      { name: "Char", type: "char" },
      { name: "Number", type: "integer" },
      { name: "AllDateButOneNumber", type: "integer" },
      { name: "AllBooleanButOneString", type: "char" },
      { name: "AllNumberButOneString", type: "char" },
      { name: "AllDateButOneNumberAndOneString", type: "char" },
      { name: "EmptyData", type: "integer" },
    ]);
  });

  test("Pivot fields are not loaded if a cell is in error", () => {
    const model = new Model({
      sheets: [
        {
          cells: {
            A1: { content: "Customer" },
            B1: { content: `=1/0` },
          },
        },
      ],
    });
    addPivot(model, "A1:B5", {});
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
  });

  test("Pivot Columns are ordered", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A26", `=pivot(1)`);

    updatePivot(model, "1", {
      columns: [{ name: "Contact Name", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "B26:F26")).toEqual([
      ["Alice", "Michel", "(Undefined)", "Total", ""],
    ]);

    updatePivot(model, "1", {
      columns: [{ name: "Active", order: "desc" }],
    });
    expect(getEvaluatedGrid(model, "B26:E26")).toEqual([["TRUE", "FALSE", "Total", ""]]);

    updatePivot(model, "1", {
      columns: [{ name: "Expected Revenue", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "B26:G26")).toEqual([
      ["$2,000.00", "$4,500.00", "$11,000.00", "(Undefined)", "Total", ""],
    ]);

    updatePivot(model, "1", {
      columns: [{ name: "Created on", granularity: "month_number", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "B26:F26")).toEqual([
      ["February", "March", "April", "Total", ""],
    ]);

    updatePivot(model, "1", {
      columns: [{ name: "Created on", order: "asc", granularity: "day_of_month" }],
    });
    expect(getEvaluatedGrid(model, "B26:E26")).toEqual([["2", "3", "Total", ""]]);

    updatePivot(model, "1", {
      columns: [{ name: "Created on", order: "desc", granularity: "day_of_month" }],
    });
    expect(getEvaluatedGrid(model, "B26:E26")).toEqual([["3", "2", "Total", ""]]);

    updatePivot(model, "1", {
      columns: [{ name: "Created on", order: "asc", granularity: "year" }],
    });
    expect(getEvaluatedGrid(model, "B26:D26")).toEqual([["2024", "Total", ""]]);
  });

  test("Pivot Rows are ordered", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A26", `=pivot(1)`);

    updatePivot(model, "1", {
      rows: [{ name: "Contact Name", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "A28:A30")).toEqual([["Alice"], ["Michel"], ["(Undefined)"]]);

    updatePivot(model, "1", {
      rows: [{ name: "Active", order: "desc" }],
    });
    expect(getEvaluatedGrid(model, "A28:A29")).toEqual([["TRUE"], ["FALSE"]]);

    updatePivot(model, "1", {
      rows: [{ name: "Expected Revenue", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "A28:A30")).toEqual([
      ["$2,000.00"],
      ["$4,500.00"],
      ["$11,000.00"],
    ]);

    updatePivot(model, "1", {
      rows: [{ name: "Created on", granularity: "month_number", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "A28:A32")).toEqual([
      ["February"],
      ["March"],
      ["April"],
      ["Total"],
      [""],
    ]);

    updatePivot(model, "1", {
      rows: [{ name: "Created on", order: "asc", granularity: "day_of_month" }],
    });
    expect(getEvaluatedGrid(model, "A28:A31")).toEqual([["2"], ["3"], ["Total"], [""]]);

    updatePivot(model, "1", {
      rows: [{ name: "Created on", order: "desc", granularity: "day_of_month" }],
    });
    expect(getEvaluatedGrid(model, "A28:A31")).toEqual([["3"], ["2"], ["Total"], [""]]);

    updatePivot(model, "1", {
      rows: [{ name: "Created on", order: "asc", granularity: "year" }],
    });
    expect(getEvaluatedGrid(model, "A28:A30")).toEqual([["2024"], ["Total"], [""]]);
  });

  test("Group Columns by multiple fields", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A26", `=pivot(1)`);

    updatePivot(model, "1", {
      columns: [
        { name: "Contact Name", order: "asc" },
        { name: "Active", order: "asc" },
      ],
    });

    expect(getEvaluatedGrid(model, "B26:G27")).toEqual([
      ["Alice", "Michel", "(Undefined)", "", "", ""],
      ["TRUE", "TRUE", "FALSE", "TRUE", "Total", ""],
    ]);
  });

  test("Group Rows by multiple fields", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A26", `=pivot(1)`);

    updatePivot(model, "1", {
      rows: [
        { name: "Contact Name", order: "asc" },
        { name: "Active", order: "asc" },
      ],
    });

    expect(getEvaluatedGrid(model, "A28:A36")).toEqual([
      ["Alice"],
      ["TRUE"],
      ["Michel"],
      ["TRUE"],
      ["(Undefined)"],
      ["FALSE"],
      ["TRUE"],
      ["Total"],
      [""],
    ]);
  });

  test("Empty string values are treated the same as blank cells", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "C3", '=""');
    setCellContent(model, "C5", "");
    setCellContent(model, "A26", "=pivot(1)");

    updatePivot(model, "1", {
      columns: [{ name: "Contact Name", order: "asc" }],
    });

    expect(getEvaluatedGrid(model, "B26:F26")).toEqual([
      ["Alice", "Michel", "(Undefined)", "Total", ""],
    ]);
  });

  test("Cannot load a pivot with a field in error", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A1", `=1/0`);
    setCellContent(model, "A26", `=pivot(1)`);
    expect(() => model.getters.getPivot("1").assertIsValid({ throwOnError: true })).toThrow();
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
    expect(getCellError(model, "A26")).toBe(
      "The pivot cannot be created because cell A1 contains an error"
    );
    setCellContent(model, "A1", "Customer");
    expect(() => model.getters.getPivot("1").assertIsValid({ throwOnError: true })).not.toThrow();
    expect(model.getters.getPivot("1").isValid()).toBeTruthy();
    expect(getCellError(model, "A26")).toBeUndefined();

    undo(model);
    expect(() => model.getters.getPivot("1").assertIsValid({ throwOnError: true })).toThrow();
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
    expect(getCellError(model, "A26")).toBe(
      "The pivot cannot be created because cell A1 contains an error"
    );

    redo(model);
    expect(() => model.getters.getPivot("1").assertIsValid({ throwOnError: true })).not.toThrow();
    expect(model.getters.getPivot("1").isValid()).toBeTruthy();
    expect(getCellError(model, "A26")).toBeUndefined();
  });

  test("Cannot load a pivot with a reserved field name", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A1", `__count`);
    setCellContent(model, "A26", `=pivot(1)`);
    expect(() => model.getters.getPivot("1").assertIsValid({ throwOnError: true })).toThrow();
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
    expect(getCellError(model, "A26")).toBe(
      "The pivot cannot be created because cell A1 contains a reserved value"
    );
    setCellContent(model, "A1", "Customer");
    expect(() => model.getters.getPivot("1").assertIsValid({ throwOnError: true })).not.toThrow();
    expect(model.getters.getPivot("1").isValid()).toBeTruthy();
    expect(getCellError(model, "A26")).toBeUndefined();

    undo(model);
    expect(() => model.getters.getPivot("1").assertIsValid({ throwOnError: true })).toThrow();
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
    expect(getCellError(model, "A26")).toBe(
      "The pivot cannot be created because cell A1 contains a reserved value"
    );

    redo(model);
    expect(() => model.getters.getPivot("1").assertIsValid({ throwOnError: true })).not.toThrow();
    expect(model.getters.getPivot("1").isValid()).toBeTruthy();
    expect(getCellError(model, "A26")).toBeUndefined();
  });

  test("Pivot is correctly marked as error when a field name is empty", () => {
    const model = createModelWithPivot("A1:I5");
    deleteContent(model, ["A1"]);
    setCellContent(model, "A26", `=pivot(1)`);
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
    expect(getCellError(model, "A26")).toBe("The pivot cannot be created because cell A1 is empty");
  });

  test("Pivot is correctly marked as error when a field name is an empty formula result", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A1", `=""`);
    setCellContent(model, "A26", `=pivot(1)`);
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
    expect(getCellError(model, "A26")).toBe("The pivot cannot be created because cell A1 is empty");
  });

  test("Order of pivot date dimensions is not overridden by the default one if specified", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      rows: [{ name: "Created on", order: "desc", granularity: "day_of_month" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(model.getters.getPivot("1").definition.rows[0].order).toEqual("desc");
    expect(getCellContent(model, "A28")).toBe("3");
    expect(getCellContent(model, "A29")).toBe("2");
  });

  test("Order of pivot dimensions of a non-date field is auto by default", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      rows: [{ name: "Contact name" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(model.getters.getPivot("1").definition.rows[0].order).toBeUndefined();
  });

  test("Measure count as a correct label", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      measures: [{ name: "__count", aggregator: "sum" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(getCellContent(model, "B27")).toEqual("Count");
  });

  test("Pivot is correctly marked as error when the dataSet is undefined", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A26", `=pivot(1)`);
    updatePivot(model, "1", {
      dataSet: undefined,
    });
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
    expect(getCellError(model, "A26")).toBe(
      "The pivot cannot be created because the dataset is missing."
    );
  });

  test("Deleting the sheet that contains data would set the pivot in error", () => {
    const model = createModelWithPivot("A1:I5");
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { activate: true });
    setCellContent(model, "A1", `=pivot(1)`);
    expect(model.getters.getPivot("1").isValid()).toBeTruthy();
    deleteSheet(model, sheetId);
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
    expect(getCellError(model, "A1")).toBe(
      "The pivot cannot be created because the dataset is missing."
    );
  });

  test("Sum with a field that contains a string should work", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(getCellContent(model, "B28")).toBe("$17,500.00");

    expect(getCellContent(model, "F2")).toBe("$2,000.00");
    setCellContent(model, "F2", "Hello");
    expect(getCellContent(model, "B28")).toBe("$15,500.00");
  });

  test("quarter_number should be supported", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Created on", granularity: "quarter_number", order: "asc" }],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(getEvaluatedGrid(model, "B26:E26")).toEqual([["Q1", "Q2", "Total", ""]]);
  });

  test("iso_week_number should be supported", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Created on", granularity: "iso_week_number", order: "asc" }],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(getEvaluatedGrid(model, "B26:F26")).toEqual([["5", "9", "14", "Total", ""]]);
  });

  test("PIVOT.VALUE and PIVOT.HEADER with wrong pivot id", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A26", "=PIVOT.HEADER(10)");
    expect(getEvaluatedCell(model, "A26").value).toBe("#ERROR");
    expect(getEvaluatedCell(model, "A26").message).toBe('There is no pivot with id "10"');

    setCellContent(model, "A27", '=PIVOT.VALUE(10, "Expected Revenue")');
    expect(getEvaluatedCell(model, "A27").value).toBe("#ERROR");
    expect(getEvaluatedCell(model, "A27").message).toBe('There is no pivot with id "10"');
  });

  test("PIVOT.VALUE grand total with a wrong measure", () => {
    const model = createModelWithPivot("A1:I5");

    setCellContent(model, "A26", "=PIVOT.VALUE(1, )"); // missing measure
    expect(getEvaluatedCell(model, "A26").value).toBe("#ERROR");
    expect(getEvaluatedCell(model, "A26").message).toBe(
      "The argument  is not a valid measure. Here are the measures: (__count)"
    );

    setCellContent(model, "A27", '=PIVOT.VALUE(1, "wrong measure")');
    expect(getEvaluatedCell(model, "A27").value).toBe("#ERROR");
    expect(getEvaluatedCell(model, "A27").message).toBe(
      "The argument wrong measure is not a valid measure. Here are the measures: (__count)"
    );
  });

  test("PIVOT with limited columns count.", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Price", C1: "=PIVOT(1)",
      A2: "2024-12-28", B2: "10",
      A3: "2024-11-28", B3: "20",
      A4: "1995-04-14", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      rows: [],
      columns: [{ name: "Date", granularity: "day" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });

    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:H2")).toEqual([
      ["(#1) Pivot", "4/14/1995", "11/28/2024", "12/28/2024", "Total", ""],
      ["",           "Price",     "Price",      "Price",      "Price", ""],
    ]);

    setCellContent(model, "C1", "=PIVOT(1,,,,0)");
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:D2")).toEqual([
      ["(#1) Pivot", ""],
      ["",           ""],
    ]);

    setCellContent(model, "C1", "=PIVOT(1,,,,1)");
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:E2")).toEqual([
      ["(#1) Pivot", "4/14/1995", ""],
      ["",           "Price",      ""],
    ]);
  });

  test("PIVOT.HEADER grand total", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    setCellContent(model, "A26", "=PIVOT.HEADER(1)");
    expect(getEvaluatedCell(model, "A26").value).toBe("Total");
  });

  test.each([
    ["sum", 40],
    ["count", 3],
    ["count_distinct", 2],
    ["max", 15],
    ["min", 10],
    ["avg", (10 + 15 + 15) / 3],
    ["bool_and", true],
    ["bool_or", true],
  ])("PIVOT.VALUE number measure %s grand total", (aggregator, aggregatedValue) => {
    const grid = {
      A1: "Price",
      A2: "10",
      A3: "15",
      A4: "15",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [],
      measures: [{ name: "Price", aggregator }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price")');
    expect(getEvaluatedCell(model, "A27").value).toBe(aggregatedValue);
  });

  test.each([
    ["sum", 0],
    ["count", 3],
    ["count_distinct", 2],
    ["max", 0],
    ["min", 0],
    ["avg", "#DIV/0!"],
  ])("PIVOT.VALUE text measure %s grand total", (aggregator, aggregatedValue) => {
    const grid = {
      A1: "Name",
      A2: "Alice",
      A3: "Bob",
      A4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [],
      measures: [{ name: "Name", aggregator }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Name")');
    expect(getEvaluatedCell(model, "A27").value).toBe(aggregatedValue);
  });

  test.each([
    ["sum", 15],
    ["count", 3],
    ["count_distinct", 3],
    ["max", 10],
    ["min", 5],
    ["avg", 7.5],
  ])("PIVOT.VALUE measure mixing text and number %s grand total", (aggregator, aggregatedValue) => {
    const grid = {
      A1: "Name",
      A2: "Alice",
      A3: "5",
      A4: "10",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [],
      measures: [{ name: "Name", aggregator }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Name")');
    expect(getEvaluatedCell(model, "A27").value).toBe(aggregatedValue);
  });

  test.each([
    ["bool_and", false],
    ["bool_or", true],
    ["count", 3],
    ["count_distinct", 2],
  ])("PIVOT.VALUE boolean measure %s grand total", (aggregator, aggregatedValue) => {
    const grid = {
      A1: "closed",
      A2: "true",
      A3: "false",
      A4: "false",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [],
      measures: [{ name: "closed", aggregator }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "closed")');
    expect(getEvaluatedCell(model, "A27").value).toBe(aggregatedValue);
  });

  test("PIVOT.VALUE grouped by year", () => {
    // prettier-ignore
    const grid = {
      A1: "Date", B1: "Price",
      A2: "2024-12-31", B2: "10",
      A3: "2024-12-31", B3: "20",
      A4: "1995-04-14", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      columns: [],
      rows: [{ name: "Date", granularity: "year" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:year", 2024)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // year as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:year", "2024")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:year", 1900)');
    expect(getEvaluatedCell(model, "A27").value).toBe("");
  });

  test("PIVOT.VALUE grouped by quarter_number", () => {
    // prettier-ignore
    const grid = {
      A1: "Date", B1: "Price",
      A2: "2024-12-31", B2: "10",
      A3: "2024-12-31", B3: "20",
      A4: "1995-04-14", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      columns: [],
      rows: [{ name: "Date", granularity: "quarter_number" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:quarter_number", 4)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // quarter as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:quarter_number", "4")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:quarter_number", 1)');
    expect(getEvaluatedCell(model, "A27").value).toBe("");
  });

  test("PIVOT.VALUE grouped by month_number", () => {
    // prettier-ignore
    const grid = {
      A1: "Date", B1: "Price",
      A2: "2024-12-31", B2: "10",
      A3: "2024-12-31", B3: "20",
      A4: "1995-04-14", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      columns: [],
      rows: [{ name: "Date", granularity: "month_number" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:month_number", 12)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // month as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:month_number", "12")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:month_number", 1)');
    expect(getEvaluatedCell(model, "A27").value).toBe("");
  });

  test("PIVOT.VALUE grouped by iso_week_number", () => {
    // prettier-ignore
    const grid = {
      A1: "Date", B1: "Price",
      A2: "2024-12-28", B2: "10",
      A3: "2024-12-28", B3: "20",
      A4: "1995-04-14", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      columns: [],
      rows: [{ name: "Date", granularity: "iso_week_number" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:iso_week_number", 52)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // week as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:iso_week_number", "52")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:iso_week_number", 1)');
    expect(getEvaluatedCell(model, "A27").value).toBe("");
  });

  test("PIVOT.VALUE grouped by day_of_month", () => {
    // prettier-ignore
    const grid = {
      A1: "Date", B1: "Price",
      A2: "2024-12-28", B2: "10",
      A3: "2024-11-28", B3: "20",
      A4: "1995-04-14", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      columns: [],
      rows: [{ name: "Date", granularity: "day_of_month" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:day_of_month", 28)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // day as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:day_of_month", "28")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:day_of_month", 1)');
    expect(getEvaluatedCell(model, "A27").value).toBe("");
  });

  test("PIVOT.VALUE grouped by day.", () => {
    // prettier-ignore
    const grid = {
      A1: "Date", B1: "Price",
      A2: "2024-12-28", B2: "10",
      A3: "2024-12-28", B3: "20",
      A4: "1995-04-14", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      columns: [],
      rows: [{ name: "Date", granularity: "day" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });

    // hardcoded date string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:day", "2024-12-28")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // DATE function
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:day", DATE(2024, 12, 28))');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price", "Date:day", "2020-12-28")');
    expect(getEvaluatedCell(model, "A27").value).toBe("");
  });

  test("PIVOT.HEADER number groupby", () => {
    const grid = {
      A1: "Price",
      A2: "10",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ name: "Price" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Price", 10)');
    expect(getEvaluatedCell(model, "A27").value).toBe(10);

    // not part of the dataset
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Price", 10000)');
    expect(getEvaluatedCell(model, "A27").value).toBe("");

    // not part of the dataset and not a number
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Price", "hello")');
    expect(getEvaluatedCell(model, "A27").value).toBe("#ERROR");
    expect(getEvaluatedCell(model, "A27").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'hello' is a string, and cannot be coerced to a number."
    );

    // missing header value
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Price", )');
    expect(getEvaluatedCell(model, "A27").value).toBe("");
  });

  test("PIVOT.HEADER text groupby", () => {
    const grid = {
      A1: "Name",
      A2: "Alice",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A2", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Name", "Alice")');
    expect(getEvaluatedCell(model, "A27").value).toBe("Alice");

    // not part of the dataset
    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Name", "Bob")');
    expect(getEvaluatedCell(model, "A28").value).toBe("");

    // missing header value
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Name", )');
    expect(getEvaluatedCell(model, "A29").value).toBe("");
  });

  test("PIVOT.HEADER boolean groupby", () => {
    const grid = {
      A1: "closed",
      A2: "true",
      A3: "false",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A3", {
      columns: [],
      rows: [{ name: "closed" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "closed", true)');
    expect(getEvaluatedCell(model, "A27").value).toBe(true);

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "closed", false)');
    expect(getEvaluatedCell(model, "A28").value).toBe(false);

    // missing header value
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "closed", )');
    expect(getEvaluatedCell(model, "A29").value).toBe(false);
  });

  test("PIVOT.HEADER date wrong granularity groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-12-31",
      A4: "1995-04-14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ name: "Date", granularity: "year" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:not_a_granularity", 2024)');
    expect(getEvaluatedCell(model, "A27").message).toBe(
      "Dimensions don't match the pivot definition"
    );
  });

  test("PIVOT.HEADER date year groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-12-31",
      A4: "1995-04-14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ name: "Date", granularity: "year" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:year", 2024)');
    expect(getEvaluatedCell(model, "A27").value).toBe(2024);
    expect(getEvaluatedCell(model, "A27").format).toBe("0");

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:year", "2024")');
    expect(getEvaluatedCell(model, "A28").value).toBe(2024);

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:year", 2000)');
    expect(getEvaluatedCell(model, "A29").value).toBe(2000);

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:year", )');
    expect(getEvaluatedCell(model, "A30").value).toBe(0);

    // without granularity
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A31").message).toBe(
      "Dimensions don't match the pivot definition"
    );

    // no a number
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date:year", "not a number")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );
  });

  test("PIVOT.HEADER date quarter_number groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-12-31",
      A4: "1995-04-14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ name: "Date", granularity: "quarter_number" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:quarter_number", 4)');
    expect(getEvaluatedCell(model, "A27").value).toBe("Q4");
    expect(getEvaluatedCell(model, "A27").format).toBe("0");

    // quarter as string
    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:quarter_number", "4")');
    expect(getEvaluatedCell(model, "A28").value).toBe("Q4");

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:quarter_number", 1)');
    expect(getEvaluatedCell(model, "A29").value).toBe("Q1");

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:quarter_number", )');
    expect(getEvaluatedCell(model, "A30").message).toBe(
      "0 is not a valid quarter (it should be a number between 1 and 4)"
    );

    // without granularity
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A31").message).toBe(
      "Dimensions don't match the pivot definition"
    );
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date:quarter_number", "not a number")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );

    // not a valid quarter
    setCellContent(model, "A33", '=PIVOT.HEADER(1, "Date:quarter_number", 5)');
    expect(getEvaluatedCell(model, "A33").message).toBe(
      "5 is not a valid quarter (it should be a number between 1 and 4)"
    );
  });

  test("PIVOT.HEADER date month_number groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-12-31",
      A4: "1995-04-14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ name: "Date", granularity: "month_number" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:month_number", 4)');
    expect(getEvaluatedCell(model, "A27").value).toBe("April");

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:month_number", "4")');
    expect(getEvaluatedCell(model, "A28").value).toBe("April");

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:month_number", 1)');
    expect(getEvaluatedCell(model, "A29").value).toBe("January");

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:month_number", )');
    expect(getEvaluatedCell(model, "A30").message).toBe(
      "0 is not a valid month (it should be a number between 1 and 12)"
    );

    // missing header value
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date:month_number")');
    expect(getEvaluatedCell(model, "A31").message).toBe(
      "Invalid number of arguments for the PIVOT.HEADER function. Expected all arguments after position 1 to be supplied by groups of 2 arguments"
    );

    // without granularity
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "Dimensions don't match the pivot definition"
    );

    // not a number
    setCellContent(model, "A33", '=PIVOT.HEADER(1, "Date:month_number", "not a number")');
    expect(getEvaluatedCell(model, "A33").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );

    // not a valid month
    setCellContent(model, "A34", '=PIVOT.HEADER(1, "Date:month_number", 13)');
    expect(getEvaluatedCell(model, "A34").message).toBe(
      "13 is not a valid month (it should be a number between 1 and 12)"
    );
  });

  test("PIVOT.HEADER date iso_week_number groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-12-31",
      A4: "1995-04-14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ name: "Date", granularity: "iso_week_number" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:iso_week_number", 4)');
    expect(getEvaluatedCell(model, "A27").value).toBe(4);
    expect(getEvaluatedCell(model, "A27").format).toBe("0");

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:iso_week_number", "4")');
    expect(getEvaluatedCell(model, "A28").value).toBe(4);

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:iso_week_number", 53)');
    expect(getEvaluatedCell(model, "A29").value).toBe(53);

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:iso_week_number", )');
    expect(getEvaluatedCell(model, "A30").value).toBe(0);

    // without granularity
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A31").message).toBe(
      "Dimensions don't match the pivot definition"
    );

    // not a number
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date:iso_week_number", "not a number")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );

    // not a valid week
    setCellContent(model, "A33", '=PIVOT.HEADER(1, "Date:iso_week_number", 54)');
    expect(getEvaluatedCell(model, "A33").message).toBe(
      "54 is not a valid week (it should be a number between 0 and 53)"
    );

    setCellContent(model, "A34", '=PIVOT.HEADER(1, "Date:iso_week_number", -1)');
    expect(getEvaluatedCell(model, "A34").message).toBe(
      "-1 is not a valid week (it should be a number between 0 and 53)"
    );
  });

  test("PIVOT.HEADER date day_of_month groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-12-31",
      A4: "1995-04-14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ name: "Date", granularity: "day_of_month" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:day_of_month", 4)');
    expect(getEvaluatedCell(model, "A27").value).toBe(4);
    expect(getEvaluatedCell(model, "A27").format).toBe("0");

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:day_of_month", "4")');
    expect(getEvaluatedCell(model, "A28").value).toBe(4);

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:day_of_month", 31)');
    expect(getEvaluatedCell(model, "A29").value).toBe(31);

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:day_of_month", )');
    expect(getEvaluatedCell(model, "A30").message).toBe(
      "0 is not a valid day of month (it should be a number between 1 and 31)"
    );

    // without granularity
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A31").message).toBe(
      "Dimensions don't match the pivot definition"
    );

    // not a number
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date:day_of_month", "not a number")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );

    // not a valid day of month
    setCellContent(model, "A33", '=PIVOT.HEADER(1, "Date:day_of_month", 32)');
    expect(getEvaluatedCell(model, "A33").message).toBe(
      "32 is not a valid day of month (it should be a number between 1 and 31)"
    );
    setCellContent(model, "A34", '=PIVOT.HEADER(1, "Date:day_of_month", 0)');
    expect(getEvaluatedCell(model, "A34").message).toBe(
      "0 is not a valid day of month (it should be a number between 1 and 31)"
    );
  });

  test("PIVOT.HEADER date day groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-12-31",
      A4: "1995-04-14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ name: "Date", granularity: "day" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:day", DATE(2024, 12, 31))');
    expect(getEvaluatedCell(model, "A27").value).toBe(45657);
    expect(getEvaluatedCell(model, "A27").format).toBe("m/d/yyyy");

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:day", "2024-12-31")');
    expect(getEvaluatedCell(model, "A28").value).toBe(45657);

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:day", "2020-04-14")');
    expect(getEvaluatedCell(model, "A29").value).toBe(43935);

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:day", )');
    expect(getEvaluatedCell(model, "A30").value).toBe(0);

    // without granularity
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A31").message).toBe(
      "Dimensions don't match the pivot definition"
    );

    // not a number
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date:day", "not a number")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );
  });

  test("Pivot with measure AVG on text values does not crash", () => {
    const model = createModelFromGrid({ A1: "Customer", A2: "Jean", A3: "Marc" });
    addPivot(model, "A1:A3", {
      columns: [],
      rows: [],
      measures: [{ name: "Customer", aggregator: "avg" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(getCellContent(model, "A26")).toBe(model.getters.getPivotDisplayName("1"));
    expect(getEvaluatedCell(model, "B28")).toMatchObject({
      value: CellErrorType.DivisionByZero,
      message: "Evaluation of function AVG caused a divide by zero error.",
      type: CellValueType.error,
    });
  });

  test("Date dimensions should support empty cells", () => {
    const grid = {
      A1: "Date",
      A2: "",
      A3: "2024-03-01",
      A4: "=pivot(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A3", {
      columns: [{ name: "Date", granularity: "month_number" }],
      measures: [{ name: "__count", aggregator: "sum" }],
    });
    expect(getEvaluatedGrid(model, "B4:E4")).toEqual([["March", "(Undefined)", "Total", ""]]);
  });

  test("fieldsType is not mandatory in INSERT_PIVOT command", () => {
    // prettier-ignore
    const grid = {
      A1: "Name", B1: "Price",
      A2: "Alice", B2: "10",
      A3: "Bob", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ name: "Price" }],
      measures: [{ name: "Name", aggregator: "count" }],
    });
    const pivotId = model.getters.getPivotIds()[0];
    const pivot = model.getters.getPivot(pivotId);
    const table = pivot.getTableStructure().export();
    model.dispatch("INSERT_PIVOT", {
      pivotId,
      col: 2,
      row: 0,
      sheetId: model.getters.getActiveSheetId(),
      table: {
        ...table,
        fieldsType: undefined,
      },
    });
    expect(getEvaluatedGrid(model, "C3:C4")).toEqual([["10"], ["20"]]);
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    // With fieldsType = undefined, arguments are stringified
    expect(getEvaluatedGrid(model, "C3:C4")).toEqual([
      [`=PIVOT.HEADER(1,"Price","10")`],
      [`=PIVOT.HEADER(1,"Price","20")`],
    ]);
    model.dispatch("INSERT_PIVOT", {
      pivotId,
      col: 2,
      row: 0,
      sheetId: model.getters.getActiveSheetId(),
      table,
    });
    model.dispatch("SET_FORMULA_VISIBILITY", { show: false });
    expect(getEvaluatedGrid(model, "C3:C4")).toEqual([["10"], ["20"]]);
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    // With fieldsType set, arguments are correctly normalized
    expect(getEvaluatedGrid(model, "C3:C4")).toEqual([
      [`=PIVOT.HEADER(1,"Price",10)`],
      [`=PIVOT.HEADER(1,"Price",20)`],
    ]);
  });

  describe("Pivot reevaluation", () => {
    test("Pivot fields reevaluation", () => {
      const model = new Model({
        sheets: [
          {
            cells: {
              A1: { content: "Customer" },
              B1: { content: "Order" },
              C1: { content: "Date" },
            },
          },
        ],
      });
      addPivot(model, "A1:C5", {});
      setCellContent(model, "D1", `=PIVOT("1")`);
      expect(Object.keys(model.getters.getPivot("1").getFields())).toEqual([
        "Customer",
        "Order",
        "Date",
      ]);
      setCellContent(model, "A1", "Tabouret");
      expect(Object.keys(model.getters.getPivot("1").getFields())).toEqual([
        "Tabouret",
        "Order",
        "Date",
      ]);
      setCellContent(model, "A1", "=1/0");
      expect(Object.keys(model.getters.getPivot("1").getFields())).toEqual([]);
      expect(model.getters.getPivot("1").isValid()).toBeFalsy();
      setCellContent(model, "A1", "Tabouret");
      expect(model.getters.getPivot("1").isValid()).toBeTruthy();
    });
  });

  test("Pivot is removed on command REMOVE_PIVOT", () => {
    const model = createModelWithPivot("A1:I5");
    expect(model.getters.getPivotIds()).toEqual(["1"]);
    expect(model.getters.getPivotCoreDefinition("1")).toBeTruthy();
    expect(model.getters.getPivot("1")).toBeTruthy();

    removePivot(model, "1");
    expect(model.getters.getPivotIds()).toEqual([]);
    expect(() => model.getters.getPivotCoreDefinition("1")).toThrow();
    expect(() => model.getters.getPivot("1")).toThrow();
    undo(model);
    expect(model.getters.getPivotIds()).toEqual(["1"]);
    expect(model.getters.getPivotCoreDefinition("1")).toBeTruthy();
    expect(model.getters.getPivot("1")).toBeTruthy();
  });
});

describe("Spreadsheet arguments parsing", () => {
  function toFunctionResultObject(args: CellValue[]): FunctionResultObject[] {
    return args.map((value) => ({ value }));
  }

  test("Date arguments are correctly parsed", () => {
    // prettier-ignore
    const grid = {
      A1: "Date", B1: "Price",
      A2: "2024-12-31", B2: "10",
      A3: "2024-12-31", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ name: "Date", granularity: "year" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    const pivot = model.getters.getPivot(model.getters.getPivotIds()[0]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Date:year", 2024]))).toEqual([
      {
        field: "Date:year",
        value: 2024,
        type: "date",
      },
    ]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Date:year", "2024"]))).toEqual([
      {
        field: "Date:year",
        value: 2024,
        type: "date",
      },
    ]);
    expect(() =>
      pivot.parseArgsToPivotDomain(toFunctionResultObject(["Date:year", "This is a string"]))
    ).toThrow();
    expect(() => pivot.parseArgsToPivotDomain(toFunctionResultObject(["Date", 2024]))).toThrow();
  });

  test("Number arguments are correctly parsed", () => {
    // prettier-ignore
    const grid = {
      A1: "Amount", B1: "Price",
      A2: "1", B2: "10",
      A3: "2", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ name: "Amount", granularity: "year" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    const pivot = model.getters.getPivot(model.getters.getPivotIds()[0]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Amount", 1]))).toEqual([
      {
        field: "Amount",
        value: 1,
        type: "integer",
      },
    ]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Amount", "1"]))).toEqual([
      {
        field: "Amount",
        value: 1,
        type: "integer",
      },
    ]);
    expect(() =>
      pivot.parseArgsToPivotDomain(toFunctionResultObject(["Amount", "This is a string"]))
    ).toThrow();
  });

  test("Boolean arguments are correctly parsed", () => {
    // prettier-ignore
    const grid = {
      A1: "Active", B1: "Price",
      A2: "TRUE", B2: "10",
      A3: "FALSE", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ name: "Active" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    const pivot = model.getters.getPivot(model.getters.getPivotIds()[0]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Active", true]))).toEqual([
      {
        field: "Active",
        value: true,
        type: "boolean",
      },
    ]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Active", "true"]))).toEqual([
      {
        field: "Active",
        value: true,
        type: "boolean",
      },
    ]);
    expect(() =>
      pivot.parseArgsToPivotDomain(toFunctionResultObject(["Active", "This is a string"]))
    ).toThrow();
  });

  test("String arguments are correctly parsed", () => {
    // prettier-ignore
    const grid = {
      A1: "Name", B1: "Price",
      A2: "Alice", B2: "10",
      A3: "Bob", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    const pivot = model.getters.getPivot(model.getters.getPivotIds()[0]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Name", true]))).toEqual([
      {
        field: "Name",
        value: "TRUE",
        type: "char",
      },
    ]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Name", "Hello"]))).toEqual([
      {
        field: "Name",
        value: "Hello",
        type: "char",
      },
    ]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Name", 1]))).toEqual([
      {
        field: "Name",
        value: "1",
        type: "char",
      },
    ]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Name", "01/01/2024"]))).toEqual([
      {
        field: "Name",
        value: "01/01/2024",
        type: "char",
      },
    ]);
  });

  test("update PIVOT.VALUE when data set changes", () => {
    const grid = {
      A1: "Price",
      B1: "Customer",
      A2: "2",
      B2: "Alice",
      A3: '=PIVOT.VALUE(1, "Price")',
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B2", {
      columns: [],
      rows: [{ name: "Customer" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    expect(getEvaluatedCell(model, "A3").value).toBe(2);
    setCellContent(model, "A2", "3");
    expect(getEvaluatedCell(model, "A3").value).toBe(3);
  });

  test("update PIVOT.HEADER when data set changes", () => {
    const grid = {
      A1: "Price",
      B1: "Customer",
      A2: "2",
      B2: "Alice",
      A3: '=PIVOT.HEADER(1, "Customer", "Alice")',
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B2", {
      columns: [],
      rows: [{ name: "Customer" }],
      measures: [{ name: "Price", aggregator: "sum" }],
    });
    expect(getEvaluatedCell(model, "A3").value).toBe("Alice");
    setCellContent(model, "B2", "Bob");
    expect(getEvaluatedCell(model, "A3").value).toBe("");
  });
});
