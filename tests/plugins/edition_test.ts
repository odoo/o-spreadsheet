import { Model } from "../../src/model";
import "../helpers"; // to have getcontext mocks
import { getCell } from "../helpers";
import { CancelledReason } from "../../src/types";
import { toZone } from "../../src/helpers";

describe("edition", () => {
  test("adding and removing a cell (by setting its content to empty string", () => {
    const model = new Model();
    // adding
    model.dispatch("START_EDITION", { text: "a" });
    model.dispatch("STOP_EDITION");
    expect(Object.keys(model.getters.getCells())).toEqual(["A1"]);
    expect(model.getters.getCells()["A1"].content).toBe("a");

    // removing
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", { content: "" });
    model.dispatch("STOP_EDITION");
    expect(model.getters.getCells()).toEqual({});
  });

  test("deleting a cell with style does not remove it", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { A2: { style: 1, content: "a2" } },
        },
      ],
      styles: {
        1: { fillColor: "red" },
      },
    });

    // removing
    expect(model.getters.getCells()["A2"].content).toBe("a2");
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    model.dispatch("DELETE_CONTENT", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
    });
    expect("A2" in model.getters.getCells()).toBeTruthy();
    expect(model.getters.getCells()["A2"].content).toBe("");
  });

  test("editing a cell, then activating a new sheet: edition should be stopped", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("START_EDITION", { text: "a" });
    expect(model.getters.getEditionMode()).toBe("editing");
    model.dispatch("CREATE_SHEET", { activate: true, id: "42" });
    expect(model.getters.getEditionMode()).toBe("inactive");
    expect(getCell(model, "A1")).toBe(null);
    model.dispatch("ACTIVATE_SHEET", { from: model.getters.getActiveSheet(), to: sheet1 });
    expect(getCell(model, "A1")!.content).toBe("a");
  });

  test("editing a cell, start a composer selection, then activating a new sheet: mode should still be selecting", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("START_EDITION", { text: "=" });
    model.dispatch("START_COMPOSER_SELECTION");
    expect(model.getters.getEditionMode()).toBe("selecting");
    expect(model.getters.getEditionSheet()).toBe(sheet1);
    model.dispatch("CREATE_SHEET", { activate: true, id: "42", name: "Sheet2" });
    expect(model.getters.getEditionMode()).toBe("selecting");
    expect(model.getters.getEditionSheet()).toBe(sheet1);
    model.dispatch("STOP_EDITION");
    expect(getCell(model, "A1", model.getters.getActiveSheet())).toBeNull();
    model.dispatch("ACTIVATE_SHEET", { from: model.getters.getActiveSheet(), to: sheet1 });
    expect(getCell(model, "A1")!.content).toBe("=");
  });

  test("ignore stopping composer selection if not selecting", () => {
    const model = new Model();
    expect(model.getters.getEditionMode()).toBe("inactive");
    model.dispatch("STOP_COMPOSER_SELECTION");
    expect(model.getters.getEditionMode()).toBe("inactive");
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

  test("setting content with wrong selection", () => {
    const model = new Model();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 0,
      end: 0,
    });
    const result = model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
      selection: { start: 4, end: 1 },
    });
    expect(result).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongComposerSelection,
    });
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
    model.dispatch("CHANGE_COMPOSER_SELECTION", {
      start: 1,
      end: 2,
    });
    expect(model.getters.getComposerSelection()).toEqual({
      start: 1,
      end: 2,
    });
  });

  test("setting selection start after end is invalid", () => {
    const model = new Model();
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "hello",
    });
    expect(
      model.dispatch("CHANGE_COMPOSER_SELECTION", {
        start: 2,
        end: 1,
      })
    ).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongComposerSelection,
    });
  });

  test("setting selection out of content is invalid", () => {
    const model = new Model();
    expect(model.getters.getCurrentContent()).toHaveLength(0);
    expect(
      model.dispatch("CHANGE_COMPOSER_SELECTION", {
        start: 1,
        end: 2,
      })
    ).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.WrongComposerSelection,
    });
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
      content: "=SUM(B2:B3, C5)",
    });
    expect(model.getters.getHighlights().map((h) => h.zone)).toEqual([
      toZone("B2:B3"),
      toZone("C5"),
    ]);
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
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "12345",
    });
    model.dispatch("CHANGE_COMPOSER_SELECTION", {
      start: 2,
      end: 4,
    });
    model.dispatch("REPLACE_COMPOSER_SELECTION", {
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
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "12345",
    });
    model.dispatch("CHANGE_COMPOSER_SELECTION", {
      start: 2,
      end: 4,
    });
    model.dispatch("REPLACE_COMPOSER_SELECTION", {
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

  test("selecting insert range in 'selecting' mode", () => {
    const model = new Model();
    model.dispatch("START_EDITION");
    model.dispatch("SET_CURRENT_CONTENT", {
      content: "=",
    });
    model.dispatch("CHANGE_COMPOSER_SELECTION", {
      start: 1,
      end: 1,
    });
    model.dispatch("START_COMPOSER_SELECTION");

    model.dispatch("SET_SELECTION", {
      anchor: [0, 0],
      zones: [toZone("A1:A3")],
    });
    expect(model.getters.getCurrentContent()).toBe("=A1:A3");

    model.dispatch("SELECT_CELL", {
      col: 0,
      row: 0,
    });
    expect(model.getters.getCurrentContent()).toBe("=A1");

    model.dispatch("MOVE_POSITION", {
      deltaX: 1,
      deltaY: 1,
    });
    expect(model.getters.getCurrentContent()).toBe("=B2");

    model.dispatch("ALTER_SELECTION", {
      delta: [1, 1],
    });
    expect(model.getters.getCurrentContent()).toBe("=B2:C3");
  });
});
