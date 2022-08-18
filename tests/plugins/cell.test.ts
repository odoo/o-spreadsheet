import { Model } from "../../src";
import { buildSheetUrl } from "../../src/helpers";
import { CommandResult } from "../../src/types";
import { copy, paste, setCellContent } from "../test_helpers/commands_helpers";
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
    expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
  });
});

describe("link cell", () => {
  test.each(["http://odoo.com", "https://odoo.com"])(
    "can create a link cell with markdown link: %s",
    (url) => {
      const model = new Model();
      setCellContent(model, "A1", `[my label](${url})`);
      const cell = getCell(model, "A1");
      expect(cell!.content).toBe(`[my label](${url})`);
      expect(cell!.evaluated.value).toBe("my label");
      expect(cell!.url).toBe(url);
      expect(getCellText(model, "A1")).toBe("my label");
    }
  );

  test("can create a link cell with simple url", () => {
    const model = new Model();
    setCellContent(model, "A1", "http://odoo.com");
    const cell = getCell(model, "A1");
    expect(cell!.content).toBe("http://odoo.com");
    expect(cell!.evaluated.value).toBe("http://odoo.com");
    expect(cell!.url).toBe("http://odoo.com");
  });

  test.each([
    "prefixhttp://odoo.com",
    "https://url",
    "https://url with spaces.com",
    "http://odoo.com postfix",
  ])("invalid url %s are not recognized as link", (url) => {
    const model = new Model();
    setCellContent(model, "A1", url);
    const cell = getCell(model, "A1");
    expect(cell!.content).toBe(url);
    expect(cell!.evaluated.value).toBe(url);
    expect(cell!.url).toBe(undefined);
  });

  test.each(["[]()", "[ ]()", "[]( )", " [label](url) "])(
    "invalid markdown %s is not recognized as link",
    (markdown) => {
      const model = new Model();
      setCellContent(model, "A1", markdown);
      const cell = getCell(model, "A1");
      expect(cell!.content).toBe(markdown);
      expect(cell!.evaluated.value).toBe(markdown);
      expect(cell!.url).toBe(undefined);
    }
  );

  test("a markdown link in a markdown link", () => {
    const model = new Model();
    setCellContent(model, "A1", `[[label](link)](http://odoo.com)`);
    const cell = getCell(model, "A1");
    expect(cell!.content).toBe("[[label](link)](http://odoo.com)");
    expect(cell!.evaluated.value).toBe("[[label](link)](http://odoo.com)");
    expect(cell!.url).toBe(undefined);
  });

  test("can create a sheet link", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetUrl(sheetId);
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getCell(model, "A1");
    expect(cell!.content).toBe(`[my label](${sheetLink})`);
    expect(cell!.evaluated.value).toBe("my label");
    expect(cell!.url).toBe(sheetLink);
  });

  test("link text color is applied if a custom style is specified", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheetId,
      content: "[my label](odoo.com)",
      style: { fillColor: "#555", bold: true, textColor: "#111" },
    });
    expect(model.getters.getCellStyle(getCell(model, "A1"))).toEqual({
      fillColor: "#555",
      bold: true,
      textColor: "#111",
      underline: true,
    });
  });

  test("copy-paste web links", () => {
    const model = new Model();
    setCellContent(model, "B2", `[my label](odoo.com)`);
    const B2 = getCell(model, "B2");
    copy(model, "B2");
    paste(model, "D2");
    const B2After = getCell(model, "B2");
    const D2 = getCell(model, "D2");
    expect(B2After!.content).toEqual(B2!.content);
    expect(B2After!.url).toEqual(B2!.url);
    expect(B2After!.evaluated.value).toEqual(B2!.evaluated.value);

    expect(D2!.content).toEqual(B2!.content);
    expect(D2!.url).toEqual(B2!.url);
    expect(D2!.evaluated.value).toEqual(B2!.evaluated.value);
  });

  test("copy-paste sheet links", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetUrl(sheetId);
    setCellContent(model, "B2", `[my label](${sheetLink})`);
    const B2 = getCell(model, "B2");
    copy(model, "B2");
    paste(model, "D2");
    const B2After = getCell(model, "B2");
    const D2 = getCell(model, "D2");
    expect(B2After!.content).toEqual(B2!.content);
    expect(B2After!.url).toEqual(B2!.url);
    expect(B2After!.evaluated.value).toEqual(B2!.evaluated.value);

    expect(D2!.content).toEqual(B2!.content);
    expect(D2!.url).toEqual(B2!.url);
    expect(D2!.evaluated.value).toEqual(B2!.evaluated.value);
  });

  test("copy-paste custom style", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UPDATE_CELL", {
      col: 1,
      row: 1,
      sheetId,
      content: "[my label](odoo.com)",
      style: { fillColor: "#555", bold: true, textColor: "#111" },
    });
    copy(model, "B2");
    paste(model, "D2");
    expect(model.getters.getCellStyle(getCell(model, "D2"))).toEqual({
      fillColor: "#555",
      bold: true,
      textColor: "#111",
      underline: true,
    });
  });
});
