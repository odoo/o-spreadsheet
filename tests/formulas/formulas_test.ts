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

  test("can handle negative/invalid offsets", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
        },
      ],
    });
    expect(model.getters.applyOffset(model.getters.getActiveSheetId(), "=B2", 0, -4)).toEqual(
      "=#REF"
    );
    expect(model.getters.applyOffset(model.getters.getActiveSheetId(), "=B10", 0, 2)).toEqual(
      "=#REF"
    );
    expect(model.getters.applyOffset(model.getters.getActiveSheetId(), "=J1", 2, 0)).toEqual(
      "=#REF"
    );
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
    expect(model.getters.applyOffset(model.getters.getActiveSheetId(), "=Sheet2!B2", 0, 1)).toEqual(
      "=Sheet2!B3"
    );
    expect(
      model.getters.applyOffset(model.getters.getActiveSheetId(), "=Sheet2!B2", 0, -2)
    ).toEqual("=#REF");
    expect(model.getters.applyOffset(model.getters.getActiveSheetId(), "=Sheet2!B2", 1, 1)).toEqual(
      "=Sheet2!C3"
    );
    expect(
      model.getters.applyOffset(model.getters.getActiveSheetId(), "=Sheet2!B2", 1, 10)
    ).toEqual("=#REF");
  });
});
