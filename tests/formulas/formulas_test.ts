import { applyOffset } from "../../src/formulas";
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
    expect(applyOffset("=A1", 1, 1, model.getters)).toEqual("=B2");
    expect(applyOffset("=A1 + B3", 1, 1, model.getters)).toEqual("=B2 + C4");
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
    expect(applyOffset("=B2", 0, -4, model.getters)).toEqual("=#REF");
    expect(applyOffset("=B10", 0, 2, model.getters)).toEqual("=#REF");
    expect(applyOffset("=J1", 2, 0, model.getters)).toEqual("=#REF");
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
    expect(applyOffset("=AND(true, B2)", 0, 1, model.getters)).toEqual("=AND(true, B3)");
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
    expect(applyOffset("=Sheet2!B2", 0, 1, model.getters)).toEqual("=Sheet2!B3");
    expect(applyOffset("=Sheet2!B2", 0, -2, model.getters)).toEqual("=#REF");
    expect(applyOffset("=Sheet2!B2", 1, 1, model.getters)).toEqual("=Sheet2!C3");
    expect(applyOffset("=Sheet2!B2", 1, 10, model.getters)).toEqual("=#REF");
  });
});
