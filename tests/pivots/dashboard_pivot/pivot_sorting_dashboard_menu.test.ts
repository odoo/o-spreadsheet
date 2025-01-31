import { CellPosition, Model } from "../../../src";
import { toZone } from "../../../src/helpers";
import {
  createDashboardActions,
  dashboardGridMenuRegistry,
} from "../../../src/registries/menus/dashboard_grid_menu_registry";
import {
  createModelFromGrid,
  getHighlightsFromStore,
  makeTestEnv,
  toCellPosition,
} from "../../test_helpers/helpers";
import { addPivot } from "../../test_helpers/pivot_helpers";

function getDashboardAction(id: string, position: CellPosition) {
  const spec = dashboardGridMenuRegistry.getAll().find((action) => action.id === id);
  if (!spec) {
    throw new Error(`Action ${id} not found`);
  }
  return createDashboardActions([spec], position)[0];
}

function getHighlightsWhenHovering(model: Model, xc: string, actionId: string) {
  const sheetId = model.getters.getActiveSheetId();
  const env = makeTestEnv({ model });
  const action = getDashboardAction(actionId, toCellPosition(sheetId, xc));
  const stopHover = action.onStartHover?.(env);
  const highlights = getHighlightsFromStore(env);
  stopHover?.();
  return highlights;
}

describe("dashboard pivot sorting menu", () => {
  test("sort pivot measure", () => {
    // prettier-ignore
    const grid = {
      A1: "Person", B1: "Age",
      A2: "Alice",  B2: "10",
      A3: "Bob",    B3: "30",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    const actionAsc = getDashboardAction("sort_pivot_ascending", toCellPosition(sheetId, "B6"));
    const actionDesc = getDashboardAction("sort_pivot_descending", toCellPosition(sheetId, "B6"));
    const env = makeTestEnv({ model });
    expect(actionAsc.isVisible?.(env)).toBe(false);
    expect(actionAsc.isVisible?.(env)).toBe(false);
    addPivot(model, "A1:B3", {
      columns: [{ fieldName: "Person" }],
      measures: [{ fieldName: "Age", id: "Age:sum", aggregator: "sum" }],
    });
    expect(actionAsc.isVisible?.(env)).toBe(true);
    expect(actionAsc.isVisible?.(env)).toBe(true);
    expect(actionAsc.iconColor?.(env)).toBeFalsy();
    expect(actionAsc.iconColor?.(env)).toBeFalsy();

    expect(model.getters.getPivot("1").definition.sortedColumn).toBeUndefined();

    // sort ascending
    actionAsc.execute?.(env);
    expect(actionAsc.iconColor?.(env)).toBe("#017E84");
    expect(model.getters.getPivot("1").definition.sortedColumn).toEqual({
      domain: [{ field: "Person", type: "char", value: "Alice" }],
      measure: "Age:sum",
      order: "asc",
    });

    // sort descending
    actionDesc.execute?.(env);
    expect(actionDesc.iconColor?.(env)).toBe("#017E84");
    expect(model.getters.getPivot("1").definition.sortedColumn).toEqual({
      domain: [{ field: "Person", type: "char", value: "Alice" }],
      measure: "Age:sum",
      order: "desc",
    });
  });

  test("sort pivot headers", () => {
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Age",
      A2: "2022-04-01", B2: "10",
      A3: "2021-02-01", B3: "30",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const sheetId = model.getters.getActiveSheetId();
    const rowActionAsc = getDashboardAction(
      "sort_pivot_header_ascending",
      toCellPosition(sheetId, "A6")
    );
    const rowActionDesc = getDashboardAction(
      "sort_pivot_header_descending",
      toCellPosition(sheetId, "A6")
    );
    const colActionAsc = getDashboardAction(
      "sort_pivot_header_ascending",
      toCellPosition(sheetId, "B4")
    );
    const colActionDesc = getDashboardAction(
      "sort_pivot_header_descending",
      toCellPosition(sheetId, "B4")
    );
    const env = makeTestEnv({ model });

    expect(rowActionAsc.isVisible?.(env)).toBe(false);
    expect(rowActionDesc.isVisible?.(env)).toBe(false);
    expect(colActionAsc.isVisible?.(env)).toBe(false);
    expect(colActionDesc.isVisible?.(env)).toBe(false);

    const row = { fieldName: "Date", granularity: "year" };
    const column = { fieldName: "Date", granularity: "month_number" };
    addPivot(model, "A1:B3", {
      rows: [row],
      columns: [column],
      measures: [{ fieldName: "Age", id: "Age:sum", aggregator: "sum" }],
    });
    expect(rowActionAsc.isVisible?.(env)).toBe(true);
    expect(rowActionDesc.isVisible?.(env)).toBe(true);
    expect(colActionAsc.isVisible?.(env)).toBe(true);
    expect(colActionDesc.isVisible?.(env)).toBe(true);

    expect(rowActionAsc.iconColor?.(env)).toBeFalsy();
    expect(rowActionDesc.iconColor?.(env)).toBeFalsy();
    expect(colActionAsc.iconColor?.(env)).toBeFalsy();
    expect(colActionDesc.iconColor?.(env)).toBeFalsy();
    const pivotId = "1";

    // sort row ascending
    rowActionAsc.execute?.(env);
    expect(rowActionAsc.iconColor?.(env)).toBe("#017E84");
    expect(model.getters.getPivotCoreDefinition(pivotId).rows).toEqual([{ order: "asc", ...row }]);
    expect(model.getters.getPivotCoreDefinition(pivotId).columns).toEqual([column]);

    // sort row descending
    rowActionDesc.execute?.(env);
    expect(rowActionDesc.iconColor?.(env)).toBe("#017E84");
    expect(model.getters.getPivotCoreDefinition(pivotId).rows).toEqual([{ order: "desc", ...row }]);
    expect(model.getters.getPivotCoreDefinition(pivotId).columns).toEqual([column]);

    // sort col ascending
    colActionAsc.execute?.(env);
    expect(colActionAsc.iconColor?.(env)).toBe("#017E84");
    expect(model.getters.getPivotCoreDefinition(pivotId).rows).toEqual([{ order: "desc", ...row }]);
    expect(model.getters.getPivotCoreDefinition(pivotId).columns).toEqual([
      { order: "asc", ...column },
    ]);

    // sort col descending
    colActionDesc.execute?.(env);
    expect(colActionDesc.iconColor?.(env)).toBe("#017E84");
    expect(model.getters.getPivotCoreDefinition(pivotId).rows).toEqual([{ order: "desc", ...row }]);
    expect(model.getters.getPivotCoreDefinition(pivotId).columns).toEqual([
      { order: "desc", ...column },
    ]);
  });

  test("hovering measure highlights the measure column", async () => {
    // prettier-ignore
    const grid = {
      A1: "Person", B1: "Age", C1: "Score",
      A2: "Alice", B2: "10", C2: "20",
      A3: "Bob", B3: "30", C3: "40",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      rows: [{ fieldName: "Person" }],
      measures: [
        { fieldName: "Age", id: "Age:sum", aggregator: "sum" },
        { fieldName: "Score", id: "Score:sum", aggregator: "sum" },
      ],
    });

    // hover Age measure header
    expect(getHighlightsWhenHovering(model, "B5", "sort_pivot_ascending")).toMatchObject([
      { zone: toZone("B6:B7") },
    ]);
    // hover Age measure value
    expect(getHighlightsWhenHovering(model, "B6", "sort_pivot_ascending")).toMatchObject([
      { zone: toZone("B6:B7") },
    ]);

    // hover Score measure header
    expect(getHighlightsWhenHovering(model, "C5", "sort_pivot_ascending")).toMatchObject([
      { zone: toZone("C6:C7") },
    ]);
    // hover Score measure value
    expect(getHighlightsWhenHovering(model, "C6", "sort_pivot_ascending")).toMatchObject([
      { zone: toZone("C6:C7") },
    ]);
  });

  test("hovering row header highlights the header", async () => {
    // prettier-ignore
    const grid = {
      A1: "Person", B1: "Age", C1: "Score",
      A2: "Alice",  B2: "10",  C2: "20",
      A3: "Alice",  B3: "11",  C3: "20",
      A4: "Bob",    B4: "40",  C4: "40",
      A5: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C4", {
      rows: [{ fieldName: "Person" }, { fieldName: "Age" }],
      measures: [{ fieldName: "Score", id: "Score:sum", aggregator: "sum" }],
    });

    // hover top level row header
    expect(getHighlightsWhenHovering(model, "A7", "sort_pivot_header_ascending")).toMatchObject([
      { zone: toZone("A7") },
      { zone: toZone("A10") },
    ]);

    // hover sub level row header
    expect(getHighlightsWhenHovering(model, "A8", "sort_pivot_header_ascending")).toMatchObject([
      { zone: toZone("A8:A9") },
      { zone: toZone("A11") },
    ]);
  });

  test("hovering col header highlights the header", async () => {
    // prettier-ignore
    const grid = {
      A1: "Person", B1: "Age", C1: "Score",
      A2: "Alice",  B2: "10",  C2: "20",
      A3: "Alice",  B3: "11",  C3: "20",
      A4: "Bob",    B4: "40",  C4: "40",
      A5: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C4", {
      columns: [{ fieldName: "Person" }, { fieldName: "Age" }],
      measures: [{ fieldName: "Score", id: "Score:sum", aggregator: "sum" }],
    });

    // hover top level col header
    expect(getHighlightsWhenHovering(model, "B5", "sort_pivot_header_ascending")).toMatchObject([
      { zone: toZone("B5") },
      { zone: toZone("D5") },
    ]);

    // hover sub level col header
    expect(getHighlightsWhenHovering(model, "B6", "sort_pivot_header_ascending")).toMatchObject([
      { zone: toZone("B6:D6") },
    ]);
  });
});
