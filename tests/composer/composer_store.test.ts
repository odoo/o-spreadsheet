import { ComposerStore } from "../../src/components/composer/composer/composer_store";
import {
  DateTime,
  colors,
  getCanonicalSheetName,
  jsDateToRoundNumber,
  toXC,
  toZone,
} from "../../src/helpers";
import { Model } from "../../src/model";
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
  merge,
  moveAnchorCell,
  paste,
  redo,
  renameSheet,
  resizeAnchorZone,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setFormat,
  setSelection,
  setStyle,
  undo,
  updateLocale,
} from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import {
  getActivePosition,
  getCell,
  getCellContent,
  getCellText,
  getEvaluatedCell,
} from "../test_helpers/getters_helpers"; // to have getcontext mocks
import "../test_helpers/helpers";
import { createModelFromGrid } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";
import { makeStore, makeStoreWithModel } from "../test_helpers/stores";

let model: Model;
let composerStore: Store<ComposerStore>;
let container: DependencyContainer;

beforeEach(() => {
  ({ model, container, store: composerStore } = makeStore(ComposerStore));
});

function editCell(model: Model, xc: string, content: string) {
  selectCell(model, xc);
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

  test("deleting a cell with style does not remove it", () => {
    setCellContent(model, "A2", "a2");
    setStyle(model, "A2", { fillColor: "red" });

    // removing
    expect(getCellContent(model, "A2")).toBe("a2");
    selectCell(model, "A2");
    model.dispatch("DELETE_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "A2")).toBeTruthy();
    expect(getCellContent(model, "A2")).toBe("");
  });

  test("editing a cell, then activating a new sheet: edition should be stopped when editing text", () => {
    composerStore.startEdition("a");
    expect(composerStore.editionMode).toBe("editing");
    createSheet(model, { activate: true, sheetId: "42" });
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("editing a cell, then activating a new sheet: edition should not be stopped when editing formula", () => {
    composerStore.startEdition("=A1");
    expect(composerStore.editionMode).toBe("editing");
    createSheet(model, { activate: true, sheetId: "42" });
    expect(composerStore.editionMode).not.toBe("inactive");
  });

  test("editing a cell, start a composer selection, then activating a new sheet: mode should still be 'waitingForRangeSelection'", () => {
    const sheet1 = model.getters.getSheetIds()[0];
    composerStore.startEdition("=");
    expect(composerStore.editionMode).toBe("selecting");
    expect(composerStore.currentEditedCell.sheetId).toBe(sheet1);
    createSheet(model, { activate: true, sheetId: "42" });
    expect(composerStore.editionMode).toBe("selecting");
    expect(composerStore.currentEditedCell.sheetId).toBe(sheet1);
    composerStore.stopEdition();
    expect(model.getters.getActiveSheetId()).toBe(sheet1);
    expect(getCellText(model, "A1")).toBe("=");
    activateSheet(model, "42");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("ignore stopping composer selection if not selecting", () => {
    expect(composerStore.editionMode).toBe("inactive");
    composerStore.stopComposerRangeSelection();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Stopping the edition should complete the missing parenthesis of a formula", async () => {
    composerStore.startEdition("=sum(sum(1,2");
    composerStore.stopEdition();
    expect(getCellText(model, "A1")).toBe("=sum(sum(1,2))");
  });

  test("Stopping the edition should not complete parenthesis in a string", async () => {
    composerStore.startEdition('=sum("((((((((")');
    composerStore.stopEdition();
    expect(getCellText(model, "A1")).toBe('=sum("((((((((")');
  });

  test("select cells in another sheet", () => {
    const sheet2 = "42";
    createSheet(model, { sheetId: sheet2 });
    composerStore.startEdition("=SUM(");
    selectCell(model, "A4");
    expect(composerStore.currentContent).toBe("=SUM(A4");
    activateSheet(model, sheet2);
    addCellToSelection(model, "B3");
    expect(composerStore.currentContent).toBe("=SUM(A4,Sheet2!B3");
    resizeAnchorZone(model, "right");
    expect(composerStore.currentContent).toBe("=SUM(A4,Sheet2!B3:C3");
  });

  test("Composer has the content with the updated sheet name", () => {
    const name = "NEW_NAME";
    const sheet2 = "42";
    createSheetWithName(model, { sheetId: sheet2 }, name);
    setCellContent(model, "A1", "=NEW_NAME!A1");
    setCellContent(model, "A1", "24", sheet2);
    const nextName = "NEXT NAME";
    renameSheet(model, sheet2, nextName);
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
    expect(composerStore.highlights.map((h) => h.zone)).toEqual([toZone("A2:A3"), toZone("B5")]);

    composerStore.setCurrentContent("=SUM(B2:B3, C5, B2:B)");
    expect(composerStore.highlights.map((h) => h.zone)).toEqual([
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

  test("selecting insert range in selecting mode", () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("=");
    composerStore.changeComposerCursorSelection(1, 1);

    setSelection(model, ["A1:A3"]);
    expect(composerStore.currentContent).toBe("=A1:A3");

    selectCell(model, "A1");
    expect(composerStore.currentContent).toBe("=A1");
    moveAnchorCell(model, "down");
    moveAnchorCell(model, "right");
    expect(composerStore.currentContent).toBe("=B2");
    resizeAnchorZone(model, "down");
    resizeAnchorZone(model, "right");
    expect(composerStore.currentContent).toBe("=B2:C3");
  });

  test("selection expansion should add multiple cells references", () => {
    selectCell(model, "C3");
    composerStore.startEdition("=SUM(");

    addCellToSelection(model, "D4");
    expect(composerStore.currentContent).toBe("=SUM(D4");
    addCellToSelection(model, "E5");
    expect(composerStore.currentContent).toBe("=SUM(D4,E5");
  });

  test("alter selection during selection expansion updates the last reference", () => {
    selectCell(model, "C3");
    composerStore.startEdition("=SUM(");
    addCellToSelection(model, "D4");
    expect(composerStore.currentContent).toBe("=SUM(D4");
    addCellToSelection(model, "E5");
    expect(composerStore.currentContent).toBe("=SUM(D4,E5");
    resizeAnchorZone(model, "down");
    expect(composerStore.currentContent).toBe("=SUM(D4,E5:E6");
  });

  test("new selection should only affect the last selection", () => {
    selectCell(model, "C3");
    composerStore.startEdition("=SUM(");

    addCellToSelection(model, "D4");
    addCellToSelection(model, "E5");
    resizeAnchorZone(model, "down");

    expect(composerStore.currentContent).toBe("=SUM(D4,E5:E6");
    selectCell(model, "F6");
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

  test("start edition with a wrong selection", () => {
    composerStore.startEdition("coucou", { start: 10, end: 1 });
    expect(composerStore.composerSelection).not.toEqual({ start: 10, end: 0 });
    expect(composerStore.currentContent).not.toEqual("coucou");
  });

  test("set value of the active cell updates the content", () => {
    expect(getActivePosition(model)).toBe("A1");
    setCellContent(model, "A1", "Hello sir");
    expect(composerStore.currentContent).toBe("Hello sir");
  });

  test("set value of the active cell when switching sheet", () => {
    const sheet1Id = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "Hello from sheet1");
    createSheet(model, { sheetId: "42", activate: true });
    expect(composerStore.currentContent).toBe("");
    activateSheet(model, sheet1Id);
    expect(composerStore.currentContent).toBe("Hello from sheet1");
  });

  test("select another cell which is empty set the content to an empty string", () => {
    setCellContent(model, "A1", "Hello sir");
    expect(composerStore.currentContent).toBe("Hello sir");
    expect(getCell(model, "A2")).toBeUndefined();
    selectCell(model, "A2");
    expect(composerStore.currentContent).toBe("");
  });

  test("extend selection sets the range in composer", () => {
    selectCell(model, "C3");

    composerStore.startEdition("=");
    selectCell(model, "D4");

    setAnchorCorner(model, "E5");

    expect(composerStore.currentContent).toBe("=D4:E5");
  });

  test("alter selection updates composer content", () => {
    selectCell(model, "A1");

    composerStore.startEdition("=");
    selectCell(model, "D4");
    expect(composerStore.currentContent).toBe("=D4");
    resizeAnchorZone(model, "down");
    expect(composerStore.currentContent).toBe("=D4:D5");
    resizeAnchorZone(model, "up");
    expect(composerStore.currentContent).toBe("=D4");
  });

  test("enable selection mode reset to initial position only when selecting on the edition sheet", () => {
    selectCell(model, "D3");
    composerStore.startEdition("=");
    moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=D4");
    composerStore.stopComposerRangeSelection();
    composerStore.setCurrentContent("=D4+");
    moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=D4+D4");
    composerStore.stopEdition();
    selectCell(model, "D3");
    createSheet(model, { sheetId: "sheet2" });
    composerStore.startEdition("=");
    activateSheet(model, "sheet2");
    expect(model.getters.getSelectedZone()).toStrictEqual(toZone("A1"));
    moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=Sheet2!A2");
    composerStore.stopComposerRangeSelection();
    composerStore.setCurrentContent("=Sheet2!A2+");
    moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=Sheet2!A2+Sheet2!A3");
  });

  test("When changing sheet, composer selection is reset if there's no saved selection for activated sheet", () => {
    createSheet(model, { sheetId: "42", name: "Sheet2" });
    selectCell(model, "D3");
    composerStore.startEdition("=");
    moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toBe("=D4");
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toEqual("=Sheet2!A2");
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toEqual("=Sheet2!A3");
  });

  test("When changing sheet, composer selection will be set to saved selection (if any) of activated sheet", () => {
    createSheet(model, { sheetId: "42", name: "Sheet2" });
    const sheet1 = model.getters.getSheetIds()[0];
    const sheet2 = model.getters.getSheetIds()[1];
    selectCell(model, "B2"); // Sheet1!B2
    activateSheet(model, sheet2);
    selectCell(model, "D3"); // Sheet2!D3
    activateSheet(model, sheet1);
    composerStore.startEdition("=");
    activateSheet(model, sheet2);
    moveAnchorCell(model, "down");
    expect(composerStore.currentContent).toEqual("=Sheet2!D4");
  });

  test("select an empty cell, start selecting mode at the composer position", () => {
    expect(getCell(model, "A2")).toBeUndefined();
    selectCell(model, "A2");
    composerStore.startEdition("=");
    moveAnchorCell(model, "right");
    expect(composerStore.currentContent).toBe("=B2");
  });

  test("content is the raw cell content, not the evaluated text", () => {
    setCellContent(model, "A1", "=SUM(5)");
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe("=SUM(5)");
  });

  test("default active cell content when model is started", () => {
    setCellContent(model, "A1", "Hello");
    expect(composerStore.currentContent).toBe("Hello");
  });

  test("Paste a cell updates the topbar composer", () => {
    setCellContent(model, "A1", "Hello");
    copy(model, "A1");
    selectCell(model, "B1");
    paste(model, "B1");
    expect(composerStore.currentContent).toBe("Hello");
  });

  test("content is updated if cell content is updated", () => {
    setCellContent(model, "B1", "Hello");
    selectCell(model, "B1");
    expect(composerStore.currentContent).toBe("Hello");
    setCellContent(model, "C1", "update another cell");
    expect(composerStore.currentContent).toBe("Hello");
    setCellContent(model, "B1", "Hi");
    expect(composerStore.currentContent).toBe("Hi");
    setCellContent(model, "B1", "");
    expect(composerStore.currentContent).toBe("");
  });

  test("Setting a partial reference as content should not throw an error", () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("=Sheet1");
    composerStore.stopEdition();
    expect(composerStore.currentContent).toBe("=Sheet1");
  });

  test("start editing where theres a merge on other sheet, change sheet, and stop edition", () => {
    const sheetId1 = model.getters.getActiveSheetId();
    const sheetId2 = "42";
    merge(model, "A1:D5");
    createSheet(model, { sheetId: sheetId2, activate: true });
    selectCell(model, "C3");
    composerStore.startEdition("=");
    activateSheet(model, sheetId1);
    composerStore.stopEdition();
    expect(getCellText(model, "C3", sheetId2)).toBe("=");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("type a number in a cell with a percentage", () => {
    setCellContent(model, "A1", "2%");
    composerStore.startEdition("1");
    expect(composerStore.currentContent).toBe("1%");
    expect(composerStore.composerSelection).toEqual({ start: 1, end: 1 });
  });

  test("type a string in a cell with a percentage", () => {
    setCellContent(model, "A1", "2%");
    composerStore.startEdition("a");
    expect(composerStore.currentContent).toBe("a");
    expect(composerStore.composerSelection).toEqual({ start: 1, end: 1 });
  });

  test("type a number in percent formatted empty cell", () => {
    setFormat(model, "A1", "0.00%");
    composerStore.startEdition("12");
    expect(composerStore.currentContent).toBe("12%");
    expect(composerStore.composerSelection).toEqual({ start: 2, end: 2 });
  });

  test.each(["2%", "20.1%", "20.000001%"])(
    "display percentages as percentages in composer",
    (content) => {
      setCellContent(model, "A1", content);
      composerStore.startEdition();
      expect(composerStore.currentContent).toBe(content);
      const cursor = content.length;
      expect(composerStore.composerSelection).toEqual({ start: cursor, end: cursor });
    }
  );

  test("remove percentage trailing zeros in composer", () => {
    setCellContent(model, "A1", "2.0%");
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe("2%");
    expect(composerStore.composerSelection).toEqual({ start: 2, end: 2 });
    setCellContent(model, "A1", "2.10%");
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe("2.1%");
    expect(composerStore.composerSelection).toEqual({ start: 4, end: 4 });
  });

  test("empty cell with percent format is displayed empty", () => {
    setFormat(model, "A1", "0.00%");
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe("");
    expect(composerStore.composerSelection).toEqual({ start: 0, end: 0 });
  });

  test("Numbers in the composer are displayed without default format", () => {
    setCellContent(model, "A1", "0.123456789123");
    selectCell(model, "A1");
    expect(composerStore.currentContent).toBe("0.123456789123");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "#,##0.00",
    });
    expect(composerStore.currentContent).toBe("0.123456789123");
  });

  test("Numbers in the composer are displayed without number of digit format", () => {
    setCellContent(model, "A1", "0.123456789123");
    setFormat(model, "A1", "#,##0.00");
    selectCell(model, "A1");
    expect(composerStore.currentContent).toBe("0.123456789123");
  });

  test("Composer content for very large number don't user scientific notation", () => {
    setCellContent(model, "A1", "123456789123456789123456789");
    selectCell(model, "A1");

    // replacing lest significant digits by zeroes is a JS limitation.
    expect(composerStore.currentContent).toBe("123456789123456790000000000");
  });

  test("set a number format on a date displays the raw number", () => {
    setCellContent(model, "A1", "2020/10/20");
    expect(composerStore.currentContent).toBe("2020/10/20");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "#,##0.00",
    });
    expect(composerStore.currentContent).toBe("44124");
  });

  test("set a date format on a number displays the date", () => {
    setCellContent(model, "A1", "42736");
    expect(composerStore.currentContent).toBe("42736");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "mm/dd/yyyy",
    });
    expect(composerStore.currentContent).toBe("01/01/2017");
  });

  test("set a number format on a time displays the number", () => {
    setCellContent(model, "A1", "12:00:00 AM");
    expect(composerStore.currentContent).toBe("12:00:00 AM");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "#,##0.00",
    });
    expect(composerStore.currentContent).toBe("0");
  });

  test("set a time format on a number displays the time", () => {
    setCellContent(model, "A1", "1");
    expect(composerStore.currentContent).toBe("1");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "hh:mm:ss a",
    });
    expect(composerStore.currentContent).toBe("12:00:00 AM");
  });

  test("non-parsable date format displays a simplified and parsable value", () => {
    setCellContent(model, "A1", "1");
    setFormat(model, "A1", "dddd d mmmm yyyy");
    expect(getEvaluatedCell(model, "A1").formattedValue).toBe("Sunday 31 December 1899");
    expect(composerStore.currentContent).toBe("12/31/1899");
  });

  test("non-parsable date time format displays a simplified and parsable value", () => {
    setCellContent(model, "A1", "1.5");
    setFormat(model, "A1", "dddd d mmmm yyyy hh:mm:ss a");
    expect(getEvaluatedCell(model, "A1").formattedValue).toBe(
      "Sunday 31 December 1899 12:00:00 PM"
    );
    expect(composerStore.currentContent).toBe("12/31/1899 12:00:00 PM");
  });

  test("write too long formulas raises an error", async () => {
    const notificationStore = container.get(NotificationStore);
    const spyNotify = jest.spyOn(notificationStore, "raiseError");
    composerStore.startEdition();
    const content = // 101 tokens
      "=1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1";
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

  test("type '=', select twice a cell", () => {
    composerStore.startEdition("=");
    selectCell(model, "C8");
    selectCell(model, "C8");
    expect(composerStore.currentContent).toBe("=C8");
  });

  test.each([
    ["Sheet2", "=Sheet2!C8"],
    ["Sheet 2", "='Sheet 2'!C8"],
  ])("type '=', select a cell in another sheet", async (sheetName, expectedContent) => {
    composerStore.startEdition("=");
    createSheetWithName(model, { sheetId: "42", activate: true }, sheetName);
    selectCell(model, "C8");
    expect(composerStore.currentContent).toBe(expectedContent);
  });

  test("type '=', select a cell in another sheet, select a cell in the active sheet", async () => {
    composerStore.startEdition("=");
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    selectCell(model, "C8");
    activateSheet(model, sheetId);
    selectCell(model, "C8");
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
    expect(getCell(model, "A1")?.content).toBeUndefined();

    model.selection.getBackToDefault();

    expect(composerStore.editionMode).toEqual("inactive");
    expect(getCell(model, "A1")?.content).toEqual('="test"');
  });

  test.each(["sheet2", "sheet 2"])("Loop references on references with sheet name", (sheetName) => {
    createSheet(model, { name: sheetName });
    const composerSheetName = getCanonicalSheetName(sheetName);
    composerStore.startEdition(`=${composerSheetName}!A1`);
    composerStore.cycleReferences();
    expect(composerStore.currentContent).toBe(`=${composerSheetName}!$A$1`);
    composerStore.cycleReferences();
    expect(composerStore.currentContent).toBe(`=${composerSheetName}!A$1`);
    composerStore.cycleReferences();
    expect(composerStore.currentContent).toBe(`=${composerSheetName}!$A1`);
    composerStore.cycleReferences();
    expect(composerStore.currentContent).toBe(`=${composerSheetName}!A1`);
  });

  describe("Localized numbers and formulas", () => {
    describe("Number litterals", () => {
      test("Decimal number detected with decimal separator of locale", () => {
        editCell(model, "A1", "3,14");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.text);
        expect(getEvaluatedCell(model, "A1").value).toBe("3,14");

        updateLocale(model, FR_LOCALE);
        editCell(model, "A2", "3,14");
        expect(getEvaluatedCell(model, "A2").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A2").value).toBe(3.14);
      });

      test("Decimal numbers with dots are still detected in other locales", () => {
        // This is not a functional requirement but rather a limitation of the implementation.
        updateLocale(model, FR_LOCALE);
        editCell(model, "A1", "3.14");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").value).toBe(3.14);
      });

      test("Decimal separator with percent numbers", () => {
        updateLocale(model, FR_LOCALE);

        editCell(model, "A1", "5,9%");
        expect(getEvaluatedCell(model, "A1").value).toBeCloseTo(0.059, 3);
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").formattedValue).toBe("5,90%");

        editCell(model, "A2", ",9%");
        expect(getEvaluatedCell(model, "A2").value).toBeCloseTo(0.009, 3);
        expect(getEvaluatedCell(model, "A2").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A2").formattedValue).toBe("0,90%");
      });

      test("Decimal separator with currency numbers", () => {
        updateLocale(model, FR_LOCALE);

        editCell(model, "A1", "$3,14");
        expect(getEvaluatedCell(model, "A1").value).toBeCloseTo(3.14, 2);
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").formattedValue).toBe("$3,14");

        editCell(model, "A2", "3,14€");
        expect(getEvaluatedCell(model, "A2").value).toBeCloseTo(3.14, 2);
        expect(getEvaluatedCell(model, "A2").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A2").formattedValue).toBe("3,14€");
      });

      test("Decimal separator isn't replaced in non-number string", () => {
        updateLocale(model, FR_LOCALE);
        editCell(model, "A1", "3,14");
        expect(getCell(model, "A1")?.content).toBe("3.14");

        editCell(model, "A2", "Olà 3,14 :)");
        expect(getCell(model, "A2")?.content).toBe("Olà 3,14 :)");
      });
    });

    describe("Formulas", () => {
      test("Decimal number detected with decimal separator of locale", () => {
        editCell(model, "A1", "=3,14");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.error);

        updateLocale(model, FR_LOCALE);
        editCell(model, "A2", "=3,14");
        expect(getEvaluatedCell(model, "A2").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A2").value).toBe(3.14);
      });

      test("Decimal numbers with dots are still detected in other locales", () => {
        // This is not a functional requirement but rather a limitation of the implementation.
        updateLocale(model, FR_LOCALE);
        editCell(model, "A1", "=3.14");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").value).toBe(3.14);
      });

      test("Function argument separator change with the locale", () => {
        editCell(model, "A1", "=SUM(B2,5)");
        expect(getEvaluatedCell(model, "A1").value).toBe(5);
        editCell(model, "A1", "=SUM(B2;5)");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.error);

        updateLocale(model, {
          ...DEFAULT_LOCALE,
          formulaArgSeparator: ";",
          decimalSeparator: ",",
          thousandsSeparator: " ",
        });
        editCell(model, "A1", "=SUM(B2,5)");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.error);
        editCell(model, "A1", "=SUM(B2;5)");
        expect(getEvaluatedCell(model, "A1").value).toBe(5);
      });

      test("Decimal numbers as function argument", () => {
        updateLocale(model, {
          ...DEFAULT_LOCALE,
          decimalSeparator: ",",
          formulaArgSeparator: ";",
          thousandsSeparator: " ",
        });
        editCell(model, "A1", "=SUM(3,14; 5)");
        expect(getEvaluatedCell(model, "A1").type).toBe(CellValueType.number);
        expect(getEvaluatedCell(model, "A1").value).toBe(8.14);
      });

      test("Decimal numbers in strings aren't localized", () => {
        updateLocale(model, FR_LOCALE);
        editCell(model, "A1", '="3,14"');
        expect(getCell(model, "A1")?.content).toBe('="3,14"');
      });

      test("Can input localized date", () => {
        updateLocale(model, FR_LOCALE);
        editCell(model, "A1", "30/01/2020");
        expect(getCell(model, "A1")?.format).toBe("dd/mm/yyyy");
        expect(getCell(model, "A1")?.content).toBe(
          jsDateToRoundNumber(new DateTime(2020, 0, 30)).toString()
        );
      });

      test("Changing the locale after inputting a localized date does not change the date value", () => {
        updateLocale(model, FR_LOCALE);
        editCell(model, "A1", "30/01/2020");
        expect(getCell(model, "A1")?.format).toBe("dd/mm/yyyy");
        expect(getEvaluatedCell(model, "A1").value).toBe(
          jsDateToRoundNumber(new DateTime(2020, 0, 30))
        );

        updateLocale(model, DEFAULT_LOCALE);
        expect(getCell(model, "A1")?.format).toBe("m/d/yyyy");
        expect(getEvaluatedCell(model, "A1").value).toBe(
          jsDateToRoundNumber(new DateTime(2020, 0, 30))
        );
      });
    });
  });

  test("Adding a spreading formula at the bottom of the sheet add enough rows for the formula to spread", () => {
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);

    const cellOnLastRow = toXC(0, numberOfRows - 1);
    editCell(model, cellOnLastRow, "=TRANSPOSE(A1:E1)");

    expect(model.getters.getNumberRows(sheetId)).toBe(numberOfRows + 4 + 50);
    expect(getCellContent(model, cellOnLastRow)).toBe("0");
  });

  test("Adding a spreading formula at the right of the sheet add enough cols for the formula to spread", () => {
    const sheetId = model.getters.getActiveSheetId();
    const numberOfCols = model.getters.getNumberCols(sheetId);

    const cellOnLastCol = toXC(numberOfCols - 1, 0);
    editCell(model, cellOnLastCol, "=TRANSPOSE(A1:A5)");

    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCellContent(model, cellOnLastCol)).toBe("0");
  });

  test("Can undo/redo after adding a spreading formula at the end of the sheet", () => {
    const sheetId = model.getters.getActiveSheetId();
    const numberOfCols = model.getters.getNumberCols(sheetId);

    const cellOnLastCol = toXC(numberOfCols - 1, 0);
    editCell(model, cellOnLastCol, "=TRANSPOSE(A1:A5)");

    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCell(model, cellOnLastCol)?.content).toBe("=TRANSPOSE(A1:A5)");

    // A current unavoidable limitation is that we have multiple history steps (add cols + update cell)
    undo(model);
    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCellContent(model, cellOnLastCol)).toBe("");

    undo(model);
    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols);
    expect(getCellContent(model, cellOnLastCol)).toBe("");

    redo(model);
    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCellContent(model, cellOnLastCol)).toBe("");

    redo(model);
    expect(model.getters.getNumberCols(sheetId)).toBe(numberOfCols + 4 + 20);
    expect(getCell(model, cellOnLastCol)?.content).toBe("=TRANSPOSE(A1:A5)");
  });

  test("Invalid references are filtered out from the highlights", () => {
    const fakeSheetName = "louloulou";
    composerStore.startEdition(`=${fakeSheetName}!A1+A2+ZZZZZZZZZ1000000`);
    const highlights = composerStore.highlights;
    expect(highlights).toHaveLength(1);
    expect(highlights[0]).toMatchObject({ zone: toZone("A2"), color: colors[0] });
  });

  test("References of non-active sheets are filtered out from the highlights", () => {
    const secondSheetname = "louloulou";
    createSheet(model, { name: secondSheetname, activate: false });
    composerStore.startEdition(`=${secondSheetname}!A1+A2+ZZZZZZZZZ1000000`);
    const gridHighlights = container.get(HighlightStore).highlights;
    expect(gridHighlights).toHaveLength(1);
    expect(gridHighlights[0]).toMatchObject({ zone: toZone("A2"), color: colors[1] });
    const composerHighlights = composerStore.highlights;
    expect(composerHighlights).toHaveLength(2);
    colors;
    expect(composerHighlights[0]).toMatchObject({ zone: toZone("A1"), color: colors[0] });
    expect(composerHighlights[1]).toMatchObject({ zone: toZone("A2"), color: colors[1] });
  });

  test("click on a pivot dimension header cell insert the formula", () => {
    const grid = {
      D1: "Name",
      D2: "Alice",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:D4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "__count" }],
    });
    setCellContent(model, "A1", "=PIVOT(1)");
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=");
    selectCell(model, "A3");
    expect(store.currentContent).toBe('=PIVOT.HEADER(1,"Name","Alice")');

    // click on another header
    selectCell(model, "A4");
    expect(store.currentContent).toBe('=PIVOT.HEADER(1,"Name","Bob")');

    // click on total header
    selectCell(model, "A5");
    expect(store.currentContent).toBe("=PIVOT.HEADER(1)");
  });

  test("click on a pivot value cell insert the formula", () => {
    const grid = {
      D1: "Name",
      D2: "Alice",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:D4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "__count" }],
    });
    setCellContent(model, "A1", "=PIVOT(1)");
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=");
    selectCell(model, "B3");
    expect(store.currentContent).toBe('=PIVOT.VALUE(1,"__count","Name","Alice")');

    // click on another value
    selectCell(model, "B4");
    expect(store.currentContent).toBe('=PIVOT.VALUE(1,"__count","Name","Bob")');

    // click on total value
    selectCell(model, "B5");
    expect(store.currentContent).toBe('=PIVOT.VALUE(1,"__count")');
  });

  test("click on a pivot measure header cell insert the formula", () => {
    const grid = {
      D1: "Name",
      D2: "Alice",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:D4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "__count" }],
    });
    setCellContent(model, "A1", "=PIVOT(1)");
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=");
    selectCell(model, "B2");
    expect(store.currentContent).toBe('=PIVOT.HEADER(1,"measure","__count")');
  });

  test("click on an empty cell of a pivot inserts the reference", () => {
    const grid = {
      D1: "Name",
      D2: "Alice",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:D4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "__count" }],
    });
    setCellContent(model, "A1", "=PIVOT(1)");
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=");
    selectCell(model, "A1"); // top-left cell
    expect(store.currentContent).toBe("=A1");

    selectCell(model, "A2"); // empty cell next to measure headers
    expect(store.currentContent).toBe("=A2");
  });

  test("click on a pivot cell then increase the selected zone inserts the reference", () => {
    const grid = {
      D1: "Name",
      D2: "Alice",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:D4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "__count" }],
    });
    setCellContent(model, "A1", "=PIVOT(1)");
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=");

    selectCell(model, "A3");
    expect(store.currentContent).toBe('=PIVOT.HEADER(1,"Name","Alice")');

    resizeAnchorZone(model, "down", 1);
    expect(store.currentContent).toBe("=A3:A4");

    selectCell(model, "A4"); // click on a pivot cell again
    expect(store.currentContent).toBe('=PIVOT.HEADER(1,"Name","Bob")');
  });

  test("add multiple pivot function in the same formula", () => {
    const grid = {
      D1: "Name",
      D2: "Alice",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:D4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "__count" }],
    });
    setCellContent(model, "A1", "=PIVOT(1)");
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=");
    selectCell(model, "A3");
    expect(store.currentContent).toBe('=PIVOT.HEADER(1,"Name","Alice")');
    store.setCurrentContent('=PIVOT.HEADER(1,"Name","Alice")+');
    selectCell(model, "A4");
    expect(store.currentContent).toBe(
      '=PIVOT.HEADER(1,"Name","Alice")+PIVOT.HEADER(1,"Name","Bob")'
    );
  });

  test("select mutliple pivot function", () => {
    const grid = {
      D1: "Name",
      D2: "Alice",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:D4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "__count" }],
    });
    setCellContent(model, "A1", "=PIVOT(1)");
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=SUM(");
    selectCell(model, "A3");
    expect(store.currentContent).toBe('=SUM(PIVOT.HEADER(1,"Name","Alice")');
    addCellToSelection(model, "A4");
    expect(store.currentContent).toBe(
      '=SUM(PIVOT.HEADER(1,"Name","Alice"),PIVOT.HEADER(1,"Name","Bob")'
    );
  });

  test("select an empty pivot value inserts the pivot function", () => {
    // prettier-ignore
    const grid = {
      D1: "Name",   E1: "Price",
      D2: "Alice",  E2: "123",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:E4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "Price" }],
    });
    setCellContent(model, "A1", "=PIVOT(1)");
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=");
    expect(getEvaluatedCell(model, "B4").value).toBe(""); // empty
    selectCell(model, "B4");
    expect(store.currentContent).toBe('=PIVOT.VALUE(1,"Price","Name","Bob")');
  });

  test("clicking on a exploded pivot formula inserts the reference", () => {
    const grid = {
      D1: "Name",
      D2: "Alice",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:D4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "__count" }],
    });
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=");
    setCellContent(model, "B1", '=PIVOT.HEADER(1,"Name","Alice")');
    selectCell(model, "B1");
    expect(store.currentContent).toBe("=B1");
  });

  test("click on a pivot value highlights the selection", () => {
    const grid = {
      D1: "Name",
      D2: "Alice",
      D3: "Bob",
      D4: "Bob",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "D1:D4", {
      columns: [],
      rows: [{ name: "Name" }],
      measures: [{ name: "__count" }],
    });
    setCellContent(model, "A1", "=PIVOT(1)");
    const { store } = makeStoreWithModel(model, ComposerStore);
    store.startEdition("=");
    selectCell(model, "B3");
    expect(store.currentContent).toBe('=PIVOT.VALUE(1,"__count","Name","Alice")');
    expect(store.highlights).toEqual([
      {
        zone: toZone("B3"),
        color: "#445566",
        sheetId: model.getters.getActiveSheetId(),
        dashed: true,
        interactive: false,
        noFill: true,
        thinLine: true,
      },
    ]);
  });
});
