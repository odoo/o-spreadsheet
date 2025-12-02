import { Model } from "@odoo/o-spreadsheet-engine";
import { HIGHLIGHT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { toZone } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { NamedRangeSelector } from "../../src/components/named_range_selector/named_range_selector";
import { HighlightStore } from "../../src/stores/highlight_store";
import {
  createNamedRange,
  createSheet,
  setInputValueAndTrigger,
  setSelection,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers";
import { mountComponentWithPortalTarget, nextTick } from "../test_helpers/helpers";

let model: Model;
let env: SpreadsheetChildEnv;
let raiseError: jest.Mock;
let openSidePanel: jest.Mock;

beforeEach(() => {
  model = new Model();
});

async function mountRangeSelector() {
  raiseError = jest.fn();
  openSidePanel = jest.fn();
  ({ model, env } = await mountComponentWithPortalTarget(NamedRangeSelector, {
    model,
    env: { raiseError, openSidePanel },
  }));
}

describe("Named ranges topbar selector", () => {
  test("Can create a named range from range selector", async () => {
    await mountRangeSelector();
    expect(".o-named-range-selector input").toHaveValue("A1");

    setSelection(model, ["A1:B2"]);
    await nextTick();
    expect(".o-named-range-selector input").toHaveValue("A1:B2");

    await setInputValueAndTrigger(".o-named-range-selector input", "MyRange");
    expect(model.getters.getNamedRanges()).toHaveLength(1);
    expect(model.getters.getNamedRanges()[0]).toMatchObject({
      rangeName: "MyRange",
      range: { zone: toZone("A1:B2") },
    });
  });

  test("Can edit a named range from range selector", async () => {
    createNamedRange(model, "MyRange", "A1:B2");
    await mountRangeSelector();
    setSelection(model, ["A1:B2"]);
    await setInputValueAndTrigger(".o-named-range-selector input", "MyRange");

    await setInputValueAndTrigger(".o-named-range-selector input", "RenamedRange");
    expect(model.getters.getNamedRanges()[0]).toMatchObject({
      rangeName: "RenamedRange",
      range: { zone: toZone("A1:B2") },
    });
  });

  test("Entering spaces with replace them by underscores", async () => {
    await mountRangeSelector();
    await setInputValueAndTrigger(".o-named-range-selector input", "Named with spaces");
    expect(model.getters.getNamedRanges()[0]).toMatchObject({ rangeName: "Named_with_spaces" });
  });

  test("Cannot create a named range with an invalid name", async () => {
    await mountRangeSelector();
    await setInputValueAndTrigger(".o-named-range-selector input", "Wrong name !");
    expect(raiseError).toHaveBeenCalledWith(
      "The named range name contains invalid characters. Valid characters are letters, numbers, underscores, and periods."
    );
    expect(model.getters.getNamedRanges()).toHaveLength(0);
  });

  test("Entering a reference in the named range selector will select this reference", async () => {
    createSheet(model, { name: "Sheet2", sheetId: "sh2" });
    await mountRangeSelector();
    await setInputValueAndTrigger(".o-named-range-selector input", "Sheet2!C3:D4");
    expect(model.getters.getActiveSheetId()).toEqual("sh2");
    expect(model.getters.getSelectedZone()).toEqual(toZone("C3:D4"));
  });

  test("Entering an existing named range in the named range selector will select this range", async () => {
    createNamedRange(model, "MyRange", "A1:B2");
    createNamedRange(model, "MyRange2", "C1:C5");
    await mountRangeSelector();

    await setInputValueAndTrigger(".o-named-range-selector input", "MyRange");
    expect(model.getters.getSelectedZone()).toEqual(toZone("A1:B2"));

    await setInputValueAndTrigger(".o-named-range-selector input", "MYRANGE2");
    expect(model.getters.getSelectedZone()).toEqual(toZone("C1:C5"));
  });

  test("Can open the dropdown to select a named range", async () => {
    createSheet(model, { name: "Sheet2", sheetId: "sh2" });
    createNamedRange(model, "MyRange", "A1:B2");
    createNamedRange(model, "AnotherRange", "C3:D4", "sh2");
    await mountRangeSelector();

    await simulateClick(".o-named-range-selector .fa-caret-down");
    const menuItems = [...document.querySelectorAll<HTMLElement>(".o-menu-item")];
    const getMenuItemText = (item: HTMLElement) => {
      const name = item.querySelector(".o-menu-item-name")?.textContent?.trim() || "";
      const description = item.querySelector(".o-menu-item-description")?.textContent?.trim() || "";
      return name + " " + description;
    };

    expect(menuItems.map(getMenuItemText)).toEqual([
      "MyRange Sheet1!A1:B2",
      "AnotherRange Sheet2!C3:D4",
      "Manage named ranges ",
    ]);
    await simulateClick(menuItems[1]);
    expect(model.getters.getActiveSheetId()).toEqual("sh2");
    expect(model.getters.getSelectedZone()).toEqual(toZone("C3:D4"));
  });

  test("The sheet is scrolled so the whole named range is visible when selecting a named range", async () => {
    createNamedRange(model, "MyRange", "Y60:Z70");
    await mountRangeSelector();
    const viewport = model.getters.getActiveMainViewport();
    const viewportWidth = viewport.right - viewport.left;
    const viewportHeight = viewport.bottom - viewport.top;

    await simulateClick(".o-named-range-selector .fa-caret-down");
    await simulateClick(".o-menu-item");

    expect(model.getters.getSelectedZone()).toEqual(toZone("Y60:Z70"));
    expect(model.getters.getActiveMainViewport()).toMatchObject({
      bottom: 69, // Row 70
      top: 69 - viewportHeight,
      right: 25, // Column Z
      left: 25 - viewportWidth,
    });
  });

  test("Named range is highlighted when hovering it in the dropdown", async () => {
    createNamedRange(model, "MyRange", "A1:B3");
    await mountRangeSelector();

    await simulateClick(".o-named-range-selector .fa-caret-down");
    triggerMouseEvent(".o-menu-item", "mouseenter");
    await nextTick();

    const highlightStore = env.getStore(HighlightStore);
    expect(highlightStore.highlights).toMatchObject([
      { range: { zone: toZone("A1:B3") }, color: HIGHLIGHT_COLOR, noFill: true },
    ]);

    triggerMouseEvent(".o-menu-item", "mouseleave");
    await nextTick();
    expect(highlightStore.highlights).toHaveLength(0);
  });

  test("Can open the named range side panel from the dropdown", async () => {
    await mountRangeSelector();
    await simulateClick(".o-named-range-selector .fa-caret-down");

    expect(".o-menu-item").toHaveCount(1);
    await simulateClick(".o-menu-item");
    expect(openSidePanel).toHaveBeenCalledWith("NamedRangesPanel", {});
  });

  test("Focusing the input opens the dropdown", async () => {
    createNamedRange(model, "MyRange", "A1:B3");
    await mountRangeSelector();

    await simulateClick(".o-named-range-selector input");
    expect(".o-menu-item").toHaveCount(2); // 1 named range + "Manage named ranges"
  });

  test("Writing in the input filter the menu items shown", async () => {
    createNamedRange(model, "MyRange", "A1:B3");
    createNamedRange(model, "AnotherRange", "C1:D4");
    await mountRangeSelector();

    await simulateClick(".o-named-range-selector input");
    expect(".o-menu-item").toHaveCount(3); // 2 named ranges + "Manage named ranges"

    await setInputValueAndTrigger(".o-named-range-selector input", "Another", "onlyInput");
    expect(".o-menu-item").toHaveCount(2); // "AnotherRange" + "Manage named ranges"
  });
});
