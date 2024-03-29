import { Model } from "../../src";
import { TableDropdownButton } from "../../src/components/tables/table_dropdown_button/table_dropdown_button";
import { toZone } from "../../src/helpers";
import { UID } from "../../src/types";
import { createTable, setSelection } from "../test_helpers/commands_helpers";
import { click } from "../test_helpers/dom_helper";
import { makeTestEnv, mountComponentWithPortalTarget } from "../test_helpers/helpers";

let model: Model;
let sheetId: UID;
let fixture: HTMLElement;
let openSidePanelSpy: jest.Mock<any, any>;
let toggleSidePanelSpy: jest.Mock<any, any>;

beforeEach(async () => {
  openSidePanelSpy = jest.fn();
  toggleSidePanelSpy = jest.fn();
  const env = makeTestEnv({ openSidePanel: openSidePanelSpy, toggleSidePanel: toggleSidePanelSpy });
  ({ model, fixture } = await mountComponentWithPortalTarget(TableDropdownButton, { env }));
  sheetId = model.getters.getActiveSheetId();
});

describe("Table dropdown button", () => {
  test("Can insert a table with the widget", async () => {
    setSelection(model, ["A1:C3"]);
    await click(fixture, ".o-table-widget .o-menu-item-button");
    await click(fixture, '.o-table-style-popover div[title="Red, TableStyleLight3"]');

    expect(model.getters.getTables(sheetId)).toMatchObject([
      { range: { zone: toZone("A1:C3") }, config: { styleId: "TableStyleLight3" } },
    ]);
    expect(openSidePanelSpy).toHaveBeenCalledWith("TableSidePanel", {});
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

  test("Clicking on the widget toggle the side panel if the selection contains a table", () => {
    setSelection(model, ["A1:C3"]);
    createTable(model, "A1:C3");
    click(fixture, ".o-table-widget .o-menu-item-button");
    expect(toggleSidePanelSpy).toHaveBeenCalledWith("TableSidePanel", {});
  });
});
