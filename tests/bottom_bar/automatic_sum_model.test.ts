import { Model } from "../../src";
import { merge, setCellContent } from "../test_helpers/commands_helpers";
import { automaticSum, automaticSumMulti, getCellText } from "../test_helpers/getters_helpers";
import { createModel } from "../test_helpers/helpers";

describe("automatic sum", () => {
  let model: Model;

  beforeEach(async () => {
    model = await createModel();
  });

  test("vertical", async () => {
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "A3", "3");
    await automaticSum(model, "A4");
    expect(getCellText(model, "A4")).toBe("=SUM(A2:A3)");
  });

  test("horizontal", async () => {
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "B2", "3");
    await automaticSum(model, "C2");
    expect(getCellText(model, "C2")).toBe("=SUM(A2:B2)");
  });

  test("single cell in an empty sheet", async () => {
    await automaticSum(model, "C2");
    expect(getCellText(model, "C2")).toBe("");
  });

  test("1d zone in an empty sheet", async () => {
    await automaticSum(model, "A3:B3");
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getEvaluatedCells(sheetId)).toEqual([]);
  });

  test("2d zone in an empty sheet", async () => {
    await automaticSum(model, "A3:D4");
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getEvaluatedCells(sheetId)).toEqual([]);
  });

  test("from A1", async () => {
    await automaticSum(model, "A1");
    expect(getCellText(model, "A1")).toBe("");
  });

  test("with only string", async () => {
    await setCellContent(model, "B2", "a string");
    await automaticSum(model, "B3");
    expect(getCellText(model, "B3")).toBe("");
  });

  test("with numbers after", async () => {
    await setCellContent(model, "B2", "4");
    await setCellContent(model, "B3", "4");
    await setCellContent(model, "B4", "4");
    await automaticSum(model, "B3");
    expect(getCellText(model, "B3")).toBe("=SUM(B2)");
    await automaticSum(model, "B2:B3");
    expect(getCellText(model, "B5")).toBe("=SUM(B2:B3)");
  });

  test("with strings after numbers", async () => {
    await setCellContent(model, "B2", "4");
    await setCellContent(model, "B3", "a string");
    await setCellContent(model, "B4", `="a string"`);
    await automaticSum(model, "B5");
    expect(getCellText(model, "B5")).toBe("=SUM(B2:B4)");
  });

  test("with a string between numbers", async () => {
    await setCellContent(model, "B2", "4");
    await setCellContent(model, "B3", "a string");
    await setCellContent(model, "B4", "5");
    await automaticSum(model, "B5");
    expect(getCellText(model, "B5")).toBe("=SUM(B4)");
  });

  test("with a boolean after numbers", async () => {
    await setCellContent(model, "B2", "4");
    await setCellContent(model, "B3", "=TRUE");
    await automaticSum(model, "B4");
    expect(getCellText(model, "B4")).toBe("");
  });

  test("with a date after numbers", async () => {
    await setCellContent(model, "B2", "4");
    await setCellContent(model, "B3", "10/10/2020");
    await automaticSum(model, "B4");
    expect(getCellText(model, "B4")).toBe("");
  });

  test("with a date resulting from a formula after numbers", async () => {
    await setCellContent(model, "B2", "4");
    await setCellContent(model, "B3", "=DATE(2020, 12, 31)");
    await automaticSum(model, "B4");
    expect(getCellText(model, "B4")).toBe("");
  });

  test("with a date resulting from a formula before numbers", async () => {
    await setCellContent(model, "B2", "=DATE(2020, 12, 31)");
    await setCellContent(model, "B3", "4");
    await automaticSum(model, "B4");
    expect(getCellText(model, "B4")).toBe("=SUM(B3)");
  });

  test("with a bad expression after numbers", async () => {
    await setCellContent(model, "B2", "4");
    await setCellContent(model, "B3", "=THIS IS A BAD EXPRESSION");
    await automaticSum(model, "B4");
    expect(getCellText(model, "B4")).toBe("");
  });

  test("with a number formula", async () => {
    await setCellContent(model, "B2", "=4");
    await automaticSum(model, "B4");
    expect(getCellText(model, "B4")).toBe("=SUM(B2:B3)");
  });

  test("with spreaded values", async () => {
    await setCellContent(model, "A1", "=MUNIT(2)");
    await automaticSum(model, "B1:B2");
    expect(getCellText(model, "B3")).toBe("=SUM(B1:B2)");
  });

  test("on a number", async () => {
    await setCellContent(model, "B2", "4");
    await setCellContent(model, "B3", "4");
    await automaticSum(model, "B3");
    expect(getCellText(model, "B3")).toBe("=SUM(B2)");
  });

  test("col and row adjacent ranges: sum col", async () => {
    await setCellContent(model, "C2", "4");
    await setCellContent(model, "B3", "4");
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(C2)");
  });

  test("adjacent row range with number value", async () => {
    await setCellContent(model, "C1", "4");
    await setCellContent(model, "B3", "4");
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(A3:B3)");
  });

  test("adjacent row range with string value", async () => {
    await setCellContent(model, "C1", "4");
    await setCellContent(model, "B3", "hello");
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(C1:C2)");
  });

  test("no adjacent range: sum col", async () => {
    await setCellContent(model, "C1", "4");
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(C1:C2)");
  });

  test("no adjacent range, number in row", async () => {
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(A3:B3)");
  });

  test("no adjacent range, number before string in row", async () => {
    await setCellContent(model, "A3", "4");
    await setCellContent(model, "B3", "hello");
    await automaticSum(model, "D3");
    expect(getCellText(model, "D3")).toBe("=SUM(A3:C3)");
  });

  test("no adjacent range, string in col after number", async () => {
    await setCellContent(model, "C1", "4");
    await setCellContent(model, "C2", "hello");
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(C1:C2)");
  });

  test("vertical zone with adjacent numbers", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "A2", "4");
    await automaticSum(model, "B1:B2");
    expect(getCellText(model, "B1")).toBe("=SUM(A1)");
    expect(getCellText(model, "B2")).toBe("=SUM(A2)");
  });

  test("no adjacent range, boolean in col after number", async () => {
    await setCellContent(model, "C1", "4");
    await setCellContent(model, "C2", "TRUE");
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(A3:B3)");
  });

  test("no adjacent range, date in col after number", async () => {
    await setCellContent(model, "C1", "4");
    await setCellContent(model, "C2", "10/10/2020");
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(A3:B3)");
  });

  test("merge above number", async () => {
    await setCellContent(model, "A1", "4");
    await merge(model, "A1:A2");
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "A5");
    expect(getCellText(model, "A5")).toBe("=SUM(A3:A4)");
  });

  test("number above merge", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "A2", "4");
    await merge(model, "A2:A3");
    await automaticSum(model, "A5");
    expect(getCellText(model, "A5")).toBe("=SUM(A1:A4)");
  });

  test("merge larger than one column below top-left", async () => {
    await setCellContent(model, "A1", "4");
    await merge(model, "A1:B1");
    await automaticSum(model, "A2");
    expect(getCellText(model, "A2")).toBe("=SUM(A1)");
  });

  test("merge larger than one column not below top-left", async () => {
    await setCellContent(model, "A1", "4");
    await merge(model, "A1:B1");
    await automaticSum(model, "B2");
    expect(getCellText(model, "B2")).toBe("");
  });

  test("merge with number above top-left from below top left", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "A2", "4");
    await merge(model, "A2:B2");
    await automaticSum(model, "A3");
    expect(getCellText(model, "A3")).toBe("=SUM(A1:B2)");
  });

  test("merge with number above top-left not from below top left", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "A2", "4");
    await merge(model, "A2:B2");
    await automaticSum(model, "B3");
    expect(getCellText(model, "A3")).toBe("");
  });

  test("horizontal merge with number above not top-left: from below top-left", async () => {
    await setCellContent(model, "B1", "4");
    await setCellContent(model, "A2", "4");
    await merge(model, "A2:B2");
    await automaticSum(model, "A3");
    expect(getCellText(model, "A3")).toBe("=SUM(A2)");
  });

  test("horizontal merge with number above not top-left: not from below top-left", async () => {
    await setCellContent(model, "B1", "4");
    await setCellContent(model, "A2", "4");
    await merge(model, "A2:B2");
    await automaticSum(model, "B3");
    expect(getCellText(model, "B3")).toBe("=SUM(A1:B2)");
  });

  test("merge with number above entire merge: below top left", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "A2", "4");
    await merge(model, "A2:B2");
    await automaticSum(model, "A3");
    expect(getCellText(model, "A3")).toBe("=SUM(A1:B2)");
  });

  test("merge with number above entire merge: not below top left", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "A2", "4");
    await merge(model, "A2:B2");
    await automaticSum(model, "B3");
    expect(getCellText(model, "A3")).toBe("");
  });

  test("merge above is more than one cell high", async () => {
    await setCellContent(model, "A3", "4");
    await setCellContent(model, "B1", "4");
    await merge(model, "B1:B2");
    await automaticSum(model, "B3");
    expect(getCellText(model, "B3")).toBe("=SUM(A3)");
  });

  test("horizontal merge above: below top left", async () => {
    await setCellContent(model, "A3", "4");
    await setCellContent(model, "B2", "4");
    await merge(model, "B2:C2");
    await automaticSum(model, "B3");
    expect(getCellText(model, "B3")).toBe("=SUM(B2)");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(A3:B3)");
  });

  test("merge above is only one cell high: not below top left", async () => {
    await setCellContent(model, "A3", "4");
    await setCellContent(model, "B2", "4");
    await merge(model, "B2:C2");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(A3:B3)");
  });

  test("merge left more than one cell high", async () => {
    await setCellContent(model, "A2", "4");
    await merge(model, "A2:A3");
    await automaticSum(model, "B2");
    expect(getCellText(model, "B2")).toBe("=SUM(A2)");
    expect(getCellText(model, "B3")).toBe("");
  });

  test("vertical merge left with lone number above: next to top left", async () => {
    await setCellContent(model, "B1", "4");
    await setCellContent(model, "A3", "4");
    await merge(model, "A3:A4");
    await automaticSum(model, "B3");
    expect(getCellText(model, "B3")).toBe("=SUM(A3)");
  });

  test("vertical merge left with lone number above: not next to top left", async () => {
    await setCellContent(model, "B1", "4");
    await setCellContent(model, "A3", "4");
    await merge(model, "A3:A4");
    await automaticSum(model, "B4");
    expect(getCellText(model, "B4")).toBe("=SUM(B1:B3)");
  });

  test("merge left, top-left not adjacent", async () => {
    await setCellContent(model, "A3", "4");
    await merge(model, "A3:B4");
    await automaticSum(model, "C3");
    expect(getCellText(model, "C3")).toBe("=SUM(A3)");
    expect(getCellText(model, "C4")).toBe("");
  });

  test.each([
    ["C3", "=SUM(C1:C2)"],
    ["C4", "=SUM(C1:C3)"],
  ])("merge left, top-left not adjacent with lone number above", async (anchor, formula) => {
    await setCellContent(model, "C1", "4");
    await setCellContent(model, "A3", "4");
    await merge(model, "A3:B4");
    await automaticSum(model, anchor);
    expect(getCellText(model, anchor)).toBe(formula);
  });

  test("starting point is merged with number adjacent to top-left", async () => {
    await setCellContent(model, "A1", "4");
    await merge(model, "B1:B2");
    await automaticSum(model, "B1:B2", { anchor: "B2" });
    expect(getCellText(model, "B1")).toBe("");
    await automaticSum(model, "B1");
    expect(getCellText(model, "B1")).toBe("=SUM(A1)");
  });

  test("starting point is merged with number not adjacent to top-left", async () => {
    await setCellContent(model, "A2", "4");
    await merge(model, "B1:B2");
    expect(getCellText(model, "B1")).toBe("");
  });

  test.each([
    ["A3", { A3: "=SUM(A1:A2)", B3: "=SUM(B1:B2)" }],
    ["B3", { A3: "=SUM(A2)", B3: "=SUM(B2)" }],
  ])("1d empty zone: anchor=%s", async (anchor, expected) => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "B2", "4");
    await automaticSum(model, "A3:B3", { anchor });
    expect(getCellText(model, "A3")).toBe(expected.A3);
    expect(getCellText(model, "B3")).toBe(expected.B3);
  });

  test("horizontal full zone", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "B1", "4");
    await automaticSum(model, "A1:B1");
    expect(getCellText(model, "C1")).toBe("=SUM(A1:B1)");
  });

  test("col 1d full zone", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "A2", "4");
    await automaticSum(model, "A1:A2");
    expect(getCellText(model, "A3")).toBe("=SUM(A1:A2)");
  });

  test.each([
    ["A2:C2", { target: "D2", formula: "=SUM(A2:C2)" }],
    ["A2:D2", { target: "D2", formula: "=SUM(A2:C2)" }],
    ["A2:E2", { target: "E2", formula: "=SUM(A2:D2)" }],
  ])("horizontal partly empty zone: selection=%s", async (selection, expected) => {
    // first row is full
    await setCellContent(model, "C1", "4");
    await setCellContent(model, "D1", "4");
    await setCellContent(model, "E1", "4");

    await setCellContent(model, "A2", "4");
    await setCellContent(model, "C2", "4");
    await automaticSum(model, selection);
    expect(getCellText(model, expected.target)).toBe(expected.formula);
  });

  test("below horizontal zone, with empty end", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "B1", "4");
    await automaticSum(model, "A2:C2");
    expect(getCellText(model, "A2")).toBe("=SUM(A1)");
    expect(getCellText(model, "B2")).toBe("=SUM(B1)");
    expect(getCellText(model, "C2")).toBe("=SUM(C1)");
    expect(getCellText(model, "D1")).toBe("");
    expect(getCellText(model, "D2")).toBe("");
  });

  test.each(["A1", "A2", "B1", "B2"])("2d zone with anchor=%s", async (anchor) => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "B2", "4");
    await automaticSum(model, "A1:B2", { anchor });
    expect(getCellText(model, "A3")).toBe("=SUM(A1:A2)");
    expect(getCellText(model, "B3")).toBe("=SUM(B1:B2)");
  });

  test.each(["A1", "A2", "C1", "C2"])(
    "2d zone with empty right column. anchor=%s",
    async (anchor) => {
      await setCellContent(model, "A1", "4");
      await setCellContent(model, "A2", "4");
      await setCellContent(model, "B2", "4");
      await automaticSum(model, "A1:C2", { anchor });
      expect(getCellText(model, "C1")).toBe("=SUM(A1:B1)");
      expect(getCellText(model, "C2")).toBe("=SUM(A2:B2)");
    }
  );

  test.each(["A1", "A2", "A3", "B3"])(
    "2d zone with empty bottom row. anchor=%s",
    async (anchor) => {
      await setCellContent(model, "A1", "4");
      await setCellContent(model, "A2", "4");
      await setCellContent(model, "B2", "4");
      await automaticSum(model, "A1:B3", { anchor });
      expect(getCellText(model, "A3")).toBe("=SUM(A1:A2)");
      expect(getCellText(model, "B3")).toBe("=SUM(B1:B2)");
    }
  );

  test.each(["A1", "A2", "C1", "C3"])(
    "2d zone with empty right col & empty bottom row. anchor=%s",
    async (anchor) => {
      await setCellContent(model, "A1", "4");
      await setCellContent(model, "A2", "4");
      await setCellContent(model, "B2", "4");
      await automaticSum(model, "A1:C3", { anchor });
      expect(getCellText(model, "C1")).toBe("=SUM(A1:B1)");
      expect(getCellText(model, "C2")).toBe("=SUM(A2:B2)");
      expect(getCellText(model, "A3")).toBe("=SUM(A1:A2)");
      expect(getCellText(model, "B3")).toBe("=SUM(B1:B2)");
      expect(getCellText(model, "C3")).toBe("=SUM(A3:B3)");
    }
  );

  test.each(["A1", "A3"])(
    "vertical merge not empty part of the zone. anchor=%s",
    async (anchor) => {
      await setCellContent(model, "A1", "4");
      await merge(model, "A1:A2");
      await automaticSum(model, "A1:A3", { anchor });
      expect(getCellText(model, "A3")).toBe("=SUM(A1)");
    }
  );

  test.each(["A1", "C1"])(
    "horizontal merge not empty part of the zone. anchor=%s",
    async (anchor) => {
      await setCellContent(model, "A1", "4");
      await merge(model, "A1:B1");
      await automaticSum(model, "A1:C1", { anchor });
      expect(getCellText(model, "C1")).toBe("=SUM(A1)");
    }
  );

  test("only takes first merge from sequence of merges", async () => {
    await setCellContent(model, "A1", "4");
    await merge(model, "A1:A2");
    await setCellContent(model, "A3", "4");
    await merge(model, "A3:A4");
    await automaticSum(model, "A5");
    expect(getCellText(model, "A5")).toBe("=SUM(A3)");
  });

  test("sum data in the last row", async () => {
    const model = await createModel({ sheets: [{ colNumber: 1, rowNumber: 2 }] });
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "A2", "4");
    await automaticSum(model, "A1:A2");
  });

  test("sum data horizontally in the bottom right corner", async () => {
    const model = await createModel({ sheets: [{ colNumber: 2, rowNumber: 1 }] });
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "B1", "4");
    await automaticSum(model, "A1:B1");
  });

  test("not at the end but no next empty row", async () => {
    const model = await createModel({ sheets: [{ colNumber: 1, rowNumber: 3 }] });
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "A2", "4");
    await setCellContent(model, "A3", "4");
    await automaticSum(model, "A1:A2");
  });

  test("not at the end but no next empty col", async () => {
    const model = await createModel({ sheets: [{ colNumber: 3, rowNumber: 1 }] });
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "B1", "4");
    await setCellContent(model, "C1", "4");
    await automaticSum(model, "A1:B1");
  });

  test("multiple selected zones in an empty sheet", async () => {
    await automaticSumMulti(model, ["A1:A2", "B1:B3"]);
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getEvaluatedCells(sheetId)).toEqual([]);
  });

  test("multiple selected zones", async () => {
    await setCellContent(model, "A1", "4");
    await setCellContent(model, "B1", "4");
    await setCellContent(model, "B2", "4");
    await setCellContent(model, "B3", "4");
    await automaticSumMulti(model, ["A1:A2", "B1:B3"]);
    expect(getCellText(model, "A2")).toBe("=SUM(A1)");
    expect(getCellText(model, "B4")).toBe("=SUM(B1:B3)");
  });

  test("first sum is taken into account for the second zone", async () => {
    await setCellContent(model, "A1", "4");
    await automaticSumMulti(model, ["B1", "C1:C2"]);
    expect(getCellText(model, "B1")).toBe("=SUM(A1)");
    expect(getCellText(model, "C1")).toBe("=SUM(A1:B1)");
    expect(getCellText(model, "C2")).toBe("=SUM(A2:B2)");
  });

  test("empty 2d selection with number above", async () => {
    await setCellContent(model, "A1", "4");
    await automaticSum(model, "A2:A3");
    expect(getCellText(model, "A2")).toBe("=SUM(A1)");
  });

  test("sum in both dimensions with extra space around", async () => {
    await setCellContent(model, "A1", "4");
    await automaticSum(model, "A1:C3");
    expect(getCellText(model, "A2")).toBe("");
    expect(getCellText(model, "A3")).toBe("=SUM(A1:A2)");
    expect(getCellText(model, "B1")).toBe("");
    expect(getCellText(model, "B2")).toBe("");
    expect(getCellText(model, "B3")).toBe("");
    expect(getCellText(model, "C1")).toBe("=SUM(A1:B1)");
    expect(getCellText(model, "C2")).toBe("");
    expect(getCellText(model, "C3")).toBe("=SUM(A3:B3)");
  });
});
