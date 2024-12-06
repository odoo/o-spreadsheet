import { Model } from "../src";
import { FormulaFingerprintStore } from "../src/stores/formula_fingerprints_store";
import {
  activateSheet,
  createSheet,
  redo,
  setCellContent,
  undo,
} from "./test_helpers/commands_helpers";
import { getFingerprint } from "./test_helpers/helpers";
import { makeStore } from "./test_helpers/stores";

describe("formula fingerprints", () => {
  let fingerprints: FormulaFingerprintStore;
  let model: Model;

  beforeEach(() => {
    ({ model, store: fingerprints } = makeStore(FormulaFingerprintStore));
    fingerprints.enable();
  });

  test.each([
    ["=B1", "=B2"],
    ["=$B$2", "=$B$2"],
    ["=$B2", "=$B3"],
    ["=C$2", "=C$2"],
    ["=SUM(B1:C2)", "=SUM(B2:C3)"],
    ["=SUM($B$1:$B$3)", "=SUM($B$1:$B$3)"],
    ["=SUM($B1:$B3)", "=SUM($B2:$B4)"],
    ["=SUM($B1:B3)", "=SUM($B2:B4)"],
    ["=SUM(B1:$B3)", "=SUM(B2:$B4)"],
    ["=SUM(B:B)", "=SUM(B:B)"],
    ["=SUM(B$1:B)", "=SUM(B$1:B)"],
    ["=SUM(B1:B)", "=SUM(B2:B)"],
    ["=SUM(1:1)", "=SUM(2:2)"],
  ])("vertical formulas references with the same fingerprints %s, %s", (A1, A2) => {
    // top left corner
    setCellContent(model, "A1", A1);
    setCellContent(model, "A2", A2);
    expect(getFingerprint(fingerprints, "A1")).toEqual(getFingerprint(fingerprints, "A2"));
    // in the middle
    setCellContent(model, "D10", A1);
    setCellContent(model, "D11", A2);
    expect(getFingerprint(fingerprints, "D10")).toEqual(getFingerprint(fingerprints, "D11"));
  });

  test.each([
    ["=B1", "=B1"],
    ["=SUM(B1:B3)", "=SUM(B1:B3)"],
    ["=SUM(B$1:B$3)", "=SUM(B$2:B$4)"],
    ["=SUM(B1:B$3)", "=SUM(B2:B$4)"],
    ["=SUM(B$1:B3)", "=SUM(B$2:B4)"],
    ["=SUM(B:B)", "=SUM(C:C)"],
    ["=SUM(B1:B)", "=SUM(B1:B)"],
    ["=SUM(1:1)", "=SUM(1:1)"],
  ])("vertical formulas references with different fingerprints %s, %s", (A1, A2) => {
    // top left corner
    setCellContent(model, "A1", A1);
    setCellContent(model, "A2", A2);
    expect(getFingerprint(fingerprints, "A1")).not.toEqual(getFingerprint(fingerprints, "A2"));
    // in the middle
    setCellContent(model, "D10", A1);
    setCellContent(model, "D11", A2);
    expect(getFingerprint(fingerprints, "D10")).not.toEqual(getFingerprint(fingerprints, "D11"));
  });

  test.each([
    ["=A2", "=B2"],
    ["=$B$2", "=$B$2"],
    ["=A$2", "=B$2"],
    ["=$C2", "=$C2"],
    ["=SUM(B1:C2)", "=SUM(C1:D2)"],
    ["=SUM($B$1:$B$3)", "=SUM($B$1:$B$3)"],
    ["=SUM(B$1:B$3)", "=SUM(C$1:C$3)"],
    ["=SUM(B$1:B3)", "=SUM(C$1:C3)"],
    ["=SUM(B1:B$3)", "=SUM(C1:C$3)"],
    ["=SUM(D:D)", "=SUM(E:E)"],
    ["=SUM(D1:D)", "=SUM(E1:E)"],
    ["=SUM(D$1:D)", "=SUM(E$1:E)"],
    ["=SUM(2:2)", "=SUM(2:2)"],
  ])("horizontal formulas references with the same fingerprints %s, %s", (A1, B1) => {
    // top left corner
    setCellContent(model, "A1", A1);
    setCellContent(model, "B1", B1);
    expect(getFingerprint(fingerprints, "A1")).toEqual(getFingerprint(fingerprints, "B1"));
    // in the middle
    setCellContent(model, "D10", A1);
    setCellContent(model, "E10", B1);
    expect(getFingerprint(fingerprints, "D10")).toEqual(getFingerprint(fingerprints, "E10"));
  });

  test.each([
    ["=B1", "=B1"],
    ["=SUM(B1:B3)", "=SUM(B1:B3)"],
    ["=SUM($B1:$B3)", "=SUM($C1:$C3)"],
    ["=SUM($B1:B3)", "=SUM($C1:C3)"],
    ["=SUM(B1:$B3)", "=SUM(C1:$C3)"],
    ["=SUM(D:D)", "=SUM(D:D)"],
  ])("horizontal formulas references with different fingerprints %s, %s", (A1, B1) => {
    // top left corner
    setCellContent(model, "A1", A1);
    setCellContent(model, "B1", B1);
    expect(getFingerprint(fingerprints, "A1")).not.toEqual(getFingerprint(fingerprints, "B1"));
    // in the middle
    setCellContent(model, "D10", A1);
    setCellContent(model, "E10", B1);
    expect(getFingerprint(fingerprints, "D10")).not.toEqual(getFingerprint(fingerprints, "E10"));
  });

  test("same reference vector with additional number", () => {
    setCellContent(model, "A1", "=B1");
    setCellContent(model, "A2", "=B2");
    expect(getFingerprint(fingerprints, "A1")).toEqual(getFingerprint(fingerprints, "A2"));
    setCellContent(model, "A2", "=B2+1");
    expect(getFingerprint(fingerprints, "A1")).not.toEqual(getFingerprint(fingerprints, "A2"));
  });

  test("cross sheet references", () => {
    createSheet(model, { sheetId: "Sheet2" });
    createSheet(model, { sheetId: "Sheet3" });
    setCellContent(model, "A1", "=Sheet2!B1");
    setCellContent(model, "A2", "=Sheet2!B2");
    setCellContent(model, "A3", "=Sheet3!B3"); // a different sheet
    expect(getFingerprint(fingerprints, "A1")).toEqual(getFingerprint(fingerprints, "A2"));
    expect(getFingerprint(fingerprints, "A3")).not.toEqual(getFingerprint(fingerprints, "A2"));
  });

  test("cross sheet reference on different sheets", () => {
    createSheet(model, { sheetId: "Sheet2" });
    setCellContent(model, "A1", "=Sheet2!B1");
    setCellContent(model, "A2", "=B2");
    expect(getFingerprint(fingerprints, "A1")).not.toEqual(getFingerprint(fingerprints, "A2"));
  });

  test("strings does not have any fingerprint", () => {
    setCellContent(model, "A1", "hello");
    expect(getFingerprint(fingerprints, "A1")).toBeUndefined();
  });

  test("numbers all have the same fingerprint", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "11");
    expect(getFingerprint(fingerprints, "A1")).toBeDefined();
    expect(getFingerprint(fingerprints, "A1")).toEqual(getFingerprint(fingerprints, "A2"));
  });

  test("formulas with various numbers", () => {
    setCellContent(model, "A1", "=1+1");
    setCellContent(model, "A2", "=1+2");
    setCellContent(model, "A3", "=1+2+4");
    expect(getFingerprint(fingerprints, "A1")).toBeDefined();
    expect(getFingerprint(fingerprints, "A2")).toEqual(getFingerprint(fingerprints, "A1"));
    expect(getFingerprint(fingerprints, "A3")).not.toEqual(getFingerprint(fingerprints, "A2"));
  });

  test("formulas with various numbers", () => {
    setCellContent(model, "A1", '="hello"+"hello"');
    setCellContent(model, "A2", '="hello"+"John"');
    setCellContent(model, "A3", '="hello John"');
    expect(getFingerprint(fingerprints, "A1")).toBeDefined();
    expect(getFingerprint(fingerprints, "A2")).toEqual(getFingerprint(fingerprints, "A1"));
    expect(getFingerprint(fingerprints, "A3")).not.toEqual(getFingerprint(fingerprints, "A2"));
  });

  test("a number is not a string inside formulas", () => {
    setCellContent(model, "A1", '="hello"');
    setCellContent(model, "A2", "=5");
    expect(getFingerprint(fingerprints, "A2")).not.toEqual(getFingerprint(fingerprints, "A1"));
  });

  test("arithmetic operators have different fingerprints", () => {
    setCellContent(model, "A1", "=1+1");
    setCellContent(model, "A2", "=1-1");
    expect(getFingerprint(fingerprints, "A2")).not.toEqual(getFingerprint(fingerprints, "A1"));
  });

  test("functions have different fingerprints", () => {
    setCellContent(model, "A1", "=sum($A$1:$A$2)");
    setCellContent(model, "A2", "=average($A$1:$A$2)");
    expect(getFingerprint(fingerprints, "A2")).not.toEqual(getFingerprint(fingerprints, "A1"));
  });

  test("booleans all have the same fingerprint", () => {
    setCellContent(model, "A1", "TRUE");
    setCellContent(model, "A2", "FALSE");
    expect(getFingerprint(fingerprints, "A1")).toBeDefined();
    expect(getFingerprint(fingerprints, "A1")).toEqual(getFingerprint(fingerprints, "A2"));
  });

  test("spilled cells have the same fingerprint", () => {
    setCellContent(model, "A1", "=TRANSPOSE(B1:C1)");
    expect(getFingerprint(fingerprints, "A1")).toBeDefined();
    expect(getFingerprint(fingerprints, "A1")).toEqual(getFingerprint(fingerprints, "A2"));
  });

  test("fingerprint is updated on cell update and undo/redo", () => {
    expect(getFingerprint(fingerprints, "A1")).toBeUndefined();
    setCellContent(model, "A1", "=B1");
    expect(getFingerprint(fingerprints, "A1")).toBeDefined();
    undo(model);
    expect(getFingerprint(fingerprints, "A1")).toBeUndefined();
    redo(model);
    expect(getFingerprint(fingerprints, "A1")).toBeDefined();
  });

  test("fingerprint is updated when activating another sheet", () => {
    const sheetId2 = "Sheet2";
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "=B1");
    setCellContent(model, "A2", "=B2", sheetId2);
    expect(getFingerprint(fingerprints, "A1")).toBeDefined();
    expect(getFingerprint(fingerprints, "A2")).toBeUndefined();
    activateSheet(model, sheetId2);
    expect(getFingerprint(fingerprints, "A1")).toBeUndefined();
    expect(getFingerprint(fingerprints, "A2")).toBeDefined();
  });

  test("different formulas without any dependencies have different fingerprint", () => {
    setCellContent(model, "A1", "=NOW()");
    setCellContent(model, "A2", "=RAND()");
    expect(getFingerprint(fingerprints, "A1")).not.toEqual(getFingerprint(fingerprints, "A2"));
  });
});
