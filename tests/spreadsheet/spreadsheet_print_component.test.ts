import { GridRenderingContext, Model, UID, Zone } from "@odoo/o-spreadsheet-engine";
import { recomputeZones } from "@odoo/o-spreadsheet-engine/helpers/recompute_zones";
import { toZone } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { StoreConstructor } from "../../src";
import { SpreadsheetPrint } from "../../src/components/spreadsheet_print/spreadsheet_print";
import { FigureRendererStore } from "../../src/components/standalone_grid_canvas/figure_renderer_store";
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
  nextTick,
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
});

describe("Spreadsheet print rendering", () => {
  extendMockGetBoundingClientRect({
    "o-canvas-container": (el) => ({
      width: parseInt(el.parentElement?.style.width || "0"),
      height: parseInt(el.parentElement?.style.height || "0"),
    }),
  });

  let model: Model;
  let sheetId: string;
  let getStores: (Store: StoreConstructor) => any[];

  beforeEach(async () => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function mountSpreadsheetPrint() {
    ({ getStores } = spyStoreCreation());

    return await mountComponentWithPortalTarget(SpreadsheetPrint, {
      props: { onExitPrintMode: () => {} },
      model,
    });
  }

  function getLastZonesRendered() {
    const drawnZones: (Zone & { sheetId: UID })[] = [];
    for (const gridRenderer of getStores(GridRenderer) as GridRenderer[]) {
      const boxesXcs = gridRenderer["lastRenderBoxes"].keys();
      const sheetId = gridRenderer["lastRenderSheetId"]!;
      const zones = recomputeZones(Array.from(boxesXcs).map((xc) => toZone(xc)));
      drawnZones.push(...zones.map((zone) => ({ sheetId, ...zone })));
    }
    return drawnZones;
  }

  test("Only the part of the sheet with content is printed", async () => {
    setCellContent(model, "A1", "=MUNIT(5)");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual([{ sheetId, left: 0, top: 0, right: 4, bottom: 4 }]);
  });

  test("Print content is split into multiple pages if too large", async () => {
    setCellContent(model, "A1", "=SEQUENCE(100)");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(3);
    expect(getLastZonesRendered()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 0, bottom: 87 },
      { sheetId, left: 0, top: 88, right: 0, bottom: 99 },
    ]);
  });

  test("The printed pages fit the width of the content by default", async () => {
    setCellContent(model, "A1", "=RANDARRAY(100, 12)");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(2);
    expect(getLastZonesRendered()).toEqual([
      { sheetId, left: 0, top: 0, right: 11, bottom: 72 },
      { sheetId, left: 0, top: 73, right: 11, bottom: 99 },
    ]);
  });

  test("Can print fitting the height of the content", async () => {
    setCellContent(model, "A1", "=RANDARRAY(100, 26)");
    await mountSpreadsheetPrint();
    await editSelectComponent(".o-print-scale", "fitToHeight");
    expect(".o-print-page").toHaveCount(2);
    expect(getLastZonesRendered()).toEqual([
      { sheetId, left: 0, top: 0, right: 15, bottom: 99 },
      { sheetId, left: 16, top: 0, right: 25, bottom: 99 },
    ]);
  });

  test("Can print without scaling the content", async () => {
    setCellContent(model, "A1", "=RANDARRAY(50, 12)");
    await mountSpreadsheetPrint();
    await editSelectComponent(".o-print-scale", "actualSize");
    expect(".o-print-page").toHaveCount(4);
    expect(getLastZonesRendered()).toEqual([
      { sheetId, left: 0, top: 0, right: 6, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 6, bottom: 49 },
      { sheetId, left: 7, top: 0, right: 11, bottom: 43 },
      { sheetId, left: 7, top: 44, right: 11, bottom: 49 },
    ]);
  });

  test("Figures are also printed", async () => {
    setCellContent(model, "A1", "Hello");
    await mountSpreadsheetPrint();
    const figureRendererStore = getStores(FigureRendererStore)[0];
    const drawChartSpy = jest.spyOn(figureRendererStore, "drawChart").mockImplementation(() => {});
    const figure = { figureId: "figureId", col: 0, row: 0, size: { width: 200, height: 200 } };
    createChart(model, { type: "bar" }, "chartId", undefined, figure);
    await nextTick();

    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual([{ sheetId, left: 0, top: 0, right: 2, bottom: 8 }]);
    expect(drawChartSpy).toHaveBeenCalled();
  });

  test("Can change the page layout", async () => {
    setCellContent(model, "A1", "=RANDARRAY(100, 1)");
    await mountSpreadsheetPrint();

    expect(".o-print-layout").toHaveText("A4 (210 x 297 mm)");
    expect(".o-print-page").toHaveStyle({ height: "1122px", width: "793px" });

    expect(".o-print-page").toHaveCount(3);
    expect(getLastZonesRendered()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 0, bottom: 87 },
      { sheetId, left: 0, top: 88, right: 0, bottom: 99 },
    ]);

    await editSelectComponent(".o-print-layout", "A3");
    expect(".o-print-layout").toHaveText("A3 (297 x 420 mm)");
    expect(".o-print-page").toHaveStyle({ height: "1587px", width: "1122px" });
    expect(".o-print-page").toHaveCount(2);
    expect(getLastZonesRendered()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 63 },
      { sheetId, left: 0, top: 64, right: 0, bottom: 99 },
    ]);
  });

  test("Can change the page orientation", async () => {
    setCellContent(model, "A1", "=RANDARRAY(80, 1)");
    await mountSpreadsheetPrint();

    expect(".o-badge-selection .selected").toHaveAttribute("data-id", "portrait");
    expect(".o-print-page").toHaveStyle({ height: "1122px", width: "793px" });

    expect(".o-print-page").toHaveCount(2);
    expect(getLastZonesRendered()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 43 },
      { sheetId, left: 0, top: 44, right: 0, bottom: 79 },
    ]);

    await simulateClick(".o-badge-selection button[data-id='landscape']");
    expect(".o-badge-selection .selected").toHaveAttribute("data-id", "landscape");
    expect(".o-print-page").toHaveStyle({ height: "793px", width: "1122px" });

    expect(".o-print-page").toHaveCount(3);
    expect(getLastZonesRendered()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 29 },
      { sheetId, left: 0, top: 30, right: 0, bottom: 59 },
      { sheetId, left: 0, top: 60, right: 0, bottom: 79 },
    ]);
  });

  test("Can hide or show grid lines", async () => {
    let lastRenderingContext: GridRenderingContext | undefined;
    jest
      .spyOn(GridRenderer.prototype, "drawLayer")
      .mockImplementation(
        (renderingContext: GridRenderingContext) => (lastRenderingContext = renderingContext)
      );
    setCellContent(model, "A1", "Hello");
    await mountSpreadsheetPrint();

    expect(lastRenderingContext?.hideGridLines).toBe(false);

    await simulateClick("input[name='showGridLines']");
    expect(lastRenderingContext?.hideGridLines).toBe(true);
  });

  test("Can print the entire workbook", async () => {
    setCellContent(model, "A1", "Hello");
    createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
    setCellContent(model, "A1", "World", "Sheet2");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual([
      { sheetId: "Sheet1", left: 0, top: 0, right: 0, bottom: 0 },
    ]);

    await editSelectComponent(".o-print-selection", "entireWorkbook");
    expect(".o-print-page").toHaveCount(2);
    expect(getLastZonesRendered()).toEqual([
      { sheetId: "Sheet1", left: 0, top: 0, right: 0, bottom: 0 },
      { sheetId: "Sheet2", left: 0, top: 0, right: 0, bottom: 0 },
    ]);
  });

  test("Can print only the selection", async () => {
    setSelection(model, ["B2:D3"]);
    setCellContent(model, "A1", "=MUNIT(5)");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual([{ sheetId, left: 0, top: 0, right: 4, bottom: 4 }]);

    await editSelectComponent(".o-print-selection", "selection");
    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual([{ sheetId, left: 1, top: 1, right: 3, bottom: 2 }]);
  });

  test("In dashboard, can only print the active sheet and cannot show the grid lines", async () => {
    setCellContent(model, "A1", "=MUNIT(5)");
    model.updateMode("dashboard");
    await mountSpreadsheetPrint();
    expect(".o-print-selection").toHaveCount(0);
    expect("input[name='showGridLines']").toHaveCount(0);
    expect(getLastZonesRendered()).toEqual([{ sheetId, left: 0, top: 0, right: 4, bottom: 4 }]);
  });

  test("Mock print page is shown if there is no content to print", async () => {
    await mountSpreadsheetPrint();
    expect(".o-print-page.o-empty-print-page").toHaveCount(1);

    setSelection(model, ["B2:D3"]);
    setCellContent(model, "A1", "=MUNIT(5)");
    await editSelectComponent(".o-print-selection", "selection");

    expect(".o-print-page.o-empty-print-page").toHaveCount(0);

    setSelection(model, ["A25"]);
    await nextTick();
    expect(".o-print-page.o-empty-print-page").toHaveCount(1);
  });

  test("Empty pages are not shown", async () => {
    setCellContent(model, "A1", "Hello");
    setCellContent(model, "A90", "World");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(2);
    expect(getLastZonesRendered()).toEqual([
      { sheetId, left: 0, top: 0, right: 0, bottom: 43 },
      // Nothing is printed between rows 44 and 89
      { sheetId, left: 0, top: 88, right: 0, bottom: 89 },
    ]);
  });

  test("Style is injected in beforePrint depending on the print setting used", async () => {
    await mountSpreadsheetPrint();
    await simulateClick(".o-badge-selection button[data-id='landscape']");
    await editSelectComponent(".o-print-layout", "A3");

    expect(document.head).toHaveText("");
    window.dispatchEvent(new Event("beforeprint"));
    expect(document.head).toHaveText("@media print { @page { size: A3 landscape; margin: 50px;}}");

    window.dispatchEvent(new Event("afterprint"));
    expect(document.head).toHaveText("");
  });
});
