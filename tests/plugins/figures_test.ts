import { Model } from "../../src/model";
import { Viewport } from "../../src/types";
import { createSheet, selectCell, undo } from "../commands_helpers";

const viewport: Viewport = {
  left: 0,
  right: 10,
  top: 0,
  bottom: 10,
  offsetX: 0,
  offsetY: 0,
  width: 1000,
  height: 1000,
};

describe("figure plugin", () => {
  test("can create a simple figure", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        tag: "hey",
        width: 100,
        height: 100,
        x: 100,
        y: 100,
      },
    });
    const data = model.exportData();
    const sheet = data.sheets.find((s) => s.id === model.getters.getActiveSheetId())!;

    expect(sheet.figures).toEqual([
      { id: "someuuid", height: 100, tag: "hey", width: 100, x: 100, y: 100 },
    ]);

    expect(model.getters.getVisibleFigures(model.getters.getActiveSheetId(), viewport)).toEqual([
      { id: "someuuid", height: 100, tag: "hey", width: 100, x: 100, y: 100 },
    ]);
  });

  test("Sheet with no figure has no figure", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getFigures(sheetId)).toEqual([]);
  });

  test("can undo figure creation", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        tag: "hey",
        width: 100,
        height: 100,
        x: 100,
        y: 100,
      },
    });

    expect(model.getters.getVisibleFigures(model.getters.getActiveSheetId(), viewport).length).toBe(
      1
    );
    undo(model);
    expect(model.getters.getVisibleFigures(model.getters.getActiveSheetId(), viewport).length).toBe(
      0
    );
  });

  test("can create a figure in a different sheet", () => {
    const model = new Model();
    const sheetId = "Sheet2";
    createSheet(model, { sheetId }); // The sheet is not activated

    model.dispatch("CREATE_FIGURE", {
      sheetId,
      figure: {
        id: "someuuid",
        tag: "hey",
        width: 100,
        height: 100,
        x: 100,
        y: 100,
      },
    });
    const data = model.exportData();
    const sheet = data.sheets.find((s) => s.id === sheetId)!;

    expect(sheet.figures).toEqual([
      { id: "someuuid", height: 100, tag: "hey", width: 100, x: 100, y: 100 },
    ]);

    expect(model.getters.getVisibleFigures(model.getters.getActiveSheetId(), viewport)).toEqual([]); // empty because active sheet is sheet1
  });

  test("getVisibleFigures only returns visible figures", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });

    expect(model.getters.getVisibleFigures(model.getters.getActiveSheetId(), viewport).length).toBe(
      1
    );
    const viewport2: Viewport = {
      left: 3,
      top: 3,
      right: 3,
      bottom: 3,
      width: 10,
      height: 10,
      offsetX: 200,
      offsetY: 200,
    };
    expect(
      model.getters.getVisibleFigures(model.getters.getActiveSheetId(), viewport2).length
    ).toBe(0);

    viewport2.offsetX = 10;
    viewport2.offsetY = 10;
    expect(
      model.getters.getVisibleFigures(model.getters.getActiveSheetId(), viewport2).length
    ).toBe(1);
  });

  test("selecting a figure, then clicking on a cell unselect figure", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    selectCell(model, "A1");
    expect(model.getters.getSelectedFigureId()).toBe(null);
  });

  test("some commands do not remove figure selection", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });
    selectCell(model, "A1");
    expect(model.getters.getSelectedFigureId()).toBeNull();

    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");

    model.dispatch("EVALUATE_CELLS");
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
  });

  test("can move a figure", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });

    const { x, y } = model.getters.getVisibleFigures(model.getters.getActiveSheetId(), viewport)[0];
    expect(x).toBe(10);
    expect(y).toBe(10);

    model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      x: 100,
      y: 200,
    });
    const { x: newx, y: newy } = model.getters.getVisibleFigures(
      model.getters.getActiveSheetId(),
      viewport
    )[0];
    expect(newx).toBe(100);
    expect(newy).toBe(200);
  });

  test("can undo an update operation", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 10,
        height: 10,
      },
    });

    model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      x: 100,
      y: 200,
    });
    const { x: x1, y: y1 } = model.getters.getVisibleFigures(
      model.getters.getActiveSheetId(),
      viewport
    )[0];
    expect(x1).toBe(100);
    expect(y1).toBe(200);

    undo(model);
    const { x: x2, y: y2 } = model.getters.getVisibleFigures(
      model.getters.getActiveSheetId(),
      viewport
    )[0];
    expect(x2).toBe(10);
    expect(y2).toBe(10);
  });

  test("prevent moving a figure left or above of the sheet", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });

    model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      x: -10,
      y: 50,
    });

    const { x, y } = model.getters.getVisibleFigures(model.getters.getActiveSheetId(), viewport)[0];
    expect(x).toBe(0);
    expect(y).toBe(50);
  });

  test("can delete a figure", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_FIGURE", {
      sheetId,
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 10,
        height: 10,
      },
    });
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    expect(model.getters.getVisibleFigures(sheetId, viewport)).toHaveLength(1);
    model.dispatch("DELETE_FIGURE", { sheetId, id: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBeNull();
    expect(model.getters.getVisibleFigures(sheetId, viewport)).toHaveLength(0);
    undo(model);
    expect(model.getters.getSelectedFigureId()).toBeNull();
    expect(model.getters.getVisibleFigures(sheetId, viewport)).toHaveLength(1);
  });

  test("change sheet deselect figure", () => {
    const model = new Model({
      sheets: [
        {
          id: "1",
          colNumber: 2,
          rowNumber: 2,
        },
        {
          id: "2",
          colNumber: 2,
          rowNumber: 2,
        },
      ],
    });
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 10,
        height: 10,
      },
    });
    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: "1", sheetIdTo: "2" });
    expect(model.getters.getSelectedFigureId()).toBeNull();
  });
});
