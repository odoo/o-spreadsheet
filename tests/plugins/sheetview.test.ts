import { CommandResult } from "../../src";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  getDefaultSheetViewSize,
} from "../../src/constants";
import { isDefined, numberToLetters, range, toXC, toZone, zoneToXc } from "../../src/helpers";
import { Model } from "../../src/model";
import { SheetViewPlugin } from "../../src/plugins/ui_stateful/sheetview";
import { Zone } from "../../src/types";
import {
  activateSheet,
  addColumns,
  addRows,
  createFilter,
  deleteColumns,
  deleteRows,
  freezeColumns,
  freezeRows,
  hideColumns,
  hideRows,
  merge,
  moveAnchorCell,
  redo,
  resizeColumns,
  resizeRows,
  selectAll,
  selectCell,
  selectColumn,
  selectRow,
  setCellContent,
  setFormat,
  setSelection,
  setStyle,
  setViewportOffset,
  undo,
  unfreezeColumns,
  unfreezeRows,
  updateFilter,
} from "../test_helpers/commands_helpers";
import { getActiveSheetFullScrollInfo } from "../test_helpers/getters_helpers";
import { getPlugin, target } from "../test_helpers/helpers";

let model: Model;

function getPanes() {
  const sheetViewPlugin = getPlugin(model, SheetViewPlugin);
  const sheetId = model.getters.getActiveSheetId();
  return Object.fromEntries(
    Object.entries(sheetViewPlugin.viewports[sheetId]!).filter((entry) => isDefined(entry[1]))
  );
}

function getSheetViewBoundaries(model): Zone {
  const visibleCols = model.getters.getSheetViewVisibleCols();
  const left = visibleCols[0];
  const right = visibleCols[visibleCols.length - 1];
  const visibleRows = model.getters.getSheetViewVisibleRows();
  const top = visibleRows[0];
  const bottom = visibleRows[visibleRows.length - 1];
  return { left, right, top, bottom };
}

describe("Viewport of Simple sheet", () => {
  beforeEach(async () => {
    model = new Model();
  });

  test("Select cell correctly affects offset", () => {
    // Since we rely on the adjustViewportPosition function here, the offsets will be linear combinations of the cells width and height
    selectCell(model, "P1");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 6,
      right: 16,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 6 * DEFAULT_CELL_WIDTH,
      scrollY: 0,
    });

    selectCell(model, "A79");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 36,
      bottom: 79,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 36 * DEFAULT_CELL_HEIGHT,
    });

    // back to topleft
    selectCell(model, "A1");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });

    selectCell(model, "U51");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 8,
      bottom: 51,
      left: 11,
      right: 21,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 11 * DEFAULT_CELL_WIDTH,
      scrollY: 8 * DEFAULT_CELL_HEIGHT,
    });
  });
  test("Can Undo/Redo action that alters viewport structure (add/delete rows or cols)", () => {
    model.getters.getActiveMainViewport();
    addRows(model, "before", 0, 70);
    selectCell(model, "B170");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 127,
      bottom: 169,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 127,
    });

    undo(model);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 57,
      bottom: 99,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 57,
    });

    redo(model); // should not alter offset
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 57,
      bottom: 100,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 57,
    });
  });

  test("Add columns doesn't affect offset", () => {
    selectCell(model, "P1");
    const currentViewport = model.getters.getActiveMainViewport();
    addColumns(model, "after", "P", 30);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
    undo(model);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
    addColumns(model, "before", "P", 30);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
  });
  test("Add rows doesn't affect offset", () => {
    selectCell(model, "A51");
    const currentViewport = model.getters.getActiveMainViewport();
    addRows(model, "after", 50, 30);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
    undo(model);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
    addRows(model, "before", 50, 30);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
  });

  test("Horizontal scroll correctly affects offset", () => {
    setViewportOffset(model, DEFAULT_CELL_WIDTH * 2, 0);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 2,
      right: 12,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 2,
      scrollY: 0,
    });

    setViewportOffset(model, DEFAULT_CELL_WIDTH * 16, 0);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 16,
      right: 25,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 16,
      scrollY: 0,
    });

    setViewportOffset(model, DEFAULT_CELL_WIDTH * 12.6, 0);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 12,
      right: 22,
    });
    expect(getActiveSheetFullScrollInfo(model)).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 12,
      scrollbarScrollX: DEFAULT_CELL_WIDTH * 12.6,
      scrollY: 0,
      scrollbarScrollY: 0,
    });
  });

  test("Horizontal scroll correctly affects bottomRight offset with frozen panes", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    freezeRows(model, 5, sheetId);
    setViewportOffset(model, DEFAULT_CELL_WIDTH * 2, 0);
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 12,
    });
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 5,
      bottom: 43,
      left: 6,
      right: 12,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 2,
      scrollY: 0,
    });

    setViewportOffset(model, DEFAULT_CELL_WIDTH * 16, 0);
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 25,
    });

    setViewportOffset(model, DEFAULT_CELL_WIDTH * 16, 0);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 5,
      bottom: 43,
      left: 20,
      right: 25,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 16,
      scrollY: 0,
    });
  });

  test("can horizontal scroll on sheet smaller than viewport", () => {
    model = new Model({ sheets: [{ rowNumber: 2 }] });
    setViewportOffset(model, DEFAULT_CELL_WIDTH * 2, 0);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 2,
      right: 12,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 2,
      scrollY: 0,
    });
  });

  test("Vertical scroll correctly affects offset", () => {
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 2);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 2,
      bottom: 45,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 2,
    });

    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 57);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 57,
      bottom: 99,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 57,
    });

    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 12.6);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 12,
      bottom: 55,
      left: 0,
      right: 10,
    });
    expect(getActiveSheetFullScrollInfo(model)).toMatchObject({
      scrollX: 0,
      scrollbarScrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 12,
      scrollbarScrollY: DEFAULT_CELL_HEIGHT * 12.6,
    });
  });

  test("Vertical scroll correctly affects bottomRight offset with frozen panes", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    freezeRows(model, 5, sheetId);
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 2);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 7,
      bottom: 45,
      left: 4,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 2,
    });
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 45,
      left: 0,
      right: 10,
    });

    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 57);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 62,
      bottom: 99,
      left: 4,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 57,
    });
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 99,
      left: 0,
      right: 10,
    });

    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 12.6);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 17,
      bottom: 55,
      left: 4,
      right: 10,
    });
    expect(getActiveSheetFullScrollInfo(model)).toMatchObject({
      scrollX: 0,
      scrollbarScrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 12,
      scrollbarScrollY: DEFAULT_CELL_HEIGHT * 12.6,
    });
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 55,
      left: 0,
      right: 10,
    });
  });

  test("can vertical scroll on sheet smaller than viewport", () => {
    model = new Model({ sheets: [{ colNumber: 2 }] });
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 2);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 2,
      bottom: 45,
      left: 0,
      right: 1,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 2,
    });
  });

  test("cannot set offset outside of the grid", () => {
    // negative
    setViewportOffset(model, -1, -1);
    expect(getActiveSheetFullScrollInfo(model)).toEqual({
      scrollbarScrollX: 0,
      scrollbarScrollY: 0,
      scrollX: 0,
      scrollY: 0,
    });

    // too large
    model.dispatch("RESIZE_SHEETVIEW", {
      height: 10 * DEFAULT_CELL_HEIGHT,
      width: 10 * DEFAULT_CELL_WIDTH,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    const sheetId = model.getters.getActiveSheetId();
    const nCols = model.getters.getNumberCols(sheetId);
    const nRows = model.getters.getNumberRows(sheetId);
    setViewportOffset(model, nCols * DEFAULT_CELL_WIDTH + 10, nRows * DEFAULT_CELL_HEIGHT + 10);

    const maxOffsetX = DEFAULT_CELL_WIDTH * (nCols - 10 + 1);
    const maxOffsetY = DEFAULT_CELL_HEIGHT * (nRows - 10 + 1);
    expect(getActiveSheetFullScrollInfo(model)).toEqual({
      scrollbarScrollX: maxOffsetX + 1,
      scrollbarScrollY: maxOffsetY + 1 + 5,
      scrollX: maxOffsetX,
      scrollY: maxOffsetY,
    });
  });

  test("Resize (increase) columns correctly affects viewport without changing the offset", () => {
    const sheetId = model.getters.getActiveSheetId();
    setViewportOffset(model, DEFAULT_CELL_WIDTH * 2, 0);
    const { scrollX } = model.getters.getActiveSheetScrollInfo();
    resizeColumns(
      model,
      range(0, model.getters.getNumberCols(sheetId)).map(numberToLetters),
      DEFAULT_CELL_WIDTH * 2
    );
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 1,
      right: 6,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX,
      scrollY: 0,
    });
  });

  test("Resize (reduce) columns correctly changes offset", () => {
    const sheetId = model.getters.getActiveSheetId();
    //scroll max
    selectCell(model, "Z1");
    selectAll(model);

    resizeColumns(
      model,
      [...Array(model.getters.getNumberCols(sheetId)).keys()].map(numberToLetters),
      DEFAULT_CELL_WIDTH / 2
    );
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 7,
      right: 25,
    });
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 7,
      right: 25,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: (DEFAULT_CELL_WIDTH / 2) * 7,
      scrollY: 0,
    });
  });

  test("Resize rows correctly affects viewport without changing the offset", () => {
    const numberRows = model.getters.getNumberRows(model.getters.getActiveSheetId());
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 2);
    const { scrollY } = model.getters.getActiveSheetScrollInfo();
    resizeRows(model, [...Array(numberRows).keys()], DEFAULT_CELL_HEIGHT * 2);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 1,
      bottom: 22,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY,
    });
  });

  test("Resize (reduce) rows correctly changes offset", () => {
    const numberRows = model.getters.getNumberRows(model.getters.getActiveSheetId());
    //scroll max
    selectCell(model, "A100");
    model.selection.selectAll();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 57,
      bottom: 99,
      left: 0,
      right: 10,
    });
    resizeRows(model, [...Array(numberRows).keys()], DEFAULT_CELL_HEIGHT / 2);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 19,
      bottom: 99,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: Math.round(DEFAULT_CELL_HEIGHT / 2) * 19,
    });
  });

  test("Hide/unhide Columns from leftest column", () => {
    hideColumns(model, [0, 1, 2, 4, 5].map(numberToLetters)); // keep 3
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 3,
      right: 15,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
  });

  test("Hide/unhide Columns from rightest column", () => {
    selectCell(model, "Z1");
    const viewport = model.getters.getActiveMainViewport();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    hideColumns(model, range(13, 26).map(numberToLetters));
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: viewport.top,
      bottom: viewport.bottom,
      left: 3,
      right: viewport.right,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 3,
      scrollY: 0,
    });
  });
  test("Hide/unhide Row from top row", () => {
    hideRows(model, [0, 1, 2, 4, 5]); // keep 3
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 3,
      bottom: 48,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
  });
  test("Hide/unhide Rows from bottom row", () => {
    selectCell(model, "A100");
    const viewport = model.getters.getActiveMainViewport();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    hideRows(model, range(60, 100));
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 17,
      bottom: 99,
      left: viewport.left,
      right: viewport.right,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 17,
    });
  });
  test("Horizontally move position to top right then back to top left correctly affects offset", () => {
    const { right } = model.getters.getActiveMainViewport();
    selectCell(model, toXC(right - 1, 0));
    moveAnchorCell(model, "right");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 1,
      right: 11,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH,
      scrollY: 0,
    });
    moveAnchorCell(model, "right");
    moveAnchorCell(model, "right");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 3,
      right: 13,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 3,
      scrollY: 0,
    });
    const { left } = model.getters.getActiveMainViewport();
    selectCell(model, toXC(left, 0));
    moveAnchorCell(model, "left");
    moveAnchorCell(model, "left");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 1,
      right: 11,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH,
      scrollY: 0,
    });
  });

  test("Vertically move position to bottom left then back to top left correctly affects offset", () => {
    const { bottom } = model.getters.getActiveMainViewport();
    selectCell(model, toXC(0, bottom - 1));
    moveAnchorCell(model, "down");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 1,
      bottom: 44,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT,
    });
    moveAnchorCell(model, "down");
    moveAnchorCell(model, "down");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 3,
      bottom: 46,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 3,
    });
    const { top } = model.getters.getActiveMainViewport();
    selectCell(model, toXC(0, top));
    moveAnchorCell(model, "up");
    moveAnchorCell(model, "up");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 1,
      bottom: 44,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT,
    });
  });

  describe("Cross Move Position with selection outside the viewport affects offset", () => {
    test("Move horizontally a cell which row is outside the viewport", () => {
      const { bottom } = model.getters.getActiveMainViewport();
      selectCell(model, toXC(0, bottom + 3));
      const viewport = { ...model.getters.getActiveMainViewport() };
      model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 0, offsetY: 0 });
      moveAnchorCell(model, "right");
      expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    });

    test("Move vertically a cell which col is outside the viewport", () => {
      const { right } = model.getters.getActiveMainViewport();
      selectCell(model, toXC(right + 3, 0));
      const viewport = { ...model.getters.getActiveMainViewport() };
      model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 0, offsetY: 0 });
      moveAnchorCell(model, "down");
      expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    });
  });

  test("Move position on cells that are taller than the client's height", () => {
    const { height } = model.getters.getSheetViewDimensionWithHeaders();
    resizeRows(model, [0], height + 50);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 0,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
    moveAnchorCell(model, "down");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 1,
      bottom: 44,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: height + 50, // row1 + row2
    });
  });

  test("Move position on cells wider than the client's width", () => {
    const { width } = model.getters.getSheetViewDimensionWithHeaders();
    resizeColumns(model, ["A"], width + 50);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 0,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
    moveAnchorCell(model, "right");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 1,
      right: 11,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: width + 50, // colA + colB
      scrollY: 0,
    });
  });
  test("Select Column while updating range does not update viewport", () => {
    selectCell(model, "C51");
    const viewport = model.getters.getActiveMainViewport();
    selectColumn(model, 3, "overrideSelection");
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
  });
  test("Select Row does not update viewport", () => {
    selectCell(model, "U5");
    const viewport = model.getters.getActiveMainViewport();
    selectRow(model, 3, "overrideSelection");
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
  });
  test("Resize Viewport is correctly computed and does not adjust position", () => {
    selectCell(model, "K71");
    setViewportOffset(model, 100, 112);
    const viewport = model.getters.getActiveMainViewport();
    model.dispatch("RESIZE_SHEETVIEW", {
      width: 500,
      height: 500,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      ...viewport,
      bottom: viewport.top + Math.ceil(500 / DEFAULT_CELL_HEIGHT) - 1,
      right: viewport.left + Math.ceil(500 / DEFAULT_CELL_WIDTH) - 1,
    });
  });

  test("Resizing the viewport impacts current Offset", () => {
    // set coherent size and offset limit
    model.dispatch("RESIZE_SHEETVIEW", {
      width: getDefaultSheetViewSize(),
      height: getDefaultSheetViewSize(),
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    let { width: gridWidth, height: gridHeight } = model.getters.getMainViewportRect();
    let { width, height } = model.getters.getSheetViewDimensionWithHeaders();
    setViewportOffset(model, gridWidth - width, gridHeight - height);
    // de-zoom
    model.dispatch("RESIZE_SHEETVIEW", {
      width: 1250,
      height: 1250,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    ({ width, height } = model.getters.getSheetViewDimensionWithHeaders());
    ({ width: gridWidth, height: gridHeight } = model.getters.getMainViewportRect());

    expect(model.getters.getActiveSheetDOMScrollInfo()).toMatchObject({
      scrollX: gridWidth - width,
      scrollY: gridHeight - height,
    });
  });

  test("Cannot freeze col/row through merges", () => {
    merge(model, "C4:D5");
    expect(freezeColumns(model, 3)).toBeCancelledBecause(CommandResult.MergeOverlap);
    expect(freezeRows(model, 4)).toBeCancelledBecause(CommandResult.MergeOverlap);
  });

  test("resize to identical values doesn't do anything (no render)", () => {
    model.dispatch("RESIZE_SHEETVIEW", {
      height: 100,
      width: 50,
      gridOffsetX: 10,
      gridOffsetY: 15,
    });
    expect(
      model.dispatch("RESIZE_SHEETVIEW", {
        height: 100,
        width: 50,
        gridOffsetX: 10,
        gridOffsetY: 15,
      })
    ).toBeCancelledBecause(CommandResult.ValuesNotChanged);
  });

  test("cannot resize to negative values", () => {
    expect(
      model.dispatch("RESIZE_SHEETVIEW", {
        height: -100,
        width: 50,
        gridOffsetX: 0,
        gridOffsetY: 0,
      })
    ).toBeCancelledBecause(CommandResult.InvalidViewportSize);
    expect(
      model.dispatch("RESIZE_SHEETVIEW", {
        height: 100,
        width: -50,
        gridOffsetX: 0,
        gridOffsetY: 0,
      })
    ).toBeCancelledBecause(CommandResult.InvalidViewportSize);
  });

  test("Viewport is updated when updating a data filter", () => {
    model = new Model();
    createFilter(model, "A1:A10");
    setCellContent(model, "A2", "5");
    setCellContent(model, "A2", "5");
    setCellContent(model, "A3", "5");
    setCellContent(model, "A4", "5");
    setCellContent(model, "A5", "5");
    const oldViewport = { ...model.getters.getActiveMainViewport() };
    updateFilter(model, "A1", ["5"]);
    expect(model.getters.getActiveMainViewport()).not.toEqual(oldViewport);
  });

  test("Viewport is updated when updating a cell that change the evaluation of filtered rows", () => {
    model = new Model();
    createFilter(model, "A1:A10");
    setCellContent(model, "A2", "=B1");
    setCellContent(model, "A2", "=B1");
    setCellContent(model, "A3", "=B1");
    setCellContent(model, "A4", "=B1");
    setCellContent(model, "A5", "=5");
    updateFilter(model, "A1", ["5"]);
    let oldViewport = { ...model.getters.getActiveMainViewport() };
    setCellContent(model, "B1", "5");
    expect(model.getters.getActiveMainViewport()).not.toEqual(oldViewport);
    oldViewport = { ...model.getters.getActiveMainViewport() };
    setFormat(model, "0.00%", target("A5"));
    expect(model.getters.getActiveMainViewport()).not.toEqual(oldViewport);
  });

  test("viewport is recomputed when font size changes", () => {
    expect(model.getters.getActiveMainViewport()).toEqual({
      bottom: 43,
      left: 0,
      right: 10,
      top: 0,
    });
    setStyle(model, "A1:A20", { fontSize: 36 });
    for (let i = 1; i <= 20; ++i) {
      setCellContent(model, `A${i}`, "test"); // Requires non-empty cells. Otherwise, the fontsize is not considered when computing the row height
    }
    expect(model.getters.getActiveMainViewport()).toEqual({
      bottom: 18,
      left: 0,
      right: 10,
      top: 0,
    });
    setStyle(model, "A1:A20", { fontSize: 8 });
    expect(model.getters.getActiveMainViewport()).toEqual({
      bottom: 43,
      left: 0,
      right: 10,
      top: 0,
    });
  });

  test("getVisibleRect returns the actual visible part of a zone", () => {
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    model.dispatch("RESIZE_SHEETVIEW", { gridOffsetX: 0, gridOffsetY: 0, width, height });
    expect(model.getters.getVisibleRect(model.getters.getActiveMainViewport())).toEqual({
      x: 0,
      y: 0,
      width,
      height,
    });
  });

  test("getVisibleRect with freezed panes returns the actual visible part of a zone", () => {
    freezeColumns(model, 1);
    freezeRows(model, 1);
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    model.dispatch("RESIZE_SHEETVIEW", { gridOffsetX: 0, gridOffsetY: 0, width, height });
    expect(model.getters.getVisibleRect(model.getters.getActiveMainViewport())).toEqual({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
      width: 3.5 * DEFAULT_CELL_WIDTH,
      height: 4.5 * DEFAULT_CELL_HEIGHT,
    });
  });
});

describe("Multi Panes viewport", () => {
  beforeEach(async () => {
    model = new Model();
  });
  test("Freezing row generates 2 panes", () => {
    const getPanesEntries = () => Object.keys(getPanes());
    expect(getPanesEntries()).toEqual(["bottomRight"]);
    freezeRows(model, 5);
    expect(getPanesEntries()).toEqual(["topRight", "bottomRight"]);
    freezeRows(model, 2);
    expect(getPanesEntries()).toEqual(["topRight", "bottomRight"]);
  });

  test("Unfreezing rows generates 1 pane", () => {
    const getPanesEntries = () => Object.keys(getPanes());
    freezeRows(model, 5);
    expect(getPanesEntries()).toEqual(["topRight", "bottomRight"]);
    unfreezeRows(model);
    expect(getPanesEntries()).toEqual(["bottomRight"]);
  });

  test("Freezing column generates 2 panes", () => {
    const getPanesEntries = () => Object.keys(getPanes());
    expect(getPanesEntries()).toEqual(["bottomRight"]);
    freezeColumns(model, 4);
    expect(getPanesEntries()).toEqual(["bottomLeft", "bottomRight"]);
    freezeColumns(model, 2);
    expect(getPanesEntries()).toEqual(["bottomLeft", "bottomRight"]);
  });

  test("Unfreezing cols generates 1 pane", () => {
    freezeColumns(model, 4);
    const getPanesEntries = () => Object.keys(getPanes());
    expect(getPanesEntries()).toEqual(["bottomLeft", "bottomRight"]);
    unfreezeColumns(model);
    expect(getPanesEntries()).toEqual(["bottomRight"]);
  });

  test("Freezing both column and row generates 4 panes", () => {
    const getPanesEntries = () => Object.keys(getPanes());
    expect(getPanesEntries()).toEqual(["bottomRight"]);
    freezeColumns(model, 4);
    freezeRows(model, 5);
    expect(getPanesEntries()).toEqual(["topLeft", "topRight", "bottomLeft", "bottomRight"]);
  });

  test("vertical scrolling only impacts 'bottomLeft' and 'bottomRight'", () => {
    freezeColumns(model, 4);
    freezeRows(model, 5);
    setViewportOffset(model, 0, 5 * DEFAULT_CELL_HEIGHT);
    expect(getPanes().topLeft!.offsetY).toBe(0);
    expect(getPanes().topRight!.offsetY).toBe(0);
    expect(getPanes().bottomLeft!.offsetY).toBe(5 * DEFAULT_CELL_HEIGHT);
    expect(getPanes().bottomRight!.offsetY).toBe(5 * DEFAULT_CELL_HEIGHT);
    expect(getPanes().topLeft!.offsetX).toBe(0);
    expect(getPanes().topRight!.offsetX).toBe(0);
    expect(getPanes().bottomLeft!.offsetX).toBe(0);
    expect(getPanes().bottomRight!.offsetX).toBe(0);
  });

  test("horizontal scrolling only impacts 'topRight' and 'bottomRight'", () => {
    freezeColumns(model, 4);
    freezeRows(model, 5);
    setViewportOffset(model, 5 * DEFAULT_CELL_WIDTH, 0);
    expect(getPanes().topLeft!.offsetX).toBe(0);
    expect(getPanes().topRight!.offsetX).toBe(5 * DEFAULT_CELL_WIDTH);
    expect(getPanes().bottomLeft!.offsetX).toBe(0);
    expect(getPanes().bottomRight!.offsetX).toBe(5 * DEFAULT_CELL_WIDTH);
    expect(getPanes().topLeft!.offsetY).toBe(0);
    expect(getPanes().topRight!.offsetY).toBe(0);
    expect(getPanes().bottomLeft!.offsetY).toBe(0);
    expect(getPanes().bottomRight!.offsetY).toBe(0);
  });
  test("Changing pane division preserves the offset", () => {
    setViewportOffset(model, 5 * DEFAULT_CELL_WIDTH, 3 * DEFAULT_CELL_HEIGHT);
    freezeColumns(model, 4);
    freezeRows(model, 5);
    expect(getPanes().topLeft!.offsetX).toBe(0);
    expect(getPanes().topRight!.offsetX).toBe(5 * DEFAULT_CELL_WIDTH);
    expect(getPanes().bottomLeft!.offsetX).toBe(0);
    expect(getPanes().bottomRight!.offsetX).toBe(5 * DEFAULT_CELL_WIDTH);
    expect(getPanes().topLeft!.offsetY).toBe(0);
    expect(getPanes().topRight!.offsetY).toBe(0);
    expect(getPanes().bottomLeft!.offsetY).toBe(3 * DEFAULT_CELL_HEIGHT);
    expect(getPanes().bottomRight!.offsetY).toBe(3 * DEFAULT_CELL_HEIGHT);
  });

  test("Freezing a row too far reset and disallow scrolling", async () => {
    model.dispatch("RESIZE_SHEETVIEW", {
      width: 10 * DEFAULT_CELL_WIDTH,
      height: 10 * DEFAULT_CELL_HEIGHT,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    setViewportOffset(model, 0, 5 * DEFAULT_CELL_HEIGHT);
    freezeRows(model, 11);
    expect(getActiveSheetFullScrollInfo(model)).toEqual({
      scrollX: 0,
      scrollY: 0,
      scrollbarScrollX: 0,
      scrollbarScrollY: 0,
    });
    expect(setViewportOffset(model, 0, 5 * DEFAULT_CELL_HEIGHT)).toBeCancelledBecause(
      CommandResult.InvalidScrollingDirection
    );
  });

  test("Freezing a column too far reset and disallow scrolling", () => {
    model.dispatch("RESIZE_SHEETVIEW", {
      width: 10 * DEFAULT_CELL_WIDTH,
      height: 10 * DEFAULT_CELL_HEIGHT,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    setViewportOffset(model, 5 * DEFAULT_CELL_WIDTH, 0);
    freezeColumns(model, 10);
    expect(getActiveSheetFullScrollInfo(model)).toEqual({
      scrollX: 0,
      scrollY: 0,
      scrollbarScrollX: 0,
      scrollbarScrollY: 0,
    });
    expect(setViewportOffset(model, 5 * DEFAULT_CELL_WIDTH, 0)).toBeCancelledBecause(
      CommandResult.InvalidScrollingDirection
    );
  });
});

describe("multi sheet with different sizes", () => {
  beforeEach(async () => {
    model = new Model({
      sheets: [
        { name: "small", id: "small", colNumber: 2, rowNumber: 2 },
        { name: "big", id: "big", colNumber: 5, rowNumber: 5 },
      ],
    });
  });

  test("viewports of multiple sheets of different size are correctly computed", () => {
    activateSheet(model, "small");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
    activateSheet(model, "big");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 4,
      left: 0,
      right: 4,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
  });

  test("deleting the column that has the active cell doesn't crash", () => {
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getSheetName(sheetId)).toBe("small");
    selectCell(model, "B2");
    deleteColumns(model, ["B"]);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 0,
    });
    const position = model.getters.getActivePosition();
    expect(model.getters.getCell(position)).toBeUndefined();
  });

  test("deleting the row that has the active cell doesn't crash", () => {
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getSheetName(sheetId)).toBe("small");
    selectCell(model, "B2");
    deleteRows(model, [1]);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 0,
      left: 0,
      right: 1,
    });
    const position = model.getters.getActivePosition();
    expect(model.getters.getCell(position)).toBeUndefined();
  });

  test("Client resize impacts all sheets", () => {
    model.dispatch("RESIZE_SHEETVIEW", {
      width: 2.5 * DEFAULT_CELL_WIDTH, // concretely 2.5 cells visible
      height: 3.5 * DEFAULT_CELL_HEIGHT, // concretely 3.5 cells visible
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    activateSheet(model, "small");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    });
    activateSheet(model, "big");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 3,
      left: 0,
      right: 2,
    });
  });
  test("can undo/redo actions on other sheets", () => {
    activateSheet(model, "small");
    addColumns(model, "after", "A", 200);
    selectCell(model, toXC(200, 0));
    activateSheet(model, "big");
    undo(model);
  });
});

describe("shift viewport up/down", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("basic move viewport", () => {
    const { bottom } = model.getters.getActiveMainViewport();
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().top).toBe(bottom);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().top).toBe(0);
  });

  test("move viewport with non-default size", () => {
    model.dispatch("RESIZE_SHEETVIEW", {
      height: 100,
      width: 100,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    const { bottom } = model.getters.getActiveMainViewport();
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().top).toBe(bottom);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().top).toBe(0);
  });

  test("RENAME move viewport not starting from the top", () => {
    selectCell(model, "A4");
    const { bottom } = model.getters.getActiveMainViewport();
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 3);
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().top).toBe(bottom + 3);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().top).toBe(3);
  });

  test("RENAME move viewport not starting from the top", () => {
    selectCell(model, "A4");
    const { bottom } = model.getters.getActiveMainViewport();
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 3 + 1);
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().top).toBe(bottom + 3);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().top).toBe(3);
  });

  test("RENAME move viewport not starting from the top", () => {
    selectCell(model, "A4");
    const { bottom } = model.getters.getActiveMainViewport();
    setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 3 - 1);
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().top).toBe(bottom + 2);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().top).toBe(2);
  });

  test("move all the way down and up again", () => {
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    let { bottom } = model.getters.getActiveMainViewport();
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().top).toBe(bottom);
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().bottom).toBe(numberOfRows - 1);
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().bottom).toBe(numberOfRows - 1);

    let { top } = model.getters.getActiveMainViewport();
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().bottom).toBe(top);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().top).toBe(0);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().top).toBe(0);
  });

  test("move viewport does not changes its dimension", () => {
    const viewportDimension = model.getters.getSheetViewDimensionWithHeaders();
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getSheetViewDimensionWithHeaders()).toEqual(viewportDimension);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getSheetViewDimensionWithHeaders()).toEqual(viewportDimension);
  });

  test("X offset does not change", () => {
    selectCell(model, "D1");
    setViewportOffset(model, DEFAULT_CELL_WIDTH * 3, 0);
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toBe(DEFAULT_CELL_WIDTH * 3);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toBe(DEFAULT_CELL_WIDTH * 3);
  });

  test("anchor cell at the viewport top is shifted", () => {
    const { bottom } = model.getters.getActiveMainViewport();
    selectCell(model, "A1");
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getSelectedZones()).toHaveLength(1);
    expect(model.getters.getSelectedZone()).toEqual({ top: bottom, bottom, left: 0, right: 0 });
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getSelectedZones()).toHaveLength(1);
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
  });

  test("anchor cell not at the viewport top is shifted", () => {
    const { bottom } = model.getters.getActiveMainViewport();
    selectCell(model, "B4");
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getSelectedZone()).toEqual({
      top: bottom + 3,
      bottom: bottom + 3,
      left: 1,
      right: 1,
    });
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B4"));
  });

  test("only anchor cell is kept (and shifted) when moving the viewport", () => {
    setSelection(model, ["A1:A2", "B5", "D1:D2"], {
      anchor: "D1",
    });
    const { bottom } = model.getters.getActiveMainViewport();
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getSelectedZones()).toHaveLength(1);
    expect(model.getters.getSelectedZone()).toEqual({
      top: bottom,
      bottom,
      left: 3,
      right: 3,
    });
  });

  test("hidden rows are skipped", () => {
    const { bottom } = model.getters.getActiveMainViewport();
    model.dispatch("HIDE_COLUMNS_ROWS", {
      dimension: "ROW",
      elements: [2, 3, 4],
      sheetId: model.getters.getActiveSheetId(),
    });
    const { bottom: bottomWithHiddenRows } = model.getters.getActiveMainViewport();
    expect(bottomWithHiddenRows).toBe(bottom + 3);
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().top).toBe(bottomWithHiddenRows);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().bottom).toBe(bottomWithHiddenRows);
  });

  test("bottom cell is in a merge and new anchor in the merge", () => {
    const { bottom } = model.getters.getActiveMainViewport();
    const mergeTop = bottom - 1;
    const mergeBottom = bottom + 1;
    merge(
      model,
      zoneToXc({
        top: mergeTop,
        bottom: mergeBottom,
        left: 0,
        right: 0,
      })
    );
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().top).toBe(mergeTop);
    model.dispatch("SHIFT_VIEWPORT_UP");
    expect(model.getters.getActiveMainViewport().bottom).toBe(bottom);
  });

  test("bottom cell is in a merge and new anchor *not* in the merge", () => {
    const { bottom } = model.getters.getActiveMainViewport();
    const mergeTop = bottom - 1;
    const mergeBottom = bottom + 1;
    merge(
      model,
      zoneToXc({
        top: mergeTop,
        bottom: mergeBottom,
        left: 0,
        right: 0,
      })
    );
    selectCell(model, "B1");
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getActiveMainViewport().top).toBe(bottom);
  });

  test("anchor ends up at the last row", () => {
    const { bottom } = model.getters.getActiveMainViewport();
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("RESIZE_SHEETVIEW", {
      width: getDefaultSheetViewSize(),
      height: bottom * DEFAULT_CELL_HEIGHT,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    deleteRows(model, range(bottom + 1, model.getters.getNumberRows(sheetId)));
    selectCell(model, toXC(0, bottom));
    expect(model.getters.getActiveMainViewport().bottom).toBe(bottom);
    model.dispatch("SHIFT_VIEWPORT_DOWN");
    expect(model.getters.getSelectedZone()).toEqual({
      top: bottom,
      bottom: model.getters.getNumberRows(sheetId) - 1,
      left: 0,
      right: 0,
    });
  });

  test.each(["A1", "A2"])(
    "viewport and selection %s do not move when its already the end of the sheet",
    (selectedCell) => {
      const sheetId = model.getters.getActiveSheetId();
      // delete all rows except the first two ones
      deleteRows(model, range(2, model.getters.getNumberRows(sheetId)));
      selectCell(model, selectedCell);
      model.dispatch("SHIFT_VIEWPORT_DOWN");
      expect(model.getters.getActiveMainViewport().top).toBe(0);
      expect(model.getters.getSelectedZone()).toEqual(toZone(selectedCell));
      model.dispatch("SHIFT_VIEWPORT_UP");
      expect(model.getters.getActiveMainViewport().top).toBe(0);
      expect(model.getters.getSelectedZone()).toEqual(toZone(selectedCell));
    }
  );

  test.each(["A1", "A2", "A15"])(
    "anchor %s is shifted by the correct amount when the sheet end is reached",
    (selectedCell) => {
      const { bottom } = model.getters.getActiveMainViewport();
      const sheetId = model.getters.getActiveSheetId();
      // delete all rows after the viewport except three
      deleteRows(model, range(bottom + 3, model.getters.getNumberRows(sheetId)));
      selectCell(model, selectedCell);
      model.dispatch("SHIFT_VIEWPORT_DOWN");
      expect(model.getters.getSelectedZone()).toEqual({
        top: toZone(selectedCell).top + 3,
        bottom: toZone(selectedCell).bottom + 3,
        left: 0,
        right: 0,
      });
      model.dispatch("SHIFT_VIEWPORT_UP");
      expect(model.getters.getSelectedZone()).toEqual(toZone(selectedCell));
    }
  );

  test("Ensure the cell is in the viewport when starting the edition of a cell", async () => {
    model.dispatch("RESIZE_SHEETVIEW", {
      width: 100,
      height: 100,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    setCellContent(model, "A1", "apple");
    selectCell(model, "A1");
    const sheetId = model.getters.getActiveSheetId();
    const { col, row } = model.getters.getActivePosition();
    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 0, offsetY: 200 });
    expect(model.getters.isVisibleInViewport({ sheetId, col, row })).toBeFalsy();
    model.dispatch("START_EDITION");
    expect(model.getters.isVisibleInViewport({ sheetId, col, row })).toBeTruthy();
  });
});
