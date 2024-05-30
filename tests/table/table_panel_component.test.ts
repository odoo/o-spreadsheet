import { RangeImpl, toUnboundedZone, toZone, zoneToXc } from "../../src/helpers";
import { SpreadsheetChildEnv, Table, UID } from "../../src/types";
import {
  createTable,
  createTableStyle,
  deleteTable,
  setCellContent,
  setSelection,
  updateTableConfig,
} from "../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger, simulateClick } from "../test_helpers/dom_helper";
import { getCell } from "../test_helpers/getters_helpers";
import { mountComponentWithPortalTarget, nextTick } from "../test_helpers/helpers";

import { Model } from "../../src";
import { SidePanel } from "../../src/components/side_panel/side_panel/side_panel";
import { TableTerms } from "../../src/components/translations_terms";
import { TABLE_PRESETS } from "../../src/helpers/table_presets";

function getTable(model: Model, sheetId: UID): Table {
  return model.getters.getTables(sheetId)[0];
}

function getStyleElementStyleId(el: HTMLElement) {
  return el.title.split(", ")[1];
}

let model: Model;
let fixture: HTMLElement;
let sheetId: UID;
let env: SpreadsheetChildEnv;

describe("Table side panel", () => {
  beforeEach(async () => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    createTable(model, "A1:C3");
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanel, { model }));
    env.openSidePanel("TableSidePanel", {});
    await nextTick();
  });

  test.each([
    "hasFilters",
    "totalRow",
    "firstColumn",
    "lastColumn",
    "bandedRows",
    "bandedColumns",
    "automaticAutofill",
  ])("Can change table config boolean option %s", (configOption) => {
    const value = getTable(model, sheetId).config[configOption];
    const checkbox = fixture.querySelector(`input[name="${configOption}"]`) as HTMLInputElement;
    expect(checkbox.checked).toBe(value);
    click(checkbox);
    expect(getTable(model, sheetId).config[configOption]).toBe(!value);
  });

  test("Cannot add filters to a table without headers", async () => {
    updateTableConfig(model, "A1:C3", { numberOfHeaders: 0 });
    await nextTick();
    const checkbox = fixture.querySelector("input[name='hasFilters']") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.parentElement?.title).toBe(TableTerms.Tooltips.filterWithoutHeader.toString());
  });

  test("Can change number of headers", async () => {
    updateTableConfig(model, "A1:C3", { numberOfHeaders: 0 });
    await nextTick();
    expect(fixture.querySelector("input.o-table-n-of-headers")).toBeNull();
    await click(fixture, "input[name='headerRow']");

    expect(fixture.querySelector("input.o-table-n-of-headers")).not.toBeNull();

    expect(fixture.querySelector<HTMLInputElement>("input.o-table-n-of-headers")!.value).toBe("1");
    setInputValueAndTrigger("input.o-table-n-of-headers", "2");
    expect(getTable(model, sheetId).config.numberOfHeaders).toBe(2);
  });

  test("Number of headers is reset when inputting an invalid value", async () => {
    await setInputValueAndTrigger("input.o-table-n-of-headers", "-2");
    expect(getTable(model, sheetId).config.numberOfHeaders).toBe(1);
    expect(fixture.querySelector<HTMLInputElement>("input.o-table-n-of-headers")!.value).toBe("1");
  });

  test("Disabling then re-enabling the headers saves the state of the hasFilters checkbox", async () => {
    const hasFilters = fixture.querySelector<HTMLInputElement>("input[name='hasFilters']")!;
    expect(hasFilters.checked).toBe(true);
    await click(fixture, "input[name='headerRow']");
    expect(hasFilters.checked).toBe(false);
    await click(fixture, "input[name='headerRow']");
    expect(hasFilters.checked).toBe(true);
  });

  test("Can update table zone and it also moves the selection in the new table zone", async () => {
    await simulateClick(".o-selection input");
    await setInputValueAndTrigger(".o-selection input", "D5:E8");
    await click(fixture, ".o-selection .o-selection-ok");
    expect(zoneToXc(getTable(model, sheetId).range.zone)).toEqual("D5:E8");
    expect(model.getters.getSelectedZone()).toEqual(toZone("D5"));
  });

  test("Updating table zone does the equivalent of a ctrl+a if selecting a single cell", async () => {
    setCellContent(model, "D4", "5");
    setCellContent(model, "D5", "6");
    await simulateClick(".o-selection input");
    await setInputValueAndTrigger(".o-selection input", "D5");
    await click(fixture, ".o-selection .o-selection-ok");
    expect(zoneToXc(getTable(model, sheetId).range.zone)).toEqual("D4:D5");
    expect(model.getters.getSelectedZone()).toEqual(toZone("D4"));
  });

  test("Table is auto-filled if the new zone expands the table down", async () => {
    setCellContent(model, "A4", "=A3+1");
    await simulateClick(".o-selection input");
    await setInputValueAndTrigger(".o-selection input", "A1:C5");
    await click(fixture, ".o-selection .o-selection-ok");
    expect(getCell(model, "A5")?.content).toEqual("=A4+1");
  });

  test("Side panel works with unbounded table zones", async () => {
    await simulateClick(".o-selection input");
    await setInputValueAndTrigger(".o-selection input", "D2:E");
    await click(fixture, ".o-selection .o-selection-ok");
    expect(fixture.querySelector<HTMLInputElement>(".o-selection input")?.value).toEqual("D2:E");
    const tableRange = getTable(model, sheetId).range as RangeImpl;
    expect(tableRange.unboundedZone).toEqual(toUnboundedZone("D2:E"));
    expect(model.getters.getSelectedZone()).toEqual(toZone("D2"));
  });

  test("Changing the table zone to an array formula cell make the table dynamic", async () => {
    setCellContent(model, "E1", "=MUNIT(2)");
    await simulateClick(".o-selection input");
    await setInputValueAndTrigger(".o-selection input", "E1");
    await click(fixture, ".o-selection .o-selection-ok");
    expect(model.getters.getCoreTables(sheetId)[0]).toMatchObject({
      range: { zone: toZone("E1") },
      type: "dynamic",
    });
    expect(zoneToXc(getTable(model, sheetId).range.zone)).toEqual("E1:F2");
    expect(model.getters.getSelectedZone()).toEqual(toZone("E1"));
    expect(fixture.querySelector<HTMLInputElement>(".o-selection input")?.value).toBe("E1");
  });

  test("Errors messages are displayed when wrong zone is entered and input is reset on confirm", async () => {
    createTable(model, "D1:D2");
    await simulateClick(".o-selection input");
    await setInputValueAndTrigger(".o-selection input", "D1:D5");
    expect(fixture.querySelector(".o-side-panel-error")).not.toBeNull();

    await click(fixture, ".o-selection .o-selection-ok");
    expect(fixture.querySelector(".o-side-panel-error")).toBeNull();
    expect(fixture.querySelector<HTMLInputElement>(".o-selection input")!.value).toBe("A1:C3");
  });

  test("Changing the selection changes the edited table", async () => {
    createTable(model, "D1:D2");
    updateTableConfig(model, "D1:D2", { numberOfHeaders: 0 });

    expect(fixture.querySelector<HTMLInputElement>("input[name='headerRow']")!.checked).toBe(true);
    expect(fixture.querySelector<HTMLInputElement>(".o-selection input")!.value).toBe("A1:C3");

    setSelection(model, ["D1"]);
    await nextTick();
    expect(fixture.querySelector<HTMLInputElement>("input[name='headerRow']")!.checked).toBe(false);
    expect(fixture.querySelector<HTMLInputElement>(".o-selection input")!.value).toBe("D1:D2");
  });

  test("Selecting a cell without a table closes the side panel", async () => {
    setSelection(model, ["D1"]);
    await nextTick();
    expect(fixture.querySelector(".o-table-panel")).toBeNull();
  });

  test("Can edit the table style", async () => {
    const tableStyleItems = fixture.querySelectorAll<HTMLElement>(
      ".o-table-style-list-item:not(.selected)"
    );
    await click(tableStyleItems[0]);
    expect(getTable(model, sheetId).config.styleId).toBe(
      getStyleElementStyleId(tableStyleItems[0])
    );
    expect(tableStyleItems[0].classList).toContain("selected");

    await click(tableStyleItems[1]);
    expect(getTable(model, sheetId).config.styleId).toBe(
      getStyleElementStyleId(tableStyleItems[1])
    );
    expect(tableStyleItems[1].classList).toContain("selected");
  });

  test("Table style picker only contain styles of the same category as the current one", async () => {
    updateTableConfig(model, "A1:C3", { styleId: "TableStyleMedium1" });
    await nextTick();

    const getDisplayedStyleIds = () => {
      return Array.from(fixture.querySelectorAll<HTMLElement>(".o-table-style-list-item")).map(
        (el) => el.dataset.id
      );
    };
    const expectedStyles = Object.keys(TABLE_PRESETS).filter((key) => key.includes("Medium"));
    expect(getDisplayedStyleIds()).toEqual(expectedStyles);

    createTableStyle(model, "CustomStyle");
    updateTableConfig(model, "A1:C3", { styleId: "CustomStyle" });
    await nextTick();

    expect(getDisplayedStyleIds()).toEqual(["CustomStyle"]);
  });

  test("Can toggle the table style pick popover", async () => {
    expect(fixture.querySelector(".o-popover .o-table-style-popover")).toBeNull();

    await click(fixture, ".o-table-style-picker-arrow");
    expect(fixture.querySelector(".o-popover .o-table-style-popover")).not.toBeNull();

    await click(fixture, ".o-table-style-picker-arrow");
    expect(fixture.querySelector(".o-popover .o-table-style-popover")).toBeNull();
  });

  test("Can pick a table style in the popover", async () => {
    await click(fixture, ".o-table-style-picker-arrow");
    const tableStyleItems = fixture.querySelectorAll<HTMLElement>(
      ".o-popover .o-table-style-list-item:not(.selected)"
    );
    await click(tableStyleItems[0]);
    expect(tableStyleItems[0].title).toContain(getTable(model, sheetId).config.styleId);
    expect(fixture.querySelector(".o-popover")).toBeNull();
  });

  test("Panel is closed when the table is deleted", async () => {
    deleteTable(model, "A1:C3");
    await nextTick();
    expect(fixture.querySelector(".o-table-panel")).toBeNull();
  });

  test("IsDynamic checkbox is disabled when the table cannot be dynamic", async () => {
    expect(
      fixture.querySelector<HTMLInputElement>(`input[name="isDynamic"]`)?.disabled
    ).toBeTruthy();
    expect(model.getters.getCoreTable({ sheetId, col: 0, row: 0 })?.type).toBe("static");

    setCellContent(model, "A1", "=MUNIT(3)");
    await nextTick();
    expect(
      fixture.querySelector<HTMLInputElement>(`input[name="isDynamic"]`)?.disabled
    ).toBeFalsy();
  });

  test("Can change the table to be dynamic or not", async () => {
    expect(model.getters.getCoreTable({ sheetId, col: 0, row: 0 })?.type).toBe("static");
    expect(fixture.querySelector<HTMLInputElement>(".o-selection input")!.value).toBe("A1:C3");

    setCellContent(model, "A1", "=MUNIT(3)");
    await nextTick();
    const checkbox = fixture.querySelector(`input[name="isDynamic"]`) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(model.getters.getCoreTable({ sheetId, col: 0, row: 0 })).toMatchObject({
      type: "dynamic",
    });

    expect(fixture.querySelector<HTMLInputElement>(".o-selection input")!.value).toBe("A1");
    expect(fixture.querySelector(".o-selection-input button")).toBeNull(); // check that the selection input didn't start editing

    await click(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(model.getters.getCoreTable({ sheetId, col: 0, row: 0 })).toMatchObject({
      type: "forceStatic",
    });
    expect(fixture.querySelector<HTMLInputElement>(".o-selection input")!.value).toBe("A1:C3");
    expect(fixture.querySelector(".o-selection-input button")).toBeNull();
  });
});
