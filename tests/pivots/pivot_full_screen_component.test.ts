import { SpreadsheetPivotTable } from "../../src";
import { PIVOT_TABLE_CONFIG } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { setCellContent, undo } from "../test_helpers/commands_helpers";
import { click, getElStyle, hoverCell } from "../test_helpers/dom_helper";
import { getCell } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../test_helpers/mock_helpers";
import { createModelWithTestPivotDataset, updatePivot } from "../test_helpers/pivot_helpers";

extendMockGetBoundingClientRect({
  "o-fullscreen-sheet-overlay": () => ({ height: 800, width: 800 }),
});

describe("Pivot full screen playground", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  test("Hovering a pivot in dashboard shows a button at the top right of the pivot", async () => {
    const model = createModelWithTestPivotDataset();
    model.updateMode("dashboard");
    await mountSpreadsheet({ model });

    await hoverCell(model, "B22", 400);
    expect(".o-popover .o-dashboard-expand-menu").toHaveCount(1);

    const topRightPivotCellRect = model.getters.getVisibleRect(toZone("D20"));
    expect(getElStyle(".o-popover", "left")).toBe(
      topRightPivotCellRect.x + topRightPivotCellRect.width + "px"
    );
    expect(getElStyle(".o-popover", "top")).toBe(topRightPivotCellRect.y + "px");
  });

  test("Can show a pivot in full screen", async () => {
    const model = createModelWithTestPivotDataset();
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });
    const originalSheetId = model.getters.getActiveSheetId();

    await hoverCell(model, "A20", 400);
    await click(fixture, ".o-popover .o-dashboard-expand-menu");

    const sheetId = model.getters.getActiveSheetId();
    expect(".o-fullscreen-sheet-overlay").toHaveCount(1);
    expect(model.getters.isDashboard()).toBe(false);
    expect(sheetId).not.toBe(originalSheetId);
    expect(getCell(model, "A1")?.content).toBe("=PIVOT(1)");
    expect(model.getters.getCoreTable({ sheetId, col: 0, row: 0 })).toMatchObject({
      type: "dynamic",
      range: { zone: toZone("A1") },
      config: PIVOT_TABLE_CONFIG,
    });
  });

  test("Changes made in fullscreen mode are discarded when leaving the playground", async () => {
    const model = createModelWithTestPivotDataset();
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });
    const originalSheetId = model.getters.getActiveSheetId();

    await hoverCell(model, "A20", 400);
    await click(fixture, ".o-popover .o-dashboard-expand-menu");

    const originalPivotDefinition = model.getters.getPivotCoreDefinition("pivotId");
    updatePivot(model, "pivotId", { columns: [], rows: [] });
    expect(model.getters.getPivotCoreDefinition("pivotId")).not.toEqual(originalPivotDefinition);
    setCellContent(model, "A40", "Test content", originalSheetId);

    await click(fixture, ".o-fullscreen-sheet-overlay button.o-exit");
    expect(model.getters.isDashboard()).toBe(true);
    expect(model.getters.getActiveSheetId()).toBe(originalSheetId);
    expect(model.getters.getPivotCoreDefinition("pivotId")).toEqual(originalPivotDefinition);
    expect(getCell(model, "A40")?.content).toBe(undefined);
  });

  test("Full screen sheet is resized to be big enough for the pivot", async () => {
    jest.spyOn(SpreadsheetPivotTable.prototype, "numberOfColumns", "get").mockReturnValue(500);
    jest.spyOn(SpreadsheetPivotTable.prototype, "numberOfRows", "get").mockReturnValue(400);

    const model = createModelWithTestPivotDataset();
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });

    await hoverCell(model, "A20", 400);
    await click(fixture, ".o-popover .o-dashboard-expand-menu");

    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getNumberCols(sheetId)).toBe(500);
    expect(model.getters.getNumberRows(sheetId)).toBe(400);
  });

  test("Undoing the creation of the playground sheet will exit the full screen mode", async () => {
    const model = createModelWithTestPivotDataset();
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });
    const originalSheetId = model.getters.getActiveSheetId();

    await hoverCell(model, "A20", 400);
    await click(fixture, ".o-popover .o-dashboard-expand-menu");
    expect(model.getters.getActiveSheetId()).not.toBe(originalSheetId);
    expect(model.getters.isDashboard()).toBe(false);
    expect(".o-fullscreen-sheet-overlay").toHaveCount(1);

    undo(model);
    undo(model);
    await nextTick();

    expect(model.getters.getActiveSheetId()).toBe(originalSheetId);
    expect(model.getters.isDashboard()).toBe(true);
    expect(".o-fullscreen-sheet-overlay").toHaveCount(0);
  });

  test("Leaving the playground will return to the original scroll", async () => {
    const model = createModelWithTestPivotDataset();
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });

    model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 100, offsetY: 0 });
    await hoverCell(model, "C20", 400);
    await click(fixture, ".o-popover .o-dashboard-expand-menu");
    await click(fixture, ".o-fullscreen-sheet-overlay button.o-exit");

    expect(model.getters.getActiveSheetScrollInfo()).toMatchObject({ scrollX: 100 });
  });
});
