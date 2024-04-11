import { Model, SpreadsheetChildEnv } from "../../src";
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
  test("It should display the pivot list when no pivotId is provided", async () => {
    env.openSidePanel("PivotSidePanel", {});
    await nextTick();
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("List of Pivots");
    expect(fixture.querySelectorAll(".o_pivot_list_item")).toHaveLength(2);
  });

  test("It should open the editor side panel when clicking on the pivot item in list", async () => {
    env.openSidePanel("PivotSidePanel", {});
    await nextTick();
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("List of Pivots");
    await click(fixture.querySelector(".o_pivot_list_item")!);
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #1");
  });

  test("It should close the pivot side panel when there is no more pivots", async () => {
    env.openSidePanel("PivotSidePanel", {});
    await nextTick();
    expect(fixture.querySelectorAll(".o_pivot_list_item")).toHaveLength(2);
    removePivot(model, "1");
    await nextTick();
    expect(fixture.querySelectorAll(".o_pivot_list_item")).toHaveLength(1);
    removePivot(model, "2");
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel")).toBeNull();
  });

  test("It should close the pivot side panel when there is pivots", async () => {
    removePivot(model, "1");
    removePivot(model, "2");
    env.openSidePanel("PivotSidePanel", {});
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel")).toBeNull();
  });

  test("It should open the pivot editor when pivotId is provided", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "2" });
    await nextTick();
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #2");
  });

  test("It should open the list of pivot when clicking on back in the editor", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "2" });
    await nextTick();
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #2");
    await click(fixture.querySelector(".sp_back")!);
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("List of Pivots");
  });

  test("It should open the list of pivot when clicking on delete in the editor", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "2" });
    await nextTick();
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #2");
    await click(fixture.querySelector(".sp_delete")!);
    expect(model.getters.getPivotIds()).toEqual(["1"]);
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("List of Pivots");
  });

  test("It should close the side panel when the last remaining pivot is deleted", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "2" });
    await nextTick();
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #2");
    await click(fixture.querySelector(".sp_delete")!);
    expect(model.getters.getPivotIds()).toEqual(["1"]);
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("List of Pivots");
    await click(fixture.querySelector(".o_pivot_list_item")!);
    expect(fixture.querySelector(".o-sidePanelTitle")?.textContent).toEqual("Pivot #1");
    await click(fixture.querySelector(".sp_delete")!);
    expect(model.getters.getPivotIds()).toEqual([]);
    expect(fixture.querySelector(".o-sidePanel")).toBeNull();
  });
});
