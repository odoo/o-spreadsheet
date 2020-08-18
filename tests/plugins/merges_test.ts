import { toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { Style, Border } from "../../src/types/index";
import "../canvas.mock";
import { getActiveXc, getCell } from "../helpers";

describe("merges", () => {
  test("can merge two cells", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });

    expect(Object.keys(model["workbook"].activeSheet.cells)).toEqual(["B2"]);
    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual([]);
    expect(Object.keys(model["workbook"].activeSheet.merges)).toEqual([]);
    const sheet1 = model["workbook"].visibleSheets[0];
    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("B2:B3") });

    expect(Object.keys(model["workbook"].activeSheet.cells)).toEqual(["B2"]);
    expect(model["workbook"].activeSheet.cells.B2.content).toBe("b2");
    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model["workbook"].activeSheet.merges).toEqual({
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
    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model["workbook"].activeSheet.merges).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: "B2" },
    });
    const sheet1 = model["workbook"].visibleSheets[0];

    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    model.dispatch("REMOVE_MERGE", { sheet: sheet1, zone: toZone("B2:B3") });
    expect(Object.keys(model["workbook"].activeSheet.cells)).toEqual(["B2"]);
    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual([]);
    expect(Object.keys(model["workbook"].activeSheet.merges)).toEqual([]);
  });

  test("a single cell is not merged", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    const sheet1 = model["workbook"].visibleSheets[0];

    expect(Object.keys(model["workbook"].activeSheet.merges)).toEqual([]);

    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("B2:B2") });

    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual([]);
    expect(Object.keys(model["workbook"].activeSheet.merges)).toEqual([]);
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
    expect(Object.keys(model["workbook"].activeSheet.cells)).toEqual(["B2"]);
    expect(getCell(model, "B2")!.style).not.toBeDefined();
    const sheet1 = model["workbook"].visibleSheets[0];

    model.dispatch("SET_FORMATTING", {
      sheet: sheet1,
      target: model.getters.getSelectedZones(),
      style: { fillColor: "#333" },
    });

    expect(Object.keys(model["workbook"].activeSheet.cells)).toEqual(["B2", "B3", "C2", "C3"]);
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
    expect(model.getters.getActiveCell()).toBeNull(); // no active cell in C4
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -1 });
    expect(getActiveXc(model)).toBe("C3");
    expect(model.getters.getActiveCell()!.xc).toBe("B2");
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
    expect(sheet2).not.toBe(model.getters.getActiveSheet());
    model.dispatch("REMOVE_ROWS", {
      rows: [2],
      sheet: sheet2.id,
    });
    const cell = model.getters.getCell(0, 0, sheet2.name);
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
    expect(model.getters.isMergeDestructive(toZone("A1:C4"))).toBeTruthy();

    // B2 is top left, so it is not destructive
    expect(model.getters.isMergeDestructive(toZone("B2:C4"))).toBeFalsy();
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

    expect(model.getters.isMergeDestructive(toZone("A1:C4"))).toBeFalsy();
  });

  test("merging destructively a selection ask for confirmation", async () => {
    const askConfirmation = jest.fn();
    const model = new Model({}, { askConfirmation });
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    model.dispatch("ALTER_SELECTION", { cell: [5, 5] });
    model.dispatch("ADD_MERGE", {
      sheet: model.getters.getActiveSheet(),
      zone: model.getters.getSelectedZone(),
      interactive: true,
    });
    expect(askConfirmation).toHaveBeenCalled();
  });

  test("merging cells with values will do nothing if not forced", () => {
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
    expect(getCell(model, "A4")!.value).toBe(6);
    model.dispatch("ADD_MERGE", { sheet: "Sheet1", zone: toZone("A1:A3") });

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
    const sheet1 = model["workbook"].visibleSheets[0];
    expect(getCell(model, "A4")!.value).toBe(6);
    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A1:A3"), force: true });

    expect(getCell(model, "A1")!.value).toBe(1);
    expect(getCell(model, "A2")).toBeNull();
    expect(getCell(model, "A3")).toBeNull();
    expect(getCell(model, "A4")!.value).toBe(1);
  });

  test("merging => setting background color => unmerging", () => {
    const model = new Model();
    const sheet1 = model["workbook"].visibleSheets[0];
    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 0, right: 1, bottom: 0 });

    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A1:B1") });
    model.dispatch("SET_FORMATTING", {
      sheet: sheet1,
      target: [{ left: 0, right: 1, top: 0, bottom: 0 }],
      style: { fillColor: "red" },
    });

    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    model.dispatch("REMOVE_MERGE", { sheet: sheet1, zone: toZone("A1:B1") });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("merging => setting border => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getSheets()[0].id;
    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 0, right: 1, bottom: 0 });

    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A1:B1") });
    model.dispatch("SET_FORMATTING", {
      sheet: sheet1,
      target: model.getters.getSelectedZones(),
      border: "external",
    });
    const line = ["thin", "#000"];
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });

    model.dispatch("REMOVE_MERGE", { sheet: sheet1, zone: toZone("A1:B1") });
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
  });

  test("setting border to topleft => merging => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getSheets()[0].id;
    model.dispatch("SET_FORMATTING", {
      sheet: sheet1,
      target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
      border: "external",
    });
    const line = ["thin", "#000"];
    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A1:B1") });
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
    model.dispatch("REMOVE_MERGE", { sheet: sheet1, zone: toZone("A1:B1") });
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
  });

  test("selecting cell next to merge => expanding selection => merging => unmerging", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:A2"] }],
    });
    const sheet1 = model["workbook"].visibleSheets[0];

    //merging
    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A1:A3") });
    const mergeId = model["workbook"].activeSheet.mergeCellMap.A1;
    expect(mergeId).toBeGreaterThan(0);
    expect(model["workbook"].activeSheet.mergeCellMap.A2).toBe(mergeId);

    // unmerge. there should not be any merge left
    model.dispatch("REMOVE_MERGE", { sheet: sheet1, zone: toZone("A1:A3") });
    expect(model["workbook"].activeSheet.mergeCellMap).toEqual({});
    expect(model["workbook"].activeSheet.merges).toEqual({});
  });

  test("can undo and redo a merge", () => {
    const model = new Model();
    const sheet1 = model["workbook"].visibleSheets[0];

    // select B2:B3 and merge
    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("B2:B3") });

    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model["workbook"].activeSheet.merges).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: "B2" },
    });

    // undo
    model.dispatch("UNDO");
    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual([]);
    expect(Object.keys(model["workbook"].activeSheet.merges)).toEqual([]);

    // redo
    model.dispatch("REDO");
    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model["workbook"].activeSheet.merges).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: "B2" },
    });
  });

  test("merge, undo, select, redo: correct selection", () => {
    const model = new Model();
    const sheet1 = model["workbook"].visibleSheets[0];

    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("B2:B3") });
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
    const sheet1 = model["workbook"].visibleSheets[0];

    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("B2:B3") });
    model.dispatch("REMOVE_MERGE", { sheet: sheet1, zone: toZone("B2:B3") });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 }); // B2
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 1, left: 1, right: 1, top: 1 }]);
    model.dispatch("UNDO");
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
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
