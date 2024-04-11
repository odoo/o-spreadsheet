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
    addPivot(model, {}, "A1:C3", "1");
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
  });

  it("should correctly be displayed", async () => {
    expect(fixture.querySelector(".o-sidePanel")).toMatchSnapshot();
  });

  it("should display only the selection input when the dataSet is not valid", async () => {
    updatePivot(model, "1", { dataSet: undefined });
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel")).toMatchSnapshot();
  });

  it("should be able to change the pivot name", async () => {
    await click(fixture.querySelector(".pivot-defer-update input")!);
    await nextTick();
    await click(fixture.querySelector(".o_sp_en_rename")!);
    const input = fixture.querySelector(".o_sp_en_name") as HTMLInputElement;
    input.value = "New Pivot Name";
    input.dispatchEvent(new Event("input"));
    await click(fixture.querySelector(".o_sp_en_save")!);
    expect(model.getters.getPivotName("1")).toEqual("New Pivot Name");
  });

  it("should be able to defer updates", async () => {
    expect((fixture.querySelector(".pivot-defer-update input")! as HTMLInputElement).checked).toBe(
      true
    );
    const input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    input.value = "A1:C2";
    input.dispatchEvent(new Event("input"));
    await nextTick();
    await click(fixture.querySelector(".o-selection-ok")!);
    expect(model.getters.getPivotCoreDefinition("1").dataSet!.zone).not.toEqual(toZone("A1:C2"));
    await click(fixture.querySelector(".sp_apply_update")!);
    expect(model.getters.getPivotCoreDefinition("1").dataSet!.zone).toEqual(toZone("A1:C2"));
  });

  it("Should hide range error message if the user updates the range even if the pivot is dirty", async () => {
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
    expect(model.getters.getPivotCoreDefinition("1").dataSet).toBeUndefined();
    expect(fixture.querySelectorAll(".sp_range_error_message")).toHaveLength(0);
  });
});
