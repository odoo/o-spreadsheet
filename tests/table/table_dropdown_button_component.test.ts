import { Component, xml } from "@odoo/owl";
import { Model } from "../../src";
import { SidePanel } from "../../src/components/side_panel/side_panel/side_panel";
import { TableDropdownButton } from "../../src/components/tables/table_dropdown_button/table_dropdown_button";
import { toZone, zoneToXc } from "../../src/helpers";
import { SpreadsheetChildEnv, UID } from "../../src/types";
import { createTable, setSelection } from "../test_helpers/commands_helpers";
import { click } from "../test_helpers/dom_helper";
import { mountComponent, nextTick } from "../test_helpers/helpers";

let model: Model;
let sheetId: UID;
let fixture: HTMLElement;

class Parent extends Component<{}, SpreadsheetChildEnv> {
  static components = { TableDropdownButton, SidePanel };
  static template = xml/*xml*/ `
  <div class="o-spreadsheet">
    <TableDropdownButton />
    <SidePanel />
  </div>
  `;
  static props = {};
}

beforeEach(async () => {
  ({ model, fixture } = await mountComponent(Parent, {}));
  sheetId = model.getters.getActiveSheetId();
});

describe("Table dropdown button", () => {
  test("Can insert a table with the widget", async () => {
    setSelection(model, ["A1:C3"]);
    await click(fixture, ".o-table-widget .o-menu-item-button");
    await click(fixture, '.o-table-style-popover div[title="Red, TableStyleMedium3"]');

    expect(model.getters.getTables(sheetId)).toMatchObject([
      { range: { zone: toZone("A1:C3") }, config: { styleId: "TableStyleMedium3" } },
    ]);
    expect(fixture.querySelector(".o-table-panel")).toBeTruthy();
  });

  test("Re-clicking on the widget toggles the popover", async () => {
    await click(fixture, ".o-table-widget .o-menu-item-button");
    expect(fixture.querySelector(".o-table-style-popover")).toBeTruthy();

    await click(fixture, ".o-table-widget .o-menu-item-button");
    expect(fixture.querySelector(".o-table-style-popover")).toBeFalsy();
  });

  test("No table is selected inside the popover", async () => {
    await click(fixture, ".o-table-widget .o-menu-item-button");
    expect(fixture.querySelector(".o-table-style-list-item.selected")).toBeNull();
  });

  test("Clicking on the widget toggle the side panel if the selection contains a table", async () => {
    setSelection(model, ["A1:C3"]);
    createTable(model, "A1:C3");
    await click(fixture, ".o-table-widget .o-menu-item-button");
    await nextTick();
    expect(fixture.querySelector(".o-table-panel")).toBeTruthy();
    await click(fixture, ".o-table-widget .o-menu-item-button");
    expect(fixture.querySelector(".o-table-panel")).toBeFalsy();
  });

  test("Can insert a table with a custom style with the widget", async () => {
    setSelection(model, ["A1:C3"]);
    await click(fixture, ".o-table-widget .o-menu-item-button");
    await click(fixture, ".o-notebook-tab[data-id='custom']");
    await click(fixture, ".o-new-table-style");

    expect(fixture.querySelector(".o-table-style-editor-panel")).toBeTruthy();
    click(fixture, ".o-sidePanel .o-confirm");
    const table = model.getters.getTables(sheetId)[0];
    expect(zoneToXc(table.range.zone)).toEqual("A1:C3");
    expect(model.getters.getTableStyle(table.config.styleId).displayName).toEqual(
      "Custom Table Style"
    );
  });
});
