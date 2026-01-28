import { Model } from "@odoo/o-spreadsheet-engine";
import { recomputeZones } from "@odoo/o-spreadsheet-engine/helpers/recompute_zones";
import { toZone, zoneToXc } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { SpreadsheetPrint } from "../../src/components/spreadsheet_print/spreadsheet_print";
import { GridRenderer } from "../../src/stores/grid_renderer_store";
import { registerCleanup } from "../setup/jest.setup";
import {
  createSheet,
  editSelectComponent,
  extendMockGetBoundingClientRect,
  keyDown,
  setCellContent,
  setSelection,
  simulateClick,
} from "../test_helpers";
import { mountComponentWithPortalTarget, mountSpreadsheet } from "../test_helpers/helpers";
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
    console.log(window.print);
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

describe("Can print a spreadsheet", () => {
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

    await mountComponentWithPortalTarget(SpreadsheetPrint, {
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
      "Sheet1!A1:G47",
      "Sheet1!A48:G50",
      "Sheet1!H1:L47",
      "Sheet1!H48:L50",
    ]);
  });

  test("Empty pages are not shown", async () => {
    setCellContent(model, "A1", "=SEQUENCE(50)");
    setCellContent(model, "B1", "=TRANSPOSE(SEQUENCE(11))");
    await mountSpreadsheetPrint();
    expect(".o-print-page").toHaveCount(3);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:G47", "Sheet1!A48:G50", "Sheet1!H1:L47"]);
  });

  test("Can change the page layout", async () => {
    setCellContent(model, "A1", "=RANDARRAY(100, 1)");
    await mountSpreadsheetPrint();

    expect(".o-print-layout").toHaveText("A4 (210 x 297 mm)");
    expect(".o-print-page").toHaveStyle({ height: "1122px", width: "793px" });

    expect(".o-print-page").toHaveCount(3);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:A47", "Sheet1!A48:A94", "Sheet1!A95:A100"]);

    await editSelectComponent(".o-print-layout", "A3");
    expect(".o-print-layout").toHaveText("A3 (297 x 420 mm)");
    expect(".o-print-page").toHaveStyle({ height: "1587px", width: "1122px" });
    expect(".o-print-page").toHaveCount(2);
    expect(getLastZonesRendered()).toEqual(["Sheet1!A1:A67", "Sheet1!A68:A100"]);
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
