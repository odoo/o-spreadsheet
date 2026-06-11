import { PluginInstance } from "@odoo/owl";
import { Model, UID } from "../../src";
import { HoveredTablePlugin } from "../../src/components/owl_plugins/hovered_table_plugin";
import { TABLE_HOVER_BACKGROUND_COLOR } from "../../src/constants";
import { createTable, hideColumns, setCellContent } from "../test_helpers/commands_helpers";
import { makeOwlPlugin } from "../test_helpers/owl_plugin";

describe("Hovered Table Store", () => {
  let hoveredTable: PluginInstance<typeof HoveredTablePlugin>;
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    ({ model, plugin: hoveredTable } = makeOwlPlugin(HoveredTablePlugin));
    sheetId = model.getters.getActiveSheetId();
  });

  test("Should not store overlay for header cells, regardless of data", () => {
    const A1 = { col: 0, row: 0 };
    createTable(model, "A1");

    model.updateMode("dashboard");
    hoveredTable.hover(A1);
    expect(hoveredTable.overlayColors().has({ sheetId, ...A1 })).toBe(false);

    model.updateMode("normal");
    setCellContent(model, "A1", "Header");

    model.updateMode("dashboard");
    hoveredTable.hover(A1);
    expect(hoveredTable.overlayColors().has({ sheetId, ...A1 })).toBe(false);
  });

  test("Should not store overlay for empty data cells in dashboard mode", () => {
    const A2 = { col: 0, row: 1 };
    createTable(model, "A1:A2");

    model.updateMode("dashboard");
    hoveredTable.hover(A2);
    expect(hoveredTable.overlayColors().has({ sheetId, ...A2 })).toBe(false);
  });

  test("Should store overlay for full data rows with content in dashboard mode", () => {
    const A2 = { col: 0, row: 1 };
    const B2 = { col: 1, row: 1 };
    createTable(model, "A1:B2");
    setCellContent(model, "A2", "Data");

    model.updateMode("dashboard");
    hoveredTable.hover(A2);
    expect(hoveredTable.overlayColors().has({ sheetId, ...A2 })).toBe(true);
    expect(hoveredTable.overlayColors().has({ sheetId, ...B2 })).toBe(true);
    expect(hoveredTable.overlayColors().get({ sheetId, ...A2 })).toBe(TABLE_HOVER_BACKGROUND_COLOR);
  });

  test("Overlay colors are applied only in dashboard mode", () => {
    const A2 = { col: 0, row: 1 };
    createTable(model, "A1:A2");
    setCellContent(model, "A2", "Data");

    model.updateMode("normal");
    hoveredTable.hover(A2);
    expect(hoveredTable.overlayColors().has({ sheetId, ...A2 })).toBe(false);

    model.updateMode("readonly");
    hoveredTable.hover(A2);
    expect(hoveredTable.overlayColors().has({ sheetId, ...A2 })).toBe(false);

    model.updateMode("dashboard");
    hoveredTable.hover(A2);
    expect(hoveredTable.overlayColors().has({ sheetId, ...A2 })).toBe(true);
    expect(hoveredTable.overlayColors().get({ sheetId, ...A2 })).toBe(TABLE_HOVER_BACKGROUND_COLOR);
  });

  test("Hidden columns should be ignored when applying overlay colors", () => {
    const B2 = { col: 1, row: 1 };
    createTable(model, "A1:B2");
    setCellContent(model, "A2", "Some data");

    model.updateMode("dashboard");
    hoveredTable.hover(B2);
    expect(hoveredTable.overlayColors().has({ sheetId, ...B2 })).toBe(true);

    hoveredTable.clear();

    model.updateMode("normal");
    hideColumns(model, ["A"]);
    model.updateMode("dashboard");
    hoveredTable.hover(B2);
    expect(hoveredTable.overlayColors().has({ sheetId, ...B2 })).toBe(false);
  });
});
