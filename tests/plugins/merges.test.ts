import { Component, hooks, tags } from "@odoo/owl";
import { Spreadsheet } from "../../src";
import { toCartesian, toXC, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { CommandResult, Style } from "../../src/types/index";
import {
  addColumns,
  deleteRows,
  merge,
  redo,
  selectCell,
  setCellContent,
  undo,
  unMerge,
} from "../test_helpers/commands_helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import {
  getActiveXc,
  getBorder,
  getCell,
  getCellContent,
  getMerges,
} from "../test_helpers/getters_helpers";
import {
  getMergeCellMap,
  makeTestFixture,
  target,
  toPosition,
  XCToMergeCellMap,
} from "../test_helpers/helpers";

const { xml } = tags;
const { useRef, useSubEnv } = hooks;

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
    merge(model, "B2:B3");

    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(getCellContent(model, "B2", sheet1)).toBe("b2");
    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["B2", "B3"]));
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: toPosition("B2") },
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
    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["B2", "B3"]));
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: toPosition("B2") },
    });

    selectCell(model, "B2");
    unMerge(model, "B2:B3");
    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);
  });

  test("add a merge cells in a duplicated sheet", () => {
    const model = new Model();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    merge(model, "C2:C3", firstSheetId);
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: firstSheetId,
      sheetIdTo: secondSheetId,
    });
    merge(model, "B2:B3", secondSheetId);
    expect(model.getters.getMerges(secondSheetId)).toEqual([
      { ...toZone("C2:C3"), id: 1, topLeft: toPosition("C2") },
      { ...toZone("B2:B3"), id: 2, topLeft: toPosition("B2") },
    ]);
  });

  test("a single cell is not merged", () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");

    expect(Object.keys(getMerges(model))).toEqual([]);

    merge(model, "B2:B2");

    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);
  });

  test("merge outside the sheet is refused", () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
        },
      ],
    });
    const sheetId = model.getters.getActiveSheetId();
    expect(merge(model, "A1:C3")).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
    expect(model.getters.getMerge(sheetId, ...toCartesian("A1"))).toBeUndefined();
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

    selectCell(model, "C3");
    expect(getActiveXc(model)).toBe("C3");
    model.dispatch("START_EDITION");
    expect(model.getters.getCurrentContent()).toBe("b2");
    model.dispatch("SET_CURRENT_CONTENT", { content: "new value" });
    model.dispatch("STOP_EDITION");
    expect(getCellContent(model, "B2")).toBe("new value");
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

    selectCell(model, "C3");
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
          id: "s1",
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"],
        },
      ],
    });

    selectCell(model, "C4");
    expect(getActiveXc(model)).toBe("C4");
    expect(model.getters.getActiveCell()).toBeUndefined(); // no active cell in C4
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -1 });
    expect(getActiveXc(model)).toBe("C3");
    expect(model.getters.getCellPosition(model.getters.getActiveCell()!.id)).toEqual({
      col: 1,
      row: 1,
      sheetId: "s1",
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
    deleteRows(model, [2], sheet2.id);
    const cell = getCell(model, "A1", sheet2.id);
    expect(model.getters.getCellStyle(cell!)).toEqual({
      fillColor: "#a2a2a2",
    });
  });

  test("Merge with two zone overlap is now allowed", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    expect(
      model.dispatch("ADD_MERGE", { sheetId, target: [toZone("A1:B2"), toZone("A2:B3")] })
    ).toBeCancelledBecause(CommandResult.MergeOverlap);
  });

  test("properly compute if a merge is destructive or not", () => {
    const sheetId = "42";
    const model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
        },
      ],
    });
    // B2 is not top left, so it is destructive

    expect(merge(model, "A1:C4")).toBeCancelledBecause(CommandResult.MergeIsDestructive);

    // B2 is top left, so it is not destructive
    expect(merge(model, "B2:C4")).toBeSuccessfullyDispatched();
  });

  test("a merge with only style should not be considered destructive", () => {
    const sheetId = "42";
    const model = new Model({
      sheets: [
        {
          id: sheetId,
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { style: 1 } },
        },
      ],
      styles: { 1: {} },
    });
    expect(merge(model, "A1:C4")).toBeSuccessfullyDispatched();
  });

  test("merging destructively a selection ask for confirmation", async () => {
    const askConfirmation = jest.fn();
    class Parent extends Component<any> {
      static template = xml/* xml */ `<Spreadsheet t-ref="spreadsheet"/>`;
      static components = { Spreadsheet };
      spreadsheet: any = useRef("spreadsheet");
      setup() {
        useSubEnv({
          askConfirmation,
        });
      }
      get model(): Model {
        return this.spreadsheet.comp.model;
      }
    }
    const parent = new Parent();
    const fixture = makeTestFixture();
    await parent.mount(fixture);
    const model = parent.model;
    setCellContent(model, "B2", "b2");
    model.dispatch("ALTER_SELECTION", { cell: [5, 5] });
    await simulateClick(".o-merge-tool");
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
    expect(getCell(model, "A4")!.evaluated.value).toBe(6);
    merge(model, "A1:A3");

    expect(getCell(model, "A1")!.evaluated.value).toBe(1);
    expect(getCell(model, "A2")!.evaluated.value).toBe(2);
    expect(getCell(model, "A3")!.evaluated.value).toBe(3);
    expect(getCell(model, "A4")!.evaluated.value).toBe(6);
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
    expect(getCell(model, "A4")!.evaluated.value).toBe(6);
    model.dispatch("ADD_MERGE", { sheetId: sheet1, target: target("A1:A3"), force: true });

    expect(getCell(model, "A1")!.evaluated.value).toBe(1);
    expect(getCell(model, "A2")).toBeUndefined();
    expect(getCell(model, "A3")).toBeUndefined();
    expect(getCell(model, "A4")!.evaluated.value).toBe(1);
  });

  test("merging => setting background color => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });

    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 0, right: 1, bottom: 0 });

    merge(model, "A1:B1");
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: [{ left: 0, right: 1, top: 0, bottom: 0 }],
      style: { fillColor: "red" },
    });

    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    merge(model, "A1:B1");
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

    merge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    merge(model, "A1:B1");
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

    merge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    merge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("merging => setting border => unmerging", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    merge(model, "A1:B1");
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: [toZone("A1")],
      border: "external",
    });
    const line = ["thin", "#000"];
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });

    unMerge(model, "A1:B1");
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
    merge(model, "A1:B1");
    merge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
  });

  test("setting border to topleft => merging => unmerging", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: [toZone("A1")],
      border: "external",
    });
    const line = ["thin", "#000"];
    merge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
    unMerge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
  });

  test("setting border to topleft => setting style => merging => unmerging", () => {
    const model = new Model();
    const sheet1 = model.getters.getVisibleSheets()[0];
    model.dispatch("SET_FORMATTING", {
      sheetId: sheet1,
      target: [toZone("A1")],
      border: "external",
      style: { fillColor: "red" },
    });
    const line = ["thin", "#000"];
    merge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
    merge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({ left: line, bottom: line, top: line });
    expect(getBorder(model, "B1")).toEqual({ right: line, bottom: line, top: line });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("selecting cell next to merge => expanding selection => merging => unmerging", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:A2"] }],
    });

    //merging
    merge(model, "A1:A3");
    const mergeId = getMergeCellMap(model)[0][0];
    expect(mergeId).toBeGreaterThan(0);
    expect(getMergeCellMap(model)[0][1]).toBe(mergeId);

    // unmerge. there should not be any merge left
    unMerge(model, "A1:A3");
    expect(getMergeCellMap(model)).toEqual({});
    expect(getMerges(model)).toEqual({});
  });

  test("can undo and redo a merge", () => {
    const model = new Model();

    // select B2:B3 and merge
    merge(model, "B2:B3");

    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["B2", "B3"]));
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1, topLeft: toPosition("B2") },
    });

    // undo
    undo(model);
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);

    // redo
    redo(model);
    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["B2", "B3"]));
    expect(getMerges(model)).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1, topLeft: toPosition("B2") },
    });
  });

  test("merge, undo, select, redo: correct selection", () => {
    const model = new Model();

    merge(model, "B2:B3");
    selectCell(model, "B2"); // B2
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
    undo(model);
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
    selectCell(model, "B2"); // B2

    expect(model.getters.getSelection().zones).toEqual([{ bottom: 1, left: 1, right: 1, top: 1 }]);
    redo(model);
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
  });

  test("merge, unmerge, select, undo: correct selection", () => {
    const model = new Model();

    merge(model, "B2:B3");
    unMerge(model, "B2:B3");
    selectCell(model, "B2"); // B2
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 1, left: 1, right: 1, top: 1 }]);
    undo(model);
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
  });

  test("Cannot add a merge in a non-existing sheet", () => {
    const model = new Model();
    expect(merge(model, "A1:A2", "invalid")).toBeCancelledBecause(CommandResult.InvalidSheetId);
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
    expect(model.getters.getMerge(sheetId, ...toCartesian("B4"))).toBeTruthy();
    expect(model.getters.getMerge(sheetId, ...toCartesian("C4"))).toBeTruthy();
    expect(getCell(model, "B4")!.style).toEqual({ textColor: "#fe0000" });
    expect(getBorder(model, "B4")).toEqual({ top: ["thin", "#000"] });
    unMerge(model, "B4:C5");
    expect(getCell(model, "B4")!.style).toEqual({ textColor: "#fe0000" });
    expect(getCell(model, "C4")!.style).toEqual({ textColor: "#fe0000" });
    expect(getBorder(model, "B4")).toEqual({ top: ["thin", "#000"] });
    expect(getBorder(model, "C4")).toEqual({ top: ["thin", "#000"] });
    expect(getBorder(model, "C5")).toBeNull();
  });

  test("update content cell of merged cell, other than top left", () => {
    const model = new Model();
    merge(model, "A1:A2");
    expect(setCellContent(model, "A2", "hello")).toBeCancelledBecause(CommandResult.CellIsMerged);
    expect(getCell(model, "A2")).toBeUndefined();
  });

  test("move duplicated merge when col is inserted before", () => {
    const model = new Model();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    merge(model, "C1:C2");
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: firstSheetId,
      sheetIdTo: secondSheetId,
    });
    addColumns(model, "before", "A", 1, "42");
    expect(model.getters.getMerges(firstSheetId)).toEqual([
      { ...toZone("C1:C2"), id: 1, topLeft: toPosition("C1") },
    ]);
    expect(model.getters.getMerges(secondSheetId)).toEqual([
      { ...toZone("D1:D2"), id: 2, topLeft: toPosition("D1") },
    ]);
  });

  describe("isSingleCellOrMerge getter", () => {
    test("simple zone without merges", () => {
      const model = new Model();
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1"))).toBe(true);
      setCellContent(model, "A1", "hello");
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1"))).toBe(true);
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1:B1"))).toBe(false);
    });

    test("merged zones", () => {
      const model = new Model();
      const sheetId = model.getters.getActiveSheetId();
      merge(model, "A1:A2");
      merge(model, "B1:B2");
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1:A2"))).toBe(true);
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1:B2"))).toBe(false);
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1:A3"))).toBe(false);
    });

    test("zone outside of sheet", () => {
      const model = new Model();
      const sheetId = model.getters.getActiveSheetId();
      const singleCellZone = { top: 999, bottom: 999, left: 999, right: 999 };
      const zone = { top: 0, bottom: 999, left: 0, right: 999 };
      expect(model.getters.isSingleCellOrMerge(sheetId, singleCellZone)).toBe(true);
      expect(model.getters.isSingleCellOrMerge(sheetId, zone)).toBe(false);
    });
  });
});

function getStyle(model: Model, xc: string): Style {
  const cell = getCell(model, xc)!;
  return cell && model.getters.getCellStyle(cell);
}
