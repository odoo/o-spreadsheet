import { normalize } from "../../src/formulas";

test("basic formula with only boolean arguments should be unchanged", () => {
  expect(normalize("=Sum( TRUE , FALSE) + TRUE - ( FALSE * TRUE)")).toEqual({
    text: "=Sum( TRUE , FALSE) + TRUE - ( FALSE * TRUE)",
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
test("replace numbers in functions, numbers are parsed", () => {
  expect(normalize("=sum(1, 5%) + 7")).toEqual({
    text: "=sum(|N0|, |N1|) + |N2|",
    dependencies: [1, 0.05, 7],
  });
});
test("replace strings in functions", () => {
  expect(normalize('=CONCATENATE("a", "5", "b")')).toEqual({
    text: "=CONCATENATE(|S0|, |S1|, |S2|)",
    dependencies: ["a", "5", "b"],
  });
});
test("replace multiple on function", () => {
  expect(normalize('=CONCATENATE(A1:A3, 5, "b")')).toEqual({
    text: "=CONCATENATE(|0|, |N1|, |S2|)",
    dependencies: ["A1:A3", 5, "b"],
  });
});
test("do not replace normalized dependencies inside strings", () => {
  const formula = '=concat("|1|","|S0|","|N2|")';
  expect(normalize(formula)).toEqual({
    text: "=concat(|S0|,|S1|,|S2|)",
    dependencies: ["|1|", "|S0|", "|N2|"],
  });
});
