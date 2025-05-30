import { Model, SpreadsheetChildEnv } from "../../../src";
import { PIVOT_TABLE_CONFIG } from "../../../src/constants";
import { toXC, toZone } from "../../../src/helpers";
import { SpreadsheetPivot } from "../../../src/helpers/pivot/spreadsheet_pivot/spreadsheet_pivot";
import { topbarMenuRegistry } from "../../../src/registries";
import { NotificationStore } from "../../../src/stores/notification_store";
import {
  activateSheet,
  createSheet,
  selectCell,
  setCellContent,
  setViewportOffset,
  undo,
} from "../../test_helpers/commands_helpers";
import {
  click,
  dragElement,
  keyDown,
  setInputValueAndTrigger,
} from "../../test_helpers/dom_helper";
import { getCellText, getCoreTable } from "../../test_helpers/getters_helpers";
import {
  doAction,
  editStandaloneComposer,
  mountSpreadsheet,
  nextTick,
} from "../../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../../test_helpers/mock_helpers";
import { SELECTORS, addPivot, updatePivot } from "../../test_helpers/pivot_helpers";

jest.mock("../../../src/components/composer/content_editable_helper.ts", () =>
  require("../../__mocks__/content_editable_helper")
);

describe("Spreadsheet pivot side panel", () => {
  let model: Model;
  let fixture: HTMLElement;
  let env: SpreadsheetChildEnv;
  let notifyUser: jest.Mock;

  beforeEach(async () => {
    notifyUser = jest.fn();
    ({ env, model, fixture } = await mountSpreadsheet(undefined, { notifyUser }));
    setCellContent(model, "A1", "Customer");
    setCellContent(model, "B1", "Product");
    setCellContent(model, "C1", "Amount");
    setCellContent(model, "A2", "Alice");
    setCellContent(model, "B2", "Chair");
    setCellContent(model, "C2", "10");
    setCellContent(model, "A3", "Bob");
    setCellContent(model, "B3", "Table");
    setCellContent(model, "C3", "20");
    addPivot(model, "A1:C3", {}, "1");
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
  });

  test("It should correctly be displayed", async () => {
    expect(fixture.querySelector(".o-sidePanel")).toMatchSnapshot();
  });

  test("It should display only the selection input when the dataSet is not valid", async () => {
    updatePivot(model, "1", { dataSet: undefined });
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel")).toMatchSnapshot();
  });

  test("It should be able to change the pivot name", async () => {
    await click(fixture.querySelector(".pivot-defer-update input")!);
    await nextTick();
    setInputValueAndTrigger(".os-pivot-title", "New Pivot Name");
    expect(model.getters.getPivotName("1")).toEqual("New Pivot Name");
  });

  test("It should be able to defer updates", async () => {
    setCellContent(model, "A1", "amount");
    setCellContent(model, "A2", "10");
    setCellContent(model, "A3", "20");
    addPivot(model, "A1:A3", {}, "3");
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    await click(fixture.querySelector(".pivot-defer-update input")!);
    await click(fixture.querySelector(".add-dimension")!);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture, ".o-autocomplete-value");
    expect(model.getters.getPivotCoreDefinition("3").columns).toEqual([]);
    await click(fixture.querySelector(".sp_apply_update")!);
    expect(model.getters.getPivotCoreDefinition("3").columns).toEqual([
      { fieldName: "amount", order: "asc" },
    ]);
  });

  test("can add a calculated measure", async () => {
    setCellContent(model, "A1", "amount");
    setCellContent(model, "A2", "10");
    setCellContent(model, "A3", "20");
    addPivot(model, "A1:A3", {}, "3");
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    await click(fixture.querySelectorAll(".add-dimension")[2]);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture, ".add-calculated-measure");
    expect(fixture.querySelector(".o-popover")).toBeNull();
    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      {
        id: "Calculated measure 1",
        fieldName: "Calculated measure 1",
        aggregator: "sum",
        computedBy: {
          formula: "=0",
          sheetId: model.getters.getActiveSheetId(),
        },
      },
    ]);
    await editStandaloneComposer(".pivot-dimension .o-composer", "=1+1");
    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      {
        id: "Calculated measure 1",
        fieldName: "Calculated measure 1",
        aggregator: "sum",
        computedBy: {
          formula: "=1+1",
          sheetId: model.getters.getActiveSheetId(),
        },
      },
    ]);
  });

  test("can add a calculated measure without leading equal", async () => {
    setCellContent(model, "A1", "amount");
    setCellContent(model, "A2", "10");
    setCellContent(model, "A3", "20");
    addPivot(model, "A1:A3", {}, "3");
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    await click(fixture.querySelectorAll(".add-dimension")[2]);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture, ".add-calculated-measure");
    await editStandaloneComposer(".pivot-dimension .o-composer", "1+1");
    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      {
        id: "Calculated measure 1",
        fieldName: "Calculated measure 1",
        aggregator: "sum",
        computedBy: {
          formula: "=1+1",
          sheetId: model.getters.getActiveSheetId(),
        },
      },
    ]);
  });

  test("Invalid calculated measure formula have an invalid class on the composer", async () => {
    await click(fixture.querySelectorAll(".add-dimension")[2]);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture, ".add-calculated-measure");
    await editStandaloneComposer(".pivot-dimension .o-composer", "=abcdefg()");
    expect(fixture.querySelector(".o-standalone-composer")).toHaveClass("o-invalid");
  });

  test("can select a cell in the grid in several sheets", async () => {
    setCellContent(model, "A1", "amount");
    setCellContent(model, "A2", "10");
    setCellContent(model, "A3", "20");
    addPivot(model, "A1:A3", {}, "3");
    const sheet1Id = model.getters.getActiveSheetId();
    const sheet2Id = "sheet2";
    createSheet(model, { sheetId: sheet2Id });
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    await click(fixture.querySelectorAll(".add-dimension")[2]);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture, ".add-calculated-measure");
    await editStandaloneComposer(".pivot-dimension .o-composer", "=", { confirm: false });
    selectCell(model, "A1");
    await nextTick();
    expect(fixture.querySelector(".pivot-dimension .o-composer")?.textContent).toEqual("=A1");
    await editStandaloneComposer(".pivot-dimension .o-composer", "+", {
      confirm: false,
      fromScratch: false,
    });
    activateSheet(model, sheet2Id);
    selectCell(model, "A1");
    await nextTick();
    expect(fixture.querySelector(".pivot-dimension .o-composer")?.textContent).toEqual(
      "=A1+Sheet2!A1"
    );
    await keyDown({ key: "Enter" });

    activateSheet(model, sheet2Id);
    // close the side panel and reopen it while the second sheet is active
    await click(fixture.querySelector(".o-sidePanelClose")!);
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    expect(fixture.querySelector(".pivot-dimension .o-composer")?.textContent).toEqual(
      "=Sheet1!A1+Sheet2!A1"
    );

    // reopen in the original sheet
    await click(fixture.querySelector(".o-sidePanelClose")!);
    activateSheet(model, sheet1Id);
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    expect(fixture.querySelector(".pivot-dimension .o-composer")?.textContent).toEqual(
      "=A1+Sheet2!A1"
    );
  });

  test("it should not defer update when the dataset is updated", async () => {
    await click(fixture.querySelector(".pivot-defer-update input")!);
    expect((fixture.querySelector(".pivot-defer-update input")! as HTMLInputElement).checked).toBe(
      true
    );
    const input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    input.value = "A1:C2";
    input.dispatchEvent(new Event("input"));
    await nextTick();
    await click(fixture.querySelector(".o-selection-ok")!);
    expect(model.getters.getPivotCoreDefinition("1")["dataSet"].zone).toEqual(toZone("A1:C2"));
  });

  test("It should hide range error message if the user updates the range even if the pivot is dirty", async () => {
    updatePivot(model, "1", { dataSet: undefined });
    await nextTick();
    const pivot = model.getters.getPivot("1") as SpreadsheetPivot;
    expect(fixture.querySelector(".sp_range_error_message")?.textContent).toEqual(
      pivot.invalidRangeMessage
    );
    const input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    input.value = "A1:C2";
    input.dispatchEvent(new Event("input"));
    await nextTick();
    await click(fixture.querySelector(".o-selection-ok")!);
    expect(fixture.querySelectorAll(".sp_range_error_message")).toHaveLength(0);
  });

  test("Can rename a pivot", async () => {
    setInputValueAndTrigger(".os-pivot-title", "New Pivot Name");
    expect(model.getters.getPivotName("1")).toEqual("New Pivot Name");
  });

  test("Cannot rename a pivot with an empty name", async () => {
    const name = model.getters.getPivotName("1");
    setInputValueAndTrigger(".os-pivot-title", "");
    await nextTick();
    expect((fixture.querySelector(".os-pivot-title") as HTMLInputElement).value).toEqual(name);
    expect(model.getters.getPivotName("1")).toEqual(name);
  });

  test("Cannot duplicate a pivot in error", async () => {
    updatePivot(model, "1", { dataSet: undefined });
    expect(model.getters.getPivot("1").isValid()).toBe(false);

    await click(fixture, SELECTORS.COG_WHEEL);
    await click(fixture, SELECTORS.DUPLICATE_PIVOT);
    expect(notifyUser).toHaveBeenCalledWith({
      sticky: false,
      text: "Cannot duplicate a pivot in error.",
      type: "danger",
    });
  });

  test("Can duplicate a pivot and undo the whole action with one step backward", async () => {
    await click(fixture, SELECTORS.COG_WHEEL);
    await click(fixture, SELECTORS.DUPLICATE_PIVOT);
    const pivotId = model.getters.getPivotId("2")!;
    expect(model.getters.getPivot(pivotId)).toBeDefined();
    expect(model.getters.getPivotDisplayName(pivotId)).toEqual("(#2) Pivot (copy)");
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #2");
    expect(model.getters.getSheetIds()).toHaveLength(2);
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe(
      "Pivot (copy) (Pivot #2)"
    );
    expect(getCellText(model, "A1")).toBe("=PIVOT(2)");
    expect(getCoreTable(model, "A1")).toMatchObject({
      range: { zone: toZone("A1") },
      config: PIVOT_TABLE_CONFIG,
      type: "dynamic",
    });

    undo(model);

    expect(model.getters.getPivotId("2")).toBeUndefined();
    expect(model.getters.getSheetIds()).toHaveLength(1);
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");
    expect(getCoreTable(model, "A1")).toBe(undefined);
  });

  test("Can duplicate a pivot when a duplicate sheet name already exists", async () => {
    createSheet(model, { name: "Pivot (copy) (Pivot #2)" });
    await click(fixture, SELECTORS.COG_WHEEL);
    await click(fixture, SELECTORS.DUPLICATE_PIVOT);
    const pivotId = model.getters.getPivotId("2")!;
    expect(model.getters.getPivot(pivotId)).toBeDefined();
    expect(model.getters.getPivotDisplayName(pivotId)).toEqual("(#2) Pivot (copy)");
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #2");
    expect(model.getters.getSheetIds()).toHaveLength(3);
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe(
      "Pivot (copy) (Pivot #2) (1)"
    );
    expect(getCellText(model, "A1")).toBe("=PIVOT(2)");
  });

  test("Can flip axes of a pivot", async () => {
    updatePivot(model, "1", {
      rows: [{ fieldName: "Contact Name", order: "asc" }],
      columns: [{ fieldName: "Active", order: "asc" }],
    });
    await click(fixture, SELECTORS.COG_WHEEL);
    await click(fixture, SELECTORS.FLIP_AXIS_PIVOT);
    const pivotId = model.getters.getPivotId("1")!;
    expect(model.getters.getPivotCoreDefinition(pivotId).rows).toEqual([
      { fieldName: "Active", order: "asc" },
    ]);
    expect(model.getters.getPivotCoreDefinition(pivotId).columns).toEqual([
      { fieldName: "Contact Name", order: "asc" },
    ]);
  });

  test("Pivot dimensions are ordered 'asc' by default", async () => {
    setCellContent(model, "A1", "amount");
    setCellContent(model, "A2", "10");
    setCellContent(model, "A3", "20");
    addPivot(model, "A1:A3", {}, "3");
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    await click(fixture.querySelector(".add-dimension")!);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture, ".o-autocomplete-value");
    expect(model.getters.getPivotCoreDefinition("3").columns).toEqual([
      { fieldName: "amount", order: "asc" },
    ]);
  });

  test("should reset side panel if discard is clicked", async () => {
    await click(fixture.querySelector(".pivot-defer-update input")!);
    expect(fixture.querySelectorAll(".pivot-dimension")).toHaveLength(0);
    await click(fixture.querySelector(".add-dimension")!);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    expect(fixture.querySelectorAll(".pivot-dimension")).toHaveLength(1);
    await click(fixture.querySelector(".fa-undo")!);
    expect(fixture.querySelectorAll(".pivot-dimension")).toHaveLength(0);
  });

  test("filter unsupported measures", async () => {
    setCellContent(model, "A1", "integer");
    setCellContent(model, "A2", "10");
    setCellContent(model, "B1", "float");
    setCellContent(model, "B2", "10.1");
    setCellContent(model, "C1", "bool");
    setCellContent(model, "C2", "true");
    setCellContent(model, "D1", "date");
    setCellContent(model, "D2", "2024/01/01");
    setCellContent(model, "E1", "datetime");
    setCellContent(model, "E2", "2024/01/01 08:00:00");
    setCellContent(model, "F1", "text");
    setCellContent(model, "F2", "hi");
    addPivot(model, "A1:F2", {}, "3");
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    const measures = [...fixture.querySelectorAll(".o-autocomplete-value")].map(
      (el) => el.textContent
    );
    expect(measures).toEqual(["Count", "float", "integer", "text"]);
  });

  test("Measures have the correct default aggregator", async () => {
    setCellContent(model, "A1", "amount");
    setCellContent(model, "A2", "10");
    setCellContent(model, "B1", "person");
    setCellContent(model, "B2", "Alice");
    addPivot(model, "A1:B2", {}, "3");
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();

    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      { id: "amount:sum", fieldName: "amount", aggregator: "sum" },
    ]);

    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[2]);
    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      { id: "amount:sum", fieldName: "amount", aggregator: "sum" },
      { id: "person:count", fieldName: "person", aggregator: "count" },
    ]);
  });

  test("Can add date dimension", async () => {
    setCellContent(model, "G1", "=PIVOT(1)"); // TODO: remove once task 4781740 is done
    setCellContent(model, "A1", "Date");
    setCellContent(model, "A2", "2023-01-01");
    setCellContent(model, "A3", "2023-01-02");
    updatePivot(model, "1", {
      columns: [],
      measures: [{ id: "Amount:sum", fieldName: "Amount", aggregator: "sum" }],
    });
    await nextTick();

    await click(fixture.querySelector(".add-dimension")!);
    const autocompleteEls = [...fixture.querySelectorAll(".o-autocomplete-value")];
    await click(autocompleteEls.find((el) => el.textContent === "Date")!);
    expect(model.getters.getPivotCoreDefinition("1").columns).toMatchObject([
      { fieldName: "Date", granularity: "year" },
    ]);

    await click(fixture.querySelector(".add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    expect(model.getters.getPivotCoreDefinition("1").columns).toMatchObject([
      { fieldName: "Date", granularity: "year" },
      { fieldName: "Date", granularity: "quarter_number" },
    ]);
  });

  test("Date dimensions with undefined granularity is correctly displayed as month", async () => {
    setCellContent(model, "G1", "=PIVOT(1)"); // TODO: remove once task 4781740 is done
    setCellContent(model, "A1", "Date");
    setCellContent(model, "A2", "2023-01-01");
    setCellContent(model, "A3", "2023-01-02");
    updatePivot(model, "1", {
      columns: [{ fieldName: "Date" }],
      measures: [{ id: "Amount:sum", fieldName: "Amount", aggregator: "sum" }],
    });
    await nextTick();

    expect(fixture.querySelector<HTMLSelectElement>(".pivot-dimension select")?.value).toEqual(
      "month"
    );

    // Note:  this behaviour is somewhat buggy. The granularity was set to undefined (=month), but adding a new
    // dimension with the same name will set the granularity to year. We decided that the additional
    // code complexity to fix this wasn't worth it.
    await click(fixture.querySelector(".add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    expect(model.getters.getPivotCoreDefinition("1").columns).toMatchObject([
      { fieldName: "Date", granularity: "year" },
      { fieldName: "Date", granularity: "quarter_number" },
    ]);
  });

  test("should preserve the sorting of the dimension after ordering is changed", async () => {
    mockGetBoundingClientRect({
      "h-100": () => ({
        height: 100,
        y: 0,
      }),
      /**
       * 'pt-1' is the class of the main div of the pivot dimension
       */
      "pt-1": () => ({
        height: 10,
        y: 0,
      }),
      "o-section-title": () => ({
        height: 10,
        y: 10,
      }),
      "pivot-dimensions": () => ({
        height: 40,
        y: 0,
      }),
    });
    await click(fixture.querySelector(".add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    await setInputValueAndTrigger(fixture.querySelector(".pivot-dimension select"), "desc");
    expect(model.getters.getPivotCoreDefinition("1").columns).toEqual([
      { fieldName: "Amount", order: "desc" },
    ]);
    await dragElement(fixture.querySelector(".pivot-dimension")!, { x: 0, y: 30 }, undefined, true);
    expect(model.getters.getPivotCoreDefinition("1").rows).toEqual([
      { fieldName: "Amount", order: "desc" },
    ]);
  });

  test("Can add the same measure multiple times", async () => {
    setCellContent(model, "A1", "amount");
    setCellContent(model, "A2", "10");
    setCellContent(model, "B1", "person");
    setCellContent(model, "B2", "Alice");
    addPivot(model, "A1:B2", {}, "3");
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();

    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      { id: "amount:sum", fieldName: "amount", aggregator: "sum" },
      { id: "amount:sum:2", fieldName: "amount", aggregator: "sum" },
    ]);
  });

  test("Can update the name of a measure", async () => {
    setCellContent(model, "A1", "amount");
    setCellContent(model, "A2", "10");
    setCellContent(model, "B1", "person");
    setCellContent(model, "B2", "Alice");
    addPivot(
      model,
      "A1:B2",
      {
        measures: [{ id: "amount:sum", fieldName: "amount", aggregator: "sum" }],
      },
      "3"
    );
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();

    const input = fixture.querySelector(".pivot-measure input") as HTMLInputElement;
    expect(input.value).toBe("amount");
    await setInputValueAndTrigger(".pivot-measure input", "A lovely name");
    expect(input.value).toBe("A lovely name");

    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      {
        id: "amount:sum",
        fieldName: "amount",
        aggregator: "sum",
        userDefinedName: "A lovely name",
      },
    ]);
  });

  test("notify when no dynamic pivot is visible", async () => {
    setCellContent(model, "A4", "=PIVOT(1)");
    const mockNotify = jest.fn();
    const notificationStore = env.getStore(NotificationStore);
    notificationStore.updateNotificationCallbacks({
      notifyUser: mockNotify,
    });

    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[1]);
    // don't notify when only dynamic pivot is visible
    expect(mockNotify).toHaveBeenCalledTimes(0);

    // scroll beyond the =PIVOT formula
    setViewportOffset(model, 0, 1000);

    // add a static pivot in the viewport
    const { bottom: row, right: col } = model.getters.getActiveMainViewport();
    setCellContent(model, toXC(col, row), "=PIVOT.VALUE(1)");
    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[1]);
    expect(mockNotify).toHaveBeenCalledWith({
      text: "Pivot updates only work with dynamic pivot tables. Use =PIVOT(1) or re-insert the static pivot from the Data menu.",
      sticky: true,
      type: "info",
    });

    // don't notify a second time
    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[1]);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  test("notification should not be triggered when the pivot opened in the side panel differs from the pivots visible in the viewport.", async () => {
    const mockNotify = jest.fn();
    const notificationStore = env.getStore(NotificationStore);
    notificationStore.updateNotificationCallbacks({
      notifyUser: mockNotify,
    });
    const pivotData = { measures: [{ id: "amount:sum", fieldName: "amount", aggregator: "sum" }] };
    addPivot(model, "B1:B2", pivotData, "2");
    // insert the first pivot as static pivot in a new empty sheet
    const sheet2Id = "sheet2";
    createSheet(model, { sheetId: sheet2Id, activate: true });
    const reinsertStaticPivotPath = ["data", "reinsert_static_pivot", "reinsert_static_pivot_1"];
    doAction(reinsertStaticPivotPath, env, topbarMenuRegistry);
    env.openSidePanel("PivotSidePanel", { pivotId: "2" });
    await nextTick();
    // update the pivot
    await click(fixture.querySelector(".pivot-measure .fa-eye")!);
    expect(mockNotify).toHaveBeenCalledTimes(0);
  });

  test("Invalid pivot dimensions are displayed as such in the side panel", async () => {
    setCellContent(model, "A1", "ValidDimension");
    setCellContent(model, "A2", "10");
    addPivot(model, "A1:A2", {
      columns: [{ fieldName: "ValidDimension" }],
      rows: [{ fieldName: "InvalidDimension" }],
    });
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
    const pivotDimensionEls = fixture.querySelectorAll<HTMLElement>(".pivot-dimension")!;
    const validDimensionEl = pivotDimensionEls[0];
    expect(validDimensionEl.classList).not.toContain("pivot-dimension-invalid");
    expect(validDimensionEl.querySelector(".fa-exclamation-triangle")).toBe(null);

    const invalidDimensionEl = pivotDimensionEls[1];
    expect(invalidDimensionEl.classList).toContain("pivot-dimension-invalid");
    expect(invalidDimensionEl.querySelector(".fa-exclamation-triangle")).not.toBe(null);
  });

  test("Can update the name of a computed measure", async () => {
    setCellContent(model, "B1", "person");
    setCellContent(model, "B2", "Alice");
    const sheetId = model.getters.getActiveSheetId();
    addPivot(
      model,
      "B1:B2",
      {
        measures: [
          {
            id: "amount:sum",
            fieldName: "amount",
            aggregator: "sum",
            computedBy: { sheetId, formula: "=10" },
          },
        ],
      },
      "3"
    );
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();

    const input = fixture.querySelector(".pivot-measure input") as HTMLInputElement;
    expect(input.value).toBe("amount");
    await setInputValueAndTrigger(".pivot-measure input", "A lovely name");
    expect(input.value).toBe("A lovely name");

    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      {
        id: "A lovely name:sum",
        fieldName: "A lovely name",
        aggregator: "sum",
        userDefinedName: "A lovely name",
        computedBy: { sheetId, formula: "=10" },
      },
    ]);
  });

  test("can hide and unhide a measure", async () => {
    addPivot(
      model,
      "B1:B2",
      {
        measures: [{ id: "amount:sum", fieldName: "amount", aggregator: "sum" }],
      },
      "3"
    );
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    await click(fixture.querySelector(".pivot-measure .fa-eye")!);
    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      { id: "amount:sum", fieldName: "amount", aggregator: "sum", isHidden: true },
    ]);
    await click(fixture.querySelector(".pivot-measure .fa-eye-slash")!);
    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      { id: "amount:sum", fieldName: "amount", aggregator: "sum", isHidden: false },
    ]);
  });

  test("Cannot drag a dimension when clicking its upper right icons", async () => {
    mockGetBoundingClientRect({
      /**
       * 'pt-1' is the class of the main div of the pivot dimension
       */
      "pt-1": () => ({
        height: 10,
        y: 0,
      }),
      "o-section-title": () => ({
        height: 10,
        y: 10,
      }),
      "pivot-dimensions": () => ({
        height: 40,
        y: 0,
      }),
    });
    await click(fixture.querySelector(".add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    await setInputValueAndTrigger(fixture.querySelector(".pivot-dimension select"), "desc");
    expect(model.getters.getPivotCoreDefinition("1").columns).toEqual([
      { fieldName: "Amount", order: "desc" },
    ]);
    await dragElement(".pivot-dimension .fa-trash", { x: 0, y: 30 }, undefined, true);
    expect(model.getters.getPivotCoreDefinition("1").columns).toEqual([
      { fieldName: "Amount", order: "desc" },
    ]);
  });

  test("Pivot with multiple time the same dimension does not crash the side panel", async () => {
    setCellContent(model, "A1", "ValidDimension");
    setCellContent(model, "A2", "10");
    addPivot(model, "A1:A2", {
      columns: [{ fieldName: "ValidDimension" }, { fieldName: "ValidDimension" }],
    });
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
    expect(1).toBe(1);
  });
});
