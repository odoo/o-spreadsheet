import { Model } from "../../src";
import { normalize } from "../../src/formulas";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getCellText } from "../test_helpers/getters_helpers";

test("basic formula with not references should be unchanged", () => {
  expect(normalize("=Sum( 1 , 3) + 8 - ( 1 * 8)")).toEqual({
    text: "=Sum( 1 , 3) + 8 - ( 1 * 8)",
    dependencies: [],
  });
  expect(normalize("=1")).toEqual({
    text: "=1",
    dependencies: [],
  });
});

test("replace references with different syntax", () => {
  expect(normalize("=A1")).toEqual({
    text: "=|0|",
    dependencies: ["A1"],
  });
  expect(normalize("=$A$1")).toEqual({
    text: "=|0|",
    dependencies: ["$A$1"],
  });
  expect(normalize("=Sheet1!A1")).toEqual({
    text: "=|0|",
    dependencies: ["Sheet1!A1"],
  });
  expect(normalize("='Sheet1'!A1")).toEqual({
    text: "=|0|",
    dependencies: ["'Sheet1'!A1"],
  });
  expect(normalize("='Sheet1'!A$1")).toEqual({
    text: "=|0|",
    dependencies: ["'Sheet1'!A$1"],
  });
  expect(normalize("=A1:b2")).toEqual({
    text: "=|0|",
    dependencies: ["A1:b2"],
  });
  expect(normalize("=$A$1:$b$2")).toEqual({
    text: "=|0|",
    dependencies: ["$A$1:$b$2"],
  });
  expect(normalize("=Sheet1!A1:b2")).toEqual({
    text: "=|0|",
    dependencies: ["Sheet1!A1:b2"],
  });
  expect(normalize("='SHEET 1'!A1:b2")).toEqual({
    text: "=|0|",
    dependencies: ["'SHEET 1'!A1:b2"],
  });
  expect(normalize("='Sheet1'!A$1:$B2")).toEqual({
    text: "=|0|",
    dependencies: ["'Sheet1'!A$1:$B2"],
  });
});
test("replace multiple references", () => {
  expect(normalize("=sum(a1:a3, a1:a3) + a1")).toEqual({
    text: "=sum(|0|,|0|) + |1|",
    dependencies: ["a1:a3", "a1"],
  });
});

test("do not replace inside strings", () => {
  const formula = '=concat("|1|","|0|")';
  expect(normalize(formula)).toEqual({ text: formula, dependencies: [] });
});

test("cell with multiple identical references are correctly displayed", () => {
  let model = new Model();
  setCellContent(model, "A1", "=a2+a2+a2");
  expect(getCellText(model, "a1")).toBe("=A2+A2+A2");
});
