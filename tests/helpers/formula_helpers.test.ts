import { Model } from "../../src";
import { adaptFormulaToSheet } from "../../src/helpers/formulas";
import { createSheet } from "../test_helpers/commands_helpers";

test("adaptFormulaToSheet helper", () => {
  const model = new Model();
  const sheetId = model.getters.getActiveSheetId();
  createSheet(model, { sheetId: "sh2", name: "Sheet2" });
  createSheet(model, { sheetId: "sh3", name: "Sheet3" });
  expect(adaptFormulaToSheet(model.getters, "=A1+SUM(B1:C3)", sheetId, sheetId)).toBe(
    "=A1+SUM(B1:C3)"
  );
  expect(adaptFormulaToSheet(model.getters, "=A1+SUM(B1:C3)", "sh2", sheetId)).toBe(
    "=Sheet1!A1+SUM(Sheet1!B1:C3)"
  );
  expect(adaptFormulaToSheet(model.getters, "=A1+Sheet2!B2+Sheet3!C3", "sh2", sheetId)).toBe(
    "=Sheet1!A1+Sheet2!B2+Sheet3!C3"
  );
});
