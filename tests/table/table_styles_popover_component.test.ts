import { Component, xml } from "@odoo/owl";
import { Model } from "../../src";
import {
  TableStylesPopover,
  TableStylesPopoverProps,
} from "../../src/components/tables/table_styles_popover/table_styles_popover";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import { SpreadsheetChildEnv } from "../../src/types";
import { createTableStyle } from "../test_helpers/commands_helpers";
import { click, triggerMouseEvent } from "../test_helpers/dom_helper";
import { mountComponent, nextTick } from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let openSidePanel: jest.Mock;

class Parent extends Component<TableStylesPopoverProps, SpreadsheetChildEnv> {
  static components = { TableStylesPopover };
  static template = xml/*xml*/ `
    <!-- Portal target -->
    <div class="o-spreadsheet">
      <TableStylesPopover t-props="props" />
    </div>
    `;
}

async function mountPopover(partialProps: Partial<TableStylesPopoverProps> = {}) {
  const props: TableStylesPopoverProps = {
    tableConfig: DEFAULT_TABLE_CONFIG,
    closePopover: () => {},
    onStylePicked: () => {},
    popoverProps: {
      anchorRect: { x: 0, y: 0, width: 0, height: 0 },
      positioning: "TopRight",
      verticalOffset: 0,
    },
    ...partialProps,
  };
  openSidePanel = jest.fn();
  const env = { openSidePanel };
  ({ fixture } = await mountComponent(Parent, { model, props, env }));
  await nextTick();
}

describe("Table style editor panel", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("Can change displayed categories with the radio button", async () => {
    await mountPopover();
    const lightTableSelector = ".o-table-style-list-item[title='Red, TableStyleLight3']";
    const mediumTableSelector = ".o-table-style-list-item[title='Red, TableStyleMedium3']";
    expect(fixture.querySelector(mediumTableSelector)).toBeTruthy();
    expect(fixture.querySelector(lightTableSelector)).toBeFalsy();

    await click(fixture, ".form-check-input[value='light']");
    expect(fixture.querySelector(mediumTableSelector)).toBeFalsy();
    expect(fixture.querySelector(lightTableSelector)).toBeTruthy();
  });

  test("The category of props.selectedStyleId is opened and the item is selected", async () => {
    await mountPopover({ selectedStyleId: "TableStyleDark1" });
    expect(
      fixture.querySelector<HTMLInputElement>(".form-check-input[value='dark']")?.checked
    ).toBe(true);
    expect(
      fixture.querySelector(".o-table-style-list-item[title='Black, TableStyleDark1']")?.classList
    ).toContain("selected");
  });

  test("onStylePicked callback is called", async () => {
    const closePopover = jest.fn();
    const onStylePicked = jest.fn();
    await mountPopover({ closePopover, onStylePicked });
    await click(fixture, ".o-table-style-list-item[title='Red, TableStyleMedium3']");
    expect(onStylePicked).toHaveBeenCalledWith("TableStyleMedium3");
  });

  test("Can create custom style", async () => {
    const onStylePicked = jest.fn();
    await mountPopover({ onStylePicked });
    await click(fixture, ".form-check-input[value='custom']");
    click(fixture, ".o-new-table-style");
    expect(openSidePanel).toHaveBeenCalledWith("TableStyleEditorPanel", { onStylePicked });
  });

  describe("Custom style context menu menu", () => {
    beforeEach(async () => {
      createTableStyle(model, "MyStyle");
      await mountPopover();
      await click(fixture, ".form-check-input[value='custom']");
    });

    test("Can edit a custom table style with the top-right hover button", async () => {
      click(fixture, ".o-table-style-edit-button");
      expect(openSidePanel).toHaveBeenCalledWith("TableStyleEditorPanel", { styleId: "MyStyle" });
    });

    test("Can edit a custom table style with the context menu", async () => {
      triggerMouseEvent('.o-table-style-list-item[title="MyStyle"]', "contextmenu");
      await nextTick();
      expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(2);
      await click(fixture, ".o-menu-item[data-name='editTableStyle'");
      expect(openSidePanel).toHaveBeenCalledWith("TableStyleEditorPanel", { styleId: "MyStyle" });
    });

    test("Can delete a custom table style with the context menu", async () => {
      triggerMouseEvent('.o-table-style-list-item[title="MyStyle"]', "contextmenu");
      await nextTick();
      click(fixture, ".o-menu-item[data-name='deleteTableStyle'");
      expect(Object.keys(model.getters.getTableStyles())).not.toContain("MyStyle");
    });
  });
});
