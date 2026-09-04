import { Model } from "../../src";
import { analyzeColumns } from "../../src/helpers/data_analysis";
import { toZone } from "../../src/helpers/zones";
import { setCellContent, setFormat } from "../test_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";

function columnType(model: Model, xc: string): string {
  return analyzeColumns([toZone(xc)], model.getters)[0].type;
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
    expect(columnType(model, "A1:A2")).toBe("categorical");
  });

  test("header detection — first text cell, rest numeric", () => {
    const model = createModelFromGrid({ A1: "Revenue", A2: "100", A3: "200" });
    const col = analyzeColumns([toZone("A1:A3")], model.getters)[0];
    expect(col.hasHeader).toBe(true);
    expect(col.header).toBe("Revenue");
    expect(col.rowCount).toBe(2); // only data rows, not header
  });

  test("no header when first cell is numeric", () => {
    const model = createModelFromGrid({ A1: "100", A2: "200", A3: "300" });
    const col = analyzeColumns([toZone("A1:A3")], model.getters)[0];
    expect(col.hasHeader).toBe(false);
    expect(col.rowCount).toBe(3);
  });
});
