import { Model } from "../../src";
import { normalize } from "../../src/formulas";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getCellText } from "../test_helpers/getters_helpers";

test("basic formula with only boolean arguments should be unchanged", () => {
  expect(normalize("=Sum( TRUE , FALSE) + TRUE - ( FALSE * TRUE)")).toEqual({
    text: "=Sum( TRUE , FALSE) + TRUE - ( FALSE * TRUE)",
    dependencies: { references: [], strings: [], numbers: [] },
  });
});

test("replace references with different syntax", () => {
  expect(normalize("=A1")).toEqual({
    text: "=|0|",
    dependencies: { references: ["A1"], strings: [], numbers: [] },
  });
  expect(normalize("=$A$1")).toEqual({
    text: "=|0|",
    dependencies: { references: ["$A$1"], strings: [], numbers: [] },
  });
  expect(normalize("=Sheet1!A1")).toEqual({
    text: "=|0|",
    dependencies: { references: ["Sheet1!A1"], strings: [], numbers: [] },
  });
  expect(normalize("='Sheet1'!A1")).toEqual({
    text: "=|0|",
    dependencies: { references: ["'Sheet1'!A1"], strings: [], numbers: [] },
  });
  expect(normalize("='Sheet1'!A$1")).toEqual({
    text: "=|0|",
    dependencies: { references: ["'Sheet1'!A$1"], strings: [], numbers: [] },
  });
  expect(normalize("=A1:b2")).toEqual({
    text: "=|0|",
    dependencies: { references: ["A1:b2"], strings: [], numbers: [] },
  });
  expect(normalize("=$A$1:$b$2")).toEqual({
    text: "=|0|",
    dependencies: { references: ["$A$1:$b$2"], strings: [], numbers: [] },
  });
  expect(normalize("=Sheet1!A1:b2")).toEqual({
    text: "=|0|",
    dependencies: { references: ["Sheet1!A1:b2"], strings: [], numbers: [] },
  });
  expect(normalize("='SHEET 1'!A1:b2")).toEqual({
    text: "=|0|",
    dependencies: { references: ["'SHEET 1'!A1:b2"], strings: [], numbers: [] },
  });
  expect(normalize("='Sheet1'!A$1:$B2")).toEqual({
    text: "=|0|",
    dependencies: { references: ["'Sheet1'!A$1:$B2"], strings: [], numbers: [] },
  });
});
test("replace multiple references", () => {
  expect(normalize("=sum(a1:a3, a1:a3) + a1")).toEqual({
    text: "=sum(|0|,|0|) + |1|",
    dependencies: { references: ["a1:a3", "a1"], strings: [], numbers: [] },
  });
});
test("replace numbers in functions, numbers are parsed", () => {
  expect(normalize("=sum(1, 5%) + 7")).toEqual({
    text: "=sum(|N0|, |N1|) + |N2|",
    dependencies: { references: [], strings: [], numbers: [1, 0.05, 7] },
  });
});
test("replace strings in functions", () => {
  expect(normalize('=CONCATENATE("a", "5", "b")')).toEqual({
    text: "=CONCATENATE(|S0|, |S1|, |S2|)",
    dependencies: { references: [], strings: ["a", "5", "b"], numbers: [] },
  });
});
test("replace multiple on function", () => {
  expect(normalize('=CONCATENATE(A1:A3, 5, "b")')).toEqual({
    text: "=CONCATENATE(|0|, |N0|, |S0|)",
    dependencies: { references: ["A1:A3"], strings: ["b"], numbers: [5] },
  });
});
test("do not replace normalized dependencies inside strings", () => {
  const formula = '=concat("|1|","|S0|","|N2|")';
  expect(normalize(formula)).toEqual({
    text: "=concat(|S0|,|S1|,|S2|)",
    dependencies: { references: [], strings: ["|1|", "|S0|", "|N2|"], numbers: [] },
  });
});

test("cell with multiple identical references are correctly displayed", () => {
  let model = new Model();
  setCellContent(model, "A1", "=a2+a2+a2");
  expect(getCellText(model, "a1")).toBe("=A2+A2+A2");
});
