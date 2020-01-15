import { applyOffset } from "../../src/expressions";

describe("applyOffset", () => {
  test("simple changes", () => {
    expect(applyOffset("=A1", 1, 1)).toEqual("=B2");
    expect(applyOffset("=A1 + B3", 1, 1)).toEqual("=B2 + C4");
  });

  test("can handle negative/invalid offsets", () => {
    expect(applyOffset("=B2", 0, -4)).toEqual("=#REF");
  });
});
