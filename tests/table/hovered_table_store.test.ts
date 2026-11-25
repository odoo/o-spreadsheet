import { PluginInstance } from "@odoo/owl";
import { Model, UID } from "../../src";
import { HoveredCellPlugin } from "../../src/components/grid/delayed_hovered_cell_owl_plugin";
import { HoveredTableStore } from "../../src/components/tables/hovered_table_store";
import { TABLE_HOVER_BACKGROUND_COLOR } from "../../src/constants";
import { CellHoverOverlayPlugin } from "../../src/stores/cell_hover_overlay_store";
import { OwlPluginGetter } from "../../src/types/spreadsheet_env";
import { createTable, hideColumns, setCellContent } from "../test_helpers/commands_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { makeStore, spyStoreCreation } from "../test_helpers/stores";

describe("Hovered Table Store", () => {
  let hoveredCellOverlayPlugin: PluginInstance<typeof CellHoverOverlayPlugin>;
  let hoveredCellPlugin: PluginInstance<typeof HoveredCellPlugin>;
  let model: Model;
  let sheetId: UID;
  let getPlugin: OwlPluginGetter;

  beforeEach(() => {
    ({ model, getPlugin } = makeStore(HoveredTableStore));
    hoveredCellOverlayPlugin = getPlugin(CellHoverOverlayPlugin);
    hoveredCellPlugin = getPlugin(HoveredCellPlugin);
    sheetId = model.getters.getActiveSheetId();
  });

  test("Should not have overlay color for header cells, regardless of data", () => {
    const A1 = { sheetId, col: 0, row: 0 };
    createTable(model, "A1");

    hoveredCellPlugin.hover(A1);
    expect(hoveredCellOverlayPlugin.overlayColors().has(A1)).toBe(false);

    setCellContent(model, "A1", "Header");

    hoveredCellPlugin.hover(A1);
    expect(hoveredCellOverlayPlugin.overlayColors().has(A1)).toBe(false);
  });

  test("Should not have overlay color for empty data cells", () => {
    const A2 = { sheetId, col: 0, row: 1 };
    createTable(model, "A1:A2");

    hoveredCellPlugin.hover(A2);
    expect(hoveredCellOverlayPlugin.overlayColors().has(A2)).toBe(false);
  });

  test("Should have overlay color for full data rows with content", () => {
    const A2 = { sheetId, col: 0, row: 1 };
    const B2 = { sheetId, col: 1, row: 1 };
    createTable(model, "A1:B2");
    setCellContent(model, "A2", "Data");

    hoveredCellPlugin.hover(A2);
    expect(hoveredCellOverlayPlugin.overlayColors().has(A2)).toBe(true);
    expect(hoveredCellOverlayPlugin.overlayColors().has(B2)).toBe(true);
    expect(hoveredCellOverlayPlugin.overlayColors().get(A2)).toBe(TABLE_HOVER_BACKGROUND_COLOR);
  });

  test("Hidden columns should be ignored when applying overlay colors", () => {
    const B2 = { sheetId, col: 1, row: 1 };
    createTable(model, "A1:B2");
    setCellContent(model, "A2", "Some data");

    hoveredCellPlugin.hover(B2);
    expect(hoveredCellOverlayPlugin.overlayColors().has(B2)).toBe(true);

    hideColumns(model, ["A"]);
    hoveredCellPlugin.hover(B2);
    expect(hoveredCellOverlayPlugin.overlayColors().has(B2)).toBe(false);
  });
});

describe("Spreadsheet integration tests", () => {
  test("Hovered table store is only present in dashboard mode", async () => {
    const model = new Model();
    createTable(model, "A1:A2");
    setCellContent(model, "A2", "Data");
    const spy = spyStoreCreation();

    const { getPlugin } = await mountSpreadsheet({ model });
    const hoveredCellOverlayPlugin = getPlugin(CellHoverOverlayPlugin);

    expect(hoveredCellOverlayPlugin["providers"]()).toHaveLength(0);
    expect(spy.getStores(HoveredTableStore).length).toBe(0);

    model.updateMode("readonly");
    await nextTick();
    expect(hoveredCellOverlayPlugin["providers"]()).toHaveLength(0);
    expect(spy.getStores(HoveredTableStore).length).toBe(0);

    model.updateMode("dashboard");
    await nextTick();
    expect(hoveredCellOverlayPlugin["providers"]()).toHaveLength(1);
    expect(spy.getStores(HoveredTableStore).length).toBe(1);

    model.updateMode("readonly");
    await nextTick();
    expect(hoveredCellOverlayPlugin["providers"]()).toHaveLength(0); // Cleaned up on unmount
  });
});
