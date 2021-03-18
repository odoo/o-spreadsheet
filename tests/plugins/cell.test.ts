import { Model } from "../../src";
import { CellType } from "../../src/types";
import { getCell } from "../test_helpers/getters_helpers";

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

  test("Update cell with a format is correctly set", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
      content: "5%",
      format: "bla",
    });
    model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 1,
      row: 1,
      content: "12/30/1899",
      format: "bla",
    });
    model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 2,
      row: 2,
      content: "=DATE(2021,1,1)",
      format: "bla",
    });
    expect(getCell(model, "A1")?.format).toBe("bla");
    expect(getCell(model, "B2")?.format).toBe("bla");
    expect(getCell(model, "C3")?.format).toBe("bla");
  });
});
