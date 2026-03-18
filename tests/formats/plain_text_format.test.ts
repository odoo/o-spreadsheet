import { Model } from "../../src";
import { CellValueType, DEFAULT_LOCALE } from "../../src/types";
import { setCellContent, setFormat, updateLocale } from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getCellRawContent,
  getEvaluatedCell,
} from "../test_helpers/getters_helpers";
import { createModel } from "../test_helpers/helpers";
import { FR_LOCALE } from "./../test_helpers/constants";

let model: Model;
beforeEach(async () => {
  model = await createModel();
});

describe("Plain text format", () => {
  test.each([
    ["hello", "hello", "hello"],
    ["5", 5, "5"],
    ["=5", 5, "5"],
    ["9.15", 9.15, "9.15"],
    ["TRUE", true, "TRUE"],
    ["false", false, "FALSE"],
    ["12/20/2015", 42358, "42358"],
    ["20/20/2015", "20/20/2015", "20/20/2015"], // invalid date
    ["=SUM(3, 5)", 8, "8"],
    ["=DATE(2022, 06, 30)", 44742, "44742"],
  ])(
    "Set plain text format to a cell %s %s %s",
    async (
      cellContent: string,
      beforePlainText: string | boolean | number,
      plainTextValue: string
    ) => {
      await setCellContent(model, "A1", cellContent);
      expect(getEvaluatedCell(model, "A1").value).toBe(beforePlainText);

      await setFormat(model, "A1", "@");
      expect(getEvaluatedCell(model, "A1").value).toBe(plainTextValue);
    }
  );

  test.each([
    ["hello", "hello"],
    ["'5", "5"],
    ["'=5", "=5"],
    ["'9.15", "9.15"],
    ["'TRUE", "TRUE"],
    ["'false", "false"],
    ["'12/20/2015", "12/20/2015"],
    ["'=SUM(3, 5)", "=SUM(3, 5)"],
  ])("use single quote to input plain text in a cell", async (cellContent, expectedValue) => {
    await setCellContent(model, "A1", cellContent);
    expect(getEvaluatedCell(model, "A1").value).toBe(expectedValue);
    expect(getCellRawContent(model, "A1")).toBe(cellContent);
  });

  test("Set more complex text format to a cell", async () => {
    await setCellContent(model, "A1", "89");
    await setFormat(model, "A1", "@ $");
    expect(getEvaluatedCell(model, "A1")).toMatchObject({
      value: "89",
      type: CellValueType.text,
      formattedValue: "89 $",
    });
  });

  test.each([
    ["hello", "hello"],
    ["5", "5"],
    ["00005", "00005"],
    ["=5", "5"],
    ["9.15", "9.15"],
    ["TRUE", "TRUE"],
    ["false", "false"],
    ["12/20/2015", "12/20/2015"],
    ["=SUM(3, 5)", "8"],
    ["=DATE(2022, 06, 30)", "44742"],
  ])(
    "Set content to a cell formatted with plain text %s %s: text should be kept as is, not parsed",
    async (inputValue: string, expectedCellValue: string) => {
      await setFormat(model, "A1", "@");
      await setCellContent(model, "A1", inputValue);
      expect(getEvaluatedCell(model, "A1").value).toBe(expectedCellValue);
    }
  );

  test("Input localized date on a plain text cell", async () => {
    await updateLocale(model, FR_LOCALE);
    await setFormat(model, "A1", "@");
    await setCellContent(model, "A1", "30/05/2015");

    expect(getCellRawContent(model, "A1")).toBe("30/05/2015");
    expect(getEvaluatedCell(model, "A1").value).toBe("30/05/2015");

    await setCellContent(model, "A2", "=A1+1");
    expect(getEvaluatedCell(model, "A2").value).toBe("42155"); // Not pretty, but same behavior as Excel

    await updateLocale(model, DEFAULT_LOCALE);
    expect(getCellRawContent(model, "A1")).toBe("30/05/2015");
    expect(getEvaluatedCell(model, "A1").value).toBe("30/05/2015");

    // Kind of a wrong behavior, but it's an edge case that would be difficult to fix
    expect(getEvaluatedCell(model, "A2").value).toBe("#ERROR");
  });

  test("can export/import plain text format", async () => {
    await setFormat(model, "A1", "@");
    await setCellContent(model, "A1", "00009");

    expect(getCellContent(model, "A1")).toBe("00009");
    const exported = model.exportData();

    const importedModel = await createModel(exported);
    expect(getCell(importedModel, "A1")?.format).toBe("@");
    expect(getCellContent(importedModel, "A1")).toBe("00009");
  });

  test("Cells with no content stay empty with a text format", async () => {
    await setFormat(model, "A1", "@");
    expect(getCellRawContent(model, "A1")).toBe("");
    expect(getEvaluatedCell(model, "A1").value).toBe(null);
    expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.empty);
  });
});
