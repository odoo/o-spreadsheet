import { Model } from "../../src";
import { LINK_COLOR } from "../../src/constants";
import { buildSheetLink, toZone } from "../../src/helpers";
import { urlRepresentation } from "../../src/helpers/links";
import { CellValueType, CommandResult } from "../../src/types";
import {
  addColumns,
  addRows,
  clearCell,
  clearCells,
  copy,
  createSheet,
  deleteColumns,
  deleteRows,
  deleteSheet,
  paste,
  renameSheet,
  setCellContent,
  setCellFormat,
  setStyle,
  undo,
} from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getCellText,
  getEvaluatedCell,
  getStyle,
} from "../test_helpers/getters_helpers";

describe("getCellText", () => {
  test("Update cell with a format is correctly set", () => {
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    const result = model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 9999,
      row: 9999,
    });
    expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet, CommandResult.NoChanges);
  });

  test("update cell without any modification", () => {
    const model = Model.BuildSync();
    const sheetId = model.getters.getActiveSheetId();
    const result = model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
    });
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update cell with only the same content as before", () => {
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
    setCellContent(model, "A1", "hello");
    clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear some content", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "there");
    clearCells(model, ["A1:A2"]);
    expect(getCell(model, "A1")).toBeUndefined();
    expect(getCell(model, "A2")).toBeUndefined();
  });

  test("clear some style", () => {
    const model = Model.BuildSync();
    setStyle(model, "A1", { bold: true });
    clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear some style", () => {
    const model = Model.BuildSync();
    setStyle(model, "A1", { bold: true });
    setStyle(model, "A2", { italic: true });
    clearCells(model, ["A1:A2"]);
    expect(getCell(model, "A1")).toBeUndefined();
    expect(getCell(model, "A2")).toBeUndefined();
  });

  test("clear format", () => {
    const model = Model.BuildSync();
    setCellFormat(model, "A1", "#,##0.0");
    clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear some format", () => {
    const model = Model.BuildSync();
    setCellFormat(model, "A1", "#,##0.0");
    setCellFormat(model, "A2", "0%");
    clearCells(model, ["A1:A2"]);
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear content, style and format", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", "hello");
    setStyle(model, "A1", { bold: true });
    setCellFormat(model, "A1", "#,##0.0");
    clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear some content, style and format", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "there");
    setStyle(model, "A1", { bold: true });
    setStyle(model, "A2", { italic: true });
    setCellFormat(model, "A1", "#,##0.0");
    setCellFormat(model, "A2", "0%");
    clearCells(model, ["A1", "A2"]);
    expect(getCell(model, "A1")).toBeUndefined();
    expect(getCell(model, "A2")).toBeUndefined();
  });

  test("clear cell outside of sheet", () => {
    const model = Model.BuildSync();
    const result = clearCell(model, "AAA999");
    expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet, CommandResult.NoChanges);
  });

  test("clear cell is cancelled if there is nothing on the cell", () => {
    const model = Model.BuildSync();
    const result = clearCell(model, "A1");
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("escape character is not display when formatting string", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", '="hello \\"world\\""');
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toBe('hello "world"');
  });
});

describe("link cell", () => {
  test.each(["http://odoo.com", "https://odoo.com"])(
    "can create a markdown link cell: %s",
    (url) => {
      const model = Model.BuildSync();
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

  test.each(["http://odoo.com", "https://odoo.com"])(
    "can create a link cell using HYPERLINK function: %s",
    (url) => {
      const model = Model.BuildSync();
      setCellContent(model, "B1", `=HYPERLINK("${url}", "Odoo")`);
      const cell = getEvaluatedCell(model, "B1");
      expect(cell.link?.label).toBe("Odoo");
      expect(cell.link?.url).toBe(url);
      expect(urlRepresentation(cell.link!, model.getters)).toBe(url);
      expect(getCell(model, "B1")?.content).toBe(`=HYPERLINK("${url}", "Odoo")`);
      expect(getStyle(model, "B1")).toEqual({ textColor: LINK_COLOR });
      expect(getCellText(model, "B1")).toBe(`=HYPERLINK("${url}", "Odoo")`);
    }
  );

  test.each(["[Odoo](odoo.com)", '=HYPERLINK("odoo.com", "Odoo")'])(
    "https prefix is added if it's missing: %s",
    (content) => {
      const model = Model.BuildSync();
      setCellContent(model, "A1", content);
      const cell = getEvaluatedCell(model, "A1");
      expect(cell.link?.url).toBe("https://odoo.com");
      expect(urlRepresentation(cell.link!, model.getters)).toBe("https://odoo.com");
    }
  );

  test.each([
    '=HYPERLINK("")',
    '=HYPERLINK("   ")',
    '=HYPERLINK("", " ")',
    '=HYPERLINK(" ", " ")',
    '=HYPERLINK("", "")',
  ])(
    "url which is empty or only contains whitespaces in HYPERLINK should not be converted into link cell",
    (content) => {
      const model = Model.BuildSync();
      setCellContent(model, "A1", content);
      const cell = getEvaluatedCell(model, "A1");
      expect(cell.link).toBeUndefined();
    }
  );

  test.each(['=HYPERLINK("www.odoo.com", "")', '=HYPERLINK("www.odoo.com", "   ")'])(
    "HYPERLINK cell with non-empty url but specified empty label will still be converted into link cell",
    (content) => {
      const model = Model.BuildSync();
      setCellContent(model, "A1", content);
      const cell = getEvaluatedCell(model, "A1");
      expect(cell.link?.url).toBe("https://www.odoo.com");
    }
  );

  test("literal number in markdown is parsed", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", `[3](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(3);
  });

  test("literal boolean in markdown is parsed", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", `[true](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(true);
  });

  test("literal date in markdown is parsed and preserves format", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", `[12/31/1999](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(36525);
    expect(getEvaluatedCell(model, "A1").format).toBe("m/d/yyyy");
  });

  test("literal number format is preserved", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", `[3%](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(0.03);
    expect(getEvaluatedCell(model, "A1").format).toBe("0%");
  });

  test("can use link labels in formula", () => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", `[3](odoo.com)`);
    setCellContent(model, "A2", `[1](odoo.com)`);
    setCellContent(model, "A3", `=A1+A2`);
    expect(getEvaluatedCell(model, "A3").value).toBe(4);
  });

  test("user defined format is preserved over markdown format", () => {
    const model = Model.BuildSync();
    setCellFormat(model, "A1", "#,##0.0");
    setCellContent(model, "A1", `[300%](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(3);
    expect(getEvaluatedCell(model, "A1").format).toBe("#,##0.0");
  });

  test("simple url becomes a link cell", () => {
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
    setCellContent(model, "A1", url);
    expect(getCell(model, "A1")?.content).toBe(url);
    expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.text);
  });

  test.each(["[]()", "[ ]()", "[]( )", " [label](url) "])(
    "invalid markdown %s is not recognized as link",
    (markdown) => {
      const model = Model.BuildSync();
      setCellContent(model, "A1", markdown);
      const cell = getEvaluatedCell(model, "A1");
      expect(cell.value).toBe(markdown);
      expect(cell.type).toBe(CellValueType.text);
      expect(cell.link).toBeFalsy();
    }
  );

  test.each([
    ["[label](url)", "label", "https://url"],
    ["[[label](link)](http://odoo.com)", "[label](link)", "http://odoo.com"],
    ["[lab[el](url)", "lab[el", "https://url"],
    ["[lab]el](url)", "lab]el", "https://url"],
    ["[[label]](url)", "[label]", "https://url"],
  ])("valid markdown %s is recognized as link", (markdown, label, link) => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", markdown);
    const cell = getEvaluatedCell(model, "A1");
    expect(cell.link?.label).toBe(label);
    expect(cell.link?.url).toBe(link);
  });

  test("can create a sheet link", () => {
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
    const sheetLink = buildSheetLink("invalidSheetId");
    setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getEvaluatedCell(model, "A1");
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink);
    expect(urlRepresentation(cell.link!, model.getters).toString()).toBe("Invalid sheet");
    expect(getCellText(model, "A1")).toBe("my label");
  });

  test("sheet link is updated if the sheet is deleted", () => {
    const model = Model.BuildSync();
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

  test.each(["[my label](odoo.com)", '=HYPERLINK("odoo.com")'])(
    "link text color is applied if a custom style is specified",
    (content) => {
      const model = Model.BuildSync();
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        sheetId,
        content,
        style: { fillColor: "#555", bold: true, textColor: "#111" },
      });
      expect(getCell(model, "A1")?.style).toEqual({
        fillColor: "#555",
        bold: true,
        textColor: "#111",
      });
    }
  );

  test.each(["[my label](odoo.com)", '=HYPERLINK("odoo.com")'])(
    "link text color is not overwritten if there is a custom style",
    (content) => {
      const model = Model.BuildSync();
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("UPDATE_CELL", {
        col: 0,
        row: 0,
        sheetId,
        style: { fillColor: "#555", bold: true, textColor: "#111" },
      });
      setCellContent(model, "A1", content);
      expect(getCell(model, "A1")?.style).toEqual({
        fillColor: "#555",
        bold: true,
        textColor: "#111",
      });
    }
  );

  test("copy-paste web links", () => {
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
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
    const model = Model.BuildSync();
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

test.each([
  ["Line\nLine2", "Line\nLine2"],
  ["Line\rLine2", "Line\nLine2"],
  ["Line\r\nLine2", "Line\nLine2"],
  ["Word\xa0Word2", "Word Word2"], // \xa0 => non-breaking space
])(
  "Content string given to update cell are properly sanitized %s",
  (originalString: string, sanitizedString: string) => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", originalString);
    expect(getCellContent(model, "A1")).toEqual(sanitizedString);
  }
);

test.each([
  ["12/31/1999", "36525", "m/d/yyyy"],
  ["30€", "30", "#,##0[$€]"],
  ["50.69%", "0.5069", "0.00%"],
])(
  "Special literal string %s is stored and exported as a number + format",
  (literal, value, format) => {
    const model = Model.BuildSync();
    setCellContent(model, "A1", literal);
    expect(getCell(model, "A1")).toMatchObject({ content: value, format: format });
    const exportedData = model.exportData();
    expect(exportedData.sheets[0].cells.A1).toMatchObject({
      content: value,
      format: 1,
    });
    expect(exportedData.formats["1"]).toEqual(format);
  }
);

describe("Cell dependencies and tokens are updated", () => {
  let model: Model;

  beforeEach(() => {
    model = Model.BuildSync();
  });

  test("on row addition", () => {
    setCellContent(model, "A1", "=C3");
    addRows(model, "before", 2, 1);

    expect(getCell(model, "A1")).toMatchObject({
      content: "=C4",
      compiledFormula: {
        dependencies: [{ zone: toZone("C4") }],
        tokens: [
          { type: "OPERATOR", value: "=" },
          { type: "REFERENCE", value: "C4" },
        ],
      },
    });
  });

  test("on row removed", () => {
    setCellContent(model, "A1", "=C3");
    deleteRows(model, [1]);

    expect(getCell(model, "A1")).toMatchObject({
      content: "=C2",
      compiledFormula: {
        dependencies: [{ zone: toZone("C2") }],
        tokens: [
          { type: "OPERATOR", value: "=" },
          { type: "REFERENCE", value: "C2" },
        ],
      },
    });
  });

  test("on column added", () => {
    setCellContent(model, "A1", "=C3");
    addColumns(model, "before", "B", 1);

    expect(getCell(model, "A1")).toMatchObject({
      content: "=D3",
      compiledFormula: {
        dependencies: [{ zone: toZone("D3") }],
        tokens: [
          { type: "OPERATOR", value: "=" },
          { type: "REFERENCE", value: "D3" },
        ],
      },
    });
  });

  test("on column removed", () => {
    setCellContent(model, "A1", "=C3");
    deleteColumns(model, ["B"]);

    expect(getCell(model, "A1")).toMatchObject({
      content: "=B3",
      compiledFormula: {
        dependencies: [{ zone: toZone("B3") }],
        tokens: [
          { type: "OPERATOR", value: "=" },
          { type: "REFERENCE", value: "B3" },
        ],
      },
    });
  });
});
