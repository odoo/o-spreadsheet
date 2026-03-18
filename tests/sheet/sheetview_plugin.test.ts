import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_REVISION_ID,
  MESSAGE_VERSION,
  getDefaultSheetViewSize,
} from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { SheetViewPlugin } from "@odoo/o-spreadsheet-engine/plugins/ui_stateful/sheetview";
import { StateUpdateMessage } from "@odoo/o-spreadsheet-engine/types/collaborative/transport_service";
import { CommandResult } from "../../src";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { isDefined, numberToLetters, range, toXC, toZone, zoneToXc } from "../../src/helpers";
import { Zone } from "../../src/types";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  createTableWithFilter,
  deleteColumns,
  deleteRows,
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
  resizeSheetView,
  selectAll,
  selectCell,
  selectColumn,
  selectRow,
  setCellContent,
  setFormat,
  setFormatting,
  setSelection,
  setViewportOffset,
  shiftViewportDown,
  shiftViewportUp,
  undo,
  unfreezeColumns,
  unfreezeRows,
  updateFilter,
  updateTableZone,
} from "../test_helpers/commands_helpers";
import { createModel, getPlugin } from "../test_helpers/helpers";
import { makeStore } from "../test_helpers/stores";

let model: Model;

function getPanes() {
  const sheetViewPlugin = getPlugin(model, SheetViewPlugin);
  const sheetId = model.getters.getActiveSheetId();
  return Object.fromEntries(
    Object.entries(sheetViewPlugin["viewports"][sheetId]!).filter((entry) => isDefined(entry[1]))
  );
}

function getSheetViewBoundaries(model: Model): Zone {
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
    model = await createModel();
  });

  test("SET_VIEWPORT_OFFSET is refused if it won't scroll any viewport", async () => {
    expect(await setViewportOffset(model, 0, 0)).toBeCancelledBecause(
      CommandResult.ViewportScrollLimitsReached
    );

    expect(await setViewportOffset(model, 10, 10)).toBeSuccessfullyDispatched();
    expect(await setViewportOffset(model, 10, 10)).toBeCancelledBecause(
      CommandResult.ViewportScrollLimitsReached
    );
  });

  test("Select cell correctly affects offset", async () => {
    const { width, height } = model.getters.getSheetViewDimension();
    await selectCell(model, "P1");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 5,
      right: 15,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 16 * DEFAULT_CELL_WIDTH - width,
      scrollY: 0,
    });

    await selectCell(model, "A79");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 35,
      bottom: 78,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: 79 * DEFAULT_CELL_HEIGHT - height,
    });

    // back to topleft
    await selectCell(model, "A1");
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

    await selectCell(model, "U51");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 7,
      bottom: 50,
      left: 10,
      right: 20,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 21 * DEFAULT_CELL_WIDTH - width,
      scrollY: 51 * DEFAULT_CELL_HEIGHT - height,
    });
  });

  test("updateAnchor scrolls to the anchor cell when zone is unchanged", async () => {
    model = await createModel({ sheets: [{ colNumber: 5, rowNumber: 120 }] });
    await setSelection(model, ["A1:A100"]);
    await setViewportOffset(model, 0, 0);

    const { top: initialTop, bottom: initialBottom } = model.getters.getActiveMainViewport();
    const targetRow = initialBottom + 5;
    model.selection.updateAnchorCell(0, targetRow);
    expect(model.getters.getSelection().anchor.cell).toEqual({ col: 0, row: targetRow });

    const expectedTop = initialTop + 5;
    const expectedBottom = initialBottom + 5;
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: expectedTop,
      bottom: expectedBottom,
    });
  });

  test("Can Undo/Redo action that alters viewport structure (add/delete rows or cols)", async () => {
    model.getters.getActiveMainViewport();
    await addRows(model, "before", 0, 70);
    await selectCell(model, "B170");
    const { height: sheetViewHeight } = model.getters.getSheetViewDimension();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 126,
      bottom: 169,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 170 - sheetViewHeight,
    });

    await undo(model);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 58,
      bottom: 99,
    });
    const { height } = model.getters.getMainViewportRect();
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: height - sheetViewHeight, // max scroll
    });

    await redo(model); // should not alter offset
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      left: 0,
      right: 10,
      top: 58,
      bottom: 101,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: height - sheetViewHeight, // max scroll
    });
  });

  test("Add columns doesn't affect offset", async () => {
    await selectCell(model, "P1");
    const currentViewport = model.getters.getActiveMainViewport();
    await addColumns(model, "after", "P", 30);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
    await undo(model);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
    await addColumns(model, "before", "P", 30);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
  });
  test("Add rows doesn't affect offset", async () => {
    await selectCell(model, "A51");
    const currentViewport = model.getters.getActiveMainViewport();
    await addRows(model, "after", 50, 30);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
    await undo(model);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
    await addRows(model, "before", 50, 30);
    expect(model.getters.getActiveMainViewport()).toMatchObject(currentViewport);
  });

  test("Horizontal scroll correctly affects offset", async () => {
    await setViewportOffset(model, DEFAULT_CELL_WIDTH * 2, 0);
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

    await setViewportOffset(model, DEFAULT_CELL_WIDTH * 14, 0);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 14,
      right: 24,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 14,
      scrollY: 0,
    });

    await setViewportOffset(model, DEFAULT_CELL_WIDTH * 12.6, 0);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0, // partially visible
      bottom: 43,
      left: 12,
      right: 23, // partially visible
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 12.6,
      scrollY: 0,
    });
  });

  test("Horizontal scroll correctly affects bottomRight offset with frozen panes", async () => {
    const sheetId = model.getters.getActiveSheetId();
    await freezeColumns(model, 4, sheetId);
    await freezeRows(model, 5, sheetId);
    await setViewportOffset(model, DEFAULT_CELL_WIDTH * 2, 0);
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

    await setViewportOffset(model, DEFAULT_CELL_WIDTH * 16, 0);
    expect(getSheetViewBoundaries(model)).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 25,
    });

    const { width: sheetViewWidth } = model.getters.getSheetViewDimension();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 5,
      bottom: 43,
      left: 19,
      right: 25,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 26 * DEFAULT_CELL_WIDTH - sheetViewWidth, // fully scrolled
      scrollY: 0,
    });
  });

  test("can horizontal scroll on sheet smaller than viewport", async () => {
    model = await createModel({ sheets: [{ rowNumber: 2 }] });
    await setViewportOffset(model, DEFAULT_CELL_WIDTH * 2, 0);
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

  test("Vertical scroll correctly affects offset", async () => {
    await setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 2);
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

    await setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 57);
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

    await setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 12.6);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 12, // partially visible
      bottom: 56, // partially visible
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 12.6,
    });
  });

  test("Vertical scroll correctly affects bottomRight offset with frozen panes", async () => {
    const sheetId = model.getters.getActiveSheetId();
    await freezeColumns(model, 4, sheetId);
    await freezeRows(model, 5, sheetId);
    await setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 2);
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

    await setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 57);
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

    await setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 12.6);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 17, //partially visible
      bottom: 56, //partially visible
      left: 4,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
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

  test("can vertical scroll on sheet smaller than viewport", async () => {
    model = await createModel({ sheets: [{ colNumber: 2 }] });
    await setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 2);
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

  test("cannot set offset outside of the grid", async () => {
    // negative
    await setViewportOffset(model, -1, -1);
    expect(model.getters.getActiveSheetScrollInfo()).toEqual({
      scrollX: 0,
      scrollY: 0,
    });

    // too large
    await resizeSheetView(model, 10 * DEFAULT_CELL_HEIGHT, 10 * DEFAULT_CELL_WIDTH);
    const sheetId = model.getters.getActiveSheetId();
    const nCols = model.getters.getNumberCols(sheetId);
    const nRows = model.getters.getNumberRows(sheetId);
    await setViewportOffset(
      model,
      nCols * DEFAULT_CELL_WIDTH + 10,
      nRows * DEFAULT_CELL_HEIGHT + 10
    );

    const maxOffsetX = DEFAULT_CELL_WIDTH * (nCols - 10);
    const maxOffsetY = DEFAULT_CELL_HEIGHT * (nRows - 10) + 46;
    expect(model.getters.getActiveSheetScrollInfo()).toEqual({
      scrollX: maxOffsetX,
      scrollY: maxOffsetY,
    });
  });

  test("Resize (increase) columns correctly affects viewport without changing the offset", async () => {
    const sheetId = model.getters.getActiveSheetId();
    await setViewportOffset(model, DEFAULT_CELL_WIDTH * 2, 0);
    const { scrollX } = model.getters.getActiveSheetScrollInfo();
    await resizeColumns(
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

  test("Resize (reduce) columns correctly changes offset", async () => {
    const sheetId = model.getters.getActiveSheetId();
    //scroll max
    await selectCell(model, "Z1");
    await selectAll(model);
    await resizeColumns(
      model,
      [...Array(model.getters.getNumberCols(sheetId)).keys()].map(numberToLetters),
      DEFAULT_CELL_WIDTH / 2
    );
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 5,
      right: 25,
    });
    const { width: sheetViewWidth } = model.getters.getSheetViewDimension();
    const { width } = model.getters.getMainViewportRect();
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: width - sheetViewWidth, // max scroll
      scrollY: 0,
    });
  });

  test("Resize rows correctly affects viewport without changing the offset", async () => {
    const numberRows = model.getters.getNumberRows(model.getters.getActiveSheetId());
    await setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT * 2);
    const { scrollY } = model.getters.getActiveSheetScrollInfo();
    await resizeRows(model, [...Array(numberRows).keys()], DEFAULT_CELL_HEIGHT * 2);
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

  test("Resize (reduce) rows correctly changes offset", async () => {
    const numberRows = model.getters.getNumberRows(model.getters.getActiveSheetId());
    //scroll max
    await selectCell(model, "A100");
    model.selection.selectAll();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 56, // partially visble
      bottom: 99,
      left: 0,
      right: 10,
    });
    await resizeRows(model, [...Array(numberRows).keys()], DEFAULT_CELL_HEIGHT / 2);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 20,
      bottom: 99,
      left: 0,
      right: 10,
    });
    const { height: sheetViewHeight } = model.getters.getSheetViewDimension();
    const { height } = model.getters.getMainViewportRect();
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: height - sheetViewHeight, // max scroll
    });
  });

  test("Hide/unhide Columns from leftest column", async () => {
    await hideColumns(model, [0, 1, 2, 4, 5].map(numberToLetters)); // keep 3
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

  test("Hide/unhide Columns from rightest column", async () => {
    await selectCell(model, "Z1");
    const viewport = model.getters.getActiveMainViewport();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    await hideColumns(model, range(13, 26).map(numberToLetters));
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: viewport.top,
      bottom: viewport.bottom,
      left: 2,
      right: 12, // stops at the last visible column
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 13 - model.getters.getSheetViewDimension().width,
      scrollY: 0,
    });
  });

  test("Hide/unhide Row from top row", async () => {
    await hideRows(model, [0, 1, 2, 4, 5]); // keep 3
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

  test("Hide/unhide Rows from bottom row", async () => {
    await selectCell(model, "A100");
    const viewport = model.getters.getActiveMainViewport();
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    await hideRows(model, range(60, 100));
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 18,
      bottom: 99,
      left: viewport.left,
      right: viewport.right,
    });
    const { height: sheetViewHeight } = model.getters.getSheetViewDimension();
    const { height } = model.getters.getMainViewportRect();
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: height - sheetViewHeight, // max scroll
    });
  });

  test("Horizontally move position to top right then back to top left correctly affects offset", async () => {
    const { right } = model.getters.getActiveMainViewport();
    await selectCell(model, toXC(right - 1, 0));
    await moveAnchorCell(model, "right");
    const { width } = model.getters.getSheetViewDimension();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 11 - width,
      scrollY: 0,
    });
    await moveAnchorCell(model, "right");
    await moveAnchorCell(model, "right");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 2,
      right: 12,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: DEFAULT_CELL_WIDTH * 13 - width,
      scrollY: 0,
    });
    const { left } = model.getters.getActiveMainViewport();
    await selectCell(model, toXC(left, 0));
    await moveAnchorCell(model, "left");
    await moveAnchorCell(model, "left");
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
  });

  test("Vertically move position to bottom left then back to top left correctly affects offset", async () => {
    const { bottom } = model.getters.getActiveMainViewport();
    await selectCell(model, toXC(0, bottom));
    await moveAnchorCell(model, "down");
    const { height } = model.getters.getSheetViewDimension();
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 1,
      bottom: 44,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 45 - height,
    });
    await moveAnchorCell(model, "down");
    await moveAnchorCell(model, "down");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 3,
      bottom: 46,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: DEFAULT_CELL_HEIGHT * 47 - height,
    });
    const { top } = model.getters.getActiveMainViewport();
    await selectCell(model, toXC(0, top));
    await moveAnchorCell(model, "up");
    await moveAnchorCell(model, "up");
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
    test("Move horizontally a cell which row is outside the viewport", async () => {
      const { bottom } = model.getters.getActiveMainViewport();
      await selectCell(model, toXC(0, bottom + 3));
      const viewport = { ...model.getters.getActiveMainViewport() };
      await setViewportOffset(model, 0, 0);
      await moveAnchorCell(model, "right");
      expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    });

    test("Move vertically a cell which col is outside the viewport", async () => {
      const { right } = model.getters.getActiveMainViewport();
      await selectCell(model, toXC(right + 3, 0));
      const viewport = { ...model.getters.getActiveMainViewport() };
      await setViewportOffset(model, 0, 0);
      await moveAnchorCell(model, "down");
      expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
    });
  });

  test("Move position on cells that are taller than the clients height", async () => {
    const { height } = model.getters.getSheetViewDimensionWithHeaders();
    await resizeRows(model, [0], height + 50);
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
    await moveAnchorCell(model, "down");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 10,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: 0,
      scrollY: height + 50 + DEFAULT_CELL_HEIGHT - model.getters.getSheetViewDimension().height,
    });
  });

  test("Move position on cells wider than the clients width", async () => {
    const { width } = model.getters.getSheetViewDimensionWithHeaders();
    await resizeColumns(model, ["A"], width + 50);
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
    await moveAnchorCell(model, "right");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 43,
      left: 0,
      right: 1,
    });
    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: width + 50 + DEFAULT_CELL_WIDTH - model.getters.getSheetViewDimension().width,
      scrollY: 0,
    });
  });
  test("Select Column while updating range does not update viewport", async () => {
    await selectCell(model, "C51");
    const viewport = model.getters.getActiveMainViewport();
    await selectColumn(model, 3, "overrideSelection");
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
  });
  test("Select Row does not update viewport", async () => {
    await selectCell(model, "U5");
    const viewport = model.getters.getActiveMainViewport();
    await selectRow(model, 3, "overrideSelection");
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewport);
  });

  test("Resize Viewport is correctly computed and does not adjust position", async () => {
    await selectCell(model, "K71");
    await setViewportOffset(model, 100, 112);
    const viewport = model.getters.getActiveMainViewport();
    await resizeSheetView(model, 500, 500);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      ...viewport,
      bottom: Math.ceil((100 + 500) / DEFAULT_CELL_HEIGHT) - 1,
      right: Math.ceil((112 + 500) / DEFAULT_CELL_WIDTH) - 1,
    });
  });

  test("Resizing the viewport impacts current Offset", async () => {
    // set coherent size and offset limit
    await resizeSheetView(model, getDefaultSheetViewSize(), getDefaultSheetViewSize());
    let { width: gridWidth, height: gridHeight } = model.getters.getMainViewportRect();
    let { width, height } = model.getters.getSheetViewDimensionWithHeaders();
    await setViewportOffset(model, gridWidth - width, gridHeight - height);
    // de-zoom
    await resizeSheetView(model, 1250, 1250);
    ({ width, height } = model.getters.getSheetViewDimensionWithHeaders());
    ({ width: gridWidth, height: gridHeight } = model.getters.getMainViewportRect());

    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({
      scrollX: gridWidth - width,
      scrollY: gridHeight - height,
    });
  });

  test("Cannot freeze col/row through merges", async () => {
    await merge(model, "C4:D5");
    expect(await freezeColumns(model, 3)).toBeCancelledBecause(CommandResult.MergeOverlap);
    expect(await freezeRows(model, 4)).toBeCancelledBecause(CommandResult.MergeOverlap);
  });

  test("resize to identical values doesn't do anything (no render)", async () => {
    await resizeSheetView(model, 100, 50, 10, 15);
    expect(await resizeSheetView(model, 100, 50, 10, 15)).toBeCancelledBecause(
      CommandResult.ValuesNotChanged
    );
  });

  test("cannot resize to negative values", async () => {
    expect(await resizeSheetView(model, -100, 50)).toBeCancelledBecause(
      CommandResult.InvalidViewportSize
    );
    expect(await resizeSheetView(model, 100, -50)).toBeCancelledBecause(
      CommandResult.InvalidViewportSize
    );
  });

  test("Viewport is updated when updating a data filter", async () => {
    model = await createModel();
    await createTableWithFilter(model, "A1:A10");
    await setCellContent(model, "A2", "5");
    await setCellContent(model, "A2", "5");

    const initialViewport = { ...model.getters.getActiveMainViewport() };
    await updateFilter(model, "A1", ["5"]);
    expect(model.getters.getActiveMainViewport()).not.toEqual(initialViewport);

    await updateTableZone(model, "A1:A10", "B3:B10");
    expect(model.getters.getActiveMainViewport()).toEqual(initialViewport);
  });

  test("Viewport is updated when updating a cell that change the evaluation of filtered rows", async () => {
    model = await createModel();
    await createTableWithFilter(model, "A1:A10");
    await setCellContent(model, "A2", "=B1");
    await setCellContent(model, "A2", "=B1");
    await setCellContent(model, "A3", "=B1");
    await setCellContent(model, "A4", "=B1");
    await setCellContent(model, "A5", "=5");
    await updateFilter(model, "A1", ["5"]);
    let oldViewport = { ...model.getters.getActiveMainViewport() };
    await setCellContent(model, "B1", "5");
    expect(model.getters.getActiveMainViewport()).not.toEqual(oldViewport);
    oldViewport = { ...model.getters.getActiveMainViewport() };
    await setFormat(model, "A5", "0.00%");
    expect(model.getters.getActiveMainViewport()).not.toEqual(oldViewport);
  });

  test("Viewport is updated when folding/unfolding header groups", async () => {
    model = await createModel();

    await groupColumns(model, "A", "B");
    let oldViewport = { ...model.getters.getActiveMainViewport() };
    await foldHeaderGroup(model, "COL", 0, 1);
    expect(model.getters.getActiveMainViewport()).not.toEqual(oldViewport);

    await groupRows(model, 1, 2);
    oldViewport = { ...model.getters.getActiveMainViewport() };
    await foldHeaderGroup(model, "ROW", 1, 2);
    expect(model.getters.getActiveMainViewport()).not.toEqual(oldViewport);
  });

  test("viewport is recomputed when font size changes", async () => {
    expect(model.getters.getActiveMainViewport()).toEqual({
      bottom: 43,
      left: 0,
      right: 10,
      top: 0,
    });
    await setFormatting(model, "A1:A20", { fontSize: 36 });
    for (let i = 1; i <= 20; ++i) {
      await setCellContent(model, `A${i}`, "test"); // Requires non-empty cells. Otherwise, the fontsize is not considered when computing the row height
    }
    expect(model.getters.getActiveMainViewport()).toEqual({
      bottom: 18,
      left: 0,
      right: 10,
      top: 0,
    });
    await setFormatting(model, "A1:A20", { fontSize: 8 });
    expect(model.getters.getActiveMainViewport()).toEqual({
      bottom: 43,
      left: 0,
      right: 10,
      top: 0,
    });
  });

  test("getVisibleRect returns the actual visible part of a zone", async () => {
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    await resizeSheetView(model, height, width);
    expect(model.getters.getVisibleRect(model.getters.getActiveMainViewport())).toEqual({
      x: 0,
      y: 0,
      width,
      height,
    });
  });

  test("getVisibleRect with frozen panes returns the actual visible part of a zone", async () => {
    await freezeColumns(model, 1);
    await freezeRows(model, 1);
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    await resizeSheetView(model, height, width);
    const zone = model.getters.getActiveMainViewport();
    expect(model.getters.getVisibleRect(zone)).toEqual({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
      width: 3.5 * DEFAULT_CELL_WIDTH,
      height: 4.5 * DEFAULT_CELL_HEIGHT,
    });
    await setViewportOffset(model, DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);
    expect(model.getters.getVisibleRect(zone)).toEqual({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
      width: 3 * DEFAULT_CELL_WIDTH,
      height: 4 * DEFAULT_CELL_HEIGHT,
    });
  });

  test("getVisibleRect takes the scroll into account", async () => {
    await merge(model, "A1:B2");
    const zone = toZone("A1:B2");
    expect(model.getters.getVisibleRect(zone)).toEqual({
      x: 0,
      y: 0,
      width: DEFAULT_CELL_WIDTH * 2,
      height: DEFAULT_CELL_HEIGHT * 2,
    });
    await setViewportOffset(model, DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);
    expect(model.getters.getVisibleRect(zone)).toEqual({
      x: 0,
      y: 0,
      width: DEFAULT_CELL_WIDTH,
      height: DEFAULT_CELL_HEIGHT,
    });
  });

  test("getRect returns the full zone dimensions regardless of the viewport size", async () => {
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    await resizeSheetView(model, height, width);
    expect(model.getters.getRect(model.getters.getActiveMainViewport())).toEqual({
      x: 0,
      y: 0,
      width: 5 * DEFAULT_CELL_WIDTH,
      height: 6 * DEFAULT_CELL_HEIGHT,
    });
  });

  test("getRect with frozen panes returns the full part of a zone", async () => {
    await freezeColumns(model, 1);
    await freezeRows(model, 1);
    const width = 4.5 * DEFAULT_CELL_WIDTH;
    const height = 5.5 * DEFAULT_CELL_HEIGHT;
    await resizeSheetView(model, height, width);
    const zone = model.getters.getActiveMainViewport();
    expect(model.getters.getRect(zone)).toEqual({
      x: DEFAULT_CELL_WIDTH,
      y: DEFAULT_CELL_HEIGHT,
      width: 4 * DEFAULT_CELL_WIDTH,
      height: 5 * DEFAULT_CELL_HEIGHT,
    });
    await setViewportOffset(model, DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRect(zone)).toEqual({
      x: 0,
      y: 0,
      width: 4 * DEFAULT_CELL_WIDTH,
      height: 5 * DEFAULT_CELL_HEIGHT,
    });
  });

  test("getRect takes the scroll into account", async () => {
    await merge(model, "A1:B2");
    const zone = toZone("A1:B2");
    expect(model.getters.getRect(zone)).toEqual({
      x: 0,
      y: 0,
      width: DEFAULT_CELL_WIDTH * 2,
      height: DEFAULT_CELL_HEIGHT * 2,
    });
    await setViewportOffset(model, DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRect(zone)).toEqual({
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

    expect(() => createModel({}, {}, initialMessages)).not.toThrow();
  });
});

describe("Multi Panes viewport", () => {
  beforeEach(async () => {
    model = await createModel();
  });

  test("SET_VIEWPORT_OFFSET is refused if it won't scroll any viewport", async () => {
    await freezeColumns(model, 4);
    await freezeRows(model, 5);
    expect(await setViewportOffset(model, 0, 0)).toBeCancelledBecause(
      CommandResult.ViewportScrollLimitsReached
    );

    expect(await setViewportOffset(model, 10, 10)).toBeSuccessfullyDispatched();
    expect(await setViewportOffset(model, 10, 10)).toBeCancelledBecause(
      CommandResult.ViewportScrollLimitsReached
    );
  });

  test("Freezing row generates 2 panes", async () => {
    const getPanesEntries = () => Object.keys(getPanes());
    expect(getPanesEntries()).toEqual(["bottomRight"]);
    await freezeRows(model, 5);
    expect(getPanesEntries()).toEqual(["topRight", "bottomRight"]);
    await freezeRows(model, 2);
    expect(getPanesEntries()).toEqual(["topRight", "bottomRight"]);
  });

  test("Unfreezing rows generates 1 pane", async () => {
    const getPanesEntries = () => Object.keys(getPanes());
    await freezeRows(model, 5);
    expect(getPanesEntries()).toEqual(["topRight", "bottomRight"]);
    await unfreezeRows(model);
    expect(getPanesEntries()).toEqual(["bottomRight"]);
  });

  test("Freezing column generates 2 panes", async () => {
    const getPanesEntries = () => Object.keys(getPanes());
    expect(getPanesEntries()).toEqual(["bottomRight"]);
    await freezeColumns(model, 4);
    expect(getPanesEntries()).toEqual(["bottomLeft", "bottomRight"]);
    await freezeColumns(model, 2);
    expect(getPanesEntries()).toEqual(["bottomLeft", "bottomRight"]);
  });

  test("Unfreezing cols generates 1 pane", async () => {
    await freezeColumns(model, 4);
    const getPanesEntries = () => Object.keys(getPanes());
    expect(getPanesEntries()).toEqual(["bottomLeft", "bottomRight"]);
    await unfreezeColumns(model);
    expect(getPanesEntries()).toEqual(["bottomRight"]);
  });

  test("Freezing both column and row generates 4 panes", async () => {
    const getPanesEntries = () => Object.keys(getPanes());
    expect(getPanesEntries()).toEqual(["bottomRight"]);
    await freezeColumns(model, 4);
    await freezeRows(model, 5);
    expect(getPanesEntries()).toEqual(["topLeft", "topRight", "bottomLeft", "bottomRight"]);
  });

  test("vertical scrolling only impacts 'bottomLeft' and 'bottomRight'", async () => {
    await freezeColumns(model, 4);
    await freezeRows(model, 5);
    await setViewportOffset(model, 0, 5 * DEFAULT_CELL_HEIGHT);
    expect(getPanes().topLeft!.offsetY).toBe(0);
    expect(getPanes().topRight!.offsetY).toBe(0);
    expect(getPanes().bottomLeft!.offsetY).toBe(5 * DEFAULT_CELL_HEIGHT);
    expect(getPanes().bottomRight!.offsetY).toBe(5 * DEFAULT_CELL_HEIGHT);
    expect(getPanes().topLeft!.offsetX).toBe(0);
    expect(getPanes().topRight!.offsetX).toBe(0);
    expect(getPanes().bottomLeft!.offsetX).toBe(0);
    expect(getPanes().bottomRight!.offsetX).toBe(0);
  });

  test("horizontal scrolling only impacts 'topRight' and 'bottomRight'", async () => {
    await freezeColumns(model, 4);
    await freezeRows(model, 5);
    await setViewportOffset(model, 5 * DEFAULT_CELL_WIDTH, 0);
    expect(getPanes().topLeft!.offsetX).toBe(0);
    expect(getPanes().topRight!.offsetX).toBe(5 * DEFAULT_CELL_WIDTH);
    expect(getPanes().bottomLeft!.offsetX).toBe(0);
    expect(getPanes().bottomRight!.offsetX).toBe(5 * DEFAULT_CELL_WIDTH);
    expect(getPanes().topLeft!.offsetY).toBe(0);
    expect(getPanes().topRight!.offsetY).toBe(0);
    expect(getPanes().bottomLeft!.offsetY).toBe(0);
    expect(getPanes().bottomRight!.offsetY).toBe(0);
  });
  test("Changing pane division preserves the offset", async () => {
    await setViewportOffset(model, 5 * DEFAULT_CELL_WIDTH, 3 * DEFAULT_CELL_HEIGHT);
    await freezeColumns(model, 4);
    await freezeRows(model, 5);
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
    await resizeSheetView(model, 10 * DEFAULT_CELL_HEIGHT, 10 * DEFAULT_CELL_WIDTH);
    await setViewportOffset(model, 0, 5 * DEFAULT_CELL_HEIGHT);
    await freezeRows(model, 11);
    expect(model.getters.getActiveSheetScrollInfo()).toEqual({
      scrollX: 0,
      scrollY: 0,
    });
    expect(await setViewportOffset(model, 0, 5 * DEFAULT_CELL_HEIGHT)).toBeCancelledBecause(
      CommandResult.InvalidScrollingDirection
    );
  });

  test("Freezing a column too far reset and disallow scrolling", async () => {
    await resizeSheetView(model, 10 * DEFAULT_CELL_HEIGHT, 10 * DEFAULT_CELL_WIDTH);
    await setViewportOffset(model, 5 * DEFAULT_CELL_WIDTH, 0);
    await freezeColumns(model, 10);
    expect(model.getters.getActiveSheetScrollInfo()).toEqual({
      scrollX: 0,
      scrollY: 0,
    });
    expect(await setViewportOffset(model, 5 * DEFAULT_CELL_WIDTH, 0)).toBeCancelledBecause(
      CommandResult.InvalidScrollingDirection
    );
  });

  test("Viewport remains unaffected when hiding all rows below frozen pane or columns right to frozen panes", async () => {
    const model = await createModel({ sheets: [{ colNumber: 8, rowNumber: 8 }] });
    const sheetId = model.getters.getActiveSheetId();

    await freezeRows(model, 4, sheetId);
    let originalActiveMainViewport = model.getters.getActiveMainViewport();
    await hideRows(model, [4, 5, 6, 7]);
    expect(model.getters.getActiveMainViewport()).toEqual(originalActiveMainViewport);

    await freezeColumns(model, 4, sheetId);
    originalActiveMainViewport = model.getters.getActiveMainViewport();
    await hideColumns(model, ["E", "F", "G", "H"]);
    expect(model.getters.getActiveMainViewport()).toEqual(originalActiveMainViewport);
  });

  test("filtered row rect after updating another sheet", async () => {
    const model = await createModel();
    const sheetId = model.getters.getActiveSheetId();
    await createSheet(model, { sheetId: "sh2" });
    await setCellContent(model, "A1", "Hi");
    await setCellContent(model, "A2", "Hello");

    await createTableWithFilter(model, "A1:A3");

    await updateFilter(model, "A1", ["Hello"]);
    expect(model.getters.isRowHidden(sheetId, 1)).toEqual(true);
    const rectA2 = {
      x: 0,
      y: DEFAULT_CELL_HEIGHT,
      width: DEFAULT_CELL_WIDTH,
      height: 0,
    };
    expect(model.getters.getVisibleRect(toZone("A2"))).toEqual(rectA2);
    await activateSheet(model, "sh2");
    await setCellContent(model, "A1", "hi");
    await activateSheet(model, sheetId);
    expect(model.getters.getVisibleRect(toZone("A2"))).toEqual(rectA2);
  });

  test("Viewport remains unaffected when hiding all rows below frozen panes by data filter", async () => {
    const model = await createModel({ sheets: [{ colNumber: 3, rowNumber: 3 }] });
    const sheetId = model.getters.getActiveSheetId();

    await setCellContent(model, "A2", "2808");
    await setCellContent(model, "A3", "2808");

    await createTableWithFilter(model, "A1:A3");
    await freezeRows(model, 2, sheetId);

    const originalActiveMainViewport = model.getters.getActiveMainViewport();
    await updateFilter(model, "A1", ["2808"]);

    expect(model.getters.getActiveMainViewport()).toEqual(originalActiveMainViewport);
  });

  test("Visible Cols and Rows are correctly computed when the sheetview has a 0 width", async () => {
    const model = await createModel();
    await resizeSheetView(model, 100, 0);
    expect(model.getters.getSheetViewVisibleCols()).toEqual([]);
    expect(model.getters.getSheetViewVisibleRows()).toEqual([]);

    await freezeColumns(model, 2);
    expect(model.getters.getSheetViewVisibleCols()).toEqual([]);
    expect(model.getters.getSheetViewVisibleRows()).toEqual([]);

    await freezeRows(model, 2);
    expect(model.getters.getSheetViewVisibleCols()).toEqual([]);
    expect(model.getters.getSheetViewVisibleRows()).toEqual([]);
  });

  test("Visible Cols and Rows are correctly computed when the sheetview has a 0 height", async () => {
    const model = await createModel();
    await resizeSheetView(model, 0, 100);
    expect(model.getters.getSheetViewVisibleCols()).toEqual([]);
    expect(model.getters.getSheetViewVisibleRows()).toEqual([]);

    await freezeColumns(model, 2);
    expect(model.getters.getSheetViewVisibleCols()).toEqual([]);
    expect(model.getters.getSheetViewVisibleRows()).toEqual([]);

    await freezeRows(model, 2);
    expect(model.getters.getSheetViewVisibleCols()).toEqual([]);
    expect(model.getters.getSheetViewVisibleRows()).toEqual([]);
  });
});

describe("multi sheet with different sizes", () => {
  beforeEach(async () => {
    model = await createModel({
      sheets: [
        { name: "small", id: "small", colNumber: 2, rowNumber: 2 },
        { name: "big", id: "big", colNumber: 5, rowNumber: 5 },
      ],
    });
  });

  test("viewports of multiple sheets of different size are correctly computed", async () => {
    await activateSheet(model, "small");
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
    await activateSheet(model, "big");
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

  test("deleting the column that has the active cell doesn't crash", async () => {
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getSheetName(sheetId)).toBe("small");
    await selectCell(model, "B2");
    await deleteColumns(model, ["B"]);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 0,
    });
    const position = model.getters.getActivePosition();
    expect(model.getters.getCell(position)).toBeUndefined();
  });

  test("deleting the row that has the active cell doesn't crash", async () => {
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getSheetName(sheetId)).toBe("small");
    await selectCell(model, "B2");
    await deleteRows(model, [1]);
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 0,
      left: 0,
      right: 1,
    });
    const position = model.getters.getActivePosition();
    expect(model.getters.getCell(position)).toBeUndefined();
  });

  test("Client resize impacts all sheets", async () => {
    const width = 2.5 * DEFAULT_CELL_WIDTH; // concretely 2.5 cells visible
    const height = 3.5 * DEFAULT_CELL_HEIGHT; // concretely 3.5 cells visible
    await resizeSheetView(model, height, width);
    await activateSheet(model, "small");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    });
    await activateSheet(model, "big");
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      top: 0,
      bottom: 3,
      left: 0,
      right: 2,
    });
  });
  test("can undo/redo actions on other sheets", async () => {
    await activateSheet(model, "small");
    await addColumns(model, "after", "A", 200);
    await selectCell(model, toXC(200, 0));
    await activateSheet(model, "big");
    await undo(model);
  });
});

describe("shift viewport up/down", () => {
  beforeEach(async () => {
    model = await createModel();
  });

  test("basic move viewport", async () => {
    const { bottom } = model.getters.getActiveMainViewport();
    await shiftViewportDown(model);
    expect(model.getters.getActiveMainViewport().top).toBe(bottom);
    await shiftViewportUp(model);
    expect(model.getters.getActiveMainViewport().top).toBe(0);
  });

  test("move viewport with non-default size", async () => {
    await resizeSheetView(model, 100, 100);
    const { bottom } = model.getters.getActiveMainViewport();
    await shiftViewportDown(model);
    expect(model.getters.getActiveMainViewport().top).toBe(bottom);
    await shiftViewportUp(model);
    expect(model.getters.getActiveMainViewport().top).toBe(0);
  });

  test.each([
    [DEFAULT_CELL_HEIGHT * 3, 3],
    [DEFAULT_CELL_HEIGHT * 3 + 1, 3],
    [DEFAULT_CELL_HEIGHT * 3 - 1, 2],
  ])("Move viewport not starting from the top", async (scrollValue, expectedTop) => {
    await selectCell(model, "A4");
    const { bottom } = model.getters.getActiveMainViewport();
    await setViewportOffset(model, 0, scrollValue);
    await shiftViewportDown(model);
    expect(model.getters.getActiveMainViewport().top).toBe(bottom + expectedTop);
    await shiftViewportUp(model);
    expect(model.getters.getActiveMainViewport().top).toBe(expectedTop);
  });

  test("move all the way down and up again", async () => {
    const sheetId = model.getters.getActiveSheetId();
    const numberOfRows = model.getters.getNumberRows(sheetId);
    const { bottom } = model.getters.getActiveMainViewport();
    await shiftViewportDown(model);
    expect(model.getters.getActiveMainViewport().top).toBe(bottom);
    await shiftViewportDown(model);
    expect(model.getters.getActiveMainViewport().bottom).toBe(numberOfRows - 1);
    await shiftViewportDown(model);
    expect(model.getters.getActiveMainViewport().bottom).toBe(numberOfRows - 1);

    const { top } = model.getters.getActiveMainViewport();
    await shiftViewportUp(model);
    expect(model.getters.getActiveMainViewport().bottom).toBe(top);
    await shiftViewportUp(model);
    expect(model.getters.getActiveMainViewport().top).toBe(0);
    await shiftViewportUp(model);
    expect(model.getters.getActiveMainViewport().top).toBe(0);
  });

  test("move viewport does not changes its dimension", async () => {
    const viewportDimension = model.getters.getSheetViewDimensionWithHeaders();
    await shiftViewportDown(model);
    expect(model.getters.getSheetViewDimensionWithHeaders()).toEqual(viewportDimension);
    await shiftViewportUp(model);
    expect(model.getters.getSheetViewDimensionWithHeaders()).toEqual(viewportDimension);
  });

  test("X offset does not change", async () => {
    await selectCell(model, "D1");
    await setViewportOffset(model, DEFAULT_CELL_WIDTH * 3, 0);
    await shiftViewportDown(model);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toBe(DEFAULT_CELL_WIDTH * 3);
    await shiftViewportUp(model);
    expect(model.getters.getActiveSheetScrollInfo().scrollX).toBe(DEFAULT_CELL_WIDTH * 3);
  });

  test("anchor cell at the viewport top is shifted", async () => {
    const { bottom } = model.getters.getActiveMainViewport();
    await selectCell(model, "A1");
    await shiftViewportDown(model);
    expect(model.getters.getSelectedZones()).toHaveLength(1);
    expect(model.getters.getSelectedZone()).toEqual({ top: bottom, bottom, left: 0, right: 0 });
    await shiftViewportUp(model);
    expect(model.getters.getSelectedZones()).toHaveLength(1);
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1"));
  });

  test("anchor cell not at the viewport top is shifted", async () => {
    const { bottom } = model.getters.getActiveMainViewport();
    await selectCell(model, "B4");
    await shiftViewportDown(model);
    expect(model.getters.getSelectedZone()).toEqual({
      top: bottom + 3,
      bottom: bottom + 3,
      left: 1,
      right: 1,
    });
    await shiftViewportUp(model);
    expect(model.getters.getSelectedZone()).toEqual(toZone("B4"));
  });

  test("only anchor cell is kept (and shifted) when moving the viewport", async () => {
    await setSelection(model, ["A1:A2", "B5", "D1:D2"], {
      anchor: "D1",
    });
    const { bottom } = model.getters.getActiveMainViewport();
    await shiftViewportDown(model);
    expect(model.getters.getSelectedZones()).toHaveLength(1);
    expect(model.getters.getSelectedZone()).toEqual({
      top: bottom,
      bottom,
      left: 3,
      right: 3,
    });
  });

  test("hidden rows are skipped", async () => {
    const { bottom } = model.getters.getActiveMainViewport();
    await hideRows(model, [2, 3, 4]);
    const { bottom: bottomWithHiddenRows } = model.getters.getActiveMainViewport();
    expect(bottomWithHiddenRows).toBe(bottom + 3);
    await shiftViewportDown(model);
    expect(model.getters.getActiveMainViewport().top).toBe(bottomWithHiddenRows);
    await shiftViewportUp(model);
    expect(model.getters.getActiveMainViewport().bottom).toBe(bottomWithHiddenRows);
  });

  test("bottom cell is in a merge and new anchor in the merge", async () => {
    const { bottom } = model.getters.getActiveMainViewport();
    const mergeTop = bottom - 1;
    const mergeBottom = bottom + 1;
    await merge(
      model,
      zoneToXc({
        top: mergeTop,
        bottom: mergeBottom,
        left: 0,
        right: 0,
      })
    );
    await shiftViewportDown(model);
    expect(model.getters.getActiveMainViewport().top).toBe(mergeTop);
    await shiftViewportUp(model);
    expect(model.getters.getActiveMainViewport().bottom).toBe(bottom);
  });

  test("bottom cell is in a merge and new anchor *not* in the merge", async () => {
    const { bottom } = model.getters.getActiveMainViewport();
    const mergeTop = bottom - 1;
    const mergeBottom = bottom + 1;
    await merge(
      model,
      zoneToXc({
        top: mergeTop,
        bottom: mergeBottom,
        left: 0,
        right: 0,
      })
    );
    await selectCell(model, "B1");
    await shiftViewportDown(model);
    expect(model.getters.getActiveMainViewport().top).toBe(bottom);
  });

  test("anchor ends up at the last row", async () => {
    const { bottom } = model.getters.getActiveMainViewport();
    const sheetId = model.getters.getActiveSheetId();
    await resizeSheetView(model, bottom * DEFAULT_CELL_HEIGHT, getDefaultSheetViewSize());
    await deleteRows(model, range(bottom + 1, model.getters.getNumberRows(sheetId)));
    await selectCell(model, toXC(0, bottom));
    expect(model.getters.getActiveMainViewport().bottom).toBe(bottom);
    await shiftViewportDown(model);
    expect(model.getters.getSelectedZone()).toEqual({
      top: bottom,
      bottom: model.getters.getNumberRows(sheetId) - 1,
      left: 0,
      right: 0,
    });
  });

  describe("shift down/up with frozen panes", () => {
    test("shift down/up with frozen rows and with selection in frozen rows", async () => {
      await freezeRows(model, 5);
      const { bottom, top } = model.getters.getActiveMainViewport();
      await shiftViewportDown(model);
      expect(model.getters.getActiveMainViewport().top).toBe(bottom);
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1");
      await shiftViewportUp(model);
      expect(model.getters.getActiveMainViewport().top).toBe(top);
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A1");
    });

    test("shift down/up with frozen rows and with selection not in frozen rows", async () => {
      await freezeRows(model, 5);
      await selectCell(model, "A6");
      const { bottom, top } = model.getters.getActiveMainViewport();
      await shiftViewportDown(model);
      expect(model.getters.getActiveMainViewport().top).toBe(bottom);
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual(toXC(0, bottom));
      await shiftViewportUp(model);
      expect(model.getters.getActiveMainViewport().top).toBe(top);
      expect(zoneToXc(model.getters.getSelectedZone())).toEqual("A6");
    });

    test("shift down scrolls until the last row if there are frozen rows", async () => {
      const sheetId = model.getters.getActiveSheetId();
      const numberOfRows = model.getters.getNumberRows(sheetId);
      await freezeRows(model, 10);
      let { bottom } = model.getters.getActiveMainViewport();
      while (true) {
        await shiftViewportDown(model);
        const newBottom = model.getters.getActiveMainViewport().bottom;
        if (newBottom === bottom) {
          break;
        }
        bottom = newBottom;
      }
      expect(model.getters.getActiveMainViewport().bottom).toBe(numberOfRows - 1);
    });
  });

  test.each(["A1", "A2"])(
    "viewport and selection %s do not move when its already the end of the sheet",
    async (selectedCell) => {
      const sheetId = model.getters.getActiveSheetId();
      // delete all rows except the first two ones
      await deleteRows(model, range(2, model.getters.getNumberRows(sheetId)));
      await selectCell(model, selectedCell);
      await shiftViewportDown(model);
      expect(model.getters.getActiveMainViewport().top).toBe(0);
      expect(model.getters.getSelectedZone()).toEqual(toZone(selectedCell));
      await shiftViewportUp(model);
      expect(model.getters.getActiveMainViewport().top).toBe(0);
      expect(model.getters.getSelectedZone()).toEqual(toZone(selectedCell));
    }
  );

  test.each(["A1", "A2", "A15"])(
    "anchor %s is shifted by the correct amount when the sheet end is reached",
    async (selectedCell) => {
      const { bottom } = model.getters.getActiveMainViewport();
      const sheetId = model.getters.getActiveSheetId();
      // delete all rows after the viewport except three
      await deleteRows(model, range(bottom + 3, model.getters.getNumberRows(sheetId)));
      await selectCell(model, selectedCell);
      await shiftViewportDown(model);
      expect(model.getters.getSelectedZone()).toEqual({
        top: toZone(selectedCell).top + 4,
        bottom: toZone(selectedCell).bottom + 4,
        left: 0,
        right: 0,
      });
      await shiftViewportUp(model);
      expect(model.getters.getSelectedZone()).toEqual(toZone(selectedCell));
    }
  );

  test("Ensure the cell is in the viewport when starting the edition of a cell", async () => {
    const { store: composerStore, model } = await makeStore(CellComposerStore);
    await resizeSheetView(model, 100, 100);
    await setCellContent(model, "A1", "apple");
    await selectCell(model, "A1");
    const sheetId = model.getters.getActiveSheetId();
    const { col, row } = model.getters.getActivePosition();
    await setViewportOffset(model, 0, 200);
    expect(model.getters.isVisibleInViewport({ sheetId, col, row })).toBeFalsy();
    composerStore.startEdition();
    expect(model.getters.isVisibleInViewport({ sheetId, col, row })).toBeTruthy();
  });
});

describe("Partially Scrolled Viewport", () => {
  test("getRowIndex takes the partial scroll into account", async () => {
    const model = await createModel();
    const rowSize = 10; // to avoid rounding issues
    await resizeRows(model, range(0, 10), rowSize);
    await setViewportOffset(model, 0, 2.3 * rowSize);
    expect(model.getters.getRowIndex(0)).toBe(2);
    expect(model.getters.getRowIndex(0.5 * rowSize)).toBe(2);
    expect(model.getters.getRowIndex(0.6 * rowSize)).toBe(2);
    expect(model.getters.getRowIndex(0.699 * rowSize)).toBe(2);
    expect(model.getters.getRowIndex(0.7 * rowSize)).toBe(3);
    expect(model.getters.getRowIndex(rowSize)).toBe(3);
  });

  test("getColIndex takes the partial scroll into account", async () => {
    const model = await createModel();
    const colSize = 10; // to avoid rounding issues
    await resizeColumns(model, range(0, 10).map(numberToLetters), colSize);
    await setViewportOffset(model, 2.3 * colSize, 0);
    expect(model.getters.getColIndex(0)).toBe(2);
    expect(model.getters.getColIndex(0.5 * colSize)).toBe(2);
    expect(model.getters.getColIndex(0.6 * colSize)).toBe(2);
    expect(model.getters.getColIndex(0.699 * colSize)).toBe(2);
    expect(model.getters.getColIndex(0.7 * colSize)).toBe(3);
    expect(model.getters.getColIndex(colSize)).toBe(3);
  });

  test("getVisibleRect takes the partial scroll into account", async () => {
    const model = await createModel();
    const headerSize = 10; // to avoid rounding issues
    await resizeColumns(model, range(0, 10).map(numberToLetters), headerSize);
    await resizeRows(model, range(0, 10), headerSize);
    await setViewportOffset(model, 0.3 * headerSize, 0.3 * headerSize);
    expect(model.getters.getVisibleRect(toZone("A1"))).toEqual({
      x: 0,
      y: 0,
      width: 0.7 * headerSize,
      height: 0.7 * headerSize,
    });
  });
});
