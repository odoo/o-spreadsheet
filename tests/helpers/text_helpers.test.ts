import { splitTextInTwoLines } from "../../src/helpers";

describe("splitTextInTwoLines", () => {
  test("Basic usages", () => {
    expect(splitTextInTwoLines("text_with_no_space")).toStrictEqual(["text_with_no_space", ""]);
    expect(splitTextInTwoLines("a text_with_no_space")).toStrictEqual(["a", "text_with_no_space"]);
    expect(splitTextInTwoLines("text_with_no_space 2")).toStrictEqual(["text_with_no_space", "2"]);
    expect(splitTextInTwoLines("a very long description")).toStrictEqual([
      "a very long",
      "description",
    ]);
    expect(splitTextInTwoLines("a very very very long description")).toStrictEqual([
      "a very very very",
      "long description",
    ]);
  });

  test("Leading spaces are kept", () => {
    expect(splitTextInTwoLines(" text_with_no_space")).toStrictEqual([" text_with_no_space", ""]);
    expect(splitTextInTwoLines("  a very long description")).toStrictEqual([
      "  a very long",
      "  description",
    ]);
  });
});
