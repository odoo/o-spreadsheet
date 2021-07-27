import { Model } from "../../src";
import { CommandResult, LinkCell } from "../../src/types";
import { setCellContent, renameSheet } from "../test_helpers/commands_helpers";
import { getCell, getCellText } from "../test_helpers/getters_helpers";
import { buildSheetLink } from "../../src/helpers";

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

describe("link cell", () => {
  test.each(["http://odoo.com", "https://odoo.com"])("can create a markdown link cell: %s", (url) => {
    const model = new Model();
    setCellContent(model, "A1", `[my label](${url})`);
    const cell = getCell(model, "A1") as LinkCell
    expect(cell.content).toBe(`[my label](${url})`);
    expect(cell.link.label).toBe("my label");
    expect(cell.link.destination).toBe(url);
    expect(cell.destinationRepresentation).toBe(url);
    expect(getCellText(model, "A1")).toBe("my label");
  });

  test("https prefix is added if it's missing", () => {
    const model = new Model();
    setCellContent(model, "A1", `[my label](odoo.com)`);
    const cell = getCell(model, "A1") as LinkCell
    expect(cell.content).toBe(`[my label](odoo.com)`);
    expect(cell.link.destination).toBe("https://odoo.com");
    expect(cell.destinationRepresentation).toBe("https://odoo.com");
  })

  test("simple url becomes a link cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "http://odoo.com");
    const cell = getCell(model, "A1") as LinkCell
    expect(cell.content).toBe("[http://odoo.com](http://odoo.com)");
    expect(cell.link.label).toBe("http://odoo.com");
    expect(cell.link.destination).toBe("http://odoo.com");
  })

  test("can create a sheet link", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getCell(model, "A1") as LinkCell
    expect(cell.link.label).toBe("my label");
    expect(cell.link.destination).toBe(sheetLink);
    expect(cell.destinationRepresentation).toBe("Sheet1");
    expect(getCellText(model, "A1")).toBe("my label");

    renameSheet(model, sheetId, "new name");
    expect(cell.link.label).toBe("my label");
    expect(cell.link.destination).toBe(sheetLink);
    expect(cell.destinationRepresentation).toBe("new name");
    expect(getCellText(model, "A1")).toBe("my label");
  });

  test("copy-paste links", () => {
    // TODO
    expect(2).toBe(3);
  });
});
