import { Model } from "../../src";
import { LINK_COLOR } from "../../src/constants";
import { buildSheetLink } from "../../src/helpers";
import { urlRepresentation } from "../../src/helpers/links";
import { CellValueType, CommandResult } from "../../src/types";
import {
  copy,
  createSheet,
  deleteSheet,
  paste,
  renameSheet,
  setCellContent,
  setCellFormat,
  undo,
} from "../test_helpers/commands_helpers";
import { getCell, getCellText, getEvaluatedCell, getStyle } from "../test_helpers/getters_helpers";

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
    "can create a markdown link cell: %s",
    (url) => {
      const model = new Model();
      setCellContent(model, "A1", `[my label](${url})`);
      const cell = getEvaluatedCell(model, "A1");
      expect(cell.link?.label).toBe("my label");
      expect(cell.link?.url).toBe(url);
      expect(urlRepresentation(cell.link!, model.getters)).toBe(url);
      expect(getCell(model, "A1")?.content).toBe(`[my label](${url})`);
      expect(getStyle(model, "A1")).toEqual({ textColor: LINK_COLOR });
      expect(getCellText(model, "A1")).toBe("my label");
    }
  );

  test("https prefix is added if it's missing", () => {
    const model = new Model();
    setCellContent(model, "A1", `[my label](odoo.com)`);
    const cell = getEvaluatedCell(model, "A1");
    expect(getCell(model, "A1")?.content).toBe(`[my label](odoo.com)`);
    expect(cell.link?.url).toBe("https://odoo.com");
    expect(urlRepresentation(cell.link!, model.getters)).toBe("https://odoo.com");
  });

  test("literal number in markdown is parsed", () => {
    const model = new Model();
    setCellContent(model, "A1", `[3](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(3);
  });

  test("literal boolean in markdown is parsed", () => {
    const model = new Model();
    setCellContent(model, "A1", `[true](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(true);
  });

  test("literal date in markdown is parsed and preserves format", () => {
    const model = new Model();
    setCellContent(model, "A1", `[12/31/1999](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(36525);
    expect(getEvaluatedCell(model, "A1").format).toBe("m/d/yyyy");
  });

  test("literal number format is preserved", () => {
    const model = new Model();
    setCellContent(model, "A1", `[3%](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(0.03);
    expect(getEvaluatedCell(model, "A1").format).toBe("0%");
  });

  test("can use link labels in formula", () => {
    const model = new Model();
    setCellContent(model, "A1", `[3](odoo.com)`);
    setCellContent(model, "A2", `[1](odoo.com)`);
    setCellContent(model, "A3", `=A1+A2`);
    expect(getEvaluatedCell(model, "A3").value).toBe(4);
  });

  test("user defined format is preserved over markdown format", () => {
    const model = new Model();
    setCellFormat(model, "A1", "#,##0.0");
    setCellContent(model, "A1", `[300%](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(3);
    expect(getEvaluatedCell(model, "A1").format).toBe("#,##0.0");
  });

  test("simple url becomes a link cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "http://odoo.com");
    const cell = getEvaluatedCell(model, "A1");
    expect(getCell(model, "A1")?.content).toBe("http://odoo.com");
    expect(cell.link?.label).toBe("http://odoo.com");
    expect(cell.link?.url).toBe("http://odoo.com");
    expect(cell.value).toBe("http://odoo.com");
  });

  test.each([
    "prefixhttp://odoo.com",
    "https://url",
    "https://url with spaces.com",
    "http://odoo.com postfix",
  ])("invalid url %s are not recognized as web links", (url) => {
    const model = new Model();
    setCellContent(model, "A1", url);
    expect(getCell(model, "A1")?.content).toBe(url);
    expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.text);
  });

  test.each(["[]()", "[ ]()", "[]( )", " [label](url) "])(
    "invalid markdown %s is not recognized as link",
    (markdown) => {
      const model = new Model();
      setCellContent(model, "A1", markdown);
      const cell = getEvaluatedCell(model, "A1");
      expect(cell.value).toBe(markdown);
      expect(cell.type).toBe(CellValueType.text);
    }
  );

  test("a markdown link in a markdown link", () => {
    const model = new Model();
    setCellContent(model, "A1", `[[label](link)](http://odoo.com)`);
    expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.text);
    expect(getCell(model, "A1")?.content).toBe("[[label](link)](http://odoo.com)");
  });

  test("can create a sheet link", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getEvaluatedCell(model, "A1");
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink);
    expect(urlRepresentation(cell.link!, model.getters)).toBe("Sheet1");
    expect(getCellText(model, "A1")).toBe("my label");
  });

  test("sheet url representation is updated when sheet is renamed", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getEvaluatedCell(model, "A1");

    renameSheet(model, sheetId, "new name");
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink);
    expect(urlRepresentation(cell.link!, model.getters)).toBe("new name");
    expect(getCellText(model, "A1")).toBe("my label");
    undo(model);
    expect(urlRepresentation(cell.link!, model.getters)).toBe("Sheet1");
  });

  test("can create an invalid sheet link", () => {
    const model = new Model();
    const sheetLink = buildSheetLink("invalidSheetId");
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getEvaluatedCell(model, "A1");
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink);
    expect(urlRepresentation(cell.link!, model.getters).toString()).toBe("Invalid sheet");
    expect(getCellText(model, "A1")).toBe("my label");
  });

  test("sheet link is updated if the sheet is deleted", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const sheetLink = buildSheetLink("42");
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    deleteSheet(model, "42");
    const cell = getEvaluatedCell(model, "A1");
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink);
    expect(urlRepresentation(cell.link!, model.getters).toString()).toBe("Invalid sheet");
    expect(getCellText(model, "A1")).toBe("my label");
    undo(model);
    expect(urlRepresentation(cell.link!, model.getters)).toBe("Sheet2");
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
    expect(getCell(model, "A1")?.style).toEqual({
      fillColor: "#555",
      bold: true,
      textColor: "#111",
    });
  });

  test("link text color is not overwritten if there is a custom style", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheetId,
      style: { fillColor: "#555", bold: true, textColor: "#111" },
    });
    setCellContent(model, "A1", `[my label](odoo.com)`);
    expect(getCell(model, "A1")?.style).toEqual({
      fillColor: "#555",
      bold: true,
      textColor: "#111",
    });
  });

  test("copy-paste web links", () => {
    const model = new Model();
    setCellContent(model, "B2", `[my label](odoo.com)`);
    const B2 = getEvaluatedCell(model, "B2");
    copy(model, "B2");
    paste(model, "D2");
    const B2After = getEvaluatedCell(model, "B2");
    const D2 = getEvaluatedCell(model, "D2");
    expect(B2After.link).toEqual(B2.link);
    expect(D2.link).toEqual(B2.link);
    expect(getCell(model, "D2")?.style).toEqual(getCell(model, "B2")?.style);
  });

  test("copy-paste sheet links", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    setCellContent(model, "B2", `[my label](${sheetLink})`);
    const B2 = getEvaluatedCell(model, "B2")!;
    copy(model, "B2");
    paste(model, "D2");
    const B2After = getEvaluatedCell(model, "B2");
    const D2 = getEvaluatedCell(model, "D2");
    expect(B2After.link).toEqual(B2.link);
    expect(D2.link).toEqual(B2.link);
    expect(getCell(model, "D2")?.style).toEqual(getCell(model, "B2")?.style);
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
    expect(getCell(model, "D2")?.style).toEqual({
      fillColor: "#555",
      bold: true,
      textColor: "#111",
    });
  });
});
