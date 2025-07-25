import { CellErrorType, FunctionResultObject, Model } from "../../../src";
import { resetMapValueDimensionDate } from "../../../src/helpers/pivot/spreadsheet_pivot/date_spreadsheet_pivot";
import { DEFAULT_LOCALES } from "../../../src/types/locale";
import {
  createSheet,
  deleteContent,
  deleteSheet,
  redo,
  setCellContent,
  setFormat,
  undo,
} from "../../test_helpers/commands_helpers";
import {
  getCellContent,
  getCellError,
  getEvaluatedCell,
  getEvaluatedCells,
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
      { name: "Date", type: "datetime" },
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

  test("Pivot does not create empty row when number is added in char field", () => {
    // prettier-ignore
    const grid = {
      A1: "Text",     B1: "Value",    C1: "=PIVOT(1)",
      A2: "Hello",    B2: "10",
      A3: "45",       B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [{ fieldName: "Text", order: "asc" }],
      measures: [{ id: "Value:sum", fieldName: "Value", aggregator: "sum" }],
    });
    expect(getEvaluatedGrid(model, "C3:C4")).toEqual([["45"], ["Hello"]]);
  });

  test("Values aren't detected as date if they have a date format but a non-numeric value", () => {
    const model = new Model();
    setCellContent(model, "A1", "Col1");
    setFormat(model, "A2", "dd/mm/yyyy");
    addPivot(model, "A1:A2", {});
    setCellContent(model, "B1", "=PIVOT(1)");

    setCellContent(model, "A2", "notADate");
    expect(model.getters.getPivot("1").getFields()).toMatchObject({ Col1: { type: "char" } });

    setCellContent(model, "A2", "TRUE");
    expect(model.getters.getPivot("1").getFields()).toMatchObject({ Col1: { type: "boolean" } });

    setCellContent(model, "A2", "125");
    expect(model.getters.getPivot("1").getFields()).toMatchObject({ Col1: { type: "datetime" } });
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
      columns: [{ fieldName: "Contact Name", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "B26:F26")).toEqual([
      ["Alice", "Michel", "(Undefined)", "Total", ""],
    ]);

    updatePivot(model, "1", {
      columns: [{ fieldName: "Active", order: "desc" }],
    });
    expect(getEvaluatedGrid(model, "B26:E26")).toEqual([["TRUE", "FALSE", "Total", ""]]);

    updatePivot(model, "1", {
      columns: [{ fieldName: "Expected Revenue", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "B26:G26")).toEqual([
      ["$2,000.00", "$4,500.00", "$11,000.00", "(Undefined)", "Total", ""],
    ]);

    updatePivot(model, "1", {
      columns: [{ fieldName: "Created on", granularity: "month_number", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "B26:F26")).toEqual([
      ["February", "March", "April", "Total", ""],
    ]);

    updatePivot(model, "1", {
      columns: [{ fieldName: "Created on", order: "asc", granularity: "day_of_month" }],
    });
    expect(getEvaluatedGrid(model, "B26:E26")).toEqual([["2", "3", "Total", ""]]);

    updatePivot(model, "1", {
      columns: [{ fieldName: "Created on", order: "desc", granularity: "day_of_month" }],
    });
    expect(getEvaluatedGrid(model, "B26:E26")).toEqual([["3", "2", "Total", ""]]);

    updatePivot(model, "1", {
      columns: [{ fieldName: "Created on", order: "asc", granularity: "year" }],
    });
    expect(getEvaluatedGrid(model, "B26:D26")).toEqual([["2024", "Total", ""]]);
  });

  test("Pivot Rows are ordered", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A26", `=pivot(1)`);

    updatePivot(model, "1", {
      rows: [{ fieldName: "Contact Name", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "A28:A30")).toEqual([["Alice"], ["Michel"], ["(Undefined)"]]);

    updatePivot(model, "1", {
      rows: [{ fieldName: "Active", order: "desc" }],
    });
    expect(getEvaluatedGrid(model, "A28:A29")).toEqual([["TRUE"], ["FALSE"]]);

    updatePivot(model, "1", {
      rows: [{ fieldName: "Expected Revenue", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "A28:A30")).toEqual([
      ["$2,000.00"],
      ["$4,500.00"],
      ["$11,000.00"],
    ]);

    updatePivot(model, "1", {
      rows: [{ fieldName: "Created on", granularity: "month_number", order: "asc" }],
    });
    expect(getEvaluatedGrid(model, "A28:A32")).toEqual([
      ["February"],
      ["March"],
      ["April"],
      ["Total"],
      [""],
    ]);

    updatePivot(model, "1", {
      rows: [{ fieldName: "Created on", order: "asc", granularity: "day_of_month" }],
    });
    expect(getEvaluatedGrid(model, "A28:A31")).toEqual([["2"], ["3"], ["Total"], [""]]);

    updatePivot(model, "1", {
      rows: [{ fieldName: "Created on", order: "desc", granularity: "day_of_month" }],
    });
    expect(getEvaluatedGrid(model, "A28:A31")).toEqual([["3"], ["2"], ["Total"], [""]]);

    updatePivot(model, "1", {
      rows: [{ fieldName: "Created on", order: "asc", granularity: "year" }],
    });
    expect(getEvaluatedGrid(model, "A28:A30")).toEqual([["2024"], ["Total"], [""]]);
  });

  test("Group Columns by multiple fields", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A26", `=pivot(1)`);

    updatePivot(model, "1", {
      columns: [
        { fieldName: "Contact Name", order: "asc" },
        { fieldName: "Active", order: "asc" },
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
        { fieldName: "Contact Name", order: "asc" },
        { fieldName: "Active", order: "asc" },
      ],
    });

    expect(getEvaluatedGrid(model, "A28:A36")).toEqual([
      ["Alice"],
      ["    TRUE"],
      ["Michel"],
      ["    TRUE"],
      ["(Undefined)"],
      ["    FALSE"],
      ["    TRUE"],
      ["Total"],
      [""],
    ]);
  });

  test("Date fields without granularity are defaulted as month", () => {
    const model = new Model();
    setCellContent(model, "A1", "Col1");
    setCellContent(model, "A2", "45323");
    addPivot(model, "A1:A2", {
      rows: [{ fieldName: "Col1", order: "asc" }],
    });
    setCellContent(model, "B1", "=PIVOT(1)");
    expect(model.getters.getPivot("1").getFields()).toMatchObject({ Col1: { type: "integer" } });

    // field is now a date, but no granularity is specified since it was a integer when added to the pivot
    setFormat(model, "A2", "dd/mm/yyyy");
    expect(model.getters.getPivot("1").getFields()).toMatchObject({ Col1: { type: "datetime" } });

    setCellContent(model, "E1", "=PIVOT(1)");
    expect(getCellContent(model, "E3")).toEqual("February 2024");
  });

  test("Empty string values are treated the same as blank cells", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "C3", '=""');
    setCellContent(model, "C5", "");
    setCellContent(model, "A2", '=""');
    setCellContent(model, "A3", "");
    setCellContent(model, "A26", "=pivot(1)");

    updatePivot(model, "1", {
      columns: [{ fieldName: "Contact Name", order: "asc" }],
    });

    const pivot = model.getters.getPivot("1");
    expect(pivot.getFields()).toMatchObject({ "Created on": { type: "datetime" } });
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

  test("Pivot with day_of_week", () => {
    resetMapValueDimensionDate();
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Price", C1: "=PIVOT(1)",
      A2: "2024-03-31", B2: "10", // Sunday
      A3: "2024-04-01", B3: "20", // Monday
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "day_of_week" }],
      measures: [{ fieldName: "Price", aggregator: "sum", id: "Price:sum" }],
    });
    expect(getEvaluatedGrid(model, "C1:C5")).toEqual([
      ["(#1) Pivot"],
      [""],
      ["Sunday"],
      ["Monday"],
      ["Total"],
    ]);
  });

  test("Pivot with day_of_week with locale with startWeek = 1", () => {
    resetMapValueDimensionDate();
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Price", C1: "=PIVOT(1)",
      A2: "2024-03-31", B2: "10", // Sunday
      A3: "2024-04-01", B3: "20", // Monday
    };
    const model = createModelFromGrid(grid);
    const locale = DEFAULT_LOCALES[1];
    expect(locale.weekStart).toBe(1);
    model.dispatch("UPDATE_LOCALE", { locale });
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "day_of_week" }],
      measures: [{ fieldName: "Price", aggregator: "sum", id: "Price:sum" }],
    });
    expect(getEvaluatedGrid(model, "C1:C5")).toEqual([
      ["(#1) Pivot"],
      [""],
      ["Monday"],
      ["Sunday"],
      ["Total"],
    ]);
  });

  test("Pivot with hour_number", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",               B1: "Price", C1: "=PIVOT(1)",
      A2: "2024-04-03 1:07:12", B2: "10",
      A3: "2024-04-02 2:08:14", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "hour_number" }],
      measures: [{ fieldName: "Price", aggregator: "sum", id: "Price:sum" }],
    });
    expect(getEvaluatedGrid(model, "C1:C5")).toEqual([
      ["(#1) Pivot"],
      [""],
      ["1h"],
      ["2h"],
      ["Total"],
    ]);
  });

  test("Pivot with minute_number", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",               B1: "Price", C1: "=PIVOT(1)",
      A2: "2024-04-03 1:07:12", B2: "10",
      A3: "2024-04-02 2:08:14", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "minute_number" }],
      measures: [{ fieldName: "Price", aggregator: "sum", id: "Price:sum" }],
    });
    expect(getEvaluatedGrid(model, "C1:C5")).toEqual([
      ["(#1) Pivot"],
      [""],
      ["7'"],
      ["8'"],
      ["Total"],
    ]);
  });

  test("Pivot with second_number", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",               B1: "Price", C1: "=PIVOT(1)",
      A2: "2024-04-03 1:07:12", B2: "10",
      A3: "2024-04-02 2:08:14", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "second_number" }],
      measures: [{ fieldName: "Price", aggregator: "sum", id: "Price:sum" }],
    });
    expect(getEvaluatedGrid(model, "C1:C5")).toEqual([
      ["(#1) Pivot"],
      [""],
      ["12''"],
      ["14''"],
      ["Total"],
    ]);
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
      rows: [{ fieldName: "Created on", order: "desc", granularity: "day_of_month" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(model.getters.getPivot("1").definition.rows[0].order).toEqual("desc");
    expect(getCellContent(model, "A28")).toBe("3");
    expect(getCellContent(model, "A29")).toBe("2");
  });

  test("Order of pivot dimensions of a non-date field is auto by default", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      rows: [{ fieldName: "Contact name" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(model.getters.getPivot("1").definition.rows[0].order).toBeUndefined();
  });

  test("Order of undefined value is correct when ordered asc", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer",   B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",      B2: "10",
      A3: "",           B3: "20",
      A4: "Olaf",       B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      rows: [{ fieldName: "Customer", order: "asc" }],
      columns: [],
      measures: [{ id: "price", fieldName: "Price", aggregator: "sum" }],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:C5")).toEqual([
      ["(#1) Pivot"],
      [""],
      ["Alice"],
      ["Olaf"],
      ["(Undefined)"],
    ]);
  });

  test("Order of undefined value is correct when ordered desc", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer",   B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",      B2: "10",
      A3: "",           B3: "20",
      A4: "Olaf",       B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      rows: [{ fieldName: "Customer", order: "desc" }],
      columns: [],
      measures: [{ id: "price", fieldName: "Price", aggregator: "sum" }],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:C5")).toEqual([
      ["(#1) Pivot"],
      [""],
      ["(Undefined)"],
      ["Olaf"],
      ["Alice"],
    ]);
  });

  test("Measure count as a correct label", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      measures: [{ id: "__count:sum", fieldName: "__count", aggregator: "sum" }],
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
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
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
      columns: [{ fieldName: "Created on", granularity: "quarter_number", order: "asc" }],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(getEvaluatedGrid(model, "B26:E26")).toEqual([["Q1", "Q2", "Total", ""]]);
  });

  test("iso_week_number should be supported", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ fieldName: "Created on", granularity: "iso_week_number", order: "asc" }],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(getEvaluatedGrid(model, "B26:F26")).toEqual([["5", "9", "14", "Total", ""]]);
  });

  test("month should be supported and correctly ordered", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ fieldName: "Created on", granularity: "month", order: "asc" }],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(getEvaluatedGrid(model, "B26:F26")).toEqual([
      ["February 2024", "March 2024", "April 2024", "Total", ""],
    ]);

    updatePivot(model, "1", {
      columns: [{ fieldName: "Created on", granularity: "month", order: "desc" }],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    expect(getEvaluatedGrid(model, "B26:F26")).toEqual([
      ["April 2024", "March 2024", "February 2024", "Total", ""],
    ]);
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
      "The argument  is not a valid measure. Here are the measures: (__count:sum)"
    );

    setCellContent(model, "A27", '=PIVOT.VALUE(1, "wrong measure")');
    expect(getEvaluatedCell(model, "A27").value).toBe("#ERROR");
    expect(getEvaluatedCell(model, "A27").message).toBe(
      "The argument wrong measure is not a valid measure. Here are the measures: (__count:sum)"
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
      columns: [{ fieldName: "Date", granularity: "day" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:H2")).toEqual([
      ["(#1) Pivot", "14 Apr 1995", "28 Nov 2024", "28 Dec 2024", "Total", ""],
      ["",           "Price",       "Price",       "Price",      "Price", ""],
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
      ["(#1) Pivot", "14 Apr 1995", ""],
      ["",           "Price",       ""],
    ]);
  });

  test("PIVOT row headers are indented relative to the groupBy depth.", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Price", C1: "=PIVOT(1)",
      A2: "2024-12-28", B2: "10",
      A3: "2024-11-28", B3: "20",
      A4: "1995-04-14", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      rows: [
        { fieldName: "Date", granularity: "year" },
        { fieldName: "Date", granularity: "quarter_number" },
        { fieldName: "Date", granularity: "day" },
      ],
      columns: [],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    expect(getEvaluatedCells(model, "C1:C10").flat()).toMatchObject([
      { value: "(#1) Pivot", format: undefined },
      { value: "", format: undefined },
      { value: 1995, format: "0* " },
      { value: "Q2", format: "    @* " },
      { value: 34803, format: "        dd mmm yyyy* " },
      { value: 2024, format: "0* " },
      { value: "Q4", format: "    @* " },
      { value: 45624, format: "        dd mmm yyyy* " },
      { value: 45654, format: "        dd mmm yyyy* " },
      { value: "Total", format: undefined },
    ]);
  });

  test("Pivot column headers are aligned left with their format", () => {
    // prettier-ignore
    const grid = {
          A1: "Date",       B1: "Price", C1: "Active", D1: "=PIVOT(1)",
          A2: "2024-12-28", B2: "10",    C2: "TRUE",
          A3: "2024-12-29", B3: "20",    C3: "FALSE",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      rows: [],
      columns: [{ fieldName: "Date", granularity: "year" }, { fieldName: "Active" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    expect(getEvaluatedCell(model, "E1")).toMatchObject({ value: 2024, format: "0* " });
    expect(getEvaluatedCell(model, "E2")).toMatchObject({ value: "TRUE", format: "@* " });
    expect(getEvaluatedCell(model, "F2")).toMatchObject({ value: "FALSE", format: "@* " });
  });

  test("PIVOT.HEADER grand total", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
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
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum")');
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
      measures: [{ id: `Name:${aggregator}`, fieldName: "Name", aggregator }],
    });
    setCellContent(model, "A27", `=PIVOT.VALUE(1, "Name:${aggregator}")`);
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
      measures: [{ id: `Name:${aggregator}`, fieldName: "Name", aggregator }],
    });
    setCellContent(model, "A27", `=PIVOT.VALUE(1, "Name:${aggregator}")`);
    expect(getEvaluatedCell(model, "A27").value).toBe(aggregatedValue);
  });

  test("min and max aggregate format is inferred", () => {
    // prettier-ignore
    const grid = {
      A1: "Name",   B1: "Revenue",
      A2: "Alice",  B2: "Hi",
      A3: "Bob",    B3: "5",
    };
    const model = createModelFromGrid(grid);
    setFormat(model, "B3", "[$$]#,##0");
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Name" }],
      measures: [
        { id: "Revenue:max", fieldName: "Revenue", aggregator: "max" },
        { id: "Revenue:min", fieldName: "Revenue", aggregator: "min" },
      ],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Revenue:max")');
    setCellContent(model, "A28", '=PIVOT.VALUE(1, "Revenue:min")');
    expect(getEvaluatedCell(model, "A27").format).toBe("[$$]#,##0");
    expect(getEvaluatedCell(model, "A28").format).toBe("[$$]#,##0");
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
      measures: [{ id: `closed:${aggregator}`, fieldName: "closed", aggregator }],
    });
    setCellContent(model, "A27", `=PIVOT.VALUE(1, "closed:${aggregator}")`);
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
      rows: [{ fieldName: "Date", granularity: "year" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:year", 2024)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // year as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:year", "2024")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:year", 1900)');
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
      rows: [{ fieldName: "Date", granularity: "quarter_number" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:quarter_number", 4)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // quarter as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:quarter_number", "4")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:quarter_number", 1)');
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
      rows: [{ fieldName: "Date", granularity: "month_number" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:month_number", 12)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // month as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:month_number", "12")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:month_number", 1)');
    expect(getEvaluatedCell(model, "A27").value).toBe("");
  });

  test("PIVOT.VALUE grouped by month", () => {
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
      rows: [{ fieldName: "Date", granularity: "month" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:month", "12/2024")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:month", "1/2024")');
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
      rows: [{ fieldName: "Date", granularity: "iso_week_number" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:iso_week_number", 52)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // week as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:iso_week_number", "52")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:iso_week_number", 1)');
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
      rows: [{ fieldName: "Date", granularity: "day_of_month" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:day_of_month", 28)');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // day as string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:day_of_month", "28")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:day_of_month", 1)');
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
      rows: [{ fieldName: "Date", granularity: "day" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    // hardcoded date string
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:day", "2024-12-28")');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // DATE function
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:day", DATE(2024, 12, 28))');
    expect(getEvaluatedCell(model, "A27").value).toBe(30);

    // no matching value
    setCellContent(model, "A27", '=PIVOT.VALUE(1, "Price:sum", "Date:day", "2020-12-28")');
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
      rows: [{ fieldName: "Price" }],
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
      rows: [{ fieldName: "Name" }],
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
      rows: [{ fieldName: "closed" }],
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
      rows: [{ fieldName: "Date", granularity: "year" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:not_a_granularity", 2024)');
    expect(getEvaluatedCell(model, "A27").message).toBe(
      "Dimensions don't match the pivot definition. Consider using a dynamic pivot formula: =PIVOT(1). Or re-insert the static pivot from the Data menu."
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
      rows: [{ fieldName: "Date", granularity: "year" }],
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
      "Dimensions don't match the pivot definition. Consider using a dynamic pivot formula: =PIVOT(1). Or re-insert the static pivot from the Data menu."
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
      rows: [{ fieldName: "Date", granularity: "quarter_number" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:quarter_number", 4)');
    expect(getEvaluatedCell(model, "A27").value).toBe("Q4");
    expect(getEvaluatedCell(model, "A27").format).toBe("@");

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
      "Dimensions don't match the pivot definition. Consider using a dynamic pivot formula: =PIVOT(1). Or re-insert the static pivot from the Data menu."
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
      rows: [{ fieldName: "Date", granularity: "month_number" }],
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
      "Dimensions don't match the pivot definition. Consider using a dynamic pivot formula: =PIVOT(1). Or re-insert the static pivot from the Data menu."
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

  test("PIVOT.HEADER date month groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-12-31",
      A4: "1995-04-14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "month" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:month", "4/2024")');
    expect(getEvaluatedCell(model, "A27").formattedValue).toBe("April 2024");

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:month", "1/2024")');
    expect(getEvaluatedCell(model, "A29").formattedValue).toBe("January 2024");

    // missing header value
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date:month")');
    expect(getEvaluatedCell(model, "A31").message).toBe(
      "Invalid number of arguments for the PIVOT.HEADER function. Expected all arguments after position 1 to be supplied by groups of 2 arguments"
    );

    // without granularity
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date", "4/2024")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "Dimensions don't match the pivot definition. Consider using a dynamic pivot formula: =PIVOT(1). Or re-insert the static pivot from the Data menu."
    );

    // not a valid month
    setCellContent(model, "A34", '=PIVOT.HEADER(1, "Date:month", "14/2024")');
    expect(getEvaluatedCell(model, "A34").message).toBe(
      "The function PIVOT.HEADER expects a number value, but '14/2024' is a string, and cannot be coerced to a number."
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
      rows: [{ fieldName: "Date", granularity: "iso_week_number" }],
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
      "Dimensions don't match the pivot definition. Consider using a dynamic pivot formula: =PIVOT(1). Or re-insert the static pivot from the Data menu."
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
      rows: [{ fieldName: "Date", granularity: "day_of_month" }],
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
      "Dimensions don't match the pivot definition. Consider using a dynamic pivot formula: =PIVOT(1). Or re-insert the static pivot from the Data menu."
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

  test("PIVOT.HEADER date day_of_week groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-04-03", // Wednesday
      A4: "2024-04-02", // Tuesday
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "day_of_week" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:day_of_week", 4)');
    expect(getEvaluatedCell(model, "A27").value).toBe("Wednesday");
    expect(getEvaluatedCell(model, "A27").format).toBe("@");

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:day_of_week", "4")');
    expect(getEvaluatedCell(model, "A28").value).toBe("Wednesday");

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:day_of_week", 7)');
    expect(getEvaluatedCell(model, "A29").value).toBe("Saturday");

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:day_of_week", )');
    expect(getEvaluatedCell(model, "A30").message).toBe(
      "0 is not a valid day of week (it should be a number between 1 and 7)"
    );

    // without granularity
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A31").message).toContain(
      "Dimensions don't match the pivot definition"
    );

    // not a number
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date:day_of_week", "not a number")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );

    // not a valid day of week
    setCellContent(model, "A33", '=PIVOT.HEADER(1, "Date:day_of_week", 8)');
    expect(getEvaluatedCell(model, "A33").message).toBe(
      "8 is not a valid day of week (it should be a number between 1 and 7)"
    );
    setCellContent(model, "A34", '=PIVOT.HEADER(1, "Date:day_of_week", 0)');
    expect(getEvaluatedCell(model, "A34").message).toBe(
      "0 is not a valid day of week (it should be a number between 1 and 7)"
    );
  });

  test("PIVOT.HEADER date hour_number groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-04-03 1:07:12",
      A4: "2024-04-02 2:08:14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "hour_number" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:hour_number", 1)');
    expect(getEvaluatedCell(model, "A27").value).toBe("1h");
    expect(getEvaluatedCell(model, "A27").format).toBe("@");

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:hour_number", "1")');
    expect(getEvaluatedCell(model, "A28").value).toBe("1h");

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:hour_number", 7)');
    expect(getEvaluatedCell(model, "A29").value).toBe("7h");

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:hour_number", )');
    expect(getEvaluatedCell(model, "A30").value).toBe("0h");

    // without granularity
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A31").message).toContain(
      "Dimensions don't match the pivot definition"
    );

    // not a number
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date:hour_number", "not a number")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );

    // not a valid hour
    setCellContent(model, "A33", '=PIVOT.HEADER(1, "Date:hour_number", 24)');
    expect(getEvaluatedCell(model, "A33").message).toBe(
      "24 is not a valid hour (it should be a number between 0 and 23)"
    );
    setCellContent(model, "A34", '=PIVOT.HEADER(1, "Date:hour_number", -1)');
    expect(getEvaluatedCell(model, "A34").message).toBe(
      "-1 is not a valid hour (it should be a number between 0 and 23)"
    );
  });

  test("PIVOT.HEADER date minute_number groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-04-03 1:07:12",
      A4: "2024-04-02 2:08:14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "minute_number" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:minute_number", 7)');
    expect(getEvaluatedCell(model, "A27").value).toBe("7'");
    expect(getEvaluatedCell(model, "A27").format).toBe("@");

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:minute_number", "7")');
    expect(getEvaluatedCell(model, "A28").value).toBe("7'");

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:minute_number", 1)');
    expect(getEvaluatedCell(model, "A29").value).toBe("1'");

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:minute_number", )');
    expect(getEvaluatedCell(model, "A30").value).toBe("0'");

    // without granularity
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A31").message).toContain(
      "Dimensions don't match the pivot definition"
    );

    // not a number
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date:minute_number", "not a number")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );

    // not a valid minute
    setCellContent(model, "A33", '=PIVOT.HEADER(1, "Date:minute_number", 60)');
    expect(getEvaluatedCell(model, "A33").message).toBe(
      "60 is not a valid minute (it should be a number between 0 and 59)"
    );
    setCellContent(model, "A34", '=PIVOT.HEADER(1, "Date:minute_number", -1)');
    expect(getEvaluatedCell(model, "A34").message).toBe(
      "-1 is not a valid minute (it should be a number between 0 and 59)"
    );
  });

  test("PIVOT.HEADER date second_number groupby", () => {
    const grid = {
      A1: "Date",
      A2: "2024-04-03 1:07:12",
      A4: "2024-04-02 2:08:14",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [{ fieldName: "Date", granularity: "second_number" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:second_number", 7)');
    expect(getEvaluatedCell(model, "A27").value).toBe("7''");
    expect(getEvaluatedCell(model, "A27").format).toBe("@");

    setCellContent(model, "A28", '=PIVOT.HEADER(1, "Date:second_number", "7")');
    expect(getEvaluatedCell(model, "A28").value).toBe("7''");

    // not in the dataset
    setCellContent(model, "A29", '=PIVOT.HEADER(1, "Date:second_number", 1)');
    expect(getEvaluatedCell(model, "A29").value).toBe("1''");

    // missing header value
    setCellContent(model, "A30", '=PIVOT.HEADER(1, "Date:second_number", )');
    expect(getEvaluatedCell(model, "A30").value).toBe("0''");

    // without granularity
    setCellContent(model, "A31", '=PIVOT.HEADER(1, "Date", )');
    expect(getEvaluatedCell(model, "A31").message).toContain(
      "Dimensions don't match the pivot definition"
    );

    // not a number
    setCellContent(model, "A32", '=PIVOT.HEADER(1, "Date:second_number", "not a number")');
    expect(getEvaluatedCell(model, "A32").message).toBe(
      "The function PIVOT.HEADER expects a number value, but 'not a number' is a string, and cannot be coerced to a number."
    );

    // not a valid second
    setCellContent(model, "A33", '=PIVOT.HEADER(1, "Date:second_number", 60)');
    expect(getEvaluatedCell(model, "A33").message).toBe(
      "60 is not a valid second (it should be a number between 0 and 59)"
    );
    setCellContent(model, "A34", '=PIVOT.HEADER(1, "Date:second_number", -1)');
    expect(getEvaluatedCell(model, "A34").message).toBe(
      "-1 is not a valid second (it should be a number between 0 and 59)"
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
      rows: [{ fieldName: "Date", granularity: "day" }],
      measures: [],
    });
    setCellContent(model, "A27", '=PIVOT.HEADER(1, "Date:day", DATE(2024, 12, 31))');
    expect(getEvaluatedCell(model, "A27").value).toBe(45657);
    expect(getEvaluatedCell(model, "A27").format).toBe("dd mmm yyyy");

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
      "Dimensions don't match the pivot definition. Consider using a dynamic pivot formula: =PIVOT(1). Or re-insert the static pivot from the Data menu."
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
      measures: [{ id: "Customer:avg", fieldName: "Customer", aggregator: "avg" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(getCellContent(model, "A26")).toBe(model.getters.getPivotDisplayName("1"));
    expect(getEvaluatedCell(model, "B28")).toMatchObject({
      value: CellErrorType.DivisionByZero,
      message: "Evaluation of function AVG caused a divide by zero error.",
      type: CellValueType.error,
    });
  });

  test("can group by value in error", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "=0/0",     B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ fieldName: "Price", aggregator: "sum", id: "Price:sum" }],
    });
    expect(getEvaluatedCell(model, "C4").message).toBe("The divisor must be different from zero.");
    expect(getEvaluatedGrid(model, "C1:D5")).toEqual([
      ["(#1) Pivot", "Total"],
      ["", "Price"],
      ["Alice", "10"],
      ["#DIV/0!", "20"],
      ["Total", "30"],
    ]);
  });

  test("Cannot use PIVOT function inside its range", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "B3", `=PIVOT("1")`);
    expect(getCellContent(model, "B3")).toBe("#CYCLE");
    setCellContent(model, "B3", `=PIVOT.VALUE("1", "__count:sum")`);
    expect(getCellContent(model, "B3")).toBe("#CYCLE");
    setCellContent(model, "B3", `=PIVOT.HEADER("1")`);
    expect(getCellContent(model, "B3")).toBe("#CYCLE");
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
      columns: [{ fieldName: "Date", granularity: "month_number" }],
      measures: [{ id: "__count:sum", fieldName: "__count", aggregator: "sum" }],
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
      rows: [{ fieldName: "Price" }],
      measures: [{ id: "Name:count", fieldName: "Name", aggregator: "count" }],
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

  test("PIVOT.VALUE works after migration", () => {
    const model = new Model({
      version: 17,
      sheets: [
        {
          id: "pivot",
          cells: {
            A1: { content: `=PIVOT.VALUE("1", "Amount")` },
            B1: { content: "Customer" },
            B2: { content: "Alice" },
            C1: { content: "Amount" },
            C2: { content: "10" },
          },
        },
      ],
      pivots: {
        1: {
          type: "SPREADSHEET",
          columns: [],
          rows: [],
          measures: [{ name: "Amount", aggregator: "count" }],
          name: "My pivot",
          dataSet: { sheetId: "pivot", zone: { top: 0, bottom: 1, left: 1, right: 2 } },
          formulaId: "1",
        },
      },
      pivotNextId: 2,
    });
    expect(getEvaluatedCell(model, "A1").value).toBe(1);
  });

  test("PIVOT with the same measures", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Price", C1: "=PIVOT(1)",
      A2: "2024-12-28", B2: "10",
      A3: "2024-11-28", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [],
      columns: [{ fieldName: "Date", granularity: "day" }],
      measures: [
        { id: "Price:sum", fieldName: "Price", aggregator: "sum" },
        { id: "Price:sum:2", fieldName: "Price", aggregator: "sum" },
      ],
    });

    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:I2")).toEqual([
      ["(#1) Pivot", "28 Nov 2024", "",      "28 Dec 2024", "",      "Total", ""],
      ["",           "Price",       "Price", "Price",       "Price", "Price", "Price"],
    ]);
  });

  test("PIVOT with the same measures with custom name", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Price", C1: "=PIVOT(1)",
      A2: "2024-12-28", B2: "10",
      A3: "2024-11-28", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [],
      columns: [{ fieldName: "Date", granularity: "day" }],
      measures: [
        { id: "Price:sum", fieldName: "Price", aggregator: "sum" },
        { id: "Price:sum:2", fieldName: "Price", aggregator: "sum", userDefinedName: "My price" },
      ],
    });

    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:I2")).toEqual([
      ["(#1) Pivot", "28 Nov 2024", "",         "28 Dec 2024", "",         "Total", ""],
      ["",           "Price",       "My price", "Price",       "My price", "Price", "My price"],
    ]);
  });

  test("PIVOT.HEADER with custom measure name", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Price", C1: `=PIVOT.HEADER(1, "measure", "Price:sum")`,
      A2: "2024-12-28", B2: "10",
      A3: "2024-11-28", B3: "20",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [],
      columns: [{ fieldName: "Date", granularity: "day" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });

    expect(getCellContent(model, "C1")).toBe("Price");
    updatePivot(model, "1", {
      measures: [
        { id: "Price:sum", fieldName: "Price", aggregator: "sum", userDefinedName: "My price" },
      ],
    });
    expect(getCellContent(model, "C1")).toBe("My price");
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
      rows: [{ fieldName: "Date", granularity: "year" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    const pivot = model.getters.getPivot(model.getters.getPivotIds()[0]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Date:year", 2024]))).toEqual([
      {
        field: "Date:year",
        value: 2024,
        type: "datetime",
      },
    ]);
    expect(pivot.parseArgsToPivotDomain(toFunctionResultObject(["Date:year", "2024"]))).toEqual([
      {
        field: "Date:year",
        value: 2024,
        type: "datetime",
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
      rows: [{ fieldName: "Amount", granularity: "year" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
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

  test("Can customize the name of a measure", () => {
    const grid = {
      A1: "Amount",
      A2: "1",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A2", {
      columns: [],
      rows: [],
      measures: [{ id: "Amount:sum", fieldName: "Amount", aggregator: "sum" }],
    });
    setCellContent(model, "A26", `=PIVOT.HEADER("1", "measure", "Amount:sum")`);
    expect(getCellContent(model, "A26")).toBe("Amount");
    updatePivot(model, "1", {
      measures: [
        {
          id: "Amount:sum",
          fieldName: "Amount",
          aggregator: "sum",
          userDefinedName: "A lovely name",
        },
      ],
    });
    expect(getCellContent(model, "A26")).toBe("A lovely name");
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
      rows: [{ fieldName: "Active" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
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
      rows: [{ fieldName: "Name" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
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
      A3: '=PIVOT.VALUE(1, "Price:sum")',
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B2", {
      columns: [],
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
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
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    expect(getEvaluatedCell(model, "A3").value).toBe("Alice");
    setCellContent(model, "B2", "Bob");
    expect(getEvaluatedCell(model, "A3").value).toBe("");
  });

  test("can hide measures", () => {
    const grid = {
      A1: "Price",
      A2: "10",
      A5: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    const measures = [
      { id: "Price:sum", fieldName: "Price", aggregator: "sum" },
      {
        id: "double:sum",
        fieldName: "double",
        aggregator: "sum",
        computedBy: { sheetId, formula: "=2*'Price:sum'" },
      },
    ];
    addPivot(model, "A1:A2", {
      rows: [],
      columns: [],
      measures,
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A5:C7")).toEqual([
      ["(#1) Pivot", "Total", ""],
      ["",           "Price", "double"],
      ["Total",      "10",    "20"],
    ]);
    updatePivot(model, "1", {
      measures: measures.map((measure) => ({ ...measure, isHidden: true })),
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A5:C7")).toEqual([
      ["(#1) Pivot", "", ""],
      ["",           "", ""],
      ["Total",      "", ""],
    ]);
  });

  test("Column headers are correct when hiding a measure", () => {
    // prettier-ignore
    const grid = {
      A1: "Price",      B1: "Tax",    C1: "Salesman",
      A2: "10",         B2: "2",      C2: "Alice",
      A3: "20",         B3: "4",      C3: "Bob",
      A5: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      rows: [],
      columns: [{ fieldName: "Salesman" }],
      measures: [
        { id: "Price:sum", fieldName: "Price", aggregator: "sum" },
        { id: "Tax:sum", fieldName: "Tax", aggregator: "sum", isHidden: true },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A5:D7")).toEqual([
      ["(#1) Pivot",  "Alice",  "Bob",   "Total"],
      ["",            "Price",  "Price", "Price"],
      ["Total",       "10",     "20",    "30"],
    ]);
  });
});
