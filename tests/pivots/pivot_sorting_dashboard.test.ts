import { TEXT_BODY_MUTED } from "@odoo/o-spreadsheet-engine/constants";
import { ClickableCellsStore } from "../../src/components/dashboard/clickable_cell_store";
import { HoveredTableStore } from "../../src/components/tables/hovered_table_store";
import { toCartesian } from "../../src/helpers";
import { createTable, setStyle } from "../test_helpers/commands_helpers";
import { click, getElComputedStyle } from "../test_helpers/dom_helper";
import { getCellIcons } from "../test_helpers/getters_helpers";
import {
  createModelFromGrid,
  mountSpreadsheet,
  nextTick,
  toCellPosition,
} from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

describe("Dashboard Pivot Sorting", () => {
  test("cycle through sorting", async () => {
    const grid = {
      A1: "Customer",
      B1: "Price",
      A2: "Alice",
      B2: "10",
      A3: "Bob",
      B3: "20",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    const pivotId = model.getters.getPivotIds()[0];
    const { env, fixture } = await mountSpreadsheet({ model });
    model.updateMode("dashboard");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    expect(env.getStore(ClickableCellsStore).clickableCells).toMatchObject([
      { position: toCellPosition(sheetId, "B5") },
    ]);
    expect(".o-dashboard-clickable-cell").toHaveCount(1);
    expect(".o-dashboard-clickable-cell .sorting-icon .o-icon").toHaveCount(1);
    expect(getCellIcons(model, "B5")).toHaveLength(0);

    await click(fixture, ".o-dashboard-clickable-cell");
    expect(getCellIcons(model, "B5")).toMatchObject([{ type: "pivot_dashboard_sorting_asc" }]);
    expect(".o-dashboard-clickable-cell .sorting-icon .o-icon").toHaveCount(0);
    expect(model.getters.getPivotCoreDefinition(pivotId).sortedColumn).toEqual({
      measure: "Price:sum",
      order: "asc",
      domain: [],
    });

    await click(fixture, ".o-dashboard-clickable-cell");
    expect(getCellIcons(model, "B5")).toMatchObject([{ type: "pivot_dashboard_sorting_desc" }]);
    expect(".o-dashboard-clickable-cell .sorting-icon .o-icon").toHaveCount(0);
    expect(model.getters.getPivotCoreDefinition(pivotId).sortedColumn).toEqual({
      measure: "Price:sum",
      order: "desc",
      domain: [],
    });

    await click(fixture, ".o-dashboard-clickable-cell");
    expect(".o-dashboard-clickable-cell .sorting-icon .o-icon").toHaveCount(1);
    expect(getCellIcons(model, "B5")).toHaveLength(0);
    expect(model.getters.getPivotCoreDefinition(pivotId).sortedColumn).toBe(undefined);
  });

  test("icon is vertically aligned with text", async () => {
    const grid = {
      A1: "Customer",
      B1: "Price",
      A2: "Alice",
      B2: "10",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    await mountSpreadsheet({ model });
    const cases = [
      { align: "top", expectedClass: "justify-content-start" },
      { align: "middle", expectedClass: "justify-content-center" },
      { align: "bottom", expectedClass: "justify-content-end" },
      { align: undefined, expectedClass: "justify-content-end" },
    ] as const;
    for (const { align, expectedClass } of cases) {
      model.updateMode("normal");
      setStyle(model, "B5", { verticalAlign: align });
      await nextTick();
      model.updateMode("dashboard");
      await nextTick();
      expect(".o-dashboard-clickable-cell div").toHaveClass(expectedClass);
    }
  });

  test("colors on empty grid", async () => {
    const grid = {
      A1: "Customer",
      B1: "Price",
      A2: "Alice",
      B2: "10",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    await mountSpreadsheet({ model });
    model.updateMode("dashboard");
    await nextTick();
    expect(
      getElComputedStyle(".o-dashboard-clickable-cell .sorting-icon", "background-color")
    ).toBeSameColorAs("#FFFFFF");
    expect(
      getElComputedStyle(".o-dashboard-clickable-cell .sorting-icon", "color")
    ).toBeSameColorAs(TEXT_BODY_MUTED);
  });

  test("colors on styled cell", async () => {
    const grid = {
      A1: "Customer",
      B1: "Price",
      A2: "Alice",
      B2: "10",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    setStyle(model, "B5", { textColor: "#FF0000", fillColor: "#00FF00" });
    await mountSpreadsheet({ model });
    model.updateMode("dashboard");
    await nextTick();
    expect(
      getElComputedStyle(".o-dashboard-clickable-cell .sorting-icon", "background-color")
    ).toBeSameColorAs("#00FF00");
    expect(
      getElComputedStyle(".o-dashboard-clickable-cell .sorting-icon", "color")
    ).toBeSameColorAs("#FF0000");
  });

  test("colors on hovered table row", async () => {
    const grid = {
      A1: "Customer",
      B1: "Price",
      A2: "Alice",
      B2: "10",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
    });
    createTable(model, "A4", {}, "dynamic");
    const table = model.getters.getTable(toCellPosition(model.getters.getActiveSheetId(), "B5"))!;
    const tableStyle = model.getters.getTableStyle(table.config.styleId);
    const { env } = await mountSpreadsheet({ model });
    model.updateMode("dashboard");
    await nextTick();
    expect(
      getElComputedStyle(".o-dashboard-clickable-cell .sorting-icon", "background-color")
    ).toBeSameColorAs(tableStyle.firstRowStripe!.style!.fillColor!);
    expect(
      getElComputedStyle(".o-dashboard-clickable-cell .sorting-icon", "color")
    ).toBeSameColorAs(TEXT_BODY_MUTED);

    // hover the row -> background should follow the overlay color
    env.getStore(HoveredTableStore).hover(toCartesian("B5"));
    await nextTick();
    expect(
      getElComputedStyle(".o-dashboard-clickable-cell .sorting-icon", "background-color")
    ).toBeSameColorAs("#C1DBE6");
    expect(
      getElComputedStyle(".o-dashboard-clickable-cell .sorting-icon", "color")
    ).toBeSameColorAs(TEXT_BODY_MUTED);
  });
});
