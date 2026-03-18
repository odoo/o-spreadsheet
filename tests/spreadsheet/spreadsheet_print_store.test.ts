import { Model } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetPrintStore } from "../../src/components/spreadsheet_print/spreadsheet_print_store";
import {
  createChart,
  createSheet,
  freezeColumns,
  freezeRows,
  setCellContent,
  setSelection,
} from "../test_helpers";
import { makeStore } from "../test_helpers/stores";

describe("Spreadsheet print rendering", () => {
  let model: Model;
  let sheetId: string;
  let printStore: SpreadsheetPrintStore;

  beforeEach(async () => {
    ({ model, store: printStore } = makeStore(SpreadsheetPrintStore));
    sheetId = model.getters.getActiveSheetId();
  });

  function getPrintedZones() {
    return printStore.printPages.map((page) => ({
      sheetId: page.sheetId,
      ...page.zone,
    }));
  }

  function getPrintedViewports() {
    const printPages = printStore.printPages;
    const viewports = printPages.map((page) => {
      page.renderingCtx.viewports?.resetViewports(sheetId);
      return {
        topLeft: undefined, // Add undefined keys for `toMatchObject` assertions
        topRight: undefined,
        bottomLeft: undefined,
        bottomRight: undefined,
        ...page.renderingCtx.viewports?.viewports[sheetId],
      };
    });
    return viewports;
  }

  test("Only the part of the sheet with content is printed", () => {
    setCellContent(model, "A1", "=MUNIT(5)");

    expect(getPrintedZones()).toEqual([{ sheetId, left: 0, top: 0, right: 4, bottom: 4 }]);
  });

  test("Print content is split into multiple pages if too large", () => {
    setCellContent(model, "A1", "=SEQUENCE(100)");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 0, bottom: 87 },
      { sheetId, left: 0, top: 88, right: 0, bottom: 99 },
    ]);
  });

  test("The printed pages fit the width of the content by default", () => {
    setCellContent(model, "A1", "=RANDARRAY(100, 12)");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 11, bottom: 72 },
      { sheetId, left: 0, top: 73, right: 11, bottom: 99 },
    ]);
  });

  test("Can print fitting the height of the content", () => {
    setCellContent(model, "A1", "=RANDARRAY(100, 26)");
    printStore.changePrintScale("fitToHeight");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 15, bottom: 99 },
      { sheetId, left: 16, top: 0, right: 25, bottom: 99 },
    ]);
  });

  test("Can print without scaling the content", () => {
    setCellContent(model, "A1", "=RANDARRAY(50, 12)");
    printStore.changePrintScale("actualSize");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 6, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 6, bottom: 49 },
      { sheetId, left: 7, top: 0, right: 11, bottom: 43 },
      { sheetId, left: 7, top: 44, right: 11, bottom: 49 },
    ]);
  });

  test("Can print with frozen panes", () => {
    freezeColumns(model, 2);
    freezeRows(model, 2);
    setCellContent(model, "A1", "=RANDARRAY(50, 12)");
    printStore.changePrintScale("actualSize");
    const printedZones = getPrintedZones();
    const viewports = getPrintedViewports();

    // First page: all the frozen panes are visible
    expect(printedZones[0]).toMatchObject({ left: 0, top: 0, right: 6, bottom: 43 });
    expect(viewports[0]).toMatchObject({
      topLeft: { left: 0, top: 0, right: 1, bottom: 1 },
      topRight: { left: 2, top: 0, right: 6, bottom: 1 },
      bottomLeft: { left: 0, top: 2, right: 1, bottom: 43 },
      bottomRight: { left: 2, top: 2, right: 6, bottom: 43 },
    });
    // Second page: frozen rows are not visible
    expect(printedZones[1]).toMatchObject({ left: 0, top: 44, right: 6, bottom: 49 });
    expect(viewports[1]).toMatchObject({
      topLeft: undefined,
      topRight: undefined,
      bottomLeft: { left: 0, top: 44, right: 1, bottom: 49 },
      bottomRight: { left: 2, top: 44, right: 6, bottom: 49 },
    });
    // Third page: frozen columns are not visible
    expect(printedZones[2]).toMatchObject({ left: 7, top: 0, right: 11, bottom: 43 });
    expect(viewports[2]).toMatchObject({
      topLeft: undefined,
      topRight: { left: 7, top: 0, right: 11, bottom: 1 },
      bottomLeft: undefined,
      bottomRight: { left: 7, top: 2, right: 11, bottom: 43 },
    });
    // Fourth page: frozen panes are not visible
    expect(printedZones[3]).toMatchObject({ left: 7, top: 44, right: 11, bottom: 49 });
    expect(viewports[3]).toMatchObject({
      topLeft: undefined,
      topRight: undefined,
      bottomLeft: undefined,
      bottomRight: { left: 7, top: 44, right: 11, bottom: 49 },
    });
  });

  test("Can print a selection entirely within frozen panes", () => {
    freezeColumns(model, 2);
    setCellContent(model, "A1", "=RANDARRAY(50, 12)");
    setSelection(model, ["A1:A2"]);
    printStore.changePrintSelection("selection");
    const printedZones = getPrintedZones();
    const viewports = getPrintedViewports();

    expect(printedZones[0]).toMatchObject({ left: 0, top: 0, right: 0, bottom: 1 });
    expect(viewports[0]).toMatchObject({
      topLeft: undefined,
      topRight: undefined,
      bottomLeft: { left: 0, top: 0, right: 0, bottom: 1 },
      bottomRight: undefined,
    });
  });

  test("Print pages takes the figures into account", () => {
    setCellContent(model, "A1", "Hello");
    const figure = { figureId: "figureId", col: 0, row: 0, size: { width: 200, height: 200 } };
    createChart(model, { type: "bar" }, "chartId", undefined, figure);

    expect(getPrintedZones()).toEqual([{ sheetId, left: 0, top: 0, right: 2, bottom: 8 }]);
  });

  test("Can change the page layout", () => {
    setCellContent(model, "A1", "=RANDARRAY(100, 1)");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 0, bottom: 87 },
      { sheetId, left: 0, top: 88, right: 0, bottom: 99 },
    ]);

    printStore.changePrintLayout("A3");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 63 },
      { sheetId, left: 0, top: 64, right: 0, bottom: 99 },
    ]);
  });

  test("Can change the page orientation", () => {
    setCellContent(model, "A1", "=RANDARRAY(80, 1)");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 0, bottom: 79 },
    ]);

    printStore.changePrintOrientation("landscape");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 29 },
      { sheetId, left: 0, top: 30, right: 0, bottom: 59 },
      { sheetId, left: 0, top: 60, right: 0, bottom: 79 },
    ]);
  });

  test("Can hide or show grid lines", async () => {
    setCellContent(model, "A1", "Hello");

    expect(printStore.hideGridLines).toBe(false);
    expect(printStore.printPages.map((page) => page.renderingCtx)).toMatchObject([
      { hideGridLines: false },
    ]);

    printStore.setGridLinesVisibility(true);
    expect(printStore.hideGridLines).toBe(true);
    expect(printStore.printPages.map((page) => page.renderingCtx)).toMatchObject([
      { hideGridLines: true },
    ]);
  });

  test("Can print the entire workbook", () => {
    setCellContent(model, "A1", "Hello");
    createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
    setCellContent(model, "A1", "World", "Sheet2");
    expect(getPrintedZones()).toEqual([
      { sheetId: "Sheet1", left: 0, top: 0, right: 0, bottom: 0 },
    ]);

    printStore.changePrintSelection("entireWorkbook");
    expect(getPrintedZones()).toEqual([
      { sheetId: "Sheet1", left: 0, top: 0, right: 0, bottom: 0 },
      { sheetId: "Sheet2", left: 0, top: 0, right: 0, bottom: 0 },
    ]);
  });

  test("Can print only the selection", () => {
    setSelection(model, ["B2:D3"]);
    setCellContent(model, "A1", "=MUNIT(5)");
    expect(getPrintedZones()).toEqual([{ sheetId, left: 0, top: 0, right: 4, bottom: 4 }]);

    printStore.changePrintSelection("selection");
    expect(getPrintedZones()).toEqual([{ sheetId, left: 1, top: 1, right: 3, bottom: 2 }]);
  });

  test("Cannot print the selection if multiple zones are selected", () => {
    setSelection(model, ["B2:D3", "A1"]);
    setCellContent(model, "A1", "=MUNIT(5)");
    expect(printStore.printSelectionOptions.map((option) => option.value)).toEqual([
      "currentSheet",
      "entireWorkbook",
    ]);
  });

  test("Empty pages are not shown", () => {
    setCellContent(model, "A1", "Hello");
    setCellContent(model, "A90", "World");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 43 },
      // Nothing is printed between rows 44 and 89
      { sheetId, left: 0, top: 88, right: 0, bottom: 89 },
    ]);
  });
});
