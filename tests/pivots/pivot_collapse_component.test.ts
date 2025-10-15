import { getPivotIconSvg } from "@odoo/o-spreadsheet-engine/components/icons/icons";
import { clickGridIcon } from "../test_helpers/dom_helper";
import { getCellIcons } from "../test_helpers/getters_helpers";
import { createModelFromGrid, mountSpreadsheet } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

const collapseIconSVG = getPivotIconSvg(false, false);
const expandIconSVG = getPivotIconSvg(true, false);

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
    await mountSpreadsheet({ model });

    expect(getCellIcons(model, "D3")[0].svg).toEqual(collapseIconSVG);
    await clickGridIcon(model, "D3");

    expect(getCellIcons(model, "D3")[0].svg).toEqual(expandIconSVG);
    expect(model.getters.getPivotCoreDefinition("1").collapsedDomains).toEqual({
      ROW: [[{ field: "Customer", value: "Alice", type: "char" }]],
      COL: [],
    });

    await clickGridIcon(model, "D3");
    expect(getCellIcons(model, "D3")[0].svg).toEqual(collapseIconSVG);
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
    await mountSpreadsheet({ model });

    expect(getCellIcons(model, "E1")[0].svg).toEqual(collapseIconSVG);
    await clickGridIcon(model, "E1");

    expect(getCellIcons(model, "E1")[0].svg).toEqual(expandIconSVG);
    expect(model.getters.getPivotCoreDefinition("1").collapsedDomains).toEqual({
      COL: [[{ field: "Customer", value: "Alice", type: "char" }]],
      ROW: [],
    });

    await clickGridIcon(model, "E1");
    expect(getCellIcons(model, "E1")[0].svg).toEqual(collapseIconSVG);
    expect(model.getters.getPivotCoreDefinition("1").collapsedDomains).toEqual({
      ROW: [],
      COL: [],
    });
  });
});
