import { getCanonicalSheetName, toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { CommandResult } from "../../src/types";
import {
  activateSheet,
  addCellToSelection,
  copy,
  createSheet,
  createSheetWithName,
  merge,
  moveAnchorCell,
  paste,
  renameSheet,
  resizeAnchorZone,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setFormat,
  setSelection,
} from "../test_helpers/commands_helpers";
import {
  getActivePosition,
  getCell,
  getCellContent,
  getCellText,
} from "../test_helpers/getters_helpers"; // to have getcontext mocks
import "../test_helpers/helpers";
import { target } from "../test_helpers/helpers";

describe("edition", () => {
  test("adding and removing a cell (by setting its content to empty string", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    // adding
    model.dispatch("START_EDITION", { text: "a" });
    model.dispatch("STOP_EDITION");
    expect(Object.keys(model.getters.getEvaluatedCells(sheetId))).toHaveLength(1);
    expect(getCellContent(model, "A1")).toBe("a");

    // removing
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "" });
    model.dispatch("STOP_EDITION");
    expect(model.getters.getEvaluatedCells(sheetId)).toEqual({});
  });

  test("deleting a cell with style does not remove it", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { A2: { style: 1, content: "a2" } } }],
      styles: { 1: { fillColor: "red" } },
    });

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
    const model = new Model();
    model.dispatch("START_EDITION", { text: "a" });
    expect(model.getters.getEditionMode()).toBe("editing");
    createSheet(model, { activate: true, sheetId: "42" });
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("editing a cell, then activating a new sheet: edition should not be stopped when editing formula", () => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: "=A1" });
    expect(model.getters.getEditionMode()).toBe("editing");
    createSheet(model, { activate: true, sheetId: "42" });
    expect(model.getters.getEditionMode()).not.toBe("inactive");
  });

  test("editing a cell, start a composer selection, then activating a new sheet: mode should still be 'waitingForRangeSelection'", () => {
    const model = new Model();
    const sheet1 = model.getters.getSheetIds()[0];
    model.dispatch("START_EDITION", { text: "=" });
    expect(model.getters.getEditionMode()).toBe("selecting");
    expect(model.getters.getCurrentEditedCell()?.sheetId).toBe(sheet1);
    createSheet(model, { activate: true, sheetId: "42" });
    expect(model.getters.getEditionMode()).toBe("selecting");
    expect(model.getters.getCurrentEditedCell()?.sheetId).toBe(sheet1);
    model.dispatch("STOP_EDITION");
    expect(model.getters.getActiveSheetId()).toBe(sheet1);
    expect(getCellText(model, "A1")).toBe("=");
    activateSheet(model, "42");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("ignore stopping composer selection if not selecting", () => {
    const model = new Model();
    expect(model.getters.getEditionMode()).toBe("inactive");
    model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("select cells in another sheet", () => {
    const model = new Model();
    const sheet2 = "42";
    createSheet(model, { sheetId: sheet2 });
    model.dispatch("START_EDITION", { text: "=SUM(" });
    selectCell(model, "A4");
    expect(model.getters.getCurrentContent()).toBe("=SUM(A4");
    activateSheet(model, sheet2);
    addCellToSelection(model, "B3");
    expect(model.getters.getCurrentContent()).toBe("=SUM(A4,Sheet2!B3");
    resizeAnchorZone(model, "right");
    expect(model.getters.getCurrentContent()).toBe("=SUM(A4,Sheet2!B3:C3");
  });

  test("Composer has the content with the updated sheet name", () => {
    const model = new Model();
    const name = "NEW_NAME";
    const sheet2 = "42";
    createSheetWithName(model, { sheetId: sheet2 }, name);
    setCellContent(model, "A1", "=NEW_NAME!A1");
    setCellContent(model, "A1", "24", sheet2);
    const nextName = "NEXT NAME";
    renameSheet(model, sheet2, nextName);
    model.dispatch("START_EDITION");
    expect(getCellText(model, "A1")).toBe("='NEXT NAME'!A1");
    expect(model.getters.getCurrentContent()).toBe("='NEXT NAME'!A1");
  });

  test("setting content sets selection at the end by default", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
    });
    expect(model.getters.getComposerSelection()).toEqual({
      start: 5,
      end: 5,
    });
  });

  test("setting content with selection", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
      selection: { start: 2, end: 4 },
    });
    expect(model.getters.getComposerSelection()).toEqual({
      start: 2,
      end: 4,
    });
  });

  test("Allow setting content with right-to-left selection", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    const result = model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
      selection: { start: 4, end: 0 },
    });
    expect(result).toBeSuccessfullyDispatched();
  });

  test("setting content with wrong selection", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    const result = model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
      selection: { start: 1, end: 6 },
    });
    expect(result).toBeCancelledBecause(CommandResult.WrongComposerSelection);
  });

  test("dont show selection indicator after percent operator", () => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: "=5%" });
    expect(model.getters.showSelectionIndicator()).toBe(false);
  });

  test("typing percent operator dont show selection indicator", () => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: "=5" });
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "5%",
      selection: { start: 2, end: 2 },
    });
    expect(model.getters.showSelectionIndicator()).toBe(false);
  });

  test("change selection", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
    });
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: 1,
      end: 2,
    });
    expect(model.getters.getComposerSelection()).toEqual({
      start: 1,
      end: 2,
    });
  });

  test("Allow setting right-to-left selection", () => {
    const model = new Model();
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
    });
    expect(
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
        start: 2,
        end: 1,
      })
    ).toBeSuccessfullyDispatched();
  });

  test("setting selection out of content is invalid", () => {
    const model = new Model();
    expect(model.getters.getCurrentContent()).toHaveLength(0);
    expect(
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
        start: 1,
        end: 2,
      })
    ).toBeCancelledBecause(CommandResult.WrongComposerSelection);
  });

  test("ranges are highlighted", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(A2:A3, B5)",
    });
    expect(model.getters.getHighlights().map((h) => h.zone)).toEqual([
      toZone("A2:A3"),
      toZone("B5"),
    ]);

    model.dispatch("SET_CURRENT_CONTENT", {
      content: "=SUM(B2:B3, C5, B2:B)",
    });
    expect(model.getters.getHighlights().map((h) => h.zone)).toEqual([
      toZone("B2:B3"),
      toZone("C5"),
      model.getters.getRangeFromSheetXC(model.getters.getActiveSheetId(), "B2:B").zone,
    ]);
  });

  test("different ranges have different colors", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(A2:A3, B5)",
    });
    const [firstColor, secondColor] = model.getters.getHighlights().map((h) => h.color);
    expect(firstColor).not.toBe(secondColor);
  });

  test("same ranges have same colors", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(B5, B5)",
    });
    const [firstColor, secondColor] = model.getters.getHighlights().map((h) => h.color);
    expect(firstColor).toBe(secondColor);
  });

  test("remove a range does not change colors of the next ranges", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(A2, B5)",
    });
    let rangesColor = model.getters.getHighlights().map((h) => h.color);
    const colorB5 = rangesColor[1];

    model.dispatch("SET_CURRENT_CONTENT", {
      content: "=SUM(B5)",
    });
    rangesColor = model.getters.getHighlights().map((h) => h.color);
    expect(colorB5).toBe(rangesColor[0]);
  });

  test("add a range does not change colors of the next ranges", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(B5)",
    });
    let rangesColor = model.getters.getHighlights().map((h) => h.color);
    const colorB5 = rangesColor[0];

    model.dispatch("SET_CURRENT_CONTENT", {
      content: "=SUM(A2, B5)",
    });
    rangesColor = model.getters.getHighlights().map((h) => h.color);
    expect(colorB5).toBe(rangesColor[1]);
  });

  test("stop edition removes highlighted zones", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(A2:A3, B5)",
    });
    expect(model.getters.getHighlights()).toHaveLength(2);
    model.dispatch("STOP_EDITION");
    expect(model.getters.getHighlights()).toHaveLength(0);
  });

  test("cancel edition reset current content", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "=SUM(A2:A3, B5)",
    });
    model.dispatch("STOP_EDITION", { cancel: true });
    expect(model.getters.getCurrentContent()).toBe("");
  });

  test("ranges are not highlighted when inactive", () => {
    const model = new Model();
    expect(model.getters.getEditionMode()).toBe("inactive");
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "=SUM(B2:B3, C5)",
    });
    expect(model.getters.getHighlights()).toHaveLength(0);
  });

  test("replace selection with smaller text", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "12345",
    });
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: 2,
      end: 4,
    });
    model.dispatch("REPLACE_COMPOSER_CURSOR_SELECTION", {
      text: "A",
    });
    expect(model.getters.getCurrentContent()).toBe("12A5");
    expect(model.getters.getComposerSelection()).toEqual({
      start: 3,
      end: 3,
    });
  });

  test("replace selection with longer text", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "12345",
    });
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: 2,
      end: 4,
    });
    model.dispatch("REPLACE_COMPOSER_CURSOR_SELECTION", {
      text: "ABCDE",
    });
    expect(model.getters.getCurrentContent()).toBe("12ABCDE5");
    expect(model.getters.getComposerSelection()).toEqual({
      start: 7,
      end: 7,
    });
  });

  test("only references in formulas are highlighted", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "C7" });
    expect(model.getters.getHighlights()).toHaveLength(0);
    model.dispatch("SET_CURRENT_CONTENT", { content: "A2:A5" });
    expect(model.getters.getHighlights()).toHaveLength(0);
  });

  test("selecting insert range in selecting mode", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "=",
    });
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: 1,
      end: 1,
    });

    setSelection(model, ["A1:A3"]);
    expect(model.getters.getCurrentContent()).toBe("=A1:A3");

    selectCell(model, "A1");
    expect(model.getters.getCurrentContent()).toBe("=A1");
    moveAnchorCell(model, "down");
    moveAnchorCell(model, "right");
    expect(model.getters.getCurrentContent()).toBe("=B2");
    resizeAnchorZone(model, "down");
    resizeAnchorZone(model, "right");
    expect(model.getters.getCurrentContent()).toBe("=B2:C3");
  });

  test("selection expansion should add multiple cells references", () => {
    const model = new Model();
    selectCell(model, "C3");
    model.dispatch("START_EDITION", { text: "=SUM(" });

    addCellToSelection(model, "D4");
    expect(model.getters.getCurrentContent()).toBe("=SUM(D4");
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");

    addCellToSelection(model, "E5");
    expect(model.getters.getCurrentContent()).toBe("=SUM(D4,E5");
  });

  test("alter selection during selection expansion updates the last reference", () => {
    const model = new Model();
    selectCell(model, "C3");
    model.dispatch("START_EDITION", { text: "=SUM(" });

    addCellToSelection(model, "D4");
    expect(model.getters.getCurrentContent()).toBe("=SUM(D4");

    addCellToSelection(model, "E5");
    expect(model.getters.getCurrentContent()).toBe("=SUM(D4,E5");
    resizeAnchorZone(model, "down");
    expect(model.getters.getCurrentContent()).toBe("=SUM(D4,E5:E6");
  });

  test("new selection should only affect the last selection", () => {
    const model = new Model();
    selectCell(model, "C3");
    model.dispatch("START_EDITION", { text: "=SUM(" });

    addCellToSelection(model, "D4");
    addCellToSelection(model, "E5");
    resizeAnchorZone(model, "down");
    model.dispatch("STOP_SELECTION_INPUT");

    expect(model.getters.getCurrentContent()).toBe("=SUM(D4,E5:E6");
    selectCell(model, "F6");
    expect(model.getters.getCurrentContent()).toBe("=SUM(D4,F6");
  });

  test("start edition without selection set cursor at the end", () => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: "coucou" });
    expect(model.getters.getComposerSelection()).toEqual({ start: 6, end: 6 });
  });

  test("start edition with a provided selection", () => {
    const model = new Model();
    model.dispatch("START_EDITION", {
      text: "coucou",
      selection: { start: 4, end: 5 },
    });
    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 5 });
  });

  test("Allow start edition with a right-to-left selection", () => {
    const model = new Model();
    expect(
      model.dispatch("START_EDITION", {
        text: "coucou",
        selection: { start: 5, end: 1 },
      })
    ).toBeSuccessfullyDispatched();
  });

  test("start edition with a wrong selection", () => {
    const model = new Model();
    expect(
      model.dispatch("START_EDITION", {
        text: "coucou",
        selection: { start: 10, end: 1 },
      })
    ).toBeCancelledBecause(CommandResult.WrongComposerSelection);
  });

  test("set value of the active cell updates the content", () => {
    const model = new Model();
    expect(getActivePosition(model)).toBe("A1");
    setCellContent(model, "A1", "Hello sir");
    expect(model.getters.getCurrentContent()).toBe("Hello sir");
  });

  test("set value of the active cell when switching sheet", () => {
    const model = new Model();
    const sheet1Id = model.getters.getActiveSheetId();
    setCellContent(model, "A1", "Hello from sheet1");
    createSheet(model, { sheetId: "42", activate: true });
    expect(model.getters.getCurrentContent()).toBe("");
    activateSheet(model, sheet1Id);
    expect(model.getters.getCurrentContent()).toBe("Hello from sheet1");
  });

  test("select another cell which is empty set the content to an empty string", () => {
    const model = new Model();
    setCellContent(model, "A1", "Hello sir");
    expect(model.getters.getCurrentContent()).toBe("Hello sir");
    expect(getCell(model, "A2")).toBeUndefined();
    selectCell(model, "A2");
    expect(model.getters.getCurrentContent()).toBe("");
  });

  test("extend selection sets the range in composer", () => {
    const model = new Model();
    selectCell(model, "C3");

    model.dispatch("START_EDITION", { text: "=" });
    selectCell(model, "D4");

    setAnchorCorner(model, "E5");

    expect(model.getters.getCurrentContent()).toBe("=D4:E5");
  });

  test("alter selection updates composer content", () => {
    const model = new Model();
    selectCell(model, "A1");

    model.dispatch("START_EDITION", { text: "=" });
    selectCell(model, "D4");
    expect(model.getters.getCurrentContent()).toBe("=D4");
    resizeAnchorZone(model, "down");
    expect(model.getters.getCurrentContent()).toBe("=D4:D5");
    resizeAnchorZone(model, "up");
    expect(model.getters.getCurrentContent()).toBe("=D4");
  });

  test("enable selection mode reset to initial position only when selecting on the edition sheet", () => {
    const model = new Model();
    selectCell(model, "D3");
    model.dispatch("START_EDITION", { text: "=" });
    moveAnchorCell(model, "down");
    expect(model.getters.getCurrentContent()).toBe("=D4");
    model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "=D4+" });
    moveAnchorCell(model, "down");
    expect(model.getters.getCurrentContent()).toBe("=D4+D4");
    model.dispatch("STOP_EDITION");
    selectCell(model, "D3");
    createSheet(model, { sheetId: "sheet2" });
    model.dispatch("START_EDITION", { text: "=" });
    activateSheet(model, "sheet2");
    expect(model.getters.getSelectedZone()).toStrictEqual(toZone("A1"));
    moveAnchorCell(model, "down");
    expect(model.getters.getCurrentContent()).toBe("=Sheet2!A2");
    model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "=Sheet2!A2+" });
    moveAnchorCell(model, "down");
    expect(model.getters.getCurrentContent()).toBe("=Sheet2!A2+Sheet2!A3");
  });

  test("When changing sheet, composer selection is reset if there's no saved selection for activated sheet", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42", name: "Sheet2" });
    selectCell(model, "D3");
    model.dispatch("START_EDITION", { text: "=" });
    moveAnchorCell(model, "down");
    expect(model.getters.getCurrentContent()).toBe("=D4");
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(model.getters.getCurrentContent()).toEqual("=Sheet2!A2");
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(model.getters.getCurrentContent()).toEqual("=Sheet2!A3");
  });

  test("When changing sheet, composer selection will be set to saved selection (if any) of activated sheet", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42", name: "Sheet2" });
    const sheet1 = model.getters.getSheetIds()[0];
    const sheet2 = model.getters.getSheetIds()[1];
    selectCell(model, "B2"); // Sheet1!B2
    activateSheet(model, sheet2);
    selectCell(model, "D3"); // Sheet2!D3
    activateSheet(model, sheet1);
    model.dispatch("START_EDITION", { text: "=" });
    activateSheet(model, sheet2);
    moveAnchorCell(model, "down");
    expect(model.getters.getCurrentContent()).toEqual("=Sheet2!D4");
  });

  test("select an empty cell, start selecting mode at the composer position", () => {
    const model = new Model();
    expect(getCell(model, "A2")).toBeUndefined();
    selectCell(model, "A2");
    model.dispatch("START_EDITION", { text: "=" });
    moveAnchorCell(model, "right");
    expect(model.getters.getCurrentContent()).toBe("=B2");
  });

  test("content is the raw cell content, not the evaluated text", () => {
    const model = new Model();
    setCellContent(model, "A1", "=SUM(5)");
    model.dispatch("START_EDITION");
    expect(model.getters.getCurrentContent()).toBe("=SUM(5)");
  });

  test("default active cell content when model is started", () => {
    const model = new Model({
      sheets: [{ colNumber: 2, rowNumber: 2, cells: { A1: { content: "Hello" } } }],
    });
    expect(model.getters.getCurrentContent()).toBe("Hello");
  });

  test("Paste a cell updates the topbar composer", () => {
    const model = new Model();
    setCellContent(model, "A1", "Hello");
    copy(model, "A1");
    selectCell(model, "B1");
    paste(model, "B1");
    expect(model.getters.getCurrentContent()).toBe("Hello");
  });

  test("content is updated if cell content is updated", () => {
    const model = new Model({
      sheets: [{ colNumber: 2, rowNumber: 2, cells: { B1: { content: "Hello" } } }],
    });
    selectCell(model, "B1");
    expect(model.getters.getCurrentContent()).toBe("Hello");
    setCellContent(model, "C1", "update another cell");
    expect(model.getters.getCurrentContent()).toBe("Hello");
    setCellContent(model, "B1", "Hi");
    expect(model.getters.getCurrentContent()).toBe("Hi");
    setCellContent(model, "B1", "");
    expect(model.getters.getCurrentContent()).toBe("");
  });

  test("Setting a partial reference as content should not throw an error", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "=Sheet1" });
    model.dispatch("STOP_EDITION");
    expect(model.getters.getCurrentContent()).toBe("=Sheet1");
  });

  test("start editing where theres a merge on other sheet, change sheet, and stop edition", () => {
    const model = new Model();
    const sheetId1 = model.getters.getActiveSheetId();
    const sheetId2 = "42";
    merge(model, "A1:D5");
    createSheet(model, { sheetId: sheetId2, activate: true });
    selectCell(model, "C3");
    model.dispatch("START_EDITION", { text: "=" });
    activateSheet(model, sheetId1);
    model.dispatch("STOP_EDITION");
    expect(getCellText(model, "C3", sheetId2)).toBe("=");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("type a number in a cell with a percentage", () => {
    const model = new Model();
    setCellContent(model, "A1", "2%");
    model.dispatch("START_EDITION", { text: "1" });
    expect(model.getters.getCurrentContent()).toBe("1%");
    expect(model.getters.getComposerSelection()).toEqual({ start: 1, end: 1 });
  });

  test("type a string in a cell with a percentage", () => {
    const model = new Model();
    setCellContent(model, "A1", "2%");
    model.dispatch("START_EDITION", { text: "a" });
    expect(model.getters.getCurrentContent()).toBe("a");
    expect(model.getters.getComposerSelection()).toEqual({ start: 1, end: 1 });
  });

  test("type a number in percent formatted empty cell", () => {
    const model = new Model();
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("A1"),
      format: "0.00%",
    });
    model.dispatch("START_EDITION", { text: "12" });
    expect(model.getters.getCurrentContent()).toBe("12%");
    expect(model.getters.getComposerSelection()).toEqual({ start: 2, end: 2 });
  });

  test.each(["2%", "20.1%", "20.000001%"])(
    "display percentages as percentages in composer",
    (content) => {
      const model = new Model();
      setCellContent(model, "A1", content);
      model.dispatch("START_EDITION");
      expect(model.getters.getCurrentContent()).toBe(content);
      const cursor = content.length;
      expect(model.getters.getComposerSelection()).toEqual({ start: cursor, end: cursor });
    }
  );

  test("remove percentage trailing zeros in composer", () => {
    const model = new Model();
    setCellContent(model, "A1", "2.0%");
    model.dispatch("START_EDITION");
    expect(model.getters.getCurrentContent()).toBe("2%");
    expect(model.getters.getComposerSelection()).toEqual({ start: 2, end: 2 });
    setCellContent(model, "A1", "2.10%");
    model.dispatch("START_EDITION");
    expect(model.getters.getCurrentContent()).toBe("2.1%");
    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 4 });
  });

  test("empty cell with percent format is displayed empty", () => {
    const model = new Model();
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("A1"),
      format: "0.00%",
    });
    model.dispatch("START_EDITION");
    expect(model.getters.getCurrentContent()).toBe("");
    expect(model.getters.getComposerSelection()).toEqual({ start: 0, end: 0 });
  });

  test("Numbers in the composer are displayed without default format", () => {
    const model = new Model();
    setCellContent(model, "A1", "0.123456789123");
    selectCell(model, "A1");
    expect(model.getters.getCurrentContent()).toBe("0.123456789123");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "#,##0.00",
    });
    expect(model.getters.getCurrentContent()).toBe("0.123456789123");
  });

  test("Numbers in the composer are displayed without number of digit format", () => {
    const model = new Model();
    setCellContent(model, "A1", "0.123456789123");
    setFormat(model, "#,##0.00", target("A1"));
    selectCell(model, "A1");
    expect(model.getters.getCurrentContent()).toBe("0.123456789123");
  });

  test("Composer content for very large number don't user scientific notation", () => {
    const model = new Model();
    setCellContent(model, "A1", "123456789123456789123456789");
    selectCell(model, "A1");

    // replacing lest significant digits by zeroes is a JS limitation.
    expect(model.getters.getCurrentContent()).toBe("123456789123456790000000000");
  });

  test("set a number format on a date displays the raw number", () => {
    const model = new Model();
    setCellContent(model, "A1", "2020/10/20");
    expect(model.getters.getCurrentContent()).toBe("2020/10/20");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "#,##0.00",
    });
    expect(model.getters.getCurrentContent()).toBe("44124");
  });

  test("set a date format on a number displays the date", () => {
    const model = new Model();
    setCellContent(model, "A1", "42736");
    expect(model.getters.getCurrentContent()).toBe("42736");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "mm/dd/yyyy",
    });
    expect(model.getters.getCurrentContent()).toBe("01/01/2017");
  });

  test("set a number format on a time displays the number", () => {
    const model = new Model();
    setCellContent(model, "A1", "12:00:00 AM");
    expect(model.getters.getCurrentContent()).toBe("12:00:00 AM");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "#,##0.00",
    });
    expect(model.getters.getCurrentContent()).toBe("0");
  });

  test("set a time format on a number displays the time", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    expect(model.getters.getCurrentContent()).toBe("1");
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      format: "hh:mm:ss a",
    });
    expect(model.getters.getCurrentContent()).toBe("12:00:00 AM");
  });

  test("write too long formulas raises an error", async () => {
    const model = new Model({});
    const spyNotify = jest.spyOn(model["config"], "notifyUI");
    model.dispatch("START_EDITION");
    const content = // 101 tokens
      "=1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1";
    model.dispatch("SET_CURRENT_CONTENT", { content });
    model.dispatch("STOP_EDITION");

    expect(spyNotify).toHaveBeenCalled();
  });

  test("start edition twice --> overwrites the contents of the first start edition", () => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: "=SUM(" });
    expect(model.getters.getCurrentContent()).toBe("=SUM(");
    model.dispatch("START_EDITION", { text: "=DB(" });
    expect(model.getters.getCurrentContent()).toBe("=DB(");
  });

  test("type '=', select twice a cell", () => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: "=" });
    selectCell(model, "C8");
    selectCell(model, "C8");
    expect(model.getters.getCurrentContent()).toBe("=C8");
  });

  test.each([
    ["Sheet2", "=Sheet2!C8"],
    ["Sheet 2", "='Sheet 2'!C8"],
  ])("type '=', select a cell in another sheet", async (sheetName, expectedContent) => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: "=" });
    createSheetWithName(model, { sheetId: "42", activate: true }, sheetName);
    selectCell(model, "C8");
    expect(model.getters.getCurrentContent()).toBe(expectedContent);
  });

  test("type '=', select a cell in another sheet, select a cell in the active sheet", async () => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: "=" });
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    selectCell(model, "C8");
    activateSheet(model, sheetId);
    selectCell(model, "C8");
    expect(model.getters.getCurrentContent()).toBe("=C8");
  });

  describe("Loop through reference combinations", () => {
    let model: Model;
    beforeEach(() => {
      model = new Model();
    });
    test("Loop references on cell symbol", async () => {
      model.dispatch("START_EDITION", { text: "=A1" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 1 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toBe("=$A$1");
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toBe("=A$1");
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toBe("=$A1");
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toBe("=A1");
    });

    test("Loop references on range symbol", async () => {
      model.dispatch("START_EDITION", { text: "=A1:B1" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 1 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=$A$1:$B$1");
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=A$1:B$1");
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=$A1:$B1");
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=A1:B1");
    });

    test("Loop references on mixed selection", async () => {
      model.dispatch("START_EDITION", { text: "=SUM(A1,34,42+3,B$1:C$2,$A1+B$2)" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 30 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=SUM($A$1,34,42+3,$B1:$C2,A1+$B2)");
    });

    test("Loop references on reference to another sheet", async () => {
      model.dispatch("START_EDITION", { text: "=SUM(s2!A1:B1, s2!$A$1)" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 20 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=SUM(s2!$A$1:$B$1, s2!A$1)");
    });

    test("Loop references on range with cell that have different fixed mode", async () => {
      model.dispatch("START_EDITION", { text: "=A$1:B2" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 1 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=$A1:$B$2");
    });

    test("Loop references set composer selection to entire cell symbol on which we loop", async () => {
      model.dispatch("START_EDITION", { text: "=AA1" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 2 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=$AA$1");
      expect(model.getters.getComposerSelection()).toEqual({ start: 1, end: 6 });
    });

    test("Loop references set composer selection to entire range symbol on which we loop", async () => {
      model.dispatch("START_EDITION", { text: "=A1:B2" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 2 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=$A$1:$B$2");
      expect(model.getters.getComposerSelection()).toEqual({ start: 1, end: 10 });
    });

    test("Loop references set selection from the first range/cell symbol to the last", async () => {
      model.dispatch("START_EDITION", { text: "=SUM(A1,34,42+3,B$1:C$2)" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 20 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=SUM($A$1,34,42+3,$B1:$C2)");
      expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 25 });
    });

    test("Loop references changes adjacent references", async () => {
      model.dispatch("START_EDITION", { text: "=A1+A2" });
      // cursor just before +
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 3, end: 6 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=$A$1+$A$2");
      expect(model.getters.getComposerSelection()).toEqual({ start: 1, end: 10 });
    });

    test("Loop references only change selected elements", async () => {
      model.dispatch("START_EDITION", { text: "=A1+A2" });
      // cursor just after +
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 4, end: 6 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=A1+$A$2");
      expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 8 });
    });

    test("Loop references reduces selection to select references only", async () => {
      model.dispatch("START_EDITION", { text: "=SUM(A1+A2)+SUM(B1)" });
      // selection in the middle of SUMs
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 6, end: 13 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=SUM($A$1+$A$2)+SUM(B1)");
      expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 14 });
    });

    test("Loop references when no range is selected", async () => {
      model.dispatch("START_EDITION", { text: "=A1+1" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 4, end: 5 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=A1+1");
      expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 5 });
    });

    test("Loop references doesn't switch to 'selecting' edition mode", async () => {
      model.dispatch("START_EDITION", { text: "=SUM(A1,C2)" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 10 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=SUM($A$1,$C$2)");
      expect(model.getters.getEditionMode()).toEqual("editing");
    });

    test("f4 put selection at the end of looped token when the original selection was of size 0", async () => {
      model.dispatch("START_EDITION", { text: "=A1" });
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 1 });
      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=$A$1");
      expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });

      model.dispatch("CYCLE_EDITION_REFERENCES");
      expect(model.getters.getCurrentContent()).toEqual("=A$1");
      expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 4 });
    });
  });

  test("Setting the selection processor back to default properly stops the edition", () => {
    const model = new Model();
    model.dispatch("START_EDITION", { text: '="test"' });
    expect(model.getters.getEditionMode()).toEqual("editing");
    expect(getCell(model, "A1")?.content).toBeUndefined();

    model.selection.getBackToDefault();

    expect(model.getters.getEditionMode()).toEqual("inactive");
    expect(getCell(model, "A1")?.content).toEqual('="test"');
  });

  test.each(["sheet2", "sheet 2"])("Loop references on references with sheet name", (sheetName) => {
    const model = new Model({});
    createSheet(model, { name: sheetName });
    const composerSheetName = getCanonicalSheetName(sheetName);
    model.dispatch("START_EDITION", { text: `=${composerSheetName}!A1` });
    model.dispatch("CYCLE_EDITION_REFERENCES");
    expect(model.getters.getCurrentContent()).toBe(`=${composerSheetName}!$A$1`);
    model.dispatch("CYCLE_EDITION_REFERENCES");
    expect(model.getters.getCurrentContent()).toBe(`=${composerSheetName}!A$1`);
    model.dispatch("CYCLE_EDITION_REFERENCES");
    expect(model.getters.getCurrentContent()).toBe(`=${composerSheetName}!$A1`);
    model.dispatch("CYCLE_EDITION_REFERENCES");
    expect(model.getters.getCurrentContent()).toBe(`=${composerSheetName}!A1`);
  });

  test("Invalid references are filtered out from the highlights", () => {
    const model = new Model({});
    const fakeSheetName = "louloulou";
    model.dispatch("START_EDITION", { text: `=${fakeSheetName}!A1+A2+ZZZZZZZZZ1000000` });
    const highlights = model.getters.getComposerHighlights();
    expect(highlights).toHaveLength(1);
    expect(highlights[0].zone).toMatchObject(toZone("A2"));
  });
});
