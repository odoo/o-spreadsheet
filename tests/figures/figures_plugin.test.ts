import { CommandResult } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { numberToLetters, range } from "../../src/helpers";
import { Model } from "../../src/model";
import {
  activateSheet,
  createSheet,
  deleteColumns,
  deleteRows,
  freezeColumns,
  freezeRows,
  selectCell,
  setViewportOffset,
  undo,
} from "../test_helpers/commands_helpers";
import { makeTestComposerStore } from "../test_helpers/helpers";

describe("figure plugin", () => {
  test.each([
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 0, row: 0 },
      offset: { x: 10, y: 20 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 1, row: 1 },
      offset: { x: 5, y: 10 },
    },
  ])("can create a simple figure", (figure) => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure,
    });
    const data = model.exportData();
    const sheet = data.sheets.find((s) => s.id === model.getters.getActiveSheetId())!;

    expect(sheet.figures).toEqual([figure]);
    expect(model.getters.getVisibleFigures()).toEqual([
      { ...figure, x: expect.any(Number), y: expect.any(Number) },
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
        anchor: { col: 0, row: 0 },
        offset: { x: 100, y: 100 },
      },
    });
    expect(model.getters.getVisibleFigures().length).toBe(1);
    undo(model);
    expect(model.getters.getVisibleFigures().length).toBe(0);
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
        anchor: { col: 5, row: 6 },
        offset: { x: 7, y: 8 },
      },
    });
    const data = model.exportData();
    const sheet = data.sheets.find((s) => s.id === sheetId)!;

    expect(sheet.figures).toEqual([
      {
        id: "someuuid",
        height: 100,
        tag: "hey",
        width: 100,
        anchor: { col: 5, row: 6 },
        offset: { x: 7, y: 8 },
      },
    ]);

    expect(model.getters.getVisibleFigures()).toEqual([]); // empty because active sheet is sheet1
  });

  test.each([
    {
      id: "someuuid",
      tag: "hey",
      width: 10,
      height: 10,
      anchor: { col: 5, row: 6 },
      offset: { x: 7, y: 8 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 10,
      height: 10,
      anchor: { col: 1, row: 1 },
      offset: { x: 5, y: 10 },
    },
  ])("getVisibleFigures only returns visible figures", (figure) => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure,
    });
    expect(model.getters.getVisibleFigures().length).toBe(1);

    setViewportOffset(model, 200, 200);
    expect(model.getters.getVisibleFigures().length).toBe(0);

    setViewportOffset(model, 10, 10);
    expect(model.getters.getVisibleFigures().length).toBe(1);
  });

  test.each([
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 0, row: 0 },
      offset: { x: 10, y: 10 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 1, row: 1 },
      offset: { x: 0, y: 0 },
    },
  ])("getVisibleFigures only returns visible figures on sheet with frozen panes", (figure) => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure,
    });
    expect(model.getters.getVisibleFigures().length).toBe(1);
    freezeColumns(model, 3);
    freezeRows(model, 3);

    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid2",
        anchor: { col: 0, row: 0 },
        offset: { x: 2.5 * DEFAULT_CELL_WIDTH, y: 2.5 * DEFAULT_CELL_WIDTH },
        tag: "hey",
        width: 10,
        height: 10,
      },
    });

    expect(model.getters.getVisibleFigures().length).toBe(2);

    setViewportOffset(model, 200, 200);
    expect(model.getters.getVisibleFigures().length).toBe(1);

    setViewportOffset(model, 10, 10);
    expect(model.getters.getVisibleFigures().length).toBe(2);
  });

  test("selecting a figure, then clicking on a cell unselect figure", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        anchor: { col: 0, row: 0 },
        offset: { x: 10, y: 10 },
        tag: "hey",
        width: 100,
        height: 100,
      },
    });
    expect(model.getters.getSelectedFigureId()).toBe(null);
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
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
        anchor: { col: 0, row: 0 },
        offset: { x: 10, y: 10 },
        tag: "hey",
        width: 100,
        height: 100,
      },
    });
    selectCell(model, "A1");
    expect(model.getters.getSelectedFigureId()).toBeNull();

    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");

    model.dispatch("EVALUATE_CELLS", { sheetId: model.getters.getActiveSheetId() });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
  });

  test.each([
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 0, row: 0 },
      offset: { x: 100, y: 100 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 1, row: 4 },
      offset: { x: 4, y: 8 },
    },
  ])("can move a figure", (figure) => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure,
    });

    const figureUI = model.getters.getVisibleFigures()[0];
    const { x, y } = figureUI;
    figure = figureUI;
    expect(x).toBe(100);
    expect(y).toBe(100);

    model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId: "someuuid",
      offset: { x: figure.offset.x + 10, y: figure.offset.y + 100 },
    });
    const { x: newx, y: newy } = model.getters.getVisibleFigures()[0];
    expect(newx).toBe(110);
    expect(newy).toBe(200);
  });

  test("can undo an update operation", () => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        anchor: { col: 0, row: 0 },
        offset: { x: 10, y: 10 },
        tag: "hey",
        width: 10,
        height: 10,
      },
    });

    model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId: "someuuid",
      anchor: { col: 0, row: 0 },
      offset: { x: 100, y: 200 },
    });
    const { x: x1, y: y1 } = model.getters.getVisibleFigures()[0];
    expect(x1).toBe(100);
    expect(y1).toBe(200);

    undo(model);
    const { x: x2, y: y2 } = model.getters.getVisibleFigures()[0];
    expect(x2).toBe(10);
    expect(y2).toBe(10);
  });

  test.each([
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 0, row: 0 },
      offset: { x: 100, y: 100 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 1, row: 4 },
      offset: { x: 4, y: 8 },
    },
  ])("prevent moving a figure left or above of the sheet", (figure) => {
    const model = new Model();
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure,
    });

    const figureUI = model.getters.getVisibleFigures()[0];
    model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId: "someuuid",
      offset: { x: figureUI.offset.x - 200, y: figureUI.offset.y - 50 },
    });

    const { x, y } = model.getters.getVisibleFigures()[0];
    expect(x).toBe(0);
    expect(y).toBe(50);
  });

  test("cannot update a figure which doesn't exist", () => {
    const model = new Model();
    const result = model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId: "someuuid",
      anchor: { col: 0, row: 0 },
      offset: { x: -10, y: 50 },
    });
    expect(result).toBeCancelledBecause(CommandResult.FigureDoesNotExist);
  });

  test("cannot delete a figure which doesn't exist", () => {
    const model = new Model();
    const result = model.dispatch("DELETE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId: "someuuid",
    });
    expect(result).toBeCancelledBecause(CommandResult.FigureDoesNotExist);
  });

  test("can delete a figure", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_FIGURE", {
      sheetId,
      figure: {
        id: "someuuid",
        anchor: { col: 0, row: 0 },
        offset: { x: 10, y: 10 },
        tag: "hey",
        width: 10,
        height: 10,
      },
    });
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    expect(model.getters.getVisibleFigures()).toHaveLength(1);
    model.dispatch("DELETE_FIGURE", { sheetId, figureId: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBeNull();
    expect(model.getters.getVisibleFigures()).toHaveLength(0);
    undo(model);
    expect(model.getters.getSelectedFigureId()).toBeNull();
    expect(model.getters.getVisibleFigures()).toHaveLength(1);
  });

  test("change sheet deselect figure", () => {
    const model = new Model({
      sheets: [
        { id: "1", colNumber: 2, rowNumber: 2 },
        { id: "2", colNumber: 2, rowNumber: 2 },
      ],
    });
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        anchor: { col: 0, row: 0 },
        offset: { x: 10, y: 10 },
        tag: "hey",
        width: 10,
        height: 10,
      },
    });
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    activateSheet(model, "2");
    expect(model.getters.getSelectedFigureId()).toBeNull();
  });

  test("Selecting a figure cancel the edition of a cell", () => {
    const model = new Model();
    const composerStore = makeTestComposerStore(model);
    model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure: {
        id: "someuuid",
        anchor: { col: 0, row: 0 },
        offset: { x: 10, y: 10 },
        tag: "hey",
        width: 10,
        height: 10,
      },
    });
    composerStore.startEdition();
    composerStore.setCurrentContent("hello");
    expect(composerStore.editionMode).toBe("editing");
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(composerStore.editionMode).toBe("inactive");
    expect(model.getters.getActiveCell().value).toBe(null);
  });

  test("cannot duplicate figure ids", () => {
    const model = new Model();
    const figure = {
      id: "someuuid",
      anchor: { col: 0, row: 0 },
      offset: { x: 10, y: 10 },
      tag: "hey",
      width: 10,
      height: 10,
    };
    const cmd1 = model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure,
    });
    expect(cmd1).toBeSuccessfullyDispatched();
    createSheet(model, { sheetId: "42" });

    const cmd2 = model.dispatch("CREATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figure,
    });
    expect(cmd2).toBeCancelledBecause(CommandResult.DuplicatedFigureId);

    const cmd3 = model.dispatch("CREATE_FIGURE", {
      sheetId: "42",
      figure,
    });
    expect(cmd3).toBeCancelledBecause(CommandResult.DuplicatedFigureId);
  });

  test.each([
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 0, row: 0 },
      offset: { x: 100, y: 100 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      anchor: { col: 1, row: 4 },
      offset: { x: 4, y: 8 },
    },
  ])("Figure stay in grid after removing the rows and columns", (figure) => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figureId = "someuuid";

    const colSize = model.getters.getColDimensions(sheetId, 1).size;
    const rowSize = model.getters.getRowDimensions(sheetId, 1).size;

    const maxX = model.getters.getColDimensions(
      sheetId,
      model.getters.getNumberCols(sheetId) - 1
    ).end;
    const maxY = model.getters.getRowDimensions(
      sheetId,
      model.getters.getNumberRows(sheetId) - 1
    ).end;

    model.dispatch("CREATE_FIGURE", {
      sheetId,
      figure: {
        ...figure,
        offset: { x: maxX, y: maxY },
      },
    });

    const figureBefore = model.getters.getFigure(sheetId, figureId)!;
    const figureUI = model.getters.getFigureUI(sheetId, figureBefore);
    expect(figureUI.x).toBe(maxX - figureBefore.width);
    expect(figureUI.y).toBe(maxY - figureBefore.height);

    deleteColumns(model, ["B"]);
    deleteRows(model, [1]);
    const figureAfter = model.getters.getFigure(sheetId, figureId)!;
    const figureUIAfter = model.getters.getFigureUI(sheetId, figureAfter);
    expect(figureUIAfter.x).toBe(maxX - colSize - figureAfter.width);
    expect(figureUIAfter.y).toBe(maxY - rowSize - figureAfter.height);
  });

  test.each([
    {
      id: "someuuid",
      tag: "hey",
      width: 800,
      height: 1100,
      anchor: { col: 0, row: 0 },
      offset: { x: 100, y: 100 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 800,
      height: 1100,
      anchor: { col: 1, row: 4 },
      offset: { x: 4, y: 8 },
    },
  ])("Move image at (0,0) if not enough space after removing rows and columns", async (figure) => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figureId = "someuuid";
    model.dispatch("CREATE_FIGURE", {
      sheetId,
      figure,
    });

    const figureBefore = model.getters.getFigure(sheetId, figureId)!;
    const figureUIBefore = model.getters.getFigureUI(sheetId, figureBefore);
    expect(figureUIBefore.x).toBe(100);
    expect(figureUIBefore.y).toBe(100);

    deleteColumns(model, range(8, model.getters.getNumberCols(sheetId)).map(numberToLetters));
    deleteRows(model, range(8, model.getters.getNumberRows(sheetId)));

    const figureAfter = model.getters.getFigure(sheetId, figureId)!;
    const figureUIAfter = model.getters.getFigureUI(sheetId, figureAfter);
    expect(figureUIAfter.x).toBe(0);
    expect(figureUIAfter.y).toBe(0);
  });

  test("Anchored figures should not move on col/row deletion after their anchor", async () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figureId = "someuuid";
    model.dispatch("CREATE_FIGURE", {
      sheetId,
      figure: {
        id: "someuuid",
        tag: "hey",
        width: 100,
        height: 100,
        anchor: { col: 1, row: 4 },
        offset: { x: 4, y: 8 },
      },
    });

    deleteColumns(model, ["A"]);
    deleteRows(model, [0]);

    const figureAfter = model.getters.getFigure(sheetId, figureId)!;
    const figureUIAfter = model.getters.getFigureUI(sheetId, figureAfter);
    expect(figureUIAfter.x).toBe(100 - DEFAULT_CELL_WIDTH);
    expect(figureUIAfter.y).toBe(100 - DEFAULT_CELL_HEIGHT);
  });

  test("Anchored figures should move on col/row deletion before their anchor", async () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figureId = "someuuid";
    model.dispatch("CREATE_FIGURE", {
      sheetId,
      figure: {
        id: "someuuid",
        tag: "hey",
        width: 100,
        height: 100,
        anchor: { col: 1, row: 4 },
        offset: { x: 4, y: 8 },
      },
    });

    deleteColumns(model, ["E"]);
    deleteRows(model, [5]);

    const figureAfter = model.getters.getFigure(sheetId, figureId)!;
    const figureUIAfter = model.getters.getFigureUI(sheetId, figureAfter);
    expect(figureUIAfter.x).toBe(100);
    expect(figureUIAfter.y).toBe(100);
  });
});
