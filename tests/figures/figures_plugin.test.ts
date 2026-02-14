import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { CommandResult } from "../../src";
import { numberToLetters, range } from "../../src/helpers";
import {
  activateSheet,
  addColumns,
  addRows,
  createFigure,
  createSheet,
  deleteColumns,
  deleteRows,
  freezeColumns,
  freezeRows,
  moveColumns,
  moveRows,
  redo,
  selectCell,
  setCellContent,
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
      col: 0,
      row: 0,
      offset: { x: 10, y: 20 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      col: 1,
      row: 1,
      offset: { x: 5, y: 10 },
    },
  ])("can create a simple figure", (figure) => {
    const model = new Model();
    createFigure(model, { sheetId: model.getters.getActiveSheetId(), ...figure });
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
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      width: 100,
      height: 100,
      col: 0,
      row: 0,
      offset: { x: 100, y: 100 },
    });
    expect(model.getters.getVisibleFigures().length).toBe(1);
    undo(model);
    expect(model.getters.getVisibleFigures().length).toBe(0);
  });

  test("can create a figure in a different sheet", () => {
    const model = new Model();
    const sheetId = "Sheet2";
    createSheet(model, { sheetId }); // The sheet is not activated

    createFigure(model, {
      sheetId,
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      col: 5,
      row: 6,
      offset: { x: 7, y: 8 },
    });
    const data = model.exportData();
    const sheet = data.sheets.find((s) => s.id === sheetId)!;

    expect(sheet.figures).toEqual([
      {
        id: "someuuid",
        height: 100,
        tag: "hey",
        width: 100,
        col: 5,
        row: 6,
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
      col: 5,
      row: 6,
      offset: { x: 7, y: 8 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 10,
      height: 10,
      col: 1,
      row: 1,
      offset: { x: 5, y: 10 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 20,
      height: 20,
      col: 0,
      row: 0,
      offset: { x: 0, y: 0 },
    },
  ])("getVisibleFigures only returns visible figures", (figure) => {
    const model = new Model();
    createFigure(model, { sheetId: model.getters.getActiveSheetId(), ...figure });
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
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      col: 1,
      row: 1,
      offset: { x: 0, y: 0 },
    },
  ])("getVisibleFigures only returns visible figures on sheet with frozen panes", (figure) => {
    const model = new Model();
    createFigure(model, { sheetId: model.getters.getActiveSheetId(), ...figure });
    expect(model.getters.getVisibleFigures().length).toBe(1);
    freezeColumns(model, 3);
    freezeRows(model, 3);

    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid2",
      col: 0,
      row: 0,
      offset: { x: 2.5 * DEFAULT_CELL_WIDTH, y: 2.5 * DEFAULT_CELL_WIDTH },
      width: 10,
      height: 10,
    });

    expect(model.getters.getVisibleFigures().length).toBe(2);

    setViewportOffset(model, 200, 200);
    expect(model.getters.getVisibleFigures().length).toBe(1);

    setViewportOffset(model, 10, 10);
    expect(model.getters.getVisibleFigures().length).toBe(2);
  });

  test("selecting a figure, then clicking on a cell unselect figure", () => {
    const model = new Model();
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 100,
      height: 100,
    });
    expect(model.getters.getSelectedFigureIds()).toEqual([]);
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(model.getters.getSelectedFigureIds()).toEqual(["someuuid"]);
    selectCell(model, "A1");
    expect(model.getters.getSelectedFigureIds()).toEqual([]);
  });

  test("can select multiple figures", () => {
    const model = new Model();
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 100,
      height: 100,
    });
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "bis",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 100,
      height: 100,
    });
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "repetita",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 100,
      height: 100,
    });
    expect(model.getters.getSelectedFigureIds()).toEqual([]);
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(model.getters.getSelectedFigureIds()).toEqual(["someuuid"]);
    model.dispatch("SELECT_FIGURE", { figureId: "bis", selectMultiple: true });
    expect(model.getters.getSelectedFigureIds()).toEqual(["bis", "someuuid"]);
    model.dispatch("SELECT_FIGURE", { figureId: "repetita", selectMultiple: true });
    expect(model.getters.getSelectedFigureIds()).toEqual(["repetita", "bis", "someuuid"]);
    model.dispatch("UNSELECT_FIGURE", { figureId: "bis" });
    expect(model.getters.getSelectedFigureIds()).toEqual(["repetita", "someuuid"]);
    model.dispatch("SELECT_FIGURE", { figureId: "bis" });
    expect(model.getters.getSelectedFigureIds()).toEqual(["bis"]);
  });

  test("can delete multiple figures and undo/redo", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    createFigure(model, {
      sheetId,
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 100,
      height: 100,
    });
    createFigure(model, {
      sheetId,
      id: "bis",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 100,
      height: 100,
    });
    expect(model.getters.getFigures(sheetId).length).toBe(2);
    model.dispatch("DELETE_FIGURES", { figureIds: ["someuuid", "bis"], sheetId });
    expect(model.getters.getFigures(sheetId).length).toBe(0);
    undo(model);
    expect(model.getters.getFigures(sheetId).length).toBe(2);
    redo(model);
    expect(model.getters.getFigures(sheetId).length).toBe(0);
  });

  test("can move multiple figures and undo/redo", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const positions = [
      {
        col: 1,
        row: 1,
        offset: { x: 10, y: 10 },
      },
      {
        col: 2,
        row: 2,
        offset: { x: 20, y: 20 },
      },
      {
        col: 3,
        row: 0,
        offset: { x: 15, y: 10 },
      },
    ];
    createFigure(model, {
      sheetId,
      id: "someuuid",
      width: 100,
      height: 100,
      ...positions[0],
    });
    createFigure(model, {
      sheetId,
      id: "bis",
      width: 100,
      height: 100,
      ...positions[1],
    });
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject(positions[0]);
    expect(model.getters.getFigure(sheetId, "bis")).toMatchObject(positions[1]);
    model.dispatch("MOVE_FIGURES", {
      figures: [
        { sheetId, figureId: "someuuid", ...positions[2] },
        { sheetId, figureId: "bis", ...positions[0] },
      ],
    });
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject(positions[2]);
    expect(model.getters.getFigure(sheetId, "bis")).toMatchObject(positions[0]);
    undo(model);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject(positions[0]);
    expect(model.getters.getFigure(sheetId, "bis")).toMatchObject(positions[1]);
    redo(model);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject(positions[2]);
    expect(model.getters.getFigure(sheetId, "bis")).toMatchObject(positions[0]);
  });

  test("some commands do not remove figure selection", () => {
    const model = new Model();
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 100,
      height: 100,
    });
    selectCell(model, "A1");
    expect(model.getters.getSelectedFigureIds()).toEqual([]);

    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(model.getters.getSelectedFigureIds()).toEqual(["someuuid"]);

    model.dispatch("EVALUATE_CELLS");
    expect(model.getters.getSelectedFigureIds()).toEqual(["someuuid"]);
  });

  test.each([
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      col: 0,
      row: 0,
      offset: { x: 100, y: 100 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      col: 1,
      row: 4,
      offset: { x: 4, y: 8 },
    },
  ])("can move a figure", (figure) => {
    const model = new Model();
    createFigure(model, { sheetId: model.getters.getActiveSheetId(), ...figure });

    const figureUI = model.getters.getVisibleFigures()[0];
    const { x, y } = figureUI;
    figure = figureUI;
    expect(x).toBe(100);
    expect(y).toBe(100);

    model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId: "someuuid",
      offset: { x: figure.offset.x + 10, y: figure.offset.y + 100 },
      col: figure.col,
      row: figure.row,
    });
    const { x: newx, y: newy } = model.getters.getVisibleFigures()[0];
    expect(newx).toBe(110);
    expect(newy).toBe(200);
  });

  test("can undo an update operation", () => {
    const model = new Model();
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    });

    model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId: "someuuid",
      col: 0,
      row: 0,
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
      col: 0,
      row: 0,
      offset: { x: 100, y: 100 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 100,
      height: 100,
      col: 1,
      row: 4,
      offset: { x: 4, y: 8 },
    },
  ])("prevent moving a figure left or above of the sheet", (figure) => {
    const model = new Model();
    createFigure(model, { sheetId: model.getters.getActiveSheetId(), ...figure });

    const figureUI = model.getters.getVisibleFigures()[0];
    const { x, y } = figureUI;
    figure = figureUI;
    expect(x).toBe(100);
    expect(y).toBe(100);

    const result = model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId: "someuuid",
      offset: { x: figureUI.offset.x - 200, y: figureUI.offset.y - 50 },
      col: figure.col,
      row: figure.row,
    });
    expect(result).toBeCancelledBecause(CommandResult.WrongSheetPosition);
  });

  test("cannot update a figure which doesn't exist", () => {
    const model = new Model();
    const result = model.dispatch("UPDATE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      figureId: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 0, y: 50 },
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

  test("can delete a figure and UNDO will reselect it", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    createFigure(model, {
      sheetId,
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    });
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(model.getters.getSelectedFigureIds()).toEqual(["someuuid"]);
    expect(model.getters.getVisibleFigures()).toHaveLength(1);
    model.dispatch("DELETE_FIGURE", { sheetId, figureId: "someuuid" });
    expect(model.getters.getSelectedFigureIds()).toEqual([]);
    expect(model.getters.getVisibleFigures()).toHaveLength(0);
    undo(model);
    expect(model.getters.getSelectedFigureIds()).toEqual(["someuuid"]);
    expect(model.getters.getVisibleFigures()).toHaveLength(1);
  });

  test("change sheet deselect figure", () => {
    const model = new Model({
      sheets: [
        { id: "1", colNumber: 2, rowNumber: 2 },
        { id: "2", colNumber: 2, rowNumber: 2 },
      ],
    });
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    });
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(model.getters.getSelectedFigureIds()).toEqual(["someuuid"]);
    activateSheet(model, "2");
    expect(model.getters.getSelectedFigureIds()).toEqual([]);
  });

  test("Selecting a figure cancels the edition of a cell", () => {
    const model = new Model();
    const composerStore = makeTestComposerStore(model);
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    });
    composerStore.startEdition();
    composerStore.setCurrentContent("hello");
    expect(composerStore.editionMode).toBe("editing");
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(composerStore.editionMode).toBe("inactive");
    expect(model.getters.getActiveCell().value).toBe(null);
  });

  test("Selecting a figure cancels the edition of a cell in selecting mode", () => {
    const model = new Model();
    const composerStore = makeTestComposerStore(model);
    setCellContent(model, "A1", "=A1+");
    createFigure(model, {
      sheetId: model.getters.getActiveSheetId(),
      id: "someuuid",
      offset: {
        x: 10,
        y: 10,
      },
      width: 10,
      height: 10,
    });
    composerStore.startEdition();
    expect(composerStore.editionMode).toBe("selecting");
    model.dispatch("SELECT_FIGURE", { figureId: "someuuid" });
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("cannot duplicate figure ids", () => {
    const model = new Model();
    const figure = {
      id: "someuuid",
      col: 0,
      row: 0,
      offset: { x: 10, y: 10 },
      tag: "hey",
      width: 10,
      height: 10,
    };
    const cmd1 = createFigure(model, { sheetId: model.getters.getActiveSheetId(), ...figure });
    expect(cmd1).toBeSuccessfullyDispatched();
    createSheet(model, { sheetId: "42" });

    const cmd2 = createFigure(model, { sheetId: model.getters.getActiveSheetId(), ...figure });
    expect(cmd2).toBeCancelledBecause(CommandResult.DuplicatedFigureId);

    const cmd3 = createFigure(model, { sheetId: "42", ...figure });
    expect(cmd3).toBeCancelledBecause(CommandResult.DuplicatedFigureId);
  });

  test("figure move on col delete", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 3,
      row: 3,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    deleteColumns(model, ["D", "E"]);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    deleteColumns(model, ["A", "B"]);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 3,
    });
  });

  test("figure move on own col delete", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 3,
      row: 3,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    deleteColumns(model, ["C", "D"]);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 2,
      row: 3,
    });
  });

  test("figure move on column add", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 1,
      row: 1,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 1,
    });

    addColumns(model, "after", "B", 2);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 1,
    });

    addColumns(model, "before", "B", 2);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 1,
    });
  });

  test("figure move on other column move after", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 1,
      row: 1,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 1,
    });

    moveColumns(model, "B", ["F", "G"], "after");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 1,
    });

    moveColumns(model, "B", ["F", "G"], "before");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 1,
    });
  });

  test("figure move on other column move before", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 3,
      row: 3,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    moveColumns(model, "D", ["A", "B"], "before");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    moveColumns(model, "D", ["A", "B"], "after");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 3,
    });
  });

  test("figure move on own column move before", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 3,
      row: 3,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    moveColumns(model, "B", ["D"], "before");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 3,
    });
  });

  test("figure move on own column move after", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 3,
      row: 3,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    moveColumns(model, "F", ["D"], "after");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 5,
      row: 3,
    });
  });

  test("figure move on row delete", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 3,
      row: 3,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    deleteRows(model, [3, 4]);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    deleteRows(model, [1, 2]);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 1,
    });
  });

  test("figure move on row add", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 1,
      row: 1,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 1,
    });

    addRows(model, "after", 1, 2);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 1,
    });

    addRows(model, "before", 1, 2);
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 3,
    });
  });

  test("figure move on other row move after", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 1,
      row: 1,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 1,
    });

    moveRows(model, 1, [3, 4], "after");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 1,
    });

    moveRows(model, 1, [3, 4], "before");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 1,
      row: 3,
    });
  });

  test("figure move on other row move before", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 3,
      row: 3,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    moveRows(model, 3, [1], "before");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    moveRows(model, 3, [1, 2], "after");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 1,
    });
  });

  test("figure move on own row move before", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 3,
      row: 3,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    moveRows(model, 1, [3], "before");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 1,
    });
  });

  test("figure move on own row move after", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figure = {
      id: "someuuid",
      col: 3,
      row: 3,
      offset: { x: 10, y: 10 },
      width: 10,
      height: 10,
    };
    createFigure(model, { sheetId, ...figure });

    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 3,
    });

    moveRows(model, 7, [3], "after");
    expect(model.getters.getFigure(sheetId, "someuuid")).toMatchObject({
      col: 3,
      row: 7,
    });
  });

  test.each([
    {
      id: "someuuid",
      tag: "hey",
      width: 800,
      height: 1100,
      col: 0,
      row: 0,
      offset: { x: 100, y: 100 },
    },
    {
      id: "someuuid",
      tag: "hey",
      width: 800,
      height: 1100,
      col: 1,
      row: 4,
      offset: { x: 4, y: 8 },
    },
  ])("Move image at (0,0) if not enough space after removing rows and columns", async (figure) => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const figureId = "someuuid";
    createFigure(model, { sheetId, ...figure });

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
    createFigure(model, {
      sheetId,
      id: "someuuid",
      width: 100,
      height: 100,
      col: 1,
      row: 4,
      offset: { x: 4, y: 8 },
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
    createFigure(model, {
      sheetId,
      id: "someuuid",
      width: 100,
      height: 100,
      col: 1,
      row: 4,
      offset: { x: 4, y: 8 },
    });

    deleteColumns(model, ["E"]);
    deleteRows(model, [5]);

    const figureAfter = model.getters.getFigure(sheetId, figureId)!;
    const figureUIAfter = model.getters.getFigureUI(sheetId, figureAfter);
    expect(figureUIAfter.x).toBe(100);
    expect(figureUIAfter.y).toBe(100);
  });
});
