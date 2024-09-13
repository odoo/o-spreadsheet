import { Model, SpreadsheetChildEnv, SpreadsheetPivotCoreDefinition } from "../../src";
import { toZone, zoneToXc } from "../../src/helpers";
import { HighlightStore } from "../../src/stores/highlight_store";
import { createSheet, deleteSheet } from "../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger, simulateClick } from "../test_helpers/dom_helper";
import {
  getHighlightsFromStore,
  mountSpreadsheet,
  nextTick,
  setGrid,
} from "../test_helpers/helpers";
import { SELECTORS, addPivot, removePivot, updatePivot } from "../test_helpers/pivot_helpers";

describe("Pivot side panel", () => {
  let model: Model;
  let fixture: HTMLElement;
  let env: SpreadsheetChildEnv;

  beforeEach(async () => {
    ({ env, model, fixture } = await mountSpreadsheet(
      { model: new Model() },
      { askConfirmation: jest.fn((title, callback) => callback()) }
    ));
    addPivot(model, "A1:B2", {}, "1");
    addPivot(model, "A1:B2", {}, "2");
  });

  test("readonly panel is not clickable and greyed", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "2" });
    await nextTick();
    const panel = fixture.querySelector(".o-sidePanelBody > div");
    expect(panel?.classList).not.toContain("pe-none");
    expect(panel?.classList).not.toContain("opacity-50");
    model.updateMode("readonly");
    await nextTick();
    expect(panel?.classList).toContain("pe-none");
    expect(panel?.classList).toContain("opacity-50");
    expect(panel?.getAttribute("inert")).toBe("1");
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

  test("Pivot cells are highlighted when the panel is open", async () => {
    // prettier-ignore
    setGrid(model, {
      A1: "Partner", B1: "Amount",
      A2: "Alice", B2: "10",
      A5: "=PIVOT(1)"
    });
    const highlightStore = env.getStore(HighlightStore);
    expect(highlightStore.highlights.map((h) => zoneToXc(h.zone))).toEqual([]);

    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
    expect(getHighlightsFromStore(env).map((h) => zoneToXc(h.zone))).toEqual(["A5:A7"]);
  });

  test("Renaming the computed measure the pivot is sorted on keep the sorting", async () => {
    // prettier-ignore
    setGrid(model, {
      A1: "Partner", B1: "Amount",
      A2: "Alice", B2: "10",
      A5: "=PIVOT(1)"
    });

    const sheetId = model.getters.getActiveSheetId();
    updatePivot(model, "1", {
      measures: [
        { id: "Price", fieldName: "Amount", aggregator: "sum" },
        {
          id: "Amount times 2",
          fieldName: "Amount times 2",
          aggregator: "sum",
          computedBy: { formula: "=Amount*2", sheetId },
        },
      ],
      sortedColumn: { domain: [], order: "asc", measure: "Amount times 2" },
    });
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();

    const measureEl = fixture.querySelectorAll(".pivot-measure")[1];
    await setInputValueAndTrigger(measureEl.querySelector("input")!, "renamed");

    const definition = model.getters.getPivotCoreDefinition("1") as SpreadsheetPivotCoreDefinition;
    expect(definition.measures[1].id).toBe("renamed:sum");
    expect(definition.sortedColumn?.measure).toBe("renamed:sum");
  });
});
