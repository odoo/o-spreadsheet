import { PluginInstance } from "@odoo/owl";
import { Model } from "../../src";
import { SpreadsheetPrintPlugin } from "../../src/components/spreadsheet_print/spreadsheet_print_owl_plugin";
import {
  createChart,
  createSheet,
  hideColumns,
  hideRows,
  setCellContent,
  setSelection,
} from "../test_helpers";
import { makeOwlPluginManager } from "../test_helpers/owl_plugins_helpers";

describe("Spreadsheet print rendering", () => {
  let model: Model;
  let sheetId: string;
  let printPlugin: PluginInstance<typeof SpreadsheetPrintPlugin>;

  beforeEach(async () => {
    model = new Model();
    const { getPlugin } = makeOwlPluginManager([SpreadsheetPrintPlugin], { model });
    printPlugin = getPlugin(SpreadsheetPrintPlugin);
    sheetId = model.getters.getActiveSheetId();
  });

  function getPrintedZones() {
    return printPlugin.printPages().map((page) => ({
      sheetId: page.sheetId,
      ...page.zone,
    }));
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

  test("Print pages break take hidden rows into account", () => {
    setCellContent(model, "A1", "=SEQUENCE(80)");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 0, bottom: 79 },
    ]);

    hideRows(model, [5, 6, 7, 8, 9]);
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 48 },
      { sheetId, left: 0, top: 49, right: 0, bottom: 79 },
    ]);
  });

  test("Print pages breaks take hidden columns into account", () => {
    setCellContent(model, "A1", "=TRANSPOSE(SEQUENCE(12))");
    printPlugin.changePrintScale("fitToHeight");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 6, bottom: 0 },
      { sheetId, left: 7, top: 0, right: 11, bottom: 0 },
    ]);

    hideColumns(model, ["B", "C", "D"]);
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 9, bottom: 0 },
      { sheetId, left: 10, top: 0, right: 11, bottom: 0 },
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
    printPlugin.changePrintScale("fitToHeight");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 15, bottom: 99 },
      { sheetId, left: 16, top: 0, right: 25, bottom: 99 },
    ]);
  });

  test("Can print without scaling the content", () => {
    setCellContent(model, "A1", "=RANDARRAY(50, 12)");
    printPlugin.changePrintScale("actualSize");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 6, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 6, bottom: 49 },
      { sheetId, left: 7, top: 0, right: 11, bottom: 43 },
      { sheetId, left: 7, top: 44, right: 11, bottom: 49 },
    ]);
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

    printPlugin.changePrintLayout("A3");
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

    printPlugin.changePrintOrientation("landscape");
    expect(getPrintedZones()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 29 },
      { sheetId, left: 0, top: 30, right: 0, bottom: 59 },
      { sheetId, left: 0, top: 60, right: 0, bottom: 79 },
    ]);
  });

  test("Can hide or show grid lines", async () => {
    setCellContent(model, "A1", "Hello");

    expect(printPlugin.hideGridLines()).toBe(false);
    expect(printPlugin.printPages().map((page) => page.renderingCtx)).toMatchObject([
      { hideGridLines: false },
    ]);

    printPlugin.setGridLinesVisibility(true);
    expect(printPlugin.hideGridLines()).toBe(true);
    expect(printPlugin.printPages().map((page) => page.renderingCtx)).toMatchObject([
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

    printPlugin.changePrintSelection("entireWorkbook");
    expect(getPrintedZones()).toEqual([
      { sheetId: "Sheet1", left: 0, top: 0, right: 0, bottom: 0 },
      { sheetId: "Sheet2", left: 0, top: 0, right: 0, bottom: 0 },
    ]);
  });

  test("Can print only the selection", () => {
    setSelection(model, ["B2:D3"]);
    setCellContent(model, "A1", "=MUNIT(5)");
    expect(getPrintedZones()).toEqual([{ sheetId, left: 0, top: 0, right: 4, bottom: 4 }]);

    printPlugin.changePrintSelection("selection");
    expect(getPrintedZones()).toEqual([{ sheetId, left: 1, top: 1, right: 3, bottom: 2 }]);
  });

  test("Cannot print the selection if multiple zones are selected", () => {
    setSelection(model, ["B2:D3", "A1"]);
    setCellContent(model, "A1", "=MUNIT(5)");
    expect(printPlugin.printSelectionOptions().map((option) => option.value)).toEqual([
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
