import { click } from "../test_helpers/dom_helper";
import { createModelFromGrid, mountSpreadsheet } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

describe("Pivot collapse icon", () => {
  test("Can collapse pivot row", async () => {
    // prettier-ignore
    const grid = {
        A1: "Customer", B1: "Price",  C1: "Year", D1: "=PIVOT(1)",
        A2: "Alice",    B2: "10",     C2: "2020",
        A3: "Alice",    B3: "20",     C3: "2021",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      rows: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
    });
    const { fixture } = await mountSpreadsheet({ model });

    expect(".o-pivot-collapse-icon .minus").toHaveCount(1);
    await click(fixture, ".o-pivot-collapse-icon .minus");

    expect(".o-pivot-collapse-icon .plus").toHaveCount(1);
    expect(model.getters.getPivotCoreDefinition("1").collapsedDomains).toEqual({
      ROW: [[{ field: "Customer", value: "Alice", type: "char" }]],
      COL: [],
    });

    await click(fixture, ".o-pivot-collapse-icon .plus");
    expect(".o-pivot-collapse-icon .minus").toHaveCount(1);
    expect(model.getters.getPivotCoreDefinition("1").collapsedDomains).toEqual({
      ROW: [],
      COL: [],
    });
  });

  test("Can collapse pivot column", async () => {
    // prettier-ignore
    const grid = {
        A1: "Customer", B1: "Price",  C1: "Year", D1: "=PIVOT(1)",
        A2: "Alice",    B2: "10",     C2: "2020",
        A3: "Alice",    B3: "20",     C3: "2021",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      columns: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
    });
    const { fixture } = await mountSpreadsheet({ model });

    expect(".o-pivot-collapse-icon .minus").toHaveCount(1);
    await click(fixture, ".o-pivot-collapse-icon .minus");

    expect(".o-pivot-collapse-icon .plus").toHaveCount(1);
    expect(model.getters.getPivotCoreDefinition("1").collapsedDomains).toEqual({
      COL: [[{ field: "Customer", value: "Alice", type: "char" }]],
      ROW: [],
    });

    await click(fixture, ".o-pivot-collapse-icon .plus");
    expect(".o-pivot-collapse-icon .minus").toHaveCount(1);
    expect(model.getters.getPivotCoreDefinition("1").collapsedDomains).toEqual({
      ROW: [],
      COL: [],
    });
  });
});
