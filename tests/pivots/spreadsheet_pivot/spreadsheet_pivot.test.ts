import { CellErrorType, Model } from "../../../src";
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
import { addPivot, createModelWithPivot, updatePivot } from "../../test_helpers/pivot_helpers";
import { CellValueType } from "./../../../src/types/cells";

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
    const fields = model.getters.getPivot("1").getFields()!;
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
    const fields = model.getters.getPivot("1").getFields()!;
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
    const fields = model.getters.getPivot("1").getFields()!;
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
    const fields = model.getters.getPivot("1").getFields()!;
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
    expect(getEvaluatedGrid(model, "B26:E26")).toEqual([["1", "2", "Total", ""]]);
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
      expect(Object.keys(model.getters.getPivot("1").getFields()!)).toEqual([
        "Customer",
        "Order",
        "Date",
      ]);
      setCellContent(model, "A1", "Tabouret");
      expect(Object.keys(model.getters.getPivot("1").getFields()!)).toEqual([
        "Tabouret",
        "Order",
        "Date",
      ]);
      setCellContent(model, "A1", "=1/0");
      expect(Object.keys(model.getters.getPivot("1").getFields()!)).toEqual([]);
      expect(model.getters.getPivot("1").isValid()).toBeFalsy();
      setCellContent(model, "A1", "Tabouret");
      expect(model.getters.getPivot("1").isValid()).toBeTruthy();
    });
  });
});
