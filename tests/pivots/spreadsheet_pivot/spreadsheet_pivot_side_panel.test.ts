import { Model, PivotSortedColumn, SpreadsheetChildEnv } from "../../../src";
import { PIVOT_TABLE_CONFIG, PIVOT_TOKEN_COLOR } from "../../../src/constants";
import { toZone } from "../../../src/helpers";
import { SpreadsheetPivot } from "../../../src/helpers/pivot/spreadsheet_pivot/spreadsheet_pivot";
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
  getComposerColors,
  keyDown,
  setInputValueAndTrigger,
} from "../../test_helpers/dom_helper";
import { getCellText, getCoreTable } from "../../test_helpers/getters_helpers";
import {
  editStandaloneComposer,
  mountSpreadsheet,
  nextTick,
  setGrid,
} from "../../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../../test_helpers/mock_helpers";
import { SELECTORS, addPivot, updatePivot } from "../../test_helpers/pivot_helpers";

describe("Spreadsheet pivot side panel", () => {
  let model: Model;
  let fixture: HTMLElement;
  let env: SpreadsheetChildEnv;
  let notifyUser: jest.Mock;

  beforeEach(async () => {
    notifyUser = jest.fn();
    ({ env, model, fixture } = await mountSpreadsheet(undefined, { notifyUser }));
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

  test("Calculated measure tokens are correctly colored", async () => {
    setCellContent(model, "C1", "Amount with spaces");
    setCellContent(model, "D1", "Date");
    setCellContent(model, "D2", "01/05/2024");
    setCellContent(model, "D3", "01/05/2025");
    addPivot(
      model,
      "A1:D3",
      {
        columns: [{ fieldName: "Product" }, { fieldName: "Date", granularity: "year" }],
        rows: [{ fieldName: "Customer" }],
        measures: [{ id: "amount with spaces:sum", fieldName: "Amount", aggregator: "sum" }],
      },
      "3"
    );
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    await click(fixture.querySelectorAll(".add-dimension")[2]);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture, ".add-calculated-measure");

    await editStandaloneComposer(
      ".pivot-dimension .o-composer",
      "='amount with spaces:sum' + 5 + Product + Customer + NotAField + 'Date:year'",
      { confirm: false }
    );
    await nextTick();

    expect(getComposerColors(fixture.querySelector(".pivot-dimension .o-composer")!)).toMatchObject(
      {
        "'amount with spaces:sum'": PIVOT_TOKEN_COLOR,
        Product: PIVOT_TOKEN_COLOR,
        Customer: PIVOT_TOKEN_COLOR,
        NotAField: "#000000",
        "'Date:year'": PIVOT_TOKEN_COLOR,
      }
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
    expect(measures).toEqual(["Count", "date", "datetime", "float", "integer", "text"]);
  });

  test("defer update option is persistent", async () => {
    const pivotId = model.getters.getPivotIds()[0];
    expect(".pivot-defer-update input").toHaveValue(false);
    expect(model.getters.getPivotCoreDefinition(pivotId).deferUpdates).toBeFalsy();

    await click(fixture, ".pivot-defer-update input");
    expect(".pivot-defer-update input").toHaveValue(true);
    expect(model.getters.getPivotCoreDefinition(pivotId).deferUpdates).toBeTruthy();

    await click(fixture, ".o-sidePanelClose");
    env.openSidePanel("PivotSidePanel", { pivotId });
    await nextTick();
    expect(".pivot-defer-update input").toHaveValue(true);
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

  test("can add a datetime measure", async () => {
    setCellContent(model, "A1", "name");
    setCellContent(model, "A2", "Alice");
    setCellContent(model, "B1", "birthdate");
    setCellContent(model, "B2", "1995/12/15");
    addPivot(model, "A1:B2", {}, "3");
    env.openSidePanel("PivotSidePanel", { pivotId: "3" });
    await nextTick();
    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    expect(model.getters.getPivotCoreDefinition("3").measures).toEqual([
      { id: "birthdate:count", fieldName: "birthdate", aggregator: "count" },
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
    // don't notify when dynamic pivot is visible
    expect(mockNotify).toHaveBeenCalledTimes(0);

    // scroll beyond the =PIVOT formula
    setViewportOffset(model, 0, 1000);
    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[1]);
    expect(mockNotify).toHaveBeenCalledTimes(0);

    // add a static pivot in the viewport
    setCellContent(model, "A50", "=PIVOT.VALUE(1)");
    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[1]);
    expect(mockNotify).toHaveBeenCalledWith({
      text: "Pivot updates only work with dynamic pivot tables. Use =PIVOT(1) or re-insert the static pivot from the Data menu.",
      sticky: false,
      type: "info",
    });

    // don't notify a second time
    await click(fixture.querySelector(".o-pivot-measure .add-dimension")!);
    await click(fixture.querySelectorAll(".o-autocomplete-value")[1]);
    expect(mockNotify).toHaveBeenCalledTimes(1);
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

  describe("Pivot sorting", () => {
    const sortedColumn: PivotSortedColumn = {
      order: "asc",
      measure: "Amount",
      domain: [{ field: "Customer", value: "Bob", type: "char" }],
    };

    beforeEach(async () => {
      addPivot(
        model,
        "A1:C3",
        {
          columns: [{ fieldName: "Customer" }],
          measures: [{ id: "Amount", fieldName: "Amount", aggregator: "sum" }],
          sortedColumn,
        },
        "1"
      );
      env.openSidePanel("PivotSidePanel", { pivotId: "1" });
      await nextTick();
    });

    test("Pivot sorting is displayed in the side panel", async () => {
      expect(".o-sidePanel .o-pivot-sort").toHaveCount(1);
      const sortValues = [...fixture.querySelectorAll(".o-sort-card")].map((s) => s.textContent);
      expect(sortValues).toEqual(["Customer = Bob", "Measure = Amount"]);
    });

    test("Does not display sorting for pivot with no sorting or invalid sorting ", async () => {
      updatePivot(model, "1", { sortedColumn: undefined });
      env.openSidePanel("PivotSidePanel", { pivotId: "1" });
      await nextTick();
      expect(".o-sidePanel .o-pivot-sort").toHaveCount(0);

      updatePivot(model, "1", {
        sortedColumn: { order: "asc", measure: "Yolo", domain: [] },
      });
      await nextTick();
      expect(".o-sidePanel .o-pivot-sort").toHaveCount(0);
    });

    test("Pivot sorting is removed when removing the sorted measure", async () => {
      expect(model.getters.getPivotCoreDefinition("1").sortedColumn).toEqual(sortedColumn);
      click(fixture, ".pivot-measure .fa-trash");
      expect(model.getters.getPivotCoreDefinition("1").sortedColumn).toBeUndefined();
    });

    test("Pivot sorting is removed when removing a column", async () => {
      expect(model.getters.getPivotCoreDefinition("1").sortedColumn).toEqual(sortedColumn);
      const column = fixture.querySelectorAll(".pivot-dimension")[0];
      click(column, ".fa-trash");
      expect(model.getters.getPivotCoreDefinition("1").sortedColumn).toBeUndefined();
    });
  });
});
