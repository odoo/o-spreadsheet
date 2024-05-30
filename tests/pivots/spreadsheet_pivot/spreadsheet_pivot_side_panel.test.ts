import { Model, SpreadsheetChildEnv } from "../../../src";
import { toZone } from "../../../src/helpers";
import { SpreadsheetPivot } from "../../../src/helpers/pivot/spreadsheet_pivot/spreadsheet_pivot";
import { setCellContent } from "../../test_helpers/commands_helpers";
import { click } from "../../test_helpers/dom_helper";
import { mountSpreadsheet, nextTick } from "../../test_helpers/helpers";
import { addPivot, updatePivot } from "../../test_helpers/pivot_helpers";

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
    await click(fixture.querySelector(".add-dimension")!);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture, ".o-autocomplete-value");
    expect(model.getters.getPivotCoreDefinition("3").columns).toEqual([]);
    await click(fixture.querySelector(".sp_apply_update")!);
    expect(model.getters.getPivotCoreDefinition("3").columns).toEqual([
      { name: "amount", order: "asc" },
    ]);
  });

  test("it should not defer update when the dataset is updated", async () => {
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

  test("Can duplicate a pivot", async () => {
    await click(fixture.querySelector(".o_duplicate_pivot")!);
    const pivotId = model.getters.getPivotId("2")!;
    expect(model.getters.getPivot(pivotId)).toBeDefined();
    expect(model.getters.getPivotDisplayName(pivotId)).toEqual("(#2) Pivot (copy)");
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #2");
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
    await click(fixture.querySelector(".sp_apply_update")!);
    expect(model.getters.getPivotCoreDefinition("3").columns).toEqual([
      { name: "amount", order: "asc" },
    ]);
  });

  test("should reset side panel if discard is clicked", async () => {
    expect(fixture.querySelectorAll(".pivot-dimension")).toHaveLength(0);
    await click(fixture.querySelector(".add-dimension")!);
    expect(fixture.querySelector(".o-popover")).toBeDefined();
    await click(fixture.querySelectorAll(".o-autocomplete-value")[0]);
    expect(fixture.querySelectorAll(".pivot-dimension")).toHaveLength(1);
    await click(fixture.querySelector(".fa-undo")!);
    expect(fixture.querySelectorAll(".pivot-dimension")).toHaveLength(0);
  });
});
