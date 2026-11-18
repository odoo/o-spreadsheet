import { CommandResult, Zone } from "../../src";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_REVISION_ID,
  MESSAGE_VERSION,
  getDefaultSheetViewSize,
} from "../../src/constants";
import { numberToLetters, toXC } from "../../src/helpers/coordinates";
import { isDefined, range } from "../../src/helpers/misc";
import { toZone, zoneToXc } from "../../src/helpers/zones";
import { Model } from "../../src/model";
import { ViewportsPluginInstance } from "../../src/owl_plugins/viewports_owl_plugin";
import { DependencyContainer } from "../../src/store_engine/dependency_container";
import { StateUpdateMessage } from "../../src/types/collaborative/transport_service";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  createTableWithFilter,
  deleteColumns,
  deleteRows,
  duplicateSheet,
  foldHeaderGroup,
  freezeColumns,
  freezeRows,
  groupColumns,
  groupRows,
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
  setFormatting,
  setSelection,
  undo,
  unfreezeColumns,
  unfreezeRows,
  updateFilter,
  updateTableZone,
} from "../test_helpers/commands_helpers";
import { makeViewportsPlugin } from "../test_helpers/owl_plugins_helpers";

let model: Model;
let viewPlugin: ViewportsPluginInstance;

function getPanes() {
  const viewports = viewPlugin.viewports();
  const sheetId = model.getters.getActiveSheetId();
  return Object.fromEntries(
    Object.entries(viewports["viewports"][sheetId]!).filter((entry) => isDefined(entry[1]))
  );
}

function getSheetViewBoundaries(model: Model): Zone {
  const visibleCols = viewPlugin.visibleCols;
  const left = visibleCols[0];
  const right = visibleCols[visibleCols.length - 1];
  const visibleRows = viewPlugin.visibleRows;
  const top = visibleRows[0];
  const bottom = visibleRows[visibleRows.length - 1];
  return { left, right, top, bottom };
}

describe("Viewport of Simple sheet", () => {
  beforeEach(async () => {
    ({ model, viewPlugin } = makeViewportsPlugin());
  });

  test("Select cell correctly affects offset", () => {
    const { width, height } = viewPlugin.sheetViewDimension;
    selectCell(model, "P1");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 5,
      right: 15,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 16 * DEFAULT_CELL_WIDTH - width,
      scrollY: 0,
    });

    selectCell(model, "A79");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 35,
      bottom: 78,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: 79 * DEFAULT_CELL_HEIGHT - height,
    });

    // back to topleft
    selectCell(model, "A1");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });

    selectCell(model, "U51");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 7,
      bottom: 50,
      left: 10,
      right: 20,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 21 * DEFAULT_CELL_WIDTH - width,
      scrollY: 51 * DEFAULT_CELL_HEIGHT - height,
    });
  });

  test("updateAnchor scrolls to the anchor cell when zone is unchanged", () => {
    const model = new Model({ sheets: [{ colNumber: 5, rowNumber: 120 }] });
    const { viewPlugin } = makeViewportsPlugin(model);
    setSelection(model, ["A1:A100"]);
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: 0 });

    const { top: initialTop, bottom: initialBottom } = viewPlugin.activeMainViewport;
    const targetRow = initialBottom + 5;
    model.selection.updateAnchorCell(0, targetRow);
    expect(model.getters.getSelection().anchor.cell).toEqual({ col: 0, row: targetRow });

    const expectedTop = initialTop + 5;
    const expectedBottom = initialBottom + 5;
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: expectedTop,
      bottom: expectedBottom,
    });
  });

  test("Can Undo/Redo action that alters viewport structure (add/delete rows or cols)", () => {
    viewPlugin.activeMainViewport;
    addRows(model, "before", 0, 70);
    selectCell(model, "B170");
    const { height: sheetViewHeight } = viewPlugin.sheetViewDimension;
    expect(viewPlugin.activeMainViewport).toMatchObject({
      left: 0,
      right: 10,
      top: 126,
      bottom: 169,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 170 - sheetViewHeight,
    });

    undo(model);
    expect(viewPlugin.activeMainViewport).toMatchObject({
      left: 0,
      right: 10,
      top: 58,
      bottom: 99,
    });
    const { height } = viewPlugin.mainViewportRect;
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: height - sheetViewHeight, // max scroll
    });

    redo(model); // should not alter offset
    expect(viewPlugin.activeMainViewport).toMatchObject({
      left: 0,
      right: 10,
      top: 58,
      bottom: 101,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: height - sheetViewHeight, // max scroll
    });
  });

  test("Add columns doesn't affect offset", () => {
    selectCell(model, "P1");
    const currentViewport = viewPlugin.activeMainViewport;
    addColumns(model, "after", "P", 30);
    expect(viewPlugin.activeMainViewport).toMatchObject(currentViewport);
    undo(model);
    expect(viewPlugin.activeMainViewport).toMatchObject(currentViewport);
    addColumns(model, "before", "P", 30);
    expect(viewPlugin.activeMainViewport).toMatchObject(currentViewport);
  });
  test("Add rows doesn't affect offset", () => {
    selectCell(model, "A51");
    const currentViewport = viewPlugin.activeMainViewport;
    addRows(model, "after", 50, 30);
    expect(viewPlugin.activeMainViewport).toMatchObject(currentViewport);
    undo(model);
    expect(viewPlugin.activeMainViewport).toMatchObject(currentViewport);
    addRows(model, "before", 50, 30);
    expect(viewPlugin.activeMainViewport).toMatchObject(currentViewport);
  });

  test("Horizontal scroll correctly affects offset", () => {
    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH * 2, offsetY: 0 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 2,
      right: 12,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 2,
      scrollY: 0,
    });

    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH * 14, offsetY: 0 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 14,
      right: 24,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 14,
      scrollY: 0,
    });

    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH * 12.6, offsetY: 0 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0, // partially visible
      bottom: 43,
      left: 12,
      right: 23, // partially visible
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 12.6,
      scrollY: 0,
    });
  });

  test("Horizontal scroll correctly affects bottomRight offset with frozen panes", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    freezeRows(model, 5, sheetId);
    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH * 2, offsetY: 0 });
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 12,
    });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 5,
      bottom: 43,
      left: 6,
      right: 12,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 2,
      scrollY: 0,
    });

    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH * 16, offsetY: 0 });
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 25,
    });

    const { width: sheetViewWidth } = viewPlugin.sheetViewDimension;
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 5,
      bottom: 43,
      left: 19,
      right: 25,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 26 * DEFAULT_CELL_WIDTH - sheetViewWidth, // fully scrolled
      scrollY: 0,
    });
  });

  test("can horizontal scroll on sheet smaller than viewport", () => {
    const model = new Model({ sheets: [{ rowNumber: 2 }] });
    const { viewPlugin } = makeViewportsPlugin(model);
    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH * 2, offsetY: 0 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 1,
      left: 2,
      right: 12,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 2,
      scrollY: 0,
    });
  });

  test("Vertical scroll correctly affects offset", () => {
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: DEFAULT_CELL_HEIGHT * 2 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 2,
      bottom: 45,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 2,
    });

    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: DEFAULT_CELL_HEIGHT * 57 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 57,
      bottom: 99,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 57,
    });

    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: DEFAULT_CELL_HEIGHT * 12.6 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 12, // partially visible
      bottom: 56, // partially visible
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 12.6,
    });
  });

  test("Vertical scroll correctly affects bottomRight offset with frozen panes", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 4, sheetId);
    freezeRows(model, 5, sheetId);
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: DEFAULT_CELL_HEIGHT * 2 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 7,
      bottom: 45,
      left: 4,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 2,
    });
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 45,
      left: 0,
      right: 10,
    });

    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: DEFAULT_CELL_HEIGHT * 57 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 62,
      bottom: 99,
      left: 4,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 57,
    });
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 99,
      left: 0,
      right: 10,
    });

    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: DEFAULT_CELL_HEIGHT * 12.6 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 17, //partially visible
      bottom: 56, //partially visible
      left: 4,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 12.6,
    });
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 56,
      left: 0,
      right: 10,
    });
  });

  test("can vertical scroll on sheet smaller than viewport", () => {
    const model = new Model({ sheets: [{ colNumber: 2 }] });
    const { viewPlugin } = makeViewportsPlugin(model);
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: DEFAULT_CELL_HEIGHT * 2 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 2,
      bottom: 45,
      left: 0,
      right: 1,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 2,
    });
  });

  test("cannot set offset outside of the grid", () => {
    // negative
    viewPlugin.setViewportOffset({ offsetX: -1, offsetY: -1 });
    expect(viewPlugin.activeSheetScrollInfo).toEqual({
      scrollX: 0,
      scrollY: 0,
    });

    // too large
    viewPlugin.resizeSheetView({
      height: 10 * DEFAULT_CELL_HEIGHT,
      width: 10 * DEFAULT_CELL_WIDTH,
    });
    const sheetId = model.getters.getActiveSheetId();
    const nCols = model.getters.getNumberCols(sheetId);
    const nRows = model.getters.getNumberRows(sheetId);
    viewPlugin.setViewportOffset({
      offsetX: nCols * DEFAULT_CELL_WIDTH + 10,
      offsetY: nRows * DEFAULT_CELL_HEIGHT + 10,
    });

    const maxOffsetX = DEFAULT_CELL_WIDTH * (nCols - 10);
    const maxOffsetY = DEFAULT_CELL_HEIGHT * (nRows - 10) + 46;
    expect(viewPlugin.activeSheetScrollInfo).toEqual({
      scrollX: maxOffsetX,
      scrollY: maxOffsetY,
    });
  });

  test("Resize (increase) columns correctly affects viewport without changing the offset", () => {
    const sheetId = model.getters.getActiveSheetId();
    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH * 2, offsetY: 0 });
    const { scrollX } = viewPlugin.activeSheetScrollInfo;
    resizeColumns(
      model,
      range(0, model.getters.getNumberCols(sheetId)).map(numberToLetters),
      DEFAULT_CELL_WIDTH * 2
    );
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 1,
      right: 6,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
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
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 5,
      right: 25,
    });
    const { width: sheetViewWidth } = viewPlugin.sheetViewDimension;
    const { width } = viewPlugin.mainViewportRect;
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: width - sheetViewWidth, // max scroll
      scrollY: 0,
    });
  });

  test("Resize rows correctly affects viewport without changing the offset", () => {
    const numberRows = model.getters.getNumberRows(model.getters.getActiveSheetId());
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: DEFAULT_CELL_HEIGHT * 2 });
    const { scrollY } = viewPlugin.activeSheetScrollInfo;
    resizeRows(model, [...Array(numberRows).keys()], DEFAULT_CELL_HEIGHT * 2);
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 1,
      bottom: 22,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY,
    });
  });

  test("Resize (reduce) rows correctly changes offset", () => {
    const numberRows = model.getters.getNumberRows(model.getters.getActiveSheetId());
    //scroll max
    selectCell(model, "A100");
    model.selection.selectAll();
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 56, // partially visble
      bottom: 99,
      left: 0,
      right: 10,
    });
    resizeRows(model, [...Array(numberRows).keys()], DEFAULT_CELL_HEIGHT / 2);
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 20,
      bottom: 99,
      left: 0,
      right: 10,
    });
    const { height: sheetViewHeight } = viewPlugin.sheetViewDimension;
    const { height } = viewPlugin.mainViewportRect;
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: height - sheetViewHeight, // max scroll
    });
  });

  test("Hide/unhide Columns from leftest column", () => {
    hideColumns(model, [0, 1, 2, 4, 5].map(numberToLetters)); // keep 3
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 3,
      right: 15,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
  });

  test("Hide/unhide Columns from rightest column", () => {
    selectCell(model, "Z1");
    const viewport = viewPlugin.activeMainViewport;
    expect(viewPlugin.activeMainViewport).toMatchObject(viewport);
    hideColumns(model, range(13, 26).map(numberToLetters));
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: viewport.top,
      bottom: viewport.bottom,
      left: 2,
      right: 12, // stops at the last visible column
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 13 - viewPlugin.sheetViewDimension.width,
      scrollY: 0,
    });
  });

  test("Hide/unhide Row from top row", () => {
    hideRows(model, [0, 1, 2, 4, 5]); // keep 3
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 3,
      bottom: 48,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
  });

  test("Hide/unhide Rows from bottom row", () => {
    selectCell(model, "A100");
    const viewport = viewPlugin.activeMainViewport;
    expect(viewPlugin.activeMainViewport).toMatchObject(viewport);
    hideRows(model, range(60, 100));
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 18,
      bottom: 99,
      left: viewport.left,
      right: viewport.right,
    });
    const { height: sheetViewHeight } = viewPlugin.sheetViewDimension;
    const { height } = viewPlugin.mainViewportRect;
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: height - sheetViewHeight, // max scroll
    });
  });

  test("Horizontally move position to top right then back to top left correctly affects offset", () => {
    const { right } = viewPlugin.activeMainViewport;
    selectCell(model, toXC(right - 1, 0));
    moveAnchorCell(model, "right");
    const { width } = viewPlugin.sheetViewDimension;
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 11 - width,
      scrollY: 0,
    });
    moveAnchorCell(model, "right");
    moveAnchorCell(model, "right");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 2,
      right: 12,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 13 - width,
      scrollY: 0,
    });
    const { left } = viewPlugin.activeMainViewport;
    selectCell(model, toXC(left, 0));
    moveAnchorCell(model, "left");
    moveAnchorCell(model, "left");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
  });

  test("Vertically move position to bottom left then back to top left correctly affects offset", () => {
    const { bottom } = viewPlugin.activeMainViewport;
    selectCell(model, toXC(0, bottom));
    moveAnchorCell(model, "down");
    const { height } = viewPlugin.sheetViewDimension;
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 1,
      bottom: 44,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 45 - height,
    });
    moveAnchorCell(model, "down");
    moveAnchorCell(model, "down");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 3,
      bottom: 46,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 47 - height,
    });
    const { top } = viewPlugin.activeMainViewport;
    selectCell(model, toXC(0, top));
    moveAnchorCell(model, "up");
    moveAnchorCell(model, "up");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 1,
      bottom: 44,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT,
    });
  });

  describe("Cross Move Position with selection outside the viewport affects offset", () => {
    test("Move horizontally a cell which row is outside the viewport", () => {
      const { bottom } = viewPlugin.activeMainViewport;
      selectCell(model, toXC(0, bottom + 3));
      const viewport = { ...viewPlugin.activeMainViewport };
      viewPlugin.setViewportOffset({ offsetX: 0, offsetY: 0 });
      moveAnchorCell(model, "right");
      expect(viewPlugin.activeMainViewport).toMatchObject(viewport);
    });

    test("Move vertically a cell which col is outside the viewport", () => {
      const { right } = viewPlugin.activeMainViewport;
      selectCell(model, toXC(right + 3, 0));
      const viewport = { ...viewPlugin.activeMainViewport };
      viewPlugin.setViewportOffset({ offsetX: 0, offsetY: 0 });
      moveAnchorCell(model, "down");
      expect(viewPlugin.activeMainViewport).toMatchObject(viewport);
    });
  });

  test("Move position on cells that are taller than the clients height", () => {
    const { height } = viewPlugin.sheetViewDimensionWithHeaders;
    resizeRows(model, [0], height + 50);
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 0,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
    moveAnchorCell(model, "down");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 10,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: height + 50 + DEFAULT_CELL_HEIGHT - viewPlugin.sheetViewDimension.height,
    });
  });

  test("Move position on cells wider than the clients width", () => {
    const { width } = viewPlugin.sheetViewDimensionWithHeaders;
    resizeColumns(model, ["A"], width + 50);
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 0,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
    moveAnchorCell(model, "right");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 1,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: width + 50 + DEFAULT_CELL_WIDTH - viewPlugin.sheetViewDimension.width,
      scrollY: 0,
    });
  });
  test("Select Column while updating range does not update viewport", () => {
    selectCell(model, "C51");
    const viewport = viewPlugin.activeMainViewport;
    selectColumn(model, 3, "overrideSelection");
    expect(viewPlugin.activeMainViewport).toMatchObject(viewport);
  });
  test("Select Row does not update viewport", () => {
    selectCell(model, "U5");
    const viewport = viewPlugin.activeMainViewport;
    selectRow(model, 3, "overrideSelection");
    expect(viewPlugin.activeMainViewport).toMatchObject(viewport);
  });

  test("Resize Viewport is correctly computed and does not adjust position", () => {
    selectCell(model, "K71");
    viewPlugin.setViewportOffset({ offsetX: 100, offsetY: 112 });
    const viewport = viewPlugin.activeMainViewport;
    viewPlugin.resizeSheetView({ height: 500, width: 500 });
    expect(viewPlugin.activeMainViewport).toMatchObject({
      ...viewport,
      bottom: Math.ceil((100 + 500) / DEFAULT_CELL_HEIGHT) - 1,
      right: Math.ceil((112 + 500) / DEFAULT_CELL_WIDTH) - 1,
    });
  });

  test("Resizing the viewport impacts current Offset", () => {
    // set coherent size and offset limit
    viewPlugin.resizeSheetView({
      height: getDefaultSheetViewSize(),
      width: getDefaultSheetViewSize(),
    });
    let { width: gridWidth, height: gridHeight } = viewPlugin.mainViewportRect;
    let { width, height } = viewPlugin.sheetViewDimensionWithHeaders;
    viewPlugin.setViewportOffset({ offsetX: gridWidth - width, offsetY: gridHeight - height });
    // de-zoom
    viewPlugin.resizeSheetView({ height: 1250, width: 1250 });
    ({ width, height } = viewPlugin.sheetViewDimensionWithHeaders);
    ({ width: gridWidth, height: gridHeight } = viewPlugin.mainViewportRect);

    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
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
    viewPlugin.resizeSheetView({ height: 100, width: 50, gridOffsetX: 10, gridOffsetY: 15 });
    const dimension = viewPlugin.sheetViewDimension;
    viewPlugin.resizeSheetView({ height: 100, width: 50, gridOffsetX: 10, gridOffsetY: 15 });
    expect(viewPlugin.sheetViewDimension).toEqual(dimension);
  });

  test("cannot resize to negative values", () => {
    viewPlugin.resizeSheetView({ height: 100, width: 50 });
    const dimension = viewPlugin.sheetViewDimension;
    viewPlugin.resizeSheetView({ height: -100, width: 50 });
    viewPlugin.resizeSheetView({ height: 100, width: -50 });
    expect(viewPlugin.sheetViewDimension).toEqual(dimension);
  });

  test("Viewport is updated when updating a data filter", () => {
    ({ model, viewPlugin } = makeViewportsPlugin());
    createTableWithFilter(model, "A1:A10");
    setCellContent(model, "A2", "5");
    setCellContent(model, "A2", "5");

    const initialViewport = { ...viewPlugin.activeMainViewport };
    updateFilter(model, "A1", ["5"]);
    expect(viewPlugin.activeMainViewport).not.toEqual(initialViewport);

    updateTableZone(model, "A1:A10", "B3:B10");
    expect(viewPlugin.activeMainViewport).toEqual(initialViewport);
  });

  test("Viewport is updated when updating a cell that change the evaluation of filtered rows", () => {
    ({ model, viewPlugin } = makeViewportsPlugin());
    createTableWithFilter(model, "A1:A10");
    setCellContent(model, "A2", "=B1");
    setCellContent(model, "A2", "=B1");
    setCellContent(model, "A3", "=B1");
    setCellContent(model, "A4", "=B1");
    setCellContent(model, "A5", "=5");
    updateFilter(model, "A1", ["5"]);
    let oldViewport = { ...viewPlugin.activeMainViewport };
    setCellContent(model, "B1", "5");
    expect(viewPlugin.activeMainViewport).not.toEqual(oldViewport);
    oldViewport = { ...viewPlugin.activeMainViewport };
    setFormat(model, "A5", "0.00%");
    expect(viewPlugin.activeMainViewport).not.toEqual(oldViewport);
  });

  test("Viewport is updated when folding/unfolding header groups", () => {
    ({ model, viewPlugin } = makeViewportsPlugin());

    groupColumns(model, "A", "B");
    let oldViewport = { ...viewPlugin.activeMainViewport };
    foldHeaderGroup(model, "COL", 0, 1);
    expect(viewPlugin.activeMainViewport).not.toEqual(oldViewport);

    groupRows(model, 1, 2);
    oldViewport = { ...viewPlugin.activeMainViewport };
    foldHeaderGroup(model, "ROW", 1, 2);
    expect(viewPlugin.activeMainViewport).not.toEqual(oldViewport);
  });

  test("viewport is recomputed when font size changes", () => {
    expect(viewPlugin.activeMainViewport).toEqual({
      bottom: 43,
      left: 0,
      right: 10,
      top: 0,
    });
    setFormatting(model, "A1:A20", { fontSize: 36 });
    for (let i = 1; i <= 20; ++i) {
      setCellContent(model, `A${i}`, "test"); // Requires non-empty cells. Otherwise, the fontsize is not considered when computing the row height
    }
    expect(viewPlugin.activeMainViewport).toEqual({
      bottom: 18,
      left: 0,
      right: 10,
      top: 0,
    });
    setFormatting(model, "A1:A20", { fontSize: 24 });
    expect(viewPlugin.activeMainViewport).toEqual({
      bottom: 30,
      left: 0,
      right: 10,
      top: 0,
    });

    const sheetId = model.getters.getActiveSheetId();
    for (let i = 0; i < 20; ++i) {
      model.dispatch("UPDATE_CELL", { sheetId, col: 0, row: i, style: {} });
    }
    expect(viewPlugin.activeMainViewport).toEqual({
      bottom: 43,
      left: 0,
      right: 10,
      top: 0,
    });
  });

  test("getVisibleRect returns the actual visible part of a zone", () => {
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    viewPlugin.resizeSheetView({ height: height, width: width });
    expect(
      viewPlugin
        .viewports()
        .getVisibleRect(model.getters.getActiveSheetId(), viewPlugin.activeMainViewport)
    ).toEqual({
      x: 0,
      y: 0,
      width,
      height,
    });
  });

  test("getVisibleRect with frozen panes returns the actual visible part of a zone", () => {
    freezeColumns(model, 1);
    freezeRows(model, 1);
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    viewPlugin.resizeSheetView({ height: height, width: width });
    const zone = viewPlugin.activeMainViewport;
    expect(viewPlugin.viewports().getVisibleRect(model.getters.getActiveSheetId(), zone)).toEqual({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
      width: 3.5 * DEFAULT_CELL_WIDTH,
      height: 4.5 * DEFAULT_CELL_HEIGHT,
    });
    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH, offsetY: DEFAULT_CELL_HEIGHT });
    expect(viewPlugin.viewports().getVisibleRect(model.getters.getActiveSheetId(), zone)).toEqual({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
      width: 3 * DEFAULT_CELL_WIDTH,
      height: 4 * DEFAULT_CELL_HEIGHT,
    });
  });

  test("getVisibleRect takes the scroll into account", () => {
    merge(model, "A1:B2");
    const zone = toZone("A1:B2");
    expect(viewPlugin.viewports().getVisibleRect(model.getters.getActiveSheetId(), zone)).toEqual({
      x: 0,
      y: 0,
      width: DEFAULT_CELL_WIDTH * 2,
      height: DEFAULT_CELL_HEIGHT * 2,
    });
    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH, offsetY: DEFAULT_CELL_HEIGHT });
    expect(viewPlugin.viewports().getVisibleRect(model.getters.getActiveSheetId(), zone)).toEqual({
      x: 0,
      y: 0,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test("getRect returns the full zone dimensions regardless of the viewport size", () => {
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    viewPlugin.resizeSheetView({ height: height, width: width });
    expect(
      viewPlugin
        .viewports()
        .getRect(model.getters.getActiveSheetId(), viewPlugin.activeMainViewport)
    ).toEqual({
      x: 0,
      y: 0,
      width: 5 * DEFAULT_CELL_WIDTH,
      height: 6 * DEFAULT_CELL_HEIGHT,
    });
  });

  test("getRect with frozen panes returns the full part of a zone", () => {
    freezeColumns(model, 1);
    freezeRows(model, 1);
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    viewPlugin.resizeSheetView({ height: height, width: width });
    const zone = viewPlugin.activeMainViewport;
    expect(viewPlugin.viewports().getRect(model.getters.getActiveSheetId(), zone)).toEqual({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
      width: 4 * DEFAULT_CELL_WIDTH,
      height: 5 * DEFAULT_CELL_HEIGHT,
    });
    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH, offsetY: DEFAULT_CELL_HEIGHT });
    expect(viewPlugin.viewports().getRect(model.getters.getActiveSheetId(), zone)).toEqual({
      x: 0,
      y: 0,
      width: 4 * DEFAULT_CELL_WIDTH,
      height: 5 * DEFAULT_CELL_HEIGHT,
    });
  });

  test("getRect takes the scroll into account", () => {
    merge(model, "A1:B2");
    const zone = toZone("A1:B2");
    expect(viewPlugin.viewports().getRect(model.getters.getActiveSheetId(), zone)).toEqual({
      x: 0,
      y: 0,
      width: DEFAULT_CELL_WIDTH * 2,
      height: DEFAULT_CELL_HEIGHT * 2,
    });
    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH, offsetY: DEFAULT_CELL_HEIGHT });
    expect(viewPlugin.viewports().getRect(model.getters.getActiveSheetId(), zone)).toEqual({
      x: -DEFAULT_CELL_WIDTH,
      y: -DEFAULT_CELL_HEIGHT,
      width: DEFAULT_CELL_WIDTH * 2,
      height: DEFAULT_CELL_HEIGHT * 2,
    });
  });

  test("Loading a model with initial revisions in sheet that is deleted doesn't crash", () => {
    const initialMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        serverRevisionId: DEFAULT_REVISION_ID,
        nextRevisionId: "1",
        version: MESSAGE_VERSION,
        clientId: "bob",
        commands: [
          { type: "CREATE_SHEET", position: 1, sheetId: "newSheetId", name: "newSheetName" },
          { type: "UPDATE_CELL", sheetId: "newSheetId", col: 0, row: 0, content: "1" },
          { type: "DELETE_SHEET", sheetId: "newSheetId", sheetName: "newSheetName" },
        ],
      },
    ];

    expect(() => new Model({}, {}, initialMessages)).not.toThrow();
  });
});

describe("Multi Panes viewport", () => {
  beforeEach(async () => {
    ({ model, viewPlugin } = makeViewportsPlugin());
  });

  test("setViewportOffset does nothing if it won't scroll any viewport (with frozen panes)", () => {
    freezeColumns(model, 4);
    freezeRows(model, 5);
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: 0 });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({ scrollX: 0, scrollY: 0 });

    viewPlugin.setViewportOffset({ offsetX: 10, offsetY: 10 });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 10,
      scrollY: 10,
    });
    viewPlugin.setViewportOffset({ offsetX: 10, offsetY: 10 });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 10,
      scrollY: 10,
    });
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

  test("Undo and redo keep frozen panes in sync with history", () => {
    const sheetId = model.getters.getActiveSheetId();
    const getPanesEntries = () => Object.keys(getPanes());

    freezeColumns(model, 4);
    freezeRows(model, 5);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 5 });
    expect(getPanesEntries()).toEqual(["topLeft", "topRight", "bottomLeft", "bottomRight"]);

    undo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 0 });
    expect(getPanesEntries()).toEqual(["bottomLeft", "bottomRight"]);

    undo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 0, ySplit: 0 });
    expect(getPanesEntries()).toEqual(["bottomRight"]);

    redo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 0 });
    expect(getPanesEntries()).toEqual(["bottomLeft", "bottomRight"]);

    redo(model);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 5 });
    expect(getPanesEntries()).toEqual(["topLeft", "topRight", "bottomLeft", "bottomRight"]);
  });

  test("Adding and removing headers before frozen panes keeps viewports in sync", () => {
    const sheetId = model.getters.getActiveSheetId();

    freezeColumns(model, 4);
    freezeRows(model, 5);

    addColumns(model, "before", "A", 1);
    addRows(model, "before", 0, 1);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 5, ySplit: 6 });
    expect(getPanes().topLeft).toMatchObject({ right: 4, bottom: 5 });

    deleteColumns(model, ["A"]);
    deleteRows(model, [0]);
    expect(model.getters.getPaneDivisions(sheetId)).toEqual({ xSplit: 4, ySplit: 5 });
    expect(getPanes().topLeft).toMatchObject({ right: 3, bottom: 4 });
  });

  test("Duplicated sheets keep frozen pane viewports", () => {
    const sheetId = model.getters.getActiveSheetId();
    const duplicatedSheetId = "duplicateSheetId";

    freezeColumns(model, 4);
    freezeRows(model, 5);
    duplicateSheet(model, sheetId, duplicatedSheetId, "Duplicate");
    activateSheet(model, duplicatedSheetId);

    expect(model.getters.getPaneDivisions(duplicatedSheetId)).toEqual({ xSplit: 4, ySplit: 5 });
    expect(Object.keys(getPanes())).toEqual(["topLeft", "topRight", "bottomLeft", "bottomRight"]);
  });

  test("vertical scrolling only impacts 'bottomLeft' and 'bottomRight'", () => {
    freezeColumns(model, 4);
    freezeRows(model, 5);
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: 5 * DEFAULT_CELL_HEIGHT });
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
    viewPlugin.setViewportOffset({ offsetX: 5 * DEFAULT_CELL_WIDTH, offsetY: 0 });
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
    viewPlugin.setViewportOffset({
      offsetX: 5 * DEFAULT_CELL_WIDTH,
      offsetY: 3 * DEFAULT_CELL_HEIGHT,
    });
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
    viewPlugin.resizeSheetView({
      height: 10 * DEFAULT_CELL_HEIGHT,
      width: 10 * DEFAULT_CELL_WIDTH,
    });
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: 5 * DEFAULT_CELL_HEIGHT });
    freezeRows(model, 11);
    expect(viewPlugin.activeSheetScrollInfo).toEqual({
      scrollX: 0,
      scrollY: 0,
    });
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: 5 * DEFAULT_CELL_HEIGHT });
    expect(viewPlugin.activeSheetScrollInfo).toEqual({ scrollX: 0, scrollY: 0 });
  });

  test("Freezing a column too far reset and disallow scrolling", () => {
    viewPlugin.resizeSheetView({
      height: 10 * DEFAULT_CELL_HEIGHT,
      width: 10 * DEFAULT_CELL_WIDTH,
    });
    viewPlugin.setViewportOffset({ offsetX: 5 * DEFAULT_CELL_WIDTH, offsetY: 0 });
    freezeColumns(model, 10);
    expect(viewPlugin.activeSheetScrollInfo).toEqual({
      scrollX: 0,
      scrollY: 0,
    });
    viewPlugin.setViewportOffset({ offsetX: 5 * DEFAULT_CELL_WIDTH, offsetY: 0 });
    expect(viewPlugin.activeSheetScrollInfo).toEqual({ scrollX: 0, scrollY: 0 });
  });

  test("Viewport remains unaffected when hiding all rows below frozen pane or columns right to frozen panes", () => {
    const model = new Model({ sheets: [{ colNumber: 8, rowNumber: 8 }] });
    const sheetId = model.getters.getActiveSheetId();

    freezeRows(model, 4, sheetId);
    let originalActiveMainViewport = viewPlugin.activeMainViewport;
    hideRows(model, [4, 5, 6, 7]);
    expect(viewPlugin.activeMainViewport).toEqual(originalActiveMainViewport);

    freezeColumns(model, 4, sheetId);
    originalActiveMainViewport = viewPlugin.activeMainViewport;
    hideColumns(model, ["E", "F", "G", "H"]);
    expect(viewPlugin.activeMainViewport).toEqual(originalActiveMainViewport);
  });

  test("filtered row rect after updating another sheet", () => {
    const sheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "sh2" });
    setCellContent(model, "A1", "Hi");
    setCellContent(model, "A2", "Hello");

    createTableWithFilter(model, "A1:A3");

    updateFilter(model, "A1", ["Hello"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    const rectA2 = {
      x: 0,
      y: DEFAULT_CELL_HEIGHT,
      width: DEFAULT_CELL_WIDTH,
      height: 0,
    };
    expect(
      viewPlugin.viewports().getVisibleRect(model.getters.getActiveSheetId(), toZone("A2"))
    ).toEqual(rectA2);
    activateSheet(model, "sh2");
    setCellContent(model, "A1", "hi");
    activateSheet(model, sheetId);
    expect(
      viewPlugin.viewports().getVisibleRect(model.getters.getActiveSheetId(), toZone("A2"))
    ).toEqual(rectA2);
  });

  test("Viewport remains unaffected when hiding all rows below frozen panes by data filter", () => {
    const model = new Model({ sheets: [{ colNumber: 3, rowNumber: 3 }] });
    const sheetId = model.getters.getActiveSheetId();

    setCellContent(model, "A2", "2808");
    setCellContent(model, "A3", "2808");

    createTableWithFilter(model, "A1:A3");
    freezeRows(model, 2, sheetId);

    const originalActiveMainViewport = viewPlugin.activeMainViewport;
    updateFilter(model, "A1", ["2808"]);

    expect(viewPlugin.activeMainViewport).toEqual(originalActiveMainViewport);
  });

  test("can scroll to the last row on a very small scrollable viewport", () => {
    const sheetId = model.getters.getActiveSheetId();
    const { width } = viewPlugin.viewports().getSheetViewDimension();
    viewPlugin.resizeSheetView({ height: 7.5 * DEFAULT_CELL_HEIGHT, width });
    freezeRows(model, 7);
    // scroll at more than max value knowing that the command handler clips the payload
    viewPlugin.setViewportOffset({
      offsetX: 0,
      offsetY: model.getters.getNumberRows(sheetId) * DEFAULT_CELL_HEIGHT,
    });
    expect(viewPlugin.activeMainViewport).toEqual({
      top: 99,
      bottom: 99,
      left: 0,
      right: 10,
    });
  });

  test("can scroll to the last column on a very small scrollable viewport", () => {
    const sheetId = model.getters.getActiveSheetId();
    const { height } = viewPlugin.viewports().getSheetViewDimension();
    viewPlugin.resizeSheetView({ height, width: 7.5 * DEFAULT_CELL_WIDTH });
    freezeColumns(model, 7);
    // scroll at more than max value knowing that the command handler clips the payload
    viewPlugin.setViewportOffset({
      offsetX: model.getters.getNumberCols(sheetId) * DEFAULT_CELL_WIDTH,
      offsetY: 0,
    });
    expect(viewPlugin.activeMainViewport).toEqual({
      top: 0,
      bottom: 43,
      left: 25,
      right: 25,
    });
  });

  test("Visible Cols and Rows are correctly computed when the sheetview has a 0 width", () => {
    viewPlugin.resizeSheetView({ height: 100, width: 0 });
    expect(viewPlugin.visibleCols).toEqual([]);
    expect(viewPlugin.visibleRows).toEqual([]);

    freezeColumns(model, 2);
    expect(viewPlugin.visibleCols).toEqual([]);
    expect(viewPlugin.visibleRows).toEqual([]);

    freezeRows(model, 2);
    expect(viewPlugin.visibleCols).toEqual([]);
    expect(viewPlugin.visibleRows).toEqual([]);
  });

  test("Visible Cols and Rows are correctly computed when the sheetview has a 0 height", () => {
    viewPlugin.resizeSheetView({ height: 0, width: 100 });
    expect(viewPlugin.visibleCols).toEqual([]);
    expect(viewPlugin.visibleRows).toEqual([]);

    freezeColumns(model, 2);
    expect(viewPlugin.visibleCols).toEqual([]);
    expect(viewPlugin.visibleRows).toEqual([]);

    freezeRows(model, 2);
    expect(viewPlugin.visibleCols).toEqual([]);
    expect(viewPlugin.visibleRows).toEqual([]);
  });

  test("Move right beyond viewport with frozen columns correctly affects offset", () => {
    freezeColumns(model, 3);
    const { width } = viewPlugin.sheetViewDimension;
    const { right } = viewPlugin.activeMainViewport;
    selectCell(model, toXC(right, 0));
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * (right + 1) - width, // right is 0-indexed
      scrollY: 0,
    });

    moveAnchorCell(model, "right");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      left: 4,
      right: right + 1,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * (right + 2) - width,
      scrollY: 0,
    });
  });

  test("Move down beyond viewport with frozen rows correctly affects offset", () => {
    freezeRows(model, 3);
    const { height } = viewPlugin.sheetViewDimension;
    const { bottom } = viewPlugin.activeMainViewport;
    selectCell(model, toXC(0, bottom));
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * (bottom + 1) - height, // bottom is 0-indexed
    });

    moveAnchorCell(model, "down");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      left: 0,
      right: 10,
      top: 4,
      bottom: bottom + 1,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * (bottom + 2) - height,
    });
  });

  test("getCol/RowIndex works on frozen pane limit", () => {
    const sheetId = model.getters.getActiveSheetId();
    freezeColumns(model, 3);
    freezeRows(model, 3);

    viewPlugin.setViewportOffset({ offsetX: 10, offsetY: 10 }); // Scroll a bit so D4 is "below" the frozen pane
    expect(viewPlugin.viewports().getColIndex(sheetId, DEFAULT_CELL_WIDTH * 3 - 5)).toBe(2);
    expect(viewPlugin.viewports().getColIndex(sheetId, DEFAULT_CELL_WIDTH * 3 + 5)).toBe(3);

    expect(viewPlugin.viewports().getRowIndex(sheetId, DEFAULT_CELL_HEIGHT * 3 - 5)).toBe(2);
    expect(viewPlugin.viewports().getRowIndex(sheetId, DEFAULT_CELL_HEIGHT * 3 + 5)).toBe(3);
  });

  test("Viewports are correctly formed when the zone to display intersects the frozen panes", () => {
    freezeRows(model, 3);
    freezeColumns(model, 3);

    const internalViewports = () => {
      const viewports = viewPlugin.viewports().viewports[model.getters.getActiveSheetId()]!;
      return Object.fromEntries(
        Object.entries(viewports).map(([key, viewport]) => [
          key,
          viewport
            ? {
                zone: zoneToXc(viewport),
                height: viewport.viewportHeight,
                width: viewport.viewportWidth,
              }
            : undefined,
        ])
      );
    };

    const cellHeight = DEFAULT_CELL_HEIGHT;
    const cellWidth = DEFAULT_CELL_WIDTH;

    // // Zone intersects all the viewports
    viewPlugin.setViewportArgs({ zoneToDisplay: toZone("C3:D5") });
    expect(internalViewports()).toEqual({
      topLeft: { zone: "C3", height: cellHeight, width: cellWidth },
      topRight: { zone: "D3", height: cellHeight, width: 1000 - cellWidth },
      bottomLeft: { zone: "C4:C5", height: 1000 - cellHeight, width: cellWidth },
      bottomRight: { zone: "D4:D5", height: 1000 - cellHeight, width: 1000 - cellWidth },
    });

    // Zone intersects only the main viewport and the top right viewport
    viewPlugin.setViewportArgs({ zoneToDisplay: toZone("D3:E5") });
    expect(internalViewports()).toEqual({
      topRight: { zone: "D3:E3", height: cellHeight, width: 1000 },
      bottomRight: { zone: "D4:E5", height: 1000 - cellHeight, width: 1000 },
    });

    // Zone intersects only the main viewport and the bottom left viewport
    viewPlugin.setViewportArgs({ zoneToDisplay: toZone("C4:D5") });
    expect(internalViewports()).toEqual({
      bottomLeft: { zone: "C4:C5", height: 1000, width: cellWidth },
      bottomRight: { zone: "D4:D5", height: 1000, width: 1000 - cellWidth },
    });

    // Zone is fully inside a single frozen pane (top left)
    viewPlugin.setViewportArgs({ zoneToDisplay: toZone("A1:B2") });
    expect(internalViewports()).toEqual({
      bottomRight: { zone: "A1:B2", height: 1000, width: 1000 },
    });

    // Zone is fully inside a single frozen pane (top right)
    viewPlugin.setViewportArgs({ zoneToDisplay: toZone("D1:E2") });
    expect(internalViewports()).toEqual({
      bottomRight: { zone: "D1:E2", height: 1000, width: 1000 },
    });

    // Zone is fully inside a single frozen pane (bottom left)
    viewPlugin.setViewportArgs({ zoneToDisplay: toZone("A4:B5") });
    expect(internalViewports()).toEqual({
      bottomRight: { zone: "A4:B5", height: 1000, width: 1000 },
    });

    // Zone fully inside left frozen panes
    viewPlugin.setViewportArgs({ zoneToDisplay: toZone("B2:B7") });
    expect(internalViewports()).toEqual({
      // left viewports transformed into right viewports to have bottomRight always defined
      topRight: { zone: "B2:B3", height: cellHeight * 2, width: 1000 },
      bottomRight: { zone: "B4:B7", height: 1000 - cellHeight * 2, width: 1000 },
    });

    // Zone fully inside top frozen panes
    viewPlugin.setViewportArgs({ zoneToDisplay: toZone("A2:E2") });
    expect(internalViewports()).toEqual({
      // top viewports transformed into bottom viewports to have bottomRight always defined
      bottomLeft: { zone: "A2:C2", height: 1000, width: cellWidth * 3 },
      bottomRight: { zone: "D2:E2", height: 1000, width: 1000 - cellWidth * 3 },
    });
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
    ({ viewPlugin } = makeViewportsPlugin(model));
  });

  test("viewports of multiple sheets of different size are correctly computed", () => {
    activateSheet(model, "small");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
    activateSheet(model, "big");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 4,
      left: 0,
      right: 4,
    });
    expect(viewPlugin.activeSheetScrollInfo).toMatchObject({
      scrollX: 0,
      scrollY: 0,
    });
  });

  test("deleting the column that has the active cell doesn't crash", () => {
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getSheetName(sheetId)).toBe("small");
    selectCell(model, "B2");
    deleteColumns(model, ["B"]);
    expect(viewPlugin.activeMainViewport).toMatchObject({
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
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 0,
      left: 0,
      right: 1,
    });
    const position = model.getters.getActivePosition();
    expect(model.getters.getCell(position)).toBeUndefined();
  });

  test("Client resize impacts all sheets", () => {
    const width = 2.5 * DEFAULT_CELL_WIDTH; // concretely 2.5 cells visible
    const height = 3.5 * DEFAULT_CELL_HEIGHT; // concretely 3.5 cells visible
    viewPlugin.resizeSheetView({ height: height, width: width });
    activateSheet(model, "small");
    expect(viewPlugin.activeMainViewport).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    });
    activateSheet(model, "big");
    expect(viewPlugin.activeMainViewport).toMatchObject({
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
  let container: DependencyContainer;
  beforeEach(() => {
    ({ model, viewPlugin, container } = makeViewportsPlugin());
  });

  test("basic move viewport", () => {
    const { bottom } = viewPlugin.activeMainViewport;
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeMainViewport.top).toBe(bottom);
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.activeMainViewport.top).toBe(0);
  });

  test("move viewport with non-default size", () => {
    viewPlugin.resizeSheetView({ height: 100, width: 100 });
    const { bottom } = viewPlugin.activeMainViewport;
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeMainViewport.top).toBe(bottom);
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.activeMainViewport.top).toBe(0);
  });

  test.each([
    [DEFAULT_CELL_HEIGHT * 3, 3],
    [DEFAULT_CELL_HEIGHT * 3 + 1, 3],
    [DEFAULT_CELL_HEIGHT * 3 - 1, 2],
  ])("Move viewport not starting from the top", (scrollValue, expectedTop) => {
    selectCell(model, "A4");
    const { bottom } = viewPlugin.activeMainViewport;
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: scrollValue });
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeMainViewport.top).toBe(bottom + expectedTop);
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.activeMainViewport.top).toBe(expectedTop);
  });

  test("move all the way down and up again", () => {
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    const { bottom } = viewPlugin.activeMainViewport;
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeMainViewport.top).toBe(bottom);
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeMainViewport.bottom).toBe(numberOfRows - 1);
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeMainViewport.bottom).toBe(numberOfRows - 1);

    const { top } = viewPlugin.activeMainViewport;
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.activeMainViewport.bottom).toBe(top);
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.activeMainViewport.top).toBe(0);
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.activeMainViewport.top).toBe(0);
  });

  test("move viewport does not changes its dimension", () => {
    const viewportDimension = viewPlugin.sheetViewDimensionWithHeaders;
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.sheetViewDimensionWithHeaders).toEqual(viewportDimension);
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.sheetViewDimensionWithHeaders).toEqual(viewportDimension);
  });

  test("X offset does not change", () => {
    selectCell(model, "D1");
    viewPlugin.setViewportOffset({ offsetX: DEFAULT_CELL_WIDTH * 3, offsetY: 0 });
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeSheetScrollInfo.scrollX).toBe(DEFAULT_CELL_WIDTH * 3);
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.activeSheetScrollInfo.scrollX).toBe(DEFAULT_CELL_WIDTH * 3);
  });

  test("anchor cell at the viewport top is shifted", () => {
    const { bottom } = viewPlugin.activeMainViewport;
    selectCell(model, "A1");
    viewPlugin.shiftViewportDown();
    expect(model.getters.getSelectedZones()).toHaveLength(1);
    expect(model.getters.getSelectedZone()).toEqual({ top: bottom, bottom, left: 0, right: 0 });
    viewPlugin.shiftViewportUp();
    expect(model.getters.getSelectedZones()).toHaveLength(1);
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
  });

  test("anchor cell not at the viewport top is shifted", () => {
    const { bottom } = viewPlugin.activeMainViewport;
    selectCell(model, "B4");
    viewPlugin.shiftViewportDown();
    expect(model.getters.getSelectedZone()).toEqual({
      top: bottom + 3,
      bottom: bottom + 3,
      left: 1,
      right: 1,
    });
    viewPlugin.shiftViewportUp();
    expect(model.getters.getSelectedZone()).toEqual(toZone("B4"));
  });

  test("only anchor cell is kept (and shifted) when moving the viewport", () => {
    setSelection(model, ["A1:A2", "B5", "D1:D2"], {
      anchor: "D1",
    });
    const { bottom } = viewPlugin.activeMainViewport;
    viewPlugin.shiftViewportDown();
    expect(model.getters.getSelectedZones()).toHaveLength(1);
    expect(model.getters.getSelectedZone()).toEqual({
      top: bottom,
      bottom,
      left: 3,
      right: 3,
    });
  });

  test("hidden rows are skipped", () => {
    const { bottom } = viewPlugin.activeMainViewport;
    hideRows(model, [2, 3, 4]);
    const { bottom: bottomWithHiddenRows } = viewPlugin.activeMainViewport;
    expect(bottomWithHiddenRows).toBe(bottom + 3);
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeMainViewport.top).toBe(bottomWithHiddenRows);
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.activeMainViewport.bottom).toBe(bottomWithHiddenRows);
  });

  test("bottom cell is in a merge and new anchor in the merge", () => {
    const { bottom } = viewPlugin.activeMainViewport;
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
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeMainViewport.top).toBe(mergeTop);
    viewPlugin.shiftViewportUp();
    expect(viewPlugin.activeMainViewport.bottom).toBe(bottom);
  });

  test("bottom cell is in a merge and new anchor *not* in the merge", () => {
    const { bottom } = viewPlugin.activeMainViewport;
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
    viewPlugin.shiftViewportDown();
    expect(viewPlugin.activeMainViewport.top).toBe(bottom);
  });

  test("anchor ends up at the last row", () => {
    const { bottom } = viewPlugin.activeMainViewport;
    const sheetId = model.getters.getActiveSheetId();
    viewPlugin.resizeSheetView({
      height: bottom * DEFAULT_CELL_HEIGHT,
      width: getDefaultSheetViewSize(),
    });
    deleteRows(model, range(bottom + 1, model.getters.getNumberRows(sheetId)));
    selectCell(model, toXC(0, bottom));
    expect(viewPlugin.activeMainViewport.bottom).toBe(bottom);
    viewPlugin.shiftViewportDown();
    expect(model.getters.getSelectedZone()).toEqual({
      top: bottom,
      bottom: model.getters.getNumberRows(sheetId) - 1,
      left: 0,
      right: 0,
    });
  });

  describe("shift down/up with frozen panes", () => {
    test("shift down/up with frozen rows and with selection in frozen rows", () => {
      freezeRows(model, 5);
      const { bottom, top } = viewPlugin.activeMainViewport;
      viewPlugin.shiftViewportDown();
      expect(viewPlugin.activeMainViewport.top).toBe(bottom);
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1");
      viewPlugin.shiftViewportUp();
      expect(viewPlugin.activeMainViewport.top).toBe(top);
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1");
    });

    test("shift down/up with frozen rows and with selection not in frozen rows", () => {
      freezeRows(model, 5);
      selectCell(model, "A6");
      const { bottom, top } = viewPlugin.activeMainViewport;
      viewPlugin.shiftViewportDown();
      expect(viewPlugin.activeMainViewport.top).toBe(bottom);
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual(toXC(0, bottom));
      viewPlugin.shiftViewportUp();
      expect(viewPlugin.activeMainViewport.top).toBe(top);
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A6");
    });

    test("shift down scrolls until the last row if there are frozen rows", () => {
      const sheetId = model.getters.getActiveSheetId();
      const numberOfRows = model.getters.getNumberRows(sheetId);
      freezeRows(model, 10);
      let { bottom } = viewPlugin.activeMainViewport;
      while (true) {
        viewPlugin.shiftViewportDown();
        const newBottom = viewPlugin.activeMainViewport.bottom;
        if (newBottom === bottom) {
          break;
        }
        bottom = newBottom;
      }
      expect(viewPlugin.activeMainViewport.bottom).toBe(numberOfRows - 1);
    });
  });

  test.each(["A1", "A2"])(
    "viewport and selection %s do not move when its already the end of the sheet",
    (selectedCell) => {
      const sheetId = model.getters.getActiveSheetId();
      // delete all rows except the first two ones
      deleteRows(model, range(2, model.getters.getNumberRows(sheetId)));
      selectCell(model, selectedCell);
      viewPlugin.shiftViewportDown();
      expect(viewPlugin.activeMainViewport.top).toBe(0);
      expect(model.getters.getSelectedZone()).toEqual(toZone(selectedCell));
      viewPlugin.shiftViewportUp();
      expect(viewPlugin.activeMainViewport.top).toBe(0);
      expect(model.getters.getSelectedZone()).toEqual(toZone(selectedCell));
    }
  );

  test.each(["A1", "A2", "A15"])(
    "anchor %s is shifted by the correct amount when the sheet end is reached",
    (selectedCell) => {
      const { bottom } = viewPlugin.activeMainViewport;
      const sheetId = model.getters.getActiveSheetId();
      // delete all rows after the viewport except three
      deleteRows(model, range(bottom + 3, model.getters.getNumberRows(sheetId)));
      selectCell(model, selectedCell);
      viewPlugin.shiftViewportDown();
      expect(model.getters.getSelectedZone()).toEqual({
        top: toZone(selectedCell).top + 4,
        bottom: toZone(selectedCell).bottom + 4,
        left: 0,
        right: 0,
      });
      viewPlugin.shiftViewportUp();
      expect(model.getters.getSelectedZone()).toEqual(toZone(selectedCell));
    }
  );

  test("Ensure the cell is in the viewport when starting the edition of a cell", async () => {
    const composerStore = container.get(CellComposerStore);
    viewPlugin.resizeSheetView({ height: 100, width: 100 });
    setCellContent(model, "A1", "apple");
    selectCell(model, "A1");
    const sheetId = model.getters.getActiveSheetId();
    const { col, row } = model.getters.getActivePosition();
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: 200 });
    expect(viewPlugin.viewports().isVisibleInViewport({ sheetId, col, row })).toBeFalsy();
    composerStore.startEdition();
    expect(viewPlugin.viewports().isVisibleInViewport({ sheetId, col, row })).toBeTruthy();
  });
});

describe("Partially Scrolled Viewport", () => {
  test("getRowIndex takes the partial scroll into account", () => {
    const model = new Model();
    const { viewPlugin } = makeViewportsPlugin(model);
    const rowSize = 10; // to avoid rounding issues
    resizeRows(model, range(0, 10), rowSize);
    viewPlugin.setViewportOffset({ offsetX: 0, offsetY: 2.3 * rowSize });
    expect(viewPlugin.viewports().getRowIndex(model.getters.getActiveSheetId(), 0)).toBe(2);
    expect(
      viewPlugin.viewports().getRowIndex(model.getters.getActiveSheetId(), 0.5 * rowSize)
    ).toBe(2);
    expect(
      viewPlugin.viewports().getRowIndex(model.getters.getActiveSheetId(), 0.6 * rowSize)
    ).toBe(2);
    expect(
      viewPlugin.viewports().getRowIndex(model.getters.getActiveSheetId(), 0.699 * rowSize)
    ).toBe(2);
    expect(
      viewPlugin.viewports().getRowIndex(model.getters.getActiveSheetId(), 0.7 * rowSize)
    ).toBe(3);
    expect(viewPlugin.viewports().getRowIndex(model.getters.getActiveSheetId(), rowSize)).toBe(3);
  });

  test("getColIndex takes the partial scroll into account", () => {
    const model = new Model();
    const { viewPlugin } = makeViewportsPlugin(model);
    const colSize = 10; // to avoid rounding issues
    resizeColumns(model, range(0, 10).map(numberToLetters), colSize);
    viewPlugin.setViewportOffset({ offsetX: 2.3 * colSize, offsetY: 0 });
    expect(viewPlugin.viewports().getColIndex(model.getters.getActiveSheetId(), 0)).toBe(2);
    expect(
      viewPlugin.viewports().getColIndex(model.getters.getActiveSheetId(), 0.5 * colSize)
    ).toBe(2);
    expect(
      viewPlugin.viewports().getColIndex(model.getters.getActiveSheetId(), 0.6 * colSize)
    ).toBe(2);
    expect(
      viewPlugin.viewports().getColIndex(model.getters.getActiveSheetId(), 0.699 * colSize)
    ).toBe(2);
    expect(
      viewPlugin.viewports().getColIndex(model.getters.getActiveSheetId(), 0.7 * colSize)
    ).toBe(3);
    expect(viewPlugin.viewports().getColIndex(model.getters.getActiveSheetId(), colSize)).toBe(3);
  });

  test("getVisibleRect takes the partial scroll into account", () => {
    const model = new Model();
    const { viewPlugin } = makeViewportsPlugin(model);
    const headerSize = 10; // to avoid rounding issues
    resizeColumns(model, range(0, 10).map(numberToLetters), headerSize);
    resizeRows(model, range(0, 10), headerSize);
    viewPlugin.setViewportOffset({ offsetX: 0.3 * headerSize, offsetY: 0.3 * headerSize });
    expect(
      viewPlugin.viewports().getVisibleRect(model.getters.getActiveSheetId(), toZone("A1"))
    ).toEqual({
      x: 0,
      y: 0,
      width: 0.7 * headerSize,
      height: 0.7 * headerSize,
    });
  });
});
