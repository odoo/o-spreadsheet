import { Model, SpreadsheetPivotCoreDefinition } from "../../src";
import { addPivot } from "../../tests/test_helpers/pivot_helpers";
import { setCellContent, setFormat } from "../test_helpers/commands_helpers";
import {
  getEvaluatedCell,
  getEvaluatedFormatGrid,
  getEvaluatedGrid,
} from "../test_helpers/getters_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";

let model: Model;
const pivotId = "1";
const measureId = "mid";

function createModelWithTestPivot(pivotDefinition?: Partial<SpreadsheetPivotCoreDefinition>) {
  // prettier-ignore
  const grid = {
    A20:"Foo",         B20: "Bar",    C20: "Probability",  D20: "Product",  E20: "id",
    A21: "1",          B21: "TRUE",   C21: "11",           D21: "xpad",     E21: "2",
    A22: "17",         B22: "TRUE",   C22: "95",           D22: "xpad",     E22: "3",
    A23: "2",          B23: "FALSE",  C23: "15",           D23: "xpad",     E23: "4",
    A24: "12",         B24: "TRUE",   C24: "10",           D24: "xphone",   E24: "1",
  };
  model = createModelFromGrid(grid);
  setFormat(model, "C21:C24", "#,##0.00");

  const defaultPivotDefinition: Partial<SpreadsheetPivotCoreDefinition> = {
    columns: [{ fieldName: "Product", order: "desc" }],
    rows: [{ fieldName: "Foo", order: "asc" }],
    measures: [{ fieldName: "Probability", aggregator: "sum", id: measureId }],
  };
  addPivot(model, "A20:E24", pivotDefinition || defaultPivotDefinition, pivotId);
  return model;
}

describe("PIVOT formula", () => {
  test("full PIVOT() values", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", "=PIVOT(1)");

    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D7", "asValue")).toMatchObject([
      ["(#1) Pivot",  "xphone",       "xpad",         "Total"],
      ["",            "Probability",  "Probability",  "Probability"],
      [1,             "",             11,             11],
      [2,             "",             15,             15],
      [12,            10,             "",             10],
      [17,            "",             95,             95],
      ["Total",       10,             121,            131],
  ]);
  });

  test("full PIVOT() formats", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", `=PIVOT("1")`);
    // prettier-ignore
    expect(getEvaluatedFormatGrid(model, "A1:D7")).toEqual([
        [undefined, undefined,  undefined,  undefined],
        [undefined, undefined,  undefined,  undefined],
        [undefined, undefined,  "#,##0.00", "#,##0.00"],
        [undefined, undefined,  "#,##0.00", "#,##0.00"],
        [undefined, "#,##0.00", undefined,  "#,##0.00"],
        [undefined, undefined,  "#,##0.00", "#,##0.00"],
        [undefined, "#,##0.00", "#,##0.00", "#,##0.00"],
    ]);
  });

  test("PIVOT(row_count=1)", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", `=PIVOT("1", 1)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D4", "asValue")).toEqual([
        ["(#1) Pivot",         "xphone",       "xpad",         "Total"],
        ["",                    "Probability",  "Probability",  "Probability"],
        [1,                     "",             11,             11],
        [null,                  null,           null,           null],
    ]);
  });

  test("PIVOT(row_count=0)", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", `=PIVOT("1", 0)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D3", "asValue")).toEqual([
        ["(#1) Pivot",         "xphone",       "xpad",         "Total"],
        ["",                    "Probability",  "Probability",  "Probability"],
        [null,                  null,           null,           null],
    ]);
  });

  test("PIVOT(negative row_count)", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", `=PIVOT("1", -1)`);
    expect(getEvaluatedCell(model, "A1").value).toBe("#ERROR");
    expect(getEvaluatedCell(model, "A1").message).toBe("The number of rows must be positive.");
  });

  test("PIVOT(include_column_titles=FALSE)", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", `=PIVOT("1",,,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D5", "asValue")).toEqual([
        [1,         "",             11,             11],
        [2,         "",             15,             15],
        [12,        10,             "",             10],
        [17,        "",             95,             95],
        ["Total",   10,             121,            131],
    ]);
  });

  test("PIVOT(include_total=FALSE) with no groupbys applied", () => {
    createModelWithTestPivot({
      measures: [{ fieldName: "Probability", aggregator: "sum", id: measureId }],
    });
    setCellContent(model, "A1", `=PIVOT("1",,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:B3", "asValue")).toEqual([
            ["(#1) Pivot",         "Total"],
            ["",                    "Probability"],
            ["Total",               131],
        ]);
  });

  test("PIVOT(include_total=FALSE) with multiple measures and no groupbys applied", () => {
    createModelWithTestPivot({
      measures: [
        { fieldName: "Probability", aggregator: "sum", id: measureId },
        { fieldName: "Foo", aggregator: "sum", id: "m2" },
      ],
    });

    setCellContent(model, "A1", `=PIVOT("1",,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:C3", "asValue")).toEqual([
            ["(#1) Pivot",         "Total",        ""],
            ["",                    "Probability",  "Foo"],
            ["Total",               131,            32],
        ]);
  });

  test("PIVOT(include_total=FALSE) with only row groupby applied", () => {
    createModelWithTestPivot({
      rows: [{ fieldName: "Foo", order: "asc" }],
      measures: [{ fieldName: "Probability", aggregator: "sum", id: measureId }],
    });

    setCellContent(model, "A1", `=PIVOT("1",,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:C7", "asValue")).toEqual([
            ["(#1) Pivot",         "Total",        null],
            ["",                    "Probability",  null],
            [1,                     11,             null],
            [2,                     15,             null],
            [12,                    10,             null],
            [17,                    95,             null],
            [null,                  null,           null],
        ]);
  });

  test("PIVOT(include_total=FALSE) with multiple measures and only row groupby applied", () => {
    createModelWithTestPivot({
      rows: [{ fieldName: "Product", order: "desc" }],
      measures: [
        { fieldName: "Probability", aggregator: "sum", id: measureId },
        { fieldName: "Foo", aggregator: "sum", id: "m2" },
      ],
    });
    setCellContent(model, "A1", `=PIVOT("1",,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D5", "asValue")).toEqual([
            ["(#1) Pivot",             "Total",            "",        null],
            ["",                        "Probability",      "Foo",     null],
            ["xphone",                  10,                 12,        null],
            ["xpad",                    121,                20,        null],
            [null,                      null,               null,      null],
        ]);
  });

  test("PIVOT(include_total=FALSE) with only col groupby applied", () => {
    createModelWithTestPivot({
      columns: [{ fieldName: "Product", order: "desc" }],
      measures: [{ fieldName: "Probability", aggregator: "sum", id: measureId }],
    });

    setCellContent(model, "A1", `=PIVOT("1",,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D4", "asValue")).toEqual([
            ["(#1) Pivot",            "xphone",          "xpad",            null],
            ["",                       "Probability",     "Probability",     null],
            ["Total",                  10,                121,               null],
            [null,                     null,              null,              null],
        ]);
  });

  test("PIVOT(include_total=FALSE, include_column_titles=FALSE)", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", `=PIVOT("1",,FALSE,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D5", "asValue")).toEqual([
            [1,         "",             11,             null],
            [2,         "",             15,             null],
            [12,        10,             "",             null],
            [17,        "",             95,             null],
            [null,      null,           null,           null],
        ]);
  });

  test("PIVOT(row_count=1, include_total=FALSE, include_column_titles=FALSE)", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", `=PIVOT("1",1,FALSE,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D2", "asValue")).toEqual([
            [1,         "",             11,             null],
            [null,      null,           null,           null],
        ]);
  });

  test("PIVOT(row_count=0, include_total=FALSE, include_column_titles=FALSE)", () => {
    setCellContent(model, "A1", `=PIVOT("1",0,FALSE,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D1", "asValue")).toEqual([
            ["(#1) Pivot",        null, null, null],
        ]);
  });

  test("PIVOT(row_count=0, include_total=TRUE, include_column_titles=FALSE)", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", `=PIVOT("1",0,TRUE,FALSE)`);
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D1", "asValue")).toEqual([
            ["(#1) Pivot",        null, null, null],
        ]);
  });

  test("PIVOT with multiple row groups", () => {
    createModelWithTestPivot({
      columns: [{ fieldName: "Product", order: "desc" }],
      rows: [
        { fieldName: "Foo", order: "asc" },
        { fieldName: "id", order: "asc" },
      ],
      measures: [{ fieldName: "Probability", aggregator: "sum", id: measureId }],
    });

    setCellContent(model, "A1", `=PIVOT("1")`);
    // values from the PIVOT function
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D11", "asValue")).toEqual([
        ["(#1) Pivot",         "xphone",       "xpad",         "Total"],
        ["",                    "Probability",  "Probability",  "Probability"],
        [1,                     "",             11,             11],
        [2,                     "",             11,             11],
        [2,                     "",             15,             15],
        [4,                     "",             15,             15],
        [12,                    10,             "",             10],
        [1,                     10,             "",             10],
        [17,                    "",             95,             95],
        [3,                     "",             95,             95],
        ["Total",               10,             121,            131],
    ]);
    setCellContent(model, "A1", `=PIVOT("1",,FALSE)`);
    // values from the PIVOT function without any group totals
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:D11", "asValue")).toEqual([
        ["(#1) Pivot",        "xphone",       "xpad",         null],
        ["",                   "Probability",  "Probability",  null],
        [1,                    "",             "",             null], // group header but without total values
        [2,                    "",             11,             null],
        [2,                    "",             "",             null], // group header but without total values
        [4,                    "",             15,             null],
        [12,                   "",             "",             null], // group header but without total values
        [1,                    10,             "",             null],
        [17,                   "",             "",             null], // group header but without total values
        [3,                    "",             95,             null],
        [null,                 null,           null,           null],
    ]);
  });

  test("edit pivot groups", () => {
    createModelWithTestPivot();
    setCellContent(model, "A1", `=PIVOT("1")`);
    const originalGrid = getEvaluatedGrid(model, "A1:D7", "asValue");
    // prettier-ignore
    expect(originalGrid).toEqual([
        ["(#1) Pivot",           "xphone",       "xpad",         "Total"],
        ["",            "Probability",  "Probability",  "Probability"],
        [1,             "",             11,             11],
        [2,             "",             15,             15],
        [12,            10,             "",             10],
        [17,            "",             95,             95],
        ["Total",       10,             121,            131],
    ]);
    const [pivotId] = model.getters.getPivotIds();
    model.dispatch("UPDATE_PIVOT", {
      pivotId,
      pivot: {
        ...model.getters.getPivotCoreDefinition(pivotId),
        columns: [],
        rows: [],
      },
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A1:B3", "asValue")).toEqual([
        ["(#1) Pivot",         "Total"],
        ["",                    "Probability"],
        ["Total",               131],
    ]);
    model.dispatch("REQUEST_UNDO");
    expect(getEvaluatedGrid(model, "A1:D7", "asValue")).toEqual(originalGrid);
  });

  test("Renaming the pivot reevaluates the PIVOT function", () => {
    createModelWithTestPivot();
    const pivotId = model.getters.getPivotIds()[0];
    setCellContent(model, "A1", `=PIVOT("1")`);
    expect(getEvaluatedCell(model, "A1").value).toBe("(#1) Pivot");
    model.dispatch("RENAME_PIVOT", {
      pivotId,
      name: "New Name",
    });
    expect(getEvaluatedCell(model, "A1").value).toBe("(#1) New Name");
  });
});
