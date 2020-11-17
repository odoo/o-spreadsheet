import { toXC, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { Style, Border, CancelledReason } from "../../src/types/index";
import "../canvas.mock";
import { getActiveXc, getCell, getMergeCellMap, getMerges, setCellContent } from "../helpers";

function getCellsXC(model: Model): string[] {
  return Object.values(model.getters.getCells(model.getters.getActiveSheetId())).map((cell) => {
    const { col, row } = model.getters.getCellPosition(cell.id);
    return toXC(col, row);
  });
}

describe("merges", () => {
  test("can merge two cells", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");

    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("B2:B3") });

    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(model.getters.getCellByXc(sheet1, "B2")!.content).toBe("b2");
    expect(Object.keys(getMergeCellMap(model))).toEqual(["B2", "B3"]);
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: "B2" },
    });
  });

  test("can unmerge two cells", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:B3"],
        },
      ],
    });
    expect(Object.keys(getMergeCellMap(model))).toEqual(["B2", "B3"]);
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: "B2" },
    });
    const sheet1 = model.getters.getVisibleSheets()[0];

    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("B2:B3") });
    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);
  });

  test("a single cell is not merged", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    const sheet1 = model.getters.getVisibleSheets()[0];

    expect(Object.keys(getMerges(model))).toEqual([]);

    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("B2:B2") });

    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);
  });

  test("merge is clipped to sheet dimension", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
        },
      ],
    });
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId, zone: toZone("A1:C3") });
    expect(model.getters.getMerge(sheetId, "A1")).toMatchObject(toZone("A1:B2"));
  });

  test("editing a merge cell actually edits the top left", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"],
        },
      ],
    });

    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    expect(getActiveXc(model)).toBe("C3");
    model.dispatch("START_EDITION");
    expect(model.getters.getCurrentContent()).toBe("b2");
    model.dispatch("SET_CURRENT_CONTENT", { content: "new value" });
    model.dispatch("STOP_EDITION");
    expect(getCell(model, "B2")!.content).toBe("new value");
  });

  test("setting a style to a merge edit all the cells", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"],
        },
      ],
    });

    model.dispatch("SELECT_CELL", { col: 2, row: 2 });
    expect(getActiveXc(model)).toBe("C3");
    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(getCell(model, "B2")!.style).not.toBeDefined();
    const sheet1 = model.getters.getVisibleSheets()[0];

    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: model.getters.getSelectedZones(),
      style: { fillColor: "#333" },
    });

    expect(getCellsXC(model)).toEqual(["B2", "B3", "C2", "C3"]);
    expect(getCell(model, "B2")!.style).toBeDefined();
  });

  test("when moving in a merge, selected cell is topleft", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"],
        },
      ],
    });

    model.dispatch("SELECT_CELL", { col: 2, row: 3 });
    expect(getActiveXc(model)).toBe("C4");
    expect(model.getters.getActiveCell()).toBeUndefined(); // no active cell in C4
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -1 });
    expect(getActiveXc(model)).toBe("C3");
    expect(model.getters.getCellPosition(model.getters.getActiveCell()!.id)).toEqual({
      col: 1,
      row: 1,
    });
  });

  test("merge style is correct for inactive sheets", () => {
    const model = new Model({
      sheets: [
        {
          id: "1",
          colNumber: 1,
          rowNumber: 1,
          cells: {
            A1: { content: "1", style: 1 },
          },
        },
        {
          id: "2",
          colNumber: 3,
          rowNumber: 3,
          merges: ["A1:B1"],
          cells: {
            A1: { content: "2", style: 2 },
            B1: { content: "", style: 2 },
          },
        },
      ],
      styles: {
        1: { fillColor: "#f2f2f2" },
        2: { fillColor: "#a2a2a2" },
      },
    });
    const [, sheet2] = model.getters.getSheets();
    expect(sheet2).not.toBe(model.getters.getActiveSheetId());
    model.dispatch("REMOVE_ROWS", {
      rows: [2],
      sheetId: sheet2.id,
    });
    const cell = getCell(model, "A1", sheet2.id);
    expect(model.getters.getCellStyle(cell!)).toEqual({
      fillColor: "#a2a2a2",
    });
  });

  test("properly compute if a merge is destructive or not", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
        },
      ],
    });
    // B2 is not top left, so it is destructive
    expect(
      model.getters.isMergeDestructive(model.getters.getActiveSheet(), toZone("A1:C4"))
    ).toBeTruthy();

    // B2 is top left, so it is not destructive
    expect(
      model.getters.isMergeDestructive(model.getters.getActiveSheet(), toZone("B2:C4"))
    ).toBeFalsy();
  });

  test("a merge with only style should not be considered destructive", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { style: 1 } },
        },
      ],
      styles: { 1: {} },
    });

    expect(
      model.getters.isMergeDestructive(model.getters.getActiveSheet(), toZone("A1:C4"))
    ).toBeFalsy();
  });

  test("merging destructively a selection ask for confirmation", async () => {
    const askConfirmation = jest.fn();
    const model = new Model({}, { askConfirmation });
    setCellContent(model, "B2", "b2");
    model.dispatch("ALTER_SELECTION", { cell: [5, 5] });
    model.dispatch("ADD_MERGE", {
      sheetId: model.getters.getActiveSheetId(),
      zone: model.getters.getSelectedZone(),
      interactive: true,
    });
    expect(askConfirmation).toHaveBeenCalled();
  });

  test("merging cells with values will do nothing if not forced", () => {
    const model = new Model({
      sheets: [
        {
          id: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "1" },
            A2: { content: "2" },
            A3: { content: "3" },
            A4: { content: "=sum(A1:A3)" },
          },
        },
      ],
    });
    expect(getCell(model, "A4")!.value).toBe(6);
    model.dispatch("ADD_MERGE", { sheetId: "Sheet1", zone: toZone("A1:A3") });

    expect(getCell(model, "A1")!.value).toBe(1);
    expect(getCell(model, "A2")!.value).toBe(2);
    expect(getCell(model, "A3")!.value).toBe(3);
    expect(getCell(model, "A4")!.value).toBe(6);
  });

  test("merging cells with values remove them if forced", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "1" },
            A2: { content: "2" },
            A3: { content: "3" },
            A4: { content: "=sum(A1:A3)" },
          },
        },
      ],
    });
    const sheet1 = model.getters.getVisibleSheets()[0];
    expect(getCell(model, "A4")!.value).toBe(6);
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:A3"), force: true });

    expect(getCell(model, "A1")!.value).toBe(1);
    expect(getCell(model, "A2")).toBeUndefined();
    expect(getCell(model, "A3")).toBeUndefined();
    expect(getCell(model, "A4")!.value).toBe(1);
  });

  test("merging => setting background color => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 0, right: 1, bottom: 0 });

    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: [{ left: 0, right: 1, top: 0, bottom: 0 }],
      style: { fillColor: "red" },
    });

    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("setting background color => merging => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: [{ left: 0, right: 1, top: 0, bottom: 0 }],
      style: { fillColor: "red" },
    });

    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("setting background color to topleft => merging => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
      style: { fillColor: "red" },
    });
    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });

    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });

    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("merging => setting border => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 0, right: 1, bottom: 0 });

    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: model.getters.getSelectedZones(),
      border: "external",
    });
    const line = ["thin", "#000"];
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });

    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
  });

  test("setting border => merging => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });

    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: model.getters.getSelectedZones(),
      border: "external",
    });
    const line = ["thin", "#000"];
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
  });

  test("setting border to topleft => merging => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
      border: "external",
    });
    const line = ["thin", "#000"];
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
  });

  test("setting border to topleft => setting style => merging => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
      border: "external",
      style: { fillColor: "red" },
    });
    const line = ["thin", "#000"];
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("A1:B1") });
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("selecting cell next to merge => expanding selection => merging => unmerging", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:A2"] }],
    });
    const sheet1 = model.getters.getVisibleSheets()[0];

    //merging
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:A3") });
    const mergeId = getMergeCellMap(model).A1;
    expect(mergeId).toBeGreaterThan(0);
    expect(getMergeCellMap(model).A2).toBe(mergeId);

    // unmerge. there should not be any merge left
    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("A1:A3") });
    expect(getMergeCellMap(model)).toEqual({});
    expect(getMerges(model)).toEqual({});
  });

  test("can undo and redo a merge", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];

    // select B2:B3 and merge
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("B2:B3") });

    expect(Object.keys(getMergeCellMap(model))).toEqual(["B2", "B3"]);
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: "B2" },
    });

    // undo
    model.dispatch("UNDO");
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);

    // redo
    model.dispatch("REDO");
    expect(Object.keys(getMergeCellMap(model))).toEqual(["B2", "B3"]);
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: "B2" },
    });
  });

  test("merge, undo, select, redo: correct selection", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];

    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("B2:B3") });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 }); // B2
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
    model.dispatch("UNDO");
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
    model.dispatch("SELECT_CELL", { col: 1, row: 1 }); // B2

    expect(model.getters.getSelection().zones).toEqual([{ bottom: 1, left: 1, right: 1, top: 1 }]);
    model.dispatch("REDO");
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
  });

  test("merge, unmerge, select, undo: correct selection", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];

    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("B2:B3") });
    model.dispatch("REMOVE_MERGE", { sheetId: sheet1, zone: toZone("B2:B3") });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 }); // B2
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 1, left: 1, right: 1, top: 1 }]);
    model.dispatch("UNDO");
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
  });

  test("Cannot add a merge in a non-existing sheet", () => {
    const model = new Model();
    expect(model.dispatch("ADD_MERGE", { sheetId: "BLABLA", zone: toZone("A1:A2") })).toEqual({
      status: "CANCELLED",
      reason: CancelledReason.InvalidSheetId,
    });
  });

  test("import merge with style", () => {
    const model = new Model({
      sheets: [
        {
          id: "sheet1",
          colNumber: 4,
          rowNumber: 5,
          cells: {
            B4: { style: 1, border: 1 },
          },
          merges: ["B4:C5"],
        },
      ],
      styles: { 1: { textColor: "#fe0000" } },
      borders: { 1: { top: ["thin", "#000"] } },
    });
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getMerge(sheetId, "B4")).toBeTruthy();
    expect(model.getters.getMerge(sheetId, "C4")).toBeTruthy();
    expect(getCell(model, "B4")!.style).toBe(1);
    expect(getCell(model, "B4")!.border).toBe(1);
    model.dispatch("REMOVE_MERGE", { sheetId, zone: toZone("B4:C5") });
    expect(getCell(model, "B4")!.style).toBe(1);
    expect(getCell(model, "C4")!.style).toBe(1);
    expect(getCell(model, "B4")!.border).toBe(1);
    expect(getCell(model, "C4")!.border).toBe(1);
    expect(getCell(model, "C5")!.border).toBeUndefined();
  });
});

function getStyle(model: Model, xc: string): Style {
  const cell = getCell(model, xc)!;
  return cell && model.getters.getCellStyle(cell);
}

function getBorder(model: Model, xc: string): Border | null {
  const cell = getCell(model, xc)!;
  return cell && model.getters.getCellBorder(cell);
}
