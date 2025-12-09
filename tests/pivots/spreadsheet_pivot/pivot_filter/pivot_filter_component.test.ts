import { Model } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import {
  click,
  deleteColumns,
  setInputValueAndTrigger,
  simulateClick,
} from "../../../test_helpers";
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
      A1: "Customer", B1: "Product", C1: "Amount", D1: "Date",
      A2: "Alice", B2: "Chair", C2: "10", D2: "1/1/2001",
      A3: "Bob", B3: "Table", C3: "20", D3: "2/2/2002",
    };
    setGrid(model, grid);

    addPivot(model, "A1:D3", {
      rows: [{ fieldName: "Customer", order: "asc" }],
      columns: [],
      measures: [{ id: "amount", fieldName: "Amount", aggregator: "sum" }],
      filters: [{ fieldName: "Amount", filterType: "values", hiddenValues: [] }],
    });
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
  });

  test("can only have a filter on a field once", async () => {
    await click(fixture.querySelectorAll(".add-dimension")[3]);
    expect(".o-autocomplete-value").toHaveCount(3);
    expect(fixture.querySelectorAll(".o-autocomplete-value")[0].textContent).toBe("Customer");
    expect(fixture.querySelectorAll(".o-autocomplete-value")[1].textContent).toBe("Date");
    expect(fixture.querySelectorAll(".o-autocomplete-value")[2].textContent).toBe("Product");
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    await click(fixture.querySelectorAll(".add-dimension")[3]);
    expect(".o-autocomplete-value").toHaveCount(2);
  });

  test.skip("shows a warning when there is a filter on a deleted field", async () => {
    deleteColumns(model, ["C"]);
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

  test("can add a filter", async () => {
    await click(fixture.querySelectorAll(".add-dimension")[3]);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    expect(model.getters.getPivotCoreDefinition("1").filters).toEqual([
      {
        fieldName: "Amount",
        filterType: "values",
        hiddenValues: [],
      },
      {
        fieldName: "Customer",
        filterType: "values",
        hiddenValues: [],
      },
    ]);
  });

  test("can remove a filter", async () => {
    await click(fixture.querySelectorAll(".fa-trash")[2]);
    expect(model.getters.getPivotCoreDefinition("1").filters).toEqual([]);
  });

  test("the list of values is correct", async () => {
    await click(fixture.querySelector(".o-pivot-filter-icon")!);
    expect(".o-popover").toHaveCount(1);
    expect(".o-filter-menu-item").toHaveCount(2);
    const firstValue = fixture.querySelectorAll(".o-filter-menu-item")[0].textContent;
    const secondValue = fixture.querySelectorAll(".o-filter-menu-item")[1].textContent;
    expect([firstValue, secondValue]).toEqual(["10", "20"]);
  });

  test("can update the hidden values of a values filter (caption and icon are updated as well)", async () => {
    expect(".o-pivot-filter-caption").toHaveText("showing all items");
    expect(fixture.querySelector(".o-pivot-filter-icon .filter-icon")!).toBeDefined();
    await click(fixture.querySelector(".o-pivot-filter-icon")!);
    await click(fixture.querySelectorAll(".o-filter-menu-item .o-checkbox")[0]);
    await click(fixture, ".o-filter-menu-confirm");
    expect(".o-popover").toHaveCount(0);
    expect(model.getters.getPivotCoreDefinition("1").filters).toEqual([
      {
        fieldName: "Amount",
        filterType: "values",
        hiddenValues: ["10"],
      },
    ]);
    expect(".o-pivot-filter-caption").toHaveText("showing 1 item");
    expect(fixture.querySelector(".o-pivot-filter-icon .filter-icon-active")!).toBeDefined();
  });

  test("can update the criterion of a criterion filter", async () => {
    await click(fixture.querySelector(".o-pivot-filter-icon")!);
    await simulateClick(".o-filter-criterion-type");
    await simulateClick(fixture.querySelectorAll(".o-select-option")[1]);
    await setInputValueAndTrigger(".o-dv-input .o-input ", "10");
    await click(fixture, ".o-filter-menu-confirm");
    expect(model.getters.getPivotCoreDefinition("1").filters).toEqual([
      {
        fieldName: "Amount",
        filterType: "criterion",
        type: "isEqual",
        values: ["10"],
        dateValue: undefined,
      },
    ]);
    expect(".o-pivot-filter-caption").toHaveText("Value is equal to 10");
    expect(fixture.querySelector(".o-pivot-filter-icon .filter-icon-active")!).toBeDefined();
  });

  test("can update the criterion of a criterion filter with date type", async () => {
    await click(fixture.querySelectorAll(".add-dimension")[3]);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[1]);
    await click(fixture.querySelectorAll(".o-pivot-filter-icon")[1]);
    await simulateClick(".o-filter-criterion-type");
    await simulateClick(fixture.querySelectorAll(".o-select-option")[1]);
    await setInputValueAndTrigger(".o-dv-input .o-input ", "1/1/2001");
    await click(fixture, ".o-filter-menu-confirm");
    expect(model.getters.getPivotCoreDefinition("1").filters).toEqual([
      {
        fieldName: "Amount",
        filterType: "values",
        hiddenValues: [],
      },
      {
        fieldName: "Date",
        filterType: "criterion",
        type: "dateIs",
        values: ["1/1/2001"],
        dateValue: "exactDate",
      },
    ]);
    expect(fixture.querySelectorAll(".o-pivot-filter-caption")[1].textContent).toBe(
      "Date is 1/1/2001"
    );
  });
});
