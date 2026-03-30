import { Model, StoreConstructor, UID, Zone } from "../../src";
import { SpreadsheetPrint } from "../../src/components/spreadsheet_print/spreadsheet_print";
import { SpreadsheetPrintStore } from "../../src/components/spreadsheet_print/spreadsheet_print_store";
import { FigureRendererStore } from "../../src/components/standalone_grid_canvas/figure_renderer_store";
import { recomputeZones, toZone } from "../../src/helpers";
import { Store } from "../../src/store_engine";
import { GridRenderer } from "../../src/stores/grid_renderer_store";
import { registerCleanup } from "../setup/jest.setup";
import {
  createChart,
  createSheet,
  editSelectComponent,
  keyDown,
  setCellContent,
  setSelection,
  simulateClick,
} from "../test_helpers";
import {
  mountComponentWithPortalTarget,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";
import { spyStoreCreation } from "../test_helpers/stores";

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
  let model: Model;
  let sheetId: string;
  let getStores: (Store: StoreConstructor) => any[];

  beforeEach(async () => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    ({ getStores } = spyStoreCreation());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function mountSpreadsheetPrint() {
    return await mountComponentWithPortalTarget(SpreadsheetPrint, {
      props: { onExitPrintMode: () => {} },
      model,
    });
  }

  function getPrintStore() {
    return getStores(SpreadsheetPrintStore)[0] as Store<SpreadsheetPrintStore>;
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

  test("Can print change print scaling", async () => {
    setCellContent(model, "A1", "=RANDARRAY(50, 12)");
    await mountSpreadsheetPrint();
    expect(getPrintStore().printScale).toBe("fitToWidth");
    await editSelectComponent(".o-print-scale", "actualSize");
    expect(getPrintStore().printScale).toBe("actualSize");
  });

  test("Printed pages includes the figures", async () => {
    setCellContent(model, "A1", "Hello");
    await mountSpreadsheetPrint();
    const figureRendererStore = getStores(FigureRendererStore)[0];
    const drawChartSpy = jest.spyOn(figureRendererStore, "drawChart").mockImplementation(() => {});
    const figure = { figureId: "figureId", col: 0, row: 0, size: { width: 200, height: 200 } };

    expect(".o-print-page").toHaveCount(1);
    expect(getLastZonesRendered()).toEqual([{ sheetId, left: 0, top: 0, right: 0, bottom: 0 }]);
    expect(drawChartSpy).not.toHaveBeenCalled();

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
    expect(getPrintStore().pageLayout).toBe("A4");

    await editSelectComponent(".o-print-layout", "A3");
    expect(".o-print-layout").toHaveText("A3 (297 x 420 mm)");
    expect(".o-print-page").toHaveStyle({ height: "1587px", width: "1122px" });
    expect(getPrintStore().pageLayout).toBe("A3");
  });

  test("Can change the page orientation", async () => {
    setCellContent(model, "A1", "=RANDARRAY(80, 1)");
    await mountSpreadsheetPrint();

    expect(".o-badge-selection .selected").toHaveAttribute("data-id", "portrait");
    expect(".o-print-page").toHaveStyle({ height: "1122px", width: "793px" });
    expect(getPrintStore().orientation).toBe("portrait");

    await simulateClick(".o-badge-selection button[data-id='landscape']");
    expect(".o-badge-selection .selected").toHaveAttribute("data-id", "landscape");
    expect(".o-print-page").toHaveStyle({ height: "793px", width: "1122px" });
    expect(getPrintStore().orientation).toBe("landscape");
  });

  test("Can hide or show grid lines", async () => {
    setCellContent(model, "A1", "Hello");
    await mountSpreadsheetPrint();

    expect(getPrintStore().hideGridLines).toBe(false);

    await simulateClick("input[name='showGridLines']");
    expect(getPrintStore().hideGridLines).toBe(true);
  });

  test("Can change print selection", async () => {
    setCellContent(model, "A1", "Hello");
    createSheet(model, { name: "Sheet2", sheetId: "Sheet2" });
    setCellContent(model, "A1", "World", "Sheet2");
    await mountSpreadsheetPrint();
    expect(getPrintStore().printSelection).toBe("currentSheet");

    await editSelectComponent(".o-print-selection", "entireWorkbook");
    expect(getPrintStore().printSelection).toBe("entireWorkbook");

    await editSelectComponent(".o-print-selection", "selection");
    expect(getPrintStore().printSelection).toBe("selection");
  });

  test("In dashboard, can only print the active sheet and cannot show the grid lines", async () => {
    setCellContent(model, "A1", "=MUNIT(5)");
    model.updateMode("dashboard");
    await mountSpreadsheetPrint();
    expect(".o-print-selection").toHaveCount(0);
    expect("input[name='showGridLines']").toHaveCount(0);
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
