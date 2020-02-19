import { applyOffset } from "../../src/formulas";

describe("applyOffset", () => {
  test("simple changes", () => {
    expect(applyOffset("=A1", 1, 1, 10, 10)).toEqual("=B2");
    expect(applyOffset("=A1 + B3", 1, 1, 10, 10)).toEqual("=B2 + C4");
  });

  test("can handle negative/invalid offsets", () => {
    expect(applyOffset("=B2", 0, -4, 10, 10)).toEqual("=#REF");
    expect(applyOffset("=B10", 0, 2, 10, 10)).toEqual("=#REF");
    expect(applyOffset("=J1", 2, 0, 10, 10)).toEqual("=#REF");
  });

  test("can handle other formulas", () => {
    expect(applyOffset("=AND(true, B2)", 0, 1, 10, 10)).toEqual("=AND(true, B3)");
  });
});
