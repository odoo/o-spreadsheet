import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../src/constants";
import { toXC } from "../../src/helpers";
import { Model } from "../../src/model";
import {
  activateSheet,
  addColumns,
  addRows,
  createModelWithViewport,
  redo,
  selectCell,
  undo,
} from "../test_helpers/commands_helpers";
import { makeTestFixture } from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;

beforeEach(async () => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Viewport of Simple sheet", () => {
  beforeEach(async () => {
    model = new Model();
    model.dispatch("RESIZE_VIEWPORT", { width: 1000, height: 1000 }); // normally called by the grid component on mounted()
  });

  test("Select cell correctly affects offset", () => {
    // Since we rely on the adjustViewportPosition function here, the offsets will be linear combinations of the cells width and height
    selectCell(model, "P1");
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 7,
      right: 16,
      offsetX: 7 * DEFAULT_CELL_WIDTH,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    selectCell(model, "A79");
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 37,
      bottom: 79,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: 37 * DEFAULT_CELL_HEIGHT,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    // back to topleft
    selectCell(model, "A1");
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    selectCell(model, "U51");
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 9,
      bottom: 51,
      left: 12,
      right: 21,
      offsetX: 12 * DEFAULT_CELL_WIDTH,
      offsetY: 9 * DEFAULT_CELL_HEIGHT,
    });
  });
  test("Can Undo/Redo action that alters viewport structure (add/delete rows or cols)", () => {
    model.getters.getActiveViewport();
    addRows(model, "before", 0, 70);
    selectCell(model, "B170");
    expect(model.getters.getActiveSnappedViewport()).toMatchObject({
      left: 0,
      right: 9,
      top: 128,
      bottom: 169,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 128,
    });
    undo(model);
    expect(model.getters.getActiveSnappedViewport()).toMatchObject({
      left: 0,
      right: 9,
      top: 58,
      bottom: 99,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 58,
    });
    redo(model); // should not alter offset
    expect(model.getters.getActiveSnappedViewport()).toMatchObject({
      left: 0,
      right: 9,
      top: 58,
      bottom: 100,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 58,
    });
  });

  test("Add columns doesn't affect offset", () => {
    selectCell(model, "P1");
    const currentViewport = model.getters.getActiveViewport();
    addColumns(model, "after", "P", 30);
    expect(model.getters.getActiveViewport()).toMatchObject(currentViewport);
    undo(model);
    expect(model.getters.getActiveViewport()).toMatchObject(currentViewport);
    addColumns(model, "before", "P", 30);
    expect(model.getters.getActiveViewport()).toMatchObject(currentViewport);
  });
  test("Add rows doesn't affect offset", () => {
    selectCell(model, "A51");
    const currentViewport = model.getters.getActiveViewport();
    addRows(model, "after", 50, 30);
    expect(model.getters.getActiveViewport()).toMatchObject(currentViewport);
    undo(model);
    expect(model.getters.getActiveViewport()).toMatchObject(currentViewport);
    addRows(model, "before", 50, 30);
    expect(model.getters.getActiveViewport()).toMatchObject(currentViewport);
  });

  test("Horizontal scroll correctly affects offset", () => {
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: DEFAULT_CELL_WIDTH * 2,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 2,
      right: 11,
      offsetX: DEFAULT_CELL_WIDTH * 2,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: DEFAULT_CELL_WIDTH * 17,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 17,
      right: 25,
      offsetX: DEFAULT_CELL_WIDTH * 17,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: DEFAULT_CELL_WIDTH * 12.5,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 12,
      right: 22,
      offsetX: DEFAULT_CELL_WIDTH * 12.5,
      offsetY: 0,
    });
    expect(model.getters.getActiveSnappedViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 12,
      right: 21,
      offsetX: DEFAULT_CELL_WIDTH * 12,
      offsetY: 0,
    });
  });

  test("Vertical scroll correctly affects offset", () => {
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 2,
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 2,
      bottom: 44,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 2,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 57,
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 57,
      bottom: 99,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 57,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 12.5,
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 12,
      bottom: 54,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 12.5,
    });
    expect(model.getters.getActiveSnappedViewport()).toMatchObject({
      top: 12,
      bottom: 54,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 12,
    });
  });

  test("Resize (increase) columns correctly affects viewport without changing the offset", () => {
    const { cols, id: sheetId } = model.getters.getActiveSheet();
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: DEFAULT_CELL_WIDTH * 2,
      offsetY: 0,
    });
    const { offsetX } = model.getters.getActiveViewport();
    model.dispatch("RESIZE_COLUMNS", {
      sheetId: sheetId,
      size: DEFAULT_CELL_WIDTH * 2,
      columns: [...Array(cols.length).keys()],
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 1,
      right: 5,
      offsetX: offsetX,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
  });

  test("Resize (reduce) columns correctly changes offset", () => {
    const { cols, id: sheetId } = model.getters.getActiveSheet();
    //scroll max
    selectCell(model, "Z1");
    model.dispatch("SELECT_ALL");

    model.dispatch("RESIZE_COLUMNS", {
      sheetId: sheetId,
      size: DEFAULT_CELL_WIDTH / 2,
      columns: [...Array(cols.length).keys()],
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 8,
      right: 25,
    });
    expect(model.getters.getActiveSnappedViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 8,
      right: 25,
      offsetX: (DEFAULT_CELL_WIDTH / 2) * 8,
      offsetY: 0,
    });
  });

  test("Resize rows correctly affects viewport without changing the offset", () => {
    const { rows, id: sheetId } = model.getters.getActiveSheet();
    model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 2,
    });
    const { offsetY } = model.getters.getActiveViewport();
    model.dispatch("RESIZE_ROWS", {
      sheetId: sheetId,
      size: DEFAULT_CELL_HEIGHT * 2,
      rows: [...Array(rows.length).keys()],
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 1,
      bottom: 22,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: offsetY,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
  });

  test("Resize (reduce) rows correctly changes offset", () => {
    const { rows, id: sheetId } = model.getters.getActiveSheet();
    //scroll max
    selectCell(model, "A100");
    model.dispatch("SELECT_ALL");
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 58,
      bottom: 99,
      left: 0,
      right: 9,
    });
    model.dispatch("RESIZE_ROWS", {
      sheetId: sheetId,
      size: DEFAULT_CELL_HEIGHT / 2,
      rows: [...Array(rows.length).keys()],
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 17,
      bottom: 99,
      left: 0,
      right: 9,
    });
    expect(model.getters.getActiveSnappedViewport()).toMatchObject({
      top: 17,
      bottom: 99,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: (DEFAULT_CELL_HEIGHT / 2) * 17,
    });
  });

  test("Horizontally move position to top right then back to top left correctly affects offset", () => {
    const { cols } = model.getters.getActiveSheet();
    const { right } = model.getters.getActiveViewport();
    model.dispatch("MOVE_POSITION", { deltaX: right, deltaY: 0 });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 1,
      right: 10,
      offsetX: DEFAULT_CELL_WIDTH,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("MOVE_POSITION", { deltaX: 5, deltaY: 0 });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 6,
      right: 15,
      offsetX: DEFAULT_CELL_WIDTH * 6,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("MOVE_POSITION", {
      deltaX: cols.length - 2 - model.getters.getPosition()[0], // target penultimate cell to trigger a move
      deltaY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 16,
      right: 25,
      offsetX: DEFAULT_CELL_WIDTH * 16,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("MOVE_POSITION", { deltaX: -24, deltaY: 0 });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
  });

  test("Vertically move position to bottom left then back to top left correctly affects offset", () => {
    const { rows } = model.getters.getActiveSheet();
    const { bottom } = model.getters.getActiveViewport();
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: bottom });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 1,
      bottom: 43,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: 5 });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 6,
      bottom: 48,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 6,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("MOVE_POSITION", {
      deltaX: 0,
      deltaY: rows.length - 2 - model.getters.getPosition()[1], // target penultimate cell to trigger a move
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 57,
      bottom: 99,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT * 57,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: -98 });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
  });

  test("Move position on cells that are taller than the client's height", () => {
    const { height } = model.getters.getViewportDimension();
    model.dispatch("RESIZE_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
      size: height + 50,
      rows: [1],
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: 0,
    });
    model.dispatch("MOVE_POSITION", { deltaX: 0, deltaY: 2 });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 2,
      bottom: 44,
      left: 0,
      right: 9,
      offsetX: 0,
      offsetY: DEFAULT_CELL_HEIGHT + height + 50, // row1 + row2
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
  });
  test("Move position on cells wider than the client's width", () => {
    const { width } = model.getters.getViewportDimension();
    model.dispatch("RESIZE_COLUMNS", {
      sheetId: model.getters.getActiveSheetId(),
      size: width + 50,
      columns: [1],
    });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 0,
      right: 1,
      offsetX: 0,
      offsetY: 0,
    });
    model.dispatch("MOVE_POSITION", { deltaX: 2, deltaY: 0 });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 42,
      left: 2,
      right: 11,
      offsetX: DEFAULT_CELL_WIDTH + width + 50, // colA + colB
      offsetY: 0,
    });
    expect(model.getters.getActiveViewport()).toMatchObject(
      model.getters.getActiveSnappedViewport()
    );
  });
  test("Select Column without updating range updates viewport offset", () => {
    selectCell(model, "C79");
    model.dispatch("SELECT_COLUMN", { index: 3 });
    expect(model.getters.getActiveViewport()).toMatchObject({
      left: 0,
      right: 9,
      top: 0,
      bottom: 42,
      offsetX: 0,
      offsetY: 0,
    });
  });
  test("Select Column while updating range does not recomputes viewport", () => {
    selectCell(model, "C51");
    model.dispatch("SELECT_COLUMN", { index: 3, updateRange: true });
    expect(model.getters.getActiveViewport()).toMatchObject({
      left: 0,
      right: 9,
      top: 9,
      bottom: 51,
      offsetX: 0,
      offsetY: 9 * DEFAULT_CELL_HEIGHT,
    });
  });
  test("Select Row without updating range updates viewport offset", () => {
    selectCell(model, "U5");
    model.dispatch("SELECT_ROW", { index: 3 });
    expect(model.getters.getActiveViewport()).toMatchObject({
      left: 0,
      right: 9,
      top: 0,
      bottom: 42,
      offsetX: 0,
      offsetY: 0,
    });
  });
  test("Select Row while updating range does not recomputes viewport", () => {
    selectCell(model, "U5");
    model.dispatch("SELECT_ROW", { index: 3, updateRange: true });
    expect(model.getters.getActiveViewport()).toMatchObject({
      left: 12,
      right: 21,
      top: 0,
      bottom: 42,
      offsetX: 12 * DEFAULT_CELL_WIDTH,
      offsetY: 0,
    });
  });
  test("Resize Viewport is correctly computed and does not adjust position", () => {
    selectCell(model, "K71");
    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 100, offsetY: 112 });
    const viewport = model.getters.getActiveSnappedViewport();
    model.dispatch("RESIZE_VIEWPORT", {
      width: 500,
      height: 500,
    });
    expect(model.getters.getActiveSnappedViewport()).toMatchObject({
      ...viewport,
      bottom: viewport.top + Math.ceil((500 - HEADER_HEIGHT) / DEFAULT_CELL_HEIGHT) - 1,
      right: viewport.left + Math.ceil((500 - HEADER_WIDTH) / DEFAULT_CELL_WIDTH) - 1,
    });
  });
});

describe("multi sheet with different sizes", () => {
  beforeEach(async () => {
    model = createModelWithViewport({
      sheets: [
        {
          name: "small",
          id: "small",
          colNumber: 2,
          rowNumber: 2,
          cells: {},
        },
        {
          name: "big",
          id: "big",
          colNumber: 5,
          rowNumber: 5,
          cells: {},
        },
      ],
    });
  });

  test("viewports of multiple sheets of different size are correctly computed", () => {
    activateSheet(model, "small");
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
      offsetX: 0,
      offsetY: 0,
    });
    activateSheet(model, "big");
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 4,
      left: 0,
      right: 4,
      offsetX: 0,
      offsetY: 0,
    });
  });

  test("deleting the column that has the active cell doesn't crash", () => {
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("small");
    selectCell(model, "B2");
    model.dispatch("REMOVE_COLUMNS", { columns: [1], sheetId: model.getters.getActiveSheetId() });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 0,
    });
    expect(model.getters.getActiveCell()).toBeUndefined();
  });

  test("deleting the row that has the active cell doesn't crash", () => {
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("small");
    selectCell(model, "B2");
    model.dispatch("REMOVE_ROWS", { rows: [1], sheetId: model.getters.getActiveSheetId() });
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 0,
      left: 0,
      right: 1,
    });
    expect(model.getters.getActiveCell()).toBeUndefined();
  });

  test("Client resize impacts all sheets", () => {
    model.dispatch("RESIZE_VIEWPORT", {
      width: 2.5 * DEFAULT_CELL_WIDTH + HEADER_WIDTH, // concretely 2.5 cells visible
      height: 3.5 * DEFAULT_CELL_HEIGHT + HEADER_HEIGHT, // concretely 3.5 cells visible
    });
    activateSheet(model, "small");
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    });
    activateSheet(model, "big");
    expect(model.getters.getActiveViewport()).toMatchObject({
      top: 0,
      bottom: 3,
      left: 0,
      right: 2,
    });
  });
  test.skip("can undo/redo actions on other sheets", () => {
    // Currently broken due to issue with selection
    activateSheet(model, "small");
    addColumns(model, "after", "A", 200);
    selectCell(model, toXC(200, 0));
    activateSheet(model, "big");
    undo(model);
  });
});
