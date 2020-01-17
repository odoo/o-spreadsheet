import { GridModel } from "../../src/model/index";

let n = 0;

function observeModel(model: GridModel) {
  n = 0;
  model.on("update", null, () => n++);
}

describe("merges", () => {
  test("can merge two cells", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" }, B3: { content: "b3" } }
        }
      ]
    });
    observeModel(model);
    expect(Object.keys(model.state.cells)).toEqual(["B2", "B3"]);
    expect(Object.keys(model.state.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.state.merges)).toEqual([]);

    model.selectCell(1, 1);
    expect(n).toBe(1);
    model.updateSelection(1, 2);
    expect(n).toBe(2);
    model.mergeSelection();
    expect(n).toBe(3);

    expect(Object.keys(model.state.cells)).toEqual(["B2"]);
    expect(model.state.cells.B2.content).toBe("b2");
    expect(Object.keys(model.state.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model.state.merges).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1, topLeft: "B2" }
    });
  });

  test("can unmerge two cells", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:B3"]
        }
      ]
    });
    observeModel(model);

    expect(Object.keys(model.state.mergeCellMap)).toEqual(["B2", "B3"]);
    expect(model.state.merges).toEqual({
      "2": { bottom: 2, id: 2, left: 1, right: 1, top: 1, topLeft: "B2" }
    });

    model.selectCell(1, 1);
    expect(n).toBe(1);
    model.unmergeSelection();
    expect(n).toBe(2);
    expect(Object.keys(model.state.cells)).toEqual(["B2"]);
    expect(Object.keys(model.state.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.state.merges)).toEqual([]);
  });

  test("a single cell is not merged", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } }
        }
      ]
    });

    expect(Object.keys(model.state.merges)).toEqual([]);

    model.selectCell(1, 1);
    model.mergeSelection();

    expect(Object.keys(model.state.mergeCellMap)).toEqual([]);
    expect(Object.keys(model.state.merges)).toEqual([]);
  });

  test("editing a merge cell actually edits the top left", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"]
        }
      ]
    });
    observeModel(model);

    model.selectCell(2, 2);
    expect(model.state.activeXc).toBe("C3");
    expect(n).toBe(1);
    model.startEditing();
    expect(n).toBe(2);
    expect(model.state.currentContent).toBe("b2");
    model.state.currentContent = "new value";
    model.stopEditing();
    expect(model.state.cells["B2"].content).toBe("new value");
  });

  test("setting a style to a merge actually edits the top left", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"]
        }
      ]
    });
    observeModel(model);

    model.selectCell(2, 2);
    expect(model.state.activeXc).toBe("C3");
    expect(Object.keys(model.state.cells)).toEqual(["B2"]);
    expect(model.state.cells["B2"].style).not.toBeDefined();

    model.setStyle({ fillColor: "#333" });
    expect(Object.keys(model.state.cells)).toEqual(["B2"]);
    expect(model.state.cells["B2"].style).toBeDefined();
  });

  test("when moving in a merge, selected cell is topleft", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["B2:C3"]
        }
      ]
    });
    observeModel(model);

    model.selectCell(2, 3);
    expect(model.state.activeXc).toBe("C4");
    expect(model.selectedCell).toBeNull(); // no active cell in C4
    model.movePosition(0, -1);
    expect(model.state.activeXc).toBe("C3");
    expect(model.selectedCell!.xc).toBe("B2");
  });

  test("properly compute if a merge is destructive or not", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } }
        }
      ]
    });
    model.updateSelection(2, 2);
    // B2 is not top left, so it is destructive
    expect(model.isMergeDestructive).toBeTruthy();

    model.selectCell(1, 1);
    model.updateSelection(2, 2);
    // B2 is top left, so it is not destructive
    expect(model.isMergeDestructive).toBeFalsy();
  });

  test("a merge with only style should not be considered destructive", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { style: 1 } }
        }
      ],
      styles: { 1: {} }
    });
    model.state.selection.zones = [
      {
        left: 0,
        top: 0,
        right: 2,
        bottom: 2
      }
    ];
    expect(model.isMergeDestructive).toBeFalsy();
  });
});
