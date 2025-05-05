import { toZone } from "../../../src/helpers";
import { click, hoverCell, simulateClick, triggerMouseEvent } from "../../test_helpers/dom_helper";
import {
  createModelFromGrid,
  getHighlightsFromStore,
  mountSpreadsheet,
  nextTick,
} from "../../test_helpers/helpers";
import { addPivot } from "../../test_helpers/pivot_helpers";

jest.useFakeTimers();

describe("Pivot sorting tooltip", () => {
  test("hovering a pivot value cell displays the sorting tooltip", async () => {
    // prettier-ignore
    const grid = {
      A1: "Person", B1: "Age",
      A2: "Alice",  B2: "10",
      A3: "Bob",    B3: "30",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      rows: [{ fieldName: "Person" }],
      measures: [{ fieldName: "Age", id: "Age:sum", aggregator: "sum" }],
    });
    await mountSpreadsheet({ model });
    expect(".o-dashboard-menu").toHaveCount(0);

    await hoverCell(model, "A6", 200); // row header
    expect(".o-dashboard-menu").toHaveCount(1);

    await hoverCell(model, "B6", 200); // pivot value
    expect(".o-dashboard-menu").toHaveCount(1);

    await hoverCell(model, "B5", 200); // pivot measure header
    expect(".o-dashboard-menu").toHaveCount(1);
  });

  test("hovering the tooltip highlights the measure column", async () => {
    // prettier-ignore
    const grid = {
      A1: "Person", B1: "Age", C1: "Score",
      A2: "Alice",  B2: "10",  C2: "20",
      A3: "Bob",    B3: "30",  C3: "40",
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
    const { env } = await mountSpreadsheet({ model });

    await hoverCell(model, "B6", 200); // hover Age measure
    await simulateClick(".o-dashboard-menu");
    triggerMouseEvent(".o-dashboard-menu-expandable .o-menu-item", "mouseenter");
    await nextTick();
    expect(getHighlightsFromStore(env)).toMatchObject([{ zone: toZone("B6:B7") }]);

    await hoverCell(model, "C6", 200); // hover Score measure
    await simulateClick(".o-dashboard-menu");
    triggerMouseEvent(".o-dashboard-menu-expandable .o-menu-item", "mouseenter");
    await nextTick();
    expect(getHighlightsFromStore(env)).toMatchObject([{ zone: toZone("C6:C7") }]);
  });

  test.each(["readonly", "dashboard"] as const)("clicking the buttons sort", async (mode) => {
    // prettier-ignore
    const grid = {
      A1: "Person", B1: "Age",
      A2: "Alice",  B2: "10",
      A3: "Bob",    B3: "30",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [{ fieldName: "Person" }],
      measures: [{ fieldName: "Age", id: "Age:sum", aggregator: "sum" }],
    });
    model.updateMode(mode);
    const { fixture } = await mountSpreadsheet({ model });

    expect(model.getters.getPivot("1").definition.sortedColumn).toBeUndefined();

    // sort ascending
    await hoverCell(model, "B6", 200);
    await click(fixture, ".o-dashboard-menu");
    await click(fixture, ".fa-sort-numeric-asc");
    expect(model.getters.getPivot("1").definition.sortedColumn).toEqual({
      domain: [{ field: "Person", type: "char", value: "Alice" }],
      measure: "Age:sum",
      order: "asc",
    });
    // sort descending
    await click(fixture, ".fa-sort-numeric-desc");
    expect(model.getters.getPivot("1").definition.sortedColumn).toEqual({
      domain: [{ field: "Person", type: "char", value: "Alice" }],
      measure: "Age:sum",
      order: "desc",
    });
  });

  test("clicking the headers buttons sort", async () => {
    // prettier-ignore
    const grid = {
      A1: "Date",       B1: "Age",
      A2: "2022-04-01", B2: "10",
      A3: "2021-02-01", B3: "30",
      A4: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    const row = { fieldName: "Date", granularity: "year" };
    const column = { fieldName: "Date", granularity: "month_number" };
    addPivot(model, "A1:B3", {
      rows: [row],
      columns: [column],
      measures: [{ fieldName: "Age", id: "Age:sum", aggregator: "sum" }],
    });
    const pivotId = "1";
    model.updateMode("dashboard");
    const { fixture } = await mountSpreadsheet({ model });

    // sort row ascending
    await hoverCell(model, "A6", 200);
    await click(fixture, ".o-dashboard-menu");
    await click(fixture, ".fa-sort-alpha-asc");
    expect(model.getters.getPivotCoreDefinition(pivotId).rows).toEqual([{ order: "asc", ...row }]);
    expect(model.getters.getPivotCoreDefinition(pivotId).columns).toEqual([column]);
    // sort row descending
    await click(fixture, ".fa-sort-alpha-desc");
    expect(model.getters.getPivotCoreDefinition(pivotId).rows).toEqual([{ order: "desc", ...row }]);
    expect(model.getters.getPivotCoreDefinition(pivotId).columns).toEqual([column]);

    // sort col ascending
    await hoverCell(model, "B4", 200);
    await click(fixture, ".o-dashboard-menu");
    await click(fixture, ".fa-sort-alpha-asc");
    expect(model.getters.getPivotCoreDefinition(pivotId).rows).toEqual([{ order: "desc", ...row }]);
    expect(model.getters.getPivotCoreDefinition(pivotId).columns).toEqual([
      { order: "asc", ...column },
    ]);
    // sort col descending
    await click(fixture, ".fa-sort-alpha-desc");
    expect(model.getters.getPivotCoreDefinition(pivotId).rows).toEqual([{ order: "desc", ...row }]);
    expect(model.getters.getPivotCoreDefinition(pivotId).columns).toEqual([
      { order: "desc", ...column },
    ]);
  });
});
