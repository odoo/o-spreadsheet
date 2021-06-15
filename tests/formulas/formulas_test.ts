import { Model } from "../../src";
import "../canvas.mock";

describe("applyOffset", () => {
  test("simple changes", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(model.getters.applyOffset(model.getters.getActiveSheetId(), "=A1", 1, 1)).toEqual("=B2");
    expect(model.getters.applyOffset(model.getters.getActiveSheetId(), "=A1 + B3", 1, 1)).toEqual(
      "=B2 + C4"
    );
  });

  test("can handle negative offsets", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.applyOffset(sheetId, "=B2", 0, -1)).toEqual("=B1");
    expect(model.getters.applyOffset(sheetId, "=B2", -1, 0)).toEqual("=A2");
    expect(model.getters.applyOffset(sheetId, "=B2", -1, -1)).toEqual("=A1");
    expect(model.getters.applyOffset(sheetId, "=B2", 0, -4)).toEqual("=#REF");
    expect(model.getters.applyOffset(sheetId, "=B2", -4, 0)).toEqual("=#REF");
  });

  test("can handle offsets outside the sheet", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.applyOffset(sheetId, "=B2", 0, -4)).toEqual("=#REF");
    expect(model.getters.applyOffset(sheetId, "=B10", 0, 2)).toEqual("=B12");
    expect(model.getters.applyOffset(sheetId, "=J1", 2, 0)).toEqual("=L1");
  });

  test("can handle other formulas", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(
      model.getters.applyOffset(model.getters.getActiveSheetId(), "=AND(true, B2)", 0, 1)
    ).toEqual("=AND(true, B3)");
  });

  test("can handle cross-sheet formulas", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
        {
          name: "Sheet2",
          colNumber: 5,
          rowNumber: 5,
        },
      ],
    });
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.applyOffset(sheetId, "=Sheet2!B2", 0, 1)).toEqual("=Sheet2!B3");
    expect(model.getters.applyOffset(sheetId, "='Sheet2'!B2", 0, 1)).toEqual("=Sheet2!B3");
    expect(model.getters.applyOffset(sheetId, "=Sheet2!B2", 0, -2)).toEqual("=#REF");
    expect(model.getters.applyOffset(sheetId, "=Sheet2!B2", -2, 0)).toEqual("=#REF");
    expect(model.getters.applyOffset(sheetId, "=Sheet2!B2", 1, 1)).toEqual("=Sheet2!C3");
    expect(model.getters.applyOffset(sheetId, "=Sheet2!B2", 1, 10)).toEqual("=Sheet2!C12");
  });

  test("can handle sheet reference with names", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { sheetId: "42", name: "Sheet 2", position: 1 });
    expect(model.getters.applyOffset("42", "='Sheet 2'!B2", 0, 1)).toEqual("='Sheet 2'!B3");
  });
});
