import { Model } from "../../../src";
import {
  createSheet,
  deleteContent,
  deleteSheet,
  redo,
  setCellContent,
  undo,
} from "../../test_helpers/commands_helpers";
import { getCellContent, getCellError } from "../../test_helpers/getters_helpers";
import { addPivot, createModelWithPivot, updatePivot } from "../../test_helpers/pivot_helpers";

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
    addPivot(model, {}, "A1:C5");
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
    addPivot(model, {}, "A1:B5");
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
    addPivot(model, {}, "A1:B5");
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
    addPivot(model, {}, "A1:I4");
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

  test.skip("Pivot fields are not loaded if a cell is in error", () => {
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
    addPivot(model, {}, "A1:B5");
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
  });

  test("Pivot Columns are ordered", () => {
    const model = createModelWithPivot("A1:I5");
    setCellContent(model, "A26", `=pivot(1)`);

    updatePivot(model, "1", {
      columns: [{ name: "Contact Name", order: "asc" }],
    });
    expect(getCellContent(model, "B26")).toBe("adam sample");
    expect(getCellContent(model, "C26")).toBe("Mitchell Admin");
    expect(getCellContent(model, "D26")).toBe("(Undefined)");
    expect(getCellContent(model, "E26")).toBe("Total");
    expect(getCellContent(model, "F26")).toBe("");

    updatePivot(model, "1", {
      columns: [{ name: "Active", order: "desc" }],
    });
    expect(getCellContent(model, "B26")).toBe("TRUE");
    expect(getCellContent(model, "C26")).toBe("FALSE");
    expect(getCellContent(model, "D26")).toBe("Total");
    expect(getCellContent(model, "E26")).toBe("");

    updatePivot(model, "1", {
      columns: [{ name: "Expected Revenue", order: "asc" }],
    });
    expect(getCellContent(model, "B26")).toBe("$2,000.00");
    expect(getCellContent(model, "C26")).toBe("$4,500.00");
    expect(getCellContent(model, "D26")).toBe("$11,000.00");
    expect(getCellContent(model, "E26")).toBe("(Undefined)");
    expect(getCellContent(model, "F26")).toBe("Total");
    expect(getCellContent(model, "G26")).toBe("");

    updatePivot(model, "1", {
      columns: [{ name: "Created on", order: "asc" }],
    });
    expect(getCellContent(model, "B26")).toBe("February");
    expect(getCellContent(model, "C26")).toBe("March");
    expect(getCellContent(model, "D26")).toBe("April");
    expect(getCellContent(model, "E26")).toBe("Total");
    expect(getCellContent(model, "F26")).toBe("");

    updatePivot(model, "1", {
      columns: [{ name: "Created on", order: "asc", granularity: "day_of_month" }],
    });
    expect(getCellContent(model, "B26")).toBe("2");
    expect(getCellContent(model, "C26")).toBe("3");
    expect(getCellContent(model, "D26")).toBe("Total");
    expect(getCellContent(model, "E26")).toBe("");

    updatePivot(model, "1", {
      columns: [{ name: "Created on", order: "desc", granularity: "day_of_month" }],
    });
    expect(getCellContent(model, "B26")).toBe("3");
    expect(getCellContent(model, "C26")).toBe("2");
    expect(getCellContent(model, "D26")).toBe("Total");
    expect(getCellContent(model, "E26")).toBe("");

    updatePivot(model, "1", {
      columns: [{ name: "Created on", order: "asc", granularity: "year_number" }],
    });
    expect(getCellContent(model, "B26")).toBe("2024");
    expect(getCellContent(model, "C26")).toBe("Total");
    expect(getCellContent(model, "D26")).toBe("");
  });

  test("Pivot Rows are ordered", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      rows: [{ name: "Contact Name", order: "asc" }],
    });

    setCellContent(model, "A26", `=pivot(1)`);

    expect(getCellContent(model, "A28")).toBe("adam sample");
    expect(getCellContent(model, "A29")).toBe("Mitchell Admin");
    expect(getCellContent(model, "A30")).toBe("(Undefined)");
    updatePivot(model, "1", {
      rows: [{ name: "Active", order: "desc" }],
    });
    expect(getCellContent(model, "A28")).toBe("TRUE");
    expect(getCellContent(model, "A29")).toBe("FALSE");

    updatePivot(model, "1", {
      rows: [{ name: "Expected Revenue", order: "asc" }],
    });
    expect(getCellContent(model, "A28")).toBe("$2,000.00");
    expect(getCellContent(model, "A29")).toBe("$4,500.00");
    expect(getCellContent(model, "A30")).toBe("$11,000.00");

    updatePivot(model, "1", {
      rows: [{ name: "Created on", order: "asc" }],
    });
    expect(getCellContent(model, "A28")).toBe("February");
    expect(getCellContent(model, "A29")).toBe("March");
    expect(getCellContent(model, "A30")).toBe("April");
    expect(getCellContent(model, "A31")).toBe("Total");
    expect(getCellContent(model, "A32")).toBe("");

    updatePivot(model, "1", {
      rows: [{ name: "Created on", order: "asc", granularity: "day_of_month" }],
    });
    expect(getCellContent(model, "A28")).toBe("2");
    expect(getCellContent(model, "A29")).toBe("3");
    expect(getCellContent(model, "A30")).toBe("Total");
    expect(getCellContent(model, "A31")).toBe("");

    updatePivot(model, "1", {
      rows: [{ name: "Created on", order: "desc", granularity: "day_of_month" }],
    });
    expect(getCellContent(model, "A28")).toBe("3");
    expect(getCellContent(model, "A29")).toBe("2");
    expect(getCellContent(model, "A30")).toBe("Total");
    expect(getCellContent(model, "A31")).toBe("");

    updatePivot(model, "1", {
      rows: [{ name: "Created on", order: "asc", granularity: "year_number" }],
    });
    expect(getCellContent(model, "A28")).toBe("2024");
    expect(getCellContent(model, "A29")).toBe("Total");
    expect(getCellContent(model, "A30")).toBe("");
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

    expect(getCellContent(model, "B26")).toBe("adam sample");
    expect(getCellContent(model, "C26")).toBe("Mitchell Admin");
    expect(getCellContent(model, "D26")).toBe("(Undefined)");
    expect(getCellContent(model, "E26")).toBe("");
    expect(getCellContent(model, "F26")).toBe("");
    expect(getCellContent(model, "G26")).toBe("");

    expect(getCellContent(model, "B27")).toBe("TRUE");
    expect(getCellContent(model, "C27")).toBe("TRUE");
    expect(getCellContent(model, "D27")).toBe("FALSE");
    expect(getCellContent(model, "E27")).toBe("TRUE");
    expect(getCellContent(model, "F27")).toBe("Total");
    expect(getCellContent(model, "G27")).toBe("");
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

    expect(getCellContent(model, "A28")).toBe("adam sample");
    expect(getCellContent(model, "A29")).toBe("TRUE");
    expect(getCellContent(model, "A30")).toBe("Mitchell Admin");
    expect(getCellContent(model, "A31")).toBe("TRUE");
    expect(getCellContent(model, "A32")).toBe("(Undefined)");
    expect(getCellContent(model, "A33")).toBe("FALSE");
    expect(getCellContent(model, "A34")).toBe("TRUE");
    expect(getCellContent(model, "A35")).toBe("Total");
    expect(getCellContent(model, "A36")).toBe("");
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

  test("Pivot is correctly marked as error when a field is empty", () => {
    const model = createModelWithPivot("A1:I5");
    deleteContent(model, ["A1"]);
    setCellContent(model, "A26", `=pivot(1)`);
    expect(model.getters.getPivot("1").isValid()).toBeFalsy();
    expect(getCellError(model, "A26")).toBe("The pivot cannot be created because cell A1 is empty");
  });

  test("Pivot date dimensions are ordered 'asc' by default", () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      rows: [{ name: "Created on", granularity: "day_of_month" }],
    });
    setCellContent(model, "A26", `=pivot(1)`);
    expect(model.getters.getPivot("1").definition.rows[0].order).toEqual("asc");
    expect(getCellContent(model, "A28")).toBe("2");
    expect(getCellContent(model, "A29")).toBe("3");
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
      measures: [{ name: "__count" }],
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
      "The pivot cannot be created because the dataset is undefined."
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
      "The pivot cannot be created because the dataset is undefined."
    );
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
      addPivot(model, {}, "A1:C5");
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
