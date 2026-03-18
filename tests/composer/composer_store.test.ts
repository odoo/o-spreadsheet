import { Model } from "@odoo/o-spreadsheet-engine/model";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import {
  colors,
  DateTime,
  getCanonicalSymbolName,
  jsDateToRoundNumber,
  toXC,
  toZone,
} from "../../src/helpers";
import { DependencyContainer, Store } from "../../src/store_engine";
import { HighlightStore } from "../../src/stores/highlight_store";
import { NotificationStore } from "../../src/stores/notification_store";
import { CellValueType, DEFAULT_LOCALE } from "../../src/types";
import {
  activateSheet,
  addCellToSelection,
  copy,
  createSheet,
  createSheetWithName,
  deleteContent,
  merge,
  moveAnchorCell,
  paste,
  redo,
  renameSheet,
  resizeAnchorZone,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setCellFormat,
  setFormat,
  setFormatting,
  setSelection,
  undo,
  updateLocale,
} from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import {
  getActivePosition,
  getCell,
  getCellContent,
  getCellRawContent,
  getCellText,
  getEvaluatedCell,
} from "../test_helpers/getters_helpers"; // to have getcontext mocks
import "../test_helpers/helpers";
import { flattenHighlightRange } from "../test_helpers/helpers";
import { makeStore, makeStoreWithModel } from "../test_helpers/stores";

let model: Model;
let composerStore: Store<CellComposerStore>;
let container: DependencyContainer;

beforeEach(async () => {
  ({ model, container, store: composerStore } = await makeStore(CellComposerStore));
});

async function editCell(model: Model, xc: string, content: string) {
  await selectCell(model, xc);
  composerStore.startEdition(content);
  composerStore.stopEdition();
}

describe("edition", () => {
  test("adding and removing a cell (by setting its content to empty string", () => {
    const sheetId = model.getters.getActiveSheetId();
    // adding
    composerStore.startEdition("a");
    composerStore.stopEdition();
    expect(model.getters.getEvaluatedCells(sheetId)).toHaveLength(1);
    expect(getCellContent(model, "A1")).toBe("a");

    // removing
    composerStore.startEdition();
    composerStore.setCurrentContent("");
    composerStore.stopEdition();
    expect(model.getters.getEvaluatedCells(sheetId)).toEqual([]);
  });

  test("deleting a cell with style does not remove it", async () => {
    await setCellContent(model, "A2", "a2");
    await setFormatting(model, "A2", { fillColor: "red" });

    // removing
    expect(getCellContent(model, "A2")).toBe("a2");
    await deleteContent(model, ["A2"]);
    expect(getCell(model, "A2")).toBeTruthy();
    expect(getCellContent(model, "A2")).toBe("");
  });

  test("editing a cell, then activating a new sheet: edition should be stopped when editing text", async () => {
    composerStore.startEdition("a");
    expect(composerStore.editionMode).toBe("editing");
    await createSheet(model, { activate: true, sheetId: "42" });
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("editing a cell, then activating a new sheet: edition should not be stopped when editing formula", async () => {
    composerStore.startEdition("=A1");
    expect(composerStore.editionMode).toBe("editing");
    await createSheet(model, { activate: true, sheetId: "42" });
    expect(composerStore.editionMode).not.toBe("inactive");
  });

  test("editing a cell, start a composer selection, then activating a new sheet: mode should still be 'waitingForRangeSelection'", async () => {
    const sheet1 = model.getters.getSheetIds()[0];
    composerStore.startEdition("=");
    expect(composerStore.editionMode).toBe("selecting");
    expect(composerStore.currentEditedCell.sheetId).toBe(sheet1);
    await createSheet(model, { activate: true, sheetId: "42" });
    expect(composerStore.editionMode).toBe("selecting");
    expect(composerStore.currentEditedCell.sheetId).toBe(sheet1);
    composerStore.stopEdition();
    expect(model.getters.getActiveSheetId()).toBe(sheet1);
    expect(getCellText(model, "A1")).toBe("=");
    await activateSheet(model, "42");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("ignore stopping composer selection if not selecting", () => {
    expect(composerStore.editionMode).toBe("inactive");
    composerStore.stopComposerRangeSelection();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("should keep edition mode inactive when selection changes while composer is inactive", () => {
    expect(composerStore.editionMode).toBe("inactive");
    composerStore.changeComposerCursorSelection(0, 0);
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("should switch to editing mode when composer cursor selection changes", () => {
    composerStore.startEdition("=sum(");
    expect(composerStore.editionMode).toBe("selecting");
    composerStore.changeComposerCursorSelection(0, 5);
    expect(composerStore.editionMode).toBe("editing");
  });

  test("Stopping the edition should complete the missing parenthesis of a formula", async () => {
    composerStore.startEdition("=sum(sum(1,2");
    composerStore.stopEdition();
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test("Stopping the edition should complete the missing bracket of a formula", async () => {
    composerStore.startEdition("={1,2");
    composerStore.stopEdition();
    expect(getCellText(model, "A1")).toBe("={1,2}");
  });
  test("Stopping the edition should complete the missing bracket then parenthesis of a formula", async () => {
    composerStore.startEdition("=SUM(1,2,{3,4");
    composerStore.stopEdition();
    expect(getCellText(model, "A1")).toBe("=SUM(1,2,{3,4})");
  });

  test("Stopping the edition should complete the missing parenthesis then bracket of a formula", async () => {
    composerStore.startEdition("={1,2,SUM(3,4");
    composerStore.stopEdition();
    expect(getCellText(model, "A1")).toBe("={1,2,SUM(3,4)}");
  });

  test("Stopping the edition should not complete parenthesis in a string", async () => {
    composerStore.startEdition('=sum("((((((((")');
    composerStore.stopEdition();
    expect(getCellText(model, "A1")).toBe('=sum("((((((((")');
  });

  test("Composer preserves manually typed array literals", () => {
    composerStore.startEdition("={1,2}");
    composerStore.stopEdition();
    expect(getCellRawContent(model, "A1")).toBe("={1,2}");
  });

  test("select cells in another sheet", async () => {
    const sheet2 = "42";
    await createSheet(model, { sheetId: sheet2 });
    composerStore.startEdition("=SUM(");
    await selectCell(model, "A4");
    expect(composerStore.currentContent).toBe("=SUM(A4");
    await activateSheet(model, sheet2);
    await addCellToSelection(model, "B3");
    expect(composerStore.currentContent).toBe("=SUM(A4,Sheet2!B3");
    await resizeAnchorZone(model, "right");
    expect(composerStore.currentContent).toBe("=SUM(A4,Sheet2!B3:C3");
  });

  test("Composer has the content with the updated sheet name", async () => {
    const name = "NEW_NAME";
    const sheet2 = "42";
    await createSheetWithName(model, { sheetId: sheet2 }, name);
    await setCellContent(model, "A1", "=NEW_NAME!A1");
    await setCellContent(model, "A1", "24", sheet2);
    const nextName = "NEXT NAME";
    await renameSheet(model, sheet2, nextName);
    composerStore.startEdition();
    expect(getCellText(model, "A1")).toBe("='NEXT NAME'!A1");
    expect(composerStore.currentContent).toBe("='NEXT NAME'!A1");
  });

  test("setting content sets selection at the end by default", () => {
    expect(composerStore.composerSelection).toEqual({
      start: 0,
      end: 0,
    });
    composerStore.setCurrentContent("hello");
    expect(composerStore.composerSelection).toEqual({
      start: 5,
      end: 5,
    });
  });

  test("setting content with selection", () => {
    expect(composerStore.composerSelection).toEqual({
      start: 0,
      end: 0,
    });
    composerStore.setCurrentContent("hello", { start: 2, end: 4 });
    expect(composerStore.composerSelection).toEqual({
      start: 2,
      end: 4,
    });
  });

  test("Allow setting content with right-to-left selection", () => {
    expect(composerStore.composerSelection).toEqual({ start: 0, end: 0 });
    composerStore.setCurrentContent("hello", { start: 4, end: 0 });
    expect(composerStore.composerSelection).toEqual({ start: 4, end: 0 });
  });

  test("setting content with wrong selection", () => {
    expect(composerStore.composerSelection).toEqual({
      start: 0,
      end: 0,
    });
    composerStore.setCurrentContent("hello", { start: 1, end: 6 });
    expect(composerStore.composerSelection).not.toEqual({ start: 1, end: 6 });
  });

  test("dont show selection indicator after percent operator", () => {
    composerStore.startEdition("=5%");
    expect(composerStore.showSelectionIndicator).toBe(false);
  });

  test("typing percent operator dont show selection indicator", () => {
    composerStore.startEdition("=5");
    composerStore.setCurrentContent("5%", { start: 2, end: 2 });
    expect(composerStore.showSelectionIndicator).toBe(false);
  });

  test("change selection", () => {
    expect(composerStore.composerSelection).toEqual({
      start: 0,
      end: 0,
    });
    composerStore.setCurrentContent("hello");
    composerStore.changeComposerCursorSelection(1, 2);
    expect(composerStore.composerSelection).toEqual({
      start: 1,
      end: 2,
    });
  });

  test("Allow setting right-to-left selection", () => {
    composerStore.setCurrentContent("hello");
    composerStore.changeComposerCursorSelection(2, 1);
    expect(composerStore.composerSelection).toEqual({ start: 2, end: 1 });
  });

  test("setting selection out of content is invalid", () => {
    expect(composerStore.currentContent).toHaveLength(0);
    composerStore.changeComposerCursorSelection(1, 2);
    expect(composerStore.composerSelection).not.toEqual({ start: 1, end: 2 });
  });

  test("ranges are highlighted", () => {
    composerStore.startEdition("=SUM(A2:A3, B5)");
    expect(composerStore.highlights.map((h) => h.range.zone)).toEqual([
      toZone("A2:A3"),
      toZone("B5"),
    ]);

    composerStore.setCurrentContent("=SUM(B2:B3, C5, B2:B)");
    expect(composerStore.highlights.map((h) => h.range.zone)).toEqual([
      toZone("B2:B3"),
      toZone("C5"),
      model.getters.getRangeFromSheetXC(model.getters.getActiveSheetId(), "B2:B").zone,
    ]);
  });

  test("different ranges have different colors", () => {
    composerStore.startEdition("=SUM(A2:A3, B5)");
    const [firstColor, secondColor] = composerStore.highlights.map((h) => h.color);
    expect(firstColor).not.toBe(secondColor);
  });

  test("same ranges have same colors", () => {
    composerStore.startEdition("=SUM(B5, B5)");
    const [firstColor, secondColor] = composerStore.highlights.map((h) => h.color);
    expect(firstColor).toBe(secondColor);
  });

  test("remove a range does not change colors of the next ranges", () => {
    composerStore.startEdition("=SUM(A2, B5)");
    let rangesColor = composerStore.highlights.map((h) => h.color);
    const colorB5 = rangesColor[1];

    composerStore.setCurrentContent("=SUM(B5)");
    rangesColor = composerStore.highlights.map((h) => h.color);
    expect(colorB5).toBe(rangesColor[0]);
  });

  test("add a range does not change colors of the next ranges", () => {
    composerStore.startEdition("=SUM(B5)");
    let rangesColor = composerStore.highlights.map((h) => h.color);
    const colorB5 = rangesColor[0];

    composerStore.setCurrentContent("=SUM(A2, B5)");
    rangesColor = composerStore.highlights.map((h) => h.color);
    expect(colorB5).toBe(rangesColor[1]);
  });

  test("stop edition removes highlighted zones", () => {
    composerStore.startEdition("=SUM(A2:A3, B5)");
    expect(composerStore.highlights).toHaveLength(2);
    composerStore.stopEdition();
    expect(composerStore.highlights).toHaveLength(0);
  });

  test("cancel edition reset current content", () => {
    composerStore.startEdition("=SUM(A2:A3, B5)");
    composerStore.cancelEdition();
    expect(composerStore.currentContent).toBe("");
  });

  test("cancel edition with initial content in a selecting position", async () => {
    await setCellContent(model, "A1", "=A12+");
    composerStore.startEdition();
    expect(composerStore.editionMode).toBe("selecting");
    composerStore.cancelEdition();
    expect(composerStore.currentContent).toBe("=A12+");
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("ranges are not highlighted when inactive", () => {
    expect(composerStore.editionMode).toBe("inactive");
    composerStore.setCurrentContent("=SUM(B2:B3, C5)");
    expect(composerStore.highlights).toHaveLength(0);
  });

  test("replace selection with smaller text", () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("12345");
    composerStore.changeComposerCursorSelection(2, 4);
    composerStore.replaceComposerCursorSelection("A");
    expect(composerStore.currentContent).toBe("12A5");
    expect(composerStore.composerSelection).toEqual({
      start: 3,
      end: 3,
    });
  });

  test("replace selection with longer text", () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("12345");
    composerStore.changeComposerCursorSelection(2, 4);
    composerStore.replaceComposerCursorSelection("ABCDE");
    expect(composerStore.currentContent).toBe("12ABCDE5");
    expect(composerStore.composerSelection).toEqual({
      start: 7,
      end: 7,
    });
  });

  test("only references in formulas are highlighted", () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("C7");
    expect(composerStore.highlights).toHaveLength(0);
    composerStore.setCurrentContent("A2:A5");
    expect(composerStore.highlights).toHaveLength(0);
  });

  test("selecting insert range in selecting mode", async () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("=");

    await setSelection(model, ["A1:A3"]);
    expect(composerStore.currentContent).toBe("=A1:A3");

    await selectCell(model, "A1");
    expect(composerStore.currentContent).toBe("=A1");
    await moveAnchorCell(model, "down");
    await moveAnchorCell(model, "right");
    expect(composerStore.currentContent).toBe("=B2");
    await resizeAnchorZone(model, "down");
    await resizeAnchorZone(model, "right");
    expect(composerStore.currentContent).toBe("=B2:C3");
  });

  test("selection expansion should add multiple cells references", async () => {
    await selectCell(model, "C3");
    composerStore.startEdition("=SUM(");

    await addCellToSelection(model, "D4");
    expect(composerStore.currentContent).toBe("=SUM(D4");
    await addCellToSelection(model, "E5");
    expect(composerStore.currentContent).toBe("=SUM(D4,E5");
  });

  test("alter selection during selection expansion updates the last reference", async () => {
    await selectCell(model, "C3");
    composerStore.startEdition("=SUM(");
    await addCellToSelection(model, "D4");
    expect(composerStore.currentContent).toBe("=SUM(D4");
    await addCellToSelection(model, "E5");
    expect(composerStore.currentContent).toBe("=SUM(D4,E5");
    await resizeAnchorZone(model, "down");
    expect(composerStore.currentContent).toBe("=SUM(D4,E5:E6");
  });

  test("new selection should only affect the last selection", async () => {
    await selectCell(model, "C3");
    composerStore.startEdition("=SUM(");

    await addCellToSelection(model, "D4");
    await addCellToSelection(model, "E5");
    await resizeAnchorZone(model, "down");

    expect(composerStore.currentContent).toBe("=SUM(D4,E5:E6");
    await selectCell(model, "F6");
    expect(composerStore.currentContent).toBe("=SUM(D4,F6");
  });

  test("start edition without selection set cursor at the end", () => {
    composerStore.startEdition("coucou");
    expect(composerStore.composerSelection).toEqual({ start: 6, end: 6 });
  });

  test("start edition with a provided selection", () => {
    composerStore.startEdition("coucou", { start: 4, end: 5 });
    expect(composerStore.composerSelection).toEqual({ start: 4, end: 5 });
  });

  test("Allow start edition with a right-to-left selection", () => {
    composerStore.startEdition("coucou", { start: 5, end: 1 });
    expect(composerStore.composerSelection).toEqual({ start: 5, end: 1 });
    expect(composerStore.currentContent).toBe("coucou");
  });

  test("set value of the active cell updates the content", async () => {
    expect(getActivePosition(model)).toBe("A1");
    await setCellContent(model, "A1", "Hello sir");
    expect(composerStore.currentContent).toBe("Hello sir");
  });

  test("set value of the active cell when switching sheet", async () => {
    const sheet1Id = model.getters.getActiveSheetId();
    await setCellContent(model, "A1", "Hello from sheet1");
    await createSheet(model, { sheetId: "42", activate: true });
    expect(composerStore.currentContent).toBe("");
    await activateSheet(model, sheet1Id);
    expect(composerStore.currentContent).toBe("Hello from sheet1");
  });

  test("select another cell which is empty set the content to an empty string", async () => {
    await setCellContent(model, "A1", "Hello sir");
    expect(composerStore.currentContent).toBe("Hello sir");
    expect(getCell(model, "A2")).toBeUndefined();
    await selectCell(model, "A2");
    expect(composerStore.currentContent).toBe("");
  });

  test("extend selection sets the range in composer", async () => {
    await selectCell(model, "C3");

    composerStore.startEdition("=");
    await selectCell(model, "D4");

    await setAnchorCorner(model, "E5");

    expect(composerStore.currentContent).toBe("=D4:E5");
  });

  test("alter selection updates composer content", async () => {
    await selectCell(model, "A1");

    composerStore.startEdition("=");
    await selectCell(model, "D4");
    expect(composerStore.currentContent).toBe("=D4");
    await resizeAnchorZone(model, "down");
    expect(composerStore.currentContent).toBe("=D4:D5");
    await resizeAnchorZone(model, "up");
    expect(composerStore.currentContent).toBe("=D4");
  });

  test("alter selection updates composer content when selecting a spilled range", async () => {
    await setCellContent(model, "A1", "=SEQUENCE(2, 2)");

    await selectCell(model, "C1");
    composerStore.startEdition("=");

    await selectCell(model, "A1");
    expect(composerStore.currentContent).toBe("=A1");
    await resizeAnchorZone(model, "down");
    await resizeAnchorZone(model, "right");
    expect(composerStore.currentContent).toBe("=A1#");
  });

  test("remove the spilled range operator after selecting simple range", async () => {
    await setCellContent(model, "A1", "=SEQUENCE(2, 2)");

    await selectCell(model, "C1");
    composerStore.startEdition("=");
    await selectCell(model, "A1");
    await setAnchorCorner(model, "B2");

    expect(composerStore.currentContent).toBe("=A1#");
    await resizeAnchorZone(model, "left");
    expect(composerStore.currentContent).toBe("=A1:A2");
  });

  test("enable selection mode reset to initial position only when selecting on the edition sheet", async () => {
    await selectCell(model, "D3");
    composerStore.startEdition("=");
    await moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=D4");
    composerStore.stopComposerRangeSelection();
    composerStore.setCurrentContent("=D4+");
    await moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=D4+D4");
    composerStore.stopEdition();
    await selectCell(model, "D3");
    await createSheet(model, { sheetId: "sheet2" });
    composerStore.startEdition("=");
    await activateSheet(model, "sheet2");
    expect(model.getters.getSelectedZone()).toStrictEqual(toZone("A1"));
    await moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=Sheet2!A2");
    composerStore.stopComposerRangeSelection();
    composerStore.setCurrentContent("=Sheet2!A2+");
    await moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=Sheet2!A2+Sheet2!A3");
  });

  test("When changing sheet, composer selection is reset if there's no saved selection for activated sheet", async () => {
    await createSheet(model, { sheetId: "42", name: "Sheet2" });
    await selectCell(model, "D3");
    composerStore.startEdition("=");
    await moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=D4");
    await activateSheet(model, "42");
    await moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toEqual("=Sheet2!A2");
    await activateSheet(model, "42");
    await moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toEqual("=Sheet2!A3");
  });

  test("When changing sheet, composer selection will be set to saved selection (if any) of activated sheet", async () => {
    await createSheet(model, { sheetId: "42", name: "Sheet2" });
    const sheet1 = model.getters.getSheetIds()[0];
    const sheet2 = model.getters.getSheetIds()[1];
    await selectCell(model, "B2"); // Sheet1!B2
    await activateSheet(model, sheet2);
    await selectCell(model, "D3"); // Sheet2!D3
    await activateSheet(model, sheet1);
    composerStore.startEdition("=");
    await activateSheet(model, sheet2);
    await moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toEqual("=Sheet2!D4");
  });

  test("select an empty cell, start selecting mode at the composer position", async () => {
    expect(getCell(model, "A2")).toBeUndefined();
    await selectCell(model, "A2");
    composerStore.startEdition("=");
    await moveAnchorCell(model, "right");
    expect(composerStore.currentContent).toBe("=B2");
  });

  test("content is the raw cell content, not the evaluated text", async () => {
    await setCellContent(model, "A1", "=SUM(5)");
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe("=SUM(5)");
  });

  test("default active cell content when model is started", async () => {
    await setCellContent(model, "A1", "Hello");
    expect(composerStore.currentContent).toBe("Hello");
  });

  test("Paste a cell updates the topbar composer", async () => {
    await setCellContent(model, "A1", "Hello");
    await copy(model, "A1");
    await selectCell(model, "B1");
    await paste(model, "B1");
    expect(composerStore.currentContent).toBe("Hello");
  });

  test("content is updated if cell content is updated", async () => {
    await setCellContent(model, "B1", "Hello");
    await selectCell(model, "B1");
    expect(composerStore.currentContent).toBe("Hello");
    await setCellContent(model, "C1", "update another cell");
    expect(composerStore.currentContent).toBe("Hello");
    await setCellContent(model, "B1", "Hi");
    expect(composerStore.currentContent).toBe("Hi");
    await setCellContent(model, "B1", "");
    expect(composerStore.currentContent).toBe("");
  });

  test("Setting a partial reference as content should not throw an error", () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("=Sheet1");
    composerStore.stopEdition();
    expect(composerStore.currentContent).toBe("=Sheet1");
  });

  test("start editing where theres a merge on other sheet, change sheet, and stop edition", async () => {
    const sheetId1 = model.getters.getActiveSheetId();
    const sheetId2 = "42";
    await merge(model, "A1:D5");
    await createSheet(model, { sheetId: sheetId2, activate: true });
    await selectCell(model, "C3");
    composerStore.startEdition("=");
    await activateSheet(model, sheetId1);
    composerStore.stopEdition();
    expect(getCellText(model, "C3", sheetId2)).toBe("=");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("leading single quote is not removed when editing a cell with text format", async () => {
    await setCellContent(model, "A1", "'123");
    expect(getCellText(model, "A1")).toBe("123");
    expect(composerStore.currentContent).toBe("'123");
  });

  test("type a number in a cell with a percentage", async () => {
    await setCellContent(model, "A1", "2%");
    composerStore.startEdition("1");
    expect(composerStore.currentContent).toBe("1%");
    expect(composerStore.composerSelection).toEqual({ start: 1, end: 1 });
  });

  test("type a string in a cell with a percentage", async () => {
    await setCellContent(model, "A1", "2%");
    composerStore.startEdition("a");
    expect(composerStore.currentContent).toBe("a");
    expect(composerStore.composerSelection).toEqual({ start: 1, end: 1 });
  });

  test("type a number in percent formatted empty cell", async () => {
    await setFormat(model, "A1", "0.00%");
    composerStore.startEdition("12");
    expect(composerStore.currentContent).toBe("12%");
    expect(composerStore.composerSelection).toEqual({ start: 2, end: 2 });
  });

  test.each(["2%", "20.1%", "20.000001%"])(
    "display percentages as percentages in composer",
    async (content) => {
      await setCellContent(model, "A1", content);
      composerStore.startEdition();
      expect(composerStore.currentContent).toBe(content);
      const cursor = content.length;
      expect(composerStore.composerSelection).toEqual({ start: cursor, end: cursor });
    }
  );

  test("remove percentage trailing zeros in composer", async () => {
    await setCellContent(model, "A1", "2.0%");
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe("2%");
    expect(composerStore.composerSelection).toEqual({ start: 2, end: 2 });
    await setCellContent(model, "A1", "2.10%");
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe("2.1%");
    expect(composerStore.composerSelection).toEqual({ start: 4, end: 4 });
  });

  test("empty cell with percent format is displayed empty", async () => {
    await setFormat(model, "A1", "0.00%");
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe("");
    expect(composerStore.composerSelection).toEqual({ start: 0, end: 0 });
  });

  test("Numbers in the composer are displayed without default format", async () => {
    await setCellContent(model, "A1", "0.123456789123");
    await selectCell(model, "A1");
    expect(composerStore.currentContent).toBe("0.123456789123");
    await setCellFormat(model, "A1", "#,##0.00");
    expect(composerStore.currentContent).toBe("0.123456789123");
  });

  test("Numbers in the composer are displayed without number of digit format", async () => {
    await setCellContent(model, "A1", "0.123456789123");
    await setFormat(model, "A1", "#,##0.00");
    await selectCell(model, "A1");
    expect(composerStore.currentContent).toBe("0.123456789123");
  });

  test("Composer content for very large number don't user scientific notation", async () => {
    await setCellContent(model, "A1", "123456789123456789123456789");
    await selectCell(model, "A1");

    // replacing lest significant digits by zeroes is a JS limitation.
    expect(composerStore.currentContent).toBe("123456789123456790000000000");
  });

  test("set a number format on a date displays the raw number", async () => {
    await setCellContent(model, "A1", "2020/10/20");
    expect(composerStore.currentContent).toBe("2020/10/20");
    await setCellFormat(model, "A1", "#,##0.00");
    expect(composerStore.currentContent).toBe("44124");
  });

  test("set a date format on a number displays the date", async () => {
    await setCellContent(model, "A1", "42736");
    expect(composerStore.currentContent).toBe("42736");
    await setCellFormat(model, "A1", "mm/dd/yyyy");
    expect(composerStore.currentContent).toBe("01/01/2017");
  });

  test("set a number format on a time displays the number", async () => {
    await setCellContent(model, "A1", "12:00:00 AM");
    expect(composerStore.currentContent).toBe("12:00:00 AM");
    await setCellFormat(model, "A1", "#,##0.00");
    expect(composerStore.currentContent).toBe("0");
  });

  test("set a time format on a number displays the time", async () => {
    await setCellContent(model, "A1", "1");
    expect(composerStore.currentContent).toBe("1");
    await setCellFormat(model, "A1", "hh:mm:ss a");
    expect(composerStore.currentContent).toBe("12:00:00 AM");
  });

  test("non-parsable date format displays a simplified and parsable value", async () => {
    await setCellContent(model, "A1", "1");
    await setFormat(model, "A1", "dddd d mmmm yyyy");
    expect(getEvaluatedCell(model, "A1").formattedValue).toBe("Sunday 31 December 1899");
    expect(composerStore.currentContent).toBe("12/31/1899");
  });

  test("non-parsable date time format displays a simplified and parsable value", async () => {
    await setCellContent(model, "A1", "1.5");
    await setFormat(model, "A1", "dddd d mmmm yyyy hh:mm:ss a");
    expect(getEvaluatedCell(model, "A1").formattedValue).toBe(
      "Sunday 31 December 1899 12:00:00 PM"
    );
    expect(composerStore.currentContent).toBe("12/31/1899 12:00:00 PM");
  });

  test.each(["", "0%", "#,##0", "#,##0[$ THUNE ]"])(
    "Set Date to a cell formatted with format %s, format should be adapted",
    async (format: string) => {
      await setFormat(model, "A1", format);
      composerStore.startEdition();
      composerStore.setCurrentContent("12/12/2025");
      composerStore.stopEdition();
      expect(getEvaluatedCell(model, "A1").format).toBe("m/d/yyyy");
    }
  );

  test.each(["@", "d/m/yyyy"])(
    "Set date to a cell formatted with format %s, format should not be adapted",
    async (format: string) => {
      await setFormat(model, "A1", format);
      composerStore.startEdition();
      composerStore.setCurrentContent("12/12/2025");
      composerStore.stopEdition();
      expect(getEvaluatedCell(model, "A1").format).toBe(format);
    }
  );

  test("write too long formulas raises an error", async () => {
    const notificationStore = container.get(NotificationStore);
    const spyNotify = jest.spyOn(notificationStore, "raiseError");
    composerStore.startEdition();
    const content = "=" + "+1".repeat(500); // 1001 characters
    composerStore.setCurrentContent(content);
    composerStore.stopEdition();

    expect(spyNotify).toHaveBeenCalled();
  });

  test("start edition twice --> overwrites the contents of the first start edition", () => {
    composerStore.startEdition("=SUM(");
    expect(composerStore.currentContent).toBe("=SUM(");
    composerStore.startEdition("=DB(");
    expect(composerStore.currentContent).toBe("=DB(");
  });

  test("type '=', select twice a cell", async () => {
    composerStore.startEdition("=");
    await selectCell(model, "C8");
    await selectCell(model, "C8");
    expect(composerStore.currentContent).toBe("=C8");
  });

  test.each([
    ["Sheet2", "=Sheet2!C8"],
    ["Sheet 2", "='Sheet 2'!C8"],
  ])("type '=', select a cell in another sheet", async (sheetName, expectedContent) => {
    composerStore.startEdition("=");
    await createSheetWithName(model, { sheetId: "42", activate: true }, sheetName);
    await selectCell(model, "C8");
    expect(composerStore.currentContent).toBe(expectedContent);
  });

  test("type '=', select a cell in another sheet, select a cell in the active sheet", async () => {
    composerStore.startEdition("=");
    const sheetId = model.getters.getActiveSheetId();
    await createSheet(model, { sheetId: "42", activate: true });
    await selectCell(model, "C8");
    await activateSheet(model, sheetId);
    await selectCell(model, "C8");
    expect(composerStore.currentContent).toBe("=C8");
  });

  describe("Loop through reference combinations", () => {
    test("Loop references on cell symbol", async () => {
      composerStore.startEdition("=A1");
      composerStore.changeComposerCursorSelection(1, 1);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toBe("=$A$1");
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toBe("=A$1");
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toBe("=$A1");
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toBe("=A1");
    });

    test("Loop references on range symbol", async () => {
      composerStore.startEdition("=A1:B1");
      composerStore.changeComposerCursorSelection(1, 1);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=$A$1:$B$1");
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=A$1:B$1");
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=$A1:$B1");
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=A1:B1");
    });

    test("Loop references on mixed selection", async () => {
      composerStore.startEdition("=SUM(A1,34,42+3,B$1:C$2,$A1+B$2)");
      composerStore.changeComposerCursorSelection(0, 30);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=SUM($A$1,34,42+3,$B1:$C2,A1+$B2)");
    });

    test("Loop references on reference to another sheet", async () => {
      composerStore.startEdition("=SUM(s2!A1:B1, s2!$A$1)");
      composerStore.changeComposerCursorSelection(1, 20);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=SUM(s2!$A$1:$B$1, s2!A$1)");
    });

    test("Loop references on range with cell that have different fixed mode", async () => {
      composerStore.startEdition("=A$1:B2");
      composerStore.changeComposerCursorSelection(1, 1);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=$A1:$B$2");
    });

    test("Loop references set composer selection to entire cell symbol on which we loop", async () => {
      composerStore.startEdition("=AA1");
      composerStore.changeComposerCursorSelection(1, 2);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=$AA$1");
      expect(composerStore.composerSelection).toEqual({ start: 1, end: 6 });
    });

    test("Loop references set composer selection to entire range symbol on which we loop", async () => {
      composerStore.startEdition("=A1:B2");
      composerStore.changeComposerCursorSelection(1, 2);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=$A$1:$B$2");
      expect(composerStore.composerSelection).toEqual({ start: 1, end: 10 });
    });

    test("Loop references set selection from the first range/cell symbol to the last", async () => {
      composerStore.startEdition("=SUM(A1,34,42+3,B$1:C$2)");
      composerStore.changeComposerCursorSelection(0, 20);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=SUM($A$1,34,42+3,$B1:$C2)");
      expect(composerStore.composerSelection).toEqual({ start: 5, end: 25 });
    });

    test("Loop references changes adjacent references", async () => {
      composerStore.startEdition("=A1+A2");
      // cursor just before +
      composerStore.changeComposerCursorSelection(3, 6);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=$A$1+$A$2");
      expect(composerStore.composerSelection).toEqual({ start: 1, end: 10 });
    });

    test("Loop references only change selected elements", async () => {
      composerStore.startEdition("=A1+A2");
      // cursor just after +
      composerStore.changeComposerCursorSelection(4, 6);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=A1+$A$2");
      expect(composerStore.composerSelection).toEqual({ start: 4, end: 8 });
    });

    test("Loop references reduces selection to select references only", async () => {
      composerStore.startEdition("=SUM(A1+A2)+SUM(B1)");
      // selection in the middle of SUMs
      composerStore.changeComposerCursorSelection(6, 13);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=SUM($A$1+$A$2)+SUM(B1)");
      expect(composerStore.composerSelection).toEqual({ start: 5, end: 14 });
    });

    test("Loop references when no range is selected", async () => {
      composerStore.startEdition("=A1+1");
      composerStore.changeComposerCursorSelection(4, 5);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=A1+1");
      expect(composerStore.composerSelection).toEqual({ start: 4, end: 5 });
    });

    test("Loop references doesn't switch to 'selecting' edition mode", async () => {
      composerStore.startEdition("=SUM(A1,C2)");
      composerStore.changeComposerCursorSelection(0, 10);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=SUM($A$1,$C$2)");
      expect(composerStore.editionMode).toEqual("editing");
    });

    test("f4 put selection at the end of looped token when the original selection was of size 0", async () => {
      composerStore.startEdition("=A1");
      composerStore.changeComposerCursorSelection(1, 1);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=$A$1");
      expect(composerStore.composerSelection).toEqual({ start: 5, end: 5 });

      composerStore.cycleReferences();
      expect(composerStore.currentContent).toEqual("=A$1");
      expect(composerStore.composerSelection).toEqual({ start: 4, end: 4 });
    });
  });

  test("Setting the selection processor back to default properly stops the edition", () => {
    composerStore.startEdition('="test"');
    expect(composerStore.editionMode).toEqual("editing");
    expect(getCellRawContent(model, "A1")).toBeUndefined();

    model.selection.getBackToDefault();

    expect(composerStore.editionMode).toEqual("inactive");
    expect(getCellRawContent(model, "A1")).toEqual('="test"');
  });

  test.each(["sheet2", "sheet 2"])(
    "Loop references on references with sheet name",
    async (sheetName) => {
      await createSheet(model, { name: sheetName });
      const composerSheetName = getCanonicalSymbolName(sheetName);
      composerStore.startEdition(`=${composerSheetName}!A1`);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toBe(`=${composerSheetName}!$A$1`);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toBe(`=${composerSheetName}!A$1`);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toBe(`=${composerSheetName}!$A1`);
      composerStore.cycleReferences();
      expect(composerStore.currentContent).toBe(`=${composerSheetName}!A1`);
    }
  );

  describe("Localized numbers and formulas", () => {
    describe("Number litterals", () => {
      test("Decimal number detected with decimal separator of locale", async () => {
        await editCell(model, "A1", "3,14");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.text);
        expect(getEvaluatedCell(model, "A1").value).toBe("3,14");

        await updateLocale(model, FR_LOCALE);
        await editCell(model, "A2", "3,14");
        expect(getEvaluatedCell(model, "A2").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A2").value).toBe(3.14);
      });

      test("Decimal numbers with dots are still detected in other locales", async () => {
        // This is not a functional requirement but rather a limitation of the implementation.
        await updateLocale(model, FR_LOCALE);
        await editCell(model, "A1", "3.14");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").value).toBe(3.14);
      });

      test("Decimal separator with percent numbers", async () => {
        await updateLocale(model, FR_LOCALE);

        await editCell(model, "A1", "5,9%");
        expect(getEvaluatedCell(model, "A1").value).toBeCloseTo(0.059, 3);
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").formattedValue).toBe("5,90%");

        await editCell(model, "A2", ",9%");
        expect(getEvaluatedCell(model, "A2").value).toBeCloseTo(0.009, 3);
        expect(getEvaluatedCell(model, "A2").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A2").formattedValue).toBe("0,90%");
      });

      test("Decimal separator with currency numbers", async () => {
        await updateLocale(model, FR_LOCALE);

        await editCell(model, "A1", "$3,14");
        expect(getEvaluatedCell(model, "A1").value).toBeCloseTo(3.14, 2);
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").formattedValue).toBe("$3,14");

        await editCell(model, "A2", "3,14€");
        expect(getEvaluatedCell(model, "A2").value).toBeCloseTo(3.14, 2);
        expect(getEvaluatedCell(model, "A2").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A2").formattedValue).toBe("3,14€");
      });

      test("Decimal separator isn't replaced in non-number string", async () => {
        await updateLocale(model, FR_LOCALE);
        await editCell(model, "A1", "3,14");
        expect(getCellRawContent(model, "A1")).toBe("3.14");

        await editCell(model, "A2", "Olà 3,14 :)");
        expect(getCellRawContent(model, "A2")).toBe("Olà 3,14 :)");
      });
    });

    describe("Formulas", () => {
      test("Decimal number detected with decimal separator of locale", async () => {
        await editCell(model, "A1", "=3,14");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.error);

        await updateLocale(model, FR_LOCALE);
        await editCell(model, "A2", "=3,14");
        expect(getEvaluatedCell(model, "A2").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A2").value).toBe(3.14);
      });

      test("Decimal numbers with dots are still detected in other locales", async () => {
        // This is not a functional requirement but rather a limitation of the implementation.
        await updateLocale(model, FR_LOCALE);
        await editCell(model, "A1", "=3.14");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").value).toBe(3.14);
      });

      test("Function argument separator change with the locale", async () => {
        await editCell(model, "A1", "=SUM(B2,5)");
        expect(getEvaluatedCell(model, "A1").value).toBe(5);
        await editCell(model, "A1", "=SUM(B2;5)");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.error);

        await updateLocale(model, {
          ...DEFAULT_LOCALE,
          formulaArgSeparator: ";",
          decimalSeparator: ",",
          thousandsSeparator: " ",
        });
        await editCell(model, "A1", "=SUM(B2,5)");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.error);
        await editCell(model, "A1", "=SUM(B2;5)");
        expect(getEvaluatedCell(model, "A1").value).toBe(5);
      });

      test("Decimal numbers as function argument", async () => {
        await updateLocale(model, {
          ...DEFAULT_LOCALE,
          decimalSeparator: ",",
          formulaArgSeparator: ";",
          thousandsSeparator: " ",
        });
        await editCell(model, "A1", "=SUM(3,14; 5)");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").value).toBe(8.14);
      });

      test("Decimal numbers in strings aren't localized", async () => {
        await updateLocale(model, FR_LOCALE);
        await editCell(model, "A1", '="3,14"');
        expect(getCellRawContent(model, "A1")).toBe('="3,14"');
      });

      test("Can input localized date", async () => {
        await updateLocale(model, FR_LOCALE);
        await editCell(model, "A1", "30/01/2020");
        expect(getCell(model, "A1")?.format).toBe("dd/mm/yyyy");
        expect(getCellRawContent(model, "A1")).toBe(
          jsDateToRoundNumber(new DateTime(2020, 0, 30)).toString()
        );
      });

      test("Changing the locale after inputting a localized date does not change the date value", async () => {
        await updateLocale(model, FR_LOCALE);
        await editCell(model, "A1", "30/01/2020");
        expect(getCell(model, "A1")?.format).toBe("dd/mm/yyyy");
        expect(getEvaluatedCell(model, "A1").value).toBe(
          jsDateToRoundNumber(new DateTime(2020, 0, 30))
        );

        await updateLocale(model, DEFAULT_LOCALE);
        expect(getCell(model, "A1")?.format).toBe("m/d/yyyy");
        expect(getEvaluatedCell(model, "A1").value).toBe(
          jsDateToRoundNumber(new DateTime(2020, 0, 30))
        );
      });
    });
  });

  test("Adding a spreading formula at the bottom of the sheet add enough rows for the formula to spread", async () => {
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);

    const cellOnLastRow = toXC(0, numberOfRows - 1);
    await editCell(model, cellOnLastRow, "=TRANSPOSE(A1:E1)");

    expect(model.getters.getNumberRows(sheetId)).toBe(numberOfRows + 4 + 50);
    expect(getCellContent(model, cellOnLastRow)).toBe("0");
  });

  test("Adding a spreading formula at the right of the sheet add enough cols for the formula to spread", async () => {
    const sheetId = model.getters.getActiveSheetId();
    const numberOfCols = model.getters.getNumberCols(sheetId);

    const cellOnLastCol = toXC(numberOfCols - 1, 0);
    await editCell(model, cellOnLastCol, "=TRANSPOSE(A1:A5)");

    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCellContent(model, cellOnLastCol)).toBe("0");
  });

  describe("Row addition works with position dependant functions", () => {
    test("Adding rows below with ROW function", async () => {
      const sheetId = model.getters.getActiveSheetId();
      const numberOfRows = model.getters.getNumberRows(sheetId);

      const cellOnLastRow = toXC(0, numberOfRows - 1);
      await editCell(model, cellOnLastRow, "=MUNIT(ROW())");
      expect(model.getters.getNumberRows(sheetId)).toBe(numberOfRows * 2 + 50 - 1);
      expect(getCellContent(model, cellOnLastRow)).toBe("1");
    });

    test("Adding rows below with ROW function", async () => {
      const sheetId = model.getters.getActiveSheetId();
      const numberOfCols = model.getters.getNumberCols(sheetId);

      const cellOnLastCols = toXC(numberOfCols - 1, 0);
      await editCell(model, cellOnLastCols, "=MUNIT(COLUMN())");
      expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols * 2 + 20 - 1);
      expect(getCellContent(model, cellOnLastCols)).toBe("1");
    });
  });

  test("Can undo/redo after adding a spreading formula at the end of the sheet", async () => {
    const sheetId = model.getters.getActiveSheetId();
    const numberOfCols = model.getters.getNumberCols(sheetId);

    const cellOnLastCol = toXC(numberOfCols - 1, 0);
    await editCell(model, cellOnLastCol, "=TRANSPOSE(A1:A5)");

    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCellRawContent(model, cellOnLastCol)).toBe("=TRANSPOSE(A1:A5)");

    // A current unavoidable limitation is that we have multiple history steps (add cols + update cell)
    await undo(model);
    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCellContent(model, cellOnLastCol)).toBe("");

    await undo(model);
    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols);
    expect(getCellContent(model, cellOnLastCol)).toBe("");

    await redo(model);
    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCellContent(model, cellOnLastCol)).toBe("");

    await redo(model);
    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCellRawContent(model, cellOnLastCol)).toBe("=TRANSPOSE(A1:A5)");
  });

  test("Invalid references are filtered out from the highlights", () => {
    const fakeSheetName = "louloulou";
    composerStore.startEdition(`=${fakeSheetName}!A1+A2+ZZZZZZZZZ1000000`);
    const highlights = composerStore.highlights;
    expect(highlights).toHaveLength(1);
    expect(highlights[0].color).toEqual(colors[0]);
    expect(highlights[0].range.zone).toMatchObject(toZone("A2"));
  });

  test("References of non-active sheets are filtered out from the highlights", async () => {
    const secondSheetname = "louloulou";
    await createSheet(model, { name: secondSheetname, activate: false });
    composerStore.startEdition(`=${secondSheetname}!A1+A2+ZZZZZZZZZ1000000`);
    const gridHighlights = container.get(HighlightStore).highlights;
    expect(gridHighlights).toHaveLength(1);
    expect(flattenHighlightRange(gridHighlights[0])).toMatchObject({
      zone: toZone("A2"),
      color: colors[1],
    });
    const composerHighlights = composerStore.highlights;
    expect(composerHighlights).toHaveLength(2);
    expect(flattenHighlightRange(composerHighlights[0])).toMatchObject({
      zone: toZone("A1"),
      color: colors[0],
    });
    expect(flattenHighlightRange(composerHighlights[1])).toMatchObject({
      zone: toZone("A2"),
      color: colors[1],
    });
  });

  describe("Toggling edition", () => {
    test("toggling edition mode on a reference", () => {
      const { store } = makeStoreWithModel(model, CellComposerStore);
      store.startEdition("=A1+A2");
      expect(store.editionMode).toBe("editing");
      // select A1
      store.changeComposerCursorSelection(2, 2);
      store.toggleEditionMode();
      expect(store.editionMode).toBe("selecting");
      store.toggleEditionMode();
      expect(store.editionMode).toBe("editing");

      // select A2
      store.changeComposerCursorSelection(5, 5);
      store.toggleEditionMode();
      expect(store.editionMode).toBe("selecting");
    });

    test("toggling edition mode on a range moves the cursor to the end of the range", () => {
      const { store } = makeStoreWithModel(model, CellComposerStore);
      store.startEdition("=A1:B2");
      expect(store.editionMode).toBe("editing");
      store.changeComposerCursorSelection(2, 2);
      store.toggleEditionMode();
      expect(store.editionMode).toBe("selecting");
      store.stopComposerRangeSelection();
      expect(store.composerSelection).toEqual({ start: 6, end: 6 });
    });

    test("toggling edition mode on a string", () => {
      const { store } = makeStoreWithModel(model, CellComposerStore);
      store.startEdition("=sum(A1)");
      expect(store.editionMode).toBe("editing");
      store.toggleEditionMode();
      expect(store.editionMode).toBe("editing");
      store.changeComposerCursorSelection(2, 2);
      expect(store.tokenAtCursor?.value).toBe("sum");
      store.toggleEditionMode();
      expect(store.editionMode).toBe("editing");
    });

    test("toggling edition mode when inactive does nothing", () => {
      const { store } = makeStoreWithModel(model, CellComposerStore);
      expect(store.editionMode).toBe("inactive");
      store.toggleEditionMode();
      expect(store.editionMode).toBe("inactive");
    });
  });

  test("Prettify the content depending on the length of the formula", async () => {
    await setCellContent(
      model,
      "A1",
      "=SUM(11111111,22222222,33333333,44444444,55555555,66666666,77777777)"
    );
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe(
      "=SUM(11111111, 22222222, 33333333, 44444444, 55555555, 66666666, 77777777)"
    );

    await setCellContent(
      model,
      "A1",
      "=SUM(11111111,22222222,33333333,44444444,55555555,66666666,77777777,88888888)"
    );
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe(
      // prettier-ignore
      "=SUM(\n" +
      "\t11111111, \n" +
      "\t22222222, \n" +
      "\t33333333, \n" +
      "\t44444444, \n" +
      "\t55555555, \n" +
      "\t66666666, \n" +
      "\t77777777, \n" +
      "\t88888888\n" +
      ")"
    );
  });

  test("display as one-liner when inactive", async () => {
    const content = // prettier-ignore
      "=SUM(\n" +
      "\t11111111, \n" +
      "\t22222222, \n" +
      "\t33333333, \n" +
      "\t44444444, \n" +
      "\t55555555, \n" +
      "\t66666666, \n" +
      "\t77777777, \n" +
      "\t88888888\n" +
      ")";
    await setCellContent(model, "A1", content);
    expect(composerStore.currentContent).toBe(
      "=SUM(11111111, 22222222, 33333333, 44444444, 55555555, 66666666, 77777777, 88888888)"
    );
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe(content);
    composerStore.stopEdition();
    expect(composerStore.currentContent).toBe(
      "=SUM(11111111, 22222222, 33333333, 44444444, 55555555, 66666666, 77777777, 88888888)"
    );
  });
});
