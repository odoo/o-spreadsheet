import { Model, UID } from "../../src";
import { HoveredTableStore } from "../../src/components/tables/hovered_table_store";
import { TABLE_HOVER_BACKGROUND_COLOR } from "../../src/constants";
import { DependencyContainer } from "../../src/store_engine/dependency_container";
import { CellHoverOverlayStore } from "../../src/stores/cell_hover_overlay_store";
import { Store } from "../../src/types/store_engine";
import { createTable, hideColumns, setCellContent } from "../test_helpers/commands_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { makeStore, spyStoreCreation } from "../test_helpers/stores";

describe("Hovered Table Store", () => {
  let hoveredCellOverlayStore: Store<CellHoverOverlayStore>;
  let model: Model;
  let sheetId: UID;
  let container: DependencyContainer;

  beforeEach(() => {
    ({ model, container } = makeStore(HoveredTableStore));
    hoveredCellOverlayStore = container.get(CellHoverOverlayStore);
    sheetId = model.getters.getActiveSheetId();
  });

  test("Should not have overlay color for header cells, regardless of data", () => {
    const A1 = { sheetId, col: 0, row: 0 };
    createTable(model, "A1");

    hoveredCellOverlayStore.hover(A1);
    expect(hoveredCellOverlayStore.overlayColors.has(A1)).toBe(false);

    setCellContent(model, "A1", "Header");

    hoveredCellOverlayStore.hover(A1);
    expect(hoveredCellOverlayStore.overlayColors.has(A1)).toBe(false);
  });

  test("Should not have overlay color for empty data cells", () => {
    const A2 = { sheetId, col: 0, row: 1 };
    createTable(model, "A1:A2");

    hoveredCellOverlayStore.hover(A2);
    expect(hoveredCellOverlayStore.overlayColors.has(A2)).toBe(false);
  });

  test("Should have overlay color for full data rows with content", () => {
    const A2 = { sheetId, col: 0, row: 1 };
    const B2 = { sheetId, col: 1, row: 1 };
    createTable(model, "A1:B2");
    setCellContent(model, "A2", "Data");

    hoveredCellOverlayStore.hover(A2);
    expect(hoveredCellOverlayStore.overlayColors.has(A2)).toBe(true);
    expect(hoveredCellOverlayStore.overlayColors.has(B2)).toBe(true);
    expect(hoveredCellOverlayStore.overlayColors.get(A2)).toBe(TABLE_HOVER_BACKGROUND_COLOR);
  });

  test("Hidden columns should be ignored when applying overlay colors", () => {
    const B2 = { sheetId, col: 1, row: 1 };
    createTable(model, "A1:B2");
    setCellContent(model, "A2", "Some data");

    hoveredCellOverlayStore.hover(B2);
    expect(hoveredCellOverlayStore.overlayColors.has(B2)).toBe(true);

    hideColumns(model, ["A"]);
    hoveredCellOverlayStore.hover(B2);
    expect(hoveredCellOverlayStore.overlayColors.has(B2)).toBe(false);
  });
});

describe("Spreadsheet integration tests", () => {
  test("Hovered table store is only present in dashboard mode", async () => {
    const model = new Model();
    createTable(model, "A1:A2");
    setCellContent(model, "A2", "Data");
    const spy = spyStoreCreation();

    const { env } = await mountSpreadsheet({ model });
    const hoveredCellOverlayStore = env.getStore(CellHoverOverlayStore);

    expect(hoveredCellOverlayStore["providers"]).toHaveLength(0);
    expect(spy.getStores(HoveredTableStore).length).toBe(0);

    model.updateMode("readonly");
    await nextTick();
    expect(hoveredCellOverlayStore["providers"]).toHaveLength(0);
    expect(spy.getStores(HoveredTableStore).length).toBe(0);

    model.updateMode("dashboard");
    await nextTick();
    expect(hoveredCellOverlayStore["providers"]).toHaveLength(1);
    expect(spy.getStores(HoveredTableStore).length).toBe(1);

    model.updateMode("readonly");
    await nextTick();
    expect(hoveredCellOverlayStore["providers"]).toHaveLength(0); // Cleaned up on unmount
  });
});
