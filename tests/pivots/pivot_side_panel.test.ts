import { Model, SpreadsheetChildEnv } from "../../src";
import { createSheet, deleteSheet } from "../test_helpers/commands_helpers";
import { click } from "../test_helpers/dom_helper";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { addPivot, removePivot } from "../test_helpers/pivot_helpers";

describe("Pivot side panel", () => {
  let model: Model;
  let fixture: HTMLElement;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    ({ env, model, fixture } = await mountSpreadsheet());
    addPivot(model, "A1:D5", {}, "1");
    addPivot(model, "A1:D5", {}, "2");
  });

  test("It should open the pivot editor when pivotId is provided", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "2" });
    await nextTick();
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #2");
  });

  test("It should close the side panel when clicking on delete in the editor", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "2" });
    await nextTick();
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #2");
    await click(fixture.querySelector(".sp_delete")!);
    expect(model.getters.getPivotIds()).toEqual(["1"]);
    expect(fixture.querySelector(".o-sidePanel")).toBeNull();
  });

  test("Sidepanel pivot definition is properly reinitialized", async () => {
    removePivot(model, "1");
    env.openSidePanel("PivotSidePanel", { pivotId: "2" });
    await nextTick();
    createSheet(model, { sheetId: "toDelete", activate: true });
    await nextTick();
    // force the invalidation of the pivot definition
    deleteSheet(model, "toDelete");
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel")).not.toBeNull();
  });
});
