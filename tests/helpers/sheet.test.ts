import { isSheetNameEqual } from "../../src/helpers";

test("sheet equality", () => {
  expect(isSheetNameEqual("Sheet1", "Sheet1")).toBeTruthy();
  expect(isSheetNameEqual("Sheet1", "SHEET1")).toBeTruthy();
  expect(isSheetNameEqual("Sheet1", "sheet1")).toBeTruthy();
  expect(isSheetNameEqual("Sheet1", "'sheet1'")).toBeTruthy();
  expect(isSheetNameEqual("Sheet1", "'SHEET1'")).toBeTruthy();
  expect(isSheetNameEqual("Sheet1", "ShEeT1")).toBeTruthy();
  expect(isSheetNameEqual("Sheet1", "Sheet1 ")).toBeTruthy();
  expect(isSheetNameEqual("Sheet1", " Sheet1")).toBeTruthy();
});

test("sheet inequality", () => {
  expect(isSheetNameEqual("Sheet1", "Sheet")).toBeFalsy();
  expect(isSheetNameEqual("Sheet1", '"Sheet1"')).toBeFalsy();
  expect(isSheetNameEqual("Sheet1", "Sheet 1")).toBeFalsy();
  expect(isSheetNameEqual("Sheet1", "Sheet1!")).toBeFalsy();
  expect(isSheetNameEqual("Sheet1", "Sheet2")).toBeFalsy();
  expect(isSheetNameEqual("Sheet1", "")).toBeFalsy();
  expect(isSheetNameEqual("Sheet1", undefined)).toBeFalsy();
});
