import { GridModel, Workbook, CURRENT_VERSION } from "../../src/model/index";
import "../canvas.mock";
import { toZone } from "../../src/helpers";

describe("merges", () => {
  test("can merge two cells", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "b2" });
    model.dispatch({ type: "SET_VALUE", xc: "B3", text: "b3" });

    expect(Object.keys(model.workbook.cells)).toEqual(["B2", "B3"]);
    expect(Object.keys(model.workbook.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.workbook.merges)).toEqual([]);

    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("B2:B3") });

    expect(Object.keys(model.workbook.cells)).toEqual(["B2"]);
    expect(model.workbook.cells.B2.content).toBe("b2");
    expect(Object.keys(model.workbook.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model.workbook.merges).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1, topLeft: "B2" }
    });
  });

  test("can unmerge two cells", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:B3"]
        }
      ]
    });
    expect(Object.keys(model.workbook.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model.workbook.merges).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1, topLeft: "B2" }
    });

    model.dispatch({ type: "SELECT_CELL", col: 1, row: 1 });
    model.dispatch({ type: "REMOVE_MERGE", sheet: "Sheet1", zone: toZone("B2:B3") });
    expect(Object.keys(model.workbook.cells)).toEqual(["B2"]);
    expect(Object.keys(model.workbook.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.workbook.merges)).toEqual([]);
  });

  test("a single cell is not merged", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "B2", text: "b2" });

    expect(Object.keys(model.workbook.merges)).toEqual([]);

    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("B2:B2") });

    expect(Object.keys(model.workbook.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.workbook.merges)).toEqual([]);
  });

  test("editing a merge cell actually edits the top left", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"]
        }
      ]
    });

    model.dispatch({ type: "SELECT_CELL", col: 2, row: 2 });
    expect(model.workbook.activeXc).toBe("C3");
    model.dispatch({ type: "START_EDITION" });
    expect(model.workbook.currentContent).toBe("b2");
    model.workbook.currentContent = "new value";
    model.dispatch({ type: "STOP_EDITION" });
    expect(model.workbook.cells["B2"].content).toBe("new value");
  });

  test("setting a style to a merge edit all the cells", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"]
        }
      ]
    });

    model.dispatch({ type: "SELECT_CELL", col: 2, row: 2 });
    expect(model.workbook.activeXc).toBe("C3");
    expect(Object.keys(model.workbook.cells)).toEqual(["B2"]);
    expect(model.workbook.cells["B2"].style).not.toBeDefined();

    model.dispatch({
      type: "SET_FORMATTING",
      sheet: "Sheet1",
      target: model.getters.getSelectedZones(),
      style: { fillColor: "#333" }
    });

    expect(Object.keys(model.workbook.cells)).toEqual(["B2", "B3", "C2", "C3"]);
    expect(model.workbook.cells["B2"].style).toBeDefined();
  });

  test("when moving in a merge, selected cell is topleft", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"]
        }
      ]
    });

    model.dispatch({ type: "SELECT_CELL", col: 2, row: 3 });
    expect(model.workbook.activeXc).toBe("C4");
    expect(model.state.selectedCell).toBeNull(); // no active cell in C4
    model.dispatch({ type: "MOVE_POSITION", deltaX: 0, deltaY: -1 });
    expect(model.workbook.activeXc).toBe("C3");
    expect(model.state.selectedCell!.xc).toBe("B2");
  });

  test("properly compute if a merge is destructive or not", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } }
        }
      ]
    });
    // B2 is not top left, so it is destructive
    expect(model.getters.isMergeDestructive(toZone("A1:C4"))).toBeTruthy();

    // B2 is top left, so it is not destructive
    expect(model.getters.isMergeDestructive(toZone("B2:C4"))).toBeFalsy();
  });

  test("a merge with only style should not be considered destructive", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { style: 1 } }
        }
      ],
      styles: { 1: {} }
    });
    model.workbook.selection.zones = [
      {
        left: 0,
        top: 0,
        right: 2,
        bottom: 2
      }
    ];
    expect(model.getters.isMergeDestructive(toZone("A1:C4"))).toBeFalsy();
  });

  test("merging cells with values remove them", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "1" },
            A2: { content: "2" },
            A3: { content: "3" },
            A4: { content: "=sum(A1:A3)" }
          }
        }
      ]
    });
    expect(model.workbook.cells["A4"].value).toBe(6);
    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("A1:A3") });

    expect(model.workbook.cells["A1"].value).toBe(1);
    expect(model.workbook.cells["A2"]).toBeUndefined();
    expect(model.workbook.cells["A3"]).toBeUndefined();
    expect(model.workbook.cells["A4"].value).toBe(1);
  });

  test("merging => setting background color => unmerging", () => {
    const model = new GridModel();
    model.dispatch({ type: "ALTER_SELECTION", cell: [1, 0] });

    expect(model.workbook.selection.zones[0]).toEqual({ top: 0, left: 0, right: 1, bottom: 0 });

    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("A1:B1") });
    model.dispatch({
      type: "SET_FORMATTING",
      sheet: "Sheet1",
      target: [{ left: 0, right: 1, top: 0, bottom: 0 }],
      style: { fillColor: "red" }
    });

    expect(getStyle(model.workbook, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model.workbook, "B1")).toEqual({ fillColor: "red" });

    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("A1:B1") });
    expect(getStyle(model.workbook, "A1")).toEqual({ fillColor: "red" });
    expect(getStyle(model.workbook, "B1")).toEqual({ fillColor: "red" });
  });

  test("selecting cell next to merge => expanding selection => merging => unmerging", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:A2"] }]
    });

    //merging
    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("A1:A3") });
    const mergeId = model.workbook.mergeCellMap.A1;
    expect(mergeId).toBeGreaterThan(0);
    expect(model.workbook.mergeCellMap.A2).toBe(mergeId);

    // unmerge. there should not be any merge left
    model.dispatch({ type: "REMOVE_MERGE", sheet: "Sheet1", zone: toZone("A1:A3") });
    expect(model.workbook.mergeCellMap).toEqual({});
    expect(model.workbook.merges).toEqual({});
  });

  test("can undo and redo a merge", () => {
    const model = new GridModel();

    // select B2:B3 and merge
    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("B2:B3") });

    expect(Object.keys(model.workbook.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model.workbook.merges).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1, topLeft: "B2" }
    });

    // undo
    model.undo();
    expect(Object.keys(model.workbook.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.workbook.merges)).toEqual([]);

    // redo
    model.redo();
    expect(Object.keys(model.workbook.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model.workbook.merges).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1, topLeft: "B2" }
    });
  });
});

function getStyle(state: Workbook, xc: string) {
  const cell = state.cells[xc];
  return cell && cell.style && state.styles[cell.style];
}
