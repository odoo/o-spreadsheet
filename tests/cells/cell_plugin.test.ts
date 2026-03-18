import { LINK_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { urlRepresentation } from "@odoo/o-spreadsheet-engine/helpers/links";
import { corePluginRegistry } from "@odoo/o-spreadsheet-engine/plugins";
import { CoreCommand, CorePlugin, Model } from "../../src";
import { buildSheetLink } from "../../src/helpers";
import { CellValueType, CommandResult } from "../../src/types";
import {
  addColumns,
  addRows,
  clearCell,
  clearCells,
  copy,
  createSheet,
  createTableWithFilter,
  deleteColumns,
  deleteContent,
  deleteRows,
  deleteSheet,
  deleteUnfilteredContent,
  hideRows,
  paste,
  renameSheet,
  setCellContent,
  setCellFormat,
  setCellStyle,
  setFormatting,
  undo,
  updateCell,
  updateFilter,
} from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getCellRawContent,
  getCellText,
  getEvaluatedCell,
  getStyle,
} from "../test_helpers/getters_helpers";
import { addTestPlugin, createModel, getGrid, setGrid } from "../test_helpers/helpers";

describe("getCellText", () => {
  test("Update cell with a format is correctly set", async () => {
    const model = await createModel();
    await updateCell(model, "A1", { content: "5%", format: "bla" });
    await updateCell(model, "B2", { content: "12/30/1899", format: "bla" });
    await updateCell(model, "C3", { content: "=DATE(2021,1,1)", format: "bla" });
    expect(getCell(model, "A1")?.format).toBe("bla");
    expect(getCell(model, "B2")?.format).toBe("bla");
    expect(getCell(model, "C3")?.format).toBe("bla");
  });

  test("update cell outside of sheet", async () => {
    const model = await createModel();
    const result = await setCellContent(model, "ZZ9999", "hello");
    expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
  });

  test("update cell outside of sheet (without any modification)", async () => {
    const model = await createModel();
    const result = await updateCell(model, "ZZ9999", {});
    expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet, CommandResult.NoChanges);
  });

  test("update cell without any modification", async () => {
    const model = await createModel();
    const result = await updateCell(model, "A1", {});
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update cell with only the same content as before", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "hello");
    await setCellFormat(model, "A1", "#,##0.0");
    await setFormatting(model, "A1", { bold: true });
    const result = await setCellContent(model, "A1", "hello");
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update cell with only the same format as before", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "0");
    await setCellFormat(model, "A1", "#,##0.0");
    await setFormatting(model, "A1", { bold: true });
    const result = await setCellFormat(model, "A1", "#,##0.0");
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update cell with only the same style as before", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "0");
    await setCellFormat(model, "A1", "#,##0.0");
    await setFormatting(model, "A1", { bold: true });
    const result = await setCellStyle(model, "A1", { bold: true });
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("update cell with the same style, content and format as before", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "hello");
    await setCellFormat(model, "A1", "#,##0.0");
    await setFormatting(model, "A1", { bold: true });
    const result = await updateCell(model, "A1", {
      content: "hello",
      format: "#,##0.0",
      style: { bold: true },
    });
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("clear content", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "hello");
    await clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear some content", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "hello");
    await setCellContent(model, "A2", "there");
    await clearCells(model, ["A1:A2"]);
    expect(getCell(model, "A1")).toBeUndefined();
    expect(getCell(model, "A2")).toBeUndefined();
  });

  test("clear some style", async () => {
    const model = await createModel();
    await setFormatting(model, "A1", { bold: true });
    await clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear some style", async () => {
    const model = await createModel();
    await setFormatting(model, "A1", { bold: true });
    await setFormatting(model, "A2", { italic: true });
    await clearCells(model, ["A1:A2"]);
    expect(getCell(model, "A1")).toBeUndefined();
    expect(getCell(model, "A2")).toBeUndefined();
  });

  test("clear format", async () => {
    const model = await createModel();
    await setCellFormat(model, "A1", "#,##0.0");
    await clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear some format", async () => {
    const model = await createModel();
    await setCellFormat(model, "A1", "#,##0.0");
    await setCellFormat(model, "A2", "0%");
    await clearCells(model, ["A1:A2"]);
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear content, style and format", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "hello");
    await setFormatting(model, "A1", { bold: true });
    await setCellFormat(model, "A1", "#,##0.0");
    await clearCell(model, "A1");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("clear some content, style and format", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "hello");
    await setCellContent(model, "A2", "there");
    await setFormatting(model, "A1", { bold: true });
    await setFormatting(model, "A2", { italic: true });
    await setCellFormat(model, "A1", "#,##0.0");
    await setCellFormat(model, "A2", "0%");
    await clearCells(model, ["A1", "A2"]);
    expect(getCell(model, "A1")).toBeUndefined();
    expect(getCell(model, "A2")).toBeUndefined();
  });

  test("clear cell outside of sheet", async () => {
    const model = await createModel();
    const result = await clearCell(model, "AAA999");
    expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet, CommandResult.NoChanges);
  });

  test("clear cell is cancelled if there is nothing on the cell", async () => {
    const model = await createModel();
    const result = await clearCell(model, "A1");
    expect(result).toBeCancelledBecause(CommandResult.NoChanges);
  });

  test("escape character is not display when formatting string", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", '="hello \\"world\\""');
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toBe('hello "world"');
  });

  test("Non breaking spaces are kept on cell insertion", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "hello\u00A0world");
    expect(getCellText(model, "A1")).toBe("hello\u00A0world");
  });
});

describe("link cell", () => {
  test.each(["http://odoo.com", "https://odoo.com"])(
    "can create a markdown link cell: %s",
    async (url) => {
      const model = await createModel();
      await setCellContent(model, "A1", `[my label](${url})`);
      const cell = getEvaluatedCell(model, "A1");
      expect(cell.link?.label).toBe("my label");
      expect(cell.link?.url).toBe(url);
      expect(urlRepresentation(cell.link!, model.getters)).toBe(url);
      expect(getCellRawContent(model, "A1")).toBe(`[my label](${url})`);
      expect(getStyle(model, "A1")).toEqual({ textColor: LINK_COLOR });
      expect(getCellText(model, "A1")).toBe("my label");
    }
  );

  test.each(["http://odoo.com", "https://odoo.com"])(
    "can create a link cell using HYPERLINK function: %s",
    async (url) => {
      const model = await createModel();
      await setCellContent(model, "B1", `=HYPERLINK("${url}","Odoo")`);
      const cell = getEvaluatedCell(model, "B1");
      expect(cell.link?.label).toBe("Odoo");
      expect(cell.link?.url).toBe(url);
      expect(urlRepresentation(cell.link!, model.getters)).toBe(url);
      expect(getCellRawContent(model, "B1")).toBe(`=HYPERLINK("${url}","Odoo")`);
      expect(getStyle(model, "B1")).toEqual({ textColor: LINK_COLOR });
      expect(getCellText(model, "B1")).toBe(`=HYPERLINK("${url}","Odoo")`);
    }
  );

  test.each(["[Odoo](odoo.com)", '=HYPERLINK("odoo.com", "Odoo")'])(
    "https prefix is added if it's missing: %s",
    async (content) => {
      const model = await createModel();
      await setCellContent(model, "A1", content);
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
    async (content) => {
      const model = await createModel();
      await setCellContent(model, "A1", content);
      const cell = getEvaluatedCell(model, "A1");
      expect(cell.link).toBeUndefined();
    }
  );

  test.each(['=HYPERLINK("www.odoo.com", "")', '=HYPERLINK("www.odoo.com", "   ")'])(
    "HYPERLINK cell with non-empty url but specified empty label will still be converted into link cell",
    async (content) => {
      const model = await createModel();
      await setCellContent(model, "A1", content);
      const cell = getEvaluatedCell(model, "A1");
      expect(cell.link?.url).toBe("https://www.odoo.com");
    }
  );

  test("literal number in markdown is parsed", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", `[3](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(3);
  });

  test("literal boolean in markdown is parsed", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", `[true](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(true);
  });

  test("literal date in markdown is parsed and preserves format", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", `[12/31/1999](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(36525);
    expect(getEvaluatedCell(model, "A1").format).toBe("m/d/yyyy");
  });

  test("literal number format is preserved", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", `[3%](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(0.03);
    expect(getEvaluatedCell(model, "A1").format).toBe("0%");
  });

  test("can use link labels in formula", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", `[3](odoo.com)`);
    await setCellContent(model, "A2", `[1](odoo.com)`);
    await setCellContent(model, "A3", `=A1+A2`);
    expect(getEvaluatedCell(model, "A3").value).toBe(4);
  });

  test("user defined format is preserved over markdown format", async () => {
    const model = await createModel();
    await setCellFormat(model, "A1", "#,##0.0");
    await setCellContent(model, "A1", `[300%](odoo.com)`);
    expect(getEvaluatedCell(model, "A1").value).toBe(3);
    expect(getEvaluatedCell(model, "A1").format).toBe("#,##0.0");
  });

  test("simple url becomes a link cell", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "http://odoo.com");
    const cell = getEvaluatedCell(model, "A1");
    expect(getCellRawContent(model, "A1")).toBe("http://odoo.com");
    expect(cell.link?.label).toBe("http://odoo.com");
    expect(cell.link?.url).toBe("http://odoo.com");
    expect(cell.value).toBe("http://odoo.com");
  });

  test.each([
    "prefixhttp://odoo.com",
    "https://url",
    "https://url with spaces.com",
    "http://odoo.com postfix",
  ])("invalid url %s are not recognized as web links", async (url) => {
    const model = await createModel();
    await setCellContent(model, "A1", url);
    expect(getCellRawContent(model, "A1")).toBe(url);
    expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.text);
  });

  test.each(["[]()", "[ ]()", "[]( )", " [label](url) "])(
    "invalid markdown %s is not recognized as link",
    async (markdown) => {
      const model = await createModel();
      await setCellContent(model, "A1", markdown);
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
  ])("valid markdown %s is recognized as link", async (markdown, label, link) => {
    const model = await createModel();
    await setCellContent(model, "A1", markdown);
    const cell = getEvaluatedCell(model, "A1");
    expect(cell.link?.label).toBe(label);
    expect(cell.link?.url).toBe(link);
  });

  test("can create a sheet link", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    await setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getEvaluatedCell(model, "A1");
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink);
    expect(urlRepresentation(cell.link!, model.getters)).toBe("Sheet1");
    expect(getCellText(model, "A1")).toBe("my label");
  });

  test("sheet url representation is updated when sheet is renamed", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    await setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getEvaluatedCell(model, "A1");

    await renameSheet(model, sheetId, "new name");
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink);
    expect(urlRepresentation(cell.link!, model.getters)).toBe("new name");
    expect(getCellText(model, "A1")).toBe("my label");
    await undo(model);
    expect(urlRepresentation(cell.link!, model.getters)).toBe("Sheet1");
  });

  test("can create an invalid sheet link", async () => {
    const model = await createModel();
    const sheetLink = buildSheetLink("invalidSheetId");
    await setCellContent(model, "A1", `[my label](${sheetLink})`);
    const cell = getEvaluatedCell(model, "A1");
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink);
    expect(urlRepresentation(cell.link!, model.getters).toString()).toBe("Invalid sheet");
    expect(getCellText(model, "A1")).toBe("my label");
  });

  test("sheet link is updated if the sheet is deleted", async () => {
    const model = await createModel();
    await createSheet(model, { sheetId: "42" });
    const sheetLink = buildSheetLink("42");
    await setCellContent(model, "A1", `[my label](${sheetLink})`);
    await deleteSheet(model, "42");
    const cell = getEvaluatedCell(model, "A1");
    expect(cell.link?.label).toBe("my label");
    expect(cell.link?.url).toBe(sheetLink);
    expect(urlRepresentation(cell.link!, model.getters).toString()).toBe("Invalid sheet");
    expect(getCellText(model, "A1")).toBe("my label");
    await undo(model);
    expect(urlRepresentation(cell.link!, model.getters)).toBe("Sheet2");
  });

  test.each(["[my label](odoo.com)", '=HYPERLINK("odoo.com")'])(
    "link text color is applied if a custom style is specified",
    async (content) => {
      const model = await createModel();
      await updateCell(model, "A1", {
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
    async (content) => {
      const model = await createModel();
      await setCellStyle(model, "A1", { fillColor: "#555", bold: true, textColor: "#111" });
      await setCellContent(model, "A1", content);
      expect(getCell(model, "A1")?.style).toEqual({
        fillColor: "#555",
        bold: true,
        textColor: "#111",
      });
    }
  );

  test("copy-paste web links", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", `[my label](odoo.com)`);
    const B2 = getEvaluatedCell(model, "B2");
    await copy(model, "B2");
    await paste(model, "D2");
    const B2After = getEvaluatedCell(model, "B2");
    const D2 = getEvaluatedCell(model, "D2");
    expect(B2After.link).toEqual(B2.link);
    expect(D2.link).toEqual(B2.link);
    expect(getCell(model, "D2")?.style).toEqual(getCell(model, "B2")?.style);
  });

  test("copy-paste sheet links", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    const sheetLink = buildSheetLink(sheetId);
    await setCellContent(model, "B2", `[my label](${sheetLink})`);
    const B2 = getEvaluatedCell(model, "B2")!;
    await copy(model, "B2");
    await paste(model, "D2");
    const B2After = getEvaluatedCell(model, "B2");
    const D2 = getEvaluatedCell(model, "D2");
    expect(B2After.link).toEqual(B2.link);
    expect(D2.link).toEqual(B2.link);
    expect(getCell(model, "D2")?.style).toEqual(getCell(model, "B2")?.style);
  });

  test("copy-paste custom style", async () => {
    const model = await createModel();
    await updateCell(model, "B2", {
      content: "[my label](odoo.com)",
      style: { fillColor: "#555", bold: true, textColor: "#111" },
    });
    await copy(model, "B2");
    await paste(model, "D2");
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
])(
  "Content string given to update cell are properly sanitized %s",
  async (originalString: string, sanitizedString: string) => {
    const model = await createModel();
    await setCellContent(model, "A1", originalString);
    expect(getCellContent(model, "A1")).toEqual(sanitizedString);
  }
);

test.each([
  ["12/31/1999", "36525", "m/d/yyyy"],
  ["30€", "30", "#,##0[$€]"],
  ["50.69%", "0.5069", "0.00%"],
])(
  "Special literal string %s is stored and exported as a number + format",
  async (literal, value, format) => {
    const model = await createModel();
    await setCellContent(model, "A1", literal);
    expect(getCell(model, "A1")).toMatchObject({ content: value, format: format });
    const exportedData = model.exportData();
    expect(exportedData.sheets[0].cells.A1).toBe(value);
    expect(exportedData.sheets[0].formats.A1).toBe(1);
    expect(exportedData.formats["1"]).toEqual(format);
  }
);

test.each(["5 \n", " \n 5", "5\n5", "fougere\n", "12:00 \n AM"])(
  "content with a newline character is automatically a string",
  async (content) => {
    const model = await createModel();
    await setCellContent(model, "A1", content);
    expect(getCellContent(model, "A1")).toEqual(content);
    const evaluatedCell = getEvaluatedCell(model, "A1");
    expect(evaluatedCell.type).toBe(CellValueType.text);
    expect(evaluatedCell.value).toEqual(content);
  }
);

describe("Cell dependencies and tokens are updated", () => {
  let model: Model;

  beforeEach(async () => {
    model = await createModel();
  });

  test("on row addition", async () => {
    await setCellContent(model, "A1", "=C3");
    await addRows(model, "before", 2, 1);

    expect(getCellText(model, "A1")).toBe("=C4");
  });

  test("on row removed", async () => {
    await setCellContent(model, "A1", "=C3");
    await deleteRows(model, [1]);

    expect(getCellText(model, "A1")).toBe("=C2");
  });

  test("on column added", async () => {
    await setCellContent(model, "A1", "=C3");
    await addColumns(model, "before", "B", 1);

    expect(getCellText(model, "A1")).toBe("=D3");
  });

  test("on column removed", async () => {
    await setCellContent(model, "A1", "=C3");
    await deleteColumns(model, ["B"]);

    expect(getCellText(model, "A1")).toBe("=B3");
  });

  test("Do not dispatch UPDATE_CELL subcommands if the content is empty", async () => {
    let counter = 0;
    class SubCommandCounterRange extends CorePlugin {
      static getters = [];
      handle(command: CoreCommand) {
        if (command.type === "UPDATE_CELL") {
          counter++;
        }
      }
    }
    addTestPlugin(corePluginRegistry, SubCommandCounterRange);
    const model = await createModel();
    await setFormatting(model, "A1", { bold: true });
    counter = 0;
    await deleteContent(model, ["A1"]);
    expect(counter).toBe(0);
  });
});

describe("Delete cell content", () => {
  let model: Model;

  beforeEach(async () => {
    model = await createModel();
  });

  test("With DELETE_CONTENT command", async () => {
    await setCellContent(model, "A1", "hello");
    await deleteContent(model, ["A1"]);
    expect(getCellContent(model, "A1")).toBe("");
  });

  test("With DELETE_UNFILTERED_CONTENT command", async () => {
    await setCellContent(model, "A1", "hello");
    await deleteUnfilteredContent(model, "A1");
    expect(getCellContent(model, "A1")).toBe("");
  });

  test("DELETE_UNFILTERED_CONTENT ignores filtered rows", async () => {
    await setGrid(model, { A2: "A1", A3: "A3", A4: "A4", B2: "B2", B3: "B3", B4: "B4" });
    await createTableWithFilter(model, "A1:B4");
    await updateFilter(model, "A1", ["A3"]);
    await deleteUnfilteredContent(model, "A1:B4");
    expect(getGrid(model)).toEqual({ A3: "A3", B3: "B3" });
  });

  test("DELETE_UNFILTERED_CONTENT removes content of hidden rows", async () => {
    await setGrid(model, { A2: "A1", A3: "A3", A4: "A4", B2: "B2", B3: "B3", B4: "B4" });
    await hideRows(model, [2]);
    await deleteUnfilteredContent(model, "A1:B4");
    expect(getGrid(model)).toEqual({});
  });
});
