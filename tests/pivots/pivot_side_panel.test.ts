import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model, SpreadsheetPivotCoreDefinition } from "../../src";
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

  test("readonly panel is not clickable and greyed but remains scrollable", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();

    const sidePanel = fixture.querySelector(".o-sidePanel")!;
    let interactiveWrapper = sidePanel.querySelector(".o-sidePanelBody div[inert]");
    expect(interactiveWrapper).toBeNull();

    model.updateMode("readonly");
    await nextTick();

    const scrollableContainer = sidePanel.querySelector(".overflow-y-auto")!;
    expect(scrollableContainer).toBeTruthy();

    // The [inert] wrapper with `pe-none` and `opacity-50` is placed inside the scrollable container,
    // ensuring that user interactions are blocked while still allowing vertical scrolling.
    interactiveWrapper = scrollableContainer.querySelector("[inert]")!;
    expect(interactiveWrapper).toBeTruthy();
    expect(interactiveWrapper.classList).toContain("pe-none");
    expect(interactiveWrapper.classList).toContain("opacity-50");
    expect(interactiveWrapper.getAttribute("inert")).toBe("1");

    expect(fixture.querySelector(".pivot-defer-update")).toBeNull();
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

  test("Side panel restores the scroll position when switching tabs", async () => {
    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
    const pivotPanel = fixture.querySelector(".o-panel-content")!;
    pivotPanel.scrollTop = 100;

    const designPanel = fixture.querySelector(".o-sidePanel-tab.inactive")!;
    await click(designPanel);
    expect(pivotPanel.scrollTop).toBe(0);

    const configTab = fixture.querySelector(".o-sidePanel-tab.inactive")!;
    await click(configTab);
    expect(pivotPanel.scrollTop).toBe(100);
  });

  test("Pivot cells are highlighted when the panel is open", async () => {
    // prettier-ignore
    setGrid(model, {
      A1: "Partner", B1: "Amount",
      A2: "Alice", B2: "10",
      A5: "=PIVOT(1)"
    });
    const highlightStore = env.getStore(HighlightStore);
    expect(highlightStore.highlights.map((h) => zoneToXc(h.range.zone))).toEqual([]);

    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();
    expect(getHighlightsFromStore(env).map((h) => zoneToXc(h.range.zone))).toEqual(["A5:A7"]);
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

  test("Changing pivot rows/cols filter out invalid collapsed row/cols domains", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Year",  D1: "Active", E1: "Client",
      A2: "Alice",    B2: "10",     C2: "2020",  D2: "FALSE",  E2: "Marc",
      A3: "Alice",    B3: "20",     C3: "2021",  D3: "TRUE",   E3: "Marc",
      A4: "Bob",      B4: "30",     C4: "2020",  D4: "FALSE",  E4: "Marc",
      A5: "Bob",      B5: "40",     C5: "2021",  D5: "TRUE",   E5: "Marc",
    };
    setGrid(model, grid);
    updatePivot(model, "1", {
      columns: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      rows: [{ fieldName: "Client" }, { fieldName: "Active" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
      collapsedDomains: {
        COL: [[{ field: "Customer", value: "Alice", type: "char" }]],
        ROW: [[{ field: "Client", value: "Marc", type: "char" }]],
      },
      dataSet: { sheetId: model.getters.getActiveSheetId(), zone: toZone("A1:E5") },
    });

    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();

    const customerDimEl = fixture.querySelectorAll(".pivot-dimension")[0];
    await click(customerDimEl, ".fa-trash");

    let definition = model.getters.getPivotCoreDefinition("1");
    expect(definition.columns).toHaveLength(1);
    expect(definition.collapsedDomains?.COL).toHaveLength(0);
    expect(definition.collapsedDomains?.ROW).toHaveLength(1);

    const clientDimEl = fixture.querySelectorAll(".pivot-dimension")[1];
    await click(clientDimEl, ".fa-trash");
    definition = model.getters.getPivotCoreDefinition("1");
    expect(definition.rows).toHaveLength(1);
    expect(definition.collapsedDomains?.COL).toHaveLength(0);
    expect(definition.collapsedDomains?.ROW).toHaveLength(0);
  });

  test("Collapsed dimension with correct field but wrong value is not filtered out at pivot update", async () => {
    // Note: we don't want to remove those, because different users may have different value,
    // and a domain might be valid for one user and not for another

    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "Year",
      A2: "Alice",    B2: "10",     C2: "2020",
      A3: "Alice",    B3: "20",     C3: "2021",
    };
    setGrid(model, grid);
    updatePivot(model, "1", {
      columns: [{ fieldName: "Customer" }, { fieldName: "Year" }],
      rows: [],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
      collapsedDomains: {
        COL: [[{ field: "Customer", value: "NotARealPerson", type: "char" }]],
        ROW: [],
      },
      dataSet: { sheetId: model.getters.getActiveSheetId(), zone: toZone("A1:C3") },
    });

    env.openSidePanel("PivotSidePanel", { pivotId: "1" });
    await nextTick();

    const yearDimensionEl = fixture.querySelectorAll(".pivot-dimension")[1];
    await click(yearDimensionEl, ".fa-trash");

    const definition = model.getters.getPivotCoreDefinition("1");
    expect(definition.columns).toHaveLength(1);
    expect(definition.collapsedDomains?.COL).toHaveLength(1);
  });
});
