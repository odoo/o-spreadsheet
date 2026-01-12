import { Model } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { click } from "../../../test_helpers";
import { mountComponentWithPortalTarget, nextTick, setGrid } from "../../../test_helpers/helpers";
import { addPivot } from "../../../test_helpers/pivot_helpers";

describe("Spreadsheet pivot side panel", () => {
  let model: Model;
  let fixture: HTMLElement;
  let env: SpreadsheetChildEnv;
  let notifyUser: jest.Mock;

  beforeEach(async () => {
    notifyUser = jest.fn();
    ({ env, model, fixture } = await mountComponentWithPortalTarget(SidePanels, {
      env: { notifyUser },
    }));
    // prettier-ignore
    const grid = {
            A1: "Customer", B1: "Product", C1: "Amount",
            A2: "Alice", B2: "Chair", C2: "10",
            A3: "Bob", B3: "Table", C3: "20",
        };
    setGrid(model, grid);

    addPivot(model, "A1:C3", {
      rows: [{ fieldName: "Customer", order: "asc" }],
      columns: [],
      measures: [{ id: "amount", fieldName: "Amount", aggregator: "sum" }],
      filters: [],
    });
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
  });

  test("can add a filter", async () => {
    await click(fixture.querySelectorAll(".add-dimension")[3]);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    expect(fixture.querySelector(".o-popover")).toBeNull();
    expect(model.getters.getPivotCoreDefinition("1").filters).toEqual([
      {
        fieldName: "Amount",
        filterType: "values",
        hiddenValues: [],
      },
    ]);
  });

  test("shows a warning when there is a filter on a deleted field", async () => {
    await click(fixture.querySelectorAll(".add-dimension")[3]);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    model.dispatch("REMOVE_COLUMNS_ROWS", {
      sheetId: "Sheet1",
      sheetName: "Sheet1",
      dimension: "COL",
      elements: [2],
    });
    expect(model.getters.getPivot("1").definition.filters).toEqual([
      {
        fieldName: "Amount",
        displayName: "Amount",
        filterType: "values",
        hiddenValues: [],
        isValid: false,
      },
    ]);
  });
});
