import { DEFAULT_BORDER_DESC } from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { toCartesian, toXC, toZone } from "../../src/helpers/index";
import { CommandResult } from "../../src/types/index";
import {
  addColumns,
  deleteRows,
  deleteSheet,
  duplicateSheet,
  freezeColumns,
  freezeRows,
  merge,
  moveAnchorCell,
  redo,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setFormatting,
  setZoneBorders,
  undo,
  unMerge,
} from "../test_helpers/commands_helpers";
import {
  getBorder,
  getCell,
  getCellContent,
  getEvaluatedCell,
  getMerges,
  getSelectionAnchorCellXc,
  getStyle,
} from "../test_helpers/getters_helpers";
import {
  createModel,
  getMergeCellMap,
  makeTestComposerStore,
  XCToMergeCellMap,
} from "../test_helpers/helpers";

function getCellsXC(model: Model): string[] {
  return model.getters.getCells(model.getters.getActiveSheetId()).map((cell) => {
    const { col, row } = model.getters.getCellPosition(cell.id);
    return toXC(col, row);
  });
}

describe("merges", () => {
  test("can merge two cells", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");

    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);
    const sheet1 = model.getters.getSheetIds()[0];
    await merge(model, "B2:B3");

    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(getCellContent(model, "B2", sheet1)).toBe("b2");
    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["B2", "B3"]));
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1 },
    });
  });

  test("can unmerge two cells", async () => {
    const model = await createModel({
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { B2: "b2" }, merges: ["B2:B3"] }],
    });
    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["B2", "B3"]));
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1 },
    });

    await selectCell(model, "B2");
    await unMerge(model, "B2:B3");
    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);
  });

  test("add a merge cells in a duplicated sheet", async () => {
    const model = await createModel();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    await merge(model, "C2:C3", firstSheetId);
    await duplicateSheet(model, firstSheetId, secondSheetId);
    await merge(model, "B2:B3", secondSheetId);
    expect(model.getters.getMerges(secondSheetId)).toEqual([
      { ...toZone("C2:C3"), id: 2 },
      { ...toZone("B2:B3"), id: 3 },
    ]);
    expect(model.getters.getMerge({ sheetId: secondSheetId, col: 2, row: 1 })?.id).toBe(2);
    expect(model.getters.getMerge({ sheetId: secondSheetId, col: 1, row: 1 })?.id).toBe(3);
  });

  test("delete a duplicated sheet with merge", async () => {
    const model = await createModel();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    await merge(model, "C2:C3", firstSheetId);
    await duplicateSheet(model, firstSheetId, secondSheetId);
    await deleteSheet(model, secondSheetId);
    expect(model.getters.getMerges(secondSheetId)).toEqual([]);
  });

  test("a single cell is not merged", async () => {
    const model = await createModel();
    await setCellContent(model, "B2", "b2");

    expect(Object.keys(getMerges(model))).toEqual([]);

    await merge(model, "B2:B2");

    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);
  });

  test("merge outside the sheet is refused", async () => {
    const model = await createModel({ sheets: [{ colNumber: 2, rowNumber: 2 }] });
    const sheetId = model.getters.getActiveSheetId();
    expect(await merge(model, "A1:C3")).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
    const { col, row } = toCartesian("A1");

    expect(model.getters.getMerge({ sheetId, col, row })).toBeUndefined();
  });

  test("editing a merge cell actually edits the top left", async () => {
    const model = await createModel({
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { B2: "b2" }, merges: ["B2:C3"] }],
    });
    const composerStore = makeTestComposerStore(model);

    await selectCell(model, "C3");
    expect(getSelectionAnchorCellXc(model)).toBe("C3");
    composerStore.startEdition();
    expect(composerStore.currentContent).toBe("b2");
    composerStore.setCurrentContent("new value");
    composerStore.stopEdition();
    expect(getCellContent(model, "B2")).toBe("new value");
  });

  test("setting a style to a merge edit all the cells", async () => {
    const model = await createModel({
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { B2: "b2" }, merges: ["B2:C3"] }],
    });

    await selectCell(model, "C3");
    expect(getSelectionAnchorCellXc(model)).toBe("C3");
    expect(getCellsXC(model)).toEqual(["B2"]);
    expect(getCell(model, "B2")!.style).not.toBeDefined();

    await setFormatting(model, "B2:C3", { fillColor: "#333" });

    expect(getCellsXC(model)).toEqual(["B2", "B3", "C2", "C3"]);
    expect(getCell(model, "B2")!.style).toBeDefined();
  });

  test("when moving in a merge, selected cell is topleft", async () => {
    const model = await createModel({
      sheets: [
        {
          id: "s1",
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: "b2" },
          merges: ["B2:C3"],
        },
      ],
    });
    await selectCell(model, "C4");
    expect(getSelectionAnchorCellXc(model)).toBe("C4");
    expect(getCell(model, "C4")).toBeUndefined(); // no active cell in C4
    await moveAnchorCell(model, "up");
    expect(getSelectionAnchorCellXc(model)).toBe("C3");
    expect(model.getters.getSelection().anchor).toEqual({
      cell: {
        col: 2,
        row: 2,
      },
      zone: toZone("B2:C3"),
    });
  });

  test("merge style is correct for inactive sheets", async () => {
    const model = await createModel({
      sheets: [
        { id: "1", colNumber: 1, rowNumber: 1, cells: { A1: "1" }, styles: { A1: 1 } },
        {
          id: "2",
          colNumber: 3,
          rowNumber: 3,
          merges: ["A1:B1"],
          cells: { A1: "2", B1: "" },
          styles: { "A1:B1": 2 },
        },
      ],
      styles: { 1: { fillColor: "#f2f2f2" }, 2: { fillColor: "#a2a2a2" } },
    });
    const [, sheet2Id] = model.getters.getSheetIds();
    expect(sheet2Id).not.toBe(model.getters.getActiveSheetId());
    await deleteRows(model, [2], sheet2Id);
    expect(model.getters.getCellStyle({ sheetId: sheet2Id, col: 0, row: 0 })).toEqual({
      fillColor: "#a2a2a2",
    });
  });

  test("Merge with two zone overlap is now allowed", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    expect(
      model.dispatch("ADD_MERGE", { sheetId, target: [toZone("A1:B2"), toZone("A2:B3")] })
    ).toBeCancelledBecause(CommandResult.MergeOverlap);
  });

  test("Cannot merge through frozen panes, even if forced", async () => {
    const model = await createModel();
    await freezeRows(model, 3);
    expect(await merge(model, "F3:G4")).toBeCancelledBecause(CommandResult.FrozenPaneOverlap);
    await freezeColumns(model, 2);
    expect(await merge(model, "B3:C4")).toBeCancelledBecause(CommandResult.FrozenPaneOverlap);
  });

  test("properly compute if a merge is destructive or not", async () => {
    const sheetId = "42";
    const model = await createModel({
      sheets: [{ id: sheetId, colNumber: 10, rowNumber: 10, cells: { B2: "b2" } }],
    });
    // B2 is not top left, so it is destructive

    expect(await merge(model, "A1:C4", sheetId, false)).toBeCancelledBecause(
      CommandResult.MergeIsDestructive
    );

    // B2 is top left, so it is not destructive
    expect(await merge(model, "B2:C4", sheetId, false)).toBeSuccessfullyDispatched();
  });

  test("a merge with only style should not be considered destructive", async () => {
    const sheetId = "42";
    const model = await createModel({
      sheets: [{ id: sheetId, colNumber: 10, rowNumber: 10, styles: { B2: 1 } }],
      styles: { 1: {} },
    });
    expect(await merge(model, "A1:C4")).toBeSuccessfullyDispatched();
  });

  test("merging cells with values will do nothing if not forced", async () => {
    const model = await createModel({
      sheets: [
        {
          id: "Sheet1",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: "1",
            A2: "2",
            A3: "3",
            A4: "=sum(A1:A3)",
          },
        },
      ],
    });
    expect(getEvaluatedCell(model, "A4").value).toBe(6);
    await merge(model, "A1:A3", "Sheet1", false);

    expect(getEvaluatedCell(model, "A1").value).toBe(1);
    expect(getEvaluatedCell(model, "A2").value).toBe(2);
    expect(getEvaluatedCell(model, "A3").value).toBe(3);
    expect(getEvaluatedCell(model, "A4").value).toBe(6);
  });

  test("merging cells with values remove them if forced", async () => {
    const model = await createModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: "1",
            A2: "2",
            A3: "3",
            A4: "=sum(A1:A3)",
          },
        },
      ],
    });
    const sheet1 = model.getters.getSheetIds()[0];
    expect(getEvaluatedCell(model, "A4").value).toBe(6);
    await merge(model, "A1:A3", sheet1, true);

    expect(getEvaluatedCell(model, "A1").value).toBe(1);
    expect(getCell(model, "A2")).toBeUndefined();
    expect(getCell(model, "A3")).toBeUndefined();
    expect(getEvaluatedCell(model, "A4").value).toBe(1);
  });

  test("merging => unmerging  : cell styles are overridden even if the top left cell had no style", async () => {
    const model = await createModel();

    await setFormatting(model, "B1", { fillColor: "red" });

    await merge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "B1")).toEqual({});
    await unMerge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({});
    expect(getStyle(model, "B1")).toEqual({});
  });

  test("merging => setting background color => unmerging", async () => {
    const model = await createModel();

    await setAnchorCorner(model, "B1");
    expect(model.getters.getSelectedZones()[0]).toEqual({ top: 0, left: 0, right: 1, bottom: 0 });

    await merge(model, "A1:B1");
    await setFormatting(model, "A1:B1", { fillColor: "red" });

    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    await merge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("setting background color => merging => unmerging", async () => {
    const model = await createModel();
    await setAnchorCorner(model, "B1");
    await setFormatting(model, "A1:B1", { fillColor: "red" });

    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    await merge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    await merge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("setting background color to topleft => merging => unmerging", async () => {
    const model = await createModel();
    await setFormatting(model, "A1", { fillColor: "red" });
    await setAnchorCorner(model, "B1");

    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });

    await merge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });

    await merge(model, "A1:B1");
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("merging => setting border => unmerging", async () => {
    const model = await createModel();
    await merge(model, "A1:B1");
    await setZoneBorders(model, { position: "external" }, ["A1"]);
    expect(getBorder(model, "A1")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B1")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });

    await unMerge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B1")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
  });

  test("setting border => merging => unmerging", async () => {
    const model = await createModel();
    await setAnchorCorner(model, "B1");

    await setZoneBorders(model, { position: "external" });
    expect(getBorder(model, "A1")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B1")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    await merge(model, "A1:B1");
    await merge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B1")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
  });

  test("setting border to topleft => merging => unmerging", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "external" }, ["A1"]);
    await merge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B1")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    await unMerge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B1")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
  });

  test("setting border to  => setting style => merging => unmerging", async () => {
    const model = await createModel();
    await setZoneBorders(model, { position: "external" }, ["A1"]);
    await setFormatting(model, "A1", { fillColor: "red" });
    await merge(model, "A1:B1");

    expect(getBorder(model, "A1")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B1")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
    await merge(model, "A1:B1");
    expect(getBorder(model, "A1")).toEqual({
      left: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getBorder(model, "B1")).toEqual({
      right: DEFAULT_BORDER_DESC,
      bottom: DEFAULT_BORDER_DESC,
      top: DEFAULT_BORDER_DESC,
    });
    expect(getStyle(model, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model, "B1")).toEqual({ fillColor: "red" });
  });

  test("selecting cell next to merge => expanding selection => merging => unmerging", async () => {
    const model = await createModel({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:A2"] }],
    });

    //merging
    await merge(model, "A1:A3");
    const mergeId = getMergeCellMap(model)[0][0];
    expect(mergeId).toBeGreaterThan(0);
    expect(getMergeCellMap(model)[0][1]).toBe(mergeId);

    // unmerge. there should not be any merge left
    await unMerge(model, "A1:A3");
    expect(getMergeCellMap(model)).toEqual({});
    expect(getMerges(model)).toEqual({});
  });

  test("can undo and redo a merge", async () => {
    const model = await createModel();

    // select B2:B3 and merge
    await merge(model, "B2:B3");

    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["B2", "B3"]));
    expect(getMerges(model)).toEqual({
      "1": { bottom: 2, id: 1, left: 1, right: 1, top: 1 },
    });

    // undo
    await undo(model);
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(Object.keys(getMerges(model))).toEqual([]);

    // redo
    await redo(model);
    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["B2", "B3"]));
    expect(getMerges(model)).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1 },
    });
  });

  test("merge, undo, select, redo: correct selection", async () => {
    const model = await createModel();

    await merge(model, "B2:B3");
    await selectCell(model, "B2"); // B2
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
    await undo(model);
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
    await selectCell(model, "B2"); // B2

    expect(model.getters.getSelection().zones).toEqual([{ bottom: 1, left: 1, right: 1, top: 1 }]);
    await redo(model);
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
  });

  test("merge, unmerge, select, undo: correct selection", async () => {
    const model = await createModel();

    await merge(model, "B2:B3");
    await unMerge(model, "B2:B3");
    await selectCell(model, "B2"); // B2
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 1, left: 1, right: 1, top: 1 }]);
    await undo(model);
    expect(model.getters.getSelection().zones).toEqual([{ bottom: 2, left: 1, right: 1, top: 1 }]);
  });

  test("Cannot add a merge in a non-existing sheet", async () => {
    const model = await createModel();
    expect(await merge(model, "A1:A2", "invalid")).toBeCancelledBecause(
      CommandResult.InvalidSheetId
    );
  });

  test("un-merge zone when there is none is refused", async () => {
    const model = await createModel();
    expect(await unMerge(model, "A1:A2")).toBeCancelledBecause(CommandResult.InvalidTarget);
  });

  test("un-merge zone overlapping another merge is refused", async () => {
    const model = await createModel();
    await merge(model, "A2:A3");
    expect(await unMerge(model, "A1:A2")).toBeCancelledBecause(CommandResult.InvalidTarget);
  });

  test("import merge with style", async () => {
    const model = await createModel({
      sheets: [
        {
          id: "sheet1",
          colNumber: 4,
          rowNumber: 5,
          borders: { B4: 1 },
          styles: { B4: 1 },
          merges: ["B4:C5"],
        },
      ],
      styles: { 1: { textColor: "#fe0000" } },
      borders: { 1: { top: { style: "medium", color: "#ff0000" } } },
    });
    const sheetId = model.getters.getActiveSheetId();
    let col: number, row: number;
    ({ col, row } = toCartesian("B4"));
    expect(model.getters.getMerge({ sheetId, col, row })).toBeTruthy();
    ({ col, row } = toCartesian("C4"));
    expect(model.getters.getMerge({ sheetId, col, row })).toBeTruthy();
    expect(getCell(model, "B4")!.style).toEqual({ textColor: "#fe0000" });
    expect(getBorder(model, "B4")).toEqual({ top: { style: "medium", color: "#ff0000" } });
    await unMerge(model, "B4:C5");
    expect(getCell(model, "B4")!.style).toEqual({ textColor: "#fe0000" });
    expect(getCell(model, "C4")!.style).toEqual({ textColor: "#fe0000" });
    expect(getBorder(model, "B4")).toEqual({ top: { style: "medium", color: "#ff0000" } });
    expect(getBorder(model, "C4")).toEqual({ top: { style: "medium", color: "#ff0000" } });
    expect(getBorder(model, "C5")).toBeNull();
  });

  test("update content cell of merged cell, other than top left", async () => {
    const model = await createModel();
    await merge(model, "A1:A2");
    expect(await setCellContent(model, "A2", "hello")).toBeCancelledBecause(
      CommandResult.CellIsMerged
    );
    expect(getCell(model, "A2")).toBeUndefined();
  });

  test("move duplicated merge when col is inserted before", async () => {
    const model = await createModel();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    await merge(model, "C1:C2");
    await duplicateSheet(model, firstSheetId, secondSheetId);
    await addColumns(model, "before", "A", 1, "42");
    expect(model.getters.getMerges(firstSheetId)).toEqual([{ ...toZone("C1:C2"), id: 1 }]);
    expect(model.getters.getMerges(secondSheetId)).toEqual([{ ...toZone("D1:D2"), id: 2 }]);
  });

  describe("isSingleCellOrMerge getter", () => {
    test("simple zone without merges", async () => {
      const model = await createModel();
      const sheetId = model.getters.getActiveSheetId();
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1"))).toBe(true);
      await setCellContent(model, "A1", "hello");
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1"))).toBe(true);
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1:B1"))).toBe(false);
    });

    test("merged zones", async () => {
      const model = await createModel();
      const sheetId = model.getters.getActiveSheetId();
      await merge(model, "A1:A2");
      await merge(model, "B1:B2");
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1:A2"))).toBe(true);
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1:B2"))).toBe(false);
      expect(model.getters.isSingleCellOrMerge(sheetId, toZone("A1:A3"))).toBe(false);
    });

    test("zone outside of sheet", async () => {
      const model = await createModel();
      const sheetId = model.getters.getActiveSheetId();
      const singleCellZone = { top: 999, bottom: 999, left: 999, right: 999 };
      const zone = { top: 0, bottom: 999, left: 0, right: 999 };
      expect(model.getters.isSingleCellOrMerge(sheetId, singleCellZone)).toBe(true);
      expect(model.getters.isSingleCellOrMerge(sheetId, zone)).toBe(false);
    });
  });
});
