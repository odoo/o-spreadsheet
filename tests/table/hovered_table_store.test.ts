import { TABLE_HOVER_BACKGROUND_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { Model, UID } from "../../src";
import { HoveredTableStore } from "../../src/components/tables/hovered_table_store";
import { createTable, setCellContent } from "../test_helpers/commands_helpers";
import { makeStore } from "../test_helpers/stores";

describe("Hovered Table Store", () => {
  let hoveredTableStore: HoveredTableStore;
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    ({ model, store: hoveredTableStore } = makeStore(HoveredTableStore));
    sheetId = model.getters.getActiveSheetId();
  });

  test("Should not store overlay for header cells, regardless of data", () => {
    const A1 = { sheetId, col: 0, row: 0 };
    createTable(model, "A1");

    model.updateMode("dashboard");
    model.dispatch("SET_HOVERED_CELL", { cellPosition: A1 });
    expect(hoveredTableStore.overlayColors.has(A1)).toBe(false);

    model.updateMode("normal");
    setCellContent(model, "A1", "Header");

    model.updateMode("dashboard");
    model.dispatch("SET_HOVERED_CELL", { cellPosition: A1 });
    expect(hoveredTableStore.overlayColors.has(A1)).toBe(false);
  });

  test("Should not store overlay for empty data cells in dashboard mode", () => {
    const A2 = { sheetId, col: 0, row: 1 };
    createTable(model, "A1:A2");

    model.updateMode("dashboard");
    model.dispatch("SET_HOVERED_CELL", { cellPosition: A2 });
    expect(hoveredTableStore.overlayColors.has(A2)).toBe(false);
  });

  test("Should store overlay for full data rows with content in dashboard mode", () => {
    const A2 = { sheetId, col: 0, row: 1 };
    const B2 = { sheetId, col: 1, row: 1 };
    createTable(model, "A1:B2");
    setCellContent(model, "A2", "Data");

    model.updateMode("dashboard");
    model.dispatch("SET_HOVERED_CELL", { cellPosition: A2 });
    expect(hoveredTableStore.overlayColors.has(A2)).toBe(true);
    expect(hoveredTableStore.overlayColors.has(B2)).toBe(true);
    expect(hoveredTableStore.overlayColors.get(A2)).toBe(TABLE_HOVER_BACKGROUND_COLOR);
  });

  test("Overlay colors are applied only in dashboard mode", () => {
    const A2 = { sheetId, col: 0, row: 1 };
    createTable(model, "A1:A2");
    setCellContent(model, "A2", "Data");

    model.updateMode("normal");
    model.dispatch("SET_HOVERED_CELL", { cellPosition: A2 });
    expect(hoveredTableStore.overlayColors.has(A2)).toBe(false);

    model.updateMode("readonly");
    model.dispatch("SET_HOVERED_CELL", { cellPosition: A2 });
    expect(hoveredTableStore.overlayColors.has(A2)).toBe(false);

    model.updateMode("dashboard");
    model.dispatch("SET_HOVERED_CELL", { cellPosition: A2 });
    expect(hoveredTableStore.overlayColors.has(A2)).toBe(true);
    expect(hoveredTableStore.overlayColors.get(A2)).toBe(TABLE_HOVER_BACKGROUND_COLOR);
  });

  test("Hidden columns should be ignored when applying overlay colors", () => {
    const B2 = { sheetId, col: 1, row: 1 };
    createTable(model, "A1:B2");
    setCellContent(model, "A2", "Some data");

    model.updateMode("dashboard");
    model.dispatch("SET_HOVERED_CELL", { cellPosition: B2 });
    expect(hoveredTableStore.overlayColors.has(B2)).toBe(true);

    model.updateMode("normal");
    model.dispatch("HIDE_COLUMNS_ROWS", { sheetId, elements: [0], dimension: "COL" });
    model.updateMode("dashboard");
    model.dispatch("SET_HOVERED_CELL", { cellPosition: B2 });
    expect(hoveredTableStore.overlayColors.has(B2)).toBe(false);
  });
});
