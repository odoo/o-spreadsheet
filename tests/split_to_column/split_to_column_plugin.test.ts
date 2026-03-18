import { Model } from "@odoo/o-spreadsheet-engine/model";
import { toZone } from "../../src/helpers";
import { CommandResult, DEFAULT_LOCALE, UID } from "../../src/types";
import {
  merge,
  redo,
  setCellContent,
  setCellFormat,
  setSelection,
  splitTextToColumns,
  undo,
  updateLocale,
} from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";
import {
  createModel,
  getGrid,
  getGridFormat,
  getGridStyle,
  setGrid,
  setGridStyle,
} from "../test_helpers/helpers";

describe("Split text into columns", () => {
  let model: Model;
  let sheetId: UID;
  beforeEach(async () => {
    model = await createModel({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    sheetId = model.getters.getActiveSheetId();
  });

  describe("allowDispatch results", () => {
    test("Selection with more than one zone", async () => {
      await setSelection(model, ["A1", "B2"]);
      const result = await splitTextToColumns(model, " ");
      expect(result).toBeCancelledBecause(CommandResult.MoreThanOneColumnSelected);
    });

    test("Selection with more than one column", async () => {
      await setSelection(model, ["A1:C2"]);
      const result = await splitTextToColumns(model, " ");
      expect(result).toBeCancelledBecause(CommandResult.MoreThanOneColumnSelected);
    });

    test("Empty separator", async () => {
      const result = await splitTextToColumns(model, "", "A1");
      expect(result).toBeCancelledBecause(CommandResult.EmptySplitSeparator);
    });

    test("Won't overwrite content without force", async () => {
      await setGrid(model, { A1: "Hello there", B1: "Hi!" });
      const result = await splitTextToColumns(model, " ", "A1");
      expect(result).toBeCancelledBecause(CommandResult.SplitWillOverwriteContent);
    });

    test("Won't overwrite content in merge without force", async () => {
      await merge(model, "B1:C2");
      await setGrid(model, { A1: "Hello there", B1: "merged" });
      const result = await splitTextToColumns(model, " ", "A1");
      expect(result).toBeCancelledBecause(CommandResult.SplitWillOverwriteContent);
    });

    test("Will overwrite content with force", async () => {
      await setGrid(model, { A1: "Hello there", B1: "Hi!" });
      const result = await splitTextToColumns(model, " ", "A1", { force: true });
      expect(result).toBeSuccessfullyDispatched();
    });

    test("Will overwrite content in merge with force", async () => {
      await merge(model, "B1:C2");
      await setGrid(model, { A1: "Hello there", B1: "merged" });
      const result = await splitTextToColumns(model, " ", "A1", { force: true });
      expect(result).toBeSuccessfullyDispatched();
    });
  });

  test("Split a text into columns", async () => {
    await setCellContent(model, "A1", "Hello there");
    await splitTextToColumns(model, " ", "A1");
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there" });
  });

  test("Multi-character separator", async () => {
    await setCellContent(model, "A1", "Hello there");
    await splitTextToColumns(model, "th", "A1");
    expect(getGrid(model)).toEqual({ A1: "Hello ", B1: "ere" });
  });

  test("Split a formula into columns", async () => {
    await setCellContent(model, "A1", '=CONCAT("Hello ", "there")');
    await splitTextToColumns(model, " ", "A1");
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there" });
  });

  test("Split a formatted value into columns", async () => {
    await setCellContent(model, "A1", "0");
    await setCellFormat(model, "A1", "m/d/yyyy hh:mm:ss");
    expect(getCellContent(model, "A1")).toBe("12/30/1899 00:00:00");
    await splitTextToColumns(model, "/", "A1");
    expect(getGrid(model)).toEqual({ A1: 12, B1: 30, C1: "1899 00:00:00" });
    expect(getGridFormat(model)).toMatchObject({ A1: undefined, B1: undefined, C1: undefined });
  });

  test("Split don't overwrite values with trailing empty content", async () => {
    await setGrid(model, { A1: "a,b,,,", C1: "C1" });
    await splitTextToColumns(model, ",", "A1", { force: true });
    expect(getGrid(model)).toEqual({ A1: "a", B1: "b", C1: "C1" });
  });

  test("Localized split values are handled", async () => {
    await updateLocale(model, {
      ...DEFAULT_LOCALE,
      decimalSeparator: ",",
      formulaArgSeparator: ";",
      thousandsSeparator: " ",
    });
    await setGrid(model, { A1: "5,6||=SUM(5; 1,6)" });
    await splitTextToColumns(model, "||", "A1");
    expect(getGrid(model)).toEqual({ A1: 5.6, B1: 6.6 });
  });

  test("Split cell with only separators", async () => {
    await setGrid(model, { A1: ",,,,", C1: "C1" });
    await splitTextToColumns(model, ",", "A1", { force: true });
    expect(getGrid(model)).toEqual({ A1: undefined, C1: "C1" });
  });

  test("Split multiple rows", async () => {
    await setGrid(model, { A1: "Hello there", A2: "General Kenobi" });
    await splitTextToColumns(model, " ", "A1:A2");
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there", A2: "General", B2: "Kenobi" });
  });

  test("Splitted cell style is propagated", async () => {
    await setGrid(model, { A1: "Hello there", A2: "General Kenobi" });
    await setGridStyle(model, { A1: { bold: true }, A2: { italic: true } });
    await splitTextToColumns(model, " ", "A1:A2");
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there", A2: "General", B2: "Kenobi" });
    expect(getGridStyle(model)).toEqual({
      A1: { bold: true },
      B1: { bold: true },
      A2: { italic: true },
      B2: { italic: true },
    });
  });

  test("Style of overwritten cell is overwritten too", async () => {
    await setGrid(model, { A1: "a b", A2: "c d", B1: "overwritten", B2: "overwritten" });
    await setGridStyle(model, {
      A2: { italic: true },
      B1: { bold: true },
      B2: { bold: true },
    });

    await splitTextToColumns(model, " ", "A1:A2", { force: true });
    expect(getGrid(model)).toEqual({ A1: "a", B1: "b", A2: "c", B2: "d" });
    expect(getGridStyle(model)).toEqual({
      A1: {},
      B1: {},
      A2: { italic: true },
      B2: { italic: true },
    });
  });

  test("Add new columns to the sheet if there is not enough of them", async () => {
    expect(model.getters.getNumberCols(sheetId)).toBe(10);
    await setGrid(model, { J1: "Hello there; General", J2: "Hi!" });
    await splitTextToColumns(model, " ", "J1:J2");
    expect(model.getters.getNumberCols(sheetId)).toBe(12);
    expect(getGrid(model)).toEqual({ J1: "Hello", K1: "there;", L1: "General", J2: "Hi!" });
  });

  test("Overwrite other cells if forced", async () => {
    await setGrid(model, { A1: "Hello there", B1: "Hi!" });
    await splitTextToColumns(model, " ", "A1", { force: true });
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there" });
  });

  test("Add new columns to avoid collisions", async () => {
    expect(model.getters.getNumberCols(sheetId)).toBe(10);
    await setGrid(model, { A1: "Hello there", B1: "Hi!" });
    await splitTextToColumns(model, " ", "A1", { addNewColumns: true });
    expect(model.getters.getNumberCols(sheetId)).toBe(11);
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there", C1: "Hi!" });
  });

  test("Collision computation with multiple rows", async () => {
    expect(model.getters.getNumberCols(sheetId)).toBe(10);
    // prettier-ignore
    await setGrid(model, {
      A1: "Hello there",        B1: "B1",
      A2: "Hi! This is longer", B2 : undefined, C2: "C2"
    });

    await splitTextToColumns(model, " ", "A1:A2", { addNewColumns: true });
    expect(model.getters.getNumberCols(sheetId)).toBe(12);
    // prettier-ignore
    expect(getGrid(model)).toEqual({
      A1: "Hello", B1: "there", C1: undefined, D1: "B1",
      A2: "Hi!",   B2: "This",  C2: "is",      D2: "longer", E2: "C2",
    });
  });

  test("Empty merges are removed when splitting cell into columns", async () => {
    await merge(model, "B1:C2");
    await setCellContent(model, "A1", "Hello there");
    await splitTextToColumns(model, " ", "A1");
    expect(model.getters.getMerges(sheetId)).toEqual([]);
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there" });
  });

  test("Non-empty merges are removed when splitting cell into columns with force", async () => {
    await merge(model, "B1:C2");
    await setCellContent(model, "B1", "merged");
    await setCellContent(model, "A1", "Hello there");
    await splitTextToColumns(model, " ", "A1", { force: true });
    expect(model.getters.getMerges(sheetId)).toEqual([]);
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there" });
  });

  test("Can add new columns to not overwrite merge with content", async () => {
    await merge(model, "B1:C2");
    await setCellContent(model, "B1", "merged");
    await setCellContent(model, "A1", "Hello there");
    await splitTextToColumns(model, " ", "A1", { addNewColumns: true });
    expect(model.getters.getNumberCols(sheetId)).toBe(11);
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there", C1: "merged" });
    expect(model.getters.getMerges(sheetId)).toMatchObject([toZone("C1:D2")]);
  });

  test("Can undo/redo split into columns", async () => {
    await setCellContent(model, "A1", "Hello there");
    await splitTextToColumns(model, " ", "A1");
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there" });
    await undo(model);
    expect(getGrid(model)).toEqual({ A1: "Hello there" });
    await redo(model);
    expect(getGrid(model)).toEqual({ A1: "Hello", B1: "there" });
  });

  test.each([
    ["hello there", " "],
    ["hello,there", ","],
    ["hello.there", "."],
    ["hello\nthere", "\n"],
    ["hello;there", ";"],

    // Priority : \n > ; > , > space > .
    ["hello;,\n .there", "\n"],
    ["hello;, .there", ";"],
    ["hello, .there", ","],
    ["hello .there", " "],
  ])(
    "Automatic separator detection value %s %s",
    async (cellContent: string, expectedSeparator: string) => {
      await setSelection(model, ["A1"]);
      await setCellContent(model, "A1", cellContent);
      expect(model.getters.getAutomaticSeparator()).toEqual(expectedSeparator);
    }
  );

  test("Automatic separator detection works if first cell in the selection is empty or don't have a separator", async () => {
    await setSelection(model, ["A1:A3"]);
    await setCellContent(model, "A2", "singleWordWithoutSeparator");
    await setCellContent(model, "A3", "hello;there");
    expect(model.getters.getAutomaticSeparator()).toEqual(";");
  });
});
