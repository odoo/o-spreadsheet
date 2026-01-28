import { Model } from "@odoo/o-spreadsheet-engine";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { recomputeZones } from "@odoo/o-spreadsheet-engine/helpers/recompute_zones";
import { toZone, zoneToXc } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { SpreadsheetPrint } from "../../src/components/spreadsheet_print/spreadsheet_print";
import { GridRenderer } from "../../src/stores/grid_renderer_store";
import { registerCleanup } from "../setup/jest.setup";
import {
  createChart,
  createSheet,
  editSelectComponent,
  extendMockGetBoundingClientRect,
  keyDown,
  setCellContent,
  setSelection,
  simulateClick,
} from "../test_helpers";
import {
  mockChart,
  mountComponentWithPortalTarget,
  mountSpreadsheet,
} from "../test_helpers/helpers";
import { spyStoreCreation } from "../test_helpers/stores";

mockChart();

describe("Spreadsheet integration tests", () => {
  let mockWindowPrint: jest.Mock;

  beforeEach(() => {
    const originalPrint = window.print;
    mockWindowPrint = jest.fn();
    window.print = mockWindowPrint;
    registerCleanup(() => {
      window.print = originalPrint;
    });
  });

  test("Can open the print mode with CTRL+P shortcut", async () => {
    await mountSpreadsheet();
    expect(".o-spreadsheet-print").toHaveCount(0);
    await keyDown({ key: "p", ctrlKey: true });
    expect(".o-spreadsheet-print").toHaveCount(1);
  });

  test("Can open the print mode with topbar menu", async () => {
    await mountSpreadsheet();
    expect(".o-spreadsheet-print").toHaveCount(0);
    await simulateClick(".o-topbar-menu[data-id='file']");
    await simulateClick(".o-menu-item[data-name='print']");
    expect(".o-spreadsheet-print").toHaveCount(1);
  });

  test("Can cancel printing", async () => {
    await mountSpreadsheet();
    await keyDown({ key: "p", ctrlKey: true });
    expect(".o-spreadsheet-print").toHaveCount(1);

    await simulateClick(".o-print-header button:not(.primary)");
    expect(".o-spreadsheet-print").toHaveCount(0);
    expect(mockWindowPrint).not.toHaveBeenCalled();
  });

  test("Can trigger the browser print dialog", async () => {
    await mountSpreadsheet();
    await keyDown({ key: "p", ctrlKey: true });
    expect(".o-spreadsheet-print").toHaveCount(1);

    await simulateClick(".o-print-header button.primary");
    expect(".o-spreadsheet-print").toHaveCount(0);
    expect(mockWindowPrint).toHaveBeenCalledTimes(1);
  });

  test("Opening the print preview clears the selected figure", async () => {
    const { model } = await mountSpreadsheet();
    createChart(model, { type: "bar" }, "chartId", undefined, { figureId: "figureId" });
    model.dispatch("SELECT_FIGURE", { figureId: "figureId" });
    expect(model.getters.getSelectedFigureId()).toBe("figureId");

    await keyDown({ key: "p", ctrlKey: true });
    expect(".o-spreadsheet-print").toHaveCount(1);
    expect(model.getters.getSelectedFigureId()).toBeNull();
  });
});

describe("Spreadsheet print rendering", () => {
  extendMockGetBoundingClientRect({
    "o-canvas-container": (el) => ({
      width: parseInt(el.parentElement?.style.width || "0"),
      height: parseInt(el.parentElement?.style.height || "0"),
    }),
  });

  let model: Model;
  let getGridRenders: () => GridRenderer[];

  beforeEach(async () => {
    model = new Model();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function mountSpreadsheetPrint() {
    const { getStores } = spyStoreCreation();
    getGridRenders = () => getStores(GridRenderer);

    return await mountComponentWithPortalTarget(SpreadsheetPrint, {
      props: { onExitPrintMode: () => {} },
      model,
    });
  }

  function getLastZonesRendered() {
    const xcs: string[] = [];
    for (const gridRenderer of getGridRenders()) {
      const boxesXcs = gridRenderer["lastRenderBoxes"].keys();
      const sheetId = gridRenderer["lastRenderSheetId"];
      const zones = recomputeZones(Array.from(boxesXcs).map((xc) => toZone(xc)));
      xcs.push(...zones.map((zone) => sheetId + "!" + zoneToXc(zone)));
    }
    return xcs;
  }

  test("Only the part of the sheet with content is printed", async () => {
    setCellContent(model, "A1", "=MUNIT(5)");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:E5"]);
  });

  test("Print content is split into multiple pages if too large", async () => {
    setCellContent(model, "A1", "=RANDARRAY(50, 12)");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(4);
    expect(getLastZonesRendered()).toEqual([
      "Sheet1!A1:F42",
      "Sheet1!A43:F50",
      "Sheet1!G1:L42",
      "Sheet1!G43:L50",
    ]);
  });

  test("Empty pages are not shown", async () => {
    setCellContent(model, "A1", "=SEQUENCE(50)");
    setCellContent(model, "B1", "=TRANSPOSE(SEQUENCE(11))");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(3);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:F42", "Sheet1!A43:F50", "Sheet1!G1:L42"]);
  });

  test("Figures are also printed", async () => {
    const figure = { figureId: "figureId", col: 0, row: 0, size: { width: 200, height: 200 } };
    createChart(model, { type: "bar" }, "chartId", undefined, figure);
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(1);
    expect(".o-figure").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:C9"]);
  });

  test("Figures can be split into multiple print pages", async () => {
    const figure = { figureId: "figureId", col: 1, row: 1, size: { width: 1000, height: 200 } };
    createChart(model, { type: "bar" }, "chartId", undefined, figure);
    const { fixture } = await mountSpreadsheetPrint();

    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:F10", "Sheet1!G1:L10"]);

    const pages = fixture.querySelectorAll(".o-print-page");
    expect(pages[0].querySelector(".o-figure-container")).toHaveStyle({
      top: "0px",
      left: "0px",
    });
    expect(pages[0].querySelector(".o-figure-wrapper")).toHaveStyle({
      top: `${DEFAULT_CELL_HEIGHT}px`,
      left: `${DEFAULT_CELL_WIDTH}px`,
    });

    expect(pages[1].querySelector(".o-figure-container")).toHaveStyle({
      top: "0px",
      left: `-${DEFAULT_CELL_WIDTH * 6}px`, // container offset to the page starting column (F)
    });
    expect(pages[1].querySelector(".o-figure-wrapper")).toHaveStyle({
      top: `${DEFAULT_CELL_HEIGHT}px`, // figure stays at the same absolute position, it's the container that is shifted
      left: `${DEFAULT_CELL_WIDTH}px`,
    });
  });

  test("Can change the page layout", async () => {
    setCellContent(model, "A1", "=RANDARRAY(100, 1)");
    await mountSpreadsheetPrint();

    expect(".o-print-layout").toHaveText("A4 (210 x 297 mm)");
    expect(".o-print-page").toHaveStyle({ height: "1122px", width: "793px" });

    expect(".o-print-page").toHaveCount(3);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:A42", "Sheet1!A43:A84", "Sheet1!A85:A100"]);

    await editSelectComponent(".o-print-layout", "A3");
    expect(".o-print-layout").toHaveText("A3 (297 x 420 mm)");
    expect(".o-print-page").toHaveStyle({ height: "1587px", width: "1122px" });
    expect(".o-print-page").toHaveCount(2);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:A62", "Sheet1!A63:A100"]);
  });

  test("Can print the entire workbook", async () => {
    setCellContent(model, "A1", "Hello");
    createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
    setCellContent(model, "A1", "World", "Sheet2");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1"]);

    await editSelectComponent(".o-print-selection", "entireWorkbook");
    expect(".o-print-page").toHaveCount(2);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1", "Sheet2!A1"]);
  });

  test("Can print only the selection", async () => {
    setSelection(model, ["B2:D3"]);
    setCellContent(model, "A1", "=MUNIT(5)");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:E5"]);

    await editSelectComponent(".o-print-selection", "selection");
    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual(["Sheet1!B2:D3"]);
  });
});
