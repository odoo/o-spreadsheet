import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model } from "../../src";
import { SidePanels } from "../../src/components/side_panel/side_panels/side_panels";
import { setCellContent } from "../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger, simulateClick } from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick, setGrid } from "../test_helpers/helpers";
import { addPivot, updatePivot } from "../test_helpers/pivot_helpers";

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
      A2: "Alice",    B2: "Chair",   C2: "10",
      A3: "Bob",      B3: "Table",   C3: "20",
    };
    setGrid(model, grid);

    addPivot(model, "A1:C3", {}, "1");
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
  });

  test("Can switch between config and design panels", async () => {
    const panelDivs = fixture.querySelectorAll(".o-panel-content > div");
    const panelTabs = fixture.querySelectorAll(".o-sidePanel-tab");

    expect(panelTabs[0]).toHaveText(" Configuration ");
    expect(panelTabs[0]).not.toHaveClass("inactive");
    expect(panelTabs[1]).toHaveText(" Design ");
    expect(panelTabs[1]).toHaveClass("inactive");
    expect(panelDivs[0]).not.toHaveClass("d-none");
    expect(panelDivs[1]).toHaveClass("d-none");

    await click(panelTabs[1]);
    expect(panelTabs[0]).toHaveClass("inactive");
    expect(panelTabs[1]).not.toHaveClass("inactive");
    expect(panelDivs[0]).toHaveClass("d-none");
    expect(panelDivs[1]).not.toHaveClass("d-none");
  });

  test("Pivot design panel is correctly initialized", async () => {
    updatePivot(model, "1", {
      style: {
        displayColumnHeaders: false,
        numberOfColumns: 87,
        displayTotals: true,
        bandedColumns: true,
        bandedRows: false,
        hasFilters: true,
      },
    });
    await nextTick();

    expect("input.o-pivot-n-of-rows").toHaveValue("");
    expect("input.o-pivot-n-of-columns").toHaveValue("87");
    expect("input[name='displayColumnHeaders']").toHaveValue(false);
    expect("input[name='displayTotals']").toHaveValue(true);
    expect("input[name='displayMeasuresRow']").toHaveValue(true);
    expect("input[name='bandedRows']").toHaveValue(false);
    expect("input[name='bandedColumns']").toHaveValue(true);
    expect("input[name='hasFilters']").toHaveValue(true);
  });

  test("Can edit the pivot style with the side panel", async () => {
    await setInputValueAndTrigger("input.o-pivot-n-of-rows", "12");
    await setInputValueAndTrigger("input.o-pivot-n-of-columns", "34");
    await simulateClick("input[name='displayColumnHeaders']");
    await simulateClick("input[name='displayTotals']");
    await simulateClick("input[name='displayMeasuresRow']");
    await simulateClick("input[name='bandedRows']");
    await simulateClick("input[name='bandedColumns']");
    await simulateClick("input[name='hasFilters']");

    expect(model.getters.getPivotCoreDefinition("1").style).toEqual({
      numberOfRows: 12,
      numberOfColumns: 34,
      displayColumnHeaders: false,
      displayTotals: false,
      displayMeasuresRow: false,
      bandedRows: true,
      bandedColumns: true,
      hasFilters: true,
    });
  });

  test("Editing the pivot style will warn the user if the sheet has only static pivot cells", async () => {
    setCellContent(model, "E1", "=PIVOT.HEADER(1)");
    await setInputValueAndTrigger("input.o-pivot-n-of-rows", "12");

    expect(notifyUser).toHaveBeenCalledWith({
      text: "Pivot updates only work with dynamic pivot tables. Use the formula '=PIVOT(1)' or re-insert the static pivot from the Data menu.",
      sticky: true,
      type: "info",
    });
  });

  test("Pivot style edition is never deferred", async () => {
    updatePivot(model, "1", { deferUpdates: true });
    await nextTick();
    await setInputValueAndTrigger("input.o-pivot-n-of-rows", "12");
    expect(model.getters.getPivotCoreDefinition("1").style?.numberOfRows).toBe(12);
  });

  test("Editing a number input with a non-number value make the property undefined and not NaN", async () => {
    updatePivot(model, "1", { style: { numberOfRows: 5, numberOfColumns: 10 } });
    await nextTick();

    jest.useFakeTimers();
    setInputValueAndTrigger("input.o-pivot-n-of-rows", "olà");
    setInputValueAndTrigger("input.o-pivot-n-of-columns", "");
    jest.advanceTimersByTime(1000);

    expect(model.getters.getPivotCoreDefinition("1").style).toEqual({
      numberOfRows: undefined,
      numberOfColumns: undefined,
    });
    jest.useRealTimers();
  });

  test("Can pick a pivot table style with both the picker and the popover", async () => {
    await click(fixture, ".o-table-style-list-item[data-id='PivotTableStyleLight1']");

    expect(model.getters.getPivotCoreDefinition("1").style?.tableStyleId).toBe(
      "PivotTableStyleLight1"
    );

    await click(fixture, ".o-table-style-picker-arrow");
    await click(fixture, ".o-popover .o-table-style-list-item[data-id='PivotTableStyleLight3']");
    expect(model.getters.getPivotCoreDefinition("1").style?.tableStyleId).toBe(
      "PivotTableStyleLight3"
    );
  });
});
