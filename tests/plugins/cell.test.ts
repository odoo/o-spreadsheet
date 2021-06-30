import { Model } from "../../src";
import { CommandResult } from "../../src/types";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getCell, getCellText } from "../test_helpers/getters_helpers";

describe("getCellText", () => {
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

  test("update cell outside of sheet", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const result = model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 9999,
      row: 9999,
      content: "hello",
    });
    expect(result).toBe(CommandResult.TargetOutOfSheet);
  });
});

describe("markdown link cell", () => {
  test("can create a markdown link cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "[my label](www.odoo.com)");
    expect(getCell(model, "A1")?.content).toBe("[my label](www.odoo.com)");
    expect(getCellText(model, "A1")).toBe("my label");
  });
});
