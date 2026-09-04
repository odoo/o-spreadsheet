import { Model } from "../../src";
import { ColumnAnalysis, analyzeColumns } from "../../src/helpers/data_analysis";
import { toZone } from "../../src/helpers/zones";
import { createTable, setCellContent, setFormat } from "../test_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";
import { createModelWithPivot, updatePivot } from "../test_helpers/pivot_helpers";

function columnType(model: Model, xc: string): string {
  return analyzeColumns([toZone(xc)], model.getters)[0].type;
}

function analyzeColumn(model: Model, xc: string): ColumnAnalysis {
  return analyzeColumns([toZone(xc)], model.getters)[0];
}

describe("analyzeColumns", () => {
  test("empty column", () => {
    const model = new Model();
    expect(columnType(model, "A1:A3")).toBe("empty");
  });

  test("all-error column", () => {
    const model = createModelFromGrid({ A1: "=1/0", A2: "=1/0" });
    expect(columnType(model, "A1:A2")).toBe("error");
  });

  test("numeric column", () => {
    const model = createModelFromGrid({ A1: "1", A2: "2", A3: "3" });
    expect(columnType(model, "A1:A3")).toBe("number");
  });

  test("date column", () => {
    const model = new Model();
    setCellContent(model, "A1", "1/1/2024");
    setCellContent(model, "A2", "2/1/2024");
    setFormat(model, "A1:A2", "mm/dd/yyyy");
    expect(columnType(model, "A1:A2")).toBe("date");
  });

  test("percentage column — explicit format", () => {
    const model = new Model();
    setCellContent(model, "A1", "0.3");
    setCellContent(model, "A2", "0.5");
    setFormat(model, "A1:A2", "0%");
    expect(columnType(model, "A1:A2")).toBe("percentage");
  });

  test("categorical column — low unique ratio", () => {
    const model = createModelFromGrid({
      A1: "apple",
      A2: "banana",
      A3: "apple",
      A4: "banana",
      A5: "apple",
    });
    expect(columnType(model, "A1:A5")).toBe("categorical");
  });

  test("label column — high unique ratio", () => {
    const model = createModelFromGrid({
      A1: "Alice",
      A2: "Bob",
      A3: "Charlie",
      A4: "Dave",
    });
    expect(columnType(model, "A1:A4")).toBe("label");
  });

  test("boolean column", () => {
    const model = createModelFromGrid({ A1: "=TRUE", A2: "=FALSE" });
    expect(columnType(model, "A1:A2")).toBe("boolean");
  });
});

describe("header detection", () => {
  test("header detection — first text cell, rest numeric", () => {
    const model = createModelFromGrid({ A1: "Revenue", A2: "100", A3: "200" });
    const col = analyzeColumn(model, "A1:A3");
    expect(col.headerInZone).toBe(true);
    expect(col.header).toBe("Revenue");
    expect(col.rowCount).toBe(2); // only data rows, not header
  });

  test("no header when first cell is numeric", () => {
    const model = createModelFromGrid({ A1: "100", A2: "200", A3: "300" });
    const col = analyzeColumn(model, "A1:A3");
    expect(col.headerInZone).toBe(false);
    expect(col.rowCount).toBe(3);
  });

  test("header is taken from the table header row", () => {
    const model = createModelFromGrid({ A1: "Revenue", A2: "100", A3: "200", A4: "300" });
    createTable(model, "A1:A4");
    const col = analyzeColumn(model, "A1:A4");
    expect(col.headerInZone).toBe(true);
    expect(col.header).toBe("Revenue");
    expect(col.rowCount).toBe(3);
  });

  test("table header is detected even when the header row is not part of the analyzed zone", () => {
    const model = createModelFromGrid({ A1: "Revenue", A2: "100", A3: "200", A4: "300" });
    createTable(model, "A1:A4");
    const col = analyzeColumn(model, "A2:A4");
    expect(col.headerInZone).toBe(false);
    expect(col.header).toBe("Revenue");
    expect(col.rowCount).toBe(3);
  });

  test("table header is detected even when the header row is not part of the analyzed zone in multicolumn", () => {
    const model = createModelFromGrid({
      A1: "Revenue",
      A2: "100",
      A3: "200",
      A4: "300",
      B1: "Cost",
      B2: "50",
      B3: "100",
      B4: "150",
    });
    createTable(model, "A1:B4");
    const cols = analyzeColumns([toZone("A2:B4")], model.getters);
    expect(cols[0].headerInZone).toBe(false);
    expect(cols[0].header).toBe("Revenue");
    expect(cols[0].rowCount).toBe(3);
    expect(cols[1].headerInZone).toBe(false);
    expect(cols[1].header).toBe("Cost");
    expect(cols[1].rowCount).toBe(3);
  });

  test("last row of a multi-row table header is used as the header", () => {
    const model = createModelFromGrid({
      A1: "Category",
      A2: "Revenue",
      A3: "100",
      A4: "200",
    });
    createTable(model, "A1:A4", { numberOfHeaders: 2 });
    const col = analyzeColumn(model, "A1:A4");
    expect(col.headerInZone).toBe(true);
    expect(col.header).toBe("Revenue");
    expect(col.rowCount).toBe(2);
  });

  test("empty table header row results in no header", () => {
    const model = createModelFromGrid({ A2: "100", A3: "200" });
    createTable(model, "A1:A3");
    const col = analyzeColumn(model, "A1:A3");
    expect(col.headerInZone).toBe(false);
    expect(col.header).toBeUndefined();
    expect(col.rowCount).toBe(2);
  });

  test("table without a header", () => {
    const model = createModelFromGrid({ A1: "100", A2: "200", A3: "300" });
    createTable(model, "A1:A3", { numberOfHeaders: 0 });
    const col = analyzeColumn(model, "A1:A3");
    expect(col.headerInZone).toBe(false);
    expect(col.header).toBeUndefined();
    expect(col.rowCount).toBe(3);
  });

  test("the analyzed zone extends past the table", () => {
    const model = createModelFromGrid({
      A1: "Revenue",
      A2: "100",
      A3: "200",
      A4: "300",
      A5: "400",
    });
    createTable(model, "A1:A3");
    const col = analyzeColumn(model, "A2:A5");
    expect(col.headerInZone).toBe(false);
    expect(col.header).toBeUndefined();
    expect(col.rowCount).toBe(4);
  });

  test("header is detected from a pivot table with a row groupby", () => {
    const model = createModelWithPivot("A1:I22");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Salesperson" }],
      measures: [{ id: "revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
      style: { tableStyleId: "PivotTableStyleMedium9" },
    });
    setCellContent(model, "A25", "=PIVOT(1)");
    const col = analyzeColumn(model, "B27:B28");
    expect(col.headerInZone).toBe(false);
    expect(col.header).toBe("Expected Revenue");
    expect(col.rowCount).toBe(2);
  });
});
