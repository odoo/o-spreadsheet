import { Model } from "../../src";
import { LINK_COLOR } from "../../src/constants";
import { buildSheetLink, toZone } from "../../src/helpers";
import { CellValueType, CommandResult, LinkCell } from "../../src/types";
import {
  clearCell,
  copy,
  createSheet,
  deleteSheet,
  paste,
  renameSheet,
  setCellContent,
  setCellFormat,
  setStyle,
  undo,
} from "../test_helpers/commands_helpers";
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

  test("update cell outside of sheet (without any modification)", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const result = model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 9999,
      row: 9999,
    });
    expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet, CommandResult.NoChanges);
  });

  test("update cell without any modification", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const result = model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
    });
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update cell with only the same content as before", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "hello");
    setCellFormat(model, "A1", "#,##0.0");
    setStyle(model, "A1", { bold: true });
    const result = model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
      content: "hello",
    });
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update cell with only the same format as before", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "0");
    setCellFormat(model, "A1", "#,##0.0");
    setStyle(model, "A1", { bold: true });
    const result = model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
      format: "#,##0.0",
    });
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update cell with only the same style as before", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "0");
    setCellFormat(model, "A1", "#,##0.0");
    setStyle(model, "A1", { bold: true });
    const result = model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
      style: { bold: true },
    });
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update cell with the same style, content and format as before", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "hello");
    setCellFormat(model, "A1", "#,##0.0");
    setStyle(model, "A1", { bold: true });
    const result = model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
      content: "hello",
      format: "#,##0.0",
      style: { bold: true },
    });
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("clear content", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear style", () => {
    const model = new Model();
    setStyle(model, "A1", { bold: true });
    clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear format", () => {
    const model = new Model();
    setCellFormat(model, "A1", "#,##0.0");
    clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear content, style and format", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    setStyle(model, "A1", { bold: true });
    setCellFormat(model, "A1", "#,##0.0");
    clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear cell outside of sheet", () => {
    const model = new Model();
    const result = clearCell(model, "AAA999");
    expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet, CommandResult.NoChanges);
  });

  test("clear cell is cancelled if there is nothing on the cell", () => {
    const model = new Model();
    const result = clearCell(model, "A1");
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("escape character is not display when formatting string", () => {
    const model = new Model();
    setCellContent(model, "A1", '="hello \\"world\\""');
    expect(getCell(model, "A1")?.formattedValue).toBe('hello "world"');
  });
});

describe("link cell", () => {
  test.each(["http://odoo.com", "https://odoo.com"])(
    "can create a markdown link cell: %s",
    (url) => {
      const model = new Model();
      setCellContent(model, "A1", `[my label](${url})`);
      const cell = getCell(model, "A1") as LinkCell;
      expect(cell.content).toBe(`[my label](${url})`);
      expect(cell.link.label).toBe("my label");
      expect(cell.link.url).toBe(url);
      expect(cell.urlRepresentation).toBe(url);
      expect(cell.style).toEqual({ textColor: LINK_COLOR });
      expect(getCellText(model, "A1")).toBe("my label");
    }
  );

  test("https prefix is added if it's missing", () => {
    const model = new Model();
    setCellContent(model, "A1", `[my label](odoo.com)`);
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.content).toBe(`[my label](https://odoo.com)`);
    expect(cell.link.url).toBe("https://odoo.com");
    expect(cell.urlRepresentation).toBe("https://odoo.com");
  });

  test("simple url becomes a link cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "http://odoo.com");
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.content).toBe("[http://odoo.com](http://odoo.com)");
    expect(cell.link.label).toBe("http://odoo.com");
    expect(cell.link.url).toBe("http://odoo.com");
  });

  test.each([
    "prefixhttp://odoo.com",
    "https://url",
    "https://url with spaces.com",
    "http://odoo.com postfix",
  ])("invalid url %s are not recognized as web links", (url) => {
    const model = new Model();
    setCellContent(model, "A1", url);
    const cell = getCell(model, "A1");
    expect(cell?.content).toBe(url);
    expect(cell?.evaluated.type).toBe(CellValueType.text);
  });

  test.each(["[]()", "[ ]()", "[]( )", " [label](url) "])(
    "invalid markdown %s is not recognized as link",
    (markdown) => {
      const model = new Model();
      setCellContent(model, "A1", markdown);
      const cell = getCell(model, "A1");
      expect(cell?.evaluated.value).toBe(markdown);
      expect(cell?.evaluated.type).toBe(CellValueType.text);
      expect(cell?.isLink()).toBeFalsy();
    }
  );

  test.each([
    ["[label](url)", "label", "https://url"],
    ["[[label](link)](http://odoo.com)", "[label](link)", "http://odoo.com"],
    ["[lab[el](url)", "lab[el", "https://url"],
    ["[lab]el](url)", "lab]el", "https://url"],
    ["[[label]](url)", "[label]", "https://url"],
  ])("valid markdown %s is recognized as link", (markdown, label, link) => {
    const model = new Model();
    setCellContent(model, "A1", markdown);
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.link.label).toBe(label);
    expect(cell.link.url).toBe(link);
  });

  test("can create a sheet link", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.link.label).toBe("my label");
    expect(cell.link.url).toBe(sheetLink);
    expect(cell.urlRepresentation).toBe("Sheet1");
    expect(getCellText(model, "A1")).toBe("my label");
  });

  test("sheet url representation is updated when sheet is renamed", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getCell(model, "A1") as LinkCell;

    renameSheet(model, sheetId, "new name");
    expect(cell.link.label).toBe("my label");
    expect(cell.link.url).toBe(sheetLink);
    expect(cell.urlRepresentation).toBe("new name");
    expect(getCellText(model, "A1")).toBe("my label");
    undo(model);
    expect(cell.urlRepresentation).toBe("Sheet1");
  });

  test("can create an invalid sheet link", () => {
    const model = new Model();
    const sheetLink = buildSheetLink("invalidSheetId");
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.link.label).toBe("my label");
    expect(cell.link.url).toBe(sheetLink);
    expect(cell.urlRepresentation.toString()).toBe("Invalid sheet");
    expect(getCellText(model, "A1")).toBe("my label");
  });

  test("sheet link is updated if the sheet is deleted", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const sheetLink = buildSheetLink("42");
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    deleteSheet(model, "42");
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.link.label).toBe("my label");
    expect(cell.link.url).toBe(sheetLink);
    expect(cell.urlRepresentation.toString()).toBe("Invalid sheet");
    expect(getCellText(model, "A1")).toBe("my label");
    undo(model);
    expect(cell.urlRepresentation).toBe("Sheet2");
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
    const B2 = getCell(model, "B2") as LinkCell;
    copy(model, "B2");
    paste(model, "D2");
    const B2After = getCell(model, "B2") as LinkCell;
    const D2 = getCell(model, "D2") as LinkCell;
    expect(B2After.link).toEqual(B2.link);
    expect(D2.link).toEqual(B2.link);
    expect(D2.style).toEqual(B2.style);
  });

  test("copy-paste sheet links", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    setCellContent(model, "B2", `[my label](${sheetLink})`);
    const B2 = getCell(model, "B2") as LinkCell;
    copy(model, "B2");
    paste(model, "D2");
    const B2After = getCell(model, "B2") as LinkCell;
    const D2 = getCell(model, "D2") as LinkCell;
    expect(B2After.link).toEqual(B2.link);
    expect(D2.link).toEqual(B2.link);
    expect(D2.style).toEqual(B2.style);
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

test("MOVE_REFERENCES allowDispatch", () => {
  const model = new Model({
    sheets: [
      { id: "sh1", rowNumber: 10, colNumber: 10 },
      { id: "sh2", rowNumber: 20, colNumber: 20 },
    ],
  });
  const sheetId = model.getters.getActiveSheetId();
  const cmd = { sheetId, targetSheetId: "sh2", zone: toZone("A1"), targetCol: 0, targetRow: 0 };

  let result = model.dispatch("MOVE_REFERENCES", cmd);
  expect(result).toBeSuccessfullyDispatched();

  result = model.dispatch("MOVE_REFERENCES", { ...cmd, targetSheetId: "invalidTargetSheet" });
  expect(result).toBeCancelledBecause(CommandResult.InvalidSheetId);

  result = model.dispatch("MOVE_REFERENCES", { ...cmd, sheetId: "invalidOriginSheet" });
  expect(result).toBeCancelledBecause(CommandResult.InvalidSheetId);

  result = model.dispatch("MOVE_REFERENCES", { ...cmd, zone: toZone("A12") });
  expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet);

  result = model.dispatch("MOVE_REFERENCES", { ...cmd, targetCol: 15 });
  expect(result).toBeSuccessfullyDispatched();

  result = model.dispatch("MOVE_REFERENCES", { ...cmd, targetRow: 25 });
  expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
});
