import { Model, SpreadsheetChildEnv, SpreadsheetPivotCoreDefinition } from "../../src";
import { toZone } from "../../src/helpers";
import { createSheet, deleteSheet } from "../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger, simulateClick } from "../test_helpers/dom_helper";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { SELECTORS, addPivot, removePivot } from "../test_helpers/pivot_helpers";

describe("Pivot side panel", () => {
  let model: Model;
  let fixture: HTMLElement;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    ({ env, model, fixture } = await mountSpreadsheet(
      { model: new Model() },
      { askConfirmation: jest.fn((title, callback) => callback()) }
    ));
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
    await click(fixture, SELECTORS.COG_WHEEL);
    await click(fixture, SELECTORS.DELETE_PIVOT);
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

  test("Side panel supports unbounded zone in definition", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
    setInputValueAndTrigger(SELECTORS.ZONE_INPUT, "A:A");
    await nextTick();
    await simulateClick(SELECTORS.ZONE_CONFIRM);
    expect(
      (model.getters.getPivotCoreDefinition("1") as SpreadsheetPivotCoreDefinition).dataSet
    ).toMatchObject({
      sheetId: model.getters.getActiveSheetId(),
      zone: toZone("A1:A100"),
    });
  });
});
