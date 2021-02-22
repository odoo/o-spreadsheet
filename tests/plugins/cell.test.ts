import { Model } from "../../src";
import { CellType } from "../../src/types";

describe("getCellText", () => {
  test.each([
    [undefined, ""],
    [{ hello: 1 }, "0"],
    [{ hello: 1, toString: () => "hello" }, "0"],
    [null, "0"],
  ])("getCellText of cell with %j value", (a, expected) => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    expect(
      model.getters.getCellText(
        {
          id: "42",
          value: a,
          type: CellType.text,
          content: "text",
        },
        sheetId
      )
    ).toBe(expected);
  });
});
