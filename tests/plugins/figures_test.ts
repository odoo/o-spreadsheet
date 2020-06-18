import { Model } from "../../src/model";
import "../canvas.mock";
import { Viewport } from "../../src/types";

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
  test("can create a figure", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheet: model.getters.getActiveSheet(),
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
    const sheet = data.sheets.find((s) => s.id === data.activeSheet)!;

    expect(sheet.figures).toEqual([
      { id: "someuuid", height: 100, tag: "hey", width: 100, x: 100, y: 100 },
    ]);

    expect(model.getters.getFigures(viewport)).toEqual([
      { id: "someuuid", height: 100, tag: "hey", width: 100, x: 100, y: 100 },
    ]);
  });

  test("can create a figure in a different sheet", () => {
    const model = new Model();
    const sheet1 = model.getters.getActiveSheet();
    model.dispatch("CREATE_SHEET", { activate: true, id: "sheet2" });
    const sheet2 = model.getters.getActiveSheet();
    model.dispatch("ACTIVATE_SHEET", { from: sheet2, to: sheet1 });

    model.dispatch("CREATE_FIGURE", {
      sheet: sheet2,
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
    const sheet = data.sheets.find((s) => s.id === sheet2)!;

    expect(sheet.figures).toEqual([
      { id: "someuuid", height: 100, tag: "hey", width: 100, x: 100, y: 100 },
    ]);

    expect(model.getters.getFigures(viewport)).toEqual([]); // empty because active sheet is sheet1
  });

  test("can create a figure with some data", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheet: model.getters.getActiveSheet(),
      figure: {
        id: "someuuid",
        x: 100,
        y: 100,
        tag: "hey",
        width: 100,
        height: 100,
        data: 123,
      },
    });
    const data = model.exportData();
    const sheet = data.sheets.find((s) => s.id === data.activeSheet)!;

    expect(sheet.figures).toEqual([
      { id: "someuuid", height: 100, tag: "hey", width: 100, x: 100, y: 100, data: 123 },
    ]);
  });

  test("getFigures only returns visible figures", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheet: model.getters.getActiveSheet(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });

    expect(model.getters.getFigures(viewport).length).toBe(1);
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
    expect(model.getters.getFigures(viewport2).length).toBe(0);

    viewport2.offsetX = 10;
    viewport2.offsetY = 10;
    expect(model.getters.getFigures(viewport2).length).toBe(1);
  });

  test("selecting a figure, then clicking on a cell unselect figure", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheet: model.getters.getActiveSheet(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });

    expect(model.getters.getSelectedFigureId()).toBe(null);

    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");

    model.dispatch("SELECT_CELL", { col: 3, row: 1 });
    expect(model.getters.getSelectedFigureId()).toBe(null);
  });

  test("some commands do not remove figure selection", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheet: model.getters.getActiveSheet(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });

    expect(model.getters.getSelectedFigureId()).toBe(null);

    model.dispatch("SELECT_FIGURE", { id: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");

    model.dispatch("EVALUATE_CELLS");
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
  });

  test("can move a figure", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheet: model.getters.getActiveSheet(),
      figure: {
        id: "someuuid",
        x: 10,
        y: 10,
        tag: "hey",
        width: 100,
        height: 100,
      },
    });

    const { x, y } = model.getters.getFigures(viewport)[0];
    expect(x).toBe(10);
    expect(y).toBe(10);

    model.dispatch("MOVE_FIGURE", { id: "someuuid", x: 100, y: 200 });
    const { x: newx, y: newy } = model.getters.getFigures(viewport)[0];
    expect(newx).toBe(100);
    expect(newy).toBe(200);
  });
});
