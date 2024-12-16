import { Model, SpreadsheetChildEnv } from "../../src";
import { click } from "../test_helpers/dom_helper";
import { createModelFromGrid, mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

describe("Pivot sorting icons", () => {
  let model: Model;
  let fixture: HTMLElement;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    // prettier-ignore
    const grid = {
            A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
            A2: "Alice",    B2: "10",
            A3: "Bob",      B3: "30",
    };
    model = createModelFromGrid(grid);
    addPivot(
      model,
      "A1:B3",
      {
        rows: [],
        columns: [{ fieldName: "Customer" }],
        measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
      },
      "pivotId"
    );

    ({ fixture, env } = await mountSpreadsheet({ model }));
  });

  test("Pivot sort icons are only visible when the side panel is open", async () => {
    expect(".o-pivot-sort-icon").toHaveCount(0);

    env.openSidePanel("PivotSidePanel", { pivotId: "pivotId" });
    await nextTick();
    await nextTick(); // icons are added in the onMounted of the side panel, which will trigger another render
    expect(".o-pivot-sort-icon").toHaveCount(3);

    await click(fixture, ".o-sidePanelClose");
    await nextTick();
    expect(".o-pivot-sort-icon").toHaveCount(0);
  });

  test("Can change the sorting of a column by clicking on an icon", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "pivotId" });
    await nextTick();
    await nextTick();

    const sortIconFirstCol = document.querySelector<HTMLElement>(".o-pivot-sort-icon")!;
    expect(sortIconFirstCol.querySelector(".o-dash-icon")).toBeDefined();
    await click(sortIconFirstCol);
    expect(model.getters.getPivot("pivotId").definition.sortedColumn).toMatchObject({
      measure: "Price:sum",
      order: "asc",
      domain: [{ field: "Customer", value: "Alice" }],
    });
    expect(sortIconFirstCol.querySelector(".fa-angle-down")).toBeDefined();

    await click(sortIconFirstCol);
    expect(model.getters.getPivot("pivotId").definition.sortedColumn).toMatchObject({
      measure: "Price:sum",
      order: "desc",
      domain: [{ field: "Customer", value: "Alice" }],
    });
    expect(sortIconFirstCol.querySelector(".fa-angle-up")).toBeDefined();

    await click(sortIconFirstCol);
    expect(model.getters.getPivot("pivotId").definition.sortedColumn).toBeUndefined();
    expect(sortIconFirstCol.querySelector(".o-dash-icon")).toBeDefined();
  });

  test("Can change the sorted column by clicking on an icon", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "pivotId" });
    await nextTick();
    await nextTick();

    const sortedIcons = document.querySelectorAll<HTMLElement>(".o-pivot-sort-icon");
    await click(sortedIcons[1]);
    expect(model.getters.getPivot("pivotId").definition.sortedColumn).toEqual({
      measure: "Price:sum",
      order: "asc",
      domain: [{ field: "Customer", value: "Bob", type: "char" }],
    });

    await click(sortedIcons[2]);
    expect(model.getters.getPivot("pivotId").definition.sortedColumn).toEqual({
      measure: "Price:sum",
      order: "asc",
      domain: [],
    });
  });
});
