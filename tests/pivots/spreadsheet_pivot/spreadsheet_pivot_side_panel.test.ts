import { Model, SpreadsheetChildEnv } from "../../../src";
import { toZone } from "../../../src/helpers";
import { SpreadsheetPivot } from "../../../src/helpers/pivot/spreadsheet_pivot/spreadsheet_pivot";
import { createSheet, setCellContent, undo } from "../../test_helpers/commands_helpers";
import { click, dragElement, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { getCellText } from "../../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "../../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../../test_helpers/mock_helpers";
import { SELECTORS, addPivot, updatePivot } from "../../test_helpers/pivot_helpers";

describe("Spreadsheet pivot side panel", () => {
  let model: Model;
  let fixture: HTMLElement;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    ({ env, model, fixture } = await mountSpreadsheet());
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
    await click(fixture.querySelector(".o_sp_en_rename")!);
    const input = fixture.querySelector(".o_sp_en_name") as HTMLInputElement;
    input.value = "New Pivot Name";
    input.dispatchEvent(new Event("input"));
    await click(fixture.querySelector(".o_sp_en_save")!);
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
    await click(fixture.querySelector(".o_sp_en_rename")!);
    const input = fixture.querySelector(".o_sp_en_name") as HTMLInputElement;
    input.value = "New Pivot Name";
    input.dispatchEvent(new Event("input"));
    await click(fixture.querySelector(".o_sp_en_save")!);
    expect(model.getters.getPivotName("1")).toEqual("New Pivot Name");
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

    undo(model);

    expect(model.getters.getPivotId("2")).toBeUndefined();
    expect(model.getters.getSheetIds()).toHaveLength(1);
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");
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

  test("should preserve the sorting of the dimension after ordering is changed", async () => {
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
});
