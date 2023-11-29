import { Model } from "../../src";
import { DEFAULT_LOCALE, PLAIN_TEXT_FORMAT } from "../../src/types";
import { setCellContent, setFormat, updateLocale } from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { FR_LOCALE } from "./../test_helpers/constants";

let model: Model;
beforeEach(() => {
  model = new Model();
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
    (cellContent: string, beforePlainText: string | boolean | number, plainTextValue: string) => {
      setCellContent(model, "A1", cellContent);
      expect(getEvaluatedCell(model, "A1").value).toBe(beforePlainText);

      setFormat(model, "A1", PLAIN_TEXT_FORMAT);
      expect(getEvaluatedCell(model, "A1").value).toBe(plainTextValue);
    }
  );

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
    (inputValue: string, expectedCellValue: string) => {
      setFormat(model, "A1", PLAIN_TEXT_FORMAT);
      setCellContent(model, "A1", inputValue);
      expect(getEvaluatedCell(model, "A1").value).toBe(expectedCellValue);
    }
  );

  test("Input localized date on a plain text cell", () => {
    updateLocale(model, FR_LOCALE);
    setFormat(model, "A1", PLAIN_TEXT_FORMAT);
    setCellContent(model, "A1", "30/05/2015");

    expect(getCell(model, "A1")?.content).toBe("30/05/2015");
    expect(getEvaluatedCell(model, "A1").value).toBe("30/05/2015");

    setCellContent(model, "A2", "=A1+1");
    expect(getEvaluatedCell(model, "A2").value).toBe("42155"); // Not pretty, but same behavior as Excel

    updateLocale(model, DEFAULT_LOCALE);
    expect(getCell(model, "A1")?.content).toBe("30/05/2015");
    expect(getEvaluatedCell(model, "A1").value).toBe("30/05/2015");

    // Kind of a wrong behavior, but it's an edge case that would be difficult to fix
    expect(getEvaluatedCell(model, "A2").value).toBe("#ERROR");
  });

  test("can export/import plain text format", () => {
    setFormat(model, "A1", PLAIN_TEXT_FORMAT);
    setCellContent(model, "A1", "00009");

    expect(getCellContent(model, "A1")).toBe("00009");
    const exported = model.exportData();

    const importedModel = new Model(exported);
    expect(getCell(importedModel, "A1")?.format).toBe(PLAIN_TEXT_FORMAT);
    expect(getCellContent(importedModel, "A1")).toBe("00009");
  });
});
